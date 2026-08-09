import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

export interface RefreshGuardPluginOptions {
  /** Version string to bake into version.json and the `__REFRESH_GUARD_VERSION__` define. Default: read from the project's package.json. */
  version?: string
  /** Include the short git commit hash in version.json. Default: true — silently omitted outside a git repo (e.g. a tarball deploy), never throws. */
  includeCommit?: boolean
  /** Filename for the emitted version manifest, relative to the build output dir. Default: 'version.json'. */
  outFile?: string
  /**
   * Path (relative to project root) to a changelog file to expose via `import { latestVersion, latestContent } from 'virtual:refresh-guard-changelog'`.
   * Expects `## vX.Y.Z (date)` section headings, same format as Keep a Changelog. Default: 'CHANGELOG.md'. Set to `false` to disable the virtual module entirely.
   */
  changelog?: string | false
}

const VIRTUAL_ID = 'virtual:refresh-guard-changelog'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

function readChangelog(root: string, changelogOption: string | false | undefined) {
  if (changelogOption === false) return { latestVersion: null, latestContent: '' }
  const path = resolve(root, changelogOption || 'CHANGELOG.md')
  if (!existsSync(path)) return { latestVersion: null, latestContent: '' }
  const md = readFileSync(path, 'utf-8')
  const heading = md.match(/^##\s+(v?[\d.]+)/m)
  if (!heading) return { latestVersion: null, latestContent: '' }
  const sections = md.split(/^## /m)
  const body = sections.length > 1 ? sections[1].replace(/^v?[\d.]+\s*\(.*?\)\s*\n?/, '').trim() : ''
  return { latestVersion: heading[1], latestContent: body }
}

/**
 * Vite plugin half of refresh-guard: bakes the current build's version into your bundle
 * (as `__REFRESH_GUARD_VERSION__`) and emits a `version.json` manifest that the runtime
 * checker (core/checker.ts, or the Vue/React adapters) polls to detect new deploys.
 *
 * Only runs at build time — `version.json` won't exist under plain `vite dev`, which is fine
 * since HMR already covers that case; point a static-file server or `vite preview` at the
 * build output to see it end to end.
 */
export function refreshGuard(options: RefreshGuardPluginOptions = {}): Plugin {
  let config: ResolvedConfig
  let version = options.version
  const buildId = String(Date.now())
  let commit = ''

  return {
    name: 'vite-plugin-refresh-guard',
    // `config()` runs before `configResolved()` — the version has to be settled here, not there,
    // because the `define` this hook returns is what actually bakes __REFRESH_GUARD_VERSION__
    // into the client bundle. Resolving it later would just be too late to matter.
    config(userConfig) {
      const root = userConfig.root || process.cwd()
      if (!version) {
        try {
          const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
          version = pkg.version || '0.0.0'
        } catch {
          version = '0.0.0'
        }
      }
      return { define: { __REFRESH_GUARD_VERSION__: JSON.stringify(version) } }
    },
    configResolved(resolvedConfig) {
      config = resolvedConfig
      if (options.includeCommit !== false) {
        try {
          commit = execSync('git rev-parse --short HEAD', { cwd: config.root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
        } catch {
          commit = '' // not a git repo / git unavailable — version.json just omits it
        }
      }
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return
      const { latestVersion, latestContent } = readChangelog(config.root, options.changelog)
      return `export const latestVersion = ${JSON.stringify(latestVersion)};\nexport const latestContent = ${JSON.stringify(latestContent)};\n`
    },
    generateBundle() {
      const manifest = {
        version: version ?? '0.0.0',
        buildId,
        commit: commit || undefined,
        time: new Date().toISOString(),
      }
      this.emitFile({
        type: 'asset',
        fileName: options.outFile || 'version.json',
        source: JSON.stringify(manifest, null, 2),
      })
    },
  }
}

export default refreshGuard
