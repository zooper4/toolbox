<template>
  <div class="app-shell">
    <transition name="global-loader-fade">
      <div v-if="globalLoadingVisible" class="global-loading-overlay" role="status" aria-live="polite" aria-busy="true">
        <div class="global-loading-panel">
          <Loader2 class="global-loading-icon" :size="28" :stroke-width="2.25" aria-hidden="true" />
          <p class="global-loading-title">页面加载中...</p>
        </div>
      </div>
    </transition>

    <header class="site-header">
      <div class="container-fixed site-header-bar">
        <div class="site-brand-block">
          <a href="#" class="site-brand" @click.prevent="goHome">zooper</a>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost btn-sm header-icon-button" :title="searchOpen ? '关闭搜索' : '搜索 (Ctrl+K)'" @click="openSearch">
            <img v-if="!searchOpen" :src="HEADER_ICONS.search" alt="搜索" class="header-icon" />
            <img v-else :src="HEADER_ICONS.close" alt="关闭" class="header-icon" />
          </button>
          <button class="btn btn-ghost btn-sm header-icon-button" title="切换主题" @click="toggleTheme">
            <img v-if="isDark" :src="HEADER_ICONS.sun" alt="浅色主题" class="header-icon" />
            <img v-else :src="HEADER_ICONS.moon" alt="深色主题" class="header-icon" />
          </button>
        </div>
      </div>
    </header>

    <button
      v-if="currentPage !== 'home'"
      type="button"
      class="category-sidebar-toggle floating-page-back-button"
      :class="{ 'is-desktop': isDesktopSidebar }"
      aria-label="返回上一页"
      @click="goBack"
    >
      <ChevronLeft :size="18" stroke-width="2.25" />
    </button>

    <button
      v-if="currentPage === 'home'"
      ref="sidebarToggleRef"
      type="button"
      class="category-sidebar-toggle"
      :class="{ 'is-desktop': isDesktopSidebar, 'is-mobile-open': !isDesktopSidebar && sidebarVisible, 'is-home-top': isDesktopSidebar && isHomeTop }"
      :aria-expanded="sidebarVisible"
      :aria-label="isDesktopSidebar ? (sidebarVisible ? '收起分类侧边栏' : '展开分类侧边栏') : (sidebarVisible ? '关闭分类导航' : '打开分类导航')"
      @click="toggleSidebar"
    >
      <X v-if="sidebarVisible" :size="18" stroke-width="2.2" />
      <Menu v-else :size="18" stroke-width="2.2" />
      <!-- <span class="category-sidebar-toggle-label">{{ isDesktopSidebar ? (sidebarVisible ? '收起索引' : '展开索引') : '分类导航' }}</span> -->
    </button>

    <div v-if="currentPage === 'home' && !isDesktopSidebar && sidebarVisible" class="category-sidebar-backdrop" @click="closeSidebar"></div>

    <aside
      v-if="currentPage === 'home'"
      ref="sidebarPanelRef"
      class="category-sidebar"
      :class="{ 'is-visible': sidebarVisible, 'is-desktop': isDesktopSidebar, 'is-mobile': !isDesktopSidebar }"
      aria-label="功能分类索引"
    >
      <div class="category-sidebar-card">
        <nav class="category-sidebar-nav">
          <button
            v-for="group in groupedTools"
            :key="group.category"
            type="button"
            class="category-sidebar-link"
            :class="{ 'is-active': activeSidebarCategory === group.category }"
            @click="jumpToCategory(group.anchorId)"
          >
            <span class="category-sidebar-link-main">
              <img :src="group.icon" :alt="`${group.category} 图标`" class="category-sidebar-icon" />
              <span>{{ group.category }}</span>
            </span>
            <span class="category-sidebar-count">{{ group.tools.length }}</span>
          </button>
        </nav>
      </div>
    </aside>

    <main class="container-fixed site-main">
      <div class="site-main-layout">
        <div class="site-content">
          <section v-if="currentPage === 'home'">
            <div class="home-intro">
              <p>简约、可靠的开发实用工具集合，开箱即用</p>
            </div>

            <div class="tool-categories">
              <section v-for="group in groupedTools" :id="group.anchorId" :key="group.category" class="tool-category-group">
                <div class="tool-category-row">
                  <div class="tool-card tool-category-card">
                    <img :src="group.icon" :alt="`${group.category} 图标`" class="tool-category-icon" />
                    <span class="tool-category-name">{{ group.category }}</span>
                  </div>
                  <div class="tool-category-fill" aria-hidden="true"></div>
                </div>

                <div class="tool-grid">
                  <div v-for="tool in group.tools" :key="tool[0]" class="tool-card" @click="navigate(tool[0])">
                    <span class="tool-card-icon">{{ tool[1] }}</span>
                    <span class="tool-card-name">{{ tool[2] }}</span>
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section v-else-if="currentToolEntry" class="tool-page-shell">
            <Suspense @pending="handleToolPending" @resolve="handleToolResolved">
              <component :is="currentToolEntry.component" v-bind="currentToolEntry.props" />
              <template #fallback>
                <div class="tool-page-fallback" aria-hidden="true"></div>
              </template>
            </Suspense>
          </section>

          <section v-else>
            <div class="text-center py-20" style="color:var(--muted-foreground);">页面不存在</div>
          </section>
        </div>
      </div>
    </main>

    <footer class="site-footer">
      <div class="container-fixed site-footer-inner">
        <p class="site-footer-copy">Designed by <span>zooper</span>@2026</p>
        <p class="site-footer-open-source">
          已在
          <a href="https://github.com/zooper4/toolbox" target="_blank" rel="noreferrer" class="site-footer-note-link"> GitHub 开源</a>
          <!-- ，采用
          <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noreferrer" class="site-footer-note-link">GPL-3.0</a>
          许可证。 -->
        </p>
        <!-- <div class="site-footer-links">
          <a href="https://github.com/zooper4" target="_blank" rel="noreferrer" class="site-footer-link">GitHub @zooper4</a>
          <a href="https://github.com/zooper4/toolbox" target="_blank" rel="noreferrer" class="site-footer-link">源码仓库</a>
        </div> -->
      </div>
    </footer>

    <div v-if="searchOpen" id="searchOverlay" class="search-overlay" @click.self="closeSearch">
      <div class="search-dialog">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索工具..."
          autocomplete="off"
        />
        <div class="search-results" id="searchResults">
          <div v-if="!searchQuery.trim()" style="padding:1.5rem;text-align:center;font-size:0.75rem;color:var(--muted-foreground);">输入关键词开始搜索...</div>
          <div v-else-if="filteredTools.length === 0" style="padding:1.5rem;text-align:center;font-size:0.75rem;color:var(--muted-foreground);">没有匹配结果</div>
          <div
            v-else
            v-for="tool in filteredTools"
            :key="tool[0]"
            class="search-item"
            @click="selectTool(tool[0])"
          >
            <span class="sr-icon">{{ tool[1] }}</span>
            <span class="sr-name">{{ tool[2] }}</span>
            <span class="sr-cat">{{ tool[4] }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Vue 根组件负责壳层、搜索、主题和工具页切换。
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ChevronLeft, Loader2, Menu, X } from 'lucide-vue-next';
import { TOOLS } from '../shared/tool-data.js';

const EncodingTools = defineAsyncComponent(() => import('./components/EncodingTools.vue'));
const EncodingUniversal = defineAsyncComponent(() => import('./components/EncodingUniversal.vue'));
const GeneratorTools = defineAsyncComponent(() => import('./components/GeneratorTools.vue'));
const CryptoDigestTools = defineAsyncComponent(() => import('./components/CryptoDigestTools.vue'));
const CryptoCipherTools = defineAsyncComponent(() => import('./components/CryptoCipherTools.vue'));
const UtilityBasicTools = defineAsyncComponent(() => import('./components/UtilityBasicTools.vue'));
const UtilityAdvancedTools = defineAsyncComponent(() => import('./components/UtilityAdvancedTools.vue'));

const publicAssetBase = import.meta.env.BASE_URL || '/';

function getPublicAssetUrl(relativePath) {
  return `${publicAssetBase}${String(relativePath || '').replace(/^\//, '')}`;
}

const HEADER_ICONS = {
  search: getPublicAssetUrl('images/icons/header-search.svg'),
  close: getPublicAssetUrl('images/icons/header-close.svg'),
  sun: getPublicAssetUrl('images/icons/header-sun.svg'),
  moon: getPublicAssetUrl('images/icons/header-moon.svg'),
};

const currentPage = ref('home');
const searchOpen = ref(false);
const searchQuery = ref('');
const searchInput = ref(null);
const isDark = ref(false);
const currentHistoryIndex = ref(0);
const globalLoadingVisible = ref(false);
const pendingCategoryAnchor = ref('');
const isDesktopSidebar = ref(false);
const sidebarDesktopCollapsed = ref(false);
const sidebarMobileOpen = ref(false);
const sidebarToggleRef = ref(null);
const sidebarPanelRef = ref(null);
const isHomeTop = ref(true);

const browserWindow = typeof window !== 'undefined' ? window : null;
const browserDocument = typeof document !== 'undefined' ? document : null;
const browserHistory = browserWindow?.history ?? null;
const browserLocation = browserWindow?.location ?? { hash: '', pathname: '', search: '' };
const browserStorage = typeof localStorage !== 'undefined' ? localStorage : null;
const browserTimer = typeof setTimeout === 'function' ? setTimeout : null;
const browserAnimationFrame = browserWindow?.requestAnimationFrame?.bind(browserWindow) || ((callback) => callback());

const scrollPositions = new Map();
const GLOBAL_LOADER_SHOW_DELAY_MS = 200;
const GLOBAL_LOADER_MIN_MS = 260;
let globalLoadingDepth = 0;
let globalLoadingStart = 0;
let globalLoadingShowTimer = null;
let globalLoadingHideTimer = null;

const HOMEPAGE_CATEGORY_ORDER = ['编解码', '哈希算法', '加解密', '数据生成', '数据转换', '格式化', '数据分析', '图像'];

const CATEGORY_ICONS = {
  编解码: getPublicAssetUrl('images/icons/menu-binary.svg'),
  哈希算法: getPublicAssetUrl('images/icons/menu-fingerprint.svg'),
  加解密: getPublicAssetUrl('images/icons/menu-shield.svg'),
  数据生成: getPublicAssetUrl('images/icons/menu-sparkles.svg'),
  数据转换: getPublicAssetUrl('images/icons/menu-arrow-left-right.svg'),
  格式化: getPublicAssetUrl('images/icons/menu-code-xml.svg'),
  数据分析: getPublicAssetUrl('images/icons/menu-search.svg'),
  图像: getPublicAssetUrl('images/icons/menu-image.svg'),
  其他: getPublicAssetUrl('images/icons/menu-code-xml.svg'),
};

const TOOL_COMPONENTS = {
  hash: { component: CryptoDigestTools, props: { toolId: 'hash' } },
  sha: { component: CryptoDigestTools, props: { toolId: 'sha' } },
  md5: { component: CryptoDigestTools, props: { toolId: 'md5' } },
  sha1: { component: CryptoDigestTools, props: { toolId: 'sha', initialAlgorithm: 'sha1' } },
  sha256: { component: CryptoDigestTools, props: { toolId: 'sha', initialAlgorithm: 'sha256' } },
  sha384: { component: CryptoDigestTools, props: { toolId: 'sha', initialAlgorithm: 'sha384' } },
  sha512: { component: CryptoDigestTools, props: { toolId: 'sha', initialAlgorithm: 'sha512' } },
  sm3: { component: CryptoDigestTools, props: { toolId: 'sm3' } },
  'universal-encoding': { component: EncodingUniversal, props: { toolId: 'universal-encoding' } },
  base: { component: EncodingTools, props: { toolId: 'base' } },
  base64: { component: EncodingTools, props: { toolId: 'base', initialBaseVariant: 'base64' } },
  'url-encode': { component: EncodingTools, props: { toolId: 'url-encode' } },
  'hex-encode': { component: EncodingTools, props: { toolId: 'hex-encode' } },
  base32: { component: EncodingTools, props: { toolId: 'base', initialBaseVariant: 'base32' } },
  base58: { component: EncodingTools, props: { toolId: 'base', initialBaseVariant: 'base58' } },
  jwt: { component: EncodingTools, props: { toolId: 'jwt' } },
  'char-escape': { component: EncodingTools, props: { toolId: 'char-escape' } },
  'html-entity': { component: EncodingTools, props: { toolId: 'html-entity' } },
  unicode: { component: EncodingTools, props: { toolId: 'unicode' } },
  ascii: { component: EncodingTools, props: { toolId: 'ascii' } },
  uuid: { component: GeneratorTools, props: { toolId: 'uuid' } },
  password: { component: GeneratorTools, props: { toolId: 'password' } },
  qrcode: { component: GeneratorTools, props: { toolId: 'qrcode' } },
  qrscan: { component: GeneratorTools, props: { toolId: 'qrscan' } },
  lorem: { component: GeneratorTools, props: { toolId: 'lorem' } },
  hmac: { component: CryptoDigestTools, props: { toolId: 'hmac' } },
  aes: { component: CryptoCipherTools, props: { toolId: 'aes' } },
  des: { component: CryptoCipherTools, props: { toolId: 'des' } },
  sm4: { component: CryptoCipherTools, props: { toolId: 'sm4' } },
  rsa: { component: CryptoCipherTools, props: { toolId: 'rsa' } },
  sm2: { component: CryptoCipherTools, props: { toolId: 'sm2' } },
  chacha20: { component: CryptoCipherTools, props: { toolId: 'chacha20' } },
  timestamp: { component: UtilityBasicTools, props: { toolId: 'timestamp' } },
  'time-interval': { component: UtilityBasicTools, props: { toolId: 'time-interval' } },
  color: { component: UtilityAdvancedTools, props: { toolId: 'color' } },
  'case-convert': { component: UtilityBasicTools, props: { toolId: 'case-convert' } },
  'data-format': { component: UtilityAdvancedTools, props: { toolId: 'data-format' } },
  'json-format': { component: UtilityBasicTools, props: { toolId: 'json-format' } },
  regex: { component: UtilityBasicTools, props: { toolId: 'regex' } },
  'code-format': { component: UtilityBasicTools, props: { toolId: 'code-format' } },
  'code-minify': { component: UtilityBasicTools, props: { toolId: 'code-minify' } },
  'text-diff': { component: UtilityAdvancedTools, props: { toolId: 'text-diff' } },
  'text-stats': { component: UtilityBasicTools, props: { toolId: 'text-stats' } },
  'ua-parser': { component: UtilityAdvancedTools, props: { toolId: 'ua-parser' } },
  'key-event': { component: UtilityAdvancedTools, props: { toolId: 'key-event' } },
  'svg-optimize': { component: UtilityAdvancedTools, props: { toolId: 'svg-optimize' } },
};

const filteredTools = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  return TOOLS.filter((tool) => {
    const icon = tool[1].toLowerCase();
    const title = tool[2].toLowerCase();
    const category = tool[4].toLowerCase();
    return icon.includes(q) || title.includes(q) || category.includes(q);
  });
});

const groupedTools = computed(() => {
  const groups = TOOLS.reduce((acc, tool) => {
    const category = tool[4] || '其他';
    if (!acc.has(category)) {
      acc.set(category, []);
    }
    acc.get(category).push(tool);
    return acc;
  }, new Map());

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      const aIndex = HOMEPAGE_CATEGORY_ORDER.indexOf(a);
      const bIndex = HOMEPAGE_CATEGORY_ORDER.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b, 'zh-CN');
    })
    .map(([category, tools]) => ({
      category,
      tools,
      icon: CATEGORY_ICONS[category] || CATEGORY_ICONS.其他,
      anchorId: `category-${tools[0]?.[0] || category}`,
    }));
});

const currentToolEntry = computed(() => TOOL_COMPONENTS[currentPage.value] || null);
const currentToolMeta = computed(() => TOOLS.find((tool) => tool[0] === currentPage.value) || null);
const activeSidebarCategory = computed(() => currentToolMeta.value?.[4] || '');
const sidebarVisible = computed(() => isDesktopSidebar.value ? !sidebarDesktopCollapsed.value : sidebarMobileOpen.value);

function isKnownPage(page) {
  return page === 'home' || Boolean(TOOL_COMPONENTS[page]);
}

function getScrollTop() {
  return browserWindow?.scrollY || browserDocument?.documentElement?.scrollTop || browserDocument?.body?.scrollTop || 0;
}

function saveScrollPosition(page = currentPage.value) {
  scrollPositions.set(page, getScrollTop());
}

function syncHomeTopState() {
  isHomeTop.value = currentPage.value === 'home' && getScrollTop() <= 24;
}

function scrollToPosition(top = 0) {
  nextTick(() => {
    browserWindow?.scrollTo({ top, left: 0, behavior: 'auto' });
    if (browserDocument?.documentElement) browserDocument.documentElement.scrollTop = top;
    if (browserDocument?.body) browserDocument.body.scrollTop = top;
  });
}

function restoreScrollPosition(page) {
  scrollToPosition(scrollPositions.get(page) ?? 0);
}

function getPageFromLocation() {
  const hash = browserLocation.hash.replace(/^#/, '');
  if (!hash || hash === '/') return 'home';

  if (hash.startsWith('/tool/')) {
    const page = decodeURIComponent(hash.slice('/tool/'.length));
    return isKnownPage(page) ? page : 'home';
  }

  return 'home';
}

function getUrlForPage(page) {
  const baseUrl = `${browserLocation.pathname}${browserLocation.search}`;
  if (page === 'home') return baseUrl;
  return `${baseUrl}#/tool/${encodeURIComponent(page)}`;
}

function writeHistoryEntry(page, { replace = false, historyIndex = currentHistoryIndex.value } = {}) {
  const state = {
    __toolbox: true,
    page,
    historyIndex,
  };
  const method = replace ? 'replaceState' : 'pushState';
  browserHistory?.[method](state, '', getUrlForPage(page));
}

function canGoBackInApp() {
  const state = browserHistory?.state;
  return Boolean(state?.__toolbox) && (state.historyIndex ?? 0) > 0;
}

function syncPage(page, { restoreScroll = true, fallbackScrollTop = 0 } = {}) {
  currentPage.value = isKnownPage(page) ? page : 'home';
  if (restoreScroll) {
    restoreScrollPosition(currentPage.value);
    return;
  }
  scrollToPosition(fallbackScrollTop);
}

function beginGlobalLoading() {
  globalLoadingDepth += 1;
  if (globalLoadingShowTimer) {
    clearTimeout(globalLoadingShowTimer);
    globalLoadingShowTimer = null;
  }
  if (globalLoadingHideTimer) {
    clearTimeout(globalLoadingHideTimer);
    globalLoadingHideTimer = null;
  }
  if (globalLoadingVisible.value) {
    return;
  }
  globalLoadingShowTimer = browserTimer?.(() => {
    globalLoadingShowTimer = null;
    if (globalLoadingDepth > 0 && !globalLoadingVisible.value) {
      globalLoadingStart = Date.now();
      globalLoadingVisible.value = true;
    }
  }, GLOBAL_LOADER_SHOW_DELAY_MS) ?? null;
}

function endGlobalLoading() {
  if (globalLoadingDepth > 0) {
    globalLoadingDepth -= 1;
  }
  if (globalLoadingDepth === 0 && globalLoadingShowTimer) {
    clearTimeout(globalLoadingShowTimer);
    globalLoadingShowTimer = null;
  }
  if (globalLoadingDepth > 0) {
    return;
  }
  if (!globalLoadingVisible.value) {
    return;
  }
  const elapsed = Date.now() - globalLoadingStart;
  const wait = Math.max(0, GLOBAL_LOADER_MIN_MS - elapsed);
  const hide = () => {
    if (globalLoadingDepth === 0) {
      globalLoadingVisible.value = false;
    }
    globalLoadingHideTimer = null;
  };
  if (!browserTimer) {
    hide();
    return;
  }
  globalLoadingHideTimer = browserTimer(hide, wait);
}

function deferGlobalLoadingEnd() {
  browserAnimationFrame(() => {
    browserAnimationFrame(() => {
      endGlobalLoading();
    });
  });
}

function handleToolPending() {
  beginGlobalLoading();
}

function handleToolResolved() {
  deferGlobalLoadingEnd();
}

function navigateToPage(page, { replace = false } = {}) {
  const nextPage = isKnownPage(page) ? page : 'home';

  if (nextPage === currentPage.value && !replace) {
    return;
  }

  saveScrollPosition();
  beginGlobalLoading();
  const nextHistoryIndex = replace ? currentHistoryIndex.value : currentHistoryIndex.value + 1;
  writeHistoryEntry(nextPage, { replace, historyIndex: nextHistoryIndex });
  currentHistoryIndex.value = nextHistoryIndex;
  syncPage(nextPage, {
    restoreScroll: nextPage === 'home',
    fallbackScrollTop: 0,
  });
  deferGlobalLoadingEnd();
}

function navigate(id) {
  pendingCategoryAnchor.value = '';
  closeSidebar();
  navigateToPage(id);
}

function scrollToCategory(anchorId) {
  nextTick(() => {
    browserDocument?.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function jumpToCategory(anchorId) {
  closeSearch();
  closeSidebar();
  if (currentPage.value === 'home') {
    pendingCategoryAnchor.value = '';
    scrollToCategory(anchorId);
    return;
  }
  pendingCategoryAnchor.value = anchorId;
  navigateToPage('home');
}

function toggleSidebar() {
  if (isDesktopSidebar.value) {
    sidebarDesktopCollapsed.value = !sidebarDesktopCollapsed.value;
    browserStorage?.setItem('sidebar-desktop-collapsed', sidebarDesktopCollapsed.value ? '1' : '0');
    return;
  }
  sidebarMobileOpen.value = !sidebarMobileOpen.value;
}

function closeSidebar() {
  if (isDesktopSidebar.value) {
    sidebarDesktopCollapsed.value = true;
    browserStorage?.setItem('sidebar-desktop-collapsed', '1');
  }
  sidebarMobileOpen.value = false;
}

function syncSidebarViewport() {
  const nextDesktop = (browserWindow?.innerWidth ?? 0) >= 1024;
  isDesktopSidebar.value = nextDesktop;
  if (nextDesktop) {
    sidebarMobileOpen.value = false;
  }
}

function goHome() {
  closeSearch();
  closeSidebar();
  pendingCategoryAnchor.value = '';
  if (currentPage.value === 'home') {
    scrollToPosition(0);
    return;
  }
  navigateToPage('home');
}

function goBack() {
  closeSearch();
  closeSidebar();
  if (canGoBackInApp()) {
    saveScrollPosition();
    browserHistory?.back();
    return;
  }
  navigateToPage('home');
}

function openSearch() {
  closeSidebar();
  searchOpen.value = true;
  nextTick(() => searchInput.value?.focus());
}

function closeSearch() {
  searchOpen.value = false;
  searchQuery.value = '';
}

function selectTool(id) {
  closeSearch();
  navigate(id);
}

watch(currentPage, async (page) => {
  if (page !== 'home' || !pendingCategoryAnchor.value) return;
  const anchorId = pendingCategoryAnchor.value;
  pendingCategoryAnchor.value = '';
  await nextTick();
  browserDocument?.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function toggleTheme() {
  isDark.value = !isDark.value;
  browserDocument?.documentElement?.classList.toggle('dark', isDark.value);
  browserStorage?.setItem('theme', isDark.value ? 'dark' : 'light');
}

function syncThemeFromStorage() {
  const saved = browserStorage?.getItem('theme');
  isDark.value = saved === 'dark';
  browserDocument?.documentElement?.classList.toggle('dark', isDark.value);
}

function syncDocumentScrollLock(locked) {
  if (browserDocument?.documentElement) {
    browserDocument.documentElement.style.overflow = locked ? 'hidden' : '';
  }
  if (browserDocument?.body) {
    browserDocument.body.style.overflow = locked ? 'hidden' : '';
  }
}

function handleKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }
  if (event.key === 'Escape') {
    closeSearch();
    closeSidebar();
  }
}

function handlePointerDown(event) {
  if (!isDesktopSidebar.value || !sidebarVisible.value) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (sidebarPanelRef.value?.contains(target) || sidebarToggleRef.value?.contains(target)) return;
  closeSidebar();
}

function handlePopState(event) {
  beginGlobalLoading();
  saveScrollPosition();
  closeSearch();
  closeSidebar();
  currentHistoryIndex.value = event.state?.__toolbox ? (event.state.historyIndex ?? 0) : 0;
  syncPage(event.state?.page || getPageFromLocation());
  syncHomeTopState();
  deferGlobalLoadingEnd();
}

function handleScroll() {
  saveScrollPosition();
  syncHomeTopState();
}

onMounted(() => {
  beginGlobalLoading();
  syncThemeFromStorage();
  const savedSidebarState = browserStorage?.getItem('sidebar-desktop-collapsed');
  sidebarDesktopCollapsed.value = savedSidebarState === null ? true : savedSidebarState === '1';
  syncSidebarViewport();
  if (browserHistory && 'scrollRestoration' in browserHistory) {
    browserHistory.scrollRestoration = 'manual';
  }
  const initialPage = getPageFromLocation();
  currentHistoryIndex.value = browserHistory?.state?.__toolbox ? (browserHistory.state.historyIndex ?? 0) : 0;
  writeHistoryEntry(initialPage, { replace: true, historyIndex: currentHistoryIndex.value });
  syncPage(initialPage);
  syncHomeTopState();
  browserWindow?.addEventListener('keydown', handleKeydown);
  browserWindow?.addEventListener('pointerdown', handlePointerDown);
  browserWindow?.addEventListener('popstate', handlePopState);
  browserWindow?.addEventListener('scroll', handleScroll, { passive: true });
  browserWindow?.addEventListener('resize', syncSidebarViewport, { passive: true });
  deferGlobalLoadingEnd();
});

onBeforeUnmount(() => {
  browserWindow?.removeEventListener('keydown', handleKeydown);
  browserWindow?.removeEventListener('pointerdown', handlePointerDown);
  browserWindow?.removeEventListener('popstate', handlePopState);
  browserWindow?.removeEventListener('scroll', handleScroll);
  browserWindow?.removeEventListener('resize', syncSidebarViewport);
  if (globalLoadingShowTimer) {
    clearTimeout(globalLoadingShowTimer);
    globalLoadingShowTimer = null;
  }
  if (globalLoadingHideTimer) {
    clearTimeout(globalLoadingHideTimer);
    globalLoadingHideTimer = null;
  }
  syncDocumentScrollLock(false);
});

watch([sidebarMobileOpen, isDesktopSidebar], ([mobileOpen, desktop]) => {
  syncDocumentScrollLock(!desktop && mobileOpen);
});

watch(currentPage, () => {
  nextTick(() => {
    syncHomeTopState();
  });
});
</script>
