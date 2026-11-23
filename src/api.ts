/**
 * GitHub REST API v3 访问层。
 *
 * 所有请求默认走宿主 `otools_host_http_send`（复用「设置 → 代理」），
 * 仅当宿主命令不可用时回退 webview fetch。设备流端点没有 CORS，必须走宿主。
 */
import { ref } from 'vue';
import { invoke, isOtoolsPluginRuntime } from 'otools-plugin-sdk/runtime';
import { API_BASE } from './config';
import { getToken, hasToken } from './token';
import type {
  GitHubComment,
  GitHubContent,
  GitHubIssue,
  GitHubRepo,
  GitHubUser,
  RepoForm,
} from './types';

const HOST_HTTP_COMMAND = 'otools_host_http_send';

export type GitHubErrorKind = 'network' | 'rate' | 'auth' | 'notfound' | 'validation' | 'http' | 'parse';

export class GitHubApiError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status?: number;
  readonly detail?: string;

  constructor(kind: GitHubErrorKind, message: string, options: { status?: number; detail?: string } = {}) {
    super(message);
    this.name = 'GitHubApiError';
    this.kind = kind;
    this.status = options.status;
    this.detail = options.detail;
  }
}

export const rateRemaining = ref<number | null>(null);
export const rateLimit = ref<number | null>(null);

export type HttpMethod = 'GET' | 'POST' | 'DELETE';
export type BodyType = 'none' | 'json' | 'form' | 'text';

export interface HttpResult {
  status: number;
  text: string;
  headers: Record<string, string>;
}

interface HostHttpResponse {
  status: number;
  body_text?: string | null;
  headers?: Array<{ key: string; value: string }>;
}

export interface RequestOptions {
  method?: HttpMethod;
  /** 附带 Authorization: Bearer <token>。 */
  auth?: boolean;
  accept?: string;
  bodyType?: BodyType;
  body?: string;
  timeoutSecs?: number;
  /** 允许在 mock 模式下命中假数据。 */
  mockable?: boolean;
}

const devMockEnabled = (): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('mock');
  } catch {
    return false;
  }
};

const canUseHostHttp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window as unknown as { __TAURI_INTERNALS__?: unknown };
  return Boolean(host.__TAURI_INTERNALS__) || isOtoolsPluginRuntime();
};

const toHeaderMap = (items: Array<{ key: string; value: string }> | undefined): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const item of items ?? []) {
    if (!item || typeof item.key !== 'string') continue;
    headers[item.key.toLowerCase()] = String(item.value ?? '');
  }
  return headers;
};

const trackRateLimit = (headers: Record<string, string>): void => {
  const remaining = Number(headers['x-ratelimit-remaining'] ?? headers['x-rate-limit-remaining']);
  const limit = Number(headers['x-ratelimit-limit'] ?? headers['x-rate-limit-limit']);
  if (Number.isFinite(remaining) && remaining >= 0) rateRemaining.value = remaining;
  if (Number.isFinite(limit) && limit > 0) rateLimit.value = limit;
};

const buildHeaders = (options: RequestOptions, includeAuth: boolean): Array<{ key: string; value: string; enabled: boolean }> => {
  const headers = [
    { key: 'Accept', value: options.accept ?? 'application/vnd.github+json', enabled: true },
    { key: 'X-GitHub-Api-Version', value: '2022-11-28', enabled: true },
    { key: 'User-Agent', value: 'OTools-GitHub/0.1', enabled: true },
  ];
  if (options.bodyType === 'json' && options.body) {
    headers.push({ key: 'Content-Type', value: 'application/json', enabled: true });
  }
  if (includeAuth) {
    const token = getToken();
    if (token) headers.push({ key: 'Authorization', value: `Bearer ${token}`, enabled: true });
  }
  return headers;
};

const hostRequest = async (url: string, options: RequestOptions, includeAuth: boolean): Promise<HttpResult> => {
  const response = await invoke<HostHttpResponse>(HOST_HTTP_COMMAND, {
    request: {
      id: '',
      name: 'github',
      method: options.method ?? 'GET',
      url,
      headers: buildHeaders(options, includeAuth),
      cookies: [],
      params: [],
      body_type: options.bodyType ?? 'none',
      body: options.body ?? '',
      timeout_secs: options.timeoutSecs ?? 25,
      follow_redirects: true,
    },
  });
  return {
    status: Number(response?.status ?? 0),
    text: String(response?.body_text ?? ''),
    headers: toHeaderMap(response?.headers),
  };
};

const browserRequest = async (url: string, options: RequestOptions, includeAuth: boolean): Promise<HttpResult> => {
  const headers: Record<string, string> = {};
  for (const header of buildHeaders(options, includeAuth)) {
    if (header.enabled) headers[header.key] = header.value;
  }
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body && options.bodyType !== 'none' ? options.body : undefined,
    cache: 'no-store',
  });
  const text = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key.toLowerCase()] = value;
  });
  return { status: response.status, text, headers: responseHeaders };
};

const performRequest = async (url: string, options: RequestOptions): Promise<HttpResult> => {
  const includeAuth = options.auth !== false;

  if (devMockEnabled() && options.mockable !== false) {
    const { resolveMock } = await import('./mock/data');
    const mocked = resolveMock(url, {
      method: options.method ?? 'GET',
      body: options.body ?? '',
      auth: Boolean(includeAuth && hasToken()),
    });
    if (mocked !== null) return { status: mocked.status, text: mocked.body, headers: {} };
  }

  if (canUseHostHttp()) {
    try {
      return await hostRequest(url, options, includeAuth);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[github] host http failed, falling back to fetch', error);
    }
  }
  return browserRequest(url, options, includeAuth);
};

const assertStatus = (result: HttpResult): void => {
  if (result.status === 401) throw new GitHubApiError('auth', 'token is invalid or expired', { status: 401 });
  if (result.status === 403 || result.status === 429) {
    throw new GitHubApiError('rate', 'API rate limit exceeded', { status: result.status });
  }
  if (result.status === 404) throw new GitHubApiError('notfound', 'resource not found', { status: 404 });
  if (result.status === 422) {
    let detail = '';
    try {
      const payload = JSON.parse(result.text) as { errors?: Array<{ message?: string }>; message?: string };
      detail = payload.errors?.map((item) => item.message ?? '').filter(Boolean).join('; ') || payload.message || '';
    } catch {
      detail = result.text.slice(0, 200);
    }
    throw new GitHubApiError('validation', detail || 'validation failed', { status: 422, detail });
  }
  if (!result.status || result.status >= 400) {
    throw new GitHubApiError('http', `unexpected status ${result.status}`, { status: result.status });
  }
};

const send = async (url: string, options: RequestOptions = {}): Promise<HttpResult> => {
  let result: HttpResult;
  try {
    result = await performRequest(url, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new GitHubApiError('network', 'network request failed', { detail: message });
  }
  trackRateLimit(result.headers);
  assertStatus(result);
  return result;
};

const getJson = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const result = await send(url, options);
  const text = result.text.trim();
  if (!text) throw new GitHubApiError('parse', 'empty response');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GitHubApiError('parse', 'response is not json', { detail: text.slice(0, 160) });
  }
};

const getText = async (url: string, options: RequestOptions = {}): Promise<string> => {
  const result = await send(url, options);
  return result.text;
};

/** OAuth 设备流的表单请求（不带 Authorization，Accept: application/json）。 */
export async function postOAuthForm(url: string, params: Record<string, string>): Promise<{ status: number; text: string }> {
  const body = new URLSearchParams(params).toString();
  const result = await send(url, {
    method: 'POST',
    bodyType: 'form',
    body,
    accept: 'application/json',
    auth: false,
    mockable: false,
  });
  return { status: result.status, text: result.text };
}

const query = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

const repoPath = (owner: string, repo: string): string =>
  `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

/* ------------------------------ 账号 ------------------------------ */

export function fetchUser(): Promise<GitHubUser> {
  return getJson<GitHubUser>(`${API_BASE}/user`);
}

/* ------------------------------ 仓库列表 / 新建 ------------------------------ */

export type RepoType = 'all' | 'owner' | 'private' | 'public';
export type RepoSort = 'updated' | 'created' | 'pushed' | 'full_name';

export function fetchRepos(options: {
  page?: number;
  perPage?: number;
  type?: RepoType;
  sort?: RepoSort;
} = {}): Promise<GitHubRepo[]> {
  const { page = 1, perPage = 30, type = 'owner', sort = 'updated' } = options;
  const url = `${API_BASE}/user/repos${query({ page, per_page: perPage, type, sort })}`;
  return getJson<GitHubRepo[]>(url).then((list) => (Array.isArray(list) ? list : []));
}

export function createRepo(form: RepoForm): Promise<GitHubRepo> {
  const payload: Record<string, string | boolean> = {
    name: form.name.trim(),
    private: form.private,
    auto_init: form.auto_init,
  };
  if (form.description.trim()) payload.description = form.description.trim();
  if (form.gitignore_template) payload.gitignore_template = form.gitignore_template;
  if (form.license_template) payload.license_template = form.license_template;
  return getJson<GitHubRepo>(`${API_BASE}/user/repos`, {
    method: 'POST',
    bodyType: 'json',
    body: JSON.stringify(payload),
  });
}

/* ------------------------------ 仓库详情（只读） ------------------------------ */

export function fetchRepo(owner: string, repo: string): Promise<GitHubRepo> {
  return getJson<GitHubRepo>(`${API_BASE}${repoPath(owner, repo)}`);
}

/** GitHub 的 html+json 响应有时是裸 HTML，有时是带 body_html 字段的 JSON，统一取出 HTML。 */
const extractHtml = (text: string): string => {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { body_html?: string; content?: string };
      if (typeof parsed.body_html === 'string') return parsed.body_html;
    } catch {
      // fall through
    }
  }
  return trimmed;
};

/** README 的渲染 HTML。 */
export function fetchReadmeHtml(owner: string, repo: string, ref?: string): Promise<string> {
  const url = `${API_BASE}${repoPath(owner, repo)}/readme${query({ ref })}`;
  return getText(url, { accept: 'application/vnd.github.html+json' }).then(extractHtml);
}

export function fetchContents(owner: string, repo: string, path: string, ref?: string): Promise<GitHubContent[]> {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const url = `${API_BASE}${repoPath(owner, repo)}/contents${clean ? `/${clean}` : ''}${query({ ref })}`;
  return getJson<GitHubContent | GitHubContent[]>(url).then((data) => (Array.isArray(data) ? data : [data]));
}

/** 文本文件预览（调用方先检查 size ≤ 1MB）。 */
export function fetchFileText(owner: string, repo: string, path: string, ref?: string): Promise<string> {
  const clean = path.replace(/^\/+/, '');
  const url = `${API_BASE}${repoPath(owner, repo)}/contents/${clean}${query({ ref })}`;
  return getText(url, { accept: 'application/vnd.github.raw+json' });
}

/* ------------------------------ Issue（只读） ------------------------------ */

export type IssueState = 'open' | 'closed' | 'all';

export function fetchIssues(
  owner: string,
  repo: string,
  options: { state?: IssueState; page?: number; perPage?: number } = {},
): Promise<GitHubIssue[]> {
  const { state = 'open', page = 1, perPage = 20 } = options;
  const url = `${API_BASE}${repoPath(owner, repo)}/issues${query({ state, page, per_page: perPage, sort: 'updated' })}`;
  return getJson<GitHubIssue[]>(url).then((list) =>
    Array.isArray(list) ? list.filter((item) => !item.pull_request) : [],
  );
}

export function fetchIssue(owner: string, repo: string, number: number): Promise<GitHubIssue> {
  return getJson<GitHubIssue>(`${API_BASE}${repoPath(owner, repo)}/issues/${number}`);
}

export function fetchIssueComments(owner: string, repo: string, number: number): Promise<GitHubComment[]> {
  return getJson<GitHubComment[]>(`${API_BASE}${repoPath(owner, repo)}/issues/${number}/comments`).then((list) =>
    Array.isArray(list) ? list : [],
  );
}

/** 用于根据 Accept 头拿到渲染后的正文：服务端返回 HTML 时重新取一次。 */
export function fetchIssueHtml(owner: string, repo: string, number: number): Promise<string> {
  return getText(`${API_BASE}${repoPath(owner, repo)}/issues/${number}`, {
    accept: 'application/vnd.github.html+json',
  }).then(extractHtml);
}

export function fetchIssueCommentsHtml(owner: string, repo: string, number: number): Promise<string[]> {
  return getText(`${API_BASE}${repoPath(owner, repo)}/issues/${number}/comments`, {
    accept: 'application/vnd.github.html+json',
  }).then((text) => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((item) =>
            typeof item === 'string' ? item : (item as { body_html?: string } | null)?.body_html ?? '',
          );
        }
      } catch {
        // fall through
      }
    }
    return [extractHtml(trimmed)];
  });
}
