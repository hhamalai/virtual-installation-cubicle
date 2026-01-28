<template>
  <div class="toolbox">
    <h3>Components</h3>

    <div class="section">
      <h4>Power</h4>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'power-input')">
        <svg width="50" height="30" viewBox="0 0 70 35">
          <rect x="5" y="5" width="60" height="25" rx="3" fill="#f5f5f5" stroke="#333" stroke-width="1"/>
          <circle cx="15" cy="18" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/>
          <circle cx="35" cy="18" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/>
          <circle cx="55" cy="18" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/>
        </svg>
        <span>Power Input</span>
      </div>
    </div>

    <div class="section">
      <h4>Lights</h4>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'light')">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="18" r="14" fill="#fff" stroke="#333" stroke-width="1.5"/>
          <line x1="10" y1="8" x2="30" y2="28" stroke="#333" stroke-width="1"/>
          <line x1="30" y1="8" x2="10" y2="28" stroke="#333" stroke-width="1"/>
        </svg>
        <span>Light (2-wire)</span>
      </div>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'light-grounded')">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="18" r="14" fill="#fff" stroke="#333" stroke-width="1.5"/>
          <line x1="10" y1="8" x2="30" y2="28" stroke="#333" stroke-width="1"/>
          <line x1="30" y1="8" x2="10" y2="28" stroke="#333" stroke-width="1"/>
          <circle cx="20" cy="18" r="5" fill="none" stroke="#7cb342" stroke-width="1"/>
        </svg>
        <span>Light (3-wire)</span>
      </div>
    </div>

    <div class="section">
      <h4>Switches</h4>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'switch1')">
        <svg width="40" height="30" viewBox="0 0 60 30">
          <circle cx="10" cy="15" r="3" fill="#333"/>
          <circle cx="45" cy="15" r="3" fill="#666"/>
          <line x1="10" y1="15" x2="38" y2="6" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Type 1 (On/Off)</span>
      </div>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'switch5')">
        <svg width="40" height="35" viewBox="0 0 60 40">
          <circle cx="10" cy="20" r="3" fill="#333"/>
          <circle cx="45" cy="8" r="2.5" fill="#666"/>
          <circle cx="45" cy="32" r="2.5" fill="#666"/>
          <line x1="10" y1="20" x2="45" y2="8" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Type 5 (Two-way)</span>
      </div>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'switch6')">
        <svg width="40" height="35" viewBox="0 0 60 40">
          <circle cx="10" cy="20" r="3" fill="#333"/>
          <circle cx="45" cy="8" r="2.5" fill="#666"/>
          <circle cx="45" cy="32" r="2.5" fill="#666"/>
          <line x1="10" y1="20" x2="45" y2="8" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Type 6 (Two-way)</span>
      </div>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'switch66')">
        <svg width="40" height="45" viewBox="0 0 60 55">
          <circle cx="10" cy="12" r="2.5" fill="#333"/>
          <circle cx="45" cy="6" r="2" fill="#666"/>
          <circle cx="45" cy="18" r="2" fill="#666"/>
          <line x1="10" y1="12" x2="45" y2="6" stroke="#333" stroke-width="1.5"/>
          <line x1="5" y1="28" x2="50" y2="28" stroke="#ccc" stroke-width="0.5"/>
          <circle cx="10" cy="42" r="2.5" fill="#333"/>
          <circle cx="45" cy="36" r="2" fill="#666"/>
          <circle cx="45" cy="48" r="2" fill="#666"/>
          <line x1="10" y1="42" x2="45" y2="36" stroke="#333" stroke-width="1.5"/>
        </svg>
        <span>Type 6+6 (Double)</span>
      </div>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'switch7')">
        <svg width="40" height="35" viewBox="0 0 60 40">
          <circle cx="10" cy="10" r="2.5" fill="#333"/>
          <circle cx="10" cy="30" r="2.5" fill="#333"/>
          <circle cx="45" cy="10" r="2.5" fill="#666"/>
          <circle cx="45" cy="30" r="2.5" fill="#666"/>
          <line x1="10" y1="10" x2="45" y2="10" stroke="#333" stroke-width="1.5"/>
          <line x1="10" y1="30" x2="45" y2="30" stroke="#333" stroke-width="1.5"/>
        </svg>
        <span>Type 7 (Cross)</span>
      </div>
    </div>

    <div class="section">
      <h4>Wiring</h4>
      <div
        class="tool-item cable-type"
        :class="{ selected: selectedCable === 'single' }"
        @click="selectCable('single')"
      >
        <svg width="40" height="20" viewBox="0 0 40 20">
          <line x1="5" y1="10" x2="35" y2="10" stroke="#333" stroke-width="3"/>
          <circle cx="5" cy="10" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/>
          <circle cx="35" cy="10" r="4" fill="#fff" stroke="#333" stroke-width="1.5"/>
        </svg>
        <span>Single Wire</span>
      </div>
    </div>

    <div v-if="selectedCable" class="cable-info">
      <p>Click a terminal to start wiring</p>
      <button @click="cancelCable">Cancel</button>
    </div>

    <div class="section">
      <h4>Cable Bundles</h4>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'cable-mmj3')">
        <div class="cable-preview">
          <div class="wire-color" style="background-color: #d32f2f"></div>
          <div class="wire-color" style="background-color: #1976d2"></div>
          <div class="wire-color" style="background-color: #7cb342"></div>
        </div>
        <span>MMJ 3×1.5</span>
      </div>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'cable-mmj5')">
        <div class="cable-preview">
          <div class="wire-color" style="background-color: #d32f2f"></div>
          <div class="wire-color" style="background-color: #212121"></div>
          <div class="wire-color" style="background-color: #757575"></div>
          <div class="wire-color" style="background-color: #1976d2"></div>
          <div class="wire-color" style="background-color: #7cb342"></div>
        </div>
        <span>MMJ 5×1.5</span>
      </div>
      <div class="tool-item" draggable="true" @dragstart="onDragStart($event, 'cable-omm')">
        <div class="cable-preview">
          <div class="wire-color" style="background-color: #e91e63"></div>
          <div class="wire-color" style="background-color: #9c27b0"></div>
          <div class="wire-color" style="background-color: #673ab7"></div>
          <div class="wire-color" style="background-color: #3f51b5"></div>
          <div class="wire-color" style="background-color: #009688"></div>
          <div class="wire-color" style="background-color: #ff9800"></div>
          <div class="wire-color" style="background-color: #795548"></div>
        </div>
        <span>MMO 7-wire</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'drag-start': [type: string]
  'select-cable': [type: string]
  'cancel-cable': []
}>()

const selectedCable = ref<string | null>(null)

const onDragStart = (event: DragEvent, type: string): void => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('elementType', type)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

const selectCable = (type: string): void => {
  selectedCable.value = type
  emit('select-cable', type)
}

const cancelCable = (): void => {
  selectedCable.value = null
  emit('cancel-cable')
}

defineExpose({
  clearCableSelection: (): void => {
    selectedCable.value = null
  }
})
</script>

<style scoped>
.toolbox {
  width: 200px;
  background: #f8f9fa;
  border-right: 1px solid #ddd;
  padding: 15px;
  overflow-y: auto;
  height: 100vh;
}

h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
}

.section {
  margin-bottom: 20px;
}

h4 {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: grab;
  transition: all 0.15s;
}

.tool-item:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tool-item:active {
  cursor: grabbing;
}

.tool-item span {
  font-size: 12px;
  color: #333;
}

.cable-type {
  cursor: pointer;
}

.cable-type.selected {
  border-color: #1976d2;
  background: #e3f2fd;
}

.cable-preview {
  display: flex;
  gap: 2px;
}

.wire-color {
  width: 8px;
  height: 20px;
  border-radius: 2px;
}

.cable-info {
  margin-top: 15px;
  padding: 10px;
  background: #fff3e0;
  border-radius: 4px;
  font-size: 12px;
}

.cable-info p {
  margin: 0 0 8px 0;
  color: #e65100;
}

.cable-info button {
  padding: 4px 12px;
  border: none;
  background: #ff9800;
  color: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.cable-info button:hover {
  background: #f57c00;
}
</style>
