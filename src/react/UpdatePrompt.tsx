import { createPortal } from 'react-dom'
import type { UpdateMode } from '../core/types'

export interface UpdatePromptProps {
  visible: boolean
  mode?: UpdateMode
  /** Optional: e.g. `latestVersion` from `virtual:refresh-guard-changelog`. */
  version?: string | null
  /** Optional: e.g. `latestContent` from `virtual:refresh-guard-changelog`, rendered via dangerouslySetInnerHTML — pre-sanitize if it isn't your own trusted file. */
  changelogHtml?: string
  /**
   * Explicitly light/dark instead of always rendering light. Pass your app's own theme state
   * here (e.g. a `useDarkMode()` hook's value) so this modal matches your site's actual theme
   * toggle. Inline styles can't follow the OS `prefers-color-scheme` on their own, so leaving
   * this unset always renders light — pass it explicitly if your app supports dark mode.
   */
  dark?: boolean
  onRefresh: () => void
}

// 'silent' has no UI by design — the checker just reloads in the background.
export function UpdatePrompt({ visible, mode = 'toast-auto', version = null, changelogHtml = '', dark = false, onRefresh }: UpdatePromptProps) {
  if (!visible || mode === 'silent' || typeof document === 'undefined') return null

  if (mode === 'toast-auto') {
    return createPortal(
      <div style={styles.toast} role="status">
        <span>发现新版本{version ? ` ${version}` : ''}，即将自动刷新…</span>
        <button type="button" style={styles.toastBtn} onClick={onRefresh}>立即刷新</button>
      </div>,
      document.body,
    )
  }

  const modalStyle = dark ? { ...styles.modal, ...styles.modalDark } : styles.modal
  const bodyStyle = dark ? { ...styles.body, ...styles.bodyDark } : styles.body

  // modal-blocking: no backdrop-click handler on purpose — this is meant to be non-dismissible.
  return createPortal(
    <div style={styles.overlay} role="alertdialog" aria-modal="true">
      <div style={modalStyle}>
        <h3 style={styles.title}>✨ 有新版本可用{version ? `：${version}` : ''}</h3>
        {changelogHtml
          ? <div style={bodyStyle} dangerouslySetInnerHTML={{ __html: changelogHtml }} />
          : <p style={{ ...bodyStyle, color: dark ? 'var(--rg-body-fg-dark, #9ca3af)' : 'var(--rg-body-fg, #6b7280)' }}>刷新页面即可使用最新版本。</p>}
        <button type="button" style={styles.primaryBtn} onClick={onRefresh}>立即更新</button>
      </div>
    </div>,
    document.body,
  )
}

// Every color/radius reads `var(--rg-*, fallback)` first — set these on any ancestor in your
// own app to re-skin the component to your brand instead of living with generic blue-on-white.
// See README "Styling".
const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', borderRadius: 'var(--rg-radius, 10px)',
    background: 'var(--rg-toast-bg, #1f2937)', color: 'var(--rg-toast-fg, #fff)', fontSize: 13,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  toastBtn: {
    flexShrink: 0, padding: '4px 10px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
    color: 'inherit', fontSize: 12, cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--rg-overlay-bg, rgba(15,15,20,0.55))',
  },
  modal: {
    width: '90vw', maxWidth: 420, padding: 28, borderRadius: 'var(--rg-radius, 16px)',
    background: 'var(--rg-modal-bg, #fff)', color: 'var(--rg-modal-fg, #111827)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08)',
  },
  modalDark: {
    background: 'var(--rg-modal-bg-dark, #1f2937)', color: 'var(--rg-modal-fg-dark, #f3f4f6)',
  },
  title: { margin: '0 0 14px', fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' },
  body: { margin: '0 0 22px', fontSize: 13.5, lineHeight: 1.7, color: 'var(--rg-body-fg, #4b5563)', maxHeight: '40vh', overflowY: 'auto' },
  bodyDark: { color: 'var(--rg-body-fg-dark, #d1d5db)' },
  primaryBtn: {
    width: '100%', padding: 11, border: 'none', borderRadius: 'var(--rg-btn-radius, 10px)',
    background: 'var(--rg-accent, #2563eb)', color: 'var(--rg-accent-fg, #fff)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
