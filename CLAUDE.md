# ip-website-studio

> 把一份文稿封装成「发布级」单文件 HTML 网站，并可托管在静态服务上。
> 这是一个 **Claude Code 建站工作流**。

## 给 Claude 的工作约定

- 用户要做网站时，**走 `.claude/skills/build-site/SKILL.md` 的六步工作流**，不要自由发挥。
- 动手前先读 `training/principles.md` 和 `training/rubric.md`（内部资产，主站不展示，但 skill 和 builder 都引用）。
- 生成网站后，**必须**起独立 sub-agent 跑 `5b 复评`——评分者 ≠ 被评分者。
- 加权总分 ≥ 3.5 / 5（A 档）才能进部署；broken image / 死按钮 / 占位文案 任一命中即 ship-blocked。
- 所有成品放 `output/<网站名>/`（默认不带 output/，本地建即可）。

## SKILL 六步工作流（主线）

```
1. 需求挖掘  →  问清 5 个核心问题（用途 / 动效 / 媒体 / 时长 / 调性）
2. 选模板    →  从同维度高分样本里挑骨架
3. 备素材    →  BGM / 真人照 / 视频 / 配图
4. 生成      →  在 output/<name>/index.html 写网站
5a. 自检     →  generator 过 5 项一票否决检查
5b. 复评     →  独立 sub-agent 跑评分项，加权总分 < 3.5 回炉
6. 部署      →  Cloudflare Pages 或同等静态托管
```

## 内部资产位置

| 文件 | 用途 |
|---|---|
| `training/principles.md` | 设计原则参考表（生成前查） |
| `training/rubric.md` | 评分量表（5b 复评用） |
| `training/exemplars/good/` | 同形态高分样本（选模板阶段查） |
| `training/protocol-feedback.md` | 历史踩坑记录 |
| `assets/system-prompt.txt` | 浏览器 builder 的 system prompt |

这些资产对主站访客**不展示**，但工具运行时会引用。

## 主站结构

主站只有两段：

- **Hero + Try It** — 工具入口
- **About** — 作者身份 + GitHub

不展示 showcase、不展示方法论。如需调整文案，直接改 `index.html`。
