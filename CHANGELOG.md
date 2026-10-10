# 更新日志

## v0.2.2 (2026-10-09)

**只动 npm 元数据，一行运行期代码没改** —— 目的是让插件在「版本更新提示」这个品类里被搜到。

查了官方 [Vite Plugin Registry](https://registry.vite.dev/plugins)（真源 [vitejs/vite-plugin-registry](https://github.com/vitejs/vite-plugin-registry)，每天从 npm 抓一次，全库 6128 个插件）：插件**早已被收录**，但同品类可见性差得离谱 —— `@plugin-web-update-notification/vite` 周下载 12,934，本插件 132。

根因不是代码，是词。registry 的搜索是**对 name + description + keywords 做原始子串匹配、不分词**（见 `PluginList.vue`），而本插件这三处都没有 `update notification` 这个连续子串；旧 description 还是中文打头，英文用户搜英文词完全命中不到。竞品的包名本身就是 `web-update-notification`，等于三重命中。

- **`description` 改成英文品类词前置**：`Vite plugin for web update notification — detect a new version on every page load and prompt users to reload…`，中文压到句尾，中文搜索照样命中。
- **`keywords` 补 7 个品类词**：`web-update-notification` / `update-notification` / `new-version` / `auto-reload` / `auto-refresh` / `force-refresh` / `更新提示`，原有 10 个全部保留。子串匹配下必须写**连字符整词** —— 只写 `update`，搜 `update notification` 是匹配不到的。
- **带空格的短语（`new version` / `auto reload` / `force refresh`）放 description，不放 keywords**：registry 是原始子串匹配，`force-refresh` 匹配不到用户手打的 `force refresh`。实测两种写法命中数相同，但 keywords 连字符+空格双写要 21 个（npm 页面显示重复标签），靠 description 承载只要 17 个。按 registry 的真实判据跑 22 个真实搜索词：**0.2.1 命中 6 个，改完 16 个**。
- **新增 `compatiblePackages`**（registry 官方扩展字段，带 `$schema`）：`rollup` / `rolldown` 从自动推断的 `unknown` 改成显式 `incompatible` + 原因（本插件依赖 Vite 的 `config` / `configResolved`，Rollup 不调这两个钩子）。

⚠️ 一处边界要说清：`compatiblePackages` 修的是**声明是否诚实**，不是筛选器可见性 —— registry 判据是 `if (type === 'incompatible' || type === 'unknown') return false`，两种状态在按 rollup / rolldown 版本筛选时**都会被隐藏**。真正的可见性杠杆只有 `description` 与 `keywords`。

## v0.2.1 (2026-10-08)

**补上从 0.2.0 起就欠的两件事**（两件都不改运行期行为）：

- **README 重写**（10281B → 精简版）：0.2.0 发布时 README 已经是精简后的版本，但 CHANGELOG
  没记，属于用户可见变化却无记录 —— 补上。README 随包发布，装 0.2.0 的用户拿到的就是这一版。
- **补 `.github/workflows/publish.yml`**：0.2.0 当初是手工 `npm publish` 发的，仓库既没有
  tag 也没有发布工作流，于是 `prepublish-gate` / `readme-gate` **从未在 CI 上被触发过** ——
  门禁写了等于白写。本次改成 tag `v*` 触发（npm Trusted Publishing / OIDC）。


## v0.2.0 (2026-08-13)

**dev 下改 CHANGELOG.md 即时热更新**：此前虚拟模块 `virtual:refresh-guard-changelog` 的内容在 dev server 启动时缓存，改了 CHANGELOG 必须重启 vite 才生效——在真实项目里踩到（改了日志以为没生效，重启才发现）。

- 插件 `load()` 里对 changelog 文件调 `this.addWatchFile()` 声明依赖（root 外的 changelog 也强制监听）
- 新增 `hotUpdate`（Vite 6-8 per-environment 钩子）与 `handleHotUpdate`（Vite 4-5 兼容）两个钩子：CHANGELOG 变化时 invalidate 虚拟模块并返回它，走 Vite 默认 js-update 推给 importers——页面不用重启，更新日志自动刷新
- `readChangelog` 导出并补单测（版本号解析 / 正文截取 / 日期行剔除 / `false` 关闭 / 文件缺失兜底），此前该函数零覆盖

## v0.1.4 (2026-08-11)

修复自 v0.1.1（甚至更早）起就存在的发布产物残缺问题：`tsconfig.build.json`（构建脚本 `tsc -p tsconfig.build.json` 这一步依赖的配置文件）一直没有提交进 git，导致：

- **GitHub CI 一直是红的**（`npm run build` 在干净 checkout 下找不到这个配置文件而失败），只是发布本身走的是本地手动 `npm publish`，没人注意到。
- **本地 `npm run build` 因为工作目录里残留着这个未提交的文件而"看起来是好的"**，掩盖了问题。
- **发布到 npm 的产物里缺失 `dist/core/types.d.ts`、`dist/core/checker.d.ts`**：`dist/vue/UpdatePrompt.vue`、`dist/react/UpdatePrompt.d.ts` 里 `import type { UpdateMode } from '../core/types'` 这个相对路径解析不到目标文件，导致所有消费方用 `vue-tsc`/`tsc` 类型检查时报 `TS2307: Cannot find module '../core/types'`（在两个真实项目 hym-admin、mzmeso-manager 里复现并确认）。

这版把 `tsconfig.build.json` 提交进 git，`npm run compat`（typecheck + test + build）全部通过，构建产物里 `dist/core/*.d.ts` 正确生成。

## v0.1.3 (2026-08-09)

`UpdatePrompt` 默认样式全部改成 `var(--rg-*, 默认值)` 的写法，颜色/圆角都能被外部 CSS 变量覆盖，不用改包源码就能换成自己的品牌色（README 新增"样式定制"一节说明全部变量）。默认样式本身也精修了一版（更大的圆角、更细腻的阴影分层、按钮 hover/active 反馈、标题加了个 ✨），不设置任何变量也比之前顺眼。

## v0.1.2 (2026-08-09)

修 `UpdatePrompt` 两个实测踩到的问题（在一个真实项目里第一次接入后暴露的）：

- **弹窗只显示 git hash，看不出更新了什么**：`modal-blocking` 弹窗现在建议配合 `changelog-html`
  prop 传入 `virtual:refresh-guard-changelog` 的内容——之前这个 prop 就存在但接入时容易漏传，
  这版把它在 README/SKILL.md 里的位置提得更显眼。
- **弹窗颜色跟着访问者系统的深色模式走，不跟着网站自己的主题开关走**：Vue/React 版都加了 `dark`
  prop，显式传入你自己的主题状态（如 `isDark.value`）就能让弹窗配色跟着网站自己的主题走，不传
  则维持原来的 `prefers-color-scheme` 兜底行为。

## v0.1.1 (2026-08-09)

- README 改为中文正文 + 英文版（`README.en.md`），CHANGELOG/package.json 描述同步改中文为主
- 源码注释保持英文不变

## v0.1.0 (2026-08-09)

首次发布。

- Vite 插件：构建期产出 `version.json`，把 `__REFRESH_GUARD_VERSION__` 烘焙进 bundle，另有可选的 `virtual:refresh-guard-changelog` 虚拟模块
- 框架无关的 `UpdateChecker` 核心：轮询 + 标签页重新可见时检测 + 旧 chunk 加载失败兜底 + 刷新防抖冷却
- 三档可配置强度：`silent`、`toast-auto`（默认）、`modal-blocking`
- Vue 组合式函数 + `UpdatePrompt.vue`
- React hook + `UpdatePrompt` 组件
- `notifyExternalUpdate()` 逃生舱：把 `vite-plugin-pwa` 的 `onNeedRefresh` 或任何其他外部信号接进同一套档位逻辑
