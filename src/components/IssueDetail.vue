<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { fetchIssue, fetchIssueComments, fetchIssueCommentsHtml, fetchIssueHtml, GitHubApiError } from '../api';
import { relativeTime } from '../format';
import { openLink } from '../links';
import { sanitizeHtml } from '../sanitize';
import type { GitHubComment, GitHubIssue } from '../types';
import AppIcon from './AppIcon.vue';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{ t: Translate; owner: string; repo: string; number: number }>();
const emit = defineEmits<{ back: [] }>();

const issue = ref<GitHubIssue | null>(null);
const comments = ref<GitHubComment[]>([]);
const htmlBodies = ref<string[]>([]);
const loading = ref(true);
const errorText = ref('');

const issueHtml = computed(() =>
  sanitizeHtml(
    issue.value?.body_html || '',
    `https://github.com/${props.owner}/${props.repo}/issues/${props.number}#`,
  ),
);
const commentHtml = (index: number): string => sanitizeHtml(htmlBodies.value[index] ?? '', `https://github.com/${props.owner}/${props.repo}/`);

const load = async (): Promise<void> => {
  loading.value = true;
  errorText.value = '';
  try {
    const [detail, list, detailHtml, listHtml] = await Promise.all([
      fetchIssue(props.owner, props.repo, props.number),
      fetchIssueComments(props.owner, props.repo, props.number),
      fetchIssueHtml(props.owner, props.repo, props.number).catch(() => ''),
      fetchIssueCommentsHtml(props.owner, props.repo, props.number).catch(() => [] as string[]),
    ]);
    issue.value = detail;
    comments.value = list;
    // html+json 列表接口在部分版本返回单段 HTML，按评论数量补齐。
    htmlBodies.value = list.map((_, index) => listHtml[Math.min(index, listHtml.length - 1)] ?? '');
  } catch (error) {
    errorText.value = error instanceof GitHubApiError && error.kind === 'notfound' ? props.t('repoNotFound') : props.t('errorNetwork');
  } finally {
    loading.value = false;
  }
};

const onBodyClick = (event: MouseEvent): void => {
  const anchor = (event.target as HTMLElement).closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href) return;
  event.preventDefault();
  openLink(href);
};

onMounted(load);
</script>

<template>
  <section class="issue-detail">
    <div v-if="loading" class="center-state"><AppIcon name="loader" :size="22" class="spin" /> {{ props.t('loading') }}</div>
    <div v-else-if="errorText" class="center-state"><AppIcon name="alert" :size="22" /> {{ errorText }}<button type="button" @click="emit('back')">{{ props.t('back') }}</button></div>

    <template v-else-if="issue">
      <header class="detail-head">
        <button class="icon-button" type="button" :title="props.t('back')" @click="emit('back')"><AppIcon name="back" :size="16" /></button>
        <div class="head-main">
          <h2><span class="state-dot" :class="issue.state" /><span class="num">{{ props.t('issueNumber', { number: issue.number }) }}</span> {{ issue.title }}</h2>
          <div class="head-meta">
            <span>{{ issue.state === 'open' ? props.t('stateOpen') : props.t('stateClosed') }}</span>
            <span>{{ props.t('openedBy', { user: issue.user?.login ?? '-' }) }}</span>
            <span>{{ relativeTime(issue.created_at) }}</span>
            <span v-if="issue.comments">{{ props.t('commentsCount', { count: issue.comments }) }}</span>
          </div>
        </div>
        <button class="head-action" type="button" @click="openLink(issue.html_url)"><AppIcon name="external" :size="13" /> {{ props.t('viewOnGitHub') }}</button>
      </header>

      <div class="scroll">
        <article class="card">
          <div class="card-head"><span class="avatar">{{ (issue.user?.login ?? '?').slice(0, 1).toUpperCase() }}</span><strong>{{ issue.user?.login }}</strong><span class="time">{{ relativeTime(issue.created_at) }}</span></div>
          <div v-if="issueHtml" class="github-rich body" @click="onBodyClick" v-html="issueHtml" />
          <div v-else class="body-plain">{{ issue.body || props.t('noDescription') }}</div>
          <div v-if="issue.labels?.length" class="labels">
            <span v-for="label in issue.labels" :key="label.name" class="label">{{ label.name }}</span>
          </div>
        </article>

        <h3 class="comments-title">{{ props.t('comments', { count: comments.length }) }}</h3>
        <article v-for="(comment, index) in comments" :key="comment.id" class="card">
          <div class="card-head"><span class="avatar">{{ (comment.user?.login ?? '?').slice(0, 1).toUpperCase() }}</span><strong>{{ comment.user?.login }}</strong><span class="time">{{ relativeTime(comment.created_at) }}</span></div>
          <div v-if="commentHtml(index)" class="github-rich body" @click="onBodyClick" v-html="commentHtml(index)" />
          <div v-else class="body-plain">{{ comment.body || props.t('noDescription') }}</div>
        </article>
        <div v-if="!comments.length" class="no-comments">{{ props.t('noComments') }}</div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.issue-detail { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.center-state { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: var(--gh-text-3); font-size: 12px; }
.center-state button { border: 1px solid var(--gh-border); border-radius: 6px; background: var(--gh-bg); color: var(--gh-text-2); padding: 5px 12px; cursor: pointer; font-family: inherit; font-size: 11px; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.detail-head { display: flex; align-items: center; gap: 10px; flex: none; padding: 12px 16px; border-bottom: 1px solid var(--gh-border-soft); }
.head-main { flex: 1; min-width: 0; }
.head-main h2 { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 14px; font-weight: 650; color: var(--gh-text); }
.state-dot { width: 9px; height: 9px; flex: none; border-radius: 50%; }
.state-dot.open { background: var(--gh-success); }
.state-dot.closed { background: #8250df; }
.num { color: var(--gh-text-3); font-weight: 400; }
.head-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 5px; font-size: 10.5px; color: var(--gh-text-3); }
.head-action { display: inline-flex; align-items: center; gap: 5px; flex: none; height: 28px; padding: 0 9px; border: 1px solid var(--gh-border); border-radius: 7px; background: var(--gh-bg); color: var(--gh-text-2); font-family: inherit; font-size: 11px; cursor: pointer; }
.head-action:hover { background: var(--gh-hover); }
.scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px 30px; }
.card { margin-bottom: 12px; border: 1px solid var(--gh-border); border-radius: 9px; background: var(--gh-overlay); overflow: hidden; }
.card-head { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--gh-border-soft); background: var(--gh-fill); font-size: 11.5px; color: var(--gh-text-2); }
.avatar { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--gh-accent); color: #fff; font-size: 10px; font-weight: 700; }
.time { margin-inline-start: auto; color: var(--gh-text-3); font-size: 10px; }
.body { padding: 14px 16px; font-size: 12.5px; }
.body-plain { padding: 14px 16px; font-size: 12.5px; line-height: 1.7; white-space: pre-wrap; color: var(--gh-text-2); }
.labels { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 16px 12px; }
.label { padding: 2px 8px; border-radius: 20px; background: var(--gh-active); color: var(--gh-accent); font-size: 10px; }
.comments-title { margin: 18px 0 10px; font-size: 12px; color: var(--gh-text-2); }
.no-comments { padding: 20px 0; text-align: center; font-size: 11.5px; color: var(--gh-text-3); }
</style>
