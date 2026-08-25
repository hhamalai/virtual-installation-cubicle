<template>
  <div class="toolbox" :class="{ collapsed: open === false }">
    <h3>Components</h3>

    <div v-if="selectedComponent" class="component-info">
      <p>Tap on canvas to place component</p>
      <button @click="cancelComponent">Cancel</button>
    </div>

    <div class="section">
      <h4>Power</h4>
      <div class="tool-item" :class="{ selected: selectedComponent === 'power-input' }" draggable="true" @dragstart="onDragStart($event, 'power-input')" @click="onComponentTap('power-input')">
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
      <div class="tool-item" :class="{ selected: selectedComponent === 'light' }" draggable="true" @dragstart="onDragStart($event, 'light')" @click="onComponentTap('light')">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="18" r="14" fill="#fff" stroke="#333" stroke-width="1.5"/>
          <line x1="10" y1="8" x2="30" y2="28" stroke="#333" stroke-width="1"/>
          <line x1="30" y1="8" x2="10" y2="28" stroke="#333" stroke-width="1"/>
        </svg>
        <span>Light (2-wire)</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'light-grounded' }" draggable="true" @dragstart="onDragStart($event, 'light-grounded')" @click="onComponentTap('light-grounded')">
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
      <div class="tool-item" :class="{ selected: selectedComponent === 'switch1' }" draggable="true" @dragstart="onDragStart($event, 'switch1')" @click="onComponentTap('switch1')">
        <svg width="40" height="30" viewBox="0 0 60 30">
          <circle cx="10" cy="15" r="3" fill="#333"/>
          <circle cx="45" cy="15" r="3" fill="#666"/>
          <line x1="10" y1="15" x2="38" y2="6" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Type 1 (On/Off)</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'switch5' }" draggable="true" @dragstart="onDragStart($event, 'switch5')" @click="onComponentTap('switch5')">
        <svg width="40" height="35" viewBox="0 0 60 40">
          <circle cx="10" cy="20" r="3" fill="#333"/>
          <circle cx="45" cy="8" r="2.5" fill="#666"/>
          <circle cx="45" cy="32" r="2.5" fill="#666"/>
          <line x1="10" y1="20" x2="45" y2="8" stroke="#333" stroke-width="2"/>
          <line x1="10" y1="20" x2="40" y2="27" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Type 5 (Double on/off)</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'switch6' }" draggable="true" @dragstart="onDragStart($event, 'switch6')" @click="onComponentTap('switch6')">
        <svg width="40" height="35" viewBox="0 0 60 40">
          <circle cx="10" cy="20" r="3" fill="#333"/>
          <circle cx="45" cy="8" r="2.5" fill="#666"/>
          <circle cx="45" cy="32" r="2.5" fill="#666"/>
          <line x1="10" y1="20" x2="45" y2="8" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Type 6 (Two-way)</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'switch66' }" draggable="true" @dragstart="onDragStart($event, 'switch66')" @click="onComponentTap('switch66')">
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
      <div class="tool-item" :class="{ selected: selectedComponent === 'switch7' }" draggable="true" @dragstart="onDragStart($event, 'switch7')" @click="onComponentTap('switch7')">
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
      <div class="tool-item" :class="{ selected: selectedComponent === 'switch8' }" draggable="true" @dragstart="onDragStart($event, 'switch8')" @click="onComponentTap('switch8')">
        <svg width="40" height="35" viewBox="0 0 60 40">
          <circle cx="10" cy="20" r="3" fill="#333"/>
          <circle cx="45" cy="8" r="2.5" fill="#666"/>
          <circle cx="45" cy="32" r="2.5" fill="#666"/>
          <line x1="10" y1="20" x2="33" y2="20" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Type 8 (1-0-3)</span>
      </div>
    </div>

    <div class="section">
      <h4>Relays</h4>
      <div class="tool-item" :class="{ selected: selectedComponent === 'relay-no-no' }" draggable="true" @dragstart="onDragStart($event, 'relay-no-no')" @click="onComponentTap('relay-no-no')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <!-- Coil -->
          <rect x="22" y="36" width="16" height="18" rx="2" fill="none" stroke="#333" stroke-width="1.5"/>
          <path d="M 26 42 Q 28 40, 30 42 Q 32 44, 34 42" fill="none" stroke="#333" stroke-width="1"/>
          <path d="M 26 48 Q 28 46, 30 48 Q 32 50, 34 48" fill="none" stroke="#333" stroke-width="1"/>
          <!-- Pole 1 (open) -->
          <circle cx="12" cy="30" r="2.5" fill="#333"/>
          <circle cx="12" cy="58" r="2.5" fill="#333"/>
          <line x1="12" y1="58" x2="18" y2="34" stroke="#666" stroke-width="2"/>
          <!-- Pole 2 (open) -->
          <circle cx="48" cy="30" r="2.5" fill="#333"/>
          <circle cx="48" cy="58" r="2.5" fill="#333"/>
          <line x1="48" y1="58" x2="42" y2="34" stroke="#666" stroke-width="2"/>
        </svg>
        <span>Relay NO-NO</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'relay-no-nc' }" draggable="true" @dragstart="onDragStart($event, 'relay-no-nc')" @click="onComponentTap('relay-no-nc')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <!-- Coil -->
          <rect x="22" y="36" width="16" height="18" rx="2" fill="none" stroke="#333" stroke-width="1.5"/>
          <path d="M 26 42 Q 28 40, 30 42 Q 32 44, 34 42" fill="none" stroke="#333" stroke-width="1"/>
          <path d="M 26 48 Q 28 46, 30 48 Q 32 50, 34 48" fill="none" stroke="#333" stroke-width="1"/>
          <!-- Pole 1 (NO, open) -->
          <circle cx="12" cy="30" r="2.5" fill="#333"/>
          <circle cx="12" cy="58" r="2.5" fill="#333"/>
          <line x1="12" y1="58" x2="18" y2="34" stroke="#666" stroke-width="2"/>
          <!-- Pole 2 (NC, closed) -->
          <circle cx="48" cy="30" r="2.5" fill="#333"/>
          <circle cx="48" cy="58" r="2.5" fill="#333"/>
          <line x1="48" y1="58" x2="48" y2="30" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Relay NO-NC</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'relay-nc-nc' }" draggable="true" @dragstart="onDragStart($event, 'relay-nc-nc')" @click="onComponentTap('relay-nc-nc')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <!-- Coil -->
          <rect x="22" y="36" width="16" height="18" rx="2" fill="none" stroke="#333" stroke-width="1.5"/>
          <path d="M 26 42 Q 28 40, 30 42 Q 32 44, 34 42" fill="none" stroke="#333" stroke-width="1"/>
          <path d="M 26 48 Q 28 46, 30 48 Q 32 50, 34 48" fill="none" stroke="#333" stroke-width="1"/>
          <!-- Pole 1 (NC, closed) -->
          <circle cx="12" cy="30" r="2.5" fill="#333"/>
          <circle cx="12" cy="58" r="2.5" fill="#333"/>
          <line x1="12" y1="58" x2="12" y2="30" stroke="#333" stroke-width="2"/>
          <!-- Pole 2 (NC, closed) -->
          <circle cx="48" cy="30" r="2.5" fill="#333"/>
          <circle cx="48" cy="58" r="2.5" fill="#333"/>
          <line x1="48" y1="58" x2="48" y2="30" stroke="#333" stroke-width="2"/>
        </svg>
        <span>Relay NC-NC</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'step-relay' }" draggable="true" @dragstart="onDragStart($event, 'step-relay')" @click="onComponentTap('step-relay')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <!-- Coil -->
          <rect x="22" y="36" width="16" height="18" rx="2" fill="none" stroke="#333" stroke-width="1.5"/>
          <path d="M 26 42 Q 28 40, 30 42 Q 32 44, 34 42" fill="none" stroke="#333" stroke-width="1"/>
          <path d="M 26 48 Q 28 46, 30 48 Q 32 50, 34 48" fill="none" stroke="#333" stroke-width="1"/>
          <!-- Latching NO contact -->
          <circle cx="12" cy="30" r="2.5" fill="#333"/>
          <circle cx="12" cy="58" r="2.5" fill="#333"/>
          <line x1="12" y1="58" x2="18" y2="34" stroke="#666" stroke-width="2"/>
          <!-- Impulse arrows into the coil -->
          <path d="M 44 40 L 52 40 M 48 36 L 52 40 L 48 44" fill="none" stroke="#1976d2" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M 44 50 L 52 50 M 48 46 L 52 50 L 48 54" fill="none" stroke="#1976d2" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Step Relay (impulse)</span>
      </div>
    </div>

    <div class="section">
      <h4>Buttons</h4>
      <div class="tool-item" :class="{ selected: selectedComponent === 'button' }" draggable="true" @dragstart="onDragStart($event, 'button')" @click="onComponentTap('button')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <rect x="15" y="5" width="30" height="80" rx="3" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>
          <!-- terminals -->
          <circle cx="23" cy="9" r="2.5" fill="#fff" stroke="#2e7d32" stroke-width="1.2"/>
          <circle cx="37" cy="9" r="2.5" fill="#fff" stroke="#c62828" stroke-width="1.2"/>
          <circle cx="23" cy="81" r="2.5" fill="#fff" stroke="#2e7d32" stroke-width="1.2"/>
          <circle cx="37" cy="81" r="2.5" fill="#fff" stroke="#c62828" stroke-width="1.2"/>
          <!-- green + red buttons -->
          <circle cx="23" cy="45" r="9" fill="#1b5e20"/>
          <circle cx="23" cy="45" r="6.5" fill="#66bb6a"/>
          <circle cx="37" cy="45" r="9" fill="#b71c1c"/>
          <circle cx="37" cy="45" r="6.5" fill="#ef5350"/>
        </svg>
        <span>Start/Stop Button</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'button-no' }" draggable="true" @dragstart="onDragStart($event, 'button-no')" @click="onComponentTap('button-no')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <rect x="15" y="5" width="30" height="80" rx="3" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>
          <!-- terminals -->
          <circle cx="30" cy="9" r="2.5" fill="#fff" stroke="#2e7d32" stroke-width="1.2"/>
          <circle cx="30" cy="81" r="2.5" fill="#fff" stroke="#2e7d32" stroke-width="1.2"/>
          <!-- green button -->
          <circle cx="30" cy="45" r="9" fill="#1b5e20"/>
          <circle cx="30" cy="45" r="6.5" fill="#66bb6a"/>
        </svg>
        <span>Push Button (NO)</span>
      </div>
    </div>

    <div class="section">
      <h4>Timers</h4>
      <div class="tool-item" :class="{ selected: selectedComponent === 'timer' }" draggable="true" @dragstart="onDragStart($event, 'timer')" @click="onComponentTap('timer')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <rect x="10" y="5" width="40" height="80" rx="3" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>
          <rect x="14" y="24" width="32" height="42" rx="2" fill="#fff" stroke="#cfd8e3" stroke-width="1"/>
          <circle cx="22" cy="33" r="3" fill="#4caf50"/>
          <circle cx="38" cy="33" r="3" fill="#ffca28"/>
          <text x="30" y="52" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a2733">t</text>
          <circle cx="19" cy="9" r="2.5" fill="#fff" stroke="#8B4513" stroke-width="1.2"/>
          <circle cx="30" cy="9" r="2.5" fill="#fff" stroke="#ff9800" stroke-width="1.2"/>
          <circle cx="41" cy="9" r="2.5" fill="#fff" stroke="#333" stroke-width="1.2"/>
          <circle cx="19" cy="81" r="2.5" fill="#fff" stroke="#1976d2" stroke-width="1.2"/>
          <circle cx="30" cy="81" r="2.5" fill="#fff" stroke="#333" stroke-width="1.2"/>
          <circle cx="41" cy="81" r="2.5" fill="#fff" stroke="#333" stroke-width="1.2"/>
        </svg>
        <span>Multifunction Timer</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'star-delta-timer' }" draggable="true" @dragstart="onDragStart($event, 'star-delta-timer')" @click="onComponentTap('star-delta-timer')">
        <svg width="45" height="50" viewBox="0 0 60 90">
          <rect x="10" y="5" width="40" height="80" rx="3" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>
          <rect x="14" y="24" width="32" height="42" rx="2" fill="#fff" stroke="#cfd8e3" stroke-width="1"/>
          <circle cx="20" cy="33" r="3" fill="#4caf50"/>
          <circle cx="30" cy="33" r="3" fill="#ffca28"/>
          <circle cx="40" cy="33" r="3" fill="#29b6f6"/>
          <text x="30" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#1a2733">Y∆</text>
          <circle cx="19" cy="9" r="2.5" fill="#fff" stroke="#8B4513" stroke-width="1.2"/>
          <circle cx="41" cy="9" r="2.5" fill="#fff" stroke="#333" stroke-width="1.2"/>
          <circle cx="19" cy="81" r="2.5" fill="#fff" stroke="#1976d2" stroke-width="1.2"/>
          <circle cx="30" cy="81" r="2.5" fill="#fff" stroke="#333" stroke-width="1.2"/>
          <circle cx="41" cy="81" r="2.5" fill="#fff" stroke="#333" stroke-width="1.2"/>
        </svg>
        <span>Star-Delta Timer</span>
      </div>
    </div>

    <div class="section">
      <h4>Enclosures</h4>
      <div class="tool-item" :class="{ selected: selectedComponent === 'junction-box' }" draggable="true" @dragstart="onDragStart($event, 'junction-box')" @click="onComponentTap('junction-box')">
        <svg width="50" height="50" viewBox="0 0 100 100">
          <!-- Box outline -->
          <rect x="5" y="5" width="90" height="90" rx="3" fill="#f5f5f5" stroke="#333" stroke-width="1.5"/>
          <!-- Dividers -->
          <line x1="50" y1="5" x2="50" y2="95" stroke="#ddd" stroke-width="1"/>
          <line x1="5" y1="50" x2="95" y2="50" stroke="#ddd" stroke-width="1"/>
          <!-- Top terminals -->
          <circle cx="25" cy="5" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="50" cy="5" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="75" cy="5" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <!-- Bottom terminals -->
          <circle cx="25" cy="95" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="50" cy="95" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="75" cy="95" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <!-- Left terminals -->
          <circle cx="5" cy="25" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="5" cy="50" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="5" cy="75" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <!-- Right terminals -->
          <circle cx="95" cy="25" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="95" cy="50" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
          <circle cx="95" cy="75" r="3" fill="#fff" stroke="#333" stroke-width="1"/>
        </svg>
        <span>Junction Box AP9</span>
      </div>
      <div class="tool-item" :class="{ selected: selectedComponent === 'distribution-board' }" draggable="true" @dragstart="onDragStart($event, 'distribution-board')" @click="onComponentTap('distribution-board')">
        <svg width="60" height="45" viewBox="0 0 120 90">
          <!-- Board outline -->
          <rect x="2" y="2" width="116" height="86" rx="3" fill="#e8e8e8" stroke="#333" stroke-width="1.5"/>
          <!-- Power input section -->
          <rect x="6" y="6" width="30" height="18" rx="2" fill="#f5f5f5" stroke="#666" stroke-width="0.5"/>
          <circle cx="12" cy="20" r="2" fill="#d32f2f" stroke="#333" stroke-width="0.5"/>
          <circle cx="21" cy="20" r="2" fill="#1976d2" stroke="#333" stroke-width="0.5"/>
          <circle cx="30" cy="20" r="2" fill="#7cb342" stroke="#333" stroke-width="0.5"/>
          <!-- DIN rails -->
          <rect x="10" y="30" width="100" height="6" rx="1" fill="#b0b0b0" stroke="#888" stroke-width="0.5"/>
          <rect x="10" y="48" width="100" height="6" rx="1" fill="#b0b0b0" stroke="#888" stroke-width="0.5"/>
          <!-- Busbars -->
          <rect x="10" y="66" width="100" height="4" rx="0.5" fill="#d32f2f"/>
          <rect x="10" y="72" width="100" height="4" rx="0.5" fill="#1976d2"/>
          <rect x="10" y="78" width="100" height="4" rx="0.5" fill="#7cb342"/>
          <!-- Terminals on sides -->
          <circle cx="2" cy="25" r="2" fill="#fff" stroke="#333" stroke-width="0.5"/>
          <circle cx="2" cy="45" r="2" fill="#fff" stroke="#333" stroke-width="0.5"/>
          <circle cx="2" cy="65" r="2" fill="#fff" stroke="#333" stroke-width="0.5"/>
          <circle cx="118" cy="25" r="2" fill="#fff" stroke="#333" stroke-width="0.5"/>
          <circle cx="118" cy="45" r="2" fill="#fff" stroke="#333" stroke-width="0.5"/>
          <circle cx="118" cy="65" r="2" fill="#fff" stroke="#333" stroke-width="0.5"/>
        </svg>
        <span>Distribution Board</span>
      </div>
    </div>

    <div class="section">
      <h4>Cables</h4>
      <p class="section-hint">Click terminal to start, click to add points, click terminal to finish</p>
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
      <div
        class="tool-item cable-type"
        :class="{ selected: selectedCable === 'mmj3' }"
        @click="selectCable('mmj3')"
      >
        <svg width="40" height="20" viewBox="0 0 40 20">
          <line x1="5" y1="10" x2="35" y2="10" stroke="#9e9e9e" stroke-width="10" stroke-linecap="round"/>
          <line x1="5" y1="10" x2="35" y2="10" stroke="#bdbdbd" stroke-width="6" stroke-linecap="round"/>
          <line x1="5" y1="10" x2="35" y2="10" stroke="#7cb342" stroke-width="2" stroke-dasharray="4,3" stroke-linecap="round"/>
        </svg>
        <span>MMJ 3x1.5</span>
      </div>
      <div
        class="tool-item cable-type"
        :class="{ selected: selectedCable === 'mmj5' }"
        @click="selectCable('mmj5')"
      >
        <svg width="40" height="20" viewBox="0 0 40 20">
          <line x1="5" y1="10" x2="35" y2="10" stroke="#9e9e9e" stroke-width="13" stroke-linecap="round"/>
          <line x1="5" y1="10" x2="35" y2="10" stroke="#bdbdbd" stroke-width="9" stroke-linecap="round"/>
          <line x1="5" y1="10" x2="35" y2="10" stroke="#7cb342" stroke-width="2" stroke-dasharray="4,3" stroke-linecap="round"/>
        </svg>
        <span>MMJ 5x1.5</span>
      </div>
      <div
        class="tool-item cable-type"
        :class="{ selected: selectedCable === 'omm' }"
        @click="selectCable('omm')"
      >
        <svg width="40" height="20" viewBox="0 0 40 20">
          <line x1="5" y1="10" x2="35" y2="10" stroke="#616161" stroke-width="16" stroke-linecap="round"/>
          <line x1="5" y1="10" x2="35" y2="10" stroke="#9e9e9e" stroke-width="12" stroke-linecap="round"/>
        </svg>
        <span>OMM 7-wire</span>
      </div>
    </div>

    <div class="section">
      <h4>Wire Color</h4>
      <p class="section-hint">Applies to single wires</p>
      <div class="wire-colors">
        <button
          v-for="color in wireColorPresets"
          :key="color"
          type="button"
          class="swatch"
          :class="{ selected: selectedCable === 'single' && selectedWireColor.toLowerCase() === color.toLowerCase() }"
          :style="{ background: color }"
          :title="color"
          @click="selectWireColor(color)"
        />
        <label class="swatch swatch-custom" title="Custom color">
          <input type="color" :value="selectedWireColor" @input="onCustomColor" />
        </label>
      </div>
    </div>

    <div v-if="selectedCable" class="cable-info">
      <p>Click a terminal to start wiring</p>
      <button @click="cancelCable">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  open?: boolean
}>()

const emit = defineEmits<{
  'drag-start': [type: string]
  'select-cable': [type: string]
  'cancel-cable': []
  'select-component': [type: string]
  'select-wire-color': [color: string]
}>()

const selectedCable = ref<string | null>(null)
const selectedComponent = ref<string | null>(null)
const selectedWireColor = ref<string>('#333333')

const wireColorPresets = [
  '#333333', // Black
  '#8B4513', // Brown (L)
  '#1976d2', // Blue (N)
  '#757575', // Grey
  '#d32f2f', // Red
  '#7cb342', // Green/Yellow (PE)
  '#ff9800', // Orange
  '#ffffff'  // White
]

const selectWireColor = (color: string): void => {
  selectedWireColor.value = color
  selectedCable.value = 'single'
  emit('select-cable', 'single')
  emit('select-wire-color', color)
}

const onCustomColor = (event: Event): void => {
  selectWireColor((event.target as HTMLInputElement).value)
}

const onDragStart = (event: DragEvent, type: string): void => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('elementType', type)
    event.dataTransfer.effectAllowed = 'copy'
  }
}

// For touch devices: tap to select component, then tap canvas to place
const onComponentTap = (type: string): void => {
  selectedComponent.value = type
  emit('select-component', type)
}

const selectCable = (type: string): void => {
  // Toggle: if already selected, deselect and cancel
  if (selectedCable.value === type) {
    selectedCable.value = null
    emit('cancel-cable')
  } else {
    selectedCable.value = type
    emit('select-cable', type)
  }
}

const cancelCable = (): void => {
  selectedCable.value = null
  emit('cancel-cable')
}

const cancelComponent = (): void => {
  selectedComponent.value = null
}

defineExpose({
  clearCableSelection: (): void => {
    selectedCable.value = null
  },
  clearComponentSelection: (): void => {
    selectedComponent.value = null
  },
  getSelectedComponent: (): string | null => {
    return selectedComponent.value
  }
})
</script>

<style scoped>
.toolbox {
  width: 200px;
  background: var(--surface-2);
  border-right: 1px solid var(--border);
  padding: 15px;
  overflow-y: auto;
  height: 100vh;
  flex-shrink: 0;
}

.toolbox.collapsed {
  display: none;
}

/* On small screens the sidebar floats over the canvas as a drawer so it doesn't
   permanently eat horizontal space. It sits below the header so the toggle stays
   reachable. */
@media (max-width: 700px), (max-height: 500px) {
  .toolbox {
    position: absolute;
    top: 47px;
    left: 0;
    height: calc(100% - 47px);
    z-index: 500;
    box-shadow: 2px 0 12px var(--shadow-strong);
  }
}

h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: var(--text);
}

.section {
  margin-bottom: 20px;
}

h4 {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-hint {
  margin: 0 0 8px 0;
  font-size: 10px;
  color: var(--text-faint);
  font-style: italic;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: grab;
  transition: all 0.15s;
}

.tool-item:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 4px var(--shadow);
}

.tool-item:active {
  cursor: grabbing;
}

.tool-item span {
  font-size: 12px;
  color: var(--text);
}

.cable-type {
  cursor: pointer;
}

.cable-type.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
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
  background: var(--warn-bg);
  border-radius: 4px;
  font-size: 12px;
}

.cable-info p {
  margin: 0 0 8px 0;
  color: var(--warn-text);
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

.component-info {
  margin-bottom: 15px;
  padding: 10px;
  background: var(--accent-soft);
  border-radius: 4px;
  font-size: 12px;
}

.component-info p {
  margin: 0 0 8px 0;
  color: var(--accent-text);
}

.component-info button {
  padding: 4px 12px;
  border: none;
  background: var(--accent);
  color: var(--surface);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.component-info button:hover {
  background: var(--accent-strong);
}

.tool-item.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.wire-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.swatch {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid var(--border);
  padding: 0;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.swatch:hover {
  transform: scale(1.1);
}

.swatch.selected {
  border: 2px solid var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.swatch-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: conic-gradient(red, orange, yellow, lime, aqua, blue, magenta, red);
}

.swatch-custom input {
  opacity: 0;
  width: 100%;
  height: 100%;
  border: none;
  cursor: pointer;
}
</style>
