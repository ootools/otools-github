<script setup lang="ts">
import { computed, reactive } from 'vue';
import type { RepoForm } from '../types';
import { isValidRepoName } from '../format';
import AppIcon from './AppIcon.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{ t: Translate; busy: boolean; errorText: string }>();
const emit = defineEmits<{ create: [form: RepoForm]; cancel: [] }>();

const form = reactive<RepoForm>({
  name: '',
  description: '',
  private: false,
  auto_init: true,
  gitignore_template: '',
  license_template: '',
});

const gitignores = ['', 'Node', 'Python', 'Rust', 'Go', 'Java', 'VisualStudioCode', 'macOS', 'Unity', 'Android'];
const licenses = ['', 'mit', 'apache-2.0', 'gpl-3.0', 'bsd-2-clause', 'bsd-3-clause', 'mpl-2.0', 'unlicense'];

const nameError = computed(() => {
  if (!form.name.trim()) return props.t('nameRequired');
  if (!isValidRepoName(form.name)) return props.t('nameInvalid');
  return '';
});

const submit = (): void => {
  if (nameError.value || props.busy) return;
  emit('create', { ...form });
};
</script>

<template>
  <section class="new-repo">
    <div class="panel">
      <div class="panel-head">
        <button class="icon-button" type="button" :title="props.t('back')" @click="emit('cancel')"><AppIcon name="back" :size="16" /></button>
        <h2>{{ props.t('newRepoTitle') }}</h2>
      </div>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span class="label">{{ props.t('repoName') }} <i class="req">*</i></span>
          <input v-model="form.name" type="text" :placeholder="props.t('repoNamePlaceholder')" spellcheck="false" autofocus />
          <small v-if="nameError" class="field-error">{{ nameError }}</small>
        </label>

        <label class="field">
          <span class="label">{{ props.t('description') }}</span>
          <textarea v-model="form.description" rows="2" :placeholder="props.t('descriptionPlaceholder')" />
        </label>

        <div class="field">
          <span class="label">{{ props.t('visibility') }}</span>
          <div class="radio-row">
            <label class="radio-card" :class="{ selected: !form.private }">
              <input v-model="form.private" type="radio" :value="false" />
              <AppIcon name="repo" :size="15" />
              <span>{{ props.t('publicOption') }}</span>
            </label>
            <label class="radio-card" :class="{ selected: form.private }">
              <input v-model="form.private" type="radio" :value="true" />
              <AppIcon name="lock" :size="15" />
              <span>{{ props.t('privateOption') }}</span>
            </label>
          </div>
        </div>

        <label class="check-row">
          <input v-model="form.auto_init" type="checkbox" />
          <span>{{ props.t('autoInit') }}</span>
        </label>

        <div class="two-col">
          <label class="field">
            <span class="label">{{ props.t('gitignoreTemplate') }}</span>
            <select v-model="form.gitignore_template" :disabled="!form.auto_init">
              <option v-for="item in gitignores" :key="item" :value="item">{{ item || props.t('noneOption') }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">{{ props.t('licenseTemplate') }}</span>
            <select v-model="form.license_template" :disabled="!form.auto_init">
              <option v-for="item in licenses" :key="item" :value="item">{{ item || props.t('noneOption') }}</option>
            </select>
          </label>
        </div>

        <div v-if="props.errorText" class="error-box">{{ props.errorText }}</div>

        <div class="actions">
          <button class="ghost-button" type="button" @click="emit('cancel')">{{ props.t('cancel') }}</button>
          <button class="primary-button" type="submit" :disabled="props.busy || Boolean(nameError)">
            <AppIcon :name="props.busy ? 'loader' : 'plus'" :size="14" :class="{ spin: props.busy }" />
            {{ props.t('createRepo') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.new-repo { display: flex; justify-content: center; height: 100%; overflow-y: auto; padding: 24px; background: var(--gh-bg); }
.panel { width: 100%; max-width: 580px; height: fit-content; border: 1px solid var(--gh-border); border-radius: 12px; background: var(--gh-overlay); }
.panel-head { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-bottom: 1px solid var(--gh-border-soft); }
.panel-head h2 { margin: 0; font-size: 15px; font-weight: 650; color: var(--gh-text); }
.form { display: flex; flex-direction: column; gap: 15px; padding: 18px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 11.5px; font-weight: 600; color: var(--gh-text-2); }
.req { color: var(--gh-danger); font-style: normal; }
.field input[type="text"], .field textarea, .field select { width: 100%; padding: 8px 10px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text); font-size: 12px; font-family: inherit; outline: 0; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--gh-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--gh-accent) 12%, transparent); }
.field textarea { resize: vertical; line-height: 1.6; }
.field select:disabled { opacity: 0.5; }
.field-error { font-size: 10.5px; color: var(--gh-danger); }
.radio-row { display: flex; gap: 10px; }
.radio-card { display: flex; align-items: center; gap: 7px; flex: 1; padding: 10px 12px; border: 1px solid var(--gh-border); border-radius: 8px; color: var(--gh-text-2); font-size: 12px; cursor: pointer; }
.radio-card.selected { border-color: var(--gh-accent); background: var(--gh-active); color: var(--gh-accent); }
.radio-card input { accent-color: var(--gh-accent); }
.check-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--gh-text-2); cursor: pointer; }
.check-row input { accent-color: var(--gh-accent); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.error-box { padding: 9px 11px; border-radius: 7px; background: color-mix(in srgb, var(--gh-danger) 11%, transparent); color: var(--gh-danger); font-size: 11.5px; }
.actions { display: flex; justify-content: flex-end; gap: 9px; padding-top: 4px; }
.primary-button { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 15px; border: 0; border-radius: 7px; background: var(--gh-accent); color: #fff; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.primary-button:disabled { opacity: 0.55; cursor: default; }
.ghost-button { height: 32px; padding: 0 12px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 12px; cursor: pointer; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
