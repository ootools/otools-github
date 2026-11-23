<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GitHubRepo } from '../types';
import type { RepoSort, RepoType } from '../api';
import { formatCount, relativeTime, truncate } from '../format';
import AppIcon from './AppIcon.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{
  t: Translate;
  repos: GitHubRepo[];
  loading: boolean;
  errorText: string;
  hasMore: boolean;
  filterText: string;
}>();
const emit = defineEmits<{
  open: [repo: GitHubRepo];
  retry: [];
  'load-more': [];
  'change-filter': [filter: { type: RepoType; sort: RepoSort }];
}>();

const query = ref('');
const type = ref<RepoType>('owner');
const sort = ref<RepoSort>('updated');

const visible = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return needle ? props.repos.filter((repo) => repo.name.toLowerCase().includes(needle) || repo.full_name.toLowerCase().includes(needle)) : props.repos;
});

const changeFilter = (): void => {
  emit('change-filter', { type: type.value, sort: sort.value });
};
</script>

<template>
  <section class="repo-list">
    <header class="list-head">
      <div class="title-row">
        <h2>{{ props.t('navRepos') }}</h2>
        <span class="count">{{ props.t('repoCount', { count: formatCount(visible.length) }) }}</span>
      </div>
      <div class="tools">
        <label class="filter-input">
          <AppIcon name="search" :size="13" />
          <input v-model="query" type="text" :placeholder="props.t('searchPlaceholder')" spellcheck="false" />
          <button v-if="query" type="button" class="clear" @click="query = ''"><AppIcon name="close" :size="11" /></button>
        </label>
        <select v-model="type" class="select" :aria-label="props.t('allRepos')" @change="changeFilter">
          <option value="owner">{{ props.t('owner') }}</option>
          <option value="all">{{ props.t('allRepos') }}</option>
          <option value="private">{{ props.t('private') }}</option>
          <option value="public">{{ props.t('public') }}</option>
        </select>
        <select v-model="sort" class="select" :aria-label="props.t('sortBy')" @change="changeFilter">
          <option value="updated">{{ props.t('sortUpdated') }}</option>
          <option value="pushed">{{ props.t('pushedAt') }}</option>
          <option value="created">{{ props.t('sortCreated') }}</option>
          <option value="full_name">{{ props.t('sortName') }}</option>
        </select>
      </div>
    </header>

    <div v-if="props.errorText" class="error-box">
      <AppIcon name="alert" :size="15" />
      <span>{{ props.errorText }}</span>
      <button type="button" @click="emit('retry')">{{ props.t('retry') }}</button>
    </div>

    <div v-if="props.loading && !props.repos.length" class="skeletons">
      <div v-for="n in 5" :key="n" class="skeleton" />
    </div>

    <div v-else-if="!visible.length && !props.loading" class="empty">
      <AppIcon name="repo" :size="34" />
      <p>{{ props.t('noRepos') }}</p>
      <p class="filter-hint" v-if="props.filterText">{{ props.filterText }}</p>
    </div>

    <ul v-else class="items">
      <li v-for="repo in visible" :key="repo.id">
        <button class="item" type="button" @click="emit('open', repo)">
          <div class="item-main">
            <div class="item-title">
              <AppIcon :name="repo.private ? 'lock' : 'repo'" :size="14" />
              <strong>{{ repo.name }}</strong>
              <span class="badge" :class="repo.private ? 'private' : 'public'">{{ repo.private ? props.t('privateBadge') : props.t('publicBadge') }}</span>
              <span v-if="repo.fork" class="badge">{{ props.t('forkLabel') }}</span>
              <span v-if="repo.archived" class="badge">{{ props.t('archived') }}</span>
            </div>
            <p class="desc">{{ truncate(repo.description || props.t('noDescription'), 110) }}</p>
            <div class="meta">
              <span v-if="repo.language" class="lang"><i class="dot" />{{ repo.language }}</span>
              <span><AppIcon name="star" :size="12" /> {{ formatCount(repo.stargazers_count) }}</span>
              <span><AppIcon name="git-branch" :size="12" /> {{ formatCount(repo.forks_count) }}</span>
              <span class="updated">{{ props.t('updated') }} {{ relativeTime(repo.updated_at) }}</span>
            </div>
          </div>
          <AppIcon name="chevron-right" :size="15" class="arrow" />
        </button>
      </li>
    </ul>

    <div v-if="props.hasMore" class="more">
      <button type="button" :disabled="props.loading" @click="emit('load-more')">
        <AppIcon :name="props.loading ? 'loader' : 'chevron-down'" :size="14" :class="{ spin: props.loading }" />
        {{ props.t('loadMore') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.repo-list { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.list-head { flex: none; padding: 16px 20px 12px; border-bottom: 1px solid var(--gh-border-soft); }
.title-row { display: flex; align-items: baseline; gap: 10px; }
.title-row h2 { margin: 0; font-size: 16px; font-weight: 650; color: var(--gh-text); }
.count { font-size: 11px; color: var(--gh-text-3); }
.tools { display: flex; gap: 8px; margin-top: 12px; }
.filter-input { display: flex; align-items: center; gap: 6px; flex: 1; max-width: 340px; height: 30px; padding: 0 9px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-3); }
.filter-input:focus-within { border-color: var(--gh-accent); }
.filter-input input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--gh-text); font-size: 12px; font-family: inherit; }
.clear { border: 0; background: transparent; color: var(--gh-text-3); cursor: pointer; padding: 0; }
.select { height: 30px; padding: 0 7px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-size: 11.5px; font-family: inherit; cursor: pointer; }
.error-box { display: flex; align-items: center; gap: 8px; margin: 12px 20px 0; padding: 9px 11px; border-radius: 7px; background: color-mix(in srgb, var(--gh-danger) 11%, transparent); color: var(--gh-danger); font-size: 12px; }
.error-box span { flex: 1; }
.error-box button { border: 0; background: transparent; color: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
.items { flex: 1; min-height: 0; overflow-y: auto; margin: 0; padding: 6px 12px 12px; list-style: none; }
.item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; border: 1px solid transparent; border-radius: 9px; background: transparent; text-align: start; cursor: pointer; font-family: inherit; }
.item:hover { border-color: var(--gh-border); background: var(--gh-hover); }
.item-main { flex: 1; min-width: 0; }
.item-title { display: flex; align-items: center; gap: 7px; color: var(--gh-text-2); }
.item-title strong { font-size: 13px; color: var(--gh-accent); }
.badge { padding: 1px 6px; border: 1px solid var(--gh-border-strong); border-radius: 20px; font-size: 9.5px; color: var(--gh-text-3); line-height: 14px; }
.badge.private { color: #b1802b; border-color: color-mix(in srgb, #d9a441 45%, transparent); }
.desc { margin: 5px 0 7px; font-size: 11.5px; line-height: 1.5; color: var(--gh-text-2); }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 10.5px; color: var(--gh-text-3); }
.meta span { display: inline-flex; align-items: center; gap: 3px; }
.lang .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gh-accent); }
.updated { margin-inline-start: auto; }
.arrow { color: var(--gh-text-3); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; flex: 1; color: var(--gh-text-3); font-size: 12px; }
.filter-hint { font-size: 10.5px; }
.skeletons { padding: 6px 12px; }
.skeleton { height: 66px; margin-bottom: 6px; border-radius: 9px; background: linear-gradient(90deg, var(--gh-skeleton) 25%, var(--gh-skeleton-shine) 50%, var(--gh-skeleton) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.more { flex: none; display: flex; justify-content: center; padding: 10px; border-top: 1px solid var(--gh-border-soft); }
.more button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 14px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11.5px; cursor: pointer; }
.more button:hover { background: var(--gh-hover); }
</style>
