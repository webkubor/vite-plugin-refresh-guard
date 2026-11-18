/** Baked in by the `refreshGuard()` Vite plugin's `define`. Pass this straight into `useVersionCheck()` / `new UpdateChecker()`. */
declare const __REFRESH_GUARD_VERSION__: string

/**
 * This build's deployment identity (the git short SHA, or a timestamp when git isn't available).
 * Baked in by the plugin's `define`; `UpdateChecker` reads it automatically when you don't pass
 * `buildId` explicitly. Comparing it against `version.json` is what catches redeploys that kept
 * the same `package.json` version.
 */
declare const __REFRESH_GUARD_BUILD_ID__: string | undefined

declare module 'virtual:refresh-guard-changelog' {
  /** Latest version heading found in your changelog file, or null if none/disabled. */
  export const latestVersion: string | null
  /** Markdown body of that version's section (unprocessed), or '' if none/disabled. */
  export const latestContent: string
  /** All parsed version entries from your changelog file in chronological order. */
  export const allVersions: Array<{
    version: string
    date: string | null
    content: string
  }>
  /** Configured static changelog URL when mode is 'fetch', or undefined */
  export const changelogUrl: string | undefined
}
