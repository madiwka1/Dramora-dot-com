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

const { get } = useConfig()
const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuth()
const paywall = usePaywall()
const catalog = useCatalog()

// "Play with friends" on a drama links here with ?drama=slug to preselect the scenario.
const preselected = computed(() => catalog.dramas.find((d) => d.slug === route.query.drama && d.isPlayable))
const busy = ref(false)
const error = ref('')

async function startRoom() {
  if (!auth.user) return
  if (!auth.user.isSubscriber) return paywall.open('plus') // hosting rooms is a Dramora Plus feature
  busy.value = true
  error.value = ''
  try {
    const code = await createRoom(auth.user.displayName, preselected.value?.id ?? null)
    router.push(`/room/${code}`)
  } catch (e) {
    console.error(e)
    const code = e instanceof Error ? e.message : ''
    error.value = t(te(`room.errors.${code}`) ? `room.errors.${code}` : 'common.error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
    <header class="space-y-2">
      <h1 class="text-3xl font-black uppercase md:text-4xl">{{ $t('create.title') }}</h1>
      <p class="text-white/70">{{ $t('create.text') }}</p>
    </header>

    <div class="grid gap-4 md:grid-cols-2">
      <section class="space-y-4 rounded-2xl bg-surface p-6">
        <span class="grid size-11 place-items-center rounded-xl bg-accent/20 text-accent-to"><Icon name="users" class="size-6" /></span>
        <h2 class="text-xl font-bold">{{ $t('create.room.title') }}</h2>
        <p class="text-sm text-white/70">{{ $t('create.room.text') }}</p>
        <p v-if="preselected" class="text-sm text-accent-to">{{ $t('create.room.with', { title: preselected.title }) }}</p>
        <button v-if="!auth.user" class="btn-primary" disabled>{{ $t('create.room.signIn') }}</button>
        <button v-else class="btn-primary" :disabled="busy" @click="startRoom">
          <Icon name="users" class="size-4" />
          {{ auth.user.isSubscriber ? $t('create.room.start') : $t('create.room.needPass') }}
        </button>
        <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p>
      </section>

      <section class="space-y-4 rounded-2xl bg-surface p-6">
        <span class="grid size-11 place-items-center rounded-xl bg-accent/20 text-accent-to"><Icon name="sparkles" class="size-6" /></span>
        <h2 class="text-xl font-bold">{{ $t('create.make.title') }}</h2>
        <p class="text-sm text-white/70">{{ $t('create.make.text') }}</p>
        <p class="flex items-center gap-1.5 text-sm text-accent-to">
          <Icon name="coin" class="size-4" />{{ $t('create.make.cost', { n: get('tokens.cost_episode') }) }}
        </p>
        <button class="btn-outline" :disabled="!get<boolean>('features.make_mode')">
          {{ get<boolean>('features.make_mode') ? $t('create.make.title') : $t('create.make.soon') }}
        </button>
      </section>
    </div>
  </main>
</template>
