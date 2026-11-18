import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UpdateChecker } from '../src/core/checker'

function mockFetchOnce(json: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => json }))
}

describe('UpdateChecker', () => {
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    // jsdom's window.location.reload is non-configurable, so vi.spyOn() on it throws —
    // stub the whole global instead (window === globalThis here, so this replaces window.location too).
    reloadSpy = vi.fn()
    vi.stubGlobal('location', { reload: reloadSpy })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('detects a version mismatch via checkNow()', async () => {
    mockFetchOnce({ version: '2.0.0' })
    const checker = new UpdateChecker('1.0.0', { mode: 'modal-blocking' })
    const found = await checker.checkNow()
    expect(found).toBe(true)
    expect(checker.hasUpdate).toBe(true)
    expect(checker.latestInfo?.version).toBe('2.0.0')
  })

  it('does not react when the fetched version matches the running build', async () => {
    mockFetchOnce({ version: '1.0.0' })
    const checker = new UpdateChecker('1.0.0')
    const found = await checker.checkNow()
    expect(found).toBe(false)
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it("'silent' mode refreshes immediately, no UI step", async () => {
    mockFetchOnce({ version: '2.0.0' })
    const checker = new UpdateChecker('1.0.0', { mode: 'silent' })
    await checker.checkNow()
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it("'toast-auto' mode refreshes only after autoRefreshDelay elapses", async () => {
    mockFetchOnce({ version: '2.0.0' })
    const checker = new UpdateChecker('1.0.0', { mode: 'toast-auto', autoRefreshDelay: 1000 })
    await checker.checkNow()
    expect(reloadSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(999)
    expect(reloadSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it("'modal-blocking' mode never auto-refreshes — only an explicit applyUpdate() does", async () => {
    mockFetchOnce({ version: '2.0.0' })
    const checker = new UpdateChecker('1.0.0', { mode: 'modal-blocking' })
    await checker.checkNow()
    vi.advanceTimersByTime(60_000)
    expect(reloadSpy).not.toHaveBeenCalled()
    checker.applyUpdate()
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('respects the refresh cooldown so a flaky version.json cannot cause a reload loop', () => {
    const checker = new UpdateChecker('1.0.0', { mode: 'modal-blocking', refreshCooldown: 5000 })
    checker.applyUpdate()
    checker.applyUpdate()
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5001)
    checker.applyUpdate()
    expect(reloadSpy).toHaveBeenCalledTimes(2)
  })

  it('onUpdateAvailable returning false suppresses the built-in mode reaction', async () => {
    mockFetchOnce({ version: '2.0.0' })
    const onUpdateAvailable = vi.fn().mockReturnValue(false)
    const checker = new UpdateChecker('1.0.0', { mode: 'silent', onUpdateAvailable })
    await checker.checkNow()
    expect(onUpdateAvailable).toHaveBeenCalledTimes(1)
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('notifyExternalUpdate() (e.g. vite-plugin-pwa onNeedRefresh) drives the same mode logic', () => {
    const checker = new UpdateChecker('1.0.0', { mode: 'silent' })
    checker.notifyExternalUpdate({ version: 'sw-update' })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('swallows a fetch failure instead of throwing (offline / transient network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const checker = new UpdateChecker('1.0.0')
    await expect(checker.checkNow()).resolves.toBe(false)
  })

  it('buildId 优先：version 没变但部署变了，也必须检测到（忘了 bump package.json 的场景）', async () => {
    mockFetchOnce({ version: '1.0.0', buildId: 'abc1234' })
    const checker = new UpdateChecker('1.0.0', { mode: 'modal-blocking', buildId: 'def5678' })
    await expect(checker.checkNow()).resolves.toBe(true)
    expect(checker.latestInfo?.buildId).toBe('abc1234')
  })

  it('buildId 相同即同一部署，不触发（哪怕 version 字段被改过）', async () => {
    mockFetchOnce({ version: '9.9.9', buildId: 'abc1234' })
    const checker = new UpdateChecker('1.0.0', { mode: 'silent', buildId: 'abc1234' })
    await expect(checker.checkNow()).resolves.toBe(false)
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('version.json 没有 buildId 时回落比 version（兼容老部署/第三方 manifest）', async () => {
    mockFetchOnce({ version: '2.0.0' })
    const checker = new UpdateChecker('1.0.0', { mode: 'modal-blocking', buildId: 'abc1234' })
    await expect(checker.checkNow()).resolves.toBe(true)
  })

  it('version.json 请求带 cache-buster —— no-store 管不到 CDN/反代的旧副本', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: '1.0.0' }) })
    vi.stubGlobal('fetch', fetchMock)
    const checker = new UpdateChecker('1.0.0')
    await checker.checkNow()
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/version\.json\?t=\d+/)
  })

  it('refreshNow() 无视冷却 —— 用户显式点击不该是死按钮', () => {
    const checker = new UpdateChecker('1.0.0', { mode: 'modal-blocking', refreshCooldown: 60_000 })
    checker.applyUpdate() // 首次刷新，冷却开始
    checker.applyUpdate() // 冷却内，自动路径被拦
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    checker.refreshNow() // 显式点击穿透冷却
    expect(reloadSpy).toHaveBeenCalledTimes(2)
  })

  it('fetchChangelog 拉取并解析静态 CHANGELOG 文件', async () => {
    const rawMd = '# Changelog\n\n## v2.1.0 (2026-10-18)\n\n- Fix issue\n'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => rawMd,
    }))
    const { fetchChangelog } = await import('../src/core/changelog')
    const parsed = await fetchChangelog('/CHANGELOG.md')
    expect(parsed.latestVersion).toBe('v2.1.0')
    expect(parsed.allVersions).toHaveLength(1)
    expect(parsed.allVersions[0].content).toBe('- Fix issue')
  })

  it('UpdateChecker 配置 changelog: { mode: "fetch" } 时，检测到更新自动触发 fetchChangelog 并派发事件', async () => {
    const rawMd = '# Changelog\n\n## v2.0.0 (2026-10-18)\n\n- Feature X\n'
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('version.json')) {
        return { ok: true, json: async () => ({ version: '2.0.0' }) }
      }
      return { ok: true, text: async () => rawMd }
    })
    vi.stubGlobal('fetch', fetchMock)

    const changelogListener = vi.fn()
    const checker = new UpdateChecker('1.0.0', {
      mode: 'modal-blocking',
      changelog: { mode: 'fetch', url: '/CHANGELOG.md' },
    })
    checker.on('changelog-loaded', changelogListener)

    await checker.checkNow()
    expect(checker.hasUpdate).toBe(true)

    await vi.waitFor(() => {
      expect(checker.changelog).toBeTruthy()
      expect(checker.changelog?.latestVersion).toBe('v2.0.0')
      expect(changelogListener).toHaveBeenCalledWith(expect.objectContaining({ latestVersion: 'v2.0.0' }))
    })
  })
})
