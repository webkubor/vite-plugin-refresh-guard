export interface ChangelogVersionEntry {
  /** 版本号，例如 "v1.5.0" 或 "1.5.0" */
  version: string
  /** 发布日期，如 "2026-10-18"；若未标明日期的版本块则为 null */
  date: string | null
  /** 该版本块对应的 Markdown 正文（已剔除首行版本标题） */
  content: string
}

export interface ParsedChangelog {
  /** 最新版本的版本号，如 "v1.5.0"；无有效版本时为 null */
  latestVersion: string | null
  /** 最新版本的正文 Markdown 内容 */
  latestContent: string
  /** CHANGELOG 中按顺序解析的所有历史版本列表 */
  allVersions: ChangelogVersionEntry[]
}

/**
 * 提取 markdown 中的更新要点（bullet points），自动跳过分类标题，去除前缀符号
 */
export function extractBulletPoints(content: string): string[] {
  if (!content || typeof content !== 'string') return []
  const lines = content.split('\n')
  const bullets: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // 匹配常见的列表前缀：- / * / + / • 或 1. 2. 等数字有序列表
    const m = trimmed.match(/^(?:[-*+•]|\d+\.)\s+(.+)$/)
    if (m && m[1]) {
      const text = m[1].trim()
      if (text) {
        bullets.push(text)
      }
    }
  }

  return bullets
}

/**
 * 通用 CHANGELOG 解析函数（环境无关，可在 Node 构建期或浏览器运行时执行）
 * 兼容以下所有主流 Keep a Changelog 标题写法：
 * - `## v1.2.0 (2026-08-13)`
 * - `## 1.2.0 (2026-08-13)`
 * - `## [1.165.0] - 2026-10-18`
 * - `## [v1.165.0] - 2026-10-18`
 * - `## 1.2.0`
 */
export function parseChangelog(markdown: string): ParsedChangelog {
  if (!markdown || typeof markdown !== 'string') {
    return { latestVersion: null, latestContent: '', allVersions: [] }
  }

  // 按照二级标题 ## 分割版本块
  const sections = markdown.split(/^##\s+/m)
  if (sections.length <= 1) {
    return { latestVersion: null, latestContent: '', allVersions: [] }
  }

  const allVersions: ChangelogVersionEntry[] = []

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i]
    const firstNewline = sec.indexOf('\n')
    const headerLine = (firstNewline === -1 ? sec : sec.slice(0, firstNewline)).trim()
    const content = (firstNewline === -1 ? '' : sec.slice(firstNewline + 1)).trim()

    // 匹配版本号与可选日期：
    // 支持 [v1.0.0] 或 v1.0.0 或 1.0.0，后跟可选的 (- / ( / – / —) 分隔的日期
    const m = headerLine.match(/^\[?(v?[\d.]+)\]?(?:\s*[-–—(]\s*([\d\w.-]+)\s*\)?)?/i)
    if (m && m[1]) {
      allVersions.push({
        version: m[1],
        date: m[2] || null,
        content,
      })
    }
  }

  return {
    latestVersion: allVersions[0]?.version ?? null,
    latestContent: allVersions[0]?.content ?? '',
    allVersions,
  }
}

/**
 * 运行时拉取并解析 CHANGELOG 静态文件
 */
export async function fetchChangelog(url: string = '/CHANGELOG.md', init?: RequestInit): Promise<ParsedChangelog> {
  if (typeof window === 'undefined' && typeof fetch === 'undefined') {
    return { latestVersion: null, latestContent: '', allVersions: [] }
  }
  try {
    const resp = await fetch(url, { cache: 'no-store', ...init })
    if (!resp.ok) {
      return { latestVersion: null, latestContent: '', allVersions: [] }
    }
    const text = await resp.text()
    return parseChangelog(text)
  } catch {
    return { latestVersion: null, latestContent: '', allVersions: [] }
  }
}
