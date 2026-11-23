/** GitHub REST API v3 的最小类型集合（只覆盖插件用到的字段）。 */

export interface GitHubUser {
  login: string;
  id?: number;
  name?: string | null;
  avatar_url?: string;
  html_url?: string;
  type?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  description?: string | null;
  private: boolean;
  fork?: boolean;
  archived?: boolean;
  html_url: string;
  homepage?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  default_branch?: string;
  created_at?: string;
  updated_at?: string;
  pushed_at?: string;
  size?: number;
  topics?: string[];
  license?: { spdx_id?: string; name?: string } | null;
}

export interface GitHubContent {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  size?: number;
  download_url?: string | null;
  html_url?: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  /** 服务端渲染后的 HTML（Accept: application/vnd.github.html+json）。 */
  body_html?: string;
  state: 'open' | 'closed';
  user?: GitHubUser | null;
  html_url: string;
  created_at?: string;
  updated_at?: string;
  comments?: number;
  labels?: Array<{ name: string; color?: string }>;
  /** 存在该字段说明其实是 PR，从 issue 列表里过滤掉。 */
  pull_request?: unknown;
}

export interface GitHubComment {
  id: number;
  body?: string | null;
  body_html?: string;
  user?: GitHubUser | null;
  created_at?: string;
  html_url?: string;
}

export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface OAuthTokenResult {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface RepoForm {
  name: string;
  description: string;
  private: boolean;
  auto_init: boolean;
  gitignore_template: string;
  license_template: string;
}

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results?: boolean;
  items: GitHubRepo[];
}

export type RankingMode = 'total' | 'recent';
export type TimeRange = 'week' | 'month' | 'year';
export type RankDateField = 'created' | 'pushed';
export type SearchSort = 'best-match' | 'stars' | 'updated';

export interface RankingOptions {
  mode: RankingMode;
  language?: string;
  range?: TimeRange;
  dateField?: RankDateField;
  minStars?: number;
}

export type View =
  | { kind: 'rankings'; mode?: RankingMode; language?: string; range?: TimeRange }
  | { kind: 'search'; q?: string; language?: string }
  | { kind: 'repos' }
  | { kind: 'new-repo' }
  | { kind: 'repo'; owner: string; repo: string; path?: string }
  | { kind: 'issues'; owner: string; repo: string }
  | { kind: 'issue'; owner: string; repo: string; number: number }
  | { kind: 'settings' };
