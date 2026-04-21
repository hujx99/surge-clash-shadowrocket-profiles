# OpenWebUI / Docker 私有仓库推送问题排查

## 适用场景

这篇文档记录的是 OpenWebUI 镜像推送到私有 Docker Registry 时，因证书不匹配导致失败的典型问题。

## 现象

执行 `docker push` 时出现类似报错：

```text
Get "https://registry.bingosoft.net/v2/": x509: certificate is valid for ingress.local, not registry.bingosoft.net
```

## 根本原因

- 目标服务器返回的是默认 Ingress 证书
- 该证书的域名与实际访问域名不一致
- Docker 默认严格校验证书，因此会直接拒绝连接

## 解决步骤

### 1. 修改 Docker 配置

编辑：

```text
/etc/docker/daemon.json
```

示例：

```json
{
  "dns": ["10.15.0.254", "1.1.1.1"],
  "insecure-registries": ["registry.bingosoft.net"]
}
```

### 2. 重新加载并重启 Docker

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 3. 验证是否生效

```bash
docker info
```

确认输出中出现目标域名对应的 `Insecure Registries` 项。

## 常见注意点

### JSON 格式不能写错

如果 `daemon.json` 中原本已经有其他字段，记得正确补上逗号。

### 带端口的仓库必须带端口配置

如果未来仓库地址变成：

```text
registry.bingosoft.net:5000
```

那么 `insecure-registries` 里也必须写成：

```json
["registry.bingosoft.net:5000"]
```

### 这只是兜底方案

更规范的长期方案仍然是修复服务端证书，使其与访问域名匹配。  
`insecure-registries` 更适合在内网、临时环境或无法立即修证书时使用。
