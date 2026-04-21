# DeepSeek Anthropic 兼容配置说明

## 适用场景

这篇文档适用于你希望把 DeepSeek 作为 Anthropic 兼容端点接入到 Claude Code 或类似工具的场景。

## 基础环境变量

```bash
export ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"
export ANTHROPIC_AUTH_TOKEN="YOUR_DEEPSEEK_API_KEY"
export API_TIMEOUT_MS="600000"
export ANTHROPIC_MODEL="deepseek-chat"
export ANTHROPIC_SMALL_FAST_MODEL="deepseek-chat"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"
```

## 本地代理环境

如果你的当前网络环境需要走本地代理，再补上：

```bash
export http_proxy="http://127.0.0.1:6152"
export https_proxy="http://127.0.0.1:6152"
export HTTP_PROXY="http://127.0.0.1:6152"
export HTTPS_PROXY="http://127.0.0.1:6152"
```

## 推荐写法

如果你只是临时测试，可以直接在当前 shell 中执行上述命令。  
如果你要长期使用，建议写入：

- `~/.zshrc`
- 或 `~/.claude/settings.json`

## `~/.claude/settings.json` 示例

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "YOUR_DEEPSEEK_API_KEY",
    "API_TIMEOUT_MS": "600000",
    "ANTHROPIC_MODEL": "deepseek-chat",
    "ANTHROPIC_SMALL_FAST_MODEL": "deepseek-chat",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "HTTP_PROXY": "http://127.0.0.1:6152",
    "HTTPS_PROXY": "http://127.0.0.1:6152"
  }
}
```

## 验证方式

先检查变量是否存在：

```bash
env | egrep 'ANTHROPIC|API_TIMEOUT_MS|HTTP_PROXY|HTTPS_PROXY'
```

再启动工具进行一次最小验证。

## 注意事项

- 示例中的 Key 必须替换成你自己的真实值
- 不要把 Key 提交到仓库
- 如果后端模型名发生变化，优先修改 `ANTHROPIC_MODEL` 和 `ANTHROPIC_SMALL_FAST_MODEL`
