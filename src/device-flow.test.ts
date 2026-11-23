import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeWithDeviceFlow,
  classifyTokenError,
  nextPollDelayMs,
  parseTokenResponse,
  type FormResponse,
  type DeviceFlowStatus,
} from './device-flow.ts';

test('parseTokenResponse 支持 JSON 与 form-urlencoded', () => {
  assert.equal(parseTokenResponse('{"access_token":"gho_x","scope":"repo"}').access_token, 'gho_x');
  const form = parseTokenResponse('error=authorization_pending&error_description=waiting');
  assert.equal(form.error, 'authorization_pending');
  assert.equal(form.error_description, 'waiting');
  assert.equal(parseTokenResponse('').error, 'empty_response');
});

test('classifyTokenError 覆盖状态机全部分支', () => {
  assert.equal(classifyTokenError('authorization_pending'), 'pending');
  assert.equal(classifyTokenError({ error: 'slow_down' }), 'slow_down');
  assert.equal(classifyTokenError({ error: 'expired_token' }), 'expired');
  assert.equal(classifyTokenError({ error: 'access_denied' }), 'denied');
  assert.equal(classifyTokenError({ error: 'weird' }), 'error');
});

test('nextPollDelayMs 尊重 interval 且 slow_down +5s', () => {
  assert.equal(nextPollDelayMs(7, false), 7000);
  assert.equal(nextPollDelayMs(7, true), 12000);
  assert.equal(nextPollDelayMs(0, false), 5000);
});

const codeResponse = (interval = 0): FormResponse => ({
  status: 200,
  text: JSON.stringify({
    device_code: 'dev123',
    user_code: 'ABCD-1234',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval,
  }),
});

test('完整流程：pending → slow_down → success，token 与状态正确', async () => {
  const statuses: DeviceFlowStatus[] = [];
  const delays: number[] = [];
  const responses: FormResponse[] = [
    codeResponse(5),
    { status: 200, text: '{"error":"authorization_pending"}' },
    { status: 200, text: '{"error":"slow_down"}' },
    { status: 200, text: '{"access_token":"gho_ok","scope":"repo, read:user"}' },
  ];
  const token = await authorizeWithDeviceFlow({
    clientId: 'cid',
    scope: 'repo, read:user',
    deviceCodeUrl: 'https://github.com/login/device/code',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    postForm: async () => responses.shift()!,
    sleep: async (ms) => {
      delays.push(ms);
    },
    onStatus: (status) => statuses.push(status),
  });
  assert.equal(token, 'gho_ok');
  assert.deepEqual(statuses, ['requesting', 'pending', 'pending', 'slow_down', 'success']);
  assert.deepEqual(delays, [5000, 5000, 10000]);
});

test('expired_token 与 access_denied 映射到明确错误', async () => {
  await assert.rejects(
    authorizeWithDeviceFlow({
      clientId: 'cid',
      scope: 'repo',
      deviceCodeUrl: 'u1',
      tokenUrl: 'u2',
      postForm: async (url) => (url === 'u1' ? codeResponse() : { status: 200, text: '{"error":"expired_token"}' }),
      sleep: async () => {},
    }),
    /expired_token/,
  );
  await assert.rejects(
    authorizeWithDeviceFlow({
      clientId: 'cid',
      scope: 'repo',
      deviceCodeUrl: 'u1',
      tokenUrl: 'u2',
      postForm: async (url) => (url === 'u1' ? codeResponse() : { status: 200, text: '{"error":"access_denied"}' }),
      sleep: async () => {},
    }),
    /access_denied/,
  );
});

test('shouldStop 在轮询中生效', async () => {
  let calls = 0;
  await assert.rejects(
    authorizeWithDeviceFlow({
      clientId: 'cid',
      scope: 'repo',
      deviceCodeUrl: 'u1',
      tokenUrl: 'u2',
      postForm: async (url) => {
        calls += 1;
        return url === 'u1' ? codeResponse() : { status: 200, text: '{"error":"authorization_pending"}' };
      },
      sleep: async () => {},
      shouldStop: () => calls > 1,
    }),
    /取消/,
  );
});
