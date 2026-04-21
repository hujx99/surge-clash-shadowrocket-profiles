# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository Overview

This repository manages proxy and network environment configurations supporting multiple clients:
- **Surge** (macOS/iOS native client)
- **Clash Verge** (cross-platform, uses JavaScript configuration override)
- **Legacy clients** (ShadowRocket)

## Key Files and Their Purposes

### Configuration Files
- **surge.conf** — Primary Surge proxy configuration. Defines proxy groups (地区分组), routing rules (RULE-SET), and DNS settings. Uses Surge's native config format.
- **clash-verge.js** — Clash Verge override script that transforms proxy configs into Clash format. Key functions:
  - Generates proxy groups (策略组) by filtering node names with regex patterns
  - Creates smart policy groups (url-test) for auto-selection by region/latency
  - Builds rule provider entries for external rule sets
  - Combines specific rules for ChatGPT, Apple services, and domestic traffic

### Supporting Files
- **config-docs/** — Documentation folder with:
  - `Codex-setup-guide.md` — Environment setup for Codex with OpenRouter/custom API endpoint
  - `deepseek-configuration.md` — DeepSeek model integration guide
  - `openwebui-troubleshooting.md` — OpenWebUI proxy troubleshooting
- **legacy/** — Archived configs for older clients (keep for reference)

## Configuration Architecture

### Surge Config Flow
1. **[General]** section: DNS servers (阿里 / 114), proxy test URLs, IPv6/Wi-Fi assist settings
2. **[Proxy Group]** section: Defines strategy groups that select nodes via regex filtering
   - `智能策略` — Auto-selects from HK/JP/SG/TW/US nodes (url-test)
   - `ChatGPT` — Dedicated group for OpenAI services (url-test with tolerance=80)
   - Regional groups (`🇯🇵 日本节点`, etc.) — Filtered by node name patterns
   - `手动选择` — Manual selection excluding internal traffic proxies
3. **[Rule]** section: Routes domains/IPs to appropriate groups
   - External RULE-SET imports from [SKK](https://ruleset.skk.moe) and [Blankwonder](https://github.com/Blankwonder/surge-list)
   - Overrides for specific services (Apple, ChatGPT, cttic)
   - Catch-all: GEOIP CN routes to DIRECT, else routes to Proxy

### Clash Verge Override (clash-verge.js)
The script transforms received proxy list into Clash-compatible config:
1. **Input**: Raw proxies from subscription source
2. **Processing**:
   - Adds a `直连` (direct) proxy if missing
   - Filters proxies using `surgeSmartRegex` (for 智能策略), `surgeTrafficRegex` (for 流量信息), and `surgeRegionDefs` (for regional groups)
   - Deduplicates proxy names in groups via `uniqueList()`
   - Safe fallbacks: if no proxies match a regex, use all available proxies
3. **Output**: Proxy groups + rule providers matching Surge config structure

## Important Implementation Details

### Node Filtering Strategy
Both surge.conf and clash-verge.js use regex patterns to identify proxy nodes:
- **Smart policy**: Matches `Hong\s*Kong|HK|Japan|JP|Singapore|SG|Taiwan|TW|United\s*States|US|美国|日本|新加坡|台湾` (supports Chinese labels)
- **Traffic info**: Matches `SSRDOG|XgCloud` (internal proxy services)
- **Regional groups**: Each region has its own pattern, e.g., `(🇯🇵)|(日本)|(Japan)|(JP)` for Japan nodes

### Rule Precedence in Surge
Rules are evaluated top-to-bottom; first match wins:
1. Domain-specific overrides (cttic → DIRECT, alpha123.uk → Proxy)
2. AI service rules (apple_intelligence, ai → ChatGPT)
3. Blocked domains → Proxy, CN domestic rules → DIRECT
4. Apple service exceptions
5. Ad blocking rules (doubleclick.net, etc.)
6. Geolocation fallback (GEOIP CN → DIRECT, else FINAL → Proxy)

### Test URLs
- Internet connectivity: `http://www.baidu.com` (Surge [General])
- Proxy test (latency measurement): `http://www.apple.com/library/test/success.html` (Surge proxy-test-url)
- ChatGPT test: `http://www.gstatic.com/generate_204` (Google Connectivity Check)

## Common Editing Tasks

**Adding a new regional proxy group:**
1. In surge.conf: Add new group under [Proxy Group] with pattern matching your node naming scheme
2. In clash-verge.js: Add entry to `surgeRegionDefs` array with name, regex, and icon URL

**Updating rule sets:**
- Modify RULE-SET URLs in [Rule] section of surge.conf
- In clash-verge.js, update corresponding rule provider entries under `config['rule-providers']`
- Verify URL format (Surge native vs Clash YAML)

**Debugging proxy selection:**
- Check node names match the regex filters in surge.conf [Proxy Group]
- Verify `policy-regex-filter` parameters are case-insensitive and use word boundaries
- Test: Enable "Alert" on groups (`no-alert=0`) to see which group is active

## Known Pitfalls / 与其他工具的交互

### Tailscale (CGNAT 100.64.0.0/10)
- **不要**把 `100.64.0.0/10` 放进 Surge 的 `tun-excluded-routes`。Surge 会为被排除的 CIDR 插入一条走物理网卡网关（如 en0 → 192.168.31.1）的静态路由，这条路由会覆盖 Tailscale 自己在 utun 上的 100.64/10 路由，导致所有到 Tailscale peer 的 TCP 被发到本地路由器丢弃（ICMP 和 `tailscale ping` 仍通，TCP 全部超时）。
- `skip-proxy` 里保留 `100.64.0.0/10` 是安全的（只影响应用层 HTTP 代理判断，不改路由表）。
- `[Host]` 段的 `*.ts.net = server:100.100.100.100` 是必须的——`hijack-dns = *:53` 会拦 MagicDNS 查询，没有这条 Surge 会把 ts.net 丢给国内 DNS 解析失败。
- Tailscale exit node 与 Surge Enhanced Mode/TUN **互斥**，两者都想抢默认路由，不能同时启用。

### Docker / 容器网络 (172.16.0.0/12)
- `tun-excluded-routes` 里的 `172.16.0.0/12` 同样会让 Surge 插入 en0 路由，理论上可能覆盖 Docker 的网络。实际场景下 `docker0` 会建更具体的 `/16` 路由通常能压过，但如果出现容器网络异常可以从这里查。

### IPv6
- `ipv6 = false` 意味着 Tailscale 分配的 IPv6 地址（`fd7a:...`）不可达，只能用 IPv4。IPv6-only 的 peer 需单独处理。

## Notes

- API keys and sensitive credentials must **not** be committed (see .gitignore expectations)
- Local settings are stored in `.Codex/` directory for VS Code extensions
- DNS resolution: Surge uses encrypted DNS (DoH) commented out by default (traditional DNS preferred)
- IPv6 is disabled by default due to network instability in current environments
