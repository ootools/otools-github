<script setup lang="ts">
import { computed, ref } from 'vue';
import { rateLimit, rateRemaining } from '../api';
import { authScopes, currentUser, signOut } from '../auth';
import { getClientIdOverride, setClientIdOverride } from '../config';
import { openLink } from '../links';
import AppIcon from './AppIcon.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{ t: Translate }>();
const emit = defineEmits<{ signedOut: [] }>();

const clientId = ref(getClientIdOverride());
const saved = ref(false);

const rateText = computed(() => {
  if (rateRemaining.value === null) return '';
  return props.t('rateLimit', { remaining: rateRemaining.value, limit: rateLimit.value ?? '—' });
});

const save = (): void => {
  setClientIdOverride(clientId.value);
  saved.value = true;
  window.setTimeout(() => (saved.value = false), 1500);
};

const logout = (): void => {
  if (typeof window === 'undefined' || window.confirm(props.t('logoutConfirm'))) {
    signOut();
    emit('signedOut');
  }
};
</script>

<template>
  <section class="settings">
    <div class="panel">
      <h2 class="title"><AppIcon name="settings" :size="16" /> {{ props.t('settingsTitle') }}</h2>

      <div class="group">
        <h3>{{ props.t('account') }}</h3>
        <div class="row">
          <span class="key">{{ props.t('signedInAs', { user: currentUser?.login ?? '-' }) }}</span>
          <button class="danger-button" type="button" @click="logout"><AppIcon name="logout" :size="13" /> {{ props.t('logout') }}</button>
        </div>
        <div v-if="authScopes" class="row"><span class="key">{{ props.t('scopes') }}</span><code class="value">{{ authScopes }}</code></div>
        <div v-if="rateText" class="row"><span class="key">API</span><span class="value">{{ rateText }}</span></div>
      </div>

      <div class="group">
        <h3>{{ props.t('clientIdOverride') }}</h3>
        <p class="hint">{{ props.t('clientIdMissingDesc') }}</p>
        <div class="input-row">
          <input v-model="clientId" type="text" :placeholder="props.t('clientIdPlaceholder')" spellcheck="false" />
          <button class="primary-button" type="button" @click="save">{{ saved ? props.t('saved') : props.t('save') }}</button>
        </div>
      </div>

      <div class="group">
        <h3>{{ props.t('aboutTitle') }}</h3>
        <p class="hint">{{ props.t('aboutText') }}</p>
        <button class="link-button" type="button" @click="openLink('https://github.com/settings/applications')">
          {{ props.t('revokeHint') }} <AppIcon name="external" :size="12" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings { display: flex; justify-content: center; height: 100%; overflow-y: auto; padding: 24px; background: var(--gh-bg); }
.panel { width: 100%; max-width: 600px; height: fit-content; border: 1px solid var(--gh-border); border-radius: 12px; background: var(--gh-overlay); }
.title { display: flex; align-items: center; gap: 8px; margin: 0; padding: 15px 18px; border-bottom: 1px solid var(--gh-border-soft); font-size: 15px; font-weight: 650; color: var(--gh-text); }
.group { padding: 16px 18px; border-bottom: 1px solid var(--gh-border-soft); }
.group:last-child { border-bottom: 0; }
.group h3 { margin: 0 0 11px; font-size: 11px; font-weight: 650; color: var(--gh-text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.row { display: flex; align-items: center; gap: 10px; min-height: 29px; font-size: 12px; }
.row .key { flex: 1; color: var(--gh-text-2); }
.row .value { color: var(--gh-text); font-size: 11px; }
.hint { margin: 0 0 11px; font-size: 11.5px; line-height: 1.65; color: var(--gh-text-3); }
.input-row { display: flex; gap: 8px; }
.input-row input { flex: 1; height: 32px; padding: 0 10px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text); font-family: inherit; font-size: 12px; outline: 0; }
.input-row input:focus { border-color: var(--gh-accent); }
.primary-button, .danger-button, .link-button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; border-radius: 7px; font-family: inherit; cursor: pointer; }
.primary-button { height: 32px; padding: 0 14px; border: 0; background: var(--gh-accent); color: #fff; font-size: 12px; font-weight: 600; }
.danger-button { height: 28px; padding: 0 10px; border: 1px solid color-mix(in srgb, var(--gh-danger) 45%, transparent); background: transparent; color: var(--gh-danger); font-size: 11px; }
.danger-button:hover { background: color-mix(in srgb, var(--gh-danger) 10%, transparent); }
.link-button { padding: 0; border: 0; background: transparent; color: var(--gh-accent); font-size: 11.5px; }
</style>
