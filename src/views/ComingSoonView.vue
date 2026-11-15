<template>
  <main class="grid min-h-[60vh] place-items-center p-6 text-center">
    <div class="space-y-4">
      <h1 class="text-3xl font-black uppercase">{{ $t('comingSoon.title') }}</h1>
      <p class="text-white/70">{{ $t('comingSoon.text') }}</p>
      <RouterLink to="/" class="btn-outline">{{ $t('common.backHome') }}</RouterLink>
    </div>
  </main>
</template>
