<script setup lang="ts">
import { useConfig } from '../stores/config'
import AppLogo from './AppLogo.vue'
import { useConsent } from '../composables/useConsent'

const { get } = useConfig()
const { reopen } = useConsent()
const year = new Date().getFullYear()
const legal = [
  { to: '/terms', label: 'footer.terms' },
  { to: '/privacy', label: 'footer.privacy' },
  { to: '/refunds', label: 'footer.refunds' },
  { to: '/credits', label: 'footer.credits' },
]
const link = 'text-white/60 transition hover:text-white'
</script>

<template>
  <footer class="mt-16 border-t border-white/10 bg-bg">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-8">
      <div class="space-y-3">
        <AppLogo />
        <p class="max-w-xs text-sm text-white/60">{{ $t('footer.tagline') }}</p>
        <p class="text-xs text-white/40">{{ $t('footer.adults') }}</p>
      </div>

      <nav :aria-label="$t('footer.legal')" class="space-y-3 text-sm">
        <p class="text-[11px] tracking-[0.14em] text-white/40 uppercase">{{ $t('footer.legal') }}</p>
        <ul class="space-y-2">
          <li v-for="l in legal" :key="l.to"><RouterLink :to="l.to" :class="link">{{ $t(l.label) }}</RouterLink></li>
          <li><RouterLink to="/privacy#california" :class="link">{{ $t('footer.doNotSell') }}</RouterLink></li>
          <li><button :class="link" @click="reopen()">{{ $t('footer.cookies') }}</button></li>
        </ul>
      </nav>

      <div class="space-y-3 text-sm">
        <p class="text-[11px] tracking-[0.14em] text-white/40 uppercase">{{ $t('footer.contact') }}</p>
        <a :href="`mailto:${get<string>('legal.contact_email')}`" :class="link">{{ get<string>('legal.contact_email') }}</a>
        <p class="text-xs text-white/40">{{ $t('footer.payments') }}</p>
      </div>
    </div>
    <div class="border-t border-white/5">
      <p class="mx-auto max-w-6xl px-4 py-5 text-xs text-white/40 md:px-8">
        {{ $t('footer.copyright', { year, company: get<string>('legal.company_name') }) }}
      </p>
    </div>
  </footer>
</template>
