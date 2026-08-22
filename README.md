# codex-deepseek-routing-suite

![License](https://img.shields.io/github/license/RuriLothlorien/codex-deepseek-routing-suite)
![Release](https://img.shields.io/github/v/release/RuriLothlorien/codex-deepseek-routing-suite)
![Stars](https://img.shields.io/github/stars/RuriLothlorien/codex-deepseek-routing-suite?style=social)

> [English](README.en.md) | 中文

**dsh-routing-suite 的 Codex 移植版**：任务感知思维模式路由（spec / react / weak），通过 Hooks + MCP 工具让 Codex 按任务类型采用匹配的思维模式，并在首轮对工具面做硬锚定。

> ⚠️ **模型适配声明**：本套件仅在 **DeepSeek V4 Flash** 上实测调优；**DeepSeek V4 Pro 未经测试，效果未验证**。`router-core.mjs` 中保留了 Pro 分支（来自原项目），但请按“未实测”对待。

## 为什么需要

模型的首轮请求结构会决定整条会话的策略轨迹：构建任务适合“直接动手”，修复/规划任务适合“先查后改”，模糊任务适合让模型自己分类。模式错配会带来明显的质量损失；而完整工具目录会稀释首轮注意力并推高无缓存 prefill 成本。

这套工具把“任务感知路由”带进 Codex：

- **按任务分类**：构建 → react（hands-on）；修复/重构/规划 → spec（inspect-and-plan）；模糊 → weak（模型内路由）。
- **首轮硬锚定**：首个核心工具调用前只暴露 `Bash`/`exec_command` 与 `apply_patch`，之后自动放开全部工具。
- **每轮注入 persona 与引导**：近距离、缓存友好，plan 模式下与 DSH 原始行为一致。
- **双后端模式隔离**：可用一次性 `codex exec` 子进程，也可在具备 `spawn_agent` 的会话用原生 agents——不强制开启多智能体配置。

## 功能特性

- 主会话唯一形态：`model_instructions_file` 替换内置 identity（RL 句 + 路由规则），钩子按轮追加 persona/引导。
- 四个 MCP 工具 + 自检：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent` / `dev_router_test`。
- 零运行时依赖：钩子与 MCP 服务器均为零依赖 Node 脚本；安装/卸载脚本幂等且可逆。
- 可选原生多智能体后端：`router_spec` / `router_react` / `router_weak` 自定义 agents。
- 安装为 Codex 直装，不依赖 CC Switch（若使用 CC Switch 管理配置，可另行用 ccs-operations 技能同步）。

## 工作原理

- `UserPromptSubmit` 钩子：记录首条用户消息并分类，按轮返回 persona + 引导（`additionalContext`）。
- `PreToolUse` 钩子：首轮仅放行核心工具，首个核心调用后置 `promoted=true` 并全量放开。
- 会话状态落盘于 `~/.codex/routing-suite/state/`，resume/续接不丢。
- MCP 服务器读写同一状态，支持查看/切换模式、运行自检、派生隔离子进程。

## 仓库结构

```text
codex-deepseek-routing-suite/
├─ hooks/                  # UserPromptSubmit + PreToolUse 钩子
├─ mcp/server.mjs          # 零依赖 MCP 服务器（dev_router_*）
├─ skills/dsh-router/      # 技能手册与 persona 参考
├─ agents/                 # 可选原生 agents（router_*）
├─ instructions/base.md    # 主会话 persona 替换基础指令
├─ test/                   # 31 例单元/钩子/agents 测试
├─ docs/architecture.md    # 机制映射、接口契约与模型适配说明
├─ install.ps1 / uninstall.ps1
├─ LICENSE / NOTICE / CHANGELOG.md
└─ README.md / README.en.md
```

## 安装

**完整安装（hooks + MCP + 技能 + agents）**：

```powershell
.\install.ps1
```

安装后：重启 Codex → 信任两个新钩子（CLI `codex /hooks` 或桌面端信任提示）→ 新会话调用 `dev_router_status` 验证。

**纯技能用法**：把 `skills/dsh-router` 复制或软链接到 `~/.codex/skills/`（或其他 SKILL.md agent 的 skills 目录）。

## 模式隔离子代理：双后端

| 后端 | 触发方式 | 依赖 |
|---|---|---|
| MCP exec（默认） | `dev_mode_subagent <spec\|react\|weak> <task> [reasoning=...]` | 无（一次性 `codex exec` 子进程） |
| 原生多智能体（可选） | `spawn_agent(agent_type="router_spec"\|"router_react"\|"router_weak", message="<task>")` | 会话具备 `spawn_agent`；**不强制**开启 `features.multi_agent` |

`dev_router_status` 的 `nativeAgents` 字段显示三个 agent 是否已安装。

## 卸载

```powershell
.\uninstall.ps1
```

## 版本兼容

- Codex 桌面端 / CLI（实测 0.149+）；Node >= 22；Windows PowerShell。
- 模型：DeepSeek V4 Flash（实测）；V4 Pro 未测试。
- 许可证：MIT（原套装归属见 NOTICE）。
