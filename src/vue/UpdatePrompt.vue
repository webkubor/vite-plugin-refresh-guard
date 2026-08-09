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
}>(), {
  mode: 'toast-auto',
  version: null,
  changelogHtml: '',
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
      <div class="rg-modal">
        <h3 class="rg-title">有新版本可用{{ version ? `：${version}` : '' }}</h3>
        <div v-if="changelogHtml" class="rg-body" v-html="changelogHtml" />
        <p v-else class="rg-body rg-body-empty">刷新页面即可使用最新版本。</p>
        <button type="button" class="rg-primary-btn" @click="emit('refresh')">立即更新</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rg-toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  background: #1f2937;
  color: #fff;
  font-size: 13px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.rg-toast-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
.rg-toast-btn:hover { background: rgba(255, 255, 255, 0.1); }

.rg-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}
.rg-modal {
  width: 90vw;
  max-width: 420px;
  padding: 24px;
  border-radius: 12px;
  background: #fff;
  color: #111827;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}
.rg-title { margin: 0 0 12px; font-size: 16px; font-weight: 700; }
.rg-body { margin: 0 0 20px; font-size: 13px; line-height: 1.6; color: #4b5563; max-height: 40vh; overflow-y: auto; }
.rg-body-empty { color: #6b7280; }
.rg-primary-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.rg-primary-btn:hover { background: #1d4ed8; }

@media (prefers-color-scheme: dark) {
  .rg-modal { background: #1f2937; color: #f3f4f6; }
  .rg-body { color: #d1d5db; }
}
</style>
