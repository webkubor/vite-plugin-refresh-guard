# AGENTS.md — AI 助手工作守则

## 这是什么

vite-plugin-refresh-guard —— Vite 版本更新检测与刷新插件：部署新版本后，
页面加载时检测更新，按配置走「静默刷新 / 提示后刷新 / 弹窗阻断」三种策略。
核心逻辑框架无关，Vue 与 React 各一层薄适配。

## 关键文件

- `src/`：源码 —— 核心检测逻辑与 Vue/React 适配层分开，改核心时别把框架细节掺进去。
- `test/` 与 `npm run test`：行为测试；`npm run compat` 是兼容性测试。
- `SKILL.md`：本仓库的 agent skill 说明。
- `README.md` / `README.en.md`：双语 README，同步改。

## 常用命令

```bash
npm run build        # 构建
npm run typecheck    # 类型检查
npm run test         # 测试
npm run compat       # 框架兼容性测试
```

## 约定

- 核心逻辑保持框架无关：Vue/React 的差异只允许存在于各自适配层。
- 版本检测的策略语义（静默/提示/阻断）是对外 API 契约，改动需要升 minor 并写清迁移说明。
