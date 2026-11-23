import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMock } from './data.ts';

const search = (q: string, page = 1): any => {
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q', q);
  url.searchParams.set('sort', 'stars');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', '30');
  const result = resolveMock(url.toString(), { method: 'GET', body: '', auth: false });
  assert.ok(result, `mock 未命中：${q}`);
  return JSON.parse(result!.body);
};

test('星标总榜按 stars 降序且带分页', () => {
  const first = search('is:public');
  assert.equal(first.total_count, 30);
  assert.equal(first.items.length, 30);
  assert.ok(first.items[0].stargazers_count >= first.items[1].stargazers_count);
  const second = search('is:public', 2);
  assert.equal(second.items.length, 0);
});

test('语言过滤与 stars 下限生效', () => {
  const rust = search('is:public language:Rust stars:>50000');
  assert.ok(rust.items.length > 0);
  assert.ok(rust.items.every((item: any) => item.language === 'Rust' && item.stargazers_count > 50000));
});

test('近期热门按推送日期过滤', () => {
  const recent = search('is:public pushed:>2026-11-15 stars:>10');
  assert.ok(recent.items.length > 0);
  assert.ok(recent.items.every((item: any) => item.pushed_at.slice(0, 10) > '2026-11-15'));
});

test('文本检索命中仓库名或描述', () => {
  const found = search('is:public whisper');
  assert.ok(found.items.some((item: any) => item.name.includes('whisper')));
});

test('未匹配的路径返回 null', () => {
  assert.equal(resolveMock('https://api.github.com/unknown', { method: 'GET', body: '', auth: false }), null);
});
