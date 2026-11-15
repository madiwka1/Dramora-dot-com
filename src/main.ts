import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import './style.css'
import './composables/useSettings' // applies saved theme before mount
import App from './App.vue'
import { router } from './router'
import en from './locales/en.json'
import legal from './locales/legal.en.json'
import { useConfigStore } from './stores/config'
import { useAuth } from './stores/auth'
import { useCatalog } from './stores/catalog'
import { useTokens } from './stores/tokens'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: { ...en, legal } } })
const app = createApp(App).use(createPinia()).use(router).use(i18n)

try {
  await Promise.all([useConfigStore().load(), useAuth().load(), useCatalog().load()])
  await useTokens().load()
} catch (e) {
  console.error('Startup data failed to load', e)
}
app.mount('#app')
