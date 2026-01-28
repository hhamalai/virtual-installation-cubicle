<template>
  <div class="app">
    <Toolbox
      ref="toolboxRef"
      @select-cable="onSelectCable"
      @cancel-cable="onCancelCable"
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
        @wire-complete="onWireComplete"
      />
      <footer>
        <p>Drag components from the toolbox • Click switches to toggle • Select a cable type then click terminals to connect</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Toolbox from './components/Toolbox.vue'
import Canvas from './components/Canvas.vue'
import { useCircuitStore } from './stores/circuit'

interface ToolboxExposed {
  clearCableSelection: () => void
}

const toolboxRef = ref<InstanceType<typeof Toolbox> & ToolboxExposed | null>(null)
const selectedCable = ref<string | null>(null)

const { clearAll: storeClearAll } = useCircuitStore()

const onSelectCable = (cableType: string): void => {
  selectedCable.value = cableType
}

const onCancelCable = (): void => {
  selectedCable.value = null
}

const onWireComplete = (): void => {
  // Keep cable selected for multiple connections
  // User can click cancel to deselect
}

const clearAll = (): void => {
  storeClearAll()
  selectedCable.value = null
  if (toolboxRef.value) {
    toolboxRef.value.clearCableSelection()
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
</style>
