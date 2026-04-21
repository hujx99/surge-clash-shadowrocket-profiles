# Shadowrocket 配置说明

`shadowrocket.conf` 是当前项目里 `Shadowrocket` 的主配置文件。  
它的目标不是发展出一套独立结构，而是尽量用 Shadowrocket 原生语法复刻当前 Surge 主配置的核心逻辑。

## 目标

- 与当前 Surge 保持接近一致的分层结构
- 在 iPhone / iPad 上提供更接近 Surge 的策略组与规则体验
- 降低多客户端维护时的认知切换成本

## 入口文件

- 配置文件：[shadowrocket.conf](shadowrocket.conf)

## 主要结构

### 1. General

主要负责：

- 基础网络行为
- IPv6 开关
- `skip-proxy`
- `tun-excluded-routes`
- DNS / DoH 设置

这一层主要对应 Surge 的 `[General]`。

### 2. Proxy Group

当前配置与 Surge 尽量保持一致，核心组包括：

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

同时保留地区节点组，例如：

- `🇭🇰 香港节点`
- `🇺🇸 美国节点`
- `🇯🇵 日本节点`
- `🇨🇳 台湾节点`
- `🇸🇬 新加坡节点`
- `🇹🇷土耳其节点`
- `🇺🇳自建节点`

### 3. Rule

规则按与 Surge 接近的优先级组织：

1. DNS / DoH 相关规则
2. 手写特例规则
3. 远程规则集
4. IP 规则
5. `GEOIP / FINAL` 兜底

### 4. Host

`[Host]` 主要用于：

- 固定静态解析
- 指定 DoH
- 保证 MagicDNS、Apple、国内银行、国内高频 App 的解析稳定

这部分与 Surge 的 `[Host]` 保持高度相似。

## 修改建议

### 新增策略组

通常需要同时修改：

- [shadowrocket.conf](shadowrocket.conf)
- [surge/Proxy.conf](surge/Proxy.conf)
- [clash-verge.js](clash-verge.js)

### 新增规则

通常需要同时修改：

- [shadowrocket.conf](shadowrocket.conf)
- [surge/Rule.conf](surge/Rule.conf)
- [clash-verge.js](clash-verge.js)

### 新增 Host / DNS 指定

通常需要同时修改：

- [shadowrocket.conf](shadowrocket.conf) 中的 `[Host]`
- [surge/Proxy.conf](surge/Proxy.conf) 中的 `[Host]`
- [clash-verge.js](clash-verge.js) 中的 `hosts` 或 `dns.nameserver-policy`

## 维护原则

- Shadowrocket 不是独立事实来源，主结构依然优先以 Surge 为准
- 同步时重点关注组名、规则顺序和 Host 行为，不要只做字面复制
- 如果 Shadowrocket 语法能力与 Surge 不完全一致，优先保留行为上的接近性

## 验证建议

修改后建议重点检查：

- 配置是否能正常导入
- 策略组是否都能正常显示
- 规则引用的组名是否全部存在
- 常用域名是否命中预期策略组
- `*.ts.net`、Apple、银行等域名解析是否正常

## 已知注意事项

- `100.64.0.0/10` 不应放进 `tun-excluded-routes`
- Tailscale MagicDNS 依赖 `*.ts.net` 的专门解析
- 节点命名必须能匹配地区正则，否则地区组聚合会失效
