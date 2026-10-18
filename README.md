<h1 align="center">🔄 vite-plugin-refresh-guard</h1>

<p align="center">
  <strong>部署了新版本，接下来怎么办 —— 把这件事变成一行配置。</strong><br>
  静默刷新 / 提示后刷新 / 弹窗阻断，三选一写进 config；<br>
  核心逻辑与框架无关，Vue 与 React 各一层薄适配。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vite-plugin-refresh-guard"><img src="https://img.shields.io/npm/v/vite-plugin-refresh-guard?style=for-the-badge&color=4d6bfe&logo=npm&label=npm" alt="npm" /></a>
  <a href="https://www.npmjs.com/package/vite-plugin-refresh-guard"><img src="https://img.shields.io/npm/dm/vite-plugin-refresh-guard?style=for-the-badge&color=6d7f9c&label=downloads" alt="downloads" /></a>
  <a href="https://github.com/webkubor/vite-plugin-refresh-guard/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/webkubor/vite-plugin-refresh-guard/ci.yml?style=for-the-badge&label=CI" alt="CI" /></a>
  <img src="https://img.shields.io/badge/vite-%3E%3D4%20%3C9-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="vite" />
  <img src="https://img.shields.io/badge/vue-%3E%3D3-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="vue" />
  <img src="https://img.shields.io/badge/react-%3E%3D18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="react" />
  <img src="https://img.shields.io/badge/license-MIT-777?style=for-the-badge" alt="MIT" />
</p>

<p align="center">
  <a href="./README.en.md">English</a> | 中文
</p>

## Why This

| | 本插件 | 各项目自己写胶水 | 完全不管 |
|---|---|---|---|
| 策略是否显式 | ✅ 写进 config，三选一 | ❌ 散落各处，改一次跑偏一次 | ❌ 没有这回事 |
| 框架覆盖 | ✅ 核心无关 + Vue / React 适配 | ⚠️ 每个项目复制一遍 | — |
| 新版本探测 | ✅ 构建产物指纹比对 | ⚠️ 各写各的，边界情况没人管 | ❌ 无 |
| 用户拿到旧版本时 | ✅ 提示 / 弹窗文案可定制 | ⚠️ 看实现 | ❌ 静默跑旧代码 |

给 Vite 项目做"部署了新版本，接下来怎么办"的可配置方案。

大多数项目最后都会落在这三种答案里的一种，而且往往是随手写的、后来再也没人回头审视过：

- **静默**——后台自动刷新，用户完全无感
- **提示+自动刷新**——弹个小提示，短暂延迟后自动刷新
- **强制弹窗**——拦住用户，必须点"立即更新"才能继续用

这个包把这个选择显式化、可配置化，而不是散落在各项目里、每次改动都会跑偏的胶水代码。核心逻辑跟框架无关，Vue 和 React 各有一层薄适配。

## 安装

```bash
npm i -D vite-plugin-refresh-guard
```

`vue`、`react`/`react-dom`、`vite` 都是 peerDependency——用哪个装哪个。

## 快速开始

**`vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import { refreshGuard } from 'vite-plugin-refresh-guard'

export default defineConfig({
  plugins: [refreshGuard()],
})
```

这一步在构建期做两件事：
1. 往构建产物里写一个 `version.json`（`{ version, buildId, commit, time }`）
2. 把当前版本号烘焙进 bundle，成为全局常量 `__REFRESH_GUARD_VERSION__`

**Vue**

```vue
<script setup lang="ts">
import { useVersionCheck } from 'vite-plugin-refresh-guard/vue'
import UpdatePrompt from 'vite-plugin-refresh-guard/vue/UpdatePrompt.vue'
import { latestContent } from 'virtual:refresh-guard-changelog'
// import { isDark } from './your-theme-state' —— 有主题切换的话把这个也传进去

const { hasUpdate, latestInfo, applyUpdate, mode } = useVersionCheck(__REFRESH_GUARD_VERSION__, {
  mode: 'toast-auto', // 'silent' | 'toast-auto' | 'modal-blocking'
})
</script>

<template>
  <UpdatePrompt
    :visible="hasUpdate" :mode="mode" :version="latestInfo?.version"
    :changelog-html="latestContent"
    @refresh="applyUpdate"
  />
</template>
```

> `:changelog-html` 别漏了——不传的话 `modal-blocking` 弹窗只会显示一个 git hash，用户不知道更新了什么。
> 站点自己有深色模式的话，把主题状态传给 `:dark`（比如 `:dark="isDark"`），弹窗才会跟着网站主题走，
> 不然默认只跟着访问者系统的深色模式走，容易出现"网站是浅色、弹窗却是暗的"这种违和场面。

**React**

```tsx
import { useVersionCheck } from 'vite-plugin-refresh-guard/react'
import { UpdatePrompt } from 'vite-plugin-refresh-guard/react/UpdatePrompt'
// import { latestContent } from 'virtual:refresh-guard-changelog' —— React 项目按各自 loader 处理虚拟模块的方式引入

function App() {
  const { hasUpdate, latestInfo, applyUpdate, mode } = useVersionCheck(__REFRESH_GUARD_VERSION__, {
    mode: 'modal-blocking',
  })
  return (
    <UpdatePrompt
      visible={hasUpdate} mode={mode} version={latestInfo?.version}
      changelogHtml={latestContent}
      dark={isDarkMode /* 传你自己的主题状态，不传则始终按浅色渲染 */}
      onRefresh={applyUpdate}
    />
  )
}
```

在 `env.d.ts`（或者你放 `vite/client` reference 的地方）加一行：
```ts
/// <reference types="vite-plugin-refresh-guard/client" />
```
不然 TypeScript 不认识 `__REFRESH_GUARD_VERSION__`。

不想用现成 UI？直接用 `useVersionCheck` 返回的 `hasUpdate`/`latestInfo`/`applyUpdate` 自己渲染——预置组件只是个起点，不是必须用它。

## 怎么选档位

| 档位 | 用户看到什么 | 什么时候用 |
|---|---|---|
| `silent` | 什么都看不到，后台自动刷新 | 内部工具、没人会"做到一半"的看板类页面。如果项目已经在用 `vite-plugin-pwa` 的 `registerType:'autoUpdate'`，同一件事它在 SW 层已经做了，这种情况下你可能根本不需要本包的轮询，只想要 changelog 展示的话接 `notifyExternalUpdate()`（见下文）就够 |
| `toast-auto`（默认） | 角落小提示，`autoRefreshDelay`（默认1.2秒）后自动刷新 | 大多数 to-C 产品。给用户一个心理准备，但不打断 |
| `modal-blocking` | 居中弹窗，不可点遮罩关闭，点了才刷新 | 刷新会丢失用户没保存的东西（表单填一半、正在上传），或者想要用户明确确认才应用更新的场景 |

不是只能靠轮询 version.json——`checker.notifyExternalUpdate(info)`（两个框架适配层都暴露了这个方法）可以把任何来源的更新信号接进同一套档位逻辑，最常见的用法是接 `vite-plugin-pwa` 的 `registerSW({ onNeedRefresh })` 回调，如果你本来就在跑 service worker，想让它的更新事件也走同一套 toast/弹窗，而不是（或者加上）轮询。

## 配置项

```ts
interface VersionCheckerOptions {
  versionUrl?: string          // 默认 '/version.json'
  interval?: number            // 默认 5 分钟；设 0 关闭轮询
  checkOnVisible?: boolean     // 标签页重新可见时也查一次，默认 true
  mode?: 'silent' | 'toast-auto' | 'modal-blocking' // 默认 'toast-auto'
  autoRefreshDelay?: number    // 仅 toast-auto 用，默认 1200ms
  refreshCooldown?: number     // 两次强制刷新之间的最短间隔，默认 90 秒——防止刷新死循环
  guardChunkErrors?: boolean   // 旧 chunk 加载失败时强刷一次，默认 true
  changelog?: string | boolean | { mode?: 'bake' | 'fetch', url?: string } // 运行时拉取 changelog
  onUpdateAvailable?: (info) => void | boolean // 返回 false 可以自己接管 UI
  onBeforeRefresh?: () => void // 真正 location.reload() 前调用，适合在这里补埋点
}
```

插件配置（`refreshGuard({ ... })`）：

```ts
interface RefreshGuardPluginOptions {
  version?: string        // 默认读 package.json
  includeCommit?: boolean // 默认 true；非 git 仓库时静默省略，不报错
  outFile?: string        // 默认 'version.json'
  changelog?: string | false | {
    mode?: 'bake' | 'fetch' // 'bake' 构建期烘焙进虚拟模块（默认）；'fetch' 复制到 dist 供运行时拉取
    file?: string           // 本地 CHANGELOG 路径，默认 'CHANGELOG.md'
    outFile?: string        // 产物文件名，默认 'CHANGELOG.md'
    url?: string            // 运行时拉取 URL，默认 '/CHANGELOG.md'
  }
}
```

## 更新日志展示（全量导出与运行时拉取）

```ts
import { latestVersion, latestContent, allVersions } from 'virtual:refresh-guard-changelog'
```

- **最新版与历史全量**：`latestVersion` 与 `latestContent` 提供最新版本的版本号与正文；`allVersions: Array<{ version, date, content }>` 解析了 `CHANGELOG.md` 中所有历史版本块，前端更新中心/日志大盘页面可直接渲染，无需后端写文件读取接口。
- **运行时动态拉取模式**：配置 `refreshGuard({ changelog: { mode: 'fetch' } })`，构建时自动把 CHANGELOG 写入 `dist`。客户端可在检测到更新时自动拉取最新静态文件（`useVersionCheck` 返回的 `changelog` 对象与 `fetchChangelog()` 方法），服务器只需同步静态 markdown，无需重复构建。
- **要点提取工具**：导出纯函数 `extractBulletPoints(markdown)`，自动从正文中提炼列表项。

## 新功能通知卡片组件（UpdateCard）

想要更丰富的"功能更新卡片"而不是简单的文字提示条？引入 `UpdateCard`，开箱即用：

- **自动要点提炼**：自动识别并提取 Markdown 正文中的更新条目（`- ` / `* ` / `1. ` 等），以整洁的 Bullet 列表展示。
- **双布局支持**：默认 `layout="floating"` 右下角平滑滑入浮动卡片；也可设为 `layout="inline"` 嵌入到仪表盘或大盘通知栏。
- **闭环交互**：带版本号与发布日期徽标、最多展示条数限制（超出提示 "+N 项更多改进"）、一键刷新按钮与"查看完整更新日志"跳转外链。

**Vue**

```vue
<script setup lang="ts">
import { useVersionCheck } from 'vite-plugin-refresh-guard/vue'
import UpdateCard from 'vite-plugin-refresh-guard/vue/UpdateCard.vue'
import { latestContent, latestVersion } from 'virtual:refresh-guard-changelog'

const { hasUpdate, latestInfo, applyUpdate } = useVersionCheck(__REFRESH_GUARD_VERSION__)
</script>

<template>
  <UpdateCard
    :visible="hasUpdate"
    :version="latestInfo?.version || latestVersion"
    :content="latestContent"
    view-more-url="/#/changelog"
    @refresh="applyUpdate"
  />
</template>
```

**React**

```tsx
import { useVersionCheck } from 'vite-plugin-refresh-guard/react'
import { UpdateCard } from 'vite-plugin-refresh-guard/react/UpdateCard'
import { latestContent } from 'virtual:refresh-guard-changelog'

function App() {
  const { hasUpdate, latestInfo, applyUpdate } = useVersionCheck(__REFRESH_GUARD_VERSION__)
  return (
    <UpdateCard
      visible={hasUpdate}
      version={latestInfo?.version}
      content={latestContent}
      viewMoreUrl="/#/changelog"
      onRefresh={applyUpdate}
    />
  )
}
```

## 样式定制

`UpdatePrompt` 默认是通用蓝白配色，不假设你的品牌色。所有颜色/圆角都先读一个 `--rg-*` CSS 变量，读不到才用默认值——在你自己项目的全局样式里（`:root` 或任意祖先节点）设置这些变量，就能让弹窗跟你的产品长一个样，不用改包的源码：

```css
:root {
  --rg-accent: var(--brand);        /* 主按钮颜色，默认 #2563eb */
  --rg-accent-fg: #fff;             /* 主按钮文字颜色 */
  --rg-radius: 16px;                /* 弹窗/toast 圆角 */
  --rg-modal-bg: #fff;              /* 弹窗背景（浅色） */
  --rg-modal-fg: #111827;           /* 弹窗文字（浅色） */
  --rg-modal-bg-dark: #1f2937;      /* 弹窗背景（深色，配合 :dark 或系统深色模式） */
  --rg-modal-fg-dark: #f3f4f6;
  --rg-body-fg: #4b5563;            /* 正文文字颜色 */
  --rg-body-fg-dark: #d1d5db;
  --rg-overlay-bg: rgba(15, 15, 20, 0.55); /* 弹窗背后的遮罩 */
  --rg-toast-bg: #1f2937;           /* toast-auto 模式的提示条 */
  --rg-toast-fg: #fff;
}
```

不需要全套都设，只想换主按钮颜色就只设 `--rg-accent` 即可，其余保持默认。

## 为什么不干脆只用 service worker

如果你已经在跑 service worker，`vite-plugin-pwa` 的 `autoUpdate` 模式本身就是一个很好的 `silent` 实现——本包不是要替代它。本包补的是：一套统一的方式，能拿到 `toast-auto` 或 `modal-blocking` 的体验（裸 service worker 想要这个得自己手写这整套管线）；一个不需要 service worker 的、纯靠轮询 `version.json` 的兜底方案；以及独立的更新日志展示层。哪块需要用哪块，互相不绑定。

## License

MIT
