# 架构与接口说明

## 1. 背景

本套件移植自 DeepSeek Harness 生态的 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)（MIT）。原项目在 DSH 侧用 `system-prompt/assemble` Waterfall 实现首轮 persona 注入与工具面裁剪；本套件用 Codex 对等扩展面实现相同语义：

| DSH 原机制 | Codex 对等面 |
|---|---|
| system-prompt/assemble 注入 persona | `UserPromptSubmit` 钩子输出 `additionalContext` |
| 首轮工具面裁剪 | `PreToolUse` 钩子 `permissionDecision: deny` |
| 会话持久状态 | `~/.codex/routing-suite/state/<session>.json` |
| `dev_router_status` / `dev_router_mode` | MCP stdio 工具 |
| `dev_mode_subagent`（llm.stream 隔离） | 一次性 `codex exec` 子进程（默认）或原生 `router_*` agents（可选） |
| `dev_self_test` | MCP `dev_router_test` + `node --test` |

## 2. 组件与数据流

- `hooks/router-user-prompt.mjs`：记录首条用户消息与复杂度；按 override 或分类得到 mode（spec/react/weak）；返回 persona + 引导（plan 模式下与 DSH 一致，照常注入）。
- `hooks/router-pre-tool.mjs`：未 promoted 前仅放行核心工具（`bash`/`apply_patch` + 按 band 的额外 MCP 前缀），首个核心调用后置 `promoted=true`。
- `mcp/server.mjs`：零依赖 MCP 服务器，提供 `dev_router_status` / `dev_router_mode` / `dev_router_test` / `dev_mode_subagent`。
- 状态：`~/.codex/routing-suite/state/<session>.json` + `latest/<cwd>.json`；配置 `~/.codex/routing-suite/config.json`。

## 3. 配置契约（`~/.codex/routing-suite/config.json`）

```json
{
  "anchoring": true,
  "routerMode": "standard",
  "specExtraTools": [],
  "reactExtraTools": [],
  "codexCli": null
}
```

- `anchoring`：硬锚定总开关。
- `routerMode`：`standard`（persona 恒为 RL 句）或 `spec`（按分类用 `personaFor`）。
- `specExtraTools` / `reactExtraTools`：按 band 追加允许的 MCP 工具前缀（如 `mcp__codebase_memory_mcp__.*`）。
- `codexCli`：`dev_mode_subagent` 使用的 CLI 路径，安装时自动探测。

## 4. 双后端模式隔离子代理

- **MCP exec（默认）**：`dev_mode_subagent(mode, task, cwd?, reasoning?)` 生成 persona 临时文件 → 派生 `codex exec`（禁用 hooks/memories、剥离桌面端线程环境变量、`model_instructions_file` 替换）→ 返回最终消息并清理。
- **原生多智能体（可选）**：`agents/router_{spec,react,weak}.toml` 提供 `router_spec` / `router_react` / `router_weak` 自定义 agents；在具备 `spawn_agent` 的会话中用 `spawn_agent(agent_type=..., message=...)`。**不修改 `features.multi_agent`**。

## 5. 测试

`node --test test/router.test.mjs test/hook.test.mjs test/agents.test.mjs`（31 例），覆盖分类、band 量化、persona、钩子状态机、plan 模式对等行为、agents 文件校验；`dev_router_test` 可在会话内运行同一套测试。

## 6. 模型适配状态

- 实测环境：**Codex（桌面端/CLI）+ DeepSeek V4 Flash**（自定义 provider）；Flash 分支 persona/引导按该组合实测调优。
- **DeepSeek V4 Pro 及其他模型/宿主未测试**：`router-core.mjs` 保留 Pro 分支（原项目移植），效果未验证，欢迎反馈。

## 7. 边界与已知代价

- 不移植 DSH 内部机制：运行时注入器（junction/loader/HMR/staging/UI 管理页/路由自愈）与 dsh-probe 评测矩阵。
- 缓存代价：切换 mode 会使下一请求前缀缓存 miss；persona/引导按会话锁定以保缓存稳定。
- `dev_mode_subagent` 每次调用约 8–25 秒 + 25k–31k token（含 max 推理）。
- 安装器为 Codex 直装，不依赖 CC Switch；如使用 CC Switch 管理配置，可另行用 ccs-operations 技能做可选同步。
