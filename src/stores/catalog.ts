import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { listDramas, type Drama } from '../data'

export const useCatalog = defineStore('catalog', () => {
  const dramas = ref<Drama[]>([])
  const genres = computed(() => [...new Set(dramas.value.map((d) => d.genre))].sort())
  async function load() {
    dramas.value = await listDramas()
  }
  return { dramas, genres, load }
})
