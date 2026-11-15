<script setup lang="ts">
import { ref } from 'vue'
import type { Drama } from '../data'
import { posterStyle } from './poster'
import Icon from './Icon.vue'
import { useSettings } from '../composables/useSettings'

const { size = 'row' } = defineProps<{ drama: Drama; isNew?: boolean; size?: 'row' | 'small' | 'fluid' }>()
const sizes = { row: 'w-36 shrink-0 snap-start md:w-44', small: 'w-24 shrink-0 md:w-28', fluid: 'w-full' }

// Hover preview: a short muted clip that loads only when hovered, and never plays for reduced-motion users.
const video = ref<HTMLVideoElement>()
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const { settings } = useSettings()
function preview(play: boolean) {
  const v = video.value
  if (!v) return
  if (!play) return v.pause()
  v.currentTime = 0
  v.play().catch(() => {}) // ignore autoplay refusals
}
</script>

<template>
  <RouterLink
    :to="`/drama/${drama.slug}`"
    :style="posterStyle(drama)"
    :class="sizes[size]"
    @mouseenter="preview(true)"
    @mouseleave="preview(false)"
    @focus="preview(true)"
    @blur="preview(false)"
    class="group relative block aspect-9/16 overflow-hidden rounded-xl bg-surface-2 bg-cover bg-center ring-white/20 transition duration-300 hover:scale-[1.04] hover:ring-2 focus-visible:ring-2"
  >
    <video
      v-if="drama.previewUrl && !reducedMotion && settings.hoverPreviews"
      ref="video"
      :src="drama.previewUrl"
      muted
      loop
      playsinline
      preload="none"
      aria-hidden="true"
      class="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
    />
    <span v-if="isNew" class="absolute top-0 left-0 rounded-br-lg bg-accent px-2.5 py-1 text-xs font-bold text-on-accent">
      {{ $t('home.badgeNew') }}
    </span>
    <span
      v-if="drama.isPlayable"
      :title="$t('home.badgePlayable')"
      class="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium backdrop-blur
        transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0"
    >
      <Icon name="users" class="size-3.5 text-accent-to" /><span :class="size === 'small' && 'sr-only'">{{ $t('home.badgePlayable') }}</span>
    </span>
    <!-- Real posters carry their own title art, so their name only appears on hover/focus. -->
    <span
      class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/60 to-transparent p-3 pt-12 text-sm leading-tight font-semibold transition-opacity duration-300"
      :class="drama.posterUrl && 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'"
    >
      {{ drama.title }}
    </span>
  </RouterLink>
</template>
