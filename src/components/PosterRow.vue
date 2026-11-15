<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between px-4 md:px-8">
      <h2 class="border-l-2 border-accent pl-3 text-lg font-bold tracking-wide uppercase md:text-xl">{{ title }}</h2>
      <slot name="action" />
    </div>
    <div class="no-scrollbar flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 py-3 md:scroll-px-8 md:px-8">
      <slot />
    </div>
  </section>
</template>
