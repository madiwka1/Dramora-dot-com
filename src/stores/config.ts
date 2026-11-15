import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getConfig } from '../data'

export const useConfigStore = defineStore('config', () => {
  const values = ref<Record<string, unknown>>({})
  async function load() {
    values.value = await getConfig()
  }
  return { values, load }
})

/** Read a business value from Config. */
export function useConfig() {
  const store = useConfigStore()
  return { get: <T = number>(key: string) => store.values[key] as T }
}
