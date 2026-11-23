/** `?mock=1` 离线预览用的假数据（仅 DEV 生效）。形状对齐 GitHub REST API v3。 */
import type { GitHubComment, GitHubContent, GitHubIssue, GitHubRepo, GitHubUser } from '../types';

const json = (body: unknown): { status: number; body: string } => ({ status: 200, body: JSON.stringify(body) });

const user: GitHubUser = {
  login: 'octocat',
  id: 583231,
  name: 'The Octocat',
  avatar_url: '',
  html_url: 'https://github.com/octocat',
  type: 'User',
};

const repo = (
  name: string,
  options: Partial<GitHubRepo> = {},
): GitHubRepo => ({
  id: name.length * 7919,
  name,
  full_name: `octocat/${name}`,
  owner: user,
  description: `${name} — 一个用 OTools GitHub 插件管理的示例仓库`,
  private: false,
  fork: false,
  archived: false,
  html_url: `https://github.com/octocat/${name}`,
  language: ['TypeScript', 'Rust', 'Python', 'Go', null][name.length % 5],
  stargazers_count: (name.length * 37) % 900,
  forks_count: (name.length * 11) % 120,
  open_issues_count: (name.length * 3) % 24,
  default_branch: 'main',
  created_at: '2025-01-12T08:21:00Z',
  updated_at: '2026-11-20T14:32:00Z',
  pushed_at: '2026-11-21T09:05:00Z',
  size: 128,
  topics: ['otools', 'demo'],
  ...options,
});

const repos: GitHubRepo[] = [
  repo('hello-world', { private: false, stargazers_count: 1832, language: 'TypeScript' }),
  repo('otools-plugin-github', { description: 'GitHub 插件本体（示例）', stargazers_count: 246, language: 'TypeScript' }),
  repo('local-tools', { private: true, language: 'Rust', description: '一堆本地小工具' }),
  repo('dotfiles', { language: null, description: '我的 shell / editor 配置' }),
  repo('weekly-rss', { language: 'Python', stargazers_count: 54 }),
  repo('tiny-go-proxy', { language: 'Go', stargazers_count: 91 }),
];

const issues: GitHubIssue[] = [
  {
    id: 2101,
    number: 42,
    title: '登录后仓库列表一直显示加载中',
    body: '授权成功后停在 loading，刷新也没用。',
    body_html: '<p>授权成功后停在 loading，刷新也没用。</p><p>环境：macOS 15，OTools 0.9.15。</p>',
    state: 'open',
    user,
    html_url: 'https://github.com/octocat/hello-world/issues/42',
    created_at: '2026-11-18T03:12:00Z',
    updated_at: '2026-11-21T07:45:00Z',
    comments: 3,
    labels: [{ name: 'bug', color: 'd73a4a' }],
  },
  {
    id: 2102,
    number: 41,
    title: '希望支持仓库名称本地过滤',
    body: '仓库多了之后翻页很麻烦，能不能加个输入框？',
    body_html: '<p>仓库多了之后翻页很麻烦，能不能加个输入框？</p>',
    state: 'open',
    user,
    html_url: 'https://github.com/octocat/hello-world/issues/41',
    created_at: '2026-11-15T11:00:00Z',
    updated_at: '2026-11-16T02:30:00Z',
    comments: 1,
    labels: [{ name: 'enhancement', color: 'a2eeef' }],
  },
  {
    id: 2103,
    number: 40,
    title: '文档里的截图链接失效了',
    body: 'README 中第二张图 404。',
    body_html: '<p>README 中第二张图 404。</p>',
    state: 'closed',
    user,
    html_url: 'https://github.com/octocat/hello-world/issues/40',
    created_at: '2026-11-01T09:00:00Z',
    updated_at: '2026-11-02T04:00:00Z',
    comments: 2,
    labels: [],
  },
];

const comments: GitHubComment[] = [
  {
    id: 9001,
    body: '我也遇到了，重开插件就好了。',
    body_html: '<p>我也遇到了，重开插件就好了。</p>',
    user,
    created_at: '2026-11-18T05:00:00Z',
    html_url: 'https://github.com/octocat/hello-world/issues/42#issuecomment-9001',
  },
  {
    id: 9002,
    body: '已定位到 token 刷新时机的问题，下个版本修复。',
    body_html: '<p>已定位到 token 刷新时机的问题，下个版本修复。</p>',
    user,
    created_at: '2026-11-19T08:00:00Z',
    html_url: 'https://github.com/octocat/hello-world/issues/42#issuecomment-9002',
  },
];

const contentsByPath: Record<string, GitHubContent[]> = {
  '': [
    { type: 'dir', name: 'src', path: 'src', sha: 'a1', html_url: 'https://github.com/octocat/hello-world/tree/main/src' },
    { type: 'dir', name: 'docs', path: 'docs', sha: 'a2', html_url: 'https://github.com/octocat/hello-world/tree/main/docs' },
    { type: 'file', name: '.gitignore', path: '.gitignore', sha: 'a3', size: 120, download_url: '', html_url: '' },
    { type: 'file', name: 'LICENSE', path: 'LICENSE', sha: 'a4', size: 1070, download_url: '', html_url: '' },
    { type: 'file', name: 'README.md', path: 'README.md', sha: 'a5', size: 820, download_url: '', html_url: '' },
    { type: 'file', name: 'package.json', path: 'package.json', sha: 'a6', size: 460, download_url: '', html_url: '' },
  ],
  src: [
    { type: 'file', name: 'main.ts', path: 'src/main.ts', sha: 'b1', size: 320, download_url: '', html_url: '' },
    { type: 'file', name: 'api.ts', path: 'src/api.ts', sha: 'b2', size: 2140, download_url: '', html_url: '' },
  ],
  docs: [
    { type: 'file', name: 'SPEC.md', path: 'docs/SPEC.md', sha: 'c1', size: 640, download_url: '', html_url: '' },
  ],
};

const readmeHtml = `
<h1>Hello World 👋</h1>
<p>这是一个用于 <strong>OTools GitHub 插件</strong> 离线预览的示例仓库。</p>
<h2>特性</h2>
<ul><li>OAuth 设备流登录</li><li>仓库列表与新建</li><li>README 渲染</li></ul>
<h2>用法</h2>
<pre><code>npm install
npm run dev</code></pre>
<p>更多见 <a href="docs/SPEC.md">docs/SPEC.md</a>。</p>
<blockquote><p>所有请求走宿主 HTTP 通道。</p></blockquote>
`.trim();

const fileTexts: Record<string, string> = {
  'README.md': '# Hello World\n\n示例仓库。\n',
  'package.json': '{\n  "name": "hello-world",\n  "version": "1.0.0"\n}\n',
  '.gitignore': 'node_modules/\ndist/\n',
  'LICENSE': 'MIT License\n\nCopyright (c) 2026 octocat\n',
  'src/main.ts': 'console.log("hello from mock");\n',
  'src/api.ts': 'export const API_BASE = "https://api.github.com";\n',
  'docs/SPEC.md': '# SPEC\n\n这是假数据。\n',
};

/** 公共仓库池：多 owner / 多语言 / 跨年份星标，供搜索与两个排行榜离线预览。 */
const publicRepoSpecs: Array<[string, string | null, number, string, string]> = [
  ['freeCodeCamp/freeCodeCamp', 'TypeScript', 412000, '2014-10-01', '2026-11-20'],
  ['facebook/react', 'JavaScript', 232000, '2013-05-24', '2026-11-21'],
  ['vuejs/core', 'TypeScript', 48000, '2016-07-15', '2026-11-19'],
  ['microsoft/vscode', 'TypeScript', 176000, '2015-09-03', '2026-11-22'],
  ['torvalds/linux', 'C', 198000, '2011-09-04', '2026-11-22'],
  ['rust-lang/rust', 'Rust', 102000, '2010-06-16', '2026-11-21'],
  ['golang/go', 'Go', 125000, '2009-11-10', '2026-11-20'],
  ['python/cpython', 'Python', 68000, '2009-02-20', '2026-11-21'],
  ['denoland/deno', 'Rust', 99000, '2018-05-23', '2026-11-18'],
  ['vercel/next.js', 'JavaScript', 128000, '2016-10-25', '2026-11-22'],
  ['sveltejs/svelte', 'TypeScript', 81000, '2016-11-15', '2026-11-17'],
  ['nodejs/node', 'JavaScript', 112000, '2010-03-11', '2026-11-21'],
  ['django/django', 'Python', 83000, '2012-03-19', '2026-11-16'],
  ['laravel/laravel', 'PHP', 81000, '2011-09-05', '2026-11-15'],
  ['apple/swift', 'Swift', 68000, '2015-12-03', '2026-11-19'],
  ['flutter/flutter', 'Dart', 165000, '2017-05-11', '2026-11-20'],
  ['kubernetes/kubernetes', 'Go', 112000, '2014-06-07', '2026-11-22'],
  ['docker/docs', null, 7000, '2013-02-08', '2026-10-30'],
  ['home-assistant/core', 'Python', 76000, '2013-09-19', '2026-11-21'],
  ['huggingface/transformers', 'Python', 142000, '2018-11-07', '2026-11-22'],
  ['langchain-ai/langchain', 'Python', 95000, '2022-10-17', '2026-11-20'],
  ['openai/whisper', 'Python', 86000, '2022-09-16', '2026-09-12'],
  ['ollama/ollama', 'Go', 105000, '2023-06-28', '2026-11-22'],
  ['_withastro/astro', 'TypeScript', 47000, '2022-04-20', '2026-11-18'],
  ['tailwindlabs/tailwindcss', 'TypeScript', 84000, '2017-11-08', '2026-11-19'],
  ['shadcn-ui/ui', 'TypeScript', 99000, '2023-01-05', '2026-11-21'],
  ['localstack/localstack', 'Python', 31000, '2017-08-02', '2026-11-16'],
  ['ollama/ollama-python', 'Python', 2100, '2023-07-20', '2026-11-10'],
  ['anthropics/claude-code', 'TypeScript', 56000, '2025-02-22', '2026-11-22'],
  ['modelcontextprotocol/servers', 'TypeScript', 78000, '2024-11-05', '2026-11-21'],
];

const publicRepos: GitHubRepo[] = publicRepoSpecs.map(([fullName, language, stars, created, pushed], index) => {
  const [owner, name] = fullName.split('/');
  return {
    id: 900000 + index,
    name: name!,
    full_name: fullName,
    owner: { login: owner!, html_url: `https://github.com/${owner}` },
    description: `${name} — 公共仓库离线预览示例（第 ${index + 1} 条）`,
    private: false,
    html_url: `https://github.com/${fullName}`,
    homepage: '',
    language,
    stargazers_count: stars,
    forks_count: Math.round(stars / 9),
    open_issues_count: (index * 7) % 420,
    default_branch: 'main',
    created_at: `${created}T08:00:00Z`,
    updated_at: `${pushed}T10:00:00Z`,
    pushed_at: `${pushed}T10:00:00Z`,
    topics: ['open-source', language ?? 'tools'],
  };
});

/** Mock 版搜索：按 q 中的限定符做粗过滤 + 排序 + 分页。 */
const mockSearch = (url: URL): MockResult => {
  const q = url.searchParams.get('q') ?? '';
  const language = q.match(/language:"?([^"\s]+)"?/)?.[1]?.toLowerCase();
  const minStars = Number(q.match(/stars:>(\d+)/)?.[1] ?? 0);
  const pushedAfter = q.match(/pushed:>(\d{4}-\d{2}-\d{2})/)?.[1];
  const createdAfter = q.match(/created:>(\d{4}-\d{2}-\d{2})/)?.[1];
  const terms = q
    .split(/\s+/)
    .filter((term) => term && !/^(is:|language:|stars:|created:|pushed:)/.test(term) && !term.startsWith('"'));

  let items = publicRepos.filter((repo) => {
    if (language && repo.language?.toLowerCase() !== language) return false;
    if (Number(repo.stargazers_count ?? 0) <= minStars) return false;
    if (pushedAfter && String(repo.pushed_at ?? '').slice(0, 10) <= pushedAfter) return false;
    if (createdAfter && String(repo.created_at ?? '').slice(0, 10) <= createdAfter) return false;
    if (terms.length && !terms.some((term) => `${repo.full_name} ${repo.description ?? ''}`.toLowerCase().includes(term.toLowerCase()))) return false;
    return true;
  });

  const sort = url.searchParams.get('sort');
  if (sort === 'stars') items = [...items].sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0));
  else if (sort === 'updated') items = [...items].sort((a, b) => String(b.pushed_at).localeCompare(String(a.pushed_at)));

  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
  const perPage = Math.max(1, Number(url.searchParams.get('per_page') ?? 30));
  return json({ total_count: items.length, incomplete_results: false, items: items.slice((page - 1) * perPage, page * perPage) });
};

export interface MockResult {
  status: number;
  body: string;
}

/** 命中返回 MockResult，未命中返回 null。 */
export function resolveMock(
  rawUrl: string,
  _options: { method: string; body: string; auth: boolean },
): MockResult | null {
  const url = new URL(rawUrl, 'https://api.github.com');
  const path = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, '');
  const method = _options.method;

  if (path === '/user' && method === 'GET') return json(user);
  if (path === '/user/repos' && method === 'GET') return json(repos);
  if (path === '/user/repos' && method === 'POST') {
    let name = 'new-repo';
    try {
      name = String(JSON.parse(_options.body).name ?? name);
    } catch {
      // ignore
    }
    return json(repo(name, { private: false, description: '刚刚通过插件创建（模拟）' }));
  }

  if (path === '' && method === 'GET') return json(repos[0]);

  if (path === '/readme') return { status: 200, body: readmeHtml };

  if (path.startsWith('/contents/') || path === '/contents') {
    const decoded = decodeURIComponent(path.replace(/^\/contents\/?/, ''));
    if (method === 'GET' && Object.prototype.hasOwnProperty.call(contentsByPath, decoded)) {
      return json(contentsByPath[decoded]);
    }
    if (Object.prototype.hasOwnProperty.call(fileTexts, decoded)) {
      return { status: 200, body: fileTexts[decoded]! };
    }
  }

  if (path === '/issues' && method === 'GET') {
    const state = url.searchParams.get('state') ?? 'open';
    const stateIssues = issues.filter((issue) => issue.state === state || state === 'all');
    return json(state === 'open' ? issues.filter((i) => i.state === 'open') : stateIssues);
  }

  const issueMatch = path.match(/^\/issues\/(\d+)$/);
  if (issueMatch) {
    const number = Number(issueMatch[1]);
    const issue = issues.find((item) => item.number === number) ?? issues[0]!;
    return json(issue);
  }

  if (/^\/issues\/\d+\/comments$/.test(path)) return json(comments);

  if (path === '/search/repositories' && method === 'GET') return mockSearch(url);

  return null;
}
