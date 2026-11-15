<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isDemo, startCheckout, type PlusPlan, type TokenPack } from '../data'
import { usePaywall, usd } from '../composables/usePaywall'
import { useAuth } from '../stores/auth'
import { useConfig } from '../stores/config'
import { useTokens } from '../stores/tokens'
import Icon from './Icon.vue'

const { t } = useI18n()
const paywall = usePaywall()
const auth = useAuth()
const tokens = useTokens()
const { get } = useConfig()

const dialog = ref<HTMLDialogElement>()
const tokensSection = ref<HTMLElement>()
const plans = computed(() => get<PlusPlan[]>('plans.plus') ?? [])
const packs = computed(() => get<TokenPack[]>('tokens.packs') ?? [])
const selectedId = ref('')
const plan = computed(() => plans.value.find((p) => p.id === selectedId.value) ?? plans.value[0])
const monthly = computed(() => plans.value.find((p) => p.period === 'month'))
const methods = computed(() => get<string[]>('paywall.payment_methods') ?? [])

// Badges are computed from config prices, so they stay right when prices change.
function badge(p: PlusPlan) {
  if (p.compareAtCents) return t('paywall.off', { n: Math.round((1 - p.amountCents / p.compareAtCents) * 100) })
  if (p.period === 'year' && monthly.value) {
    return t('paywall.save', { n: Math.round((1 - p.amountCents / (monthly.value.amountCents * 12)) * 100) })
  }
  return ''
}

watch(paywall.isOpen, async (open) => {
  pending.value = null
  if (!open) return dialog.value?.close()
  dialog.value?.showModal()
  await nextTick()
  if (paywall.section.value === 'tokens') tokensSection.value?.scrollIntoView({ block: 'start' })
})

// Demo mode: a Yes/No confirmation stands in for the Stripe payment page.
const pending = ref<{ id: string; label: string; price: string } | null>(null)
function choosePlan(p: PlusPlan) {
  const price = `${usd(p.amountCents)}/${t(`paywall.per.${p.period}`)}`
  isDemo ? (pending.value = { id: p.id, label: `${t('paywall.title')} · ${t(`paywall.plan.${p.period}`)}`, price }) : buy(p.id)
}
function choosePack(pack: TokenPack) {
  const label = `${pack.name} · ${t('paywall.demo.tokens', { n: pack.tokens.toLocaleString('en-US') })}`
  isDemo ? (pending.value = { id: pack.id, label, price: usd(pack.amountCents) }) : buy(pack.id)
}
async function confirmDemo() {
  if (!pending.value) return
  const { id } = pending.value
  pending.value = null
  await buy(id)
}

const busy = ref(false)
const failed = ref(false)
async function buy(productId: string) {
  busy.value = true
  failed.value = false
  try {
    await startCheckout(productId) // demo: instant; real: redirects to Stripe Checkout
    await Promise.all([auth.load(), tokens.load()])
    paywall.close()
  } catch (e) {
    console.error(e)
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="$t('paywall.title')"
    class="m-auto max-h-[92dvh] w-[min(30rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl bg-surface p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    @close="paywall.close()"
    @click="(e) => e.target === dialog && paywall.close()"
  >
    <!-- Demo purchase confirmation -->
    <div v-if="pending" class="space-y-5 p-6 text-center">
      <span class="inline-block rounded-full border border-accent/50 px-3 py-1 text-xs font-semibold tracking-widest text-accent-to uppercase">
        {{ $t('paywall.demo.badge') }}
      </span>
      <h2 class="text-2xl font-black">{{ $t('paywall.demo.title') }}</h2>
      <div class="space-y-1 rounded-xl bg-surface-2 p-4">
        <p class="font-semibold">{{ pending.label }}</p>
        <p class="text-2xl font-bold text-accent-to">{{ pending.price }}</p>
      </div>
      <p class="text-sm text-white/60">{{ $t('paywall.demo.note') }}</p>
      <div class="grid grid-cols-2 gap-3">
        <button class="btn-outline" @click="pending = null">{{ $t('paywall.demo.no') }}</button>
        <button class="btn-primary" autofocus @click="confirmDemo">{{ $t('paywall.demo.yes') }}</button>
      </div>
    </div>

    <div v-else class="space-y-6 p-6">
      <header class="relative space-y-2 pr-10">
        <button :aria-label="$t('paywall.close')" class="absolute top-0 right-0 grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" @click="paywall.close()">
          <span aria-hidden="true" class="text-xl leading-none">&times;</span>
        </button>
        <p class="flex items-center gap-1.5 text-sm font-semibold tracking-widest text-accent-to uppercase">
          <Icon name="crown" class="size-4" />{{ $t('paywall.title') }}
        </p>
        <h2 class="text-2xl leading-tight font-black">{{ $t('paywall.subtitle') }}</h2>
        <p class="text-sm text-white/60">{{ $t('paywall.renew') }}</p>
      </header>

      <!-- Dramora Plus plans -->
      <section v-if="auth.user?.isSubscriber" class="rounded-xl bg-accent/10 p-4 text-sm">{{ $t('paywall.member') }}</section>
      <section v-else class="space-y-3">
        <div role="radiogroup" :aria-label="$t('paywall.title')" class="space-y-3">
          <button
            v-for="p in plans"
            :key="p.id"
            role="radio"
            :aria-checked="p.id === plan?.id"
            class="relative flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition"
            :class="p.id === plan?.id ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/30'"
            @click="selectedId = p.id"
          >
            <span v-if="badge(p)" class="absolute -top-2.5 left-4 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-on-accent uppercase">{{ badge(p) }}</span>
            <span>
              <span class="block font-semibold">{{ $t(`paywall.plan.${p.period}`) }}</span>
              <span v-if="p.tokens" class="flex items-center gap-1 text-xs text-accent-to">
                <Icon name="coin" class="size-3.5" />{{ $t('paywall.tokensIncluded', { n: p.tokens.toLocaleString('en-US') }) }}
              </span>
            </span>
            <span class="text-right whitespace-nowrap">
              <span v-if="p.compareAtCents" class="block text-xs text-white/50 line-through">{{ usd(p.compareAtCents) }}</span>
              <span class="text-lg font-bold">{{ usd(p.amountCents) }}</span>
              <span class="text-xs text-white/60">/{{ $t(`paywall.per.${p.period}`) }}</span>
            </span>
          </button>
        </div>

        <button v-if="plan" class="btn-primary w-full py-3 text-base" :disabled="busy" @click="choosePlan(plan)">
          {{ $t('paywall.cta', { price: usd(plan.amountCents), per: $t(`paywall.per.${plan.period}`) }) }}
        </button>

        <!-- Auto-renewal disclosure beside the purchase button (state auto-renewal laws). -->
        <i18n-t v-if="plan" keypath="paywall.legal" tag="p" class="text-center text-xs leading-relaxed text-white/50">
          <template #price>{{ usd(plan.amountCents) }}/{{ $t(`paywall.per.${plan.period}`) }}</template>
          <template #terms><RouterLink to="/terms#subscriptions" class="underline underline-offset-2 hover:text-white" @click="paywall.close()">{{ $t('footer.terms') }}</RouterLink></template>
          <template #refunds><RouterLink to="/refunds" class="underline underline-offset-2 hover:text-white" @click="paywall.close()">{{ $t('footer.refunds') }}</RouterLink></template>
        </i18n-t>

        <!-- Badges from Config paywall.payment_methods; Stripe Checkout shows the wallets a device supports. -->
        <div class="space-y-2 text-center">
          <p class="text-xs text-white/50">{{ $t('paywall.payWith') }}</p>
          <ul class="flex flex-wrap items-center justify-center gap-2">
            <li v-for="m in methods" :key="m" class="h-9 w-14 overflow-hidden rounded-md bg-white">
              <img :src="`/payments/${m}.png`" :alt="$t(`paywall.methods.${m}`)" class="size-full object-contain" width="222" height="146" loading="lazy" />
            </li>
          </ul>
        </div>
      </section>

      <!-- Token packs -->
      <section ref="tokensSection" class="space-y-3 border-t border-white/10 pt-6">
        <div>
          <h3 class="font-bold">{{ $t('paywall.tokens.title') }}</h3>
          <p class="text-sm text-white/60">{{ $t('paywall.tokens.text', { n: get('tokens.cost_unlock_episode') }) }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="pack in packs"
            :key="pack.id"
            :disabled="busy"
            class="space-y-1 rounded-xl border border-white/10 bg-surface-2 p-4 text-left transition hover:border-accent disabled:opacity-50"
            @click="choosePack(pack)"
          >
            <span class="block text-xs text-white/60">{{ pack.name }}</span>
            <span class="flex items-center gap-1.5 text-lg font-bold">
              <Icon name="coin" class="size-5 text-accent-to" />{{ pack.tokens.toLocaleString('en-US') }}
            </span>
            <span class="block text-sm font-semibold text-accent-to">{{ usd(pack.amountCents) }}</span>
          </button>
        </div>
        <p class="text-xs text-white/50">{{ $t('paywall.tokens.fine') }}</p>
      </section>

      <p v-if="failed" role="alert" class="text-sm text-red-400">{{ $t('common.error') }}</p>
    </div>
  </dialog>
</template>
