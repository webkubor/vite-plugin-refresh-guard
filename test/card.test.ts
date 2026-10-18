import { describe, it, expect } from 'vitest'
import { extractBulletPoints, parseChangelog } from '../src/core/changelog'

describe('UpdateCard & Bullet Extraction Logic', () => {
  it('从真实项目的 CHANGELOG 中精准提取要点', () => {
    const raw = `
### 变更

- 订单状态全站单源：后端与前端从此共用同一套状态判定（进行中 / 已交付 / 已弃用）
- 工单大盘状态收敛为三个 Tab：⚡进行中 / ✅已交付 / 🚫已弃用
- 项目简介与履约备注彻底分家：📖 简介取 GitHub 官方仓库描述，🏷️ 备注是运营履约说明
- 智能派单上线：有前端倾向的账号会优先派给前端类工单
- 养号与工单严格隔离：同一个项目绝不会同时出现在工单池和养号池
`
    const bullets = extractBulletPoints(raw)
    expect(bullets).toHaveLength(5)
    expect(bullets[0]).toContain('订单状态全站单源')
    expect(bullets[1]).toContain('工单大盘状态收敛为三个 Tab')
    expect(bullets[2]).toContain('项目简介与履约备注彻底分家')
    expect(bullets[3]).toContain('智能派单上线')
    expect(bullets[4]).toContain('养号与工单严格隔离')
  })

  it('处理空正文与无符号纯文本', () => {
    expect(extractBulletPoints('')).toEqual([])
    expect(extractBulletPoints('   \n\n  ')).toEqual([])
    expect(extractBulletPoints('这是一段普通段落，没有使用列表语法。')).toEqual([])
  })

  it('parseChangelog 完整提取各版本并保留日期', () => {
    const md = `# Changelog

## [1.165.0] - 2026-10-18
- Feature 1
- Feature 2

## [1.164.0] - 2026-10-17
- Bugfix 1
`
    const parsed = parseChangelog(md)
    expect(parsed.latestVersion).toBe('1.165.0')
    expect(parsed.allVersions).toHaveLength(2)
    expect(parsed.allVersions[0].date).toBe('2026-10-18')
    expect(extractBulletPoints(parsed.allVersions[0].content)).toEqual(['Feature 1', 'Feature 2'])
    expect(parsed.allVersions[1].date).toBe('2026-10-17')
    expect(extractBulletPoints(parsed.allVersions[1].content)).toEqual(['Bugfix 1'])
  })
})
