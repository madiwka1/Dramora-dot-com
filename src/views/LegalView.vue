<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfig } from '../stores/config'

type Doc = 'terms' | 'privacy' | 'refunds' | 'credits'
type Section = { id: string; title: string; body: string[] }
const props = defineProps<{ doc: Doc }>()

const { tm, rt } = useI18n()
const { get } = useConfig()

// Company details come from Config (legal.*), so the documents never hardcode them.
const params = computed(() => ({
  company: get<string>('legal.company_name'),
  email: get<string>('legal.contact_email'),
  state: get<string>('legal.governing_state'),
  date: get<string>('legal.effective_date'),
  days: get<number>('legal.refund_window_days'),
}))
// tm() returns the raw message tree; rt() renders each message with the params.
const content = computed(() => tm(`legal.${props.doc}`) as unknown as { title: string; intro: string; sections: Section[] })
const r = (m: unknown) => rt(m as string, params.value)
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-10 p-4 pb-16 md:p-8">
    <header class="space-y-3 border-b border-white/10 pb-8">
      <p class="text-xs tracking-[0.14em] text-accent uppercase">{{ $t('legal.eyebrow') }}</p>
      <h1 class="text-4xl font-black md:text-5xl">{{ r(content.title) }}</h1>
      <p v-if="doc !== 'credits'" class="text-sm text-white/50">{{ $t('legal.effective', params) }}</p>
      <p class="max-w-2xl text-white/80">{{ r(content.intro) }}</p>
    </header>

    <section v-for="s in content.sections" :id="r(s.id)" :key="r(s.id)" class="scroll-mt-24 space-y-3">
      <h2 class="text-xl font-bold">{{ r(s.title) }}</h2>
      <p v-for="(p, i) in s.body" :key="i" class="leading-relaxed text-white/75">{{ r(p) }}</p>
    </section>
  </main>
</template>
