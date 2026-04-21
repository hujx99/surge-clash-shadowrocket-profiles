# Clash Verge 配置说明

`clash-verge.js` 是当前项目里 `Clash Verge` 的主入口。  
它不是一份静态 YAML，而是一份覆写脚本，用来把订阅节点动态整理成与 Surge 尽量一致的配置结构。

## 目标

- 尽量复刻 Surge 的 `General / Proxy Group / Rule / Host` 结构
- 让 Clash Verge 与 Surge、Shadowrocket 保持接近一致的使用体验
- 降低手工维护多份静态 Clash 配置的成本

## 入口文件

- 覆写脚本：[clash-verge.js](clash-verge.js)

## 主要结构

### 1. General

脚本会在 `config` 上补齐或覆盖以下内容：

- `mode`
- `ipv6`
- `profile`
- `dns`
- `hosts`

这里的目标不是保留订阅原始 DNS 逻辑，而是尽量对齐当前 Surge 主配置的 DNS 思路。

### 2. Proxy Group

脚本会基于订阅节点名称动态生成：

- 服务策略组
- 地区节点组
- 手动选择组

核心策略组包括：

- `Proxy`
- `ChatGPT`
- `Google`
- `YouTube`
- `TradingView`
- `Crypto`
- `HKBank`
- `Stock`
- `Apple`
- `Microsoft`
- `手动选择`

### 3. Rule

脚本会生成：

- `rule-providers`
- `rules`

规则顺序遵循与 Surge 接近的思路：

1. 手写特例优先
2. 远程规则集补充
3. IP 规则
4. `GEOIP / MATCH` 兜底

### 4. Host

Clash 没有 Surge 那种完全等价的 `[Host]` 段，因此这里拆成两部分来实现：

- `hosts`：用于静态映射
- `dns.nameserver-policy`：用于按域名指定 DNS 服务器

这部分是 Clash Verge 与 Surge 做行为对齐的关键。

## 关键实现点

### 地区节点识别

地区组是通过节点名正则匹配生成的。  
如果你的订阅命名不符合当前规则，对应地区组就不会按预期聚合。

重点定义在：

- `surgeRegionDefs`

### Host / DNS 对齐

下面几个位置决定了 Clash Verge 如何逼近 Surge 的 Host 行为：

- `surgeStaticHosts`
- `buildNameserverPolicy()`
- `surgeGeneralSection.dns`

### 规则对齐

以下数据结构负责与 Surge 的规则保持同步：

- `surgeRuleProviders`
- `surgeRules`

## 修改建议

### 新增策略组

通常需要同时修改：

- [clash-verge.js](clash-verge.js)
- [surge/Proxy.conf](../surge/Proxy.conf)
- [shadowrocket.conf](../shadowrocket/shadowrocket.conf)

### 新增规则

通常需要同时修改：

- [clash-verge.js](clash-verge.js)
- [surge/Rule.conf](../surge/Rule.conf)
- [shadowrocket.conf](../shadowrocket/shadowrocket.conf)

### 新增 Host / DNS 指定

通常需要同时修改：

- [clash-verge.js](clash-verge.js) 中的 `hosts` 或 `dns.nameserver-policy`
- [surge/Proxy.conf](../surge/Proxy.conf) 中的 `[Host]`
- [shadowrocket.conf](../shadowrocket/shadowrocket.conf) 中的 `[Host]`

## 验证建议

修改后建议至少做两步检查：

1. JS 语法检查

```bash
node --check clash-verge.js
```

2. 在 Clash Verge 中实际导入验证

重点观察：

- 地区组是否正常生成
- 服务组是否引用了正确的地区组
- DNS / Host 行为是否与预期一致

## 已知差异

- Clash Verge 无法 1:1 复刻 Surge 的所有原生能力
- `[Host]` 语义需要拆成 `hosts` 与 `nameserver-policy`
- 某些 Surge 专有行为在 Clash 中只能做近似实现，而不是完全等价实现
