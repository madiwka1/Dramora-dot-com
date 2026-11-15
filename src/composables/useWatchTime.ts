import { ref } from 'vue'

// Watch progress lives in browser storage for the MVP.
const KEY = 'dramora.watchSeconds'
const seconds = ref(Number(localStorage.getItem(KEY)) || 0)

export function useWatchTime() {
  function add(s: number) {
    seconds.value += s
    localStorage.setItem(KEY, String(seconds.value))
  }
  return { seconds, add }
}
