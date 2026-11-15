import { ref } from 'vue'

// One app-wide paywall (rendered once in App.vue); any button can open it.
const isOpen = ref(false)
const section = ref<'plus' | 'tokens'>('plus')

export function usePaywall() {
  return {
    isOpen,
    section,
    open(s: 'plus' | 'tokens' = 'plus') {
      section.value = s
      isOpen.value = true
    },
    close() {
      isOpen.value = false
    },
  }
}

/** $5.99, $100 — cents in, US dollars out (whole dollars drop the .00). */
export const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)
