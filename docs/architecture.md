# 架构与接口说明

## 1. 背景

本套件移植自 DeepSeek Harness 生态的 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)（MIT，上游组件 tag v0.3.0；其中 dsh-router-standard preset 包版本 v0.2.0，`router-core.mjs` 即该预设核心）。原项目在 DSH 侧用 `system-prompt/assemble` Waterfall 实现首轮 persona 注入与工具面裁剪；本套件用 Codex 对等扩展面实现相同语义：

| DSH 原机制 | Codex 对等面 |
|---|---|
| system-prompt/assemble 注入 persona | `UserPromptSubmit` 钩子输出 `additionalContext` |
| 首轮工具面裁剪 | `PreToolUse` 钩子 `permissionDecision: deny` |
| 会话持久状态 | `~/.codex/codex-dsh-routing-suite/state/<session>.json` |
| `dev_router_status` / `dev_router_mode` | MCP stdio 工具 |
| `dev_mode_subagent`（llm.stream 隔离） | 一次性 `codex exec` 子进程（默认）或原生 `router_*` agents（可选） |
| `dev_self_test` | MCP `dev_router_test` + `node --test` |

## 2. 组件与数据流

- `hooks/router-user-prompt.mjs`：记录首条用户消息与复杂度；按 override 或分类得到 mode（spec/react/weak）；返回 persona + 引导（plan 模式下与 DSH 一致，照常注入）。
- `hooks/router-pre-tool.mjs`：未 promoted 前仅放行核心工具（`bash`/`apply_patch` + 按 band 的额外 MCP 前缀），首个核心调用后置 `promoted=true`。
- `mcp/server.mjs`：零依赖 MCP 服务器，提供 `dev_router_status` / `dev_router_mode` / `dev_router_test` / `dev_mode_subagent`。
- 状态：`~/.codex/codex-dsh-routing-suite/state/<session>.json` + `latest/<cwd>.json`；配置 `~/.codex/codex-dsh-routing-suite/config.json`。

## 3. 配置契约（`~/.codex/codex-dsh-routing-suite/config.json`）

```json
{
  "anchoring": true,
  "routerMode": "standard",
  "preset": "standard",
  "specExtraTools": [],
  "reactExtraTools": [],
  "codexCli": null
}
```

- `anchoring`：硬锚定总开关。
- `routerMode`：`standard`（persona 恒为 RL 句）或 `spec`（按分类用 `personaFor`）。
- `preset`：`standard`（默认，任务路由 + 注意力工程引导）/ `spec`（固定深思考）/ `react`（固定快循环）；首轮 `#preset <name>` 指令仅当前会话生效。
- `specExtraTools` / `reactExtraTools`：按 band 追加允许的 MCP 工具前缀（如 `mcp__codebase_memory_mcp__.*`）。
- `codexCli`：`dev_mode_subagent` 使用的 CLI 路径，安装时自动探测。

## 4. 双后端模式隔离子代理

- **MCP exec（默认）**：`dev_mode_subagent(mode, task, cwd?, reasoning?)` 生成 persona 临时文件 → 派生 `codex exec`（禁用 hooks/memories、剥离桌面端线程环境变量、`model_instructions_file` 替换）→ 返回最终消息并清理。
- **原生多智能体（可选）**：`agents/router_{spec,react,weak}.toml` 提供 `router_spec` / `router_react` / `router_weak` 自定义 agents；在具备 `spawn_agent` 的会话中用 `spawn_agent(agent_type=..., message=...)`。**不修改 `features.multi_agent`**。

## 5. 测试

`node --test test/router.test.mjs test/router-model.test.mjs test/hook.test.mjs test/agents.test.mjs`（仓库 39 例；会话内 `dev_router_test` 38 例，安装器用例仅仓库运行），覆盖分类、band 量化、persona、模型门控、钩子状态机、plan 模式对等行为、agents 文件校验。

真实会话的有效性核验记录（计划模式、模糊任务、多轮复杂会话等）见 `docs/validation-report.md`（中文）。

## 6. 模型适配状态

- 本套件专门面向 **Codex + DeepSeek** 设计；实测环境：**Codex（桌面端/CLI）+ DeepSeek V4 Flash**（自定义 provider），Flash 分支 persona/引导按该组合实测调优。
- **DeepSeek V4 Pro 未测试**：`router-core.mjs` 保留 Pro 分支（原项目移植），效果未验证，欢迎反馈。
- 具体适配：① Flash 分支 persona 为默认（weak 用 Flash 最优形态 + recall/收敛/反跑题锚，P11/P23）；② RL 接口还原（`model_instructions_file` 注入 RL 句 + 首轮 `bash`/`apply_patch` 核心面）；③ 深度自适应引导（`isComplexTask` 含中文关键词 → deep/fast guide，P30）；④ 中文分类关键词扩展（`规划|计划|方案|阅读|移植`）；⑤ `dev_mode_subagent` 的 `reasoning` 映射 `model_reasoning_effort`。
- 模型门控（严格）：`modelClass` 先要求 DeepSeek 家族（`deepseek` 或 `ds-` 前缀），再精确返回 `flash` / `pro` / `null`——Flash 家族含 `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp` 等；Pro 家族含 `pro|reasoner|r1|v4-pro`。其他厂商的 `*-flash`/`*-pro`、`deepseek-chat`、缺失均返回 `null`，套件工作流整体停用：钩子不注入、不锚定，`dev_mode_subagent` 拒绝执行。
- 测量依据来自原项目（P11/P23/P24/P30，DSH 环境）；本移植在 Codex + V4 Flash 组合实测。
- 有效性核验：计划模式、模糊任务、多轮复杂会话等场景已在真实 Codex 会话中验证，详见 `docs/validation-report.md`。

## 7. 边界与已知代价

- 不移植 DSH 内部机制：运行时注入器（junction/loader/HMR/staging/UI 管理页/路由自愈）与 dsh-probe 评测矩阵。
- 缓存代价：切换 mode 会使下一请求前缀缓存 miss；persona/引导按会话锁定以保缓存稳定。
- `dev_mode_subagent` 每次调用约 8–25 秒 + 25k–31k token（含 max 推理）。
- 安装器为 Codex 直装；如使用 CC Switch 管理配置，可另行用 [CCSwitch-operations](https://github.com/RuriLothlorien/CCSwitch-operations) 技能做可选同步。

## 8. 平台与 Agent 形态兼容

- 平台：Windows / macOS / Linux；安装器为跨平台 `node install.mjs`（支持 `--home` 与 `--dry-run`），并提供 `install.sh`（macOS/Linux POSIX 入口）与 Windows PowerShell 版 `install.ps1`；卸载对应 `node uninstall.mjs` / `uninstall.sh` / `uninstall.ps1`。
- Agent 形态：Codex 桌面端与 CLI 共用 `~/.codex/config.toml`、skills 与 MCP 配置，两者均已实测/验证（同一机制；安装后需重启并在 `codex /hooks` 或桌面端信任两个新钩子）。
- `dev_mode_subagent` 依赖本机 codex CLI：安装时自动探测（Windows：AppData bin 最新目录；macOS/Linux：PATH），失败时工具返回明确错误。

## 9. 安全与隐私

- 全本地运行：钩子与 MCP 服务器为本机零依赖 Node 脚本；路由（分类、注入、锚定、状态读写）不产生网络请求或遥测。
- 数据边界：状态仅写入 `~/.codex/codex-dsh-routing-suite/state/`（会话 id、首条消息文本、模式/复杂度/提升状态）；不读取、不保存密钥或令牌。
- 权限最小化：`UserPromptSubmit` 只返回注入文本；`PreToolUse` 只返回放行/拒绝决策；`model_instructions_file` 指向只读 Markdown。
- 可审计、可回滚：行为可在会话记录复核；`config.json` 与状态文件可人工检查；卸载脚本完整移除配置标记、运行时、技能与 agents。
- 信任链：两个钩子需显式信任（`codex /hooks` 或桌面端）后才生效；源码开源可审阅。
- 子代理隔离：`dev_mode_subagent` 本地一次性 `codex exec` 子进程，剥离桌面端环境变量、禁用 hooks/memories、临时 persona 用后即删；复用现有 codex CLI / DeepSeek API 链路，不新增凭据存储。
- 模型门控兜底：非 DeepSeek 或未识别模型自动停用工作流。
