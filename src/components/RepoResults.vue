<script setup lang="ts">
import type { GitHubRepo } from '../types';
import { formatCount, relativeTime, truncate } from '../format';
import AppIcon from './AppIcon.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
withDefaults(defineProps<{
  t: Translate;
  repos: GitHubRepo[];
  loading: boolean;
  errorText: string;
  hasMore: boolean;
  emptyText: string;
  filterText?: string;
  showRank?: boolean;
}>(), { filterText: '', showRank: false });

const emit = defineEmits<{
  open: [repo: GitHubRepo];
  retry: [];
  'load-more': [];
}>();
</script>

<template>
  <div class="results">
    <div v-if="errorText" class="error-box">
      <AppIcon name="alert" :size="15" />
      <span>{{ errorText }}</span>
      <button type="button" @click="emit('retry')">{{ t('retry') }}</button>
    </div>

    <div v-if="loading && !repos.length" class="skeletons">
      <div v-for="n in 5" :key="n" class="skeleton" />
    </div>

    <div v-else-if="!repos.length && !loading" class="empty">
      <AppIcon name="repo" :size="34" />
      <p>{{ emptyText }}</p>
      <p v-if="filterText" class="filter-hint">{{ filterText }}</p>
    </div>

    <ul v-else class="items">
      <li v-for="(repo, index) in repos" :key="repo.id">
        <button class="item" type="button" @click="emit('open', repo)">
          <span v-if="showRank" class="rank" :class="`top-${index + 1}`">{{ index + 1 }}</span>
          <div class="item-main">
            <div class="item-title">
              <AppIcon :name="repo.private ? 'lock' : 'repo'" :size="14" />
              <strong>{{ repo.full_name }}</strong>
              <span class="badge" :class="repo.private ? 'private' : 'public'">{{ repo.private ? t('privateBadge') : t('publicBadge') }}</span>
              <span v-if="repo.fork" class="badge">{{ t('forkLabel') }}</span>
              <span v-if="repo.archived" class="badge">{{ t('archived') }}</span>
            </div>
            <p class="desc">{{ truncate(repo.description || t('noDescription'), 110) }}</p>
            <div class="meta">
              <span v-if="repo.language" class="lang"><i class="dot" />{{ repo.language }}</span>
              <span><AppIcon name="star" :size="12" /> {{ formatCount(repo.stargazers_count) }}</span>
              <span><AppIcon name="git-branch" :size="12" /> {{ formatCount(repo.forks_count) }}</span>
              <span class="updated">{{ t('updated') }} {{ relativeTime(repo.updated_at) }}</span>
            </div>
          </div>
          <AppIcon name="chevron-right" :size="15" class="arrow" />
        </button>
      </li>
    </ul>

    <div v-if="hasMore" class="more">
      <button type="button" :disabled="loading" @click="emit('load-more')">
        <AppIcon :name="loading ? 'loader' : 'chevron-down'" :size="14" :class="{ spin: loading }" />
        {{ t('loadMore') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.results { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.error-box { display: flex; align-items: center; gap: 8px; margin: 12px 20px 0; padding: 9px 11px; border-radius: 7px; background: color-mix(in srgb, var(--gh-danger) 11%, transparent); color: var(--gh-danger); font-size: 12px; }
.error-box span { flex: 1; }
.error-box button { border: 0; background: transparent; color: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
.items { flex: 1; min-height: 0; overflow-y: auto; margin: 0; padding: 6px 12px 12px; list-style: none; }
.item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; border: 1px solid transparent; border-radius: 9px; background: transparent; text-align: start; cursor: pointer; font-family: inherit; }
.item:hover { border-color: var(--gh-border); background: var(--gh-hover); }
.rank { width: 26px; flex: none; text-align: center; font-size: 14px; font-weight: 700; color: var(--gh-text-3); font-variant-numeric: tabular-nums; }
.rank.top-1 { color: #e0a800; }
.rank.top-2 { color: #9aa4b2; }
.rank.top-3 { color: #c47c42; }
.item-main { flex: 1; min-width: 0; }
.item-title { display: flex; align-items: center; gap: 7px; color: var(--gh-text-2); min-width: 0; }
.item-title strong { font-size: 12.5px; color: var(--gh-accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { padding: 1px 6px; border: 1px solid var(--gh-border-strong); border-radius: 20px; font-size: 9.5px; color: var(--gh-text-3); line-height: 14px; flex: none; }
.badge.private { color: #b1802b; border-color: color-mix(in srgb, #d9a441 45%, transparent); }
.desc { margin: 5px 0 7px; font-size: 11.5px; line-height: 1.5; color: var(--gh-text-2); }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-size: 10.5px; color: var(--gh-text-3); }
.meta span { display: inline-flex; align-items: center; gap: 3px; }
.lang .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gh-accent); }
.updated { margin-inline-start: auto; }
.arrow { color: var(--gh-text-3); flex: none; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; flex: 1; color: var(--gh-text-3); font-size: 12px; }
.filter-hint { font-size: 10.5px; }
.skeletons { padding: 6px 12px; flex: 1; }
.skeleton { height: 66px; margin-bottom: 6px; border-radius: 9px; background: linear-gradient(90deg, var(--gh-skeleton) 25%, var(--gh-skeleton-shine) 50%, var(--gh-skeleton) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.more { flex: none; display: flex; justify-content: center; padding: 10px; border-top: 1px solid var(--gh-border-soft); }
.more button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 14px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11.5px; cursor: pointer; }
.more button:hover { background: var(--gh-hover); }
</style>
