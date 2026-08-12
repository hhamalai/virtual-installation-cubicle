<template>
  <div class="tab-bar" role="tablist">
    <div class="tab-strip">
      <div
        v-for="doc in docs"
        :key="doc.id"
        class="tab"
        :class="{ active: doc.id === activeId }"
        role="tab"
        :aria-selected="doc.id === activeId"
        :title="`${doc.name} — double-click to rename`"
        @click="$emit('select', doc.id)"
        @dblclick="rename(doc.id, doc.name)"
      >
        <span class="tab-name">{{ doc.name }}</span>
        <button
          class="tab-close"
          type="button"
          :aria-label="`Close ${doc.name}`"
          @click.stop="$emit('close', doc.id)"
        >✕</button>
      </div>
    </div>
    <button class="tab-add" type="button" title="New circuit" aria-label="New circuit" @click="$emit('create')">＋</button>
  </div>
</template>

<script setup lang="ts">
import type { CircuitDoc } from '../types'

defineProps<{
  docs: CircuitDoc[]
  activeId: string
}>()

const emit = defineEmits<{
  select: [id: string]
  close: [id: string]
  create: []
  rename: [id: string, name: string]
}>()

const rename = (id: string, current: string): void => {
  const name = window.prompt('Circuit name', current)
  if (name && name.trim() && name !== current) emit('rename', id, name.trim())
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  gap: 6px;
  padding: 4px 10px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  min-height: 34px;
}

.tab-strip {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
  scrollbar-width: thin;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
  user-select: none;
}

.tab.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent-text);
  font-weight: 500;
}

.tab-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  border: none;
  background: transparent;
  color: var(--text-faint);
  font-size: 11px;
  line-height: 1;
  padding: 4px;
  border-radius: 3px;
  cursor: pointer;
}

.tab-close:hover {
  background: var(--danger);
  color: #fff;
}

.tab-add {
  flex-shrink: 0;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--accent);
  border-radius: 4px;
  width: 30px;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.tab-add:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}

@media (max-height: 500px) {
  .tab-bar {
    min-height: 28px;
    padding: 2px 8px;
  }
  .tab {
    padding: 2px 4px 2px 8px;
    font-size: 12px;
  }
  .tab-name {
    max-width: 110px;
  }
}
</style>
