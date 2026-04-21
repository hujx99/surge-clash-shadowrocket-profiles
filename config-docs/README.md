# 扩展文档索引

`config-docs/` 用来存放与主配置配套的补充文档。  
这里的内容不直接决定三套代理配置的主结构，但会影响你的使用环境、调试路径和相关工具接入方式。

## 文档列表

### AI 工具 / 代理接入

- [claude-code-setup-guide.md](claude-code-setup-guide.md)
  - Claude Code 通过 OpenRouter 或自定义 Anthropic 兼容端点接入的配置说明

- [deepseek-configuration.md](deepseek-configuration.md)
  - DeepSeek Anthropic 兼容配置说明

### 排障记录

- [openwebui-troubleshooting.md](openwebui-troubleshooting.md)
  - OpenWebUI / Docker 私有仓库推送相关问题的排查记录

## 使用建议

1. 先看根目录 [README.md](../README.md) 理解项目整体结构
2. 主配置相关问题优先看 [surge/README.md](../surge/README.md)
3. 涉及 Claude Code、DeepSeek、OpenWebUI 等工具时，再回到这里查专题文档

## 维护原则

- 补充文档要尽量写成“可复用指南”，不要保留聊天记录式内容
- 示例中的密钥、Token、订阅地址一律使用占位符
- 一篇文档尽量固定为“适用场景 / 配置步骤 / 验证方式 / 常见问题”这种结构
