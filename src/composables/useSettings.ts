import { reactive, watch } from 'vue'

// Personalization, saved per device. Colors live in style.css ([data-theme] / [data-accent]); these are just ids.
export const THEMES = ['midnight', 'graphite', 'plum', 'oled'] as const
export const ACCENTS = ['lime', 'sky', 'amber', 'rose', 'violet'] as const

const KEY = 'dramora.settings.v2' // v2: navy + lime palette
const defaults = {
  theme: 'midnight' as (typeof THEMES)[number],
  accent: 'lime' as (typeof ACCENTS)[number],
  autoplayNext: true,
  hoverPreviews: true,
}

function saved(): Partial<typeof defaults> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

const settings = reactive({ ...defaults, ...saved() })

function apply() {
  document.documentElement.dataset.theme = settings.theme
  document.documentElement.dataset.accent = settings.accent
}
apply() // runs on first import (main.ts), before the app mounts — no color flash

watch(settings, () => {
  localStorage.setItem(KEY, JSON.stringify(settings))
  apply()
})

export function useSettings() {
  return { settings, reset: () => Object.assign(settings, defaults) }
}
