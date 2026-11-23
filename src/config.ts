/**
 * 插件的全局配置（单点）。
 *
 * client_id 不是秘密，OAuth 设备流只需要它；client_secret 永远不会出现在前端产物里。
 * 用户注册 OAuth App（勾选 Enable Device Flow）后把 Client ID 填到 DEFAULT_CLIENT_ID，
 * 也可以在插件设置页临时覆盖（存本机 localStorage）。
 */
export const DEFAULT_CLIENT_ID = '';
export const OAUTH_SCOPES = 'repo, read:user';

export const API_BASE = 'https://api.github.com';
export const WEB_BASE = 'https://github.com';
export const DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const DEVICE_VERIFY_URL = 'https://github.com/login/device';

const CLIENT_ID_KEY = 'otools-github:client-id';

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export function getClientId(): string {
  const override = String(storage()?.getItem(CLIENT_ID_KEY) ?? '').trim();
  return override || DEFAULT_CLIENT_ID.trim();
}

export function getClientIdOverride(): string {
  return String(storage()?.getItem(CLIENT_ID_KEY) ?? '').trim();
}

export function setClientIdOverride(value: string): void {
  const id = String(value ?? '').trim();
  const store = storage();
  if (!store) return;
  try {
    if (id) store.setItem(CLIENT_ID_KEY, id);
    else store.removeItem(CLIENT_ID_KEY);
  } catch {
    // 存储不可用时只写入默认值配置即可。
  }
}

/** 授权页链接：把 client_id 拼进去，用户点「授权」后可自动回到 GitHub。 */
export function deviceVerifyUrl(clientId: string): string {
  const url = new URL(DEVICE_VERIFY_URL);
  if (clientId) url.searchParams.set('client_id', clientId);
  return url.toString();
}
