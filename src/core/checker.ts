import type { UpdateEvent, UpdateListener, VersionCheckerOptions, VersionInfo, ParsedChangelog } from './types'
import { fetchChangelog, parseChangelog, extractBulletPoints } from './changelog'

export { fetchChangelog, parseChangelog, extractBulletPoints }
export type { ParsedChangelog, ChangelogVersionEntry } from './changelog'

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
const CACHE_BUSTER = 't'

/**
 * The build id baked in by the plugin's `define`. Absent outside a Vite build (unit tests, SSR
 * without the plugin, a hand-rolled setup), so `typeof` — not a bare reference — is required:
 * an undeclared identifier would throw instead of reading as `undefined`.
 */
function readBakedBuildId(): string | undefined {
  return typeof __REFRESH_GUARD_BUILD_ID__ !== 'undefined' ? __REFRESH_GUARD_BUILD_ID__ : undefined
}

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
  private buildId: string | undefined
  private timer: ReturnType<typeof setInterval> | null = null
  private autoRefreshTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Map<UpdateEvent, Set<UpdateListener>>()
  private _hasUpdate = false
  private _latestInfo: VersionInfo | null = null
  private _changelog: ParsedChangelog | null = null
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
    // `??` not `||`: an empty-string buildId is a deliberate "compare by version instead".
    this.buildId = options.buildId ?? readBakedBuildId()
  }

  get hasUpdate() { return this._hasUpdate }
  get latestInfo() { return this._latestInfo }
  get changelog() { return this._changelog }

  /**
   * 运行时拉取并解析 CHANGELOG 文件。
   * 若配置了 `changelog: { mode: 'fetch', url: '...' }`，在发现新版本时会自动触发；
   * 业务层也可主动调用此方法拉取完整历史日志列表。
   */
  async fetchChangelog(customUrl?: string): Promise<ParsedChangelog> {
    const rawOpt = this.opts.changelog
    let url = '/CHANGELOG.md'
    if (customUrl) {
      url = customUrl
    } else if (typeof rawOpt === 'string') {
      url = rawOpt
    } else if (rawOpt && typeof rawOpt === 'object' && rawOpt.url) {
      url = rawOpt.url
    }
    const result = await fetchChangelog(url)
    this._changelog = result
    this.emit('changelog-loaded', result)
    return result
  }

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

  /**
   * Fetch versionUrl now and react if it differs from the running build. Returns whether an
   * update was found.
   *
   * `cache: 'no-store'` only defeats the browser cache — a CDN or reverse proxy (or a service
   * worker) in front of version.json can keep handing back a stale copy indefinitely, so the
   * request also carries a cache-buster query.
   */
  async checkNow(): Promise<boolean> {
    let info: VersionInfo
    try {
      const url = this.opts.versionUrl
      const sep = url.includes('?') ? '&' : '?'
      const resp = await fetch(`${url}${sep}${CACHE_BUSTER}=${Date.now()}`, { cache: 'no-store' })
      if (!resp.ok) return false
      info = await resp.json()
    } catch {
      return false // offline / transient network error — try again next tick, don't crash the app over it
    }
    if (!info?.version) return false
    // Build id first: it identifies the deployment, while version only identifies the release.
    // Two deploys that never bumped package.json — or a rollback — are invisible to a version
    // compare, and that silence is the failure nobody notices.
    const changed = this.buildId && info.buildId
      ? info.buildId !== this.buildId
      : info.version !== this.currentVersion
    if (!changed) return false
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

    // 若配置了运行时 fetch changelog，自动异步拉取
    const rawChangelog = this.opts.changelog
    const shouldFetch = rawChangelog && (
      typeof rawChangelog === 'string' ||
      (typeof rawChangelog === 'object' && rawChangelog.mode === 'fetch')
    )
    if (shouldFetch) {
      void this.fetchChangelog()
    }

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

  /**
   * Refresh now (what 'modal-blocking' UIs call on button click). Respects the cooldown guard,
   * which exists to stop *automatic* reload loops: pass `{ force: true }` — or call `refreshNow()`
   * — for an explicit user action, otherwise a click inside the cooldown window does nothing,
   * which reads as a dead button.
   */
  applyUpdate(options: { force?: boolean } = {}) {
    if (typeof window === 'undefined') return
    const last = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0)
    if (!options.force && Date.now() - last < this.opts.refreshCooldown) return
    this.opts.onBeforeRefresh?.()
    this.emit('refreshing', this._latestInfo)
    // Written last: a throwing onBeforeRefresh/refresh listener must not arm the cooldown and
    // leave the page un-refreshed and un-refreshable for the next `refreshCooldown` ms.
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    window.location.reload()
  }

  /** "立即刷新" click: a human asking for it outranks the loop guard. */
  refreshNow() {
    this.applyUpdate({ force: true })
  }

  on(event: UpdateEvent, listener: UpdateListener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(listener)
    return () => this.listeners.get(event)?.delete(listener)
  }

  private emit(event: UpdateEvent, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data))
  }
}
