<template>
  <div ref="appRef" class="app">
    <div v-if="showDisclaimer" class="disclaimer-overlay" @click.self="dismissDisclaimer">
      <div class="disclaimer-dialog" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <h2 id="disclaimer-title">⚠️ For learning purposes only</h2>
        <p>
          This application is a virtual sandbox intended for learning and
          experimentation. It must not be relied upon for actual live
          electrical installations.
        </p>
        <p>
          The author takes no responsibility for any use of this tool as
          instruction for installing real electrical systems. Always consult a
          qualified electrician and follow local regulations.
        </p>
        <button class="disclaimer-btn" @click="dismissDisclaimer">I understand</button>
      </div>
    </div>

    <Toolbox
      ref="toolboxRef"
      :open="sidebarOpen"
      @select-cable="onSelectCable"
      @cancel-cable="onCancelCable"
      @select-component="onSelectComponent"
      @select-wire-color="onSelectWireColor"
    />
    <div class="main">
      <header>
        <button class="icon-btn" :title="sidebarOpen ? 'Hide components' : 'Show components'" aria-label="Toggle components" @click="sidebarOpen = !sidebarOpen">☰</button>
        <h1>Virtual Installation Cubicle</h1>
        <nav ref="navRef" class="doc-nav">
          <button
            type="button"
            class="doc-menu-btn"
            :class="{ open: menuOpen }"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
          >
            Guides <span class="caret">▾</span>
          </button>
          <div v-if="menuOpen" class="doc-menu" role="menu">
            <a href="/guides/two-way-switch-wiring.html" role="menuitem" @click="onDocLink($event, '/guides/two-way-switch-wiring.html')">Two-way switches</a>
            <a href="/guides/intermediate-cross-switch-wiring.html" role="menuitem" @click="onDocLink($event, '/guides/intermediate-cross-switch-wiring.html')">Cross switches</a>
            <a href="/guides/relay-no-nc-contacts.html" role="menuitem" @click="onDocLink($event, '/guides/relay-no-nc-contacts.html')">Relays</a>
            <a href="/guides/multifunction-timer.html" role="menuitem" @click="onDocLink($event, '/guides/multifunction-timer.html')">Timer</a>
            <a href="/guides/index.html" role="menuitem" class="doc-menu-all" @click="onDocLink($event, '/guides/index.html')">All guides</a>
          </div>
        </nav>
        <div class="controls">
          <button class="icon-btn" title="Toggle fullscreen" aria-label="Toggle fullscreen" @click="toggleFullscreen">⛶</button>
          <button class="btn-clear" @click="clearAll">Clear All</button>
        </div>
      </header>
      <Canvas
        :selected-cable="selectedCable"
        :selected-component="selectedComponent"
        :selected-wire-color="selectedWireColor"
        @wire-complete="onWireComplete"
        @component-placed="onComponentPlaced"
      />
      <footer>
        <p>Drag or tap components to add • Click/tap switches to toggle • Tap terminals to connect wires</p>
      </footer>
    </div>
    <a
      href="https://github.com/hhamalai/virtual-installation-cubicle"
      target="_blank"
      rel="noopener noreferrer"
      class="github-link"
      title="View on GitHub"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    </a>

    <DocsDrawer
      :open="docsOpen"
      :src="activeDoc"
      @close="docsOpen = false"
      @navigate="activeDoc = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Toolbox from './components/Toolbox.vue'
import Canvas from './components/Canvas.vue'
import DocsDrawer from './components/DocsDrawer.vue'
import { useCircuitStore } from './stores/circuit'

interface ToolboxExposed {
  clearCableSelection: () => void
  clearComponentSelection: () => void
}

const toolboxRef = ref<InstanceType<typeof Toolbox> & ToolboxExposed | null>(null)
const selectedCable = ref<string | null>(null)
const selectedComponent = ref<string | null>(null)
const selectedWireColor = ref<string>('#333333')

const appRef = ref<HTMLElement | null>(null)
// Components sidebar: shown by default on desktop, hidden by default on small
// screens (narrow width or short height, e.g. a phone in landscape).
const isSmallScreen = (): boolean => window.innerWidth <= 700 || window.innerHeight <= 500
const sidebarOpen = ref<boolean>(!isSmallScreen())

const toggleFullscreen = (): void => {
  if (!document.fullscreenElement) {
    appRef.value?.requestFullscreen?.().catch(() => {})
  } else {
    document.exitFullscreen?.()
  }
}

const docsOpen = ref<boolean>(false)
const activeDoc = ref<string>('/guides/index.html')
const menuOpen = ref<boolean>(false)
const navRef = ref<HTMLElement | null>(null)

const toggleMenu = (): void => {
  menuOpen.value = !menuOpen.value
}

// Open a guide in the in-app drawer, but let cmd/ctrl/shift-click fall through to
// the standalone page (new tab) so links stay shareable and crawlable.
const onDocLink = (event: MouseEvent, url: string): void => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    menuOpen.value = false
    return
  }
  event.preventDefault()
  activeDoc.value = url
  docsOpen.value = true
  menuOpen.value = false
}

const onDocumentClick = (event: MouseEvent): void => {
  if (menuOpen.value && navRef.value && !navRef.value.contains(event.target as Node)) {
    menuOpen.value = false
  }
}

const onDocumentKey = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKey)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKey)
})

const DISCLAIMER_ACK_KEY = 'electric-disclaimer-acknowledged'

const isDisclaimerAcknowledged = (): boolean => {
  try {
    return localStorage.getItem(DISCLAIMER_ACK_KEY) === 'true'
  } catch {
    return false
  }
}

const showDisclaimer = ref<boolean>(!isDisclaimerAcknowledged())

const dismissDisclaimer = (): void => {
  showDisclaimer.value = false
  try {
    localStorage.setItem(DISCLAIMER_ACK_KEY, 'true')
  } catch {
    // Ignore storage failures (e.g. private mode); disclaimer will reappear next load.
  }
}

const { clearAll: storeClearAll, cancelWiring } = useCircuitStore()

const onSelectCable = (cableType: string): void => {
  selectedCable.value = cableType
  if (isSmallScreen()) sidebarOpen.value = false
}

const onCancelCable = (): void => {
  selectedCable.value = null
  cancelWiring()
}

const onSelectComponent = (componentType: string): void => {
  selectedComponent.value = componentType
  if (isSmallScreen()) sidebarOpen.value = false
}

const onSelectWireColor = (color: string): void => {
  selectedWireColor.value = color
  if (isSmallScreen()) sidebarOpen.value = false
}

const onComponentPlaced = (): void => {
  selectedComponent.value = null
  if (toolboxRef.value) {
    toolboxRef.value.clearComponentSelection()
  }
}

const onWireComplete = (): void => {
  // Keep cable selected for multiple connections
  // User can click cancel to deselect
}

const clearAll = (): void => {
  storeClearAll()
  selectedCable.value = null
  selectedComponent.value = null
  if (toolboxRef.value) {
    toolboxRef.value.clearCableSelection()
    toolboxRef.value.clearComponentSelection()
  }
}
</script>

<style>
.app {
  display: flex;
  height: 100vh;
  width: 100vw;
  position: relative;
}

.icon-btn {
  /* Desktop stays unchanged: these controls only appear on small/short screens. */
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 17px;
  line-height: 1;
  color: #444;
}

@media (max-width: 700px), (max-height: 500px) {
  .icon-btn {
    display: inline-flex;
  }
}

.icon-btn:hover {
  background: #f0f0f0;
  border-color: #1976d2;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px 20px;
  flex-wrap: wrap;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}

header h1 {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.doc-nav {
  position: relative;
  margin-right: auto;
}

.doc-menu-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  font-size: 13px;
  color: #1976d2;
  background: #fff;
  border: 1px solid #cfd8e3;
  border-radius: 4px;
  cursor: pointer;
}

.doc-menu-btn:hover,
.doc-menu-btn.open {
  background: #e3f2fd;
  border-color: #1976d2;
}

.doc-menu-btn .caret {
  font-size: 10px;
  line-height: 1;
}

.doc-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 180px;
  background: #fff;
  border: 1px solid #e3e8ee;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  padding: 4px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
}

.doc-menu a {
  padding: 8px 12px;
  font-size: 13px;
  color: #333;
  text-decoration: none;
  border-radius: 4px;
  white-space: nowrap;
}

.doc-menu a:hover {
  background: #f0f6fd;
  color: #1976d2;
}

.doc-menu-all {
  margin-top: 4px;
  border-top: 1px solid #eef2f6;
  color: #5a6b7a !important;
}

.controls {
  display: flex;
  gap: 10px;
}

.btn-clear {
  padding: 6px 14px;
  border: 1px solid #dc3545;
  background: white;
  color: #dc3545;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.btn-clear:hover {
  background: #dc3545;
  color: white;
}

footer {
  padding: 8px 20px;
  background: #f8f9fa;
  border-top: 1px solid #ddd;
  font-size: 12px;
  color: #666;
}

footer p {
  margin: 0;
}

.github-link {
  position: fixed;
  bottom: 15px;
  right: 15px;
  color: #666;
  opacity: 0.7;
  transition: opacity 0.2s, color 0.2s;
  z-index: 1000;
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
}

.github-link:hover {
  opacity: 1;
  color: #333;
}

/* Reclaim vertical space on short viewports (landscape phones). */
@media (max-height: 500px) {
  header {
    padding: 4px 10px;
  }
  header h1 {
    font-size: 14px;
  }
  footer {
    display: none;
  }
  .github-link {
    display: none;
  }
}

/* Narrow screens: compact header, hide the desktop-oriented footer. */
@media (max-width: 700px) {
  header {
    padding: 6px 10px;
  }
  header h1 {
    font-size: 15px;
  }
  footer {
    display: none;
  }
}

@media (max-width: 460px) {
  header h1 {
    display: none;
  }
}

.disclaimer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.disclaimer-dialog {
  background: #fff;
  border-radius: 8px;
  max-width: 460px;
  width: 100%;
  padding: 24px 28px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border-top: 4px solid #f0ad4e;
}

.disclaimer-dialog h2 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #333;
}

.disclaimer-dialog p {
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
  color: #555;
}

.disclaimer-btn {
  margin-top: 8px;
  padding: 8px 18px;
  border: none;
  background: #1976d2;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.disclaimer-btn:hover {
  background: #1565c0;
}
</style>
