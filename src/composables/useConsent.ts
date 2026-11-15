import { reactive } from 'vue'

// Cookie consent. Essential storage (sign-in, settings, watch progress) is always on;
// optional analytics only after an explicit "Allow". Analytics code must check `consent.analytics` before loading.
const KEY = 'dramora.consent.v1'
type Saved = { analytics: boolean; decidedAt: string }

function saved(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

// Global Privacy Control = an opt-out signal from the browser; California requires honoring it.
const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
const initial = saved()

const consent = reactive({
  analytics: gpc ? false : (initial?.analytics ?? false),
  gpc,
  open: !initial && !gpc, // show the banner on the first visit
  managing: false, // true = per-category "Manage cookies" view
})

export function useConsent() {
  return {
    consent,
    choose(analytics: boolean) {
      consent.analytics = analytics && !gpc
      consent.open = false
      consent.managing = false
      localStorage.setItem(KEY, JSON.stringify({ analytics: consent.analytics, decidedAt: new Date().toISOString() }))
    },
    /** Reopen the banner; `manage` jumps straight to the per-category switches. */
    reopen(manage = true) {
      consent.managing = manage
      consent.open = true
    },
  }
}
