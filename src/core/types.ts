export type UpdateMode = 'silent' | 'toast-auto' | 'modal-blocking'

export interface VersionInfo {
  version: string
  buildId?: string
  commit?: string
  time?: string
}

export interface ChangelogInfo {
  /** Latest version heading found in the changelog, e.g. "v1.5.0" */
  version: string
  /** Rendered body for that version's section (markdown, unprocessed) */
  content: string
}

export interface VersionCheckerOptions {
  /** Where to fetch version info from. Default: '/version.json' (see the Vite plugin, which emits this file at build time). */
  versionUrl?: string
  /** Poll interval in ms. Default: 5 minutes. Set to 0 to disable polling (e.g. if you only drive checks from a service-worker hook). */
  interval?: number
  /** Re-check when the tab becomes visible again after being hidden. Default: true. */
  checkOnVisible?: boolean
  /**
   * How to react when a new version is detected — this is the one knob most projects actually need:
   * - 'silent': just refresh in the background next time it's safe to (no UI). Matches hym-admin's PWA autoUpdate.
   * - 'toast-auto': show a small non-blocking notice, then auto-refresh after `autoRefreshDelay`. Matches Studio.
   * - 'modal-blocking': show a blocking prompt; user must click to refresh. Matches modelgo-console-web.
   * Default: 'toast-auto'.
   */
  mode?: UpdateMode
  /** For 'toast-auto': delay before the automatic refresh fires, in ms. Default: 1200. */
  autoRefreshDelay?: number
  /**
   * Minimum time between forced refreshes, in ms — guards against reload loops when the server
   * keeps serving a "new" version.json (misconfigured cache headers, clock skew, etc.). Default: 90s.
   */
  refreshCooldown?: number
  /**
   * Also refresh once when a lazy-loaded chunk fails to load (stale HTML pointing at a JS/CSS
   * hash that a new deploy already removed). Listens for `vite:preloadError` plus the matching
   * dynamic-import rejection pattern. Default: true.
   */
  guardChunkErrors?: boolean
  /**
   * Called whenever a new version is first detected, before any built-in UI/refresh behavior runs.
   * Return `false` to suppress the built-in reaction entirely and drive your own UI instead —
   * call `checker.applyUpdate()` yourself when ready.
   */
  onUpdateAvailable?: (info: VersionInfo) => void | boolean
  /** Called immediately before the actual page refresh happens (any mode). Good place to flush analytics, etc. */
  onBeforeRefresh?: () => void
}

export type UpdateEvent = 'update-available' | 'refreshing'
export type UpdateListener = (info: VersionInfo | null) => void
