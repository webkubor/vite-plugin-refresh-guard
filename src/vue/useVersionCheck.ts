import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
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
 * Vue composable wrapping the framework-agnostic UpdateChecker. Mounts/unmounts the checker
 * with the component's lifecycle automatically.
 *
 * @param currentVersion Usually `__REFRESH_GUARD_VERSION__` (injected by the Vite plugin).
 */
export function useVersionCheck(currentVersion: string, options: VersionCheckerOptions = {}) {
  const hasUpdate = ref(false)
  const latestInfo = shallowRef<VersionInfo | null>(null)
  const changelog = shallowRef<ParsedChangelog | null>(null)
  const checker = new UpdateChecker(currentVersion, options)

  const off = checker.on('update-available', (info: VersionInfo | null) => {
    hasUpdate.value = true
    latestInfo.value = info
  })
  const offChangelog = checker.on('changelog-loaded', (parsed: ParsedChangelog) => {
    changelog.value = parsed
  })

  onMounted(() => checker.start())
  onUnmounted(() => {
    checker.stop()
    off()
    offChangelog()
  })

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
