<script setup lang="ts">
import { ref, watch } from 'vue'
import { isDemo, updateDisplayName } from '../data'
import { useAuth } from '../stores/auth'
import { ACCENTS, THEMES, useSettings } from '../composables/useSettings'
import { useConsent } from '../composables/useConsent'

const auth = useAuth()
const { settings, reset } = useSettings()
const { consent, choose } = useConsent()

const name = ref('')
watch(() => auth.user?.displayName, (n) => (name.value = n ?? ''), { immediate: true })
const saving = ref(false)
const status = ref<'' | 'saved' | 'failed'>('')

async function saveName() {
  saving.value = true
  status.value = ''
  try {
    await updateDisplayName(name.value.trim())
    await auth.load()
    status.value = 'saved'
  } catch (e) {
    console.error(e)
    status.value = 'failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-10 p-4 md:p-8">
    <h1 class="text-3xl font-black uppercase md:text-4xl">{{ $t('settings.title') }}</h1>

    <!-- Profile -->
    <section v-if="auth.user" class="space-y-4">
      <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('settings.profile.title') }}</h2>
      <form class="flex flex-col gap-4 rounded-2xl bg-surface p-6 sm:flex-row sm:items-end" @submit.prevent="saveName">
        <span class="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-on-accent text-2xl font-bold">
          {{ (name || auth.user.displayName).charAt(0).toUpperCase() }}
        </span>
        <label class="flex-1 space-y-1.5">
          <span class="text-sm text-white/60">{{ $t('settings.profile.name') }}</span>
          <input v-model="name" required maxlength="24" class="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-sm" />
        </label>
        <button class="btn-primary" :disabled="saving || !name.trim() || name.trim() === auth.user.displayName">
          {{ $t('settings.profile.save') }}
        </button>
      </form>
      <p v-if="status" role="status" class="text-sm" :class="status === 'saved' ? 'text-emerald-400' : 'text-red-400'">
        {{ status === 'saved' ? $t('settings.profile.saved') : $t('common.error') }}
      </p>
      <p v-if="isDemo" class="text-xs text-white/50">{{ $t('settings.profile.demoNote') }}</p>
    </section>

    <!-- Appearance -->
    <section class="space-y-6">
      <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('settings.appearance.title') }}</h2>

      <fieldset class="space-y-3">
        <legend class="mb-3 font-semibold">{{ $t('settings.appearance.theme') }}</legend>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <!-- Each swatch sets its own data-theme, so it previews the real CSS colors. -->
          <button
            v-for="t in THEMES"
            :key="t"
            type="button"
            :aria-pressed="settings.theme === t"
            :data-theme="t"
            class="space-y-2 rounded-xl border-2 bg-bg p-3 text-left transition"
            :class="settings.theme === t ? 'border-accent' : 'border-white/10 hover:border-white/30'"
            @click="settings.theme = t"
          >
            <span class="flex gap-1.5">
              <span class="h-8 flex-1 rounded-md bg-surface" />
              <span class="h-8 flex-1 rounded-md bg-surface-2" />
            </span>
            <span class="block text-sm font-medium">{{ $t(`settings.themes.${t}`) }}</span>
          </button>
        </div>
      </fieldset>

      <fieldset class="space-y-3">
        <legend class="mb-3 font-semibold">{{ $t('settings.appearance.accent') }}</legend>
        <div class="flex flex-wrap gap-4">
          <button
            v-for="a in ACCENTS"
            :key="a"
            type="button"
            :aria-pressed="settings.accent === a"
            :data-accent="a"
            class="flex flex-col items-center gap-1.5 text-xs"
            @click="settings.accent = a"
          >
            <span
              class="size-10 rounded-full bg-accent text-on-accent ring-offset-2 ring-offset-bg transition"
              :class="settings.accent === a ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'"
            />
            {{ $t(`settings.accents.${a}`) }}
          </button>
        </div>
      </fieldset>
    </section>

    <!-- Playback -->
    <section class="space-y-4">
      <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('settings.playback.title') }}</h2>
      <div class="divide-y divide-white/5 rounded-2xl bg-surface">
        <label class="flex cursor-pointer items-center justify-between gap-4 p-4">
          <span>
            <span class="block font-medium">{{ $t('settings.playback.autoplay') }}</span>
            <span class="block text-sm text-white/60">{{ $t('settings.playback.autoplayHint') }}</span>
          </span>
          <input v-model="settings.autoplayNext" type="checkbox" class="size-5 shrink-0 accent-accent" />
        </label>
        <label class="flex cursor-pointer items-center justify-between gap-4 p-4">
          <span>
            <span class="block font-medium">{{ $t('settings.playback.previews') }}</span>
            <span class="block text-sm text-white/60">{{ $t('settings.playback.previewsHint') }}</span>
          </span>
          <input v-model="settings.hoverPreviews" type="checkbox" class="size-5 shrink-0 accent-accent" />
        </label>
      </div>
    </section>

    <!-- Privacy & cookies -->
    <section class="space-y-4">
      <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('cookies.settingsTitle') }}</h2>
      <div class="divide-y divide-white/5 rounded-2xl bg-surface">
        <div class="flex items-center justify-between gap-4 p-4">
          <span>
            <span class="block font-medium">{{ $t('cookies.cat.essential') }}</span>
            <span class="block text-sm text-white/60">{{ $t('cookies.cat.essentialText') }}</span>
          </span>
          <span class="shrink-0 text-sm text-white/50">{{ $t('cookies.alwaysOn') }}</span>
        </div>
        <label class="flex cursor-pointer items-center justify-between gap-4 p-4">
          <span>
            <span class="block font-medium">{{ $t('cookies.cat.analytics') }}</span>
            <span class="block text-sm text-white/60">{{ consent.gpc ? $t('cookies.gpc') : $t('cookies.cat.analyticsText') }}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            class="size-5 shrink-0 accent-accent"
            :checked="consent.analytics"
            :disabled="consent.gpc"
            @change="choose(($event.target as HTMLInputElement).checked)"
          />
        </label>
      </div>
      <RouterLink to="/privacy#storage" class="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">{{ $t('footer.privacy') }}</RouterLink>
    </section>

    <button class="btn-outline" @click="reset">{{ $t('settings.reset') }}</button>
  </main>
</template>
