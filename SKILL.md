---
name: refresh-guard
description: "vite-plugin-refresh-guard 的 agent 接入手册。给 Vite 前端项目加'检测新版本部署→通知→刷新'机制，三档强度可选（静默自动刷新 / toast提示+短延迟自动刷新 / 弹窗阻断必须手动点击），核心逻辑框架无关，Vue/React 各有一份薄适配层，另附一个独立可选的 CHANGELOG.md 展示层。在 Vite 项目里需要处理'部署新版本后用户还在用旧代码/旧chunk 404 白屏'问题，或者想把项目里手写的一次性 version-check 脚本换成可维护的通用方案时用这个。"
version: 0.1.0
---

# vite-plugin-refresh-guard

给 Vite 项目解决"部署了新版本，怎么让还开着页面的用户用上"这件事，把强度做成显式可配置的三档，而不是每个项目各写一份、后来者猜不透为什么这么写。

## 何时用

- 项目里散落着"轮询 version.json 强刷" / "监听 SW onNeedRefresh 弹窗" 这类手写代码，想统一成一套可维护的方案
- 用户反馈"部署后页面白屏 / 报 ChunkLoadError / 点按钮没反应"——大概率是旧 HTML 引用了新部署已经删掉的带 hash 的 JS/CSS 文件，需要接一个"检测到旧 chunk 加载失败就强刷"的兜底
- 新起一个 Vite 项目，问"要不要做版本更新提示"这类问题时，可以直接推荐并接入这个方案，不用现场设计
- 排查"弹了两次更新提示"或"刷新死循环"这类 bug——本包自带 `refreshCooldown` 防抖，检查是不是绕开了这层直接调 `location.reload()`

## 三档怎么选（不确定选哪个就问用户，别替他们决定）

- `silent`：用户无感，静默刷新。适合内部工具、没人会在页面上"正在做一半的事"的场景。如果项目已经在用 `vite-plugin-pwa` 的 `registerType:'autoUpdate'`，这一档可能根本不需要——service worker 自己就会做，本包这时候只用来接 changelog 展示层就够了
- `toast-auto`（默认）：右下角小提示 + 短延迟（默认1.2s）自动刷新。大多数 to-C 产品用这个，给用户一个"哦要刷新了"的心理准备，但不打断
- `modal-blocking`：居中弹窗，不可点遮罩关闭，必须点"立即更新"才刷新。适合"刷新会丢失用户没保存的东西"的场景（表单填一半、正在上传）

## 接入步骤

1. 装包：`npm i -D vite-plugin-refresh-guard`（`vue`/`react`+`react-dom` 按项目实际技术栈装，都是可选 peerDependency）

2. `vite.config.ts` 加插件：
```ts
import { refreshGuard } from 'vite-plugin-refresh-guard'
export default defineConfig({ plugins: [refreshGuard()] })
```
这一步在构建期做两件事：产出 `version.json`（带 version/buildId/commit/time），并把当前版本号烘焙成全局常量 `__REFRESH_GUARD_VERSION__`。**只在 `vite build` 生效，`vite dev` 下不会生成 `version.json`**——这是预期行为，dev 模式已经有 HMR，不需要这套。

3. 应用入口按框架接一层（Vue 用 `vite-plugin-refresh-guard/vue` + `UpdatePrompt.vue`，React 用 `vite-plugin-refresh-guard/react` + `UpdatePrompt`），具体代码见 README「Quick start」——**不要自己抄一遍逻辑，直接 import 用**。

4. TypeScript 项目在 `env.d.ts`（或已有 `vite/client` reference 的地方）加一行：
```ts
/// <reference types="vite-plugin-refresh-guard/client" />
```
否则 `__REFRESH_GUARD_VERSION__` 和 `virtual:refresh-guard-changelog` 会报类型找不到。

5. 项目已经在用 `vite-plugin-pwa` 且想要它的更新事件也走同一套 UI（而不是让 SW 自己默默 autoUpdate）：在 `registerSW({ onNeedRefresh })` 回调里调用 `checker.notifyExternalUpdate()`（Vue/React 的 `useVersionCheck()` 返回值里都有这个方法），别再另外接一套弹窗逻辑。

## 常见误用（帮用户避坑）

- **不要**在 `mode: 'modal-blocking'` 的弹窗外面又加一个背景点击关闭——设计上就是不可关闭的，加了等于白做这一档
- **不要**绕开 `checker.applyUpdate()` 直接手写 `location.reload()`——会跳过 `refreshCooldown` 防抖，遇到 `version.json` 缓存配置有问题时容易刷新死循环
- **不要**把"版本更新提示"和"CHANGELOG 展示"强行绑死成一套逻辑——这俩是两码事（一个决定"要不要刷新"，一个决定"给用户看什么"），本包故意拆成独立的 `virtual:refresh-guard-changelog` 虚拟模块，各用各的，不想要 changelog 就在插件配置里 `changelog: false`
- 项目里如果已经有 `vite-plugin-pwa` 的 `autoUpdate` 在跑，别再叠加本包的 `interval` 轮询去做同一件"静默刷新"的事——两套机制同时静默触发过，历史上就出过"到底是谁刷新的"排查不清的问题，选一个就好

## 参考实现来源

三档强度分别对应三个真实项目里各自演化出来的做法（2026-08-09 调研整理）：`silent` 参考自某电商后台的 `vite-plugin-pwa autoUpdate`；`toast-auto` 参考自某内容平台的手写 `version.js` 轮询+短延迟刷新；`modal-blocking` 参考自某控制台产品的 SW+轮询双保险+强制弹窗（三层抽象里做得最完整的一版，是本包 core/checker.ts 状态机设计的主要参照）。
