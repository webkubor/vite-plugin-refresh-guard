# Changelog

## v0.1.0 (2026-08-09)

Initial release.

- Vite plugin: emits `version.json` at build time, bakes `__REFRESH_GUARD_VERSION__` into the bundle, optional `virtual:refresh-guard-changelog` module
- Framework-agnostic `UpdateChecker` core: polling + visibility re-check + stale-chunk guard + reload-loop cooldown
- Three configurable modes: `silent`, `toast-auto` (default), `modal-blocking`
- Vue composable + `UpdatePrompt.vue`
- React hook + `UpdatePrompt` component
- `notifyExternalUpdate()` escape hatch to drive the same mode logic from `vite-plugin-pwa`'s `onNeedRefresh` or any other external signal
