/**
 * 公共仓库检索 / 排名的查询构造器（纯逻辑，零依赖，可单测）。
 * GitHub 官方 Search API 用 q 里的限定符表达筛选条件，这里集中拼装避免散落。
 */
import type { RankDateField, RankingMode, TimeRange } from './types';

const RANGE_DAYS: Record<TimeRange, number> = { week: 7, month: 30, year: 365 };

const languageQualifier = (language?: string): string => {
  const value = String(language ?? '').trim();
  if (!value) return '';
  return /\s/.test(value) ? `language:"${value}"` : `language:${value}`;
};

export interface RankingQueryInput {
  mode: RankingMode;
  language?: string;
  range?: TimeRange;
  dateField?: RankDateField;
  minStars?: number;
  now?: Date;
}

export interface SearchQuery {
  q: string;
  sort: 'stars' | 'updated';
  order: 'desc' | 'asc';
}

/** 星标总榜 / 近期热门榜。近期热门用日期限定符 + stars 下限近似「趋势」。 */
export function buildRankingQuery(input: RankingQueryInput): SearchQuery {
  const parts = ['is:public'];
  const language = languageQualifier(input.language);
  if (language) parts.push(language);

  if (input.mode === 'recent') {
    const range = input.range ?? 'month';
    const days = RANGE_DAYS[range] ?? RANGE_DAYS.month;
    const now = input.now ?? new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const field: RankDateField = input.dateField ?? 'pushed';
    parts.push(`${field}:>${cutoff}`);

    const minStars = Number.isFinite(input.minStars) ? Math.max(0, Math.floor(input.minStars as number)) : 10;
    parts.push(`stars:>${minStars}`);
  }

  return { q: parts.join(' '), sort: 'stars', order: 'desc' };
}

/** 关键词检索。文本保留用户原样，语言带点号/多词时加引号。 */
export function buildTextSearchQuery(input: { text?: string; language?: string }): string {
  const parts = ['is:public'];
  const text = String(input.text ?? '').trim();
  if (text) parts.push(text);
  const language = languageQualifier(input.language);
  if (language) parts.push(language);
  return parts.join(' ');
}
