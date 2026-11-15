<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { createRoom } from '../data'
import { usePaywall } from '../composables/usePaywall'
import { useAuth } from '../stores/auth'
import { useCatalog } from '../stores/catalog'
import { useConfig } from '../stores/config'
import Icon from '../components/Icon.vue'
import { posterStyle } from '../components/poster'

const { get } = useConfig()
const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuth()
const paywall = usePaywall()
const catalog = useCatalog()

// Scenario can be picked here (optional); "Play with friends" links preselect it with ?drama=slug.
const scenarios = computed(() => catalog.dramas.filter((d) => d.isPlayable))
const selectedId = ref(catalog.dramas.find((d) => d.slug === route.query.drama && d.isPlayable)?.id ?? null)
const selected = computed(() => scenarios.value.find((d) => d.id === selectedId.value))
const toggle = (id: string) => (selectedId.value = selectedId.value === id ? null : id)

const busy = ref(false)
const error = ref('')

async function startRoom() {
  if (!auth.user) return
  if (!auth.user.isSubscriber) return paywall.open('plus') // hosting rooms is a Dramora Plus feature
  busy.value = true
  error.value = ''
  try {
    const code = await createRoom(auth.user.displayName, selectedId.value)
    router.push(`/room/${code}`)
  } catch (e) {
    console.error(e)
    const code = e instanceof Error ? e.message : ''
    error.value = t(te(`room.errors.${code}`) ? `room.errors.${code}` : 'common.error')
  } finally {
    busy.value = false
  }
}

// Prompt composer (generation is not live yet; the draft stays on this page).
const prompt = ref('')
const genre = ref<string>()
const label = 'text-[11px] tracking-[0.14em] uppercase'
</script>

<template>
  <main class="mx-auto max-w-5xl space-y-16 px-4 py-10 md:px-8 md:py-14">
    <header class="max-w-3xl space-y-4">
      <p class="flex items-center gap-2 text-accent" :class="label"><Icon name="sparkles" class="size-4" />{{ $t('create.eyebrow') }}</p>
      <h1 class="text-4xl leading-[0.95] font-black tracking-tight md:text-6xl">{{ $t('create.title') }}</h1>
      <p class="max-w-xl text-white/60 md:text-lg">{{ $t('create.text') }}</p>
    </header>

    <!-- Primary: start a room with friends -->
    <section class="grid gap-10 border-y border-white/10 py-10 lg:grid-cols-[1fr_1.15fr]">
      <div class="flex flex-col gap-8">
        <ol class="space-y-6">
          <li v-for="i in [0, 1, 2]" :key="i" class="grid grid-cols-[2.75rem_1fr] gap-3">
            <span class="font-display text-2xl leading-none font-black text-accent tabular-nums">0{{ i + 1 }}</span>
            <span>
              <span class="block font-semibold">{{ $t(`create.steps.${i}.title`) }}</span>
              <span class="block text-sm text-white/60">{{ $t(`create.steps.${i}.text`) }}</span>
            </span>
          </li>
        </ol>

        <div class="mt-auto space-y-3">
          <button v-if="!auth.user" class="btn-primary w-full py-3 text-base sm:w-auto sm:px-8" disabled>{{ $t('create.room.signIn') }}</button>
          <button v-else class="btn-primary w-full py-3 text-base sm:w-auto sm:px-8" :disabled="busy" @click="startRoom">
            {{ auth.user.isSubscriber ? $t('create.room.start') : $t('create.room.needPass') }}
            <Icon name="arrowRight" class="size-4" />
          </button>
          <p class="text-xs text-white/50">
            <template v-if="selected">{{ $t('create.room.selected', { title: selected.title }) }} · </template>{{ $t('create.room.hostNote') }}
          </p>
          <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-baseline justify-between gap-4">
          <p class="text-white/50" :class="label">{{ $t('create.room.scenario') }}</p>
          <p class="text-xs text-white/40">{{ $t('create.room.pickHint') }}</p>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="d in scenarios"
            :key="d.id"
            type="button"
            :aria-pressed="d.id === selectedId"
            class="group space-y-2 text-left"
            @click="toggle(d.id)"
          >
            <span
              class="relative block aspect-9/16 overflow-hidden rounded-lg bg-surface-2 bg-cover bg-center ring-accent ring-offset-2 ring-offset-bg transition"
              :class="d.id === selectedId ? 'ring-2' : selectedId ? 'opacity-45 group-hover:opacity-80' : 'group-hover:opacity-90'"
              :style="posterStyle(d)"
            >
              <span v-if="d.id === selectedId" class="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-accent text-on-accent">
                <Icon name="check" class="size-3.5" />
              </span>
            </span>
            <span class="block truncate text-sm font-semibold">{{ d.title }}</span>
            <span class="block truncate text-xs text-white/50">{{ d.cast.map((c) => c.name).join(' · ') }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Secondary: write your own drama with a prompt -->
    <section class="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <div class="space-y-3">
        <p class="flex items-center gap-3 text-white/50" :class="label">
          {{ $t('create.make.eyebrow') }}
          <span class="rounded-sm border border-white/15 px-1.5 py-0.5 text-[10px] text-white/60">{{ $t('create.make.soon') }}</span>
        </p>
        <h2 class="text-2xl font-black md:text-3xl">{{ $t('create.make.title') }}</h2>
        <p class="max-w-md text-sm text-white/60">{{ $t('create.make.text', { n: get('tokens.cost_episode') }) }}</p>
      </div>

      <form class="overflow-hidden rounded-xl border border-white/10 bg-surface focus-within:border-white/25" @submit.prevent>
        <label for="drama-prompt" class="sr-only">{{ $t('create.make.prompt') }}</label>
        <textarea
          id="drama-prompt"
          v-model="prompt"
          rows="4"
          maxlength="500"
          :placeholder="$t('create.make.placeholder')"
          class="block w-full resize-none bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-white/35"
        />
        <div class="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
          <button
            v-for="g in catalog.genres"
            :key="g"
            type="button"
            :aria-pressed="genre === g"
            class="rounded-md border px-2.5 py-1 text-xs transition"
            :class="genre === g ? 'border-accent text-accent' : 'border-white/15 text-white/60 hover:text-white'"
            @click="genre = genre === g ? undefined : g"
          >
            {{ g }}
          </button>
        </div>
        <div class="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
          <span class="flex items-center gap-1.5 text-xs text-white/50">
            <Icon name="coin" class="size-4 text-accent" />{{ $t('create.make.cost', { n: get('tokens.cost_episode') }) }}
          </span>
          <button type="submit" disabled class="rounded-md border border-white/15 px-4 py-2 text-sm text-white/45">
            {{ $t('create.make.generate') }} · {{ $t('create.make.soon') }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>
