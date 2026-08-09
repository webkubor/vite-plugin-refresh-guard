/** Baked in by the `refreshGuard()` Vite plugin's `define`. Pass this straight into `useVersionCheck()` / `new UpdateChecker()`. */
declare const __REFRESH_GUARD_VERSION__: string

declare module 'virtual:refresh-guard-changelog' {
  /** Latest version heading found in your changelog file, or null if none/disabled. */
  export const latestVersion: string | null
  /** Markdown body of that version's section (unprocessed), or '' if none/disabled. */
  export const latestContent: string
}
