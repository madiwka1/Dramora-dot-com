<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { Drama } from '../data'
import { useCatalog } from '../stores/catalog'
import { useConfig } from '../stores/config'
import Icon from '../components/Icon.vue'
import PosterCard from '../components/PosterCard.vue'
import PosterRow from '../components/PosterRow.vue'
import { posterStyle } from '../components/poster'

const DAY_MS = 86_400_000
const route = useRoute()
const catalog = useCatalog()
const { get } = useConfig()

const q = computed(() => String(route.query.q ?? '').trim().toLowerCase())
const genre = computed(() => route.query.genre as string | undefined)
const onlyPlayable = computed(() => route.query.playable === '1')
const filtering = computed(() => !!q.value || !!genre.value || onlyPlayable.value)
const results = computed(() =>
  catalog.dramas.filter(
    (d) =>
      (!genre.value || d.genre === genre.value) &&
      (!onlyPlayable.value || d.isPlayable) &&
      (!q.value || [d.title, d.genre, ...d.tags].some((s) => s.toLowerCase().includes(q.value))),
  ),
)
const playable = computed(() => catalog.dramas.filter((d) => d.isPlayable))

const top = computed(() => [...catalog.dramas].sort((a, b) => b.popularity - a.popularity).slice(0, get('home.top_count')))
// Hero carousel: every drama with wide key art, most popular first (falls back to the top drama).
const heroes = computed(() => {
  const wide = top.value.filter((d) => d.backdropUrl)
  return wide.length ? wide : top.value.slice(0, 1)
})
const track = ref<HTMLElement>()
const current = ref(0)
function go(i: number) {
  track.value?.scrollTo({ left: i * track.value.clientWidth, behavior: 'smooth' })
}
function onScroll() {
  if (track.value) current.value = Math.round(track.value.scrollLeft / track.value.clientWidth)
}
let timer: number | undefined
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = window.setInterval(() => {
    if (heroes.value.length > 1) go((current.value + 1) % heroes.value.length)
  }, get('home.hero_rotate_seconds') * 1000)
})
onUnmounted(() => clearInterval(timer))
const isNew = (d: Drama) => Date.now() - Date.parse(d.createdAt) < get('catalog.new_days') * DAY_MS

const tab = ref<string>()
const activeGenre = computed(() => tab.value ?? catalog.genres[0])
</script>

<template>
  <main class="space-y-12 pb-12">
    <!-- Hero carousel -->
    <section v-if="heroes.length && !filtering" class="relative" aria-roledescription="carousel">
      <div ref="track" class="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" @scroll.passive="onScroll">
        <div
          v-for="(hero, i) in heroes"
          :key="hero.id"
          :aria-label="hero.title"
          aria-roledescription="slide"
          class="relative flex min-h-[70vh] w-full shrink-0 snap-start items-end bg-cover"
          :class="hero.backdropUrl ? 'bg-top' : 'bg-center'"
          :style="posterStyle({ slug: hero.slug, posterUrl: hero.backdropUrl ?? hero.posterUrl })"
        >
          <div class="absolute inset-0 bg-linear-to-r from-bg via-bg/60 to-transparent" />
          <div class="absolute inset-0 bg-linear-to-t from-bg via-transparent to-transparent" />
          <div class="relative max-w-2xl space-y-5 p-4 pb-14 md:p-12 md:pb-16">
            <p class="text-sm tracking-widest text-accent-to uppercase">{{ hero.genre }}</p>
            <!-- Wide key art has the title built in (anchored to the top), so ours is for screen readers only. -->
            <component
              :is="i === 0 ? 'h1' : 'h2'"
              :class="hero.backdropUrl ? 'sr-only' : 'text-5xl leading-[0.9] font-black tracking-tight uppercase md:text-8xl'"
            >
              {{ hero.title }}
            </component>
            <p class="max-w-lg text-white/80 md:text-lg">{{ hero.synopsis }}</p>
            <div class="flex flex-wrap gap-3">
              <RouterLink :to="`/watch/${hero.slug}/1`" class="btn-primary"><Icon name="play" class="size-4" />{{ $t('common.watchNow') }}</RouterLink>
              <RouterLink v-if="hero.isPlayable" :to="`/create?drama=${hero.slug}`" class="btn-outline">{{ $t('common.playWithFriends') }}</RouterLink>
            </div>
          </div>
        </div>
      </div>
      <div v-if="heroes.length > 1" class="absolute bottom-5 left-4 flex gap-2 md:left-12">
        <button
          v-for="(hero, i) in heroes"
          :key="hero.id"
          :aria-label="hero.title"
          :aria-current="i === current"
          class="h-1.5 rounded-full transition-all"
          :class="i === current ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/70'"
          @click="go(i)"
        />
      </div>
    </section>

    <!-- Search / genre results -->
    <section v-if="filtering" class="space-y-4 px-4 pt-8 md:px-8">
      <h1 class="border-l-2 border-accent pl-3 text-xl font-bold tracking-wide uppercase">{{ genre ?? (onlyPlayable ? $t('home.playable.title') : $t('home.results')) }}</h1>
      <p v-if="onlyPlayable" class="text-white/70">{{ $t('home.playable.text') }}</p>
      <p v-if="!results.length" class="text-white/60">{{ $t('home.noResults') }}</p>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
        <PosterCard v-for="d in results" :key="d.id" :drama="d" :is-new="isNew(d)" size="fluid" />
      </div>
    </section>

    <template v-else>
      <PosterRow v-if="playable.length" :title="$t('home.playable.title')">
        <template #action>
          <RouterLink :to="{ path: '/', query: { playable: '1' } }" class="flex items-center gap-1 text-sm text-accent-to hover:underline">
            {{ $t('common.viewAll') }}<Icon name="arrowRight" class="size-4" />
          </RouterLink>
        </template>
        <div v-for="d in playable" :key="d.id" class="w-36 shrink-0 snap-start space-y-2 md:w-44">
          <PosterCard :drama="d" size="fluid" />
          <p class="text-xs text-white/60">{{ $t('home.playable.characters', { n: d.cast.length }) }}</p>
          <p class="truncate text-sm">{{ d.cast.map((c) => c.name).join(' · ') }}</p>
        </div>
      </PosterRow>

      <PosterRow :title="$t('home.justReleased')">
        <PosterCard v-for="d in catalog.dramas" :key="d.id" :drama="d" :is-new="isNew(d)" />
      </PosterRow>

      <PosterRow :title="$t('home.top', { n: get('home.top_count') })">
        <div v-for="(d, i) in top" :key="d.id" class="flex shrink-0 snap-start items-end">
          <span
            aria-hidden="true"
            class="-mr-4 text-[7rem] leading-none font-black text-transparent select-none [-webkit-text-stroke:2px_rgb(255_255_255/0.3)] md:text-[9rem]"
          >{{ i + 1 }}</span>
          <PosterCard :drama="d" size="small" />
        </div>
      </PosterRow>

      <!-- Featured banner -->
      <section class="px-4 md:px-8">
        <div class="rounded-2xl border border-white/10 bg-surface p-8 md:p-12">
          <div class="max-w-lg space-y-4">
            <span class="block h-1 w-14 bg-accent" aria-hidden="true" />
            <h2 class="text-3xl leading-tight font-black uppercase md:text-5xl">{{ $t('home.banner.title') }}</h2>
            <p class="text-white/80">{{ $t('home.banner.text') }}</p>
            <RouterLink to="/create" class="btn-primary"><Icon name="users" class="size-4" />{{ $t('home.banner.cta') }}</RouterLink>
          </div>
        </div>
      </section>

      <!-- Category tabs -->
      <section class="space-y-4 px-4 md:px-8">
        <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase md:text-xl">{{ $t('home.categories') }}</h2>
        <div role="tablist" class="no-scrollbar flex gap-6 overflow-x-auto border-b border-white/10">
          <button
            v-for="g in catalog.genres"
            :key="g"
            role="tab"
            :aria-selected="g === activeGenre"
            class="-mb-px border-b-2 pb-3 text-sm font-semibold tracking-wide whitespace-nowrap uppercase transition"
            :class="g === activeGenre ? 'border-accent text-white' : 'border-transparent text-white/50 hover:text-white'"
            @click="tab = g"
          >
            {{ g }}
          </button>
        </div>
        <div role="tabpanel" class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4 pt-2">
          <PosterCard v-for="d in catalog.dramas.filter((x) => x.genre === activeGenre)" :key="d.id" :drama="d" size="fluid" />
        </div>
      </section>
    </template>
  </main>
</template>
