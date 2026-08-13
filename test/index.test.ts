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
})
