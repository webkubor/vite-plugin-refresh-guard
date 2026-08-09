import { createPortal } from 'react-dom'
import type { UpdateMode } from '../core/types'

export interface UpdatePromptProps {
  visible: boolean
  mode?: UpdateMode
  /** Optional: e.g. `latestVersion` from `virtual:refresh-guard-changelog`. */
  version?: string | null
  /** Optional: e.g. `latestContent` from `virtual:refresh-guard-changelog`, rendered via dangerouslySetInnerHTML — pre-sanitize if it isn't your own trusted file. */
  changelogHtml?: string
  onRefresh: () => void
}

// 'silent' has no UI by design — the checker just reloads in the background.
export function UpdatePrompt({ visible, mode = 'toast-auto', version = null, changelogHtml = '', onRefresh }: UpdatePromptProps) {
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

  // modal-blocking: no backdrop-click handler on purpose — this is meant to be non-dismissible.
  return createPortal(
    <div style={styles.overlay} role="alertdialog" aria-modal="true">
      <div style={styles.modal}>
        <h3 style={styles.title}>有新版本可用{version ? `：${version}` : ''}</h3>
        {changelogHtml
          ? <div style={styles.body} dangerouslySetInnerHTML={{ __html: changelogHtml }} />
          : <p style={{ ...styles.body, color: '#6b7280' }}>刷新页面即可使用最新版本。</p>}
        <button type="button" style={styles.primaryBtn} onClick={onRefresh}>立即更新</button>
      </div>
    </div>,
    document.body,
  )
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', borderRadius: 8,
    background: '#1f2937', color: '#fff', fontSize: 13,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  toastBtn: {
    flexShrink: 0, padding: '4px 10px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
    color: '#fff', fontSize: 12, cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)',
  },
  modal: {
    width: '90vw', maxWidth: 420, padding: 24, borderRadius: 12,
    background: '#fff', color: '#111827', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
  },
  title: { margin: '0 0 12px', fontSize: 16, fontWeight: 700 },
  body: { margin: '0 0 20px', fontSize: 13, lineHeight: 1.6, color: '#4b5563', maxHeight: '40vh', overflowY: 'auto' },
  primaryBtn: {
    width: '100%', padding: 10, border: 'none', borderRadius: 8,
    background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
