<template>
  <div class="app">
    <Toolbox
      ref="toolboxRef"
      @select-cable="onSelectCable"
      @cancel-cable="onCancelCable"
      @select-component="onSelectComponent"
    />
    <div class="main">
      <header>
        <h1>Virtual Installation Cubicle</h1>
        <div class="controls">
          <button class="btn-clear" @click="clearAll">Clear All</button>
        </div>
      </header>
      <Canvas
        :selected-cable="selectedCable"
        :selected-component="selectedComponent"
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbox from './components/Toolbox.vue'
import Canvas from './components/Canvas.vue'
import { useCircuitStore } from './stores/circuit'

interface ToolboxExposed {
  clearCableSelection: () => void
  clearComponentSelection: () => void
}

const toolboxRef = ref<InstanceType<typeof Toolbox> & ToolboxExposed | null>(null)
const selectedCable = ref<string | null>(null)
const selectedComponent = ref<string | null>(null)

const { clearAll: storeClearAll } = useCircuitStore()

const onSelectCable = (cableType: string): void => {
  selectedCable.value = cableType
}

const onCancelCable = (): void => {
  selectedCable.value = null
}

const onSelectComponent = (componentType: string): void => {
  selectedComponent.value = componentType
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
</style>
