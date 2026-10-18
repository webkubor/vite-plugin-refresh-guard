import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { extractBulletPoints } from '../core/changelog'
import type { UpdateCardProps } from '../core/types'

export interface ReactUpdateCardProps extends UpdateCardProps {
  onRefresh?: () => void
  onViewMore?: () => void
  onClose?: () => void
}

export function UpdateCard({
  visible = true,
  version = null,
  date = null,
  content = null,
  bulletPoints,
  maxBullets = 4,
  title = '✨ 新版本上线',
  viewMoreUrl = '',
  viewMoreText = '查看完整更新日志',
  refreshText = '立即刷新',
  closable = true,
  layout = 'floating',
  dark = false,
  onRefresh,
  onViewMore,
  onClose,
}: ReactUpdateCardProps) {
  const [dismissed, setDismissed] = useState(false)

  // 当版本号变动时重置关闭状态
  useEffect(() => {
    setDismissed(false)
  }, [version])

  if (!visible || dismissed) return null

  const bullets = (bulletPoints && bulletPoints.length > 0)
    ? bulletPoints
    : (content ? extractBulletPoints(content) : [])

  const displayedBullets = bullets.slice(0, maxBullets)
  const remainingCount = Math.max(0, bullets.length - maxBullets)

  const handleClose = () => {
    setDismissed(true)
    onClose?.()
  }

  const handleViewMore = (e: React.MouseEvent) => {
    onViewMore?.()
    if (!viewMoreUrl) {
      e.preventDefault()
    }
  }

  const cardStyle = {
    ...styles.card,
    ...(dark ? styles.cardDark : {}),
  }

  const cardContent = (
    <div
      style={layout === 'floating' ? styles.wrapperFloating : styles.wrapperInline}
      role="region"
      aria-label="新版本更新通知"
    >
      <div style={cardStyle}>
        {/* 头部区域 */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={styles.title}>{title}</span>
            {version && <span style={dark ? { ...styles.badge, ...styles.badgeDark } : styles.badge}>{version}</span>}
            {date && <span style={styles.date}>{date}</span>}
          </div>
          {closable && (
            <button
              type="button"
              style={styles.closeBtn}
              aria-label="关闭更新提示"
              onClick={handleClose}
            >
              ✕
            </button>
          )}
        </div>

        {/* 要点列表 */}
        <div style={styles.body}>
          {displayedBullets.length > 0 ? (
            <ul style={styles.list}>
              {displayedBullets.map((b, i) => (
                <li key={i} style={styles.listItem}>
                  <span style={styles.bulletDot} aria-hidden="true">•</span>
                  <span style={dark ? { ...styles.bulletText, ...styles.bulletTextDark } : styles.bulletText}>{b}</span>
                </li>
              ))}
            </ul>
          ) : content ? (
            <p style={dark ? { ...styles.fallbackText, ...styles.fallbackTextDark } : styles.fallbackText}>{content}</p>
          ) : (
            <p style={dark ? { ...styles.fallbackText, ...styles.fallbackTextDark } : styles.fallbackText}>
              系统已部署新版本，刷新页面即可使用最新功能与优化。
            </p>
          )}

          {remainingCount > 0 && (
            <div style={styles.remaining}>
              还有 {remainingCount} 项更新改进
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div style={dark ? { ...styles.footer, ...styles.footerDark } : styles.footer}>
          {viewMoreUrl || onViewMore ? (
            <a
              href={viewMoreUrl || 'javascript:void(0)'}
              style={styles.link}
              onClick={handleViewMore}
            >
              {viewMoreText} →
            </a>
          ) : (
            <span style={{ flex: 1 }} />
          )}

          <button
            type="button"
            style={styles.refreshBtn}
            onClick={onRefresh}
          >
            {refreshText}
          </button>
        </div>
      </div>
    </div>
  )

  if (layout === 'floating' && typeof document !== 'undefined') {
    return createPortal(cardContent, document.body)
  }

  return cardContent
}

const styles: Record<string, React.CSSProperties> = {
  wrapperFloating: {
    position: 'fixed',
    right: 20,
    bottom: 20,
    zIndex: 9998,
    width: 360,
    maxWidth: 'calc(100vw - 32px)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  wrapperInline: {
    position: 'relative',
    width: '100%',
    margin: '12px 0',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  card: {
    padding: '16px 18px',
    borderRadius: 'var(--rg-radius, 14px)',
    background: 'var(--rg-card-bg, #ffffff)',
    color: 'var(--rg-card-fg, #111827)',
    border: '1px solid var(--rg-card-border, #e5e7eb)',
    boxShadow: 'var(--rg-card-shadow, 0 10px 30px -4px rgba(0,0,0,0.12), 0 4px 10px -2px rgba(0,0,0,0.05))',
  },
  cardDark: {
    background: 'var(--rg-card-bg-dark, #1f2937)',
    color: 'var(--rg-card-fg-dark, #f9fafb)',
    borderColor: 'var(--rg-card-border-dark, #374151)',
    boxShadow: '0 10px 30px -4px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 14.5,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: 'inherit',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    background: 'var(--rg-badge-bg, rgba(37,99,235,0.1))',
    color: 'var(--rg-badge-fg, #2563eb)',
  },
  badgeDark: {
    background: 'rgba(59,130,246,0.2)',
    color: '#60a5fa',
  },
  date: {
    fontSize: 11.5,
    color: 'var(--rg-muted-fg, #6b7280)',
  },
  closeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    padding: 0,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--rg-muted-fg, #9ca3af)',
    fontSize: 13,
    cursor: 'pointer',
  },
  body: {
    marginBottom: 14,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontSize: 13,
    lineHeight: 1.5,
  },
  bulletDot: {
    flexShrink: 0,
    fontSize: 14,
    lineHeight: 1.4,
    color: 'var(--rg-accent, #2563eb)',
  },
  bulletText: {
    flex: 1,
    wordBreak: 'break-word',
    color: 'var(--rg-body-fg, #374151)',
  },
  bulletTextDark: {
    color: 'var(--rg-body-fg-dark, #d1d5db)',
  },
  fallbackText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.55,
    color: 'var(--rg-body-fg, #4b5563)',
  },
  fallbackTextDark: {
    color: 'var(--rg-body-fg-dark, #d1d5db)',
  },
  remaining: {
    marginTop: 6,
    paddingLeft: 12,
    fontSize: 11.5,
    color: 'var(--rg-muted-fg, #6b7280)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTop: '1px solid var(--rg-card-border, #f3f4f6)',
  },
  footerDark: {
    borderTopColor: '#374151',
  },
  link: {
    fontSize: 12.5,
    fontWeight: 500,
    color: 'var(--rg-accent, #2563eb)',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  refreshBtn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: 'var(--rg-btn-radius, 8px)',
    background: 'var(--rg-accent, #2563eb)',
    color: 'var(--rg-accent-fg, #ffffff)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
}
