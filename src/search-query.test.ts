import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRankingQuery, buildTextSearchQuery } from './search-query.ts';

const NOW = new Date('2026-11-23T00:00:00.000Z');

test('星标总榜：只含公开限定，可选语言', () => {
  assert.deepEqual(buildRankingQuery({ mode: 'total', now: NOW }), {
    q: 'is:public', sort: 'stars', order: 'desc',
  });
  assert.equal(buildRankingQuery({ mode: 'total', language: 'TypeScript', now: NOW }).q, 'is:public language:TypeScript');
});

test('多词语言自动加引号', () => {
  assert.equal(
    buildRankingQuery({ mode: 'total', language: 'Jupyter Notebook', now: NOW }).q,
    'is:public language:"Jupyter Notebook"',
  );
});

test('近期热门：三种时间范围，日期可注入且确定', () => {
  assert.equal(buildRankingQuery({ mode: 'recent', range: 'week', now: NOW }).q, 'is:public pushed:>2026-11-16 stars:>10');
  assert.equal(buildRankingQuery({ mode: 'recent', range: 'month', now: NOW }).q, 'is:public pushed:>2026-10-24 stars:>10');
  assert.equal(buildRankingQuery({ mode: 'recent', range: 'year', now: NOW }).q, 'is:public pushed:>2025-11-23 stars:>10');
});

test('近期热门可切 created 字段与星标下限', () => {
  assert.equal(
    buildRankingQuery({ mode: 'recent', range: 'week', dateField: 'created', minStars: 100, now: NOW }).q,
    'is:public created:>2026-11-16 stars:>100',
  );
});

test('非法/缺省输入有合理回退', () => {
  const fallback = buildRankingQuery({ mode: 'recent', range: 'year', minStars: -5, language: '  ', now: NOW });
  assert.equal(fallback.q, 'is:public pushed:>2025-11-23 stars:>0');
});

test('文本检索：关键词 + 公开 + 可选语言', () => {
  assert.equal(buildTextSearchQuery({}), 'is:public');
  assert.equal(buildTextSearchQuery({ text: 'otools plugin' }), 'is:public otools plugin');
  assert.equal(
    buildTextSearchQuery({ text: 'cli', language: 'Go' }),
    'is:public cli language:Go',
  );
});
