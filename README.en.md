# vite-plugin-refresh-guard

[中文](./README.md) | English

[![CI](https://github.com/webkubor/vite-plugin-refresh-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/webkubor/vite-plugin-refresh-guard/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/vite-plugin-refresh-guard.svg)](https://www.npmjs.com/package/vite-plugin-refresh-guard)
[![license](https://img.shields.io/npm/l/vite-plugin-refresh-guard.svg)](./LICENSE)
[![vite](https://img.shields.io/badge/vite-%3E%3D4%20%3C9-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![vue](https://img.shields.io/badge/vue-%3E%3D3-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![react](https://img.shields.io/badge/react-%3E%3D18-61DAFB?logo=react&logoColor=white)](https://react.dev)

Configurable "there's a new version, here's what happens next" for Vite apps.

Most projects that solve this end up with one of three answers, usually picked by accident and
never revisited:

- **Silent** — just refresh in the background, the user never notices.
- **Toast, then auto-refresh** — a small non-blocking notice, then refresh after a short delay.
- **Blocking modal** — stop the user, make them click "update now" before they can continue.

This package makes that an explicit, per-project choice instead of copy-pasted glue code that
drifts every time someone touches it. Framework-agnostic core, thin Vue and React adapters.

## Install

```bash
npm i -D vite-plugin-refresh-guard
```

`vue`, `react`/`react-dom`, and `vite` are peer dependencies — install whichever you actually use.

## Quick start

**`vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import { refreshGuard } from 'vite-plugin-refresh-guard'

export default defineConfig({
  plugins: [refreshGuard()],
})
```

This does two things at build time:
1. Writes `version.json` into your build output (`{ version, buildId, commit, time }`).
2. Bakes the current version into your bundle as a global, `__REFRESH_GUARD_VERSION__`.

**Vue**

```vue
<script setup lang="ts">
import { useVersionCheck } from 'vite-plugin-refresh-guard/vue'
import UpdatePrompt from 'vite-plugin-refresh-guard/vue/UpdatePrompt.vue'
import { latestContent } from 'virtual:refresh-guard-changelog'
// import { isDark } from './your-theme-state' — pass this too if your site has a theme toggle

const { hasUpdate, latestInfo, applyUpdate, mode } = useVersionCheck(__REFRESH_GUARD_VERSION__, {
  mode: 'toast-auto', // 'silent' | 'toast-auto' | 'modal-blocking'
})
</script>

<template>
  <UpdatePrompt
    :visible="hasUpdate" :mode="mode" :version="latestInfo?.version"
    :changelog-html="latestContent"
    @refresh="applyUpdate"
  />
</template>
```

> Don't skip `:changelog-html` — without it, the `modal-blocking` prompt only shows a git hash and
> the user has no idea what actually changed. If your site has a dark mode, pass your theme state
> to `:dark` (e.g. `:dark="isDark"`) so the modal follows your site's own theme — otherwise it only
> follows the visitor's OS dark-mode setting, which can look broken (a light site with a dark modal).

**React**

```tsx
import { useVersionCheck } from 'vite-plugin-refresh-guard/react'
import { UpdatePrompt } from 'vite-plugin-refresh-guard/react/UpdatePrompt'
// import { latestContent } from 'virtual:refresh-guard-changelog' — wire this up however your React setup handles virtual modules

function App() {
  const { hasUpdate, latestInfo, applyUpdate, mode } = useVersionCheck(__REFRESH_GUARD_VERSION__, {
    mode: 'modal-blocking',
  })
  return (
    <UpdatePrompt
      visible={hasUpdate} mode={mode} version={latestInfo?.version}
      changelogHtml={latestContent}
      dark={isDarkMode /* pass your own theme state; omitting it always renders light */}
      onRefresh={applyUpdate}
    />
  )
}
}
```

Add `/// <reference types="vite-plugin-refresh-guard/client" />` to your `env.d.ts` (or wherever
your other `vite/client` reference lives) so TypeScript knows about `__REFRESH_GUARD_VERSION__`.

Don't want the prebuilt UI? Use `useVersionCheck`'s `hasUpdate`/`latestInfo`/`applyUpdate` and
render your own — the components are a starting point, not a requirement.

## Picking a mode

| Mode | User sees | When to use it |
|---|---|---|
| `silent` | Nothing. Refreshes in the background. | Internal tools, dashboards nobody's mid-task in. Pairs well with `vite-plugin-pwa`'s own `registerType: 'autoUpdate'` doing the same job at the service-worker level — you may not need this package's polling at all in that case, just wire `notifyExternalUpdate()` (see below) if you want changelog display too. |
| `toast-auto` (default) | A small corner notice, then refresh after `autoRefreshDelay` (default 1.2s). | Most consumer-facing apps. Gives the user a beat to notice, doesn't block them. |
| `modal-blocking` | A centered, non-dismissible prompt. Refresh only on click. | Apps where refreshing mid-task loses real work (a half-filled form, an in-progress upload), or where you want confirmation before applying (matches what we found in ModelGo's console app). |

You're not locked into version.json polling only — `checker.notifyExternalUpdate(info)` (also
exposed by both adapters) feeds an update signal from anywhere else into the same mode logic,
most usefully from `vite-plugin-pwa`'s `registerSW({ onNeedRefresh })` callback if you're also
running a service worker and want its update event to drive the same toast/modal instead of
(or in addition to) polling.

## Options

```ts
interface VersionCheckerOptions {
  versionUrl?: string          // default '/version.json'
  interval?: number            // default 5 minutes; 0 disables polling
  checkOnVisible?: boolean     // re-check on tab focus, default true
  mode?: 'silent' | 'toast-auto' | 'modal-blocking' // default 'toast-auto'
  autoRefreshDelay?: number    // toast-auto only, default 1200ms
  refreshCooldown?: number     // min ms between forced refreshes, default 90s — guards against reload loops
  guardChunkErrors?: boolean   // force-refresh once on a stale-chunk load failure, default true
  onUpdateAvailable?: (info) => void | boolean // return false to take over the UI yourself
  onBeforeRefresh?: () => void // flush analytics etc. right before location.reload()
}
```

Plugin options (`refreshGuard({ ... })`):

```ts
interface RefreshGuardPluginOptions {
  version?: string        // default: read from package.json
  includeCommit?: boolean // default true; silently omitted outside a git repo
  outFile?: string        // default 'version.json'
  changelog?: string | false // default 'CHANGELOG.md'; false disables the virtual module
}
```

## Changelog display (optional, decoupled from the refresh decision)

```ts
import { latestVersion, latestContent } from 'virtual:refresh-guard-changelog'
```

Parses `## vX.Y.Z (date)` headings (same format as Keep a Changelog / most auto-generated
changelogs) out of your `CHANGELOG.md` and exposes the latest section's version and markdown
body. This is independent of the refresh-trigger logic on purpose — showing "what's new" and
deciding "when do we reload" are different product decisions, and coupling them (as several
of the projects this package was extracted from originally did) is how you end up with two
mechanisms fighting each other.

## Why not just service workers?

`vite-plugin-pwa`'s `autoUpdate` mode is a perfectly good `silent` implementation if you're
already running a service worker — this package doesn't replace that. What it adds is: a
uniform way to also get a `toast-auto` or `modal-blocking` experience (which a bare service
worker can't give you a clean hook for without writing this exact plumbing yourself), a
non-PWA `version.json`-polling fallback for apps that don't want a service worker at all, and
the changelog-display layer. Use whichever pieces you need; they're independent.

## License

MIT
