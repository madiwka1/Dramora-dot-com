<script setup lang="ts">
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import CookieBanner from './components/CookieBanner.vue'
import PaywallModal from './components/PaywallModal.vue'
</script>

<template>
  <AppHeader />
  <div class="pt-25 md:pt-16">
    <RouterView />
    <AppFooter />
  </div>
  <PaywallModal />
  <CookieBanner />
</template>
