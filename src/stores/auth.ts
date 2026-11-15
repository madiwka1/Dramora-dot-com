import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentUser, type User } from '../data'

export const useAuth = defineStore('auth', () => {
  const user = ref<User | null>(null)
  async function load() {
    user.value = await getCurrentUser()
  }
  return { user, load }
})
