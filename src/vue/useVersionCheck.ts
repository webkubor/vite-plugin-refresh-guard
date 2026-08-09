import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { UpdateChecker } from '../core/checker'
import type { VersionCheckerOptions, VersionInfo } from '../core/types'

/**
 * Vue composable wrapping the framework-agnostic UpdateChecker. Mounts/unmounts the checker
 * with the component's lifecycle automatically.
 *
 * @param currentVersion Usually `__REFRESH_GUARD_VERSION__` (injected by the Vite plugin).
 */
export function useVersionCheck(currentVersion: string, options: VersionCheckerOptions = {}) {
  const hasUpdate = ref(false)
  const latestInfo = shallowRef<VersionInfo | null>(null)
  const checker = new UpdateChecker(currentVersion, options)

  const off = checker.on('update-available', info => {
    hasUpdate.value = true
    latestInfo.value = info
  })

  onMounted(() => checker.start())
  onUnmounted(() => {
    checker.stop()
    off()
  })

  return {
    hasUpdate,
    latestInfo,
    mode: options.mode ?? 'toast-auto',
    applyUpdate: () => checker.applyUpdate(),
    checkNow: () => checker.checkNow(),
    /** Feed a vite-plugin-pwa `onNeedRefresh` (or any other out-of-band) signal into the same mode logic. */
    notifyExternalUpdate: (info?: VersionInfo) => checker.notifyExternalUpdate(info),
    checker,
  }
}
