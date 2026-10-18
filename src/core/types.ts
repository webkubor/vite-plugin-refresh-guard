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

export interface ChangelogVersionEntry {
  /** 版本号，例如 "v1.5.0" 或 "1.5.0" */
  version: string
  /** 发布日期，如 "2026-10-18"；若未标明日期的版本块则为 null */
  date: string | null
  /** 该版本块对应的 Markdown 正文（已剔除首行版本标题） */
  content: string
}

export interface ParsedChangelog {
  /** 最新版本的版本号，如 "v1.5.0"；无有效版本时为 null */
  latestVersion: string | null
  /** 最新版本的正文 Markdown 内容 */
  latestContent: string
  /** CHANGELOG 中按顺序解析的所有历史版本列表 */
  allVersions: ChangelogVersionEntry[]
}

export interface ChangelogFetchOptions {
  /** 模式：'fetch' 表示从远程 URL 拉取 changelog markdown 文件 */
  mode?: 'bake' | 'fetch'
  /** 运行时拉取的目标 URL。默认：'/CHANGELOG.md' */
  url?: string
}

export type ChangelogOption = string | boolean | ChangelogFetchOptions

export interface UpdateCardProps {
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
   * Changelog configuration:
   * - `{ mode: 'fetch', url: '/CHANGELOG.md' }`: fetch and parse changelog from static URL when an update is found
   * - string: custom URL to fetch changelog from (shorthand for `{ mode: 'fetch', url: ... }`)
   * - false: disable changelog handling
   */
  changelog?: ChangelogOption
  /**
   * Called whenever a new version is first detected, before any built-in UI/refresh behavior runs.
   * Return `false` to suppress the built-in reaction entirely and drive your own UI instead —
   * call `checker.applyUpdate()` yourself when ready.
   */
  onUpdateAvailable?: (info: VersionInfo) => void | boolean
  /** Called immediately before the actual page refresh happens (any mode). Good place to flush analytics, etc. */
  onBeforeRefresh?: () => void
}

export type UpdateEvent = 'update-available' | 'refreshing' | 'changelog-loaded'
export type UpdateListener = (data: any) => void
