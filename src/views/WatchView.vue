<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEpisodeVideoUrl, listEpisodes, type Episode } from '../data'
import { usePaywall } from '../composables/usePaywall'
import { useAuth } from '../stores/auth'
import { useCatalog } from '../stores/catalog'
import { useConfig } from '../stores/config'
import { useTokens } from '../stores/tokens'
import { useWatchTime } from '../composables/useWatchTime'
import { useSettings } from '../composables/useSettings'
import Icon from '../components/Icon.vue'
import { posterStyle } from '../components/poster'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const tokens = useTokens()
const catalog = useCatalog()
const { get } = useConfig()
const watchTime = useWatchTime()
const { settings } = useSettings()

const drama = computed(() => catalog.dramas.find((d) => d.slug === route.params.slug))
const number = computed(() => Number(route.params.episode))
const episodes = ref<Episode[]>([])
const grid = computed(() => episodes.value.filter((e) => !e.isBranch))
const episode = computed(() => grid.value.find((e) => e.number === number.value))

watch(drama, async (d) => (episodes.value = d ? await listEpisodes(d.id) : []), { immediate: true })

// Paywall: episodes after paywall.free_episodes need Dramora Plus or a token unlock. The server re-checks in episode_video_url().
const paywall = usePaywall()
const freeCount = computed(() => get('paywall.free_episodes'))
const unlockCost = computed(() => get('tokens.cost_unlock_episode'))
const isLocked = (e: Episode) =>
  !auth.user?.isSubscriber && !e.isFree && e.number > freeCount.value && !tokens.unlocked.has(e.id)

// Player
const video = ref<HTMLVideoElement>()
const videoUrl = ref<string | null>(null)
const progress = ref(0)
const plotOpen = ref(false)
let lastTime = 0

watch(
  [episode, () => episode.value && isLocked(episode.value)],
  async ([e]) => {
    videoUrl.value = null
    progress.value = 0
    lastTime = 0
    plotOpen.value = false
    if (e && !isLocked(e)) videoUrl.value = await getEpisodeVideoUrl(e.id)
  },
  { immediate: true },
)

function togglePlay() {
  if (!video.value) return
  if (video.value.paused) video.value.play()
  else video.value.pause()
}
function onTime() {
  const v = video.value
  if (!v) return
  progress.value = v.duration ? v.currentTime / v.duration : 0
  const delta = v.currentTime - lastTime
  if (delta > 0 && delta < 2) watchTime.add(delta) // ignore seeks
  lastTime = v.currentTime
}
function next() {
  if (!settings.autoplayNext) return
  const n = grid.value.find((e) => e.number === number.value + 1)
  if (n && drama.value) router.push(`/watch/${drama.value.slug}/${n.number}`)
}

const back = () => (window.history.state?.back ? router.back() : router.push('/'))

const busy = ref(false)
const failed = ref(false)
async function unlockWithTokens() {
  if (!episode.value) return
  if (tokens.balance < unlockCost.value) return paywall.open('tokens')
  busy.value = true
  failed.value = false
  try {
    await tokens.unlock(episode.value.id)
  } catch (e) {
    console.error(e)
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main v-if="drama" class="relative flex flex-col bg-black lg:h-[calc(100dvh-4rem)] lg:flex-row">
    <button
      :aria-label="$t('watch.back')"
      class="absolute top-4 left-4 z-10 grid size-12 place-items-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20"
      @click="back"
    >
      <Icon name="arrowLeft" class="size-6" />
    </button>

    <!-- Player -->
    <section class="flex flex-1 justify-center lg:h-full">
      <div class="relative aspect-9/16 w-full max-w-md bg-surface-2 bg-cover bg-center lg:h-full lg:w-auto lg:max-w-none" :style="posterStyle(drama)">
        <video
          v-if="videoUrl"
          ref="video"
          :src="videoUrl"
          :poster="drama.posterUrl ?? undefined"
          autoplay
          playsinline
          preload="auto"
          class="absolute inset-0 size-full object-cover"
          @click="togglePlay"
          @timeupdate="onTime"
          @ended="next"
        />
        <div v-if="videoUrl" class="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <div class="h-full bg-accent" :style="{ width: `${progress * 100}%` }" />
        </div>

        <!-- Paywall -->
        <div v-else-if="episode && isLocked(episode)" class="absolute inset-0 grid place-items-center bg-black/75 p-6 text-center backdrop-blur-sm">
          <div class="max-w-xs space-y-4">
            <span class="mx-auto grid size-14 place-items-center rounded-full bg-accent/20 text-accent-to"><Icon name="lock" class="size-7" /></span>
            <h2 class="text-2xl font-black uppercase">{{ $t('watch.paywall.title', { n: episode.number }) }}</h2>
            <p class="text-sm text-white/70">{{ $t('watch.paywall.text') }}</p>
            <button v-if="auth.user" class="btn-primary w-full" :disabled="busy" @click="unlockWithTokens">
              <Icon name="coin" class="size-4" />
              {{ tokens.balance >= unlockCost ? $t('watch.paywall.unlock', { n: unlockCost }) : $t('watch.paywall.getTokens') }}
            </button>
            <button class="btn-outline w-full" @click="paywall.open('plus')"><Icon name="crown" class="size-4" />{{ $t('watch.paywall.plus') }}</button>
            <p v-if="auth.user" class="text-xs text-white/60">{{ $t('watch.paywall.balance', { n: tokens.balance }) }}</p>
            <p v-if="failed" role="alert" class="text-xs text-red-400">{{ $t('common.error') }}</p>
          </div>
        </div>

        <!-- No video file yet -->
        <div v-else class="absolute inset-0 grid place-items-center bg-black/50 p-6 text-center">
          <div class="space-y-3">
            <span class="mx-auto grid size-16 place-items-center rounded-full bg-black/50 backdrop-blur"><Icon name="play" class="size-7 opacity-60" /></span>
            <p class="text-sm text-white/80">{{ episode ? $t('watch.comingSoon') : $t('watch.notFound') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Details -->
    <aside class="space-y-6 p-4 md:p-6 lg:w-[28rem] lg:shrink-0 lg:overflow-y-auto">
      <nav :aria-label="$t('watch.breadcrumb')" class="flex min-w-0 items-center gap-2 text-sm text-white/60">
        <RouterLink to="/" class="hover:text-white">{{ $t('nav.home') }}</RouterLink>
        <span>/</span>
        <span class="truncate">{{ drama.title }}</span>
        <span>/</span>
        <span class="shrink-0 text-white">{{ $t('watch.episode', { n: number }) }}</span>
      </nav>

      <h1 class="text-2xl leading-tight font-extrabold">{{ $t('watch.title', { n: number, title: drama.title }) }}</h1>

      <section v-if="episode" class="space-y-2">
        <h2 class="font-semibold">{{ $t('watch.plot', { n: number }) }}</h2>
        <p class="text-white/70" :class="!plotOpen && 'line-clamp-3'">
          <span class="font-semibold text-white">{{ episode.title }}.</span> {{ episode.synopsis }} {{ drama.synopsis }}
        </p>
        <button class="text-sm font-medium hover:underline" @click="plotOpen = !plotOpen">
          {{ plotOpen ? $t('watch.less') : $t('watch.more') }}
        </button>
      </section>

      <ul v-if="drama.tags.length" class="flex flex-wrap gap-2">
        <li v-for="tag in drama.tags" :key="tag" class="rounded-full bg-white/10 px-4 py-1.5 text-sm">{{ tag }}</li>
      </ul>

      <RouterLink v-if="drama.isPlayable" :to="`/create?drama=${drama.slug}`" class="btn-outline w-full">
        <Icon name="users" class="size-4" />{{ $t('common.playWithFriends') }}
      </RouterLink>

      <section class="space-y-3 border-t border-white/10 pt-6">
        <h2 class="flex items-baseline justify-between font-semibold">
          {{ $t('watch.episodes') }}
          <span class="text-sm font-normal text-white/60">{{ $t('watch.count', { n: grid.length }) }}</span>
        </h2>
        <ol class="grid grid-cols-5 gap-2 sm:grid-cols-6">
          <li v-for="e in grid" :key="e.id">
            <RouterLink
              :to="`/watch/${drama.slug}/${e.number}`"
              :aria-label="$t('watch.episode', { n: e.number }) + (isLocked(e) ? ` (${$t('watch.locked')})` : '')"
              :aria-current="e.number === number ? 'page' : undefined"
              class="relative grid h-12 place-items-center rounded-lg font-medium transition"
              :class="e.number === number ? 'bg-accent font-bold text-on-accent' : 'bg-surface-2 text-white/80 hover:bg-white/10'"
            >
              {{ e.number }}
              <Icon v-if="isLocked(e)" name="lock" class="absolute top-1 right-1 size-3.5 rounded bg-white/10 p-0.5 text-white/70" />
              <Icon v-if="e.number === number" name="bars" class="absolute right-1 bottom-1 size-3.5 text-on-accent" />
            </RouterLink>
          </li>
        </ol>
      </section>
    </aside>
  </main>

  <main v-else class="grid min-h-[60vh] place-items-center p-6 text-center">
    <div class="space-y-4">
      <p class="text-white/70">{{ $t('watch.notFound') }}</p>
      <RouterLink to="/" class="btn-outline">{{ $t('common.backHome') }}</RouterLink>
    </div>
  </main>
</template>
