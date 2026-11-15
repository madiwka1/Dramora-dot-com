<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { isDemo, isDemoPlayer } from '../data'
import { useAuth } from '../stores/auth'
import { useCatalog } from '../stores/catalog'
import { useConfig } from '../stores/config'
import { useRoom } from '../stores/room'
import Icon from '../components/Icon.vue'
import { posterStyle } from '../components/poster'

const route = useRoute()
const router = useRouter()
const { t, te } = useI18n()
const auth = useAuth()
const catalog = useCatalog()
const lobby = useRoom()
const { get } = useConfig()

const code = computed(() => String(route.params.code).toUpperCase())
watch(code, (c) => lobby.open(c), { immediate: true })
onUnmounted(() => lobby.close())

const name = ref(auth.user?.displayName ?? '')
const scenarios = computed(() => catalog.dramas.filter((d) => d.isPlayable))
const drama = computed(() => catalog.dramas.find((d) => d.id === lobby.room?.dramaId))
const members = computed(() => lobby.room?.members ?? [])
const takenBy = (cast: string) => members.value.find((m) => m.castName === cast)
const avatar = (seed: string, url: string | null = null) => posterStyle({ slug: seed, posterUrl: url })

const minPlayers = computed(() => get('room.min_players'))
const blocker = computed(() => {
  if (!drama.value) return t('room.needScenario')
  if (members.value.length < minPlayers.value) return t('room.needPlayers', { n: minPlayers.value })
  if (members.value.some((m) => !m.castName)) return t('room.needCharacters')
  return ''
})
const errorText = computed(() => {
  if (!lobby.error) return ''
  // Demo rooms live in one browser's storage, so another browser/incognito window can't find them.
  if (isDemo && lobby.error === 'room_not_found') return t('room.errors.demoOtherBrowser')
  return t(te(`room.errors.${lobby.error}`) ? `room.errors.${lobby.error}` : 'common.error')
})

const link = computed(() => `${import.meta.env.VITE_SITE_URL || location.origin}/room/${code.value}`)
const copied = ref(false)
async function copy() {
  await navigator.clipboard.writeText(link.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

// Host pressed Start → everyone in the lobby moves to the first episode. Only on the lobby → playing change,
// so coming Back to an already-started room shows the "started" bar instead of bouncing to the episode again.
const watchLink = computed(() => drama.value && `/play/${code.value}`)
watch(
  () => lobby.room?.status,
  (status, before) => {
    if (before === 'lobby' && status === 'playing' && watchLink.value) router.push(watchLink.value)
  },
)
</script>

<template>
  <main class="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
    <header>
      <p class="text-sm tracking-widest text-accent-to uppercase">{{ $t('room.lobby') }}</p>
      <h1 class="text-3xl font-black uppercase md:text-4xl">{{ $t('room.title', { code }) }}</h1>
    </header>

    <p v-if="errorText" role="alert" class="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{{ errorText }}</p>

    <!-- Not in the room yet: join with a name (no account needed) -->
    <form v-if="!lobby.loading && !lobby.joined" class="max-w-md space-y-4 rounded-2xl bg-surface p-6" @submit.prevent="lobby.join(name.trim())">
      <h2 class="text-xl font-bold">{{ $t('room.join.title') }}</h2>
      <p class="text-sm text-white/70">{{ $t('room.join.text') }}</p>
      <input
        v-model="name"
        required
        maxlength="24"
        :placeholder="$t('room.join.name')"
        :aria-label="$t('room.join.name')"
        class="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-sm"
      />
      <button class="btn-primary w-full" :disabled="lobby.busy || !name.trim()">{{ $t('room.join.cta') }}</button>
    </form>

    <template v-else-if="lobby.room">
      <section v-if="lobby.room.status !== 'lobby' && watchLink" class="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-accent/15 p-5">
        <p class="font-semibold">{{ $t('room.started', { title: drama?.title }) }}</p>
        <RouterLink :to="watchLink" class="btn-primary"><Icon name="play" class="size-4" />{{ $t('room.rejoin') }}</RouterLink>
      </section>
      <!-- Invite -->
      <section class="space-y-3 rounded-2xl border border-accent/30 bg-surface p-6">
        <h2 class="font-semibold">{{ $t('room.invite') }}</h2>
        <p class="text-sm text-white/70">{{ $t('room.inviteHint') }}</p>
        <div class="flex flex-col gap-3 sm:flex-row">
          <input :value="link" readonly :aria-label="$t('room.invite')" class="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-sm" />
          <button class="btn-primary" @click="copy">
            <Icon :name="copied ? 'check' : 'copy'" class="size-4" />{{ copied ? $t('invite.copied') : $t('invite.copy') }}
          </button>
        </div>
      </section>

      <!-- Players (live) -->
      <section class="space-y-3">
        <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('room.players') }}</h2>
        <ul class="flex flex-wrap gap-3">
          <li v-for="m in members" :key="m.memberId" class="flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
            <span class="grid size-10 place-items-center rounded-full bg-cover bg-center font-semibold" :style="avatar(m.castName ?? m.displayName)">
              {{ (m.castName ?? m.displayName).charAt(0) }}
            </span>
            <span class="text-sm">
              <span class="font-semibold">{{ m.displayName }}</span>
              <span v-if="m.memberId === lobby.me" class="text-white/50"> · {{ $t('room.you') }}</span>
              <span v-if="m.memberId === lobby.room.hostId" class="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-to">{{ $t('room.host') }}</span>
              <span class="block text-xs text-white/60">{{ m.castName ?? $t('room.choosing') }}</span>
            </span>
          </li>
          <li v-if="isDemo && lobby.isHost && lobby.room.status === 'lobby'">
            <button
              class="flex h-full items-center gap-2 rounded-xl border border-dashed border-white/25 px-4 py-3 text-sm text-white/70 transition hover:border-accent hover:text-white"
              :disabled="lobby.busy"
              @click="lobby.addDemoPlayer()"
            >
              <Icon name="invite" class="size-5" />{{ $t('room.addDemoPlayer') }}
            </button>
          </li>
        </ul>
      </section>

      <!-- Lobby only: scenario, characters, start -->
      <template v-if="lobby.room.status === 'lobby'">
      <!-- 1. Scenario -->
      <section class="space-y-3">
        <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('room.scenario.title') }}</h2>
        <p class="text-sm text-white/60">{{ $t('room.scenario.hint') }}</p>
        <div class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
          <button
            v-for="d in scenarios"
            :key="d.id"
            :aria-pressed="d.id === lobby.room.dramaId"
            :disabled="lobby.busy"
            class="space-y-2 text-left"
            @click="lobby.setDrama(d.id)"
          >
            <span
              class="relative block aspect-9/16 rounded-xl bg-surface-2 bg-cover bg-center ring-accent transition"
              :class="d.id === lobby.room.dramaId ? 'ring-4' : 'opacity-60 hover:opacity-100'"
              :style="posterStyle(d)"
            >
              <span v-if="d.id === lobby.room.dramaId" class="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-accent text-on-accent">
                <Icon name="check" class="size-4" />
              </span>
            </span>
            <span class="block text-sm font-semibold">{{ d.title }}</span>
            <span class="block text-xs text-white/60">{{ $t('home.playable.characters', { n: d.cast.length }) }}</span>
          </button>
        </div>
      </section>

      <!-- 2. Character -->
      <section class="space-y-3">
        <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('room.characters.title') }}</h2>
        <p v-if="!drama" class="text-sm text-white/60">{{ $t('room.characters.empty') }}</p>
        <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="c in drama.cast"
            :key="c.name"
            :aria-pressed="lobby.myCast === c.name"
            :disabled="lobby.busy || (!!takenBy(c.name) && lobby.myCast !== c.name && !isDemoPlayer(takenBy(c.name)!.memberId))"
            class="flex items-center gap-4 rounded-2xl bg-surface p-4 text-left ring-accent transition enabled:hover:bg-surface-2 disabled:opacity-50"
            :class="lobby.myCast === c.name && 'ring-2'"
            @click="lobby.pick(c.name)"
          >
            <span class="grid size-14 shrink-0 place-items-center rounded-full bg-cover bg-center text-xl font-bold" :style="avatar(c.name, c.avatarUrl)">
              {{ c.avatarUrl ? '' : c.name.charAt(0) }}
            </span>
            <span class="min-w-0">
              <span class="block font-semibold">{{ c.name }}</span>
              <span class="block text-sm text-white/60">{{ c.role }}</span>
              <span v-if="lobby.myCast === c.name" class="block text-xs text-accent-to">{{ $t('room.characters.yours') }}</span>
              <span v-else-if="takenBy(c.name)" class="block text-xs text-white/50">
                {{ $t('room.characters.takenBy', { name: takenBy(c.name)?.displayName }) }}
              </span>
            </span>
          </button>
        </div>
      </section>

      <!-- Start -->
      <section class="flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
        <button v-if="lobby.isHost" class="btn-primary" :disabled="lobby.busy || !!blocker" @click="lobby.start()">
          <Icon name="play" class="size-4" />{{ $t('room.start') }}
        </button>
        <p class="text-sm text-white/60">{{ lobby.isHost ? blocker : $t('room.waitingHost') }}</p>
      </section>
      </template>
    </template>
  </main>
</template>
