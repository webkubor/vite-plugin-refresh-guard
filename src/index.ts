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

/**
 * 读取 CHANGELOG 最新版本的版本号与正文（导出供测试复用；接入方不需要直接用）。
 */
export function readChangelog(root: string, changelogOption: string | false | undefined) {
  if (changelogOption === false) return { latestVersion: null, latestContent: '' }
  const path = resolve(root, changelogOption || 'CHANGELOG.md')
  if (!existsSync(path)) return { latestVersion: null, latestContent: '' }
  const md = readFileSync(path, 'utf-8')
  const heading = md.match(/^##\s+(v?[\d.]+)/m)
  if (!heading) return { latestVersion: null, latestContent: '' }
  const sections = md.split(/^## /m)
  // 剔除块首的版本标题行：兼容「## v1.2.0 (2026-08-13)」和「## 1.2.0」两种写法
  const body = sections.length > 1 ? sections[1].replace(/^v?[\d.]+\s*(?:\(.*?\))?\s*\n?/, '').trim() : ''
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
  // changelog 绝对路径（dev 下热更新要监听它）；changelog:false 时为空串
  let changelogPath = ''

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
      changelogPath = options.changelog === false ? '' : resolve(config.root, options.changelog || 'CHANGELOG.md')
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
      // 声明这个文件是虚拟模块的依赖：root 内的文件已被 chokidar 覆盖（no-op），
      // root 外的 changelog 靠它强制注册监听，文件一变 HMR 才收得到事件
      if (changelogPath) this.addWatchFile(changelogPath)
      const { latestVersion, latestContent } = readChangelog(config.root, options.changelog)
      return `export const latestVersion = ${JSON.stringify(latestVersion)};\nexport const latestContent = ${JSON.stringify(latestContent)};\n`
    },
    /**
     * dev 下 CHANGELOG.md 变化 → invalidate 虚拟模块并返回它，让 Vite 走默认 updateModules
     * 给 importers 推 js-update，页面不用重启就能拿到最新更新日志。
     *
     * 兼容 Vite 4-8：Vite 6+ 用 per-environment `hotUpdate`（environment 在 this.environment，
     * 触发文件在 options.file）；Vite 4-5 用旧版 `handleHotUpdate(ctx)`（ctx.file + ctx.server.moduleGraph）。
     * 两个钩子都实现，各自能跑到的版本走各自的，跑不到的会被 Vite 忽略。
     */
    hotUpdate(options) {
      if (!changelogPath) return
      const mod = this.environment.moduleGraph?.getModuleById(RESOLVED_VIRTUAL_ID)
      if (options.file === changelogPath && mod) {
        this.environment.moduleGraph.invalidateModule(mod)
        return [mod]
      }
    },
    handleHotUpdate(ctx) {
      if (!changelogPath) return
      if (ctx.file !== changelogPath) return
      // Vite 6+ 的 per-environment 钩子已经处理过；这里兜底 Vite 4-5
      const graph = ctx.server.moduleGraph
      const mod = graph.getModuleById(RESOLVED_VIRTUAL_ID)
      if (mod) {
        graph.invalidateModule(mod)
        return [mod]
      }
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
