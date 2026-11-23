<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { fetchIssues, GitHubApiError, type IssueState } from '../api';
import { relativeTime } from '../format';
import type { GitHubIssue, GitHubRepo } from '../types';
import AppIcon from './AppIcon.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{
  t: Translate;
  owner: string;
  repo: string;
  repos: GitHubRepo[];
}>();
const emit = defineEmits<{
  open: [number: number];
  'select-repo': [owner: string, repo: string];
  back: [];
}>();

const state = ref<IssueState>('open');
const page = ref(1);
const issues = ref<GitHubIssue[]>([]);
const loading = ref(false);
const errorText = ref('');
const picked = ref('');

const pickerValue = computed({
  get: () => picked.value || (props.repos[0]?.full_name ?? ''),
  set: (value: string) => (picked.value = value),
});

const load = async (): Promise<void> => {
  if (!props.owner || !props.repo) return;
  loading.value = true;
  errorText.value = '';
  try {
    issues.value = await fetchIssues(props.owner, props.repo, { state: state.value, page: page.value, perPage: 20 });
  } catch (error) {
    issues.value = [];
    errorText.value = error instanceof GitHubApiError && error.kind === 'notfound' ? props.t('repoNotFound') : props.t('errorNetwork');
  } finally {
    loading.value = false;
  }
};

const chooseState = (next: IssueState): void => {
  state.value = next;
  page.value = 1;
  void load();
};

const selectPickedRepo = (): void => {
  const [owner, repo] = pickerValue.value.split('/');
  if (owner && repo) emit('select-repo', owner, repo);
};

onMounted(() => void load());
watch(() => [props.owner, props.repo], () => {
  page.value = 1;
  void load();
});
</script>

<template>
  <section class="issue-list">
    <template v-if="!props.owner || !props.repo">
      <div class="picker">
        <AppIcon name="issue" :size="28" />
        <h2>{{ props.t('issuesTitle') }}</h2>
        <p>{{ props.t('noRepos') }}</p>
        <div class="picker-row">
          <select v-model="pickerValue" class="picker-select">
            <option v-for="item in props.repos" :key="item.id" :value="item.full_name">{{ item.full_name }}</option>
          </select>
          <button class="primary-button" type="button" :disabled="!pickerValue" @click="selectPickedRepo">{{ props.t('confirm') }}</button>
        </div>
      </div>
    </template>

    <template v-else>
      <header class="list-head">
        <button class="icon-button" type="button" :title="props.t('back')" @click="emit('back')"><AppIcon name="back" :size="16" /></button>
        <div class="head-main">
          <h2>{{ props.t('issuesTitle') }}</h2>
          <span class="repo-name">{{ props.owner }}/{{ props.repo }}</span>
        </div>
        <div class="state-tabs">
          <button type="button" :class="{ active: state === 'open' }" @click="chooseState('open')">{{ props.t('open') }}</button>
          <button type="button" :class="{ active: state === 'closed' }" @click="chooseState('closed')">{{ props.t('closed') }}</button>
          <button type="button" :class="{ active: state === 'all' }" @click="chooseState('all')">{{ props.t('allStates') }}</button>
        </div>
      </header>

      <div v-if="errorText" class="error-box">{{ errorText }} <button type="button" @click="load">{{ props.t('retry') }}</button></div>

      <div v-if="loading" class="center-state"><AppIcon name="loader" :size="20" class="spin" /> {{ props.t('loading') }}</div>
      <div v-else-if="!issues.length" class="center-state"><AppIcon name="issue" :size="28" /> {{ props.t('noIssues') }}</div>
      <ul v-else class="items">
        <li v-for="issue in issues" :key="issue.id">
          <button class="item" type="button" @click="emit('open', issue.number)">
            <AppIcon name="issue" :size="15" :class="issue.state === 'closed' ? 'closed' : 'opened'" />
            <div class="item-main">
              <strong>{{ issue.title }}</strong>
              <div class="meta">
                <span>#{{ issue.number }}</span>
                <span>{{ props.t('openedBy', { user: issue.user?.login ?? '-' }) }}</span>
                <span>{{ relativeTime(issue.updated_at) }}</span>
                <span v-if="issue.comments" class="comments"><AppIcon name="reply" :size="11" /> {{ issue.comments }}</span>
              </div>
              <div v-if="issue.labels?.length" class="labels">
                <span v-for="label in issue.labels" :key="label.name" class="label" :style="{ borderColor: `#${label.color ?? '888'}` }">{{ label.name }}</span>
              </div>
            </div>
          </button>
        </li>
      </ul>

      <footer class="pager">
        <button type="button" :disabled="page <= 1 || loading" @click="page--; load()">{{ props.t('prev') }}</button>
        <span>{{ props.t('page', { page }) }}</span>
        <button type="button" :disabled="issues.length < 20 || loading" @click="page++; load()">{{ props.t('next') }}</button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.issue-list { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.picker { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; flex: 1; color: var(--gh-text-3); }
.picker h2 { margin: 0; font-size: 16px; color: var(--gh-text); }
.picker p { margin: 0; font-size: 12px; }
.picker-row { display: flex; gap: 8px; margin-top: 14px; }
.picker-select { height: 32px; min-width: 240px; padding: 0 8px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text); font-family: inherit; font-size: 12px; }
.primary-button { height: 32px; padding: 0 14px; border: 0; border-radius: 7px; background: var(--gh-accent); color: #fff; font-family: inherit; font-size: 12px; cursor: pointer; }
.list-head { display: flex; align-items: center; gap: 10px; flex: none; padding: 12px 16px; border-bottom: 1px solid var(--gh-border-soft); }
.head-main { flex: 1; min-width: 0; }
.head-main h2 { margin: 0; font-size: 15px; font-weight: 650; color: var(--gh-text); }
.repo-name { font-size: 10.5px; color: var(--gh-text-3); }
.state-tabs { display: flex; gap: 3px; padding: 3px; border-radius: 8px; background: var(--gh-fill); }
.state-tabs button { height: 24px; padding: 0 9px; border: 0; border-radius: 6px; background: transparent; color: var(--gh-text-2); font-family: inherit; font-size: 11px; cursor: pointer; }
.state-tabs button.active { background: var(--gh-overlay); color: var(--gh-accent); font-weight: 600; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
.error-box { margin: 10px 16px 0; padding: 8px 10px; border-radius: 7px; background: color-mix(in srgb, var(--gh-danger) 11%, transparent); color: var(--gh-danger); font-size: 11.5px; }
.error-box button { margin-inline-start: 8px; border: 0; background: transparent; color: inherit; cursor: pointer; }
.center-state { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: var(--gh-text-3); font-size: 12px; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.items { flex: 1; min-height: 0; overflow-y: auto; margin: 0; padding: 6px 12px; list-style: none; }
.item { display: flex; align-items: flex-start; gap: 9px; width: 100%; padding: 11px 10px; border: 1px solid transparent; border-radius: 8px; background: transparent; text-align: start; cursor: pointer; font-family: inherit; }
.item:hover { border-color: var(--gh-border); background: var(--gh-hover); }
.item > svg { flex: none; margin-top: 2px; }
.opened { color: var(--gh-success); }
.closed { color: #8250df; }
.item-main { flex: 1; min-width: 0; }
.item-main strong { font-size: 12.5px; color: var(--gh-text); }
.meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; font-size: 10.5px; color: var(--gh-text-3); }
.comments { display: inline-flex; align-items: center; gap: 3px; }
.labels { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.label { padding: 1px 7px; border: 1px solid; border-radius: 20px; font-size: 9.5px; color: var(--gh-text-2); }
.pager { display: flex; align-items: center; justify-content: center; gap: 14px; flex: none; padding: 9px; border-top: 1px solid var(--gh-border-soft); font-size: 11px; color: var(--gh-text-3); }
.pager button { height: 26px; padding: 0 10px; border: 1px solid var(--gh-border); border-radius: 6px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11px; cursor: pointer; }
.pager button:disabled { opacity: 0.5; cursor: default; }
</style>
