<script setup lang="ts">
import { ref, watch } from 'vue'
import { useConsent } from '../composables/useConsent'

const { consent, choose } = useConsent()

// Draft for the Manage view; saved only on "Save choices".
const analytics = ref(consent.analytics)
watch(() => consent.open, (open) => open && (analytics.value = consent.analytics))
</script>

<template>
  <Transition enter-from-class="translate-y-4 opacity-0" leave-to-class="translate-y-4 opacity-0" enter-active-class="transition" leave-active-class="transition">
    <section
      v-if="consent.open"
      role="dialog"
      aria-labelledby="cookie-title"
      class="fixed bottom-4 left-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-surface p-5 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)]"
    >
      <!-- First visit: quick choice -->
      <template v-if="!consent.managing">
        <h2 id="cookie-title" class="font-display text-base font-bold">{{ $t('cookies.title') }}</h2>
        <p class="mt-2 text-sm leading-relaxed text-white/70">
          {{ $t('cookies.text') }}
          <RouterLink to="/privacy#storage" class="underline underline-offset-2 hover:text-white">{{ $t('footer.privacy') }}</RouterLink>
        </p>
        <!-- Equal-weight choices: declining is as easy as accepting. -->
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button class="btn-outline px-3" @click="choose(false)">{{ $t('cookies.essential') }}</button>
          <button class="btn-outline px-3" :disabled="consent.gpc" @click="choose(true)">{{ $t('cookies.allow') }}</button>
        </div>
        <button class="mt-3 w-full text-center text-xs text-white/60 underline-offset-4 hover:text-white hover:underline" @click="consent.managing = true">
          {{ $t('cookies.manage') }}
        </button>
      </template>

      <!-- Manage cookies: one switch per category -->
      <template v-else>
        <h2 id="cookie-title" class="font-display text-base font-bold">{{ $t('cookies.manageTitle') }}</h2>
        <ul class="mt-3 divide-y divide-white/10 border-y border-white/10">
          <li class="flex items-start justify-between gap-4 py-3">
            <span>
              <span class="block text-sm font-semibold">{{ $t('cookies.cat.essential') }}</span>
              <span class="block text-xs leading-relaxed text-white/60">{{ $t('cookies.cat.essentialText') }}</span>
            </span>
            <span class="shrink-0 pt-0.5 text-xs text-white/50">{{ $t('cookies.alwaysOn') }}</span>
          </li>
          <li>
            <label class="flex cursor-pointer items-start justify-between gap-4 py-3">
              <span>
                <span class="block text-sm font-semibold">{{ $t('cookies.cat.analytics') }}</span>
                <span class="block text-xs leading-relaxed text-white/60">{{ $t('cookies.cat.analyticsText') }}</span>
                <span v-if="consent.gpc" class="mt-1 block text-xs text-white/50">{{ $t('cookies.gpc') }}</span>
              </span>
              <input v-model="analytics" type="checkbox" role="switch" :disabled="consent.gpc" class="mt-0.5 size-5 shrink-0 accent-accent" />
            </label>
          </li>
        </ul>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button class="btn-outline px-3" @click="choose(false)">{{ $t('cookies.essential') }}</button>
          <button class="btn-outline px-3" @click="choose(analytics)">{{ $t('cookies.save') }}</button>
        </div>
        <RouterLink to="/privacy#storage" class="mt-3 block text-center text-xs text-white/60 underline-offset-4 hover:text-white hover:underline">
          {{ $t('footer.privacy') }}
        </RouterLink>
      </template>
    </section>
  </Transition>
</template>
