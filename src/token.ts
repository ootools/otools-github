/**
 * OAuth token 的本地存取。
 *
 * 只做「读 / 写 / 清除 + 响应式引用」这一件事，不依赖 api.ts；
 * api.ts 单向依赖本模块。token 只存在插件 webview 自己的 localStorage，
 * 用户可随时在 https://github.com/settings/applications 撤销授权。
 */
import { ref } from 'vue';

const TOKEN_KEY = 'otools-github:token';

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const sanitize = (value: unknown): string => {
  const token = String(value ?? '').trim();
  if (!token || /\s/.test(token)) return '';
  // 设备流发放 gho_ 开头；也兼容用户粘贴的其他官方 token 形态。
  const known = /^(gho_|ghu_|ghs_|ghr_|github_pat_)/.test(token);
  return known || token.length >= 20 ? token : '';
};

const read = (): string => sanitize(storage()?.getItem(TOKEN_KEY));

export const tokenRef = ref<string>(read());

export function getToken(): string {
  return tokenRef.value;
}

export function hasToken(): boolean {
  return tokenRef.value.length > 0;
}

export function writeToken(raw: string): string {
  const token = sanitize(raw);
  tokenRef.value = token;
  const store = storage();
  if (!store) return token;
  try {
    if (token) store.setItem(TOKEN_KEY, token);
    else store.removeItem(TOKEN_KEY);
  } catch {
    // 隐私模式 / 配额满：只保留内存态。
  }
  return token;
}

export function clearToken(): void {
  writeToken('');
}
