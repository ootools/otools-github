<script setup lang="ts">
import { computed } from 'vue';
import type { GitHubUser, View } from '../types';
import AppIcon from './AppIcon.vue';
import logoUrl from '../../logo.svg';

type Translate = (key: string, values?: Record<string, string | number>) => string;
const props = defineProps<{
  t: Translate;
  view: View;
  narrow: boolean;
  user: GitHubUser | null;
  rateText: string;
}>();
const emit = defineEmits<{ navigate: [view: View]; close: [] }>();

const active = (kind: View['kind']): boolean => props.view.kind === kind;

const accountLabel = computed(() => props.user?.login ?? '');
</script>

<template>
  <aside class="sidebar" :class="{ narrow: props.narrow }">
    <div class="side-brand">
      <img :src="logoUrl" alt="" class="side-logo" />
      <span class="side-title">{{ props.t('appName') }}</span>
      <button v-if="props.narrow" class="icon-button side-close" type="button" :title="props.t('closeSidebar')" @click="emit('close')">
        <AppIcon name="close" :size="14" />
      </button>
    </div>

    <button class="new-repo" type="button" @click="emit('navigate', { kind: 'new-repo' })">
      <AppIcon name="plus" :size="15" />
      <span>{{ props.t('newRepo') }}</span>
    </button>

    <nav class="nav">
      <button class="nav-item" :class="{ active: active('rankings') }" type="button" @click="emit('navigate', { kind: 'rankings' })">
        <AppIcon name="fire" :size="16" />
        <span>{{ props.t('navRankings') }}</span>
      </button>
      <button class="nav-item" :class="{ active: active('search') }" type="button" @click="emit('navigate', { kind: 'search' })">
        <AppIcon name="search" :size="16" />
        <span>{{ props.t('navSearch') }}</span>
      </button>
      <button class="nav-item" :class="{ active: active('repos') || active('repo') }" type="button" @click="emit('navigate', { kind: 'repos' })">
        <AppIcon name="repo" :size="16" />
        <span>{{ props.t('navRepos') }}</span>
      </button>
      <button class="nav-item" :class="{ active: active('issues') || active('issue') }" type="button" @click="emit('navigate', (view.kind === 'repo' || view.kind === 'issue') ? { kind: 'issues', owner: view.owner, repo: view.repo } : { kind: 'issues', owner: '', repo: '' })">
        <AppIcon name="issue" :size="16" />
        <span>{{ props.t('navIssues') }}</span>
      </button>
      <button class="nav-item" :class="{ active: active('settings') }" type="button" @click="emit('navigate', { kind: 'settings' })">
        <AppIcon name="settings" :size="16" />
        <span>{{ props.t('navSettings') }}</span>
      </button>
    </nav>

    <div class="side-footer">
      <div v-if="accountLabel" class="account">
        <div class="avatar">{{ accountLabel.slice(0, 1).toUpperCase() }}</div>
        <span class="account-name">{{ accountLabel }}</span>
      </div>
      <div v-if="props.rateText" class="rate">{{ props.rateText }}</div>
      <div class="source">{{ props.t('source') }}</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar { display: flex; flex-direction: column; width: 208px; flex: none; border-inline-end: 1px solid var(--gh-border); background: var(--gh-sidebar); }
.sidebar.narrow { position: absolute; inset-block: 0; inset-inline-start: 0; z-index: 40; box-shadow: 8px 0 28px rgb(0 0 0 / 0.16); }
.side-brand { display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 14px; border-bottom: 1px solid var(--gh-border-soft); }
.side-logo { width: 22px; height: 22px; border-radius: 6px; }
.side-title { font-size: 13px; font-weight: 650; color: var(--gh-text); }
.side-close { margin-inline-start: auto; }
.new-repo { display: flex; align-items: center; justify-content: center; gap: 7px; height: 32px; margin: 14px 12px 8px; border: 1px solid var(--gh-accent); border-radius: 8px; background: color-mix(in srgb, var(--gh-accent) 10%, transparent); color: var(--gh-accent); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; }
.new-repo:hover { background: color-mix(in srgb, var(--gh-accent) 18%, transparent); }
.nav { display: flex; flex-direction: column; gap: 2px; padding: 4px 8px; }
.nav-item { display: flex; align-items: center; gap: 10px; height: 34px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: var(--gh-text-2); font-size: 12.5px; font-family: inherit; text-align: start; cursor: pointer; }
.nav-item:hover { background: var(--gh-hover); color: var(--gh-text); }
.nav-item.active { background: var(--gh-active); color: var(--gh-accent); font-weight: 600; }
.side-footer { margin-top: auto; padding: 12px; border-top: 1px solid var(--gh-border-soft); }
.account { display: flex; align-items: center; gap: 8px; }
.avatar { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: none; border-radius: 50%; background: var(--gh-accent); color: #fff; font-size: 11px; font-weight: 700; }
.account-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--gh-text); }
.rate { margin-top: 9px; font-size: 10px; color: var(--gh-text-3); font-variant-numeric: tabular-nums; }
.source { margin-top: 3px; font-size: 9.5px; color: var(--gh-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
