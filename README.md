# Surge / Clash Verge / Shadowrocket 自用优化配置文件集

统一维护 **Surge**、**Clash Verge** 和 **Shadowrocket** 三套代理配置，目标是在不同客户端之间尽量保持一致的策略组命名、分流逻辑、DNS 行为与 Host 映射。

这个仓库更偏向“长期自用且可分享”的配置项目，而不是一次性的规则堆积。

## 文档导航

- 项目入口：`README.md`
- Surge 结构说明：[surge/README.md](surge/README.md)
- Clash Verge 结构说明：[clash-verge.md](clash-verge/clash-verge.md)
- Shadowrocket 结构说明：[shadowrocket.md](shadowrocket/shadowrocket.md)
- 扩展文档索引：[config-docs/README.md](config-docs/README.md)
- 历史配置归档：[legacy/README.md](legacy/README.md)

## 项目定位

- 面向需要同时维护多客户端代理配置的用户
- 重点覆盖日常科学上网、AI 工具、Apple 服务、TradingView、港股银行与券商等场景
- 优先解决 DNS、TUN、局域网、Tailscale、MagicDNS 这些实际使用中的细节问题

## 支持的客户端

### Surge

- macOS 配置：[surge/Mac.conf](surge/Mac.conf)
- iOS 配置：[surge/iOS.conf](surge/iOS.conf)
- 模块拆分：
  - 策略组与 Host 相关：[surge/Proxy.conf](surge/Proxy.conf)
  - 规则相关：[surge/Rule.conf](surge/Rule.conf)

### Clash Verge

- 覆写脚本：[clash-verge.js](clash-verge/clash-verge.js)
- 作用：把订阅中的节点列表转换成与 Surge 结构尽量一致的策略组、规则与 DNS 行为

### Shadowrocket

- 配置文件：[shadowrocket.conf](shadowrocket/shadowrocket.conf)
- 作用：用 Shadowrocket 原生格式复刻当前 Surge 的主结构

## 仓库结构

```text
.
├── README.md
├── clash-verge
│   ├── clash-verge.md
│   └── clash-verge.js
├── shadowrocket
│   ├── shadowrocket.conf
│   └── shadowrocket.md
├── surge
│   ├── README.md
│   ├── Mac.conf
│   ├── iOS.conf
│   ├── Proxy.conf
│   └── Rule.conf
├── config-docs
│   ├── README.md
│   ├── claude-code-setup-guide.md
│   ├── deepseek-configuration.md
│   └── openwebui-troubleshooting.md
└── legacy
    ├── README.md
    ├── clash-verge-old.js
    ├── ssrdog.conf
    ├── surge-plain.conf
    └── surge.conf
```

## 配置结构设计

三套配置尽量围绕同一套抽象来组织：

### 1. General

- 网络基础行为
- DNS / DoH / Fake IP
- TUN 相关排除项
- IPv6 与局域网处理

### 2. Proxy Group

- 统一的服务组命名
- 地区节点组与手动选择组
- 让不同客户端切换时尽量不用重新适应

### 3. Rule

- 规则顺序按“手写特例优先，规则集兜底，GEOIP / FINAL 收尾”组织
- 优先处理 AI、Apple、TradingView、银行、券商等高敏感场景

### 4. Host

- 用于固定解析、指定 DoH、保证 MagicDNS 与国内服务解析稳定
- Surge 使用 `[Host]`
- Clash Verge 使用 `hosts` + `dns.nameserver-policy`
- Shadowrocket 使用 `[Host]`

## 快速开始

### Surge

1. 根据设备选择 [surge/Mac.conf](surge/Mac.conf) 或 [surge/iOS.conf](surge/iOS.conf)。
2. 订阅节点命名需要能匹配地区正则，否则地区组不会按预期聚合。
3. 如果你使用 Tailscale，不要把 `100.64.0.0/10` 加入 `tun-excluded-routes`。

### Clash Verge

1. 把 [clash-verge.js](clash-verge/clash-verge.js) 作为覆写脚本导入。
2. 脚本会根据订阅节点动态生成地区组和服务组。
3. 如果你修改了 Surge 的策略组、规则或 Host，最好同步检查这个脚本。

### Shadowrocket

1. 直接导入 [shadowrocket.conf](shadowrocket/shadowrocket.conf)。
2. 如果节点命名与当前正则不一致，先调整地区匹配规则。
3. 新业务建议先在 Surge 结构中定稿，再同步到另外两个客户端。

## 推荐阅读顺序

1. 先读本页，了解整体结构
2. 再看 [surge/README.md](surge/README.md)，理解主配置的拆分方式
3. 再看 [clash-verge.md](clash-verge/clash-verge.md) 和 [shadowrocket.md](shadowrocket/shadowrocket.md)，理解另外两套客户端的落地方式
4. 如需工具或环境配置，再看 [config-docs/README.md](config-docs/README.md)
5. 如需历史版本参考，最后再看 [legacy/README.md](legacy/README.md)

## 适用场景

- 在 macOS、iPhone、跨平台设备之间切换不同代理客户端
- 希望三端使用接近一致的策略组与规则结构
- 对 AI、Apple 服务、TradingView、金融业务有明确分流需求
- 希望把 DNS、路由、TUN 细节一起纳入配置维护范围

## 项目命名

- 项目名称：`Surge / Clash Verge / Shadowrocket 自用优化配置文件集`
- 建议仓库名：`surge-clash-shadowrocket-profiles`

## 维护原则

- 敏感信息不入库，包括 API Key、私有订阅链接和账号信息
- 新规则优先先在主结构中说明清楚，再做三端同步
- `legacy/` 仅做参考，不应作为当前配置的事实来源
