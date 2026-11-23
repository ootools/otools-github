<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { createRepo as apiCreateRepo, fetchRepos, GitHubApiError, rateLimit, rateRemaining, type RepoSort, type RepoType } from './api';
import { authError, authStatus, currentUser, handleUnauthorized, isAuthenticated, restoreSession, signOut } from './auth';
import { formatCount } from './format';
import { useGitHubI18n } from './i18n';
import type { GitHubRepo, RepoForm, View } from './types';
import AppIcon from './components/AppIcon.vue';
import AppSidebar from './components/AppSidebar.vue';
import IssueDetail from './components/IssueDetail.vue';
import IssueList from './components/IssueList.vue';
import LoginView from './components/LoginView.vue';
import NewRepoView from './components/NewRepoView.vue';
import RepoDetail from './components/RepoDetail.vue';
import RepoList from './components/RepoList.vue';

const { t, direction } = useGitHubI18n();

const isMock = import.meta.env.DEV && typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('mock');

const rootRef = ref<HTMLElement | null>(null);
const view = ref<View>({ kind: 'repos' });
const narrow = ref(false);
const sidebarOpen = ref(false);

const repos = ref<GitHubRepo[]>([]);
const repoLoading = ref(false);
const repoError = ref('');
const page = ref(1);
const hasMore = ref(true);
const filter = ref<{ type: RepoType; sort: RepoSort }>({ type: 'owner', sort: 'updated' });

const newRepoBusy = ref(false);
const newRepoError = ref('');

const showLogin = computed(() => !isMock && !isAuthenticated.value && authStatus.value !== 'checking');
const rateText = computed(() => {
  if (rateRemaining.value === null) return '';
  return t('rateLimit', { remaining: rateRemaining.value, limit: rateLimit.value ?? '—' });
});

const errorTextFor = (error: unknown): string => {
  if (error instanceof GitHubApiError) {
    const map: Partial<Record<GitHubApiError['kind'], string>> = {
      auth: 'errorAuth', rate: 'errorRate', network: 'errorNetwork', notfound: 'errorNotFound',
      validation: 'errorValidation', parse: 'errorParse', http: 'errorHttp',
    };
    return t(map[error.kind] ?? 'errorGeneric');
  }
  return t('errorGeneric');
};

const loadRepos = async (reset = false): Promise<void> => {
  if (reset) page.value = 1;
  repoLoading.value = true;
  repoError.value = '';
  try {
    const list = await fetchRepos({ page: page.value, perPage: 30, type: filter.value.type, sort: filter.value.sort });
    repos.value = reset ? list : [...repos.value, ...list];
    hasMore.value = list.length === 30;
  } catch (error) {
    if (error instanceof GitHubApiError && error.kind === 'auth') handleUnauthorized();
    repoError.value = errorTextFor(error);
  } finally {
    repoLoading.value = false;
  }
};

const loadMore = (): void => {
  page.value += 1;
  void loadRepos();
};

const changeFilter = (next: { type: RepoType; sort: RepoSort }): void => {
  filter.value = next;
  void loadRepos(true);
};

const navigate = (next: View): void => {
  view.value = next;
  sidebarOpen.value = false;
  if (next.kind === 'repos' && !repos.value.length) void loadRepos(true);
};

const openRepo = (repo: GitHubRepo): void => {
  const [owner, name] = repo.full_name.split('/');
  if (owner && name) navigate({ kind: 'repo', owner, repo: name });
};

const openIssue = (number: number): void => {
  if (view.value.kind === 'issues') navigate({ kind: 'issue', owner: view.value.owner, repo: view.value.repo, number });
};

const openIssuesFromIssue = (): void => {
  if (view.value.kind === 'issue') navigate({ kind: 'issues', owner: view.value.owner, repo: view.value.repo });
};

const submitNewRepo = async (form: RepoForm): Promise<void> => {
  newRepoBusy.value = true;
  newRepoError.value = '';
  try {
    await apiCreateRepo(form);
    await loadRepos(true);
    navigate({ kind: 'repos' });
  } catch (error) {
    if (error instanceof GitHubApiError && error.kind === 'auth') handleUnauthorized();
    if (error instanceof GitHubApiError && error.kind === 'validation') {
      const detail = (error.detail ?? '').toLowerCase();
      newRepoError.value = detail.includes('already exists') ? t('validationExists') : t('validationGeneric', { message: error.detail ?? error.message });
    } else {
      newRepoError.value = errorTextFor(error);
    }
  } finally {
    newRepoBusy.value = false;
  }
};

const logout = (): void => {
  signOut();
  repos.value = [];
  view.value = { kind: 'repos' };
};

const refreshCurrent = (): void => {
  if (view.value.kind === 'repos') void loadRepos(true);
};

const syncNarrow = (width: number): void => {
  const next = width < 720;
  if (next === narrow.value) return;
  narrow.value = next;
  if (!next) sidebarOpen.value = false;
};

const onWindowResize = (): void => syncNarrow(window.innerWidth);

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  void restoreSession().then(() => {
    if (isAuthenticated.value || isMock) void loadRepos(true);
  });
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? window.innerWidth;
      syncNarrow(width);
    });
    resizeObserver.observe(rootRef.value);
  } else {
    syncNarrow(window.innerWidth);
    window.addEventListener('resize', onWindowResize);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', onWindowResize);
});

watch(authStatus, (status) => {
  if (status === 'authenticated' && !repos.value.length) void loadRepos(true);
});
</script>

<template>
  <div ref="rootRef" class="gh-app" :class="{ 'is-narrow': narrow }" :dir="direction">
    <LoginView v-if="showLogin" :t="t" />

    <template v-else>
      <header class="app-bar">
        <button v-if="narrow" class="icon-button" type="button" :title="t('expandSidebar')" @click="sidebarOpen = true">
          <AppIcon name="menu" :size="16" />
        </button>
        <div class="bar-title">
          <strong>{{ t('appName') }}</strong>
          <span class="bar-sub">{{ view.kind === 'repos' ? t('navRepos') : view.kind === 'issues' || view.kind === 'issue' ? t('navIssues') : view.kind === 'settings' ? t('navSettings') : t('newRepo') }}</span>
        </div>
        <span v-if="isMock" class="mock-badge">{{ t('mockHint') }}</span>
        <div class="bar-spacer" />
        <button v-if="view.kind === 'repos'" class="icon-button" type="button" :title="t('refresh')" @click="refreshCurrent">
          <AppIcon name="refresh" :size="15" />
        </button>
        <div v-if="currentUser" class="bar-account">
          <span class="bar-avatar">{{ currentUser.login.slice(0, 1).toUpperCase() }}</span>
          <span class="bar-login">{{ currentUser.login }}</span>
        </div>
        <div v-if="rateText" class="bar-rate">{{ rateText }}</div>
      </header>

      <div class="app-body">
        <div v-if="narrow && sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />
        <AppSidebar
          v-show="!narrow || sidebarOpen"
          :t="t"
          :view="view"
          :narrow="narrow"
          :user="currentUser"
          :rate-text="rateText"
          @navigate="navigate"
          @close="sidebarOpen = false"
        />

        <main class="app-main">
          <RepoList
            v-if="view.kind === 'repos'"
            :t="t"
            :repos="repos"
            :loading="repoLoading"
            :error-text="repoError"
            :has-more="hasMore"
            :filter-text="authError ? t('errorAuth') : ''"
            @open="openRepo"
            @retry="loadRepos(true)"
            @load-more="loadMore"
            @change-filter="changeFilter"
          />
          <NewRepoView
            v-else-if="view.kind === 'new-repo'"
            :t="t"
            :busy="newRepoBusy"
            :error-text="newRepoError"
            @create="submitNewRepo"
            @cancel="navigate({ kind: 'repos' })"
          />
          <RepoDetail
            v-else-if="view.kind === 'repo'"
            :t="t"
            :owner="view.owner"
            :repo="view.repo"
            :path="view.path"
            @back="navigate({ kind: 'repos' })"
            @open-issues="navigate({ kind: 'issues', owner: view.owner, repo: view.repo })"
          />
          <IssueList
            v-else-if="view.kind === 'issues'"
            :t="t"
            :owner="view.owner"
            :repo="view.repo"
            :repos="repos"
            @open="openIssue"
            @select-repo="(owner, repo) => navigate({ kind: 'issues', owner, repo })"
            @back="navigate({ kind: 'repos' })"
          />
          <IssueDetail
            v-else-if="view.kind === 'issue'"
            :t="t"
            :owner="view.owner"
            :repo="view.repo"
            :number="view.number"
            @back="openIssuesFromIssue"
          />
          <SettingsView v-else :t="t" @signed-out="logout" />
        </main>
      </div>

      <footer class="status-bar">
        <span>{{ t('source') }}</span>
        <span class="spacer" />
        <span v-if="currentUser">{{ t('signedInAs', { user: currentUser.login }) }}</span>
        <span v-else>{{ t('notSignedIn') }}</span>
        <span v-if="rateText" class="status-rate">· {{ rateText }}</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.gh-app { display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; background: var(--gh-bg); color: var(--gh-text); }
.app-bar { display: flex; align-items: center; gap: 9px; flex: none; height: 46px; padding: 0 14px; border-bottom: 1px solid var(--gh-border); background: var(--gh-bg); }
.bar-title { display: flex; align-items: baseline; gap: 8px; }
.bar-title strong { font-size: 13px; font-weight: 650; }
.bar-sub { font-size: 11px; color: var(--gh-text-3); }
.bar-spacer { flex: 1; }
.bar-account { display: flex; align-items: center; gap: 6px; }
.bar-avatar { display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--gh-accent); color: #fff; font-size: 10px; font-weight: 700; }
.bar-login { font-size: 11.5px; color: var(--gh-text-2); }
.bar-rate { font-size: 10px; color: var(--gh-text-3); font-variant-numeric: tabular-nums; }
.app-body { display: flex; flex: 1; min-height: 0; position: relative; }
.app-main { display: flex; flex: 1; min-width: 0; min-height: 0; }
.sidebar-backdrop { position: fixed; inset: 0; z-index: 35; background: rgb(0 0 0 / 0.32); }
.status-bar { display: flex; align-items: center; gap: 8px; flex: none; height: 24px; padding: 0 12px; border-top: 1px solid var(--gh-border); background: var(--gh-bg); color: var(--gh-text-3); font-size: 10px; white-space: nowrap; overflow: hidden; }
.spacer { flex: 1; }
.status-rate { font-variant-numeric: tabular-nums; }
.mock-badge { padding: 1px 6px; border-radius: 4px; background: color-mix(in srgb, #f0763a 16%, transparent); color: #d2601f; font-size: 10px; }
.is-narrow .bar-sub, .is-narrow .bar-login, .is-narrow .bar-rate { display: none; }
</style>
