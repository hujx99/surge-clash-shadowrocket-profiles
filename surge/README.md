# Surge 配置说明

`surge/` 目录是当前项目的主配置来源。  
如果三套客户端之间出现结构差异，通常应该先以这里为基准，再同步到 `clash-verge.js` 和 `shadowrocket.conf`。

## 文件分工

- [Mac.conf](Mac.conf)：macOS 入口配置
- [iOS.conf](iOS.conf)：iOS 入口配置
- [Proxy.conf](Proxy.conf)：策略组、Host、Rewrite、MITM 等配置
- [Rule.conf](Rule.conf)：规则顺序与规则集引用

## 结构关系

### 入口配置

`Mac.conf` 和 `iOS.conf` 主要负责：

- `General`
- 平台差异项
- 通过 `#!include` 把公共配置模块接进来

### 公共模块

`Proxy.conf` 主要负责：

- 策略组结构
- 地区节点组
- Host 映射
- Rewrite / MITM 相关设置

`Rule.conf` 主要负责：

- 手写优先规则
- 远程规则集
- IP 规则
- GEOIP / FINAL 兜底

## 修改建议

### 新增策略组

通常需要同时修改：

- [Proxy.conf](Proxy.conf)
- [../clash-verge.js](../clash-verge.js)
- [../shadowrocket.conf](../shadowrocket.conf)

### 新增规则

通常需要同时修改：

- [Rule.conf](Rule.conf)
- [../clash-verge.js](../clash-verge.js)
- [../shadowrocket.conf](../shadowrocket.conf)

### 新增 Host / DNS 指定

通常需要同时修改：

- [Proxy.conf](Proxy.conf) 中的 `[Host]`
- [../clash-verge.js](../clash-verge.js) 中的 `hosts` 或 `dns.nameserver-policy`
- [../shadowrocket.conf](../shadowrocket.conf) 中的 `[Host]`

## 平台差异

### macOS

- 更关注本机代理监听
- 更容易与本地开发环境、Tailscale、Docker、系统 DNS 发生交互

### iOS

- 更关注蜂窝网络、热点共享与系统限制
- 某些 DNS 行为与 macOS 的最佳实践不完全相同

## 已知注意事项

- 不要把 `100.64.0.0/10` 放进 Surge 的 `tun-excluded-routes`
- `*.ts.net = server:100.100.100.100` 对 Tailscale MagicDNS 很关键
- IPv6 默认关闭是当前网络环境下的稳定性选择，不是遗漏
- 需要回看旧配置时去 `legacy/`，不要直接从旧文件复制回主配置
