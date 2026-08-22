# persona 原文与实测依据

## persona（router-core 原样移植）

- RL 句：`You are a helpful software engineer assistant.`
- react（hands-on doer）：hands-on production，produce-verify-fix，不搭多余脚手架，结尾给可用交付物 + 简短总结。
- spec（plan-collective）：plan-first、read-first（read/edit/glob/grep），先理解再动手。
- weak（Flash 分支，当前 deepseek-v4-flash 生效）：`You are a helpful assistant.` + classify-then-act + 回顾已完成/不重复 + 禁止环境检查与穷举扫描 + Think deeply first, then produce。

完整文本见仓库根 `router-core.mjs`（`personaFor`）。

## 实测依据（来自 dsh-routing-suite 论文，DSH 环境测量）

- 行为沿 persona 轴坍缩为三个稳定带（spec / mixed 陷阱 / react），连续调节是幻觉。
- 弱域内路由按模型选 persona：Flash=neutral+classify+锚（P11 +5.67；锚把单任务完成率拉到 100%，P23）；Pro=spec 句 + classify（P24）。
- 近距离引导（用户消息后注入）优于 system 远距离：固定文本缓存命中 92-94%，路由 96% + 收敛 100%（P14/P16/P20）。
- 深度自适应引导（P30）：复杂任务 deep-guide（深度 +12% 且收敛更快），简单任务 fast-guide（1 步零浪费）。
- 单任务三锚（回顾 + 收敛 + 反跑题）：开放任务完成率 0% → 100%（P22/P23）。
- 首轮工具面决定策略轨迹：窄工具面（shell + 编辑器）下 100% 行动且推理更短（18-29K vs 73-101K 字符）。

## Codex 移植差异

- 主会话由 `model_instructions_file` 替换内置 identity（唯一形态）；完整“仅 persona”替换在 `dev_mode_subagent` 子进程中同样实现。
- 首轮核心面统一为 `Bash`/`exec_command` + `apply_patch`（Codex 的 shell+编辑器），spec/react 可经 `specExtraTools`/`reactExtraTools` 追加只读 MCP 前缀。
