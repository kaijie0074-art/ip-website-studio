# ip-website-studio

> **在浏览器里用 AI 造一个单文件网站。**
>
> 带上你自己的 Anthropic API key，把你想说的事丢进来，几分钟后下载一个能直接打开、能塞进微信发给任何人的单文件 HTML。

---

## 这是什么

一个 **Claude Code 建站工作流**，把一份文稿 / 一个想法封装成「发布级」的单页 HTML 网站。

两种用法：

- **在线（BYOK）** — 打开主站点击 **Try It**，输入你的 Anthropic API key，在浏览器里直接生成网站。数据不离开你的浏览器。
- **本地（Claude Code）** — 把 `.claude/skills/build-site/` 装进你自己的 Claude Code 项目，在终端里说「把这段文稿做成网站」。

## 关键特性

| | |
|---|---|
| **BYOK** | 你带自己的 Anthropic API key，密钥只存在本地浏览器 |
| **In-browser** | 没有后端、没有账号，全部在浏览器里跑 |
| **Single file** | 出货是一个 `index.html` —— 可双击打开、可微信分享、可托管在任何静态服务上 |
| **Claude Code skill** | `.claude/skills/build-site/` 可拷到任何 Claude Code 项目复用 |

## 项目结构

```
ip-website-studio-public/
├── README.md                       # 本文件
├── CLAUDE.md                       # 项目级 AI agent 指令
├── index.html                      # 主站（含 Try It builder）
├── assets/
│   ├── builder.js                  # Try It · 浏览器内建站工作台
│   ├── builder.css
│   └── system-prompt.txt           # builder 用的 system prompt
├── .claude/skills/build-site/      # 本地 Claude Code SKILL
│   ├── SKILL.md
│   └── references/
└── training/                       # 给 skill / builder 用的内部资产（不在主站展示）
```

## 怎么用

### Path A · 在线 Try It（最快）

打开主站，点 **Try It → 打开建站工作台**，按里面的提示填 API key + 描述。生成完会给你一个可下载的 HTML 文件。

### Path B · 本地 Claude Code skill

```bash
cp -r ip-website-studio-public/.claude/skills/build-site/ <你的项目>/.claude/skills/
cp -r ip-website-studio-public/training/ <你的项目>/training/
```

然后在你的 Claude Code 里说「把这段文稿做成网站」。

## License

MIT —— 自由 fork / 商用 / 改造。

## 作者

杨凯杰 · 上海对外经贸大学在读 · AI 产品独立开发者 · [github.com/kaijie0074-art](https://github.com/kaijie0074-art)
