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
          :key="`${src}|${theme}`"
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
import { useTheme } from '../composables/useTheme'

// Guides read the saved theme themselves; re-key the frame so an open guide
// follows a theme change instead of staying on the old palette.
const { theme } = useTheme()

const props = defineProps<{
  open: boolean
  src: string
}>()

const emit = defineEmits<{
  close: []
  navigate: [url: string]
  'open-sample': [sampleId: string]
}>()

// Guides link their ready-made circuit as /?sample=<id> so the link also works on
// the standalone page; inside the drawer it opens a simulator tab instead.
const sampleIdFromHref = (href: string): string | null => {
  const match = /^\/\?sample=([\w-]+)$/.exec(href)
  return match ? match[1] : null
}

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
      const sampleId = sampleIdFromHref(href)
      if (sampleId) {
        a.addEventListener('click', (e) => {
          e.preventDefault()
          emit('open-sample', sampleId)
        })
      } else if (href === '/') {
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
  background: var(--overlay);
  z-index: 1500;
  display: flex;
  justify-content: flex-end;
}

.docs-drawer {
  width: min(560px, 100vw);
  height: 100%;
  background: var(--surface);
  box-shadow: -4px 0 24px var(--shadow-strong);
  display: flex;
  flex-direction: column;
}

.docs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-soft);
  background: var(--surface-2);
}

.docs-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.docs-tabs button {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--accent);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.docs-tabs button.active {
  background: var(--accent);
  color: var(--surface);
  border-color: var(--accent);
}

.docs-ext {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 16px;
  padding: 2px 6px;
}

.docs-close {
  border: none;
  background: var(--surface-sunken);
  color: var(--text);
  font-size: 14px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.docs-close:hover {
  background: var(--surface-3);
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
