---
name: codex-dsh-routing-suite
description: 思维模式路由套件（dsh-routing-suite 的 Codex 移植版）操作手册。当任务涉及 路由/思维模式/路由器/dev_router/router/首轮锚定，或需要查看或切换当前会话的 spec/react/weak 模式、用不同模式派生一次性子进程、运行路由自检时使用。
---

# codex-dsh-routing-suite 操作手册

安装 codex-dsh-routing-suite 后，Codex 环境具备任务感知思维模式路由（移植自 DSH 生态 dsh-routing-suite）。它按首条用户消息分类会话模式，在每轮注入对应 persona 与引导，并在首次核心工具调用前对工具面做硬锚定。

## 1. 模式与分类

- 模型门控：仅 **DeepSeek** 模型生效（Flash 家族含 `deepseek-v4-flash-vision-exp` 等）；其他厂商的 `*-flash`/`*-pro`、`deepseek-chat`、缺失时本套件工作流自动停用（不注入、不锚定）。
- 分类：首条真实用户消息按关键词计数分到 `spec`（修复/排查/重构/规划/移植类）或 `react`（开发/构建/生成类）；平局或未命中 → `weak`（模型内路由，自己分类再行动）。
- 量化：`spec` [0,0.2) 稳定带；`mixed` [0.2,0.5) 过渡带（陷阱，不自动选）；`react` [0.5,1] 稳定带。
- routerMode：`standard`（默认，persona 恒为 RL 句 `You are a helpful software engineer assistant.`）；`spec`（按分类用 `personaFor` 选 persona，当前模型走 Flash 分支）。
- preset：`standard`（默认，任务路由 + 注意力工程引导）/ `spec`（固定深思考）/ `react`（固定快循环）；首轮 `#preset <name>` 指令仅当前会话生效，`config.json` 的 `preset` 为持久默认；首轮不加指令时直接按 config 配置。
  - 示例：新会话首条消息 `#preset react 帮我开发一个网页`；持久默认改 `config.json` 的 `preset`。
- weak 带：按首条消息复杂度锁定 fast 或 deep 引导，会话内不变（保缓存稳定）。
- 主会话为唯一形态：`model_instructions_file` 替换内置 identity（base.md：RL 句 + 路由规则），钩子再按轮追加 persona/引导；`dev_mode_subagent` 子进程中同样以 `model_instructions_file` 实现完整“仅 persona”替换。

## 2. 工具用法

- `dev_router_status`：查看当前会话 mode/band/persona/preset/core/promoted/override/anchoring/supported/nativeAgents/model。
- `dev_router_mode <spec|weak|mixed|react|0-100|0.0-1.0|auto>`：写 override，下一轮请求生效；`auto` 清除 override 回到任务分类。
- `dev_mode_subagent <spec|react|weak> <task> [reasoning=low|medium|high|xhigh|max]`：用不同模式派生一次性 `codex exec` 子进程（全新上下文、独立 persona、hooks 与 memories 禁用、剥离桌面端线程环境变量），当前会话轨迹与锚定状态不受影响。适合“换个模式验证结论/做交叉检查”。
- 原生多智能体后端（可选，不强制配置）：若当前会话具备 `spawn_agent` 工具（`features.multi_agent` 是否开启由你决定，本套件不修改它），可直接 `spawn_agent(agent_type = "router_spec" | "router_react" | "router_weak", message = "<task>")` 做模式隔离子代理（自定义 agents 位于 `~/.codex/agents/`，由 install 安装）；否则回退 MCP `dev_mode_subagent`（exec 后端，始终可用）。
- `dev_router_test`：运行单元、钩子场景、agents 与模型门控测试，返回 PASS/FAIL 汇总。

## 3. 首轮锚定

首个核心工具调用前，只有 `Bash`/`exec_command` 与 `apply_patch`（及按 band 配置的额外只读 MCP 工具）可用；其余工具会被 PreToolUse 钩子拒绝并返回原因。这是特性不是故障：先用核心工具完成第一步，首次核心调用后全部工具自动放开。plan 模式与 DSH 原始行为一致：宿主保留 plan 指令段，路由器照常注入 persona 并锚定核心工具面；只有 `config.json` 的 `anchoring=false` 会跳过锚定。

## 4. 自优化闭环

1. `dev_router_status` 看当前路由；
2. 若分类与任务不符，`dev_router_mode` 显式覆盖（下轮生效，代价是一次前缀缓存 miss）；
3. 改 `~/.codex/codex-dsh-routing-suite/config.json`（`routerMode` / `anchoring` / `specExtraTools` / `reactExtraTools`）即时生效（钩子每次读文件）。

## 5. 故障排查

- 钩子不生效：确认已重启 Codex、并已信任两个钩子（CLI `codex /hooks` 或桌面端信任提示）。
- 计划模式下的 persona/锚定是 DSH 原始行为（plan 段由宿主保留，路由器照常工作），不是故障；如想临时关闭锚定，设 `config.json` 的 `anchoring=false`。
- 工具被误拒：首轮锚定中，先调 `exec_command` 或 `apply_patch`；或临时设 `anchoring=false`。
- 注入文本没出现：确认 `~/.codex/codex-dsh-routing-suite/config.json` 存在、hooks 配置块在 `~/.codex/config.toml` 中未被覆盖（若使用 CC Switch 管理配置，切换供应商后需按 [CCSwitch-operations](https://github.com/RuriLothlorien/CCSwitch-operations) 技能重新同步，可选）。
- 卸载：运行仓库内 `uninstall.ps1`（会移除 config.toml 中的 codex-dsh-routing-suite 块并保留备份）。

## 6. 参考

- `references/personas.md`：persona 原文与实测依据（P23/P24/P30）。
- [docs/architecture.md](https://github.com/RuriLothlorien/codex-dsh-routing-suite/blob/main/docs/architecture.md)：机制映射、接口契约与模型适配说明。
- 原项目：https://github.com/yjh051108/dsh-routing-suite（MIT）。
