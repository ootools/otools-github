<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchSearchRepos, GitHubApiError } from '../api';
import { formatCount } from '../format';
import { buildTextSearchQuery } from '../search-query';
import type { GitHubRepo, SearchSort } from '../types';
import AppIcon from './AppIcon.vue';
import RepoResults from './RepoResults.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{ t: Translate; initialQ?: string; initialLanguage?: string }>();
const emit = defineEmits<{ open: [repo: GitHubRepo] }>();

const languages = ['', 'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'C', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Shell', 'Jupyter Notebook'];
const text = ref(props.initialQ ?? '');
const language = ref(props.initialLanguage ?? '');
const sort = ref<SearchSort>('best-match');
const page = ref(1);
const repos = ref<GitHubRepo[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref('');

const hasMore = computed(() => repos.value.length > 0 && repos.value.length < Math.min(total.value, 1000) && repos.value.length >= page.value * 30);
const titleText = computed(() => total.value ? props.t('searchResults', { count: formatCount(total.value) }) : props.t('searchTitle'));

const errorFor = (error: unknown): string => {
  if (!(error instanceof GitHubApiError)) return props.t('errorGeneric');
  if (error.kind === 'rate') return props.t('errorSearchRate');
  const map: Partial<Record<GitHubApiError['kind'], string>> = {
    network: 'errorNetwork', auth: 'errorAuth', notfound: 'errorNotFound', validation: 'errorValidation', parse: 'errorParse', http: 'errorHttp',
  };
  return props.t(map[error.kind] ?? 'errorGeneric');
};

const run = async (reset = false): Promise<void> => {
  if (!text.value.trim() && !language.value) {
    repos.value = [];
    total.value = 0;
    errorText.value = '';
    return;
  }
  if (reset) page.value = 1;
  loading.value = true;
  errorText.value = '';
  try {
    const q = buildTextSearchQuery({ text: text.value, language: language.value });
    const result = await fetchSearchRepos({ q, sort: sort.value, page: page.value, perPage: 30 });
    repos.value = reset || page.value === 1 ? result.items : [...repos.value, ...result.items];
    total.value = result.total_count;
  } catch (error) {
    repos.value = [];
    total.value = 0;
    errorText.value = errorFor(error);
  } finally {
    loading.value = false;
  }
};

const submit = (): void => { void run(true); };
const more = (): void => { page.value += 1; void run(); };
const changeSort = (): void => { void run(true); };

onMounted(() => { if (props.initialQ || props.initialLanguage) void run(true); });
</script>

<template>
  <section class="search-view">
    <header class="view-head">
      <h2>{{ titleText }}</h2>
      <p class="hint">{{ t('searchHint') }}</p>
      <form class="toolbar" @submit.prevent="submit">
        <label class="search-input">
          <AppIcon name="search" :size="14" />
          <input v-model="text" type="text" :placeholder="t('searchPlaceholder')" spellcheck="false" />
        </label>
        <select v-model="language" class="select" :aria-label="t('rankLanguage')" @change="submit">
          <option v-for="item in languages" :key="item" :value="item">{{ item || t('allRepos') }}</option>
        </select>
        <select v-model="sort" class="select" :aria-label="t('sortBy')" @change="changeSort">
          <option value="best-match">{{ t('searchSortBestMatch') }}</option>
          <option value="stars">{{ t('sortStars') }}</option>
          <option value="updated">{{ t('sortUpdated') }}</option>
        </select>
        <button class="primary-button" type="submit" :disabled="loading"><AppIcon name="search" :size="13" /> {{ t('searchButton') }}</button>
      </form>
    </header>
    <RepoResults
      :t="t"
      :repos="repos"
      :loading="loading"
      :error-text="errorText"
      :has-more="hasMore"
      :empty-text="t('noSearchResults')"
      @open="(repo) => emit('open', repo)"
      @retry="submit"
      @load-more="more"
    />
  </section>
</template>

<style scoped>
.search-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.view-head { flex: none; padding: 16px 20px 12px; border-bottom: 1px solid var(--gh-border-soft); }
.view-head h2 { margin: 0; font-size: 16px; font-weight: 650; color: var(--gh-text); }
.hint { margin: 4px 0 12px; font-size: 11px; color: var(--gh-text-3); }
.toolbar { display: flex; gap: 8px; }
.search-input { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-3); }
.search-input:focus-within { border-color: var(--gh-accent); }
.search-input input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--gh-text); font-size: 12px; font-family: inherit; }
.select { height: 32px; padding: 0 8px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11.5px; cursor: pointer; }
.primary-button { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 13px; border: 0; border-radius: 7px; background: var(--gh-accent); color: #fff; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.primary-button:disabled { opacity: 0.55; cursor: default; }
</style>
