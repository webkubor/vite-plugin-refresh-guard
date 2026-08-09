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
})
