# 更新日志

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
