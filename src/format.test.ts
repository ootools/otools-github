import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, isValidRepoName } from './format.ts';

test('仓库名校验遵循 GitHub 规则', () => {
  assert.equal(isValidRepoName('my-repo'), true);
  assert.equal(isValidRepoName('my_repo.v2'), true);
  assert.equal(isValidRepoName('.hidden'), false);
  assert.equal(isValidRepoName('a..b'), false);
  assert.equal(isValidRepoName('bad-'), false);
  assert.equal(isValidRepoName('has space'), false);
  assert.equal(isValidRepoName('中文'), false);
});

test('formatBytes 输出人类可读大小', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1024 * 1024), '1 MB');
});
