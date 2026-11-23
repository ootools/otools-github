const currentLocale = (): string => {
  if (typeof document !== 'undefined' && document.documentElement.lang) return document.documentElement.lang;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'zh-CN';
};

/** GitHub 返回 ISO 8601 字符串。 */
export function relativeTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return '';
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  try {
    const formatter = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' });
    if (abs < 60) return formatter.format(diffSeconds, 'second');
    if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), 'minute');
    if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), 'hour');
    if (abs < 86400 * 30) return formatter.format(Math.round(diffSeconds / 86400), 'day');
    if (abs < 86400 * 365) return formatter.format(Math.round(diffSeconds / (86400 * 30)), 'month');
    return formatter.format(Math.round(diffSeconds / (86400 * 365)), 'year');
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

export function absoluteTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(currentLocale(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatCount(value: number | undefined | null): string {
  const count = Number(value ?? 0);
  if (!Number.isFinite(count)) return '0';
  try {
    return new Intl.NumberFormat(currentLocale()).format(count);
  } catch {
    return String(count);
  }
}

export function formatBytes(value: number | undefined | null): string {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let current = size;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  const text = Number.isInteger(current) ? String(current) : current.toFixed(1);
  return `${text} ${units[index]}`;
}

export function plainText(raw: string | undefined | null): string {
  const html = String(raw ?? '').trim();
  if (!html) return '';
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, ' ');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function truncate(text: string, length: number): string {
  const value = text.trim();
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

/** 仓库名规则：字母数字连字符下划线点，不能以点开头，不能连续点，不能首尾连字符/点。 */
export function isValidRepoName(name: string): boolean {
  const value = name.trim();
  return /^[A-Za-z0-9_][A-Za-z0-9._-]*$/.test(value) && !value.includes('..') && !/[.-]$/.test(value) && value.length <= 100;
}

/** 把 GitHub 的 owner/repo 路径拼成可点击的绝对路径（用于事件委托）。 */
export function repoUrl(owner: string, repo: string): string {
  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}
