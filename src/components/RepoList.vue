<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GitHubRepo } from '../types';
import type { RepoSort, RepoType } from '../api';
import { formatCount } from '../format';
import AppIcon from './AppIcon.vue';
import RepoResults from './RepoResults.vue';

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

    <RepoResults
      :t="props.t"
      :repos="visible"
      :loading="props.loading"
      :error-text="props.errorText"
      :has-more="props.hasMore"
      :empty-text="props.t('noRepos')"
      :filter-text="props.filterText"
      @open="(repo) => emit('open', repo)"
      @retry="emit('retry')"
      @load-more="emit('load-more')"
    />
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
</style>
