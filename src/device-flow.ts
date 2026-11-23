/**
 * GitHub OAuth 设备流（纯逻辑 + 可注入的传输函数，便于单测）。
 *
 * 流程：申请 device_code → 用户在 github.com/login/device 输码 →
 * 轮询 access_token 端点。轮询尊重响应里的 interval，slow_down 再加 5 秒。
 *
 * 这里不直接依赖宿主 HTTP，也不依赖 token 模块；调用方（auth.ts）负责把
 * token 落盘并拉取用户信息。这样状态机本身可以在 Node 里零依赖测试。
 */
import type { DeviceCode, OAuthTokenResult } from './types';

export type DeviceFlowStatus =
  | 'idle'
  | 'requesting'
  | 'pending'
  | 'slow_down'
  | 'success'
  | 'expired'
  | 'denied'
  | 'error';

export interface FormResponse {
  status: number;
  text: string;
}

export type PostForm = (url: string, params: Record<string, string>) => Promise<FormResponse>;

export interface DeviceFlowOptions {
  clientId: string;
  scope: string;
  deviceCodeUrl: string;
  tokenUrl: string;
  postForm: PostForm;
  sleep?: (ms: number) => Promise<void>;
  onStatus?: (status: DeviceFlowStatus, detail?: { slowDown?: boolean; message?: string }) => void;
  onCode?: (code: DeviceCode) => void;
  shouldStop?: () => boolean;
  maxWaitMs?: number;
}

const DEFAULT_SLEEP = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 解析 token 端点响应：优先 JSON，兼容 form-urlencoded 回退。 */
export function parseTokenResponse(text: string): OAuthTokenResult {
  const raw = String(text ?? '').trim();
  if (!raw) return { error: 'empty_response' };
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as OAuthTokenResult;
      return parsed && typeof parsed === 'object' ? parsed : { error: 'parse_error' };
    } catch {
      return { error: 'parse_error' };
    }
  }
  const params = new URLSearchParams(raw);
  const result: OAuthTokenResult = {};
  for (const [key, value] of params) result[key as keyof OAuthTokenResult] = value;
  return result;
}

export type TokenErrorKind = 'pending' | 'slow_down' | 'expired' | 'denied' | 'error';

/** 把 OAuth 错误码归类到状态机分支。 */
export function classifyTokenError(error: unknown): TokenErrorKind {
  const code = String(typeof error === 'string' ? error : (error as { error?: unknown } | null)?.error ?? '')
    .trim()
    .toLowerCase();
  switch (code) {
    case 'authorization_pending':
      return 'pending';
    case 'slow_down':
      return 'slow_down';
    case 'expired_token':
      return 'expired';
    case 'access_denied':
      return 'denied';
    default:
      return 'error';
  }
}

/** slow_down 后轮询间隔固定 +5 秒（GitHub 规范）。 */
export function nextPollDelayMs(intervalSeconds: number, slowDown: boolean): number {
  const base = Number.isFinite(intervalSeconds) && intervalSeconds > 0 ? intervalSeconds : 5;
  return (base + (slowDown ? 5 : 0)) * 1000;
}

const requireCode = (parsed: unknown): DeviceCode => {
  const value = parsed as Partial<DeviceCode> | null;
  if (!value || typeof value.device_code !== 'string' || typeof value.user_code !== 'string') {
    throw new Error('设备码响应缺少 device_code / user_code');
  }
  return {
    device_code: value.device_code,
    user_code: value.user_code,
    verification_uri: String(value.verification_uri ?? 'https://github.com/login/device'),
    expires_in: Number(value.expires_in ?? 900),
    interval: Number(value.interval ?? 5),
  };
};

/**
 * 跑完整个设备流。返回 token 字符串；失败时抛出带可读 message 的 Error。
 * 调用方可通过 onStatus 驱动 UI（pending / slow_down / expired / denied）。
 */
export async function authorizeWithDeviceFlow(options: DeviceFlowOptions): Promise<string> {
  const {
    clientId,
    scope,
    deviceCodeUrl,
    tokenUrl,
    postForm,
    sleep = DEFAULT_SLEEP,
    onStatus,
    onCode,
    shouldStop,
    maxWaitMs = 15 * 60 * 1000,
  } = options;

  if (!clientId) throw new Error('client_id 未配置');

  onStatus?.('requesting');
  const codeResponse = await postForm(deviceCodeUrl, { client_id: clientId, scope });
  if (codeResponse.status < 200 || codeResponse.status >= 300) {
    throw new Error(`申请设备码失败（HTTP ${codeResponse.status}）`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(codeResponse.text);
  } catch {
    throw new Error('设备码响应不是合法 JSON');
  }
  const code = requireCode(parsed);
  onCode?.(code);
  let interval = code.interval;
  const deadline = Date.now() + Math.min(typeof code.expires_in === 'number' ? code.expires_in * 1000 : maxWaitMs, maxWaitMs);

  onStatus?.('pending');

  while (Date.now() < deadline) {
    if (shouldStop?.()) throw new Error('已取消');

    await sleep(nextPollDelayMs(interval, false));
    if (shouldStop?.()) throw new Error('已取消');

    const response = await postForm(tokenUrl, {
      client_id: clientId,
      device_code: code.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });

    let result: OAuthTokenResult;
    try {
      result = parseTokenResponse(response.text);
    } catch {
      throw new Error('token 响应解析失败');
    }

    if (result.access_token) {
      onStatus?.('success');
      return result.access_token;
    }

    const kind = classifyTokenError(result.error ?? (response.status >= 400 ? 'http_error' : ''));
    if (kind === 'pending') {
      onStatus?.('pending');
      continue;
    }
    if (kind === 'slow_down') {
      interval += 5;
      onStatus?.('slow_down', { slowDown: true });
      continue;
    }
    if (kind === 'expired') {
      onStatus?.('expired');
      throw new Error('expired_token');
    }
    if (kind === 'denied') {
      onStatus?.('denied');
      throw new Error('access_denied');
    }

    onStatus?.('error', { message: result.error_description || result.error || 'unknown_error' });
    throw new Error(result.error_description || result.error || 'token 请求失败');
  }

  onStatus?.('expired');
  throw new Error('expired_token');
}
