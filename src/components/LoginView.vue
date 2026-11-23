<script setup lang="ts">
import { computed, ref } from 'vue';
import { authError, flowStatus, startDeviceLogin, cancelDeviceLogin, userCode, verifyUri, hasBuiltInClientId } from '../auth';
import { deviceVerifyUrl, getClientId } from '../config';
import { copyText, openLink } from '../links';
import AppIcon from './AppIcon.vue';
import logoUrl from '../../logo.svg';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{ t: Translate }>();

const started = ref(false);
const copied = ref(false);
const busy = computed(() => started.value && ['requesting', 'pending', 'slow_down'].includes(flowStatus.value));

const statusText = computed(() => {
  switch (flowStatus.value) {
    case 'requesting':
      return props.t('loading');
    case 'pending':
      return props.t('waiting');
    case 'slow_down':
      return props.t('slowDown');
    case 'expired':
      return props.t('expired');
    case 'denied':
      return props.t('denied');
    default:
      return '';
  }
});

const errorText = computed(() => {
  const error = authError.value;
  if (!error) return '';
  const map: Record<string, string> = {
    network: 'errorNetwork',
    auth: 'errorAuth',
    rate: 'errorRate',
    expired: 'expired',
    denied: 'denied',
    client_id_missing: 'clientIdMissing',
    expired_token: 'expired',
    access_denied: 'denied',
  };
  const key = map[error];
  return key ? props.t(key) : props.t('loginError', { message: error });
});

const browserUrl = computed(() => verifyUri.value || deviceVerifyUrl(getClientId()));

const start = async (): Promise<void> => {
  started.value = true;
  await startDeviceLogin();
};

const copy = async (): Promise<void> => {
  if (!(await copyText(userCode.value))) return;
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1600);
};
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <img class="login-logo" :src="logoUrl" alt="" />
      <h1 class="login-title">{{ props.t('loginTitle') }}</h1>
      <p class="login-desc">{{ props.t('loginDesc') }}</p>

      <template v-if="!hasBuiltInClientId">
        <div class="notice notice-warn">
          <AppIcon name="info" :size="16" />
          <div>
            <strong>{{ props.t('clientIdMissing') }}</strong>
            <p>{{ props.t('clientIdMissingDesc') }}</p>
          </div>
        </div>
        <button class="primary-button" type="button" @click="openLink('https://github.com/settings/developers')">
          {{ props.t('registerApp') }}
          <AppIcon name="external" :size="13" />
        </button>
      </template>

      <template v-else-if="!started">
        <ol class="steps">
          <li>{{ props.t('step1') }}</li>
          <li>{{ props.t('step2') }}</li>
          <li>{{ props.t('step3') }}</li>
        </ol>
        <button class="primary-button" type="button" @click="start">
          <AppIcon name="repo" :size="15" />
          {{ props.t('startLogin') }}
        </button>
      </template>

      <template v-else>
        <div v-if="userCode" class="code-block">
          <span class="code-label">{{ props.t('codeLabel') }}</span>
          <code class="code-value">{{ userCode }}</code>
          <button class="small-button" type="button" @click="copy">
            <AppIcon :name="copied ? 'check' : 'copy'" :size="13" />
            {{ copied ? props.t('copied') : props.t('copyCode') }}
          </button>
          <span class="code-hint">{{ props.t('deviceCodeHint') }}</span>
        </div>

        <button class="primary-button" type="button" @click="openLink(browserUrl)">
          {{ props.t('openBrowser') }}
          <AppIcon name="external" :size="13" />
        </button>

        <div v-if="statusText" class="status-line">
          <AppIcon :name="busy ? 'loader' : 'info'" :size="14" :class="{ spin: busy }" />
          <span>{{ statusText }}</span>
        </div>
        <div v-if="errorText" class="notice notice-error">{{ errorText }}</div>

        <button class="ghost-button" type="button" @click="cancelDeviceLogin(); started = false">
          {{ props.t('cancel') }}
        </button>
      </template>

      <p class="revoke-hint">{{ props.t('revokeHint') }}</p>
    </div>
  </div>
</template>

<style scoped>
.login-view { display: flex; align-items: center; justify-content: center; height: 100%; padding: 24px; background: var(--gh-bg); }
.login-card { width: 100%; max-width: 460px; padding: 30px 32px; border: 1px solid var(--gh-border); border-radius: 14px; background: var(--gh-overlay); box-shadow: 0 12px 40px rgb(0 0 0 / 0.08); }
.login-logo { width: 44px; height: 44px; border-radius: 12px; display: block; margin-bottom: 18px; }
.login-title { margin: 0 0 8px; font-size: 20px; font-weight: 650; color: var(--gh-text); }
.login-desc { margin: 0 0 20px; font-size: 12.5px; line-height: 1.7; color: var(--gh-text-2); }
.steps { margin: 0 0 22px; padding-inline-start: 20px; color: var(--gh-text-2); font-size: 12.5px; line-height: 2; }
.primary-button, .small-button, .ghost-button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid transparent; border-radius: 8px; cursor: pointer; font-family: inherit; }
.primary-button { width: 100%; height: 36px; background: var(--gh-accent); color: #fff; font-size: 13px; font-weight: 600; }
.primary-button:hover { filter: brightness(1.08); }
.small-button { height: 26px; padding: 0 9px; background: var(--gh-fill); color: var(--gh-text); font-size: 11px; }
.small-button:hover { background: var(--gh-hover-strong); }
.ghost-button { width: 100%; height: 32px; margin-top: 10px; background: transparent; color: var(--gh-text-3); font-size: 12px; }
.ghost-button:hover { background: var(--gh-hover); }
.code-block { display: flex; flex-direction: column; align-items: center; gap: 9px; margin-bottom: 20px; padding: 18px; border: 1px dashed var(--gh-border-strong); border-radius: 10px; background: var(--gh-fill); }
.code-label { font-size: 11px; color: var(--gh-text-3); }
.code-value { font-size: 25px; font-weight: 700; letter-spacing: 0.08em; color: var(--gh-text); }
.code-hint { font-size: 10.5px; color: var(--gh-text-3); }
.status-line { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: 14px; font-size: 12px; color: var(--gh-text-2); }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.notice { display: flex; gap: 9px; margin: 0 0 16px; padding: 11px 12px; border-radius: 8px; font-size: 12px; line-height: 1.6; }
.notice-warn { background: color-mix(in srgb, #f59e0b 12%, transparent); color: var(--gh-text-2); }
.notice-error { background: color-mix(in srgb, var(--gh-danger) 12%, transparent); color: var(--gh-danger); }
.notice p { margin: 4px 0 0; }
.revoke-hint { margin: 22px 0 0; text-align: center; font-size: 11px; color: var(--gh-text-3); }
</style>
