<template>
  <!-- From dramora-logo.svg (dark version): lime mark, white dot + wordmark. Wordmark is live Bricolage Grotesque 800 text. -->
  <span class="flex items-center gap-2">
    <svg viewBox="0 0 120 120" class="size-8 shrink-0" aria-hidden="true">
      <defs>
        <mask id="dramora-cut">
          <rect width="120" height="120" fill="#fff" />
          <path d="M46 40 L46 80 L80 60 Z" fill="#000" stroke="#000" stroke-width="8" stroke-linejoin="round" />
        </mask>
      </defs>
      <path
        mask="url(#dramora-cut)"
        d="M22 14 H58 C83.4 14 104 34.6 104 60 C104 85.4 83.4 106 58 106 H22 C18.7 106 16 103.3 16 100 V20 C16 16.7 18.7 14 22 14 Z"
        fill="#C6F24E"
      />
      <circle cx="98" cy="20" r="9" fill="currentColor" />
    </svg>
    <span class="font-logo text-2xl font-extrabold tracking-[-0.03em] lowercase">{{ $t('app.name') }}</span>
  </span>
</template>
