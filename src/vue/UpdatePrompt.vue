<script setup lang="ts">
import { computed } from 'vue'
import type { UpdateMode } from '../core/types'

const props = withDefaults(defineProps<{
  visible: boolean
  mode?: UpdateMode
  /** Optional: e.g. `latestVersion` from `virtual:refresh-guard-changelog`. */
  version?: string | null
  /** Optional: e.g. `latestContent` from `virtual:refresh-guard-changelog`, rendered as-is via v-html — pre-sanitize if it isn't your own trusted file. */
  changelogHtml?: string
  /**
   * Explicitly light/dark instead of following the OS `prefers-color-scheme`. Pass your app's
   * own theme state here (e.g. `isDark.value`) so this modal matches your site's actual theme
   * toggle instead of the visitor's OS setting — leaving this unset means a site in light mode
   * can render a dark modal just because the OS is dark, which looks broken. Default: unset
   * (falls back to `prefers-color-scheme`).
   */
  dark?: boolean | null
}>(), {
  mode: 'toast-auto',
  version: null,
  changelogHtml: '',
  dark: null,
})

const emit = defineEmits<{ refresh: [] }>()

// 'silent' has no UI by design — the checker just reloads in the background.
const shown = computed(() => props.visible && props.mode !== 'silent')
</script>

<template>
  <Teleport to="body">
    <div v-if="shown && mode === 'toast-auto'" class="rg-toast" role="status">
      <span>发现新版本{{ version ? ` ${version}` : '' }}，即将自动刷新…</span>
      <button type="button" class="rg-toast-btn" @click="emit('refresh')">立即刷新</button>
    </div>

    <div v-if="shown && mode === 'modal-blocking'" class="rg-overlay" role="alertdialog" aria-modal="true">
      <div class="rg-modal" :class="{ 'rg-dark': dark === true, 'rg-light': dark === false }">
        <h3 class="rg-title">✨ 有新版本可用{{ version ? `：${version}` : '' }}</h3>
        <div v-if="changelogHtml" class="rg-body" v-html="changelogHtml" />
        <p v-else class="rg-body rg-body-empty">刷新页面即可使用最新版本。</p>
        <button type="button" class="rg-primary-btn" @click="emit('refresh')">立即更新</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/*
 * Every color/radius here reads from a --rg-* custom property first, falling back to a
 * reasonable default — set these on :root (or any ancestor) in your own app to re-skin the
 * component to your brand instead of living with generic blue-on-white. See README "Styling".
 */
.rg-toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--rg-radius, 10px);
  background: var(--rg-toast-bg, #1f2937);
  color: var(--rg-toast-fg, #fff);
  font-size: 13px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.rg-toast-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.rg-toast-btn:hover { background: rgba(255, 255, 255, 0.12); }

.rg-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rg-overlay-bg, rgba(15, 15, 20, 0.55));
}
.rg-modal {
  width: 90vw;
  max-width: 420px;
  padding: 28px;
  border-radius: var(--rg-radius, 16px);
  background: var(--rg-modal-bg, #fff);
  color: var(--rg-modal-fg, #111827);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.08);
}
.rg-title { margin: 0 0 14px; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
.rg-body { margin: 0 0 22px; font-size: 13.5px; line-height: 1.7; color: var(--rg-body-fg, #4b5563); max-height: 40vh; overflow-y: auto; }
.rg-body-empty { color: var(--rg-body-fg, #6b7280); }
.rg-primary-btn {
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: var(--rg-btn-radius, 10px);
  background: var(--rg-accent, #2563eb);
  color: var(--rg-accent-fg, #fff);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.05s ease;
}
.rg-primary-btn:hover { filter: brightness(0.92); }
.rg-primary-btn:active { transform: scale(0.99); }

.rg-modal.rg-dark { background: var(--rg-modal-bg-dark, #1f2937); color: var(--rg-modal-fg-dark, #f3f4f6); }
.rg-modal.rg-dark .rg-body { color: var(--rg-body-fg-dark, #d1d5db); }
@media (prefers-color-scheme: dark) {
  .rg-modal:not(.rg-light) { background: var(--rg-modal-bg-dark, #1f2937); color: var(--rg-modal-fg-dark, #f3f4f6); }
  .rg-modal:not(.rg-light) .rg-body { color: var(--rg-body-fg-dark, #d1d5db); }
}
</style>
