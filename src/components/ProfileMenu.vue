<script setup lang="ts">
import { computed, ref } from 'vue'
import { cancelSubscription, isDemo, type TokenPack } from '../data'
import { usePaywall, usd } from '../composables/usePaywall'
import { useAuth } from '../stores/auth'
import { useConfig } from '../stores/config'
import { useTokens } from '../stores/tokens'
import { useWatchTime } from '../composables/useWatchTime'
import Icon from './Icon.vue'

const auth = useAuth()
const tokens = useTokens()
const { get } = useConfig()
const { seconds } = useWatchTime()

const menu = ref<HTMLElement>()
const busy = ref(false)
const failed = ref(false)
const hours = computed(() => Math.floor(seconds.value / 3600))
const minutes = computed(() => Math.floor((seconds.value % 3600) / 60))
const cheapestPack = computed(() => Math.min(...(get<TokenPack[]>('tokens.packs') ?? []).map((p) => p.amountCents)))

async function run(action: () => Promise<void>) {
  busy.value = true
  failed.value = false
  try {
    await action()
    await auth.load()
    await tokens.load()
  } catch (e) {
    console.error(e)
    failed.value = true
  } finally {
    busy.value = false
  }
}
const paywall = usePaywall()
function openPaywall(section: 'plus' | 'tokens') {
  menu.value?.hidePopover()
  paywall.open(section)
}
const close = () => menu.value?.hidePopover()
const cancel = () => run(cancelSubscription)

// Quiet list rows; lime is reserved for the single upgrade action.
const row = 'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-white/[0.04]'
</script>

<template>
  <div v-if="auth.user">
    <button
      popovertarget="profile-menu"
      :aria-label="$t('profile.open')"
      class="flex items-center gap-3 rounded-lg py-1 pr-1.5 pl-3 transition hover:bg-white/5"
    >
      <span class="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
        <Icon name="coin" class="size-4 text-accent" />{{ tokens.balance }}
      </span>
      <span class="grid size-8 place-items-center rounded-md bg-white/10 font-display text-sm font-bold">
        {{ auth.user.displayName.charAt(0).toUpperCase() }}
      </span>
    </button>

    <div
      id="profile-menu"
      ref="menu"
      popover
      class="fixed inset-auto top-16 right-4 m-0 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-surface p-0 text-white shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6)]"
    >
      <!-- Identity -->
      <header class="flex items-center gap-3 px-4 pt-4 pb-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-md bg-white/10 font-display text-lg font-bold">
          {{ auth.user.displayName.charAt(0).toUpperCase() }}
        </span>
        <div class="min-w-0">
          <p class="truncate font-display text-lg leading-tight font-bold">{{ auth.user.displayName }}</p>
          <p class="text-[11px] tracking-[0.12em] text-white/50 uppercase">
            {{ auth.user.isSubscriber ? $t('paywall.title') : $t('profile.freePlan') }}<template v-if="isDemo"> · {{ $t('profile.demo') }}</template>
          </p>
        </div>
      </header>

      <!-- Figures: one line, no cards -->
      <dl class="grid grid-cols-2 border-y border-white/10">
        <div class="px-4 py-3">
          <dt class="text-[11px] tracking-[0.12em] text-white/50 uppercase">{{ $t('profile.tokens') }}</dt>
          <dd class="mt-0.5 font-display text-2xl font-bold tabular-nums">{{ tokens.balance }}</dd>
        </div>
        <div class="border-l border-white/10 px-4 py-3">
          <dt class="text-[11px] tracking-[0.12em] text-white/50 uppercase">{{ $t('profile.watched') }}</dt>
          <dd class="mt-0.5 font-display text-2xl font-bold tabular-nums">{{ $t('profile.watchTimeValue', { h: hours, m: minutes }) }}</dd>
        </div>
      </dl>

      <!-- Actions: a plain menu list -->
      <nav class="divide-y divide-white/5 py-1">
        <button :class="row" @click="openPaywall('tokens')">
          <span>{{ $t('profile.buyTokens') }}</span>
          <span class="text-xs text-white/50">{{ $t('profile.from', { price: usd(cheapestPack) }) }}</span>
        </button>
        <RouterLink to="/invite" :class="row" @click="close">
          <span>{{ $t('profile.inviteFriends') }}</span>
          <span class="text-xs font-semibold text-accent">+{{ get('tokens.invite_inviter') }}</span>
        </RouterLink>
        <RouterLink to="/settings" :class="row" @click="close">
          <span>{{ $t('settings.title') }}</span>
          <Icon name="arrowRight" class="size-4 text-white/40" />
        </RouterLink>
      </nav>

      <!-- Plan: the one lime action -->
      <footer class="border-t border-white/10 p-4">
        <template v-if="!auth.user.isSubscriber">
          <p class="font-display text-base font-bold">{{ $t('paywall.title') }}</p>
          <p class="mb-3 text-xs text-white/60">{{ $t('profile.plusPitch') }}</p>
          <button class="btn-primary w-full" @click="openPaywall('plus')">{{ $t('profile.upgrade') }}</button>
        </template>
        <div v-else class="flex items-center justify-between text-sm">
          <span class="flex items-center gap-2"><Icon name="crown" class="size-4 text-accent" />{{ $t('profile.plusActive') }}</span>
          <button class="text-xs text-white/50 underline-offset-4 hover:text-white hover:underline" :disabled="busy" @click="cancel">
            {{ $t('profile.cancelPass') }}
          </button>
        </div>
        <p v-if="failed" role="alert" class="mt-2 text-xs text-red-400">{{ $t('common.error') }}</p>
      </footer>
    </div>
  </div>
</template>
