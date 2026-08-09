import type { UpdateEvent, UpdateListener, VersionCheckerOptions, VersionInfo } from './types'

const DEFAULTS: Required<Pick<VersionCheckerOptions,
  'versionUrl' | 'interval' | 'checkOnVisible' | 'mode' | 'autoRefreshDelay' | 'refreshCooldown' | 'guardChunkErrors'
>> = {
  versionUrl: '/version.json',
  interval: 5 * 60 * 1000,
  checkOnVisible: true,
  mode: 'toast-auto',
  autoRefreshDelay: 1200,
  refreshCooldown: 90 * 1000,
  guardChunkErrors: true,
}

const COOLDOWN_KEY = '__refresh_guard_last_refresh__'

// Matches Vite's own chunk-load failure signals: the `vite:preloadError` event it dispatches,
// and the browser's rejection message when a dynamically-imported module 404s because a new
// deploy already removed the old hashed file. Both mean "this tab is running stale HTML."
const CHUNK_ERROR_PATTERN = /error loading dynamically imported module|failed to fetch dynamically imported module/i

/**
 * Framework-agnostic engine: polls (or is told about) a new version, decides whether to refresh
 * based on `mode`, and guards against reload loops / stale-chunk white-screens. Vue/React
 * adapters are thin wrappers around this — use it directly if you're on something else.
 */
export class UpdateChecker {
  private opts: Required<Pick<VersionCheckerOptions,
    'versionUrl' | 'interval' | 'checkOnVisible' | 'mode' | 'autoRefreshDelay' | 'refreshCooldown' | 'guardChunkErrors'
  >> & VersionCheckerOptions
  private currentVersion: string
  private timer: ReturnType<typeof setInterval> | null = null
  private autoRefreshTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Map<UpdateEvent, Set<UpdateListener>>()
  private _hasUpdate = false
  private _latestInfo: VersionInfo | null = null
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') void this.checkNow()
  }
  private chunkErrorHandler = (event: Event | PromiseRejectionEvent) => {
    const message = 'reason' in event ? String((event as PromiseRejectionEvent).reason?.message || (event as PromiseRejectionEvent).reason) : ''
    if (event.type === 'vite:preloadError' || CHUNK_ERROR_PATTERN.test(message)) {
      event.preventDefault?.()
      this.applyUpdate()
    }
  }

  /** @param currentVersion The version baked into *this* running build (e.g. `__APP_VERSION__` from your Vite define, or package.json version). */
  constructor(currentVersion: string, options: VersionCheckerOptions = {}) {
    this.currentVersion = currentVersion
    this.opts = { ...DEFAULTS, ...options }
  }

  get hasUpdate() { return this._hasUpdate }
  get latestInfo() { return this._latestInfo }

  start() {
    if (typeof window === 'undefined') return // no-op during SSR
    if (this.opts.interval > 0) {
      this.timer = setInterval(() => void this.checkNow(), this.opts.interval)
    }
    if (this.opts.checkOnVisible) {
      document.addEventListener('visibilitychange', this.visibilityHandler)
    }
    if (this.opts.guardChunkErrors) {
      window.addEventListener('vite:preloadError', this.chunkErrorHandler)
      window.addEventListener('unhandledrejection', this.chunkErrorHandler)
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    if (this.autoRefreshTimer) clearTimeout(this.autoRefreshTimer)
    document.removeEventListener('visibilitychange', this.visibilityHandler)
    window.removeEventListener('vite:preloadError', this.chunkErrorHandler)
    window.removeEventListener('unhandledrejection', this.chunkErrorHandler)
  }

  /** Fetch versionUrl now and react if it differs from the running build. Returns whether an update was found. */
  async checkNow(): Promise<boolean> {
    let info: VersionInfo
    try {
      const resp = await fetch(this.opts.versionUrl, { cache: 'no-store' })
      if (!resp.ok) return false
      info = await resp.json()
    } catch {
      return false // offline / transient network error — try again next tick, don't crash the app over it
    }
    if (!info?.version || info.version === this.currentVersion) return false
    this.handleUpdateFound(info)
    return true
  }

  /**
   * Feed an update signal from somewhere other than version.json polling — most commonly
   * vite-plugin-pwa's `onNeedRefresh` callback. Goes through the same mode logic as checkNow().
   */
  notifyExternalUpdate(info: VersionInfo = { version: 'unknown' }) {
    this.handleUpdateFound(info)
  }

  private handleUpdateFound(info: VersionInfo) {
    if (this._hasUpdate) return // already surfaced, don't re-trigger toasts/timers
    this._hasUpdate = true
    this._latestInfo = info
    const suppress = this.opts.onUpdateAvailable?.(info) === false
    this.emit('update-available', info)
    if (suppress) return

    if (this.opts.mode === 'silent') {
      this.applyUpdate()
    } else if (this.opts.mode === 'toast-auto') {
      this.autoRefreshTimer = setTimeout(() => this.applyUpdate(), this.opts.autoRefreshDelay)
    }
    // 'modal-blocking': do nothing further here — caller's UI calls applyUpdate() on click.
  }

  /** Force the refresh now (what 'modal-blocking' UIs call on button click). Respects the cooldown guard. */
  applyUpdate() {
    if (typeof window === 'undefined') return
    const last = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0)
    if (Date.now() - last < this.opts.refreshCooldown) return // inside cooldown — avoid a refresh loop
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    this.opts.onBeforeRefresh?.()
    this.emit('refreshing', this._latestInfo)
    window.location.reload()
  }

  on(event: UpdateEvent, listener: UpdateListener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener)
    return () => this.listeners.get(event)?.delete(listener)
  }

  private emit(event: UpdateEvent, info: VersionInfo | null) {
    this.listeners.get(event)?.forEach(cb => cb(info))
  }
}
