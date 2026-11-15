<script setup lang="ts">
import { useCatalog } from '../stores/catalog'
import Icon from '../components/Icon.vue'
import { posterStyle } from '../components/poster'

const catalog = useCatalog()
</script>

<template>
  <!-- Vertical snap feed: one drama per screen. -->
  <main class="no-scrollbar h-[calc(100dvh-6.25rem)] snap-y snap-mandatory overflow-y-auto md:h-[calc(100dvh-4rem)] md:space-y-4 md:py-4">
    <article
      v-for="d in catalog.dramas"
      :key="d.id"
      :style="posterStyle(d)"
      class="relative mx-auto flex h-full max-w-md snap-center items-end overflow-hidden bg-cover bg-center md:h-[calc(100%-2rem)] md:rounded-2xl"
    >
      <RouterLink :to="`/watch/${d.slug}/1`" :aria-label="$t('common.watchNow')" class="absolute inset-0 grid place-items-center">
        <span class="grid size-16 place-items-center rounded-full bg-black/40 backdrop-blur"><Icon name="play" class="size-7" /></span>
      </RouterLink>
      <div class="relative w-full space-y-3 bg-linear-to-t from-black/90 via-black/50 to-transparent p-5 pt-24">
        <p class="text-xs tracking-widest text-accent-to uppercase">{{ d.genre }}</p>
        <h2 class="text-2xl font-extrabold">{{ d.title }}</h2>
        <p class="line-clamp-3 text-sm text-white/80">{{ d.synopsis }}</p>
        <div class="flex gap-3">
          <RouterLink :to="`/watch/${d.slug}/1`" class="btn-primary">{{ $t('common.watchNow') }}</RouterLink>
          <RouterLink v-if="d.isPlayable" :to="`/create?drama=${d.slug}`" class="btn-outline">{{ $t('common.playWithFriends') }}</RouterLink>
        </div>
      </div>
    </article>
  </main>
</template>
