# Claude Code 接入 OpenRouter / 自定义兼容端点配置指南

## 适用场景

这篇文档适用于以下情况：

- 你希望 Claude Code 不直接连接 Anthropic 默认地址
- 你想通过 OpenRouter 或其他 Anthropic 兼容端点使用 Claude Code
- 你同时使用 VS Code 扩展和终端 CLI，希望两边共享同一套配置

## 关键结论

- VS Code 扩展里的环境变量配置，不会自动影响外部终端里的 `claude` 命令
- 如果你要让 VS Code 扩展和 CLI 共用配置，优先使用 `~/.claude/settings.json`
- 如果只想让终端生效，也可以把环境变量写到 `~/.zshrc`

## 推荐方式：使用 `~/.claude/settings.json`

创建或编辑：

```text
~/.claude/settings.json
```

示例：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "YOUR_OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY": "",
    "HTTPS_PROXY": "http://127.0.0.1:6152",
    "HTTP_PROXY": "http://127.0.0.1:6152",
    "NO_PROXY": "localhost,127.0.0.1"
  }
}
```

说明：

- `ANTHROPIC_BASE_URL` 指向你的 Anthropic 兼容接口
- `ANTHROPIC_AUTH_TOKEN` 使用实际服务要求的认证 Token
- `ANTHROPIC_API_KEY` 明确置空，避免回退到默认逻辑
- `HTTPS_PROXY` / `HTTP_PROXY` 按你的本地代理端口调整

## 备选方式：写入 shell 环境变量

如果你只想让终端里的 Claude Code CLI 生效，可以写到 `~/.zshrc`：

```bash
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="YOUR_OPENROUTER_API_KEY"
export ANTHROPIC_API_KEY=""
export HTTPS_PROXY="http://127.0.0.1:6152"
export HTTP_PROXY="http://127.0.0.1:6152"
export NO_PROXY="localhost,127.0.0.1"
```

然后执行：

```bash
source ~/.zshrc
```

## VS Code 扩展专用配置

如果你只想让 VS Code 扩展内的 Claude Code 生效，可以在 `settings.json` 里配置：

```json
"claudeCode.environmentVariables": [
  "ANTHROPIC_BASE_URL=https://openrouter.ai/api",
  "ANTHROPIC_AUTH_TOKEN=YOUR_OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY=",
  "HTTPS_PROXY=http://127.0.0.1:6152",
  "HTTP_PROXY=http://127.0.0.1:6152",
  "NO_PROXY=localhost,127.0.0.1"
]
```

注意：

- 这里是给 VS Code 扩展用的
- 它不会自动影响你在外部终端执行的 `claude`

## 验证方式

先检查环境变量：

```bash
env | egrep 'ANTHROPIC|HTTP_PROXY|HTTPS_PROXY|NO_PROXY'
```

再启动：

```bash
claude
```

如果配置生效，后续错误信息应该不再继续指向默认 Anthropic 地址，而会体现你配置的兼容接口或认证问题。

## 常见问题

### 1. VS Code 能用，终端不能用

通常是因为你只配置了 VS Code 扩展环境变量，没有给终端环境注入变量。

### 2. 终端报错仍然指向 Anthropic 默认地址

通常是因为：

- `ANTHROPIC_BASE_URL` 没有生效
- `ANTHROPIC_AUTH_TOKEN` 没有注入
- shell 没有重新加载

### 3. 修改后还是不生效

建议按顺序排查：

1. 检查 `env` 输出
2. 检查 `~/.claude/settings.json` 是否是合法 JSON
3. 完全重启 VS Code
4. 重新打开终端

## 安全建议

- 不要把真实 API Key 写进仓库
- 不要把真实 Token 贴进聊天记录、截图或公开文档
- 如果密钥已经泄露，优先去服务提供方后台轮换
