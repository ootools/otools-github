<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchSearchRepos, GitHubApiError } from '../api';
import { formatCount } from '../format';
import { buildRankingQuery } from '../search-query';
import type { GitHubRepo, RankDateField, RankingMode, TimeRange } from '../types';
import AppIcon from './AppIcon.vue';
import RepoResults from './RepoResults.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{
  t: Translate;
  initialMode?: RankingMode;
  initialLanguage?: string;
  initialRange?: TimeRange;
}>();
const emit = defineEmits<{ open: [repo: GitHubRepo] }>();

const languages = ['', 'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'C', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Shell', 'Jupyter Notebook'];
const mode = ref<RankingMode>(props.initialMode ?? 'total');
const language = ref(props.initialLanguage ?? '');
const range = ref<TimeRange>(props.initialRange ?? 'month');
const dateField = ref<RankDateField>('pushed');
const minStars = ref(10);
const page = ref(1);
const repos = ref<GitHubRepo[]>([]);
const total = ref(0);
const loading = ref(false);
const errorText = ref('');

const hasMore = computed(() => repos.value.length > 0 && repos.value.length < Math.min(total.value, 1000) && repos.value.length >= page.value * 30);

const errorFor = (error: unknown): string => {
  if (!(error instanceof GitHubApiError)) return props.t('errorGeneric');
  if (error.kind === 'rate') return props.t('errorSearchRate');
  const map: Partial<Record<GitHubApiError['kind'], string>> = {
    network: 'errorNetwork', auth: 'errorAuth', notfound: 'errorNotFound', validation: 'errorValidation', parse: 'errorParse', http: 'errorHttp',
  };
  return props.t(map[error.kind] ?? 'errorGeneric');
};

const load = async (reset = false): Promise<void> => {
  if (reset) page.value = 1;
  loading.value = true;
  errorText.value = '';
  try {
    const { q, sort, order } = buildRankingQuery({
      mode: mode.value,
      language: language.value,
      range: range.value,
      dateField: dateField.value,
      minStars: minStars.value,
    });
    const result = await fetchSearchRepos({ q, sort, order, page: page.value, perPage: 30 });
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

const switchMode = (next: RankingMode): void => {
  if (mode.value === next) return;
  mode.value = next;
  void load(true);
};

const reload = (): void => { void load(true); };
const more = (): void => { page.value += 1; void load(); };

onMounted(() => void load(true));
</script>

<template>
  <section class="rankings-view">
    <header class="view-head">
      <div class="title-row">
        <h2>{{ t('navRankings') }}</h2>
        <span v-if="total" class="count">{{ formatCount(total) }}</span>
      </div>
      <div class="tabs">
        <button type="button" :class="{ active: mode === 'total' }" @click="switchMode('total')">
          <AppIcon name="star" :size="13" /> {{ t('rankTotal') }}
        </button>
        <button type="button" :class="{ active: mode === 'recent' }" @click="switchMode('recent')">
          <AppIcon name="fire" :size="13" /> {{ t('rankRecent') }}
        </button>
      </div>
      <p class="hint">{{ mode === 'total' ? t('rankTotalHint') : t('rankRecentHint') }}</p>
      <div class="filters">
        <select v-model="language" class="select" :aria-label="t('rankLanguage')" @change="reload">
          <option v-for="item in languages" :key="item" :value="item">{{ item || t('browseAll') }}</option>
        </select>
        <template v-if="mode === 'recent'">
          <select v-model="range" class="select" :aria-label="t('rankRange')" @change="reload">
            <option value="week">{{ t('rangeWeek') }}</option>
            <option value="month">{{ t('rangeMonth') }}</option>
            <option value="year">{{ t('rangeYear') }}</option>
          </select>
          <select v-model="dateField" class="select" :aria-label="t('rankDateField')" @change="reload">
            <option value="pushed">{{ t('rankPushed') }}</option>
            <option value="created">{{ t('rankCreated') }}</option>
          </select>
          <label class="stars-input" :title="t('rankMinStars')">
            <AppIcon name="star" :size="12" />
            <input v-model.number="minStars" type="number" min="0" max="100000" @change="reload" />
          </label>
        </template>
        <button class="icon-button" type="button" :title="t('refresh')" @click="reload"><AppIcon name="refresh" :size="15" /></button>
      </div>
    </header>
    <RepoResults
      :t="t"
      :repos="repos"
      :loading="loading"
      :error-text="errorText"
      :has-more="hasMore"
      :empty-text="t('empty')"
      :show-rank="true"
      @open="(repo) => emit('open', repo)"
      @retry="reload"
      @load-more="more"
    />
  </section>
</template>

<style scoped>
.rankings-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.view-head { flex: none; padding: 16px 20px 12px; border-bottom: 1px solid var(--gh-border-soft); }
.title-row { display: flex; align-items: baseline; gap: 9px; }
.view-head h2 { margin: 0; font-size: 16px; font-weight: 650; color: var(--gh-text); }
.count { font-size: 11px; color: var(--gh-text-3); }
.tabs { display: flex; gap: 3px; width: fit-content; margin-top: 12px; padding: 3px; border-radius: 8px; background: var(--gh-fill); }
.tabs button { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 11px; border: 0; border-radius: 6px; background: transparent; color: var(--gh-text-2); font-family: inherit; font-size: 11.5px; cursor: pointer; }
.tabs button.active { background: var(--gh-overlay); color: var(--gh-accent); font-weight: 600; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
.hint { margin: 10px 0; font-size: 11px; color: var(--gh-text-3); }
.filters { display: flex; flex-wrap: wrap; gap: 8px; }
.select { height: 30px; padding: 0 8px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11.5px; cursor: pointer; }
.stars-input { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 8px; border: 1px solid var(--gh-border); border-radius: 7px; color: var(--gh-text-3); }
.stars-input input { width: 54px; border: 0; outline: 0; background: transparent; color: var(--gh-text); font-family: inherit; font-size: 11.5px; }
</style>
