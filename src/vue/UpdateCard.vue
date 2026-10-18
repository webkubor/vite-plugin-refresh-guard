<script setup lang="ts">
import { computed, ref, watch } from 'vue'

function parseBulletPoints(text: string | null | undefined): string[] {
  if (!text || typeof text !== 'string') return []
  const lines = text.split('\n')
  const bullets: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    const m = trimmed.match(/^(?:[-*+•]|\d+\.)\s+(.+)$/)
    if (m && m[1]) {
      const item = m[1].trim()
      if (item) bullets.push(item)
    }
  }
  return bullets
}

const props = withDefaults(defineProps<{
  /** 控制卡片显隐。默认：true */
  visible?: boolean
  /** 显式版本号，如 "v1.2.0" */
  version?: string | null
  /** 版本发布日期，如 "2026-10-18" */
  date?: string | null
  /** 更新日志正文（Markdown 字符串）。若未显式指定 bulletPoints，将自动提炼其中的列表项 */
  content?: string | null
  /** 手工指定的更新要点列表 */
  bulletPoints?: string[]
  /** 最多展示的 bullet 要点条数。默认：4 */
  maxBullets?: number
  /** 卡片标题。默认："✨ 新版本上线" */
  title?: string
  /** "查看完整更新日志 / 查看更多" 的外链 URL 或跳转目标。若传入则显示查看更多链接 */
  viewMoreUrl?: string
  /** "查看更多" 按钮或链接文案。默认："查看完整更新日志" */
  viewMoreText?: string
  /** "立即刷新" 按钮文案。默认："立即刷新" */
  refreshText?: string
  /** 是否允许关闭/暂不更新。默认：true */
  closable?: boolean
  /** 卡片布局：'floating'（右下角浮动卡片）或 'inline'（流式嵌入）。默认：'floating' */
  layout?: 'floating' | 'inline'
  /** 显式指定深色/浅色外观。null/undefined 则跟随系统的 prefers-color-scheme */
  dark?: boolean | null
}>(), {
  visible: true,
  version: null,
  date: null,
  content: null,
  bulletPoints: undefined,
  maxBullets: 4,
  title: '✨ 新版本上线',
  viewMoreUrl: '',
  viewMoreText: '查看完整更新日志',
  refreshText: '立即刷新',
  closable: true,
  layout: 'floating',
  dark: null,
})

const emit = defineEmits<{
  refresh: []
  viewMore: []
  close: []
}>()

const dismissed = ref(false)

// 当版本发生变化时，重置关闭状态
watch(() => props.version, () => {
  dismissed.value = false
})

const isShown = computed(() => props.visible && !dismissed.value)

const bullets = computed(() => {
  if (props.bulletPoints && props.bulletPoints.length > 0) {
    return props.bulletPoints
  }
  if (props.content) {
    return parseBulletPoints(props.content)
  }
  return []
})

const displayedBullets = computed(() => bullets.value.slice(0, props.maxBullets))
const remainingCount = computed(() => Math.max(0, bullets.value.length - props.maxBullets))

function handleClose() {
  dismissed.value = true
  emit('close')
}

function handleViewMore(e: Event) {
  emit('viewMore')
  if (!props.viewMoreUrl) {
    e.preventDefault()
  }
}
</script>

<template>
  <component :is="layout === 'floating' ? 'Teleport' : 'div'" :to="layout === 'floating' ? 'body' : undefined">
    <div
      v-if="isShown"
      class="rg-card-wrapper"
      :class="[
        layout === 'floating' ? 'rg-card-floating' : 'rg-card-inline',
        { 'rg-dark': dark === true, 'rg-light': dark === false }
      ]"
      role="region"
      aria-label="新版本更新通知"
    >
      <div class="rg-card">
        <!-- 头部区域 -->
        <div class="rg-card-header">
          <div class="rg-card-title-group">
            <span class="rg-card-title">{{ title }}</span>
            <span v-if="version" class="rg-card-badge">{{ version }}</span>
            <span v-if="date" class="rg-card-date">{{ date }}</span>
          </div>
          <button
            v-if="closable"
            type="button"
            class="rg-card-close"
            aria-label="关闭更新提示"
            @click="handleClose"
          >
            ✕
          </button>
        </div>

        <!-- 正文要点列表 -->
        <div class="rg-card-body">
          <ul v-if="displayedBullets.length > 0" class="rg-bullet-list">
            <li v-for="(b, i) in displayedBullets" :key="i" class="rg-bullet-item">
              <span class="rg-bullet-dot" aria-hidden="true">•</span>
              <span class="rg-bullet-text">{{ b }}</span>
            </li>
          </ul>
          <p v-else-if="content" class="rg-card-fallback-text">{{ content }}</p>
          <p v-else class="rg-card-fallback-text">系统已部署新版本，刷新页面即可使用最新功能与优化。</p>

          <div v-if="remainingCount > 0" class="rg-remaining-note">
            <span>还有 {{ remainingCount }} 项更新改进</span>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="rg-card-footer">
          <a
            v-if="viewMoreUrl || $attrs.onViewMore"
            :href="viewMoreUrl || 'javascript:void(0)'"
            class="rg-card-link"
            @click="handleViewMore"
          >
            {{ viewMoreText }} →
          </a>
          <span v-else class="rg-card-spacer" />

          <button
            type="button"
            class="rg-card-refresh-btn"
            @click="emit('refresh')"
          >
            {{ refreshText }}
          </button>
        </div>
      </div>
    </div>
  </component>
</template>

<style scoped>
.rg-card-wrapper {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.rg-card-floating {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9998;
  width: 360px;
  max-width: calc(100vw - 32px);
  animation: rg-slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.rg-card-inline {
  position: relative;
  width: 100%;
  margin: 12px 0;
}

@keyframes rg-slide-up {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.rg-card {
  padding: 16px 18px;
  border-radius: var(--rg-radius, 14px);
  background: var(--rg-card-bg, #ffffff);
  color: var(--rg-card-fg, #111827);
  border: 1px solid var(--rg-card-border, #e5e7eb);
  box-shadow: var(--rg-card-shadow, 0 10px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.05));
  backdrop-filter: blur(8px);
}

.rg-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rg-card-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rg-card-title {
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: inherit;
}

.rg-card-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: var(--rg-badge-bg, rgba(37, 99, 235, 0.1));
  color: var(--rg-badge-fg, #2563eb);
}

.rg-card-date {
  font-size: 11.5px;
  color: var(--rg-muted-fg, #6b7280);
}

.rg-card-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--rg-muted-fg, #9ca3af);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rg-card-close:hover {
  background: var(--rg-hover-bg, rgba(0, 0, 0, 0.06));
  color: var(--rg-card-fg, #111827);
}

.rg-card-body {
  margin-bottom: 14px;
}

.rg-bullet-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rg-bullet-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--rg-body-fg, #374151);
}

.rg-bullet-dot {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1.4;
  color: var(--rg-accent, #2563eb);
}

.rg-bullet-text {
  flex: 1;
  word-break: break-word;
}

.rg-card-fallback-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--rg-body-fg, #4b5563);
}

.rg-remaining-note {
  margin-top: 6px;
  padding-left: 12px;
  font-size: 11.5px;
  color: var(--rg-muted-fg, #6b7280);
}

.rg-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--rg-card-border, #f3f4f6);
}

.rg-card-spacer {
  flex: 1;
}

.rg-card-link {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--rg-accent, #2563eb);
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.rg-card-link:hover {
  opacity: 0.82;
  text-decoration: underline;
}

.rg-card-refresh-btn {
  padding: 6px 14px;
  border: none;
  border-radius: var(--rg-btn-radius, 8px);
  background: var(--rg-accent, #2563eb);
  color: var(--rg-accent-fg, #ffffff);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.rg-card-refresh-btn:hover {
  filter: brightness(0.92);
}

.rg-card-refresh-btn:active {
  transform: scale(0.98);
}

/* 深色模式适配 */
.rg-card-wrapper.rg-dark .rg-card {
  background: var(--rg-card-bg-dark, #1f2937);
  color: var(--rg-card-fg-dark, #f9fafb);
  border-color: var(--rg-card-border-dark, #374151);
  box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.4);
}
.rg-card-wrapper.rg-dark .rg-bullet-item { color: var(--rg-body-fg-dark, #d1d5db); }
.rg-card-wrapper.rg-dark .rg-card-badge { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.rg-card-wrapper.rg-dark .rg-card-footer { border-color: #374151; }
.rg-card-wrapper.rg-dark .rg-card-close:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

@media (prefers-color-scheme: dark) {
  .rg-card-wrapper:not(.rg-light) .rg-card {
    background: var(--rg-card-bg-dark, #1f2937);
    color: var(--rg-card-fg-dark, #f9fafb);
    border-color: var(--rg-card-border-dark, #374151);
    box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.4);
  }
  .rg-card-wrapper:not(.rg-light) .rg-bullet-item { color: var(--rg-body-fg-dark, #d1d5db); }
  .rg-card-wrapper:not(.rg-light) .rg-card-badge { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
  .rg-card-wrapper:not(.rg-light) .rg-card-footer { border-color: #374151; }
  .rg-card-wrapper:not(.rg-light) .rg-card-close:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
}
</style>
