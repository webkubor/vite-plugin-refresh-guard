import { useEffect, useRef, useState } from 'react'
import { UpdateChecker, fetchChangelog, parseChangelog, extractBulletPoints } from '../core/checker'
import type {
  VersionCheckerOptions,
  VersionInfo,
  ParsedChangelog,
  ChangelogVersionEntry,
  UpdateCardProps,
} from '../core/types'

export { fetchChangelog, parseChangelog, extractBulletPoints }
export type {
  VersionCheckerOptions,
  VersionInfo,
  ParsedChangelog,
  ChangelogVersionEntry,
  UpdateCardProps,
}

/**
 * React hook wrapping the framework-agnostic UpdateChecker. Mounts/unmounts the checker with
 * the component's lifecycle automatically.
 *
 * @param currentVersion Usually `__REFRESH_GUARD_VERSION__` (injected by the Vite plugin).
 */
export function useVersionCheck(currentVersion: string, options: VersionCheckerOptions = {}) {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [latestInfo, setLatestInfo] = useState<VersionInfo | null>(null)
  const [changelog, setChangelog] = useState<ParsedChangelog | null>(null)
  const checkerRef = useRef<UpdateChecker | null>(null)

  if (!checkerRef.current) {
    checkerRef.current = new UpdateChecker(currentVersion, options)
  }

  useEffect(() => {
    const checker = checkerRef.current!
    const off = checker.on('update-available', (info: VersionInfo | null) => {
      setHasUpdate(true)
      setLatestInfo(info)
    })
    const offChangelog = checker.on('changelog-loaded', (parsed: ParsedChangelog) => {
      setChangelog(parsed)
    })
    checker.start()
    return () => {
      checker.stop()
      off()
      offChangelog()
    }
    // currentVersion/options are captured once at construction above — this hook isn't meant
    // to be reconfigured mid-lifecycle, matching how you'd use the Vue composable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checker = checkerRef.current
  return {
    hasUpdate,
    latestInfo,
    changelog,
    mode: options.mode ?? 'toast-auto',
    applyUpdate: () => checker.applyUpdate(),
    checkNow: () => checker.checkNow(),
    fetchChangelog: (url?: string) => checker.fetchChangelog(url),
    /** Feed a vite-plugin-pwa `onNeedRefresh` (or any other out-of-band) signal into the same mode logic. */
    notifyExternalUpdate: (info?: VersionInfo) => checker.notifyExternalUpdate(info),
    checker,
  }
}
