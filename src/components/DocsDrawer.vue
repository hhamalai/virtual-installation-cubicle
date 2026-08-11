<template>
  <transition name="docs">
    <div v-if="open" class="docs-overlay" @click.self="close">
      <aside class="docs-drawer" role="dialog" aria-modal="true" aria-label="Documentation">
        <div class="docs-bar">
          <nav class="docs-tabs">
            <button
              v-for="g in guides"
              :key="g.url"
              type="button"
              :class="{ active: g.url === src }"
              @click="$emit('navigate', g.url)"
            >{{ g.label }}</button>
          </nav>
          <a class="docs-ext" :href="src" target="_blank" rel="noopener" title="Open in new tab">↗</a>
          <button class="docs-close" type="button" aria-label="Close documentation" @click="close">✕</button>
        </div>
        <iframe
          ref="frameRef"
          :src="src"
          class="docs-frame"
          title="Documentation"
          @load="onFrameLoad"
        ></iframe>
      </aside>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  open: boolean
  src: string
}>()

const emit = defineEmits<{
  close: []
  navigate: [url: string]
}>()

const guides = [
  { label: 'All guides', url: '/guides/index.html' },
  { label: 'Two-way switches', url: '/guides/two-way-switch-wiring.html' },
  { label: 'Cross switches', url: '/guides/intermediate-cross-switch-wiring.html' },
  { label: 'Relays', url: '/guides/relay-no-nc-contacts.html' },
  { label: 'Timer', url: '/guides/multifunction-timer.html' }
]

const frameRef = ref<HTMLIFrameElement | null>(null)

const close = (): void => emit('close')

// Guides are same-origin static pages. Keep guide-to-guide navigation inside the
// drawer, but make links back to the app ("/") just close the drawer instead of
// reloading the whole app inside the narrow iframe.
const onFrameLoad = (): void => {
  const frame = frameRef.value
  if (!frame) return
  try {
    const doc = frame.contentDocument
    if (!doc) return
    doc.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href') || ''
      if (href.startsWith('/guides/') || href.startsWith('#')) return
      if (href === '/') {
        a.addEventListener('click', (e) => {
          e.preventDefault()
          emit('close')
        })
      } else {
        a.target = '_top'
      }
    })
  } catch {
    // Cross-origin frame (not expected for local guides) — leave it untouched.
  }
}

const onKey = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && props.open) emit('close')
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.docs-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1500;
  display: flex;
  justify-content: flex-end;
}

.docs-drawer {
  width: min(560px, 100vw);
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.docs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid #e3e8ee;
  background: #f8fafc;
}

.docs-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.docs-tabs button {
  border: 1px solid #d8e0ea;
  background: #fff;
  color: #1976d2;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.docs-tabs button.active {
  background: #1976d2;
  color: #fff;
  border-color: #1976d2;
}

.docs-ext {
  color: #5a6b7a;
  text-decoration: none;
  font-size: 16px;
  padding: 2px 6px;
}

.docs-close {
  border: none;
  background: #eef2f6;
  color: #333;
  font-size: 14px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.docs-close:hover {
  background: #e0e6ec;
}

.docs-frame {
  flex: 1;
  width: 100%;
  border: none;
}

.docs-enter-active,
.docs-leave-active {
  transition: opacity 0.2s ease;
}

.docs-enter-from,
.docs-leave-to {
  opacity: 0;
}

.docs-enter-active .docs-drawer,
.docs-leave-active .docs-drawer {
  transition: transform 0.25s ease;
}

.docs-enter-from .docs-drawer,
.docs-leave-to .docs-drawer {
  transform: translateX(100%);
}
</style>
