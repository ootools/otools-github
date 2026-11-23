import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from './sanitize.ts';

test('保留允许的标签与正文', () => {
  const html = '<h1>Title</h1><p>Hello <strong>world</strong> and <code>x=1</code>.</p>';
  const out = sanitizeHtml(html);
  assert.match(out, /<h1>Title<\/h1>/);
  assert.match(out, /<strong>world<\/strong>/);
  assert.match(out, /x=1/);
});

test('移除 script/style/iframe 及其内容', () => {
  const html = '<p>ok</p><script>alert(1)</script><style>body{}</style><iframe src="x"></iframe><p>done</p>';
  const out = sanitizeHtml(html);
  assert.doesNotMatch(out, /alert|body\{|iframe/i);
  assert.match(out, /<p>ok<\/p>/);
  assert.match(out, /<p>done<\/p>/);
});

test('剥离事件属性与 javascript 链接', () => {
  const html = '<a href="javascript:alert(1)" onclick="evil()" title="t">bad</a><a href="https://example.com">good</a>';
  const out = sanitizeHtml(html);
  assert.doesNotMatch(out, /javascript:|onclick|evil/i);
  assert.match(out, /href="https:\/\/example.com"/);
  assert.match(out, /rel="noopener noreferrer"/);
});

test('解码实体后仍能识别伪协议', () => {
  const html = '<a href="java&#115;cript&#58;alert(1)">x</a><a href="jav&#x09;ascript:alert(2)">y</a>';
  const out = sanitizeHtml(html);
  assert.doesNotMatch(out, /javascript:/i);
});

test('处理 data URL 图片：位图保留，svg/脚本拒绝', () => {
  const ok = '<img src="data:image/png;base64,AAAA" alt="c">';
  const bad = '<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="x">';
  assert.match(sanitizeHtml(ok), /data:image\/png;base64,AAAA/);
  assert.doesNotMatch(sanitizeHtml(bad), /<img/);
});

test('相对链接按 baseUrl 解析，协议相对补 https', () => {
  const html = '<a href="/foo/bar">rel</a><a href="//cdn.example.com/a.js">cdn</a>';
  const out = sanitizeHtml(html, 'https://github.com/octo/repo/blob/main/');
  assert.match(out, /href="https:\/\/github.com\/foo\/bar"/);
  assert.match(out, /href="https:\/\/cdn.example.com\/a.js"/);
});

test('未知标签解包但保留内容', () => {
  const out = sanitizeHtml('<details><summary>more</summary><p>body</p></details>');
  assert.doesNotMatch(out, /<details|<summary/);
  assert.match(out, /more/);
  assert.match(out, /<p>body<\/p>/);
});

test('跨标签的删除不会吞掉后续正文', () => {
  const out = sanitizeHtml('<div><script>x</script><span>keep</span></div>');
  assert.match(out, /keep/);
  assert.doesNotMatch(out, />x</);
});
