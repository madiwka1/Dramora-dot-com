<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLogo from './AppLogo.vue'
import Icon from './Icon.vue'
import ProfileMenu from './ProfileMenu.vue'

const route = useRoute()
const router = useRouter()

const q = ref('')
watch(() => route.query.q, (v) => (q.value = String(v ?? '')), { immediate: true })

// Live search: results update as you type (debounced); clearing the box (incl. the native ×) clears results.
function search() {
  const term = q.value.trim()
  if (term === String(route.query.q ?? '')) return
  if (!term && route.path !== '/') return
  const go = route.path === '/' ? router.replace : router.push
  go({ path: '/', query: term ? { q: term } : {} })
}
let timer: number | undefined
watch(q, () => {
  clearTimeout(timer)
  timer = window.setTimeout(search, 250)
})

const playableOnly = computed(() => route.query.playable === '1')
const items = computed(() => [
  { to: '/', icon: 'home', label: 'nav.home', active: route.path === '/' && !playableOnly.value },
  { to: { path: '/', query: { playable: '1' } }, icon: 'play', label: 'nav.playable', active: playableOnly.value },
  { to: '/feed', icon: 'feed', label: 'nav.feed', active: route.path === '/feed' },
  { to: '/create', icon: 'users', label: 'nav.create', active: route.path === '/create' },
  { to: '/invite', icon: 'invite', label: 'nav.invite', active: route.path === '/invite' },
])
</script>

<template>
  <header class="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-bg/80 backdrop-blur">
    <div class="flex h-16 items-center gap-6 px-4 md:px-6">
      <RouterLink to="/" :aria-label="$t('app.name')"><AppLogo /></RouterLink>

      <nav :aria-label="$t('nav.menu')" class="hidden flex-1 items-center gap-6 text-sm md:flex">
        <RouterLink
          v-for="i in items"
          :key="i.label"
          :to="i.to"
          :aria-current="i.active ? 'page' : undefined"
          class="flex items-center gap-1.5 border-b-2 py-5 transition"
          :class="i.active ? 'border-accent text-white' : 'border-transparent text-white/60 hover:text-white'"
        >
          <Icon :name="i.icon" class="size-4" />{{ $t(i.label) }}
        </RouterLink>
      </nav>

      <form role="search" class="ml-auto hidden lg:ml-0 lg:block" @submit.prevent="search">
        <label class="flex items-center gap-2 rounded-full border border-white/30 px-4 py-1.5 focus-within:border-accent">
          <input
            v-model="q"
            type="search"
            :placeholder="$t('nav.search')"
            :aria-label="$t('nav.search')"
            class="w-40 bg-transparent text-sm outline-none placeholder:text-white/50"
          />
          <Icon name="search" class="size-4 text-white/60" />
        </label>
      </form>

      <ProfileMenu class="ml-auto lg:ml-0" />
    </div>

    <!-- Phones: same links as a scrollable strip under the top row. -->
    <nav :aria-label="$t('nav.menu')" class="no-scrollbar flex gap-5 overflow-x-auto px-4 text-sm md:hidden">
      <RouterLink
        v-for="i in items"
        :key="i.label"
        :to="i.to"
        :aria-current="i.active ? 'page' : undefined"
        class="flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 transition"
        :class="i.active ? 'border-accent text-white' : 'border-transparent text-white/60'"
      >
        <Icon :name="i.icon" class="size-4" />{{ $t(i.label) }}
      </RouterLink>
    </nav>
  </header>
</template>
