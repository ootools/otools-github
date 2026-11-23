<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { fetchContents, fetchFileText, fetchReadmeHtml, fetchRepo, GitHubApiError } from '../api';
import { formatBytes, formatCount, relativeTime } from '../format';
import { openLink } from '../links';
import { sanitizeHtml } from '../sanitize';
import type { GitHubContent, GitHubRepo } from '../types';
import AppIcon from './AppIcon.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{ t: Translate; owner: string; repo: string; path?: string }>();
const emit = defineEmits<{ back: []; 'open-issues': [] }>();

const info = ref<GitHubRepo | null>(null);
const loading = ref(true);
const errorText = ref('');
const readme = ref('');
const contents = ref<GitHubContent[]>([]);
const dirStack = ref<string[]>([]);
const filePreview = ref<{ name: string; text: string } | null>(null);
const fileLoading = ref(false);

const refName = computed(() => info.value?.default_branch || 'main');
const readmeBase = computed(() => `https://github.com/${props.owner}/${props.repo}/blob/${refName.value}/${dirStack.value.join('/')}${dirStack.value.length ? '/' : ''}`);
const renderedReadme = computed(() => sanitizeHtml(readme.value, readmeBase.value));
const currentPath = computed(() => dirStack.value.join('/'));

const errorFor = (error: unknown): string => {
  if (error instanceof GitHubApiError) {
    const map: Partial<Record<GitHubApiError['kind'], string>> = {
      notfound: 'repoNotFound', auth: 'errorAuth', rate: 'errorRate', network: 'errorNetwork',
    };
    return props.t(map[error.kind] ?? 'errorGeneric');
  }
  return props.t('errorGeneric');
};

const loadInfo = async (): Promise<void> => {
  loading.value = true;
  errorText.value = '';
  try {
    const [detail, readmeHtml, rootContents] = await Promise.all([
      fetchRepo(props.owner, props.repo),
      fetchReadmeHtml(props.owner, props.repo).catch(() => ''),
      fetchContents(props.owner, props.repo, ''),
    ]);
    info.value = detail;
    readme.value = readmeHtml;
    contents.value = rootContents;
    dirStack.value = props.path ? props.path.split('/').filter(Boolean) : [];
    if (dirStack.value.length) await loadDir();
  } catch (error) {
    errorText.value = errorFor(error);
  } finally {
    loading.value = false;
  }
};

const loadDir = async (): Promise<void> => {
  try {
    contents.value = await fetchContents(props.owner, props.repo, currentPath.value, refName.value);
    filePreview.value = null;
  } catch (error) {
    errorText.value = errorFor(error);
  }
};

const openDir = async (name: string): Promise<void> => {
  dirStack.value = [...dirStack.value, name];
  await loadDir();
};

const goDepth = async (depth: number): Promise<void> => {
  dirStack.value = dirStack.value.slice(0, depth);
  await loadDir();
};

const openFile = async (item: GitHubContent): Promise<void> => {
  if ((item.size ?? 0) > 1024 * 1024) {
    filePreview.value = { name: item.name, text: props.t('fileTooLarge') };
    return;
  }
  fileLoading.value = true;
  try {
    const text = await fetchFileText(props.owner, props.repo, item.path, refName.value);
    filePreview.value = { name: item.name, text };
  } catch (error) {
    filePreview.value = { name: item.name, text: errorFor(error) };
  } finally {
    fileLoading.value = false;
  }
};

const onReadmeClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;
  const anchor = target.closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href) return;
  event.preventDefault();
  openLink(href);
};

const openOnGithub = (): void => {
  if (info.value) openLink(info.value.html_url);
};

const openHomepage = (): void => {
  const homepage = info.value?.homepage;
  if (homepage) openLink(homepage);
};

onMounted(loadInfo);
watch(() => [props.owner, props.repo], loadInfo);
</script>

<template>
  <section class="repo-detail">
    <div v-if="loading" class="center-state"><AppIcon name="loader" :size="22" class="spin" /><span>{{ props.t('loading') }}</span></div>
    <div v-else-if="errorText" class="center-state"><AppIcon name="alert" :size="22" /><span>{{ errorText }}</span><button type="button" @click="emit('back')">{{ props.t('back') }}</button></div>

    <template v-else-if="info">
      <header class="detail-head">
        <button class="icon-button" type="button" :title="props.t('back')" @click="emit('back')"><AppIcon name="back" :size="16" /></button>
        <div class="head-main">
          <h2><AppIcon :name="info.private ? 'lock' : 'repo'" :size="15" /> {{ info.full_name }}</h2>
          <div class="head-meta">
            <span><AppIcon name="git-branch" :size="12" /> {{ refName }}</span>
            <span><AppIcon name="star" :size="12" /> {{ formatCount(info.stargazers_count) }}</span>
            <span><AppIcon name="git-branch" :size="12" /> {{ formatCount(info.forks_count) }}</span>
            <span>{{ props.t('updated') }} {{ relativeTime(info.updated_at) }}</span>
          </div>
        </div>
        <button class="head-action" type="button" @click="openOnGithub"><AppIcon name="external" :size="13" /> {{ props.t('goToGitHub') }}</button>
        <button class="head-action" type="button" @click="emit('open-issues')"><AppIcon name="issue" :size="13" /> {{ formatCount(info.open_issues_count) }} {{ props.t('issuesLabel') }}</button>
      </header>

      <div class="detail-body">
        <main class="detail-main">
          <div class="tabs">
            <span class="tab active">{{ props.t('readme') }}</span>
            <span class="tab">{{ props.t('files') }}</span>
          </div>

          <div class="path-line">
            <button type="button" @click="goDepth(0)">{{ props.t('root') }}</button>
            <template v-for="(part, index) in dirStack" :key="index">
              <span class="sep">/</span>
              <button type="button" @click="goDepth(index + 1)">{{ part }}</button>
            </template>
          </div>

          <div class="file-table">
            <button v-if="dirStack.length" class="file-row" type="button" @click="goDepth(dirStack.length - 1)">
              <AppIcon name="back" :size="14" /><span class="file-name">..</span>
            </button>
            <button v-for="item in contents" :key="item.sha + item.path" class="file-row" type="button" @click="item.type === 'dir' ? openDir(item.name) : openFile(item)">
              <AppIcon :name="item.type === 'dir' ? 'folder' : 'file'" :size="14" :class="{ dir: item.type === 'dir' }" />
              <span class="file-name">{{ item.name }}</span>
              <span v-if="item.size" class="file-size">{{ formatBytes(item.size) }}</span>
            </button>
          </div>

          <div v-if="fileLoading" class="preview"><AppIcon name="loader" :size="14" class="spin" /> {{ props.t('loading') }}</div>
          <div v-else-if="filePreview" class="preview">
            <div class="preview-head"><AppIcon name="file" :size="13" /><strong>{{ filePreview.name }}</strong><button type="button" @click="filePreview = null"><AppIcon name="close" :size="12" /></button></div>
            <pre>{{ filePreview.text }}</pre>
          </div>

          <div v-if="readme" class="readme-block">
            <div class="readme-title"><AppIcon name="file" :size="13" /> README</div>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="github-rich readme-content" @click="onReadmeClick" v-html="renderedReadme" />
          </div>
          <div v-else class="readme-empty">{{ props.t('readmeEmpty') }}</div>
        </main>

        <aside class="detail-side">
          <div class="side-block">
            <h3>{{ props.t('about') }}</h3>
            <p v-if="info.description" class="about-text">{{ info.description }}</p>
            <p v-if="info.homepage" class="about-link"><AppIcon name="external" :size="12" /><a href="#" @click.prevent="openHomepage">{{ info.homepage }}</a></p>
            <div v-if="info.topics?.length" class="topics">
              <span v-for="topic in info.topics" :key="topic" class="topic">{{ topic }}</span>
            </div>
          </div>
          <div class="side-block facts">
            <div v-if="info.language"><span>{{ props.t('language') }}</span><strong>{{ info.language }}</strong></div>
            <div><span>{{ props.t('starsLabel') }}</span><strong>{{ formatCount(info.stargazers_count) }}</strong></div>
            <div><span>{{ props.t('forksLabel') }}</span><strong>{{ formatCount(info.forks_count) }}</strong></div>
            <div><span>{{ props.t('issuesLabel') }}</span><strong>{{ formatCount(info.open_issues_count) }}</strong></div>
            <div v-if="info.created_at"><span>{{ props.t('createdAt') }}</span><strong>{{ relativeTime(info.created_at) }}</strong></div>
            <div v-if="info.pushed_at"><span>{{ props.t('pushedAt') }}</span><strong>{{ relativeTime(info.pushed_at) }}</strong></div>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.repo-detail { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.center-state { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--gh-text-3); font-size: 12px; }
.center-state button { border: 1px solid var(--gh-border); border-radius: 6px; background: var(--gh-bg); color: var(--gh-text-2); padding: 5px 12px; cursor: pointer; font-family: inherit; font-size: 11px; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.detail-head { display: flex; align-items: center; gap: 10px; flex: none; padding: 11px 16px; border-bottom: 1px solid var(--gh-border-soft); }
.head-main { flex: 1; min-width: 0; }
.head-main h2 { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 14px; font-weight: 650; color: var(--gh-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.head-main h2 svg { color: var(--gh-text-3); }
.head-meta { display: flex; gap: 12px; margin-top: 4px; font-size: 10.5px; color: var(--gh-text-3); }
.head-meta span { display: inline-flex; align-items: center; gap: 3px; }
.head-action { display: inline-flex; align-items: center; gap: 5px; flex: none; height: 28px; padding: 0 9px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11px; cursor: pointer; }
.head-action:hover { background: var(--gh-hover); }
.detail-body { display: flex; flex: 1; min-height: 0; }
.detail-main { flex: 1; min-width: 0; overflow-y: auto; padding: 0 18px 24px; }
.tabs { display: flex; gap: 18px; border-bottom: 1px solid var(--gh-border-soft); }
.tab { padding: 10px 2px; font-size: 12px; color: var(--gh-text-3); }
.tab.active { color: var(--gh-accent); font-weight: 600; border-bottom: 2px solid var(--gh-accent); }
.path-line { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin: 12px 0 8px; font-size: 11.5px; }
.path-line button { border: 0; background: transparent; color: var(--gh-accent); font-family: inherit; font-size: 11.5px; cursor: pointer; padding: 0; }
.path-line .sep { color: var(--gh-text-3); }
.file-table { border: 1px solid var(--gh-border); border-radius: 8px; overflow: hidden; }
.file-row { display: flex; align-items: center; gap: 8px; width: 100%; height: 32px; padding: 0 10px; border: 0; border-bottom: 1px solid var(--gh-border-soft); background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11.5px; text-align: start; cursor: pointer; }
.file-row:last-child { border-bottom: 0; }
.file-row:hover { background: var(--gh-hover); }
.file-row .dir { color: var(--gh-accent); }
.file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { color: var(--gh-text-3); font-size: 10px; }
.preview { margin-top: 12px; border: 1px solid var(--gh-border); border-radius: 8px; overflow: hidden; }
.preview-head { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border-bottom: 1px solid var(--gh-border-soft); background: var(--gh-fill); font-size: 11px; color: var(--gh-text-2); }
.preview-head button { margin-inline-start: auto; border: 0; background: transparent; color: var(--gh-text-3); cursor: pointer; }
.preview pre { max-height: 320px; margin: 0; padding: 10px 12px; overflow: auto; font-size: 11px; line-height: 1.6; color: var(--gh-text); }
.readme-block { margin-top: 20px; border: 1px solid var(--gh-border); border-radius: 8px; overflow: hidden; }
.readme-title { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--gh-border-soft); background: var(--gh-fill); font-size: 11px; font-weight: 600; color: var(--gh-text-2); }
.readme-content { padding: 16px 18px; }
.readme-empty { margin-top: 20px; font-size: 11.5px; color: var(--gh-text-3); }
.detail-side { width: 224px; flex: none; padding: 16px 14px; border-inline-start: 1px solid var(--gh-border-soft); overflow-y: auto; }
.side-block { margin-bottom: 20px; }
.side-block h3 { margin: 0 0 10px; font-size: 11px; font-weight: 650; color: var(--gh-text-3); text-transform: uppercase; letter-spacing: 0.06em; }
.about-text { margin: 0 0 8px; font-size: 11.5px; line-height: 1.65; color: var(--gh-text-2); }
.about-link { display: flex; align-items: center; gap: 4px; margin: 0; font-size: 11px; }
.about-link a { color: var(--gh-accent); text-decoration: none; overflow-wrap: anywhere; }
.topics { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.topic { padding: 2px 8px; border-radius: 20px; background: var(--gh-active); color: var(--gh-accent); font-size: 10px; }
.facts > div { display: flex; justify-content: space-between; gap: 8px; padding: 5px 0; font-size: 11px; border-bottom: 1px solid var(--gh-border-soft); }
.facts span { color: var(--gh-text-3); }
.facts strong { color: var(--gh-text-2); font-weight: 500; }
</style>
