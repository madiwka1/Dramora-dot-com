<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { chooserId, isDemoPlayer, listEpisodes, type Episode } from '../data'
import { useCatalog } from '../stores/catalog'
import { useConfig } from '../stores/config'
import { useRoom } from '../stores/room'
import { posterStyle } from '../components/poster'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const catalog = useCatalog()
const lobby = useRoom()
const { get } = useConfig()

const code = computed(() => String(route.params.code).toUpperCase())
watch(code, (c) => lobby.open(c), { immediate: true })
onUnmounted(() => lobby.close())

const room = computed(() => lobby.room)
const drama = computed(() => catalog.dramas.find((d) => d.id === room.value?.dramaId))
const episodes = ref<Episode[]>([])
watch(drama, async (d) => (episodes.value = d ? await listEpisodes(d.id) : []), { immediate: true })

// Not in this room, or it hasn't started → back to the lobby.
watch(
  () => [lobby.loading, lobby.joined, room.value?.status] as const,
  ([loading, joined, status]) => {
    if (!loading && (!joined || status === 'lobby')) router.replace(`/room/${code.value}`)
  },
)

const episode = computed(() => episodes.value.find((e) => e.id === room.value?.currentEpisodeId))
const totalEpisodes = computed(() => episodes.value.filter((e) => !e.isBranch).length)
const member = (id: string | null) => room.value?.members.find((m) => m.memberId === id)
const chooser = computed(() => (room.value && episode.value ? member(chooserId(room.value.members, episode.value.number)) : undefined))
const myTurn = computed(() => room.value?.status === 'voting' && chooser.value?.memberId === lobby.me)

// Clock: phases are timed from the server's phase_started_at.
const now = ref(Date.now())
const tick = setInterval(() => (now.value = Date.now()), 250)
onUnmounted(() => clearInterval(tick))
const phaseLength = computed(() => get(room.value?.status === 'voting' ? 'play.choice_seconds' : 'play.episode_seconds'))
const elapsed = computed(() => (room.value?.phaseStartedAt ? (now.value - Date.parse(room.value.phaseStartedAt)) / 1000 : 0))
const remaining = computed(() => Math.max(0, Math.ceil(phaseLength.value - elapsed.value)))
const progress = computed(() => Math.min(1, elapsed.value / phaseLength.value))

// When a timer runs out (or a demo player is "thinking"), nudge the server about once a second.
let lastNudge = 0
watch(now, () => {
  const status = room.value?.status
  if (status !== 'playing' && status !== 'voting') return
  const due = elapsed.value >= phaseLength.value || (status === 'voting' && !!chooser.value && isDemoPlayer(chooser.value.memberId))
  if (due && now.value - lastNudge > 1000) {
    lastNudge = now.value
    lobby.advance()
  }
})

// Notifications: "your turn" + who chose what.
const toast = ref('')
let toastTimer: number | undefined
function notify(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 3500)
}
const baseTitle = document.title
watch(myTurn, (mine) => {
  document.title = mine ? t('play.yourTurnTitle') : baseTitle
  if (!mine) return
  notify(t('play.yourTurnToast'))
  navigator.vibrate?.(200)
})
onUnmounted(() => (document.title = baseTitle))

const choiceLabel = (choiceId: string) => episodes.value.flatMap((e) => e.choices).find((c) => c.id === choiceId)?.label ?? ''
const story = computed(() =>
  (room.value?.votes ?? []).map((v) => ({
    ...v,
    number: episodes.value.find((e) => e.id === v.episodeId)?.number ?? 0,
    who: member(v.memberId),
    label: choiceLabel(v.choiceId),
  })),
)
watch(
  () => story.value.length,
  (n, before) => {
    const last = story.value[n - 1]
    if (before !== undefined && n > before && last) notify(t('play.chose', { name: last.who?.displayName ?? '', choice: last.label }))
  },
)

// The clip of the option that led to this episode replaces the stage; without one, the poster plays.
const stageEl = ref<HTMLVideoElement>()
const failedVideo = ref('')
const stageVideo = computed(() => {
  const vote = room.value?.votes.at(-1)
  const choice = vote && episodes.value.flatMap((e) => e.choices).find((c) => c.id === vote.choiceId)
  const url = choice && choice.nextEpisodeId === room.value?.currentEpisodeId ? choice.videoUrl : null
  return url && url !== failedVideo.value ? url : null
})
// Try with sound; browsers block unmuted autoplay without a tap, so fall back to muted.
watch(stageEl, (v) => v?.play().catch(() => ((v.muted = true), v.play().catch(() => {}))))

const fmt = (s: number) => `0:${String(s).padStart(2, '0')}`
const avatar = (seed: string) => posterStyle({ slug: seed, posterUrl: null })
</script>

<template>
  <main v-if="room && drama" class="mx-auto grid max-w-6xl gap-6 p-4 md:p-6 lg:grid-cols-[1fr_20rem]">
    <!-- Stage: the "fake video" -->
    <section class="relative mx-auto aspect-9/16 w-full max-w-md overflow-hidden rounded-2xl bg-black lg:h-[calc(100dvh-7rem)] lg:w-auto lg:max-w-none">
      <template v-if="episode">
        <video
          v-if="stageVideo"
          :key="stageVideo"
          ref="stageEl"
          :src="stageVideo"
          autoplay
          playsinline
          class="absolute inset-0 size-full object-cover"
          @error="failedVideo = stageVideo"
        />
        <div v-else :key="`p-${episode.id}`" class="absolute inset-0 animate-kenburns bg-cover bg-center" :style="posterStyle(drama)" />
      </template>
      <div class="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/90" />

      <!-- HUD -->
      <div class="absolute inset-x-0 top-0 h-1 bg-white/15">
        <div class="h-full bg-accent transition-[width] duration-300 ease-linear" :style="{ width: `${progress * 100}%` }" />
      </div>
      <div v-if="episode" class="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
        <div>
          <p class="text-xs tracking-widest text-accent-to uppercase">{{ $t('play.episode', { n: episode.number, total: totalEpisodes }) }}</p>
          <p class="font-bold">{{ episode.title }}</p>
        </div>
        <span v-if="room.status !== 'ended'" class="rounded-full bg-black/60 px-3 py-1 font-mono text-sm backdrop-blur">{{ fmt(remaining) }}</span>
      </div>
      <p v-if="episode && room.status === 'playing'" class="absolute inset-x-4 bottom-5 text-center text-sm leading-snug text-white/90 drop-shadow">
        {{ episode.synopsis }}
      </p>

      <!-- Choice phase -->
      <div v-if="room.status === 'voting' && episode" class="absolute inset-0 flex flex-col justify-end gap-3 bg-black/55 p-4 backdrop-blur-[2px]">
        <div class="text-center">
          <p class="text-5xl font-black tabular-nums" :class="remaining <= 2 && 'text-red-400'">{{ remaining }}</p>
          <p class="text-xl font-black uppercase">{{ myTurn ? $t('play.yourMove') : $t('play.choosing', { name: chooser?.displayName }) }}</p>
          <p v-if="chooser?.castName" class="text-sm text-white/70">{{ $t('play.as', { character: chooser.castName }) }}</p>
        </div>
        <button
          v-for="(c, i) in episode.choices"
          :key="c.id"
          :disabled="!myTurn || lobby.busy"
          class="flex items-center gap-3 rounded-xl border-2 border-white/15 bg-black/60 p-4 text-left font-semibold transition enabled:hover:border-accent enabled:hover:bg-accent/20 disabled:opacity-60"
          @click="lobby.choose(c.id)"
        >
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent">{{ 'ABC'[i] }}</span>{{ c.label }}
        </button>
      </div>

      <!-- Finale -->
      <div v-if="room.status === 'ended'" class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 p-6 text-center">
        <p class="text-5xl font-black uppercase">{{ $t('play.theEnd') }}</p>
        <p class="text-white/80">{{ $t('play.theEndText', { title: drama.title }) }}</p>
        <div class="flex flex-wrap justify-center gap-3">
          <RouterLink :to="`/create?drama=${drama.slug}`" class="btn-primary">{{ $t('play.playAgain') }}</RouterLink>
          <RouterLink to="/" class="btn-outline">{{ $t('play.home') }}</RouterLink>
        </div>
      </div>
    </section>

    <!-- Side panel -->
    <aside class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-white/60">{{ $t('play.room', { code }) }}</p>
          <h1 class="text-xl font-black uppercase">{{ drama.title }}</h1>
        </div>
        <RouterLink to="/" class="text-sm text-white/60 hover:text-white">{{ $t('play.leave') }}</RouterLink>
      </div>

      <section class="space-y-2">
        <h2 class="border-l-2 border-accent pl-3 text-sm font-bold tracking-wide uppercase">{{ $t('play.players') }}</h2>
        <ul class="space-y-2">
          <li
            v-for="m in room.members"
            :key="m.memberId"
            class="flex items-center gap-3 rounded-xl bg-surface p-3 ring-accent transition"
            :class="room.status === 'voting' && m.memberId === chooser?.memberId && 'ring-2'"
          >
            <span class="grid size-10 place-items-center rounded-full font-semibold" :style="avatar(m.castName ?? m.displayName)">
              {{ (m.castName ?? m.displayName).charAt(0) }}
            </span>
            <span class="min-w-0 flex-1 text-sm">
              <span class="font-semibold">{{ m.displayName }}</span>
              <span v-if="m.memberId === lobby.me" class="text-white/50"> · {{ $t('play.you') }}</span>
              <span class="block text-xs text-white/60">{{ m.castName }}</span>
            </span>
            <span v-if="room.status === 'voting' && m.memberId === chooser?.memberId" class="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">
              {{ $t('play.turn') }}
            </span>
            <span v-else-if="room.status === 'playing' && m.memberId === chooser?.memberId" class="text-xs text-accent-to">
              {{ $t('play.next') }}
            </span>
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="border-l-2 border-accent pl-3 text-sm font-bold tracking-wide uppercase">{{ $t('play.story') }}</h2>
        <p v-if="!story.length" class="text-sm text-white/50">{{ $t('play.storyEmpty') }}</p>
        <ol class="space-y-2">
          <li v-for="(s, i) in story" :key="i" class="rounded-xl bg-surface p-3 text-sm">
            <span class="block text-xs text-white/50">{{ $t('play.storyItem', { n: s.number, name: s.who?.displayName ?? '' }) }}</span>
            {{ s.label }}
          </li>
        </ol>
      </section>
    </aside>

    <!-- Toast -->
    <Transition enter-from-class="opacity-0 -translate-y-2" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
      <div v-if="toast" role="status" class="fixed top-28 left-1/2 z-50 -translate-x-1/2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-on-accent shadow-2xl md:top-20">
        {{ toast }}
      </div>
    </Transition>
  </main>
</template>
