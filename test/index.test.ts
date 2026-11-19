import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readChangelog } from '../src/index.js'

// readChangelog 是纯文件解析函数，用真实临时目录测，不 mock fs
let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rg-changelog-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function writeChangelog(content: string) {
  const p = join(dir, 'CHANGELOG.md')
  writeFileSync(p, content, 'utf-8')
  return p
}

describe('readChangelog', () => {
  it('解析最新版本的版本号与正文（去掉 ## vX.Y.Z (date) 标题行）', () => {
    const path = writeChangelog(`# 更新日志

## v1.2.0 (2026-08-13)

新增订单管理模块。

### 订单
- 支持 CSV 导入

## v1.1.0 (2026-08-10)

旧版本内容。
`)
    const { latestVersion, latestContent } = readChangelog(dir, path)
    expect(latestVersion).toBe('v1.2.0')
    expect(latestContent).toContain('新增订单管理模块。')
    expect(latestContent).toContain('- 支持 CSV 导入')
    // 标题行本身不该留在正文里
    expect(latestContent).not.toContain('v1.2.0')
  })

  it('支持不带 v 前缀的版本号（如 "## 1.2.0"）', () => {
    const path = writeChangelog(`# 更新日志

## 1.2.0

内容 A
`)
    const { latestVersion, latestContent } = readChangelog(dir, path)
    expect(latestVersion).toBe('1.2.0')
    expect(latestContent).toBe('内容 A')
  })

  it('changelog:false 关闭虚拟模块内容', () => {
    const { latestVersion, latestContent } = readChangelog(dir, false)
    expect(latestVersion).toBeNull()
    expect(latestContent).toBe('')
  })

  it('文件不存在时兜底返回空', () => {
    const { latestVersion, latestContent } = readChangelog(dir, 'NOPE.md')
    expect(latestVersion).toBeNull()
    expect(latestContent).toBe('')
  })

  it('没有 ## 版本标题时返回空', () => {
    writeChangelog('# 只有文件头，没有版本节\n\n随便写点内容。\n')
    const { latestVersion, latestContent } = readChangelog(dir, 'CHANGELOG.md')
    expect(latestVersion).toBeNull()
    expect(latestContent).toBe('')
  })

  it('changelog 参数缺省时用默认文件名 CHANGELOG.md', () => {
    writeChangelog(`# 更新日志

## v0.9.9 (2026-08-01)

默认路径内容。
`)
    const { latestVersion, latestContent } = readChangelog(dir, undefined)
    expect(latestVersion).toBe('v0.9.9')
    expect(latestContent).toContain('默认路径内容。')
  })

  it('自定义 changelog 路径（含子目录）也能读', () => {
    mkdirSync(join(dir, 'docs'))
    const p = join(dir, 'docs', 'LOG.md')
    writeFileSync(p, '# 日志\n\n## v2.0.0 (2026-08-02)\n\n子目录内容。\n', 'utf-8')
    const { latestVersion, latestContent } = readChangelog(dir, 'docs/LOG.md')
    expect(latestVersion).toBe('v2.0.0')
    expect(latestContent).toContain('子目录内容。')
  })

  it('allVersions 解析并导出完整历史版本列表（包含 version, date, content）', () => {
    writeChangelog(`# 更新日志

## [1.165.0] - 2026-10-18

- 订单状态全站单源
- 简介与备注彻底分家

## v1.164.0 (2026-10-17)

- 优化性能

## 1.163.0

旧版本无日期
`)
    const { latestVersion, latestContent, allVersions } = readChangelog(dir, 'CHANGELOG.md')
    expect(latestVersion).toBe('1.165.0')
    expect(latestContent).toContain('订单状态全站单源')
    expect(allVersions).toHaveLength(3)

    expect(allVersions[0].version).toBe('1.165.0')
    expect(allVersions[0].date).toBe('2026-10-18')
    expect(allVersions[0].content).toContain('- 订单状态全站单源')

    expect(allVersions[1].version).toBe('v1.164.0')
    expect(allVersions[1].date).toBe('2026-10-17')
    expect(allVersions[1].content).toBe('- 优化性能')

    expect(allVersions[2].version).toBe('1.163.0')
    expect(allVersions[2].date).toBeNull()
    expect(allVersions[2].content).toBe('旧版本无日期')
  })
})

describe('extractBulletPoints', () => {
  it('正确从 markdown 正文中提取更新要点列表（-、*、+、•、数字序号）', async () => {
    const { extractBulletPoints } = await import('../src/index.js')
    const md = `
### 新特性
- 订单状态全站单源：后端与前端从此共用同一套状态判定
* 工单大盘状态收敛为三个 Tab
+ 智能派单上线

普通段落描述，不应被提取。

1. 第一条有序列表
• bullet 符号列表项
`
    const bullets = extractBulletPoints(md)
    expect(bullets).toEqual([
      '订单状态全站单源：后端与前端从此共用同一套状态判定',
      '工单大盘状态收敛为三个 Tab',
      '智能派单上线',
      '第一条有序列表',
      'bullet 符号列表项',
    ])
  })

  it('空内容或无列表时返回空数组', async () => {
    const { extractBulletPoints } = await import('../src/index.js')
    expect(extractBulletPoints('')).toEqual([])
    expect(extractBulletPoints('纯文本没有列表')).toEqual([])
  })
})

describe('refreshGuard plugin with changelog options', () => {
  it('支持 changelog: { mode: "fetch" } 配置并在 generateBundle 时 emitFile', async () => {
    writeChangelog('# 日志\n\n## v1.0.0 (2026-10-18)\n\n发布\n')
    const { refreshGuard } = await import('../src/index.js')
    const plugin = refreshGuard({
      changelog: { mode: 'fetch', outFile: 'CHANGELOG.md' },
    })

    // 模拟 Vite 钩子流
    const emitted: any[] = []
    const fakeContext = {
      emitFile: (asset: any) => emitted.push(asset),
      addWatchFile: () => {},
    }

    if (plugin.config) {
      plugin.config.call(fakeContext as any, { root: dir } as any, { command: 'build', mode: 'production' })
    }
    if (plugin.configResolved) {
      plugin.configResolved.call(fakeContext as any, { root: dir } as any)
    }

    // 测试 load virtual module
    if (plugin.load) {
      const code = plugin.load.call(fakeContext as any, '\0virtual:refresh-guard-changelog') as string
      expect(code).toContain('export const latestVersion = "v1.0.0"')
      expect(code).toContain('export const allVersions = [')
      expect(code).toContain('export const changelogUrl = "/CHANGELOG.md"')
    }

    // 测试 generateBundle emit asset
    if (plugin.generateBundle) {
      plugin.generateBundle.call(fakeContext as any, {} as any, {} as any, false)
      const changelogAsset = emitted.find(e => e.fileName === 'CHANGELOG.md')
      expect(changelogAsset).toBeDefined()
      expect(changelogAsset.source).toContain('## v1.0.0 (2026-10-18)')
    }
  })

  it('define 注入 buildId，且与 version.json 里的 buildId 一致', async () => {
    const { refreshGuard } = await import('../src/index.js')
    const plugin = refreshGuard()
    const emitted: any[] = []
    const fakeContext = {
      emitFile: (asset: any) => emitted.push(asset),
      addWatchFile: () => {},
    }

    // tmpdir 不是 git 仓库 → 回落到 version（不是时间戳），define 与产物必须同源
    const returned = (plugin.config as any).call(
      fakeContext,
      { root: dir } as any,
      { command: 'build', mode: 'production' },
    ) as { define: Record<string, string> }
    expect(returned.define.__REFRESH_GUARD_BUILD_ID__).toBeTruthy()

    ;(plugin.configResolved as any).call(fakeContext, { root: dir } as any)
    ;(plugin.generateBundle as any).call(fakeContext, {} as any, {} as any, false)

    const manifest = JSON.parse(emitted.find(e => e.fileName === 'version.json').source)
    expect(manifest.buildId).toBe(JSON.parse(returned.define.__REFRESH_GUARD_BUILD_ID__))
    expect(manifest.buildId).not.toBe('')
  })

  // 回归：曾经回落 Date.now()，导致「同一次部署重新构建」也换 id，
  // 每次部署都提示刷新——比 commit 的过度提示严重得多。
  it('无 git 时 buildId 回落 version，且连续两次构建完全一致（不再用时间戳）', async () => {
    const { refreshGuard } = await import('../src/index.js')
    const defineOf = () => {
      const plugin = refreshGuard({ version: '1.0.0' })
      const ctx = { emitFile: () => {}, addWatchFile: () => {} }
      const ret = (plugin.config as any).call(ctx, { root: dir } as any, {
        command: 'build',
        mode: 'production',
      }) as { define: Record<string, string> }
      ;(plugin.configResolved as any).call(ctx, { root: dir } as any)
      return JSON.parse(ret.define.__REFRESH_GUARD_BUILD_ID__) as string
    }

    const first = defineOf()
    const second = defineOf()
    expect(first).toBe('1.0.0')
    expect(second).toBe(first) // 关键：可复现，不会把每次构建都当成新版本
  })

  it('显式 buildId 覆盖 commit 与 version（monorepo 里传 app 级身份）', async () => {
    const { refreshGuard } = await import('../src/index.js')
    const plugin = refreshGuard({ version: '1.0.0', buildId: '1.0.0-web-a-42' })
    const emitted: any[] = []
    const ctx = { emitFile: (a: any) => emitted.push(a), addWatchFile: () => {} }

    const ret = (plugin.config as any).call(ctx, { root: dir } as any, {
      command: 'build',
      mode: 'production',
    }) as { define: Record<string, string> }
    ;(plugin.configResolved as any).call(ctx, { root: dir } as any)
    ;(plugin.generateBundle as any).call(ctx, {} as any, {} as any, false)

    const manifest = JSON.parse(emitted.find(e => e.fileName === 'version.json').source)
    expect(JSON.parse(ret.define.__REFRESH_GUARD_BUILD_ID__)).toBe('1.0.0-web-a-42')
    expect(manifest.buildId).toBe('1.0.0-web-a-42')
  })

  it('includeCommit:false 时 version.json 不带 commit，buildId 仍稳定', async () => {
    const { refreshGuard } = await import('../src/index.js')
    const plugin = refreshGuard({ version: '2.3.4', includeCommit: false })
    const emitted: any[] = []
    const ctx = { emitFile: (a: any) => emitted.push(a), addWatchFile: () => {} }

    ;(plugin.config as any).call(ctx, { root: dir } as any, { command: 'build', mode: 'production' })
    ;(plugin.configResolved as any).call(ctx, { root: dir } as any)
    ;(plugin.generateBundle as any).call(ctx, {} as any, {} as any, false)

    const manifest = JSON.parse(emitted.find(e => e.fileName === 'version.json').source)
    expect(manifest.commit).toBeUndefined()
    expect(manifest.buildId).toBe('2.3.4')
  })
})

// 这些用例需要一个真的 git 仓库：commit 是从 git 读的，mock 掉就没意义了
function gitAvailable(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

describe.skipIf(!gitAvailable())('refreshGuard 与真实 git 仓库', () => {
  let repo: string

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'rg-git-'))
    writeFileSync(join(repo, 'package.json'), '{"name":"x","version":"3.1.0"}', 'utf-8')
    const run = (cmd: string) => execSync(cmd, { cwd: repo, stdio: 'ignore' })
    run('git init -q')
    run('git config user.email t@t.t')
    run('git config user.name t')
    run('git add -A')
    run('git commit -qm init')
  })

  afterEach(() => rmSync(repo, { recursive: true, force: true }))

  const runPlugin = async (opts: Record<string, unknown>) => {
    const { refreshGuard } = await import('../src/index.js')
    const plugin = refreshGuard(opts as any)
    const emitted: any[] = []
    const ctx = { emitFile: (a: any) => emitted.push(a), addWatchFile: () => {} }
    const ret = (plugin.config as any).call(ctx, { root: repo } as any, {
      command: 'build',
      mode: 'production',
    }) as { define: Record<string, string> }
    ;(plugin.configResolved as any).call(ctx, { root: repo } as any)
    ;(plugin.generateBundle as any).call(ctx, {} as any, {} as any, false)
    return {
      injected: JSON.parse(ret.define.__REFRESH_GUARD_BUILD_ID__) as string,
      manifest: JSON.parse(emitted.find(e => e.fileName === 'version.json').source),
    }
  }

  it('默认 buildId 就等于 git short SHA', async () => {
    const { injected, manifest } = await runPlugin({})
    const sha = execSync('git rev-parse --short HEAD', { cwd: repo }).toString().trim()
    expect(injected).toBe(sha)
    expect(manifest.buildId).toBe(sha)
    expect(manifest.commit).toBe(sha)
  })

  // 回归：显式 buildId 曾导致 commit 也读不到，version.json 丢掉唯一能对回提交的字段
  it('显式 buildId 接管身份，但 version.json 仍保留 commit 作为排查证据', async () => {
    const sha = execSync('git rev-parse --short HEAD', { cwd: repo }).toString().trim()
    const { injected, manifest } = await runPlugin({ buildId: `${sha}-web-a` })
    expect(injected).toBe(`${sha}-web-a`)
    expect(manifest.buildId).toBe(`${sha}-web-a`)
    expect(manifest.commit).toBe(sha)
  })
})
