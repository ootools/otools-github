/**
 * 登录态：OAuth 设备流 + token 校验。
 * token 只落本机 localStorage；登录名 / scopes 从 GitHub API 读取。
 */
import { computed, ref } from 'vue';
import { fetchUser, GitHubApiError, postOAuthForm } from './api';
import { DEFAULT_CLIENT_ID, DEVICE_CODE_URL, OAUTH_SCOPES, TOKEN_URL, getClientId } from './config';
import { authorizeWithDeviceFlow, type DeviceFlowStatus } from './device-flow';
import { clearToken, getToken, hasToken, writeToken } from './token';
import type { GitHubUser } from './types';

export type AuthStatus = 'anonymous' | 'checking' | 'authenticated' | 'invalid';

const statusRef = ref<AuthStatus>(hasToken() ? 'checking' : 'anonymous');
const userRef = ref<GitHubUser | null>(null);
const scopesRef = ref('');
const errorRef = ref('');
const flowStatusRef = ref<DeviceFlowStatus>('idle');
const userCodeRef = ref('');
const verifyUriRef = ref('');
let stopLogin: (() => void) | null = null;

export const authStatus = computed(() => statusRef.value);
export const currentUser = computed(() => userRef.value);
export const authScopes = computed(() => scopesRef.value);
export const authError = computed(() => errorRef.value);
export const isAuthenticated = computed(() => statusRef.value === 'authenticated');
export const flowStatus = computed(() => flowStatusRef.value);
export const userCode = computed(() => userCodeRef.value);
export const verifyUri = computed(() => verifyUriRef.value);
export const hasBuiltInClientId = computed(() => Boolean(DEFAULT_CLIENT_ID.trim() || getClientId()));

const reset = (): void => {
  userRef.value = null;
  scopesRef.value = '';
  statusRef.value = 'anonymous';
};

const errorMessage = (error: unknown): string => {
  if (error instanceof GitHubApiError) {
    if (error.kind === 'auth') return 'auth';
    if (error.kind === 'network') return 'network';
    if (error.kind === 'rate') return 'rate';
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message === 'expired_token') return 'expired';
    if (error.message === 'access_denied') return 'denied';
    return error.message;
  }
  return String(error);
};

/** 用给定 token 建立会话：先落盘再校验，失败立刻清掉坏 token。 */
export async function signInWithToken(raw: string, scopes = ''): Promise<boolean> {
  const token = writeToken(raw);
  errorRef.value = '';
  if (!token) {
    reset();
    return false;
  }
  statusRef.value = 'checking';
  try {
    userRef.value = await fetchUser();
    scopesRef.value = scopes;
    statusRef.value = 'authenticated';
    return true;
  } catch (error) {
    clearToken();
    reset();
    errorRef.value = errorMessage(error);
    return false;
  }
}

export function signOut(): void {
  stopLogin?.();
  stopLogin = null;
  clearToken();
  reset();
  errorRef.value = '';
  flowStatusRef.value = 'idle';
  userCodeRef.value = '';
}

/** 启动设备流。设备的 user code / verification URI 会写入响应式 ref 供 UI 展示。 */
export async function startDeviceLogin(): Promise<boolean> {
  if (!getClientId()) {
    errorRef.value = 'client_id_missing';
    return false;
  }
  stopLogin?.();
  let cancelled = false;
  stopLogin = () => {
    cancelled = true;
  };
  errorRef.value = '';
  userCodeRef.value = '';
  flowStatusRef.value = 'idle';

  try {
    const token = await authorizeWithDeviceFlow({
      clientId: getClientId(),
      scope: OAUTH_SCOPES,
      deviceCodeUrl: DEVICE_CODE_URL,
      tokenUrl: TOKEN_URL,
      postForm: postOAuthForm,
      shouldStop: () => cancelled,
      onStatus: (status) => {
        flowStatusRef.value = status;
      },
      onCode: (code) => {
        userCodeRef.value = code.user_code;
        verifyUriRef.value = code.verification_uri;
      },
    });
    return await signInWithToken(token);
  } catch (error) {
    if (!cancelled) errorRef.value = errorMessage(error);
    return false;
  } finally {
    stopLogin = null;
  }
}

export function cancelDeviceLogin(): void {
  stopLogin?.();
  stopLogin = null;
  flowStatusRef.value = 'idle';
}

/** 启动时校验已保存的 token；失败（撤销 / 过期）静默退回未登录。 */
export async function restoreSession(): Promise<void> {
  if (!hasToken()) {
    reset();
    return;
  }
  if (statusRef.value === 'authenticated' && userRef.value) return;
  statusRef.value = 'checking';
  try {
    userRef.value = await fetchUser();
    statusRef.value = 'authenticated';
    errorRef.value = '';
  } catch (error) {
    clearToken();
    reset();
    errorRef.value = errorMessage(error);
  }
}

/** 401 时统一调用：清 token 并回到未登录态。 */
export function handleUnauthorized(): void {
  clearToken();
  reset();
  errorRef.value = 'auth';
}
