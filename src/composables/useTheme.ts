import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'electric-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const storedTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

const systemTheme = (): Theme => (window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light')

// Null until the user picks one; until then the system preference is followed live.
const chosen = ref<Theme | null>(storedTheme())
const theme = ref<Theme>(chosen.value ?? systemTheme())

const applyTheme = (): void => {
  document.documentElement.dataset.theme = theme.value
}

applyTheme()

window.matchMedia?.(DARK_QUERY).addEventListener('change', (event) => {
  if (chosen.value) return
  theme.value = event.matches ? 'dark' : 'light'
  applyTheme()
})

const setTheme = (next: Theme): void => {
  chosen.value = next
  theme.value = next
  applyTheme()
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Ignore storage failures (e.g. private mode); the choice lasts this session.
  }
}

const isDark = computed(() => theme.value === 'dark')

const parseHex = (color: string): [number, number, number] | null => {
  const hex = color.trim().replace('#', '')
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ]
}

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const channel = (value: number): number => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const DARK_WIRE_LUMINANCE = 0.15
const LIGHTEN_AMOUNT = 0.55

/**
 * Wire colours are user data, so the theme can't restyle them in CSS. On the dark
 * canvas a near-black wire would be invisible, so those are mixed toward white;
 * every other colour is left exactly as chosen.
 */
export const displayWireColor = (color: string): string => {
  if (!isDark.value) return color
  const rgb = parseHex(color)
  if (!rgb || relativeLuminance(rgb) >= DARK_WIRE_LUMINANCE) return color
  const mixed = rgb.map(v => Math.round(v + (255 - v) * LIGHTEN_AMOUNT))
  return `#${mixed.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

export function useTheme() {
  return {
    theme,
    isDark,
    setTheme,
    toggleTheme: (): void => setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }
}
