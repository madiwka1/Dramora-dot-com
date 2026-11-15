<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '../stores/auth'
import { useConfig } from '../stores/config'
import { useTokens } from '../stores/tokens'
import Icon from '../components/Icon.vue'

const auth = useAuth()
const tokens = useTokens()
const { get } = useConfig()

const site = import.meta.env.VITE_SITE_URL || location.origin
const link = computed(() => (auth.user ? `${site}/invite/${auth.user.inviteCode}` : ''))
const copied = ref(false)

async function copy() {
  await navigator.clipboard.writeText(link.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const rules = computed(() => [
  ['invite.rules.inviter', get('tokens.invite_inviter')],
  ['invite.rules.friend', get('tokens.invite_friend')],
  ['invite.rules.paid', get('tokens.paid_referral_bonus')],
  ['invite.rules.cap', get('invites.max_rewarded_per_month')],
] as const)
const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-8 p-4 md:p-8">
    <header class="space-y-2">
      <h1 class="text-3xl font-black uppercase md:text-4xl">{{ $t('invite.title') }}</h1>
      <p class="text-white/70">{{ $t('invite.text') }}</p>
    </header>

    <section v-if="auth.user" class="space-y-3 rounded-2xl border border-accent/30 bg-surface p-6">
      <p class="text-sm text-white/70">{{ $t('invite.yourLink') }}</p>
      <div class="flex flex-col gap-3 sm:flex-row">
        <input :value="link" readonly :aria-label="$t('invite.yourLink')" class="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/30 px-4 py-2.5 text-sm" />
        <button class="btn-primary" @click="copy">
          <Icon :name="copied ? 'check' : 'copy'" class="size-4" />{{ copied ? $t('invite.copied') : $t('invite.copy') }}
        </button>
      </div>
    </section>

    <ul class="grid gap-3 sm:grid-cols-2">
      <li v-for="[key, n] in rules" :key="key" class="flex items-center gap-3 rounded-xl bg-surface p-4 text-sm">
        <Icon name="coin" class="size-5 shrink-0 text-accent-to" />{{ $t(key, { n }) }}
      </li>
    </ul>

    <section class="space-y-3">
      <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase">{{ $t('invite.history') }}</h2>
      <p v-if="!tokens.history.length" class="text-white/60">{{ $t('invite.empty') }}</p>
      <ul class="divide-y divide-white/5 rounded-xl bg-surface">
        <li v-for="t in tokens.history" :key="t.id" class="flex items-center justify-between p-4 text-sm">
          <span>
            {{ $t(`tokens.reason.${t.reason}`) }}
            <span class="block text-xs text-white/50">{{ date(t.createdAt) }}</span>
          </span>
          <span class="font-semibold" :class="t.delta > 0 ? 'text-emerald-400' : 'text-red-400'">{{ t.delta > 0 ? '+' : '' }}{{ t.delta }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>
