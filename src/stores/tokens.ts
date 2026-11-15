import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getTokenTransactions, listUnlockedEpisodeIds, unlockEpisode, type TokenTransaction } from '../data'
import { useAuth } from './auth'

export const useTokens = defineStore('tokens', () => {
  const history = ref<TokenTransaction[]>([])
  const unlocked = ref(new Set<string>()) // episode ids bought with tokens
  const balance = computed(() => history.value.reduce((sum, t) => sum + t.delta, 0))
  async function load() {
    const { user } = useAuth()
    const [h, u] = user ? await Promise.all([getTokenTransactions(user.id), listUnlockedEpisodeIds()]) : [[], []]
    history.value = h
    unlocked.value = new Set(u)
  }
  async function unlock(episodeId: string) {
    await unlockEpisode(episodeId)
    await load()
  }
  return { history, unlocked, balance, load, unlock }
})
