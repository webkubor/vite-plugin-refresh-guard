import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
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
})
