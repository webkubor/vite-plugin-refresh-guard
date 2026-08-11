# 更新日志

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
