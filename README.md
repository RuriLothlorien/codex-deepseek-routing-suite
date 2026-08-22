# codex-deepseek-routing-suite

![License](https://img.shields.io/github/license/RuriLothlorien/codex-deepseek-routing-suite)
![Release](https://img.shields.io/github/v/release/RuriLothlorien/codex-deepseek-routing-suite)
![Stars](https://img.shields.io/github/stars/RuriLothlorien/codex-deepseek-routing-suite?style=social)

> [English](README.en.md) | 中文

**[dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite) 的 Codex 移植版**：任务感知思维模式路由（spec / react / weak），通过 Hooks + MCP 工具让 Codex 按任务类型采用匹配的思维模式，并在首轮对工具面做硬锚定。

如果这个套件对你有帮助，欢迎点个 Star ⭐。

> ⚠️ **模型适配声明**：本套件专门面向 **Codex + DeepSeek** 设计，仅在 **Codex（桌面端/CLI）搭配 DeepSeek V4 Flash** 组合上实测调优；**DeepSeek V4 Pro 未测试，效果未验证**。`router-core.mjs` 中的 Pro 分支来自原项目移植，请按“未实测”对待。

## 致谢

感谢 [yjh051108](https://github.com/yjh051108) 的 **风神插件**；本套件基于 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)（MIT）移植，原项目归属详见 NOTICE。

## 为什么需要（当 Codex/ChatGPT 作为 DeepSeek 的 Agent 时）

原项目在 DeepSeek 系列上的实测（P1-P30）表明，当你用 Codex/ChatGPT 作为 DeepSeek 的 Agent 时，这套适配不是可选项：

- **行为是分相的，不是连续可调**：persona 轴坍缩为 spec / mixed（陷阱）/ react 三个稳定带；V4 Flash 更是阈值式——0-0.5 全在 spec 侧，0.75+ 才跳到 react。
- **首轮即路径承诺**：第一次请求的 persona 与工具 schema 面决定整条会话轨迹，中途换模式基本无效，还会废掉前缀缓存。
- **RL 接口还原显著**：首轮只给 shell + 编辑器（RL 形态）时行动率 100%、推理更短；完整目录稀释首轮注意力，且首轮 prefill 最贵（缓存命中便宜约 10 倍）。
- **模糊任务应交模型自分类**：weak 内路由比硬分类更准；Flash 与 Pro 的最优 persona 不可互换（Flash 要 neutral + classify + 锚，Pro 要 spec 句 + few-shot）。

本套件把这些测量固化为 Codex + DeepSeek 的默认行为：

- **按任务分类**：构建 → react；修复/重构/规划 → spec；模糊 → weak。
- **首轮硬锚定**：首个核心工具调用前只暴露 `Bash`/`exec_command` 与 `apply_patch`。
- **每轮近距离注入** persona + 引导（缓存友好，plan 模式与 DSH 一致）。
- **Flash 分支默认** + 中文规划/移植分类修正 + 深度自适应引导。
- **双后端模式隔离**：`codex exec` 子进程（默认）或可选原生 agents。

## 功能特性

- 主会话唯一形态：`model_instructions_file` 替换内置 identity（RL 句 + 路由规则），钩子按轮追加 persona/引导。
- 四个 MCP 工具 + 自检：`dev_router_status` / `dev_router_mode` / `dev_mode_subagent` / `dev_router_test`。
- 零运行时依赖：钩子与 MCP 服务器均为零依赖 Node 脚本；安装/卸载脚本幂等且可逆。
- 可选原生多智能体后端：`router_spec` / `router_react` / `router_weak` 自定义 agents。
- 安装为 Codex 直装；若使用 CC Switch 管理配置，可另行用 [CCSwitch-operations](https://github.com/RuriLothlorien/CCSwitch-operations) 技能同步。

## 工作原理

- `UserPromptSubmit` 钩子：记录首条用户消息并分类，按轮返回 persona + 引导（`additionalContext`）。
- `PreToolUse` 钩子：首轮仅放行核心工具，首个核心调用后置 `promoted=true` 并全量放开。
- 会话状态落盘于 `~/.codex/routing-suite/state/`，resume/续接不丢。
- MCP 服务器读写同一状态，支持查看/切换模式、运行自检、派生隔离子进程。

## DeepSeek 特定适配

本套件面向 **Codex + DeepSeek** 设计，在 **DeepSeek V4 Flash** 上实测调优，主要适配点：

- **Flash 分支 persona 为默认**：weak 模式采用 Flash 最优形态（neutral + classify-then-act + recall/收敛/反跑题锚，依据原项目 P11/P23）；`router-core.mjs` 保留 Pro 分支（来自原项目）但未实测。
- **RL 接口还原**：用 `model_instructions_file` 注入 RL 训练句（`You are a helpful software engineer assistant.`）+ 路由规则；首轮核心面 = `Bash`/`exec_command` + `apply_patch`，对应原项目 shell + str_replace_editor 的 RL 形态测量（行动率更高、推理更短）。
- **深度自适应引导**：按 `isComplexTask`（长文本或 架构/设计/重构 等关键词，含中文）选择 deep-guide / fast-guide（P30：深度 +12% 且收敛更快）。
- **中文任务分类适配**：`SPEC_RE` 增加 `规划|计划|方案|阅读|移植`，降低 DeepSeek 中文规划/移植任务被“实现”误判为 react 的概率。
- **模式隔离子进程**：`dev_mode_subagent` 用 `model_instructions_file` 做完整 persona 替换，剥离桌面端线程环境变量、禁用 hooks/memories；`reasoning` 参数映射 `model_reasoning_effort`。
- **严格模型门控**：按模型 slug 精确区分 Flash / Pro；Flash 家族包含 `deepseek-v4-flash` 与 `deepseek-v4-flash-vision-exp` 等。二者皆非（如 `deepseek-chat`、其他模型、缺失）时，本套件工作流自动停用（不注入、不锚定、子代理拒绝）。
- 上述测量依据来自原项目（P11/P23/P24/P30 等，DSH 环境）；本移植在 Codex + V4 Flash 组合上实测。

## 仓库结构

```text
codex-deepseek-routing-suite/
├─ hooks/                  # UserPromptSubmit + PreToolUse 钩子
├─ mcp/server.mjs          # 零依赖 MCP 服务器（dev_router_*）
├─ skills/dsh-router/      # 技能手册与 persona 参考
├─ agents/                 # 可选原生 agents（router_*）
├─ instructions/base.md    # 主会话 persona 替换基础指令
├─ test/                   # 仓库 32 例（会话内自检 31 例）
├─ docs/architecture.md    # 机制映射、接口契约与模型适配说明
├─ install.mjs / uninstall.mjs  # 跨平台安装/卸载（推荐）
├─ install.sh / uninstall.sh    # macOS/Linux POSIX 入口
├─ install.ps1 / uninstall.ps1  # Windows PowerShell 版
├─ LICENSE / NOTICE / CHANGELOG.md
└─ README.md / README.en.md
```

## 安装

**完整安装（hooks + MCP + 技能 + agents，Windows / macOS / Linux 通用）**：

```sh
node install.mjs        # 跨平台（推荐）；Windows PowerShell 亦可：.\install.ps1
./install.sh            # macOS/Linux（Node 安装器的 POSIX 入口）
```

安装后：重启 Codex（桌面端或 CLI）→ 信任两个新钩子（CLI `codex /hooks` 或桌面端信任提示）→ 新会话调用 `dev_router_status` 验证。

**纯技能用法**：把 `skills/dsh-router` 复制或软链接到 `~/.codex/skills/`（或其他 SKILL.md agent 的 skills 目录）。

## 模式隔离子代理：双后端

| 后端 | 触发方式 | 依赖 |
|---|---|---|
| MCP exec（默认） | `dev_mode_subagent <spec\|react\|weak> <task> [reasoning=...]` | 无（一次性 `codex exec` 子进程） |
| 原生多智能体（可选） | `spawn_agent(agent_type="router_spec"\|"router_react"\|"router_weak", message="<task>")` | 会话具备 `spawn_agent`；**不强制**开启 `features.multi_agent` |

`dev_router_status` 的 `nativeAgents` 字段显示三个 agent 是否已安装。

## 卸载

```sh
node uninstall.mjs      # 跨平台（推荐）；Windows PowerShell 亦可：.\uninstall.ps1
./uninstall.sh          # macOS/Linux（Node 卸载器的 POSIX 入口）
```

## 版本兼容

- 上游来源：基于 [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)（上游组件 tag v0.3.0）中的 **dsh-router-standard** 预设（preset 包版本 v0.2.0）移植；`router-core.mjs` 即该预设核心，另含中文分类关键词扩展（方案 A）。
- Codex 桌面端 / CLI（实测 0.149+）；Node >= 22；安装入口：`node install.mjs`（跨平台）、`./install.sh`（macOS/Linux）、`.\install.ps1`（Windows）。
- 平台：Windows / macOS / Linux；Agent 形态：Codex 桌面端与 CLI 均兼容（共用同一套 hooks/MCP/技能配置）。
- 模型：专门面向 Codex + DeepSeek 设计；实测组合为 V4 Flash；V4 Pro 未测试。
- 许可证：MIT（原套装归属见 NOTICE）。
