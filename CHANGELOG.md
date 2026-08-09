# 更新日志

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
