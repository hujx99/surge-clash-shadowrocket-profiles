# 历史配置归档

`legacy/` 目录用于保存旧版本配置和历史脚本，方便：

- 回看曾经的策略结构
- 对比规则变更
- 紧急回滚时做参考

## 当前归档内容

- [clash-verge-old.js](clash-verge-old.js)：旧版 Clash Verge 覆写脚本
- [surge.conf](surge.conf)：旧版 Surge 主配置
- [surge-plain.conf](surge-plain.conf)：更早的 Surge 纯配置版本
- [ssrdog.conf](ssrdog.conf)：历史遗留配置

## 使用原则

- 这里的文件不是当前主配置来源
- 新改动不要直接写回 `legacy/`
- 需要迁移旧逻辑时，先确认当前主结构是否还需要那套设计
