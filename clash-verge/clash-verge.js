/***
 * Clash Verge Rev override aligned to Surge sections:
 * - General / DNS
 * - Hosts
 * - Proxy Group
 * - Rule
 *
 * 文件结构（搜 ── 跳转）：
 *   开关 & 测试 URL · DNS 服务器 · 策略组默认参数 · 工具函数
 *   静态 Hosts · DNS 分流域名 · General 段（含 DNS）
 *   地区策略组 · 规则提供方 · 路由规则 · 入口
 */

// ── 开关 & 测试 URL ────────────────────────────────────
const enable = true
const DIRECT_POLICY = 'DIRECT'
// 节点测速地址（Google 204，全球可达、延迟低）
const baseTestUrl = 'http://www.gstatic.com/generate_204'
const chatgptTestUrl = 'http://www.gstatic.com/generate_204'

// ── DNS 服务器 ─────────────────────────────────────────
// 国内 DNS：优先用明文 UDP，减少浏览器首次解析时的 DoH 握手抖动
const directBootstrapDns = ['223.5.5.5', '119.29.29.29']
const directDnsServers = directBootstrapDns
// 兜底 DNS：海外 DoH，靠 respect-rules 经 Proxy 出站
const proxyDohServers = [
  'https://1.1.1.1/dns-query',
  'https://8.8.8.8/dns-query',
]
// Tailscale MagicDNS
const magicDnsServers = ['100.100.100.100']

// ── 策略组默认参数 ─────────────────────────────────────
const groupBaseOption = {
  interval: 300,
  timeout: 3000,
  url: baseTestUrl,
  lazy: true,
  hidden: false,
}

const urlTestBaseOption = {
  ...groupBaseOption,
  tolerance: 50,
}

// 流量信息节点（机场用来显示套餐用量），不参与手动选择 / 策略组
const surgeTrafficRegex = /(SSRDOG|XgCloud|xgcloud)/i

// 策略组图标（仅展示用，不影响选路）
const serviceMeta = {
  Proxy: {
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Universal/Airport.png',
  },
  ChatGPT: {
    url: chatgptTestUrl,
    icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/04ProxySoft/chatgpt(balck).png',
  },
  Google: {
    icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/04ProxySoft/google(2).png',
  },
  YouTube: {
    icon: 'https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/apps/YouTube_01.png',
  },
  TradingView: {
    icon: 'https://raw.githubusercontent.com/hujx99/Proxy_Configuration/main/photo/trading-view-4096.png',
  },
  Crypto: {
    icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/04ProxySoft/Bitcoin.png',
  },
  HKBank: {
    icon: 'https://raw.githubusercontent.com/hujx99/Proxy_Configuration/main/photo/building-bank-4096.png',
  },
  Stock: {
    icon: 'https://raw.githubusercontent.com/hujx99/Proxy_Configuration/main/photo/chart-line-4096.png',
  },
  Apple: {
    icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/03CNSoft/apple.png',
  },
  Microsoft: {
    icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Windows_11.png',
  },
  手动选择: {
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Universal/Auto_Speed.png',
  },
  '🇺🇳自建节点': {
    icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/05icon/NAS(2).png',
  },
}

// ── 工具函数 ───────────────────────────────────────────
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 构造地区匹配正则：keywords 直接匹配（中文/全词），codes 用单词边界（避免 US 命中 Russia）
function buildRegionRegex(keywords, codes = []) {
  const keywordPatterns = keywords.map((keyword) =>
    String(keyword)
      .split(/\s+/)
      .map((part) => escapeRegex(part))
      .join('\\s*')
  )
  const codePatterns = codes.map(
    (code) => `(?:^|[^A-Za-z])${escapeRegex(code)}(?:$|[^A-Za-z])`
  )
  return new RegExp([...keywordPatterns, ...codePatterns].join('|'), 'i')
}

function uniqueList(list) {
  const seen = new Set()
  const result = []
  for (const item of list) {
    if (item == null) continue
    if (!seen.has(item)) {
      seen.add(item)
      result.push(item)
    }
  }
  return result
}

function listOrFallback(list, fallback) {
  const normalized = uniqueList(list)
  return normalized.length > 0 ? normalized : uniqueList(fallback)
}

function filterProxyNamesByRegex(proxyNames, regex) {
  if (!Array.isArray(proxyNames) || !regex) return []
  return proxyNames.filter((name) => regex.test(name))
}

// ── 静态 Hosts ─────────────────────────────────────────
const surgeStaticHosts = {
  // DoH 主机名 bootstrap：固定 IP，避免"要查 DoH 得先查 DoH"的鸡蛋问题
  'dns.alidns.com': ['223.5.5.5', '223.6.6.6'],
  'doh.pub': ['1.12.12.12', '120.53.53.53'],
  // 自建节点（VPS IP 变更需手动更新）
  'xray.doveahu.online': '64.186.251.37',
}

// ── DNS 分流域名集 ─────────────────────────────────────
// 强制走国内 DoH：避免 fallback-filter 把这些域名误判为境外
// （Apple/银行/CN 大厂在境外有 anycast 或 CDN 节点，仅靠 geoip-CN 判断会误伤）

// Apple 全家桶：强制国内 DoH，让 iCloud / CDN 解析到 CN edge
const appleCnDomains = [
  '+.apple.com',
  '+.icloud.com',
  '+.icloud-content.com',
  '+.cdn-apple.com',
  '+.mzstatic.com',
  '+.apple-cloudkit.com',
  '+.appleimg.com',
  '+.apple-dns.net',
]

// 国内金融 / 银行 / 券商：稳定解析 + 不进 fake-ip（部分 App 会校验真实 IP）
const cnFinanceDomains = [
  '+.bochk.com',
  '+.hsbc.com.hk',
  '+.ccb.com',
  '+.ccb.cn',
  '+.icbc.com.cn',
  '+.boc.cn',
  '+.bankofchina.com',
  '+.cmbchina.com',
  '+.cib.com.cn',
  '+.10jqka.com.cn',
]

// 国内高频 App（腾讯 / 阿里 / 字节 / B站 / 网易 / 小红书）：避免 fallback-filter 误判
const cnAppDomains = [
  '+.qq.com',
  '+.tencent.com',
  '+.weixin.com',
  '+.taobao.com',
  '+.tmall.com',
  '+.alipay.com',
  '+.alicdn.com',
  '+.bilibili.com',
  '+.hdslb.com',
  '+.163.com',
  '+.netease.com',
  '+.xiaohongshu.com',
  '+.xhscdn.com',
  '+.douyin.com',
  '+.douyincdn.com',
  '+.baidubce.com',
]

// 强制走海外 DoH：TestFlight 国内 DNS 偶发异常（与 Surge [Host] 处理一致）
const overseasDohDomains = ['testflight.apple.com', '+.testflight.apple.com']

// ── General 段（含 DNS） ───────────────────────────────
const surgeGeneralSection = {
  ipv6: false,
  mode: 'rule',
  'allow-lan': false,
  profile: {
    'store-selected': true,
    'store-fake-ip': true,
  },
  dns: {
    enable: true,
    ipv6: false,
    'use-hosts': true,
    'use-system-hosts': true,
    // 让 DNS 查询走路由规则；海外 DoH 因此能经 Proxy 出站
    'respect-rules': true,
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    'default-nameserver': directBootstrapDns,
    nameserver: directDnsServers,
    fallback: proxyDohServers,
    // 分流 DNS：nameserver 解出非 CN IP / 命中 geosite:gfw / 命中 invalid CIDR
    // 时改用 fallback（≈ Surge 的 encrypted-dns-follow-outbound-mode）
    'fallback-filter': {
      geoip: true,
      'geoip-code': 'CN',
      geosite: ['gfw'],
      ipcidr: ['240.0.0.0/4', '0.0.0.0/32'],
    },
    // 解析机场节点的域名 —— 必须直连可达，否则会出现"解节点要先连节点"的循环
    'proxy-server-nameserver': directDnsServers,
    // 以下域名跳过 fake-ip：STUN / Xbox / 战网 / Tailscale / 银行（IP 校验敏感）
    'fake-ip-filter': [
      '+.lan',
      '+.local',
      '+.ts.net',
      '*.msftconnecttest.com',
      '*.msftncsi.com',
      '*.srv.nintendo.net',
      '*.stun.playstation.net',
      'xbox.*.microsoft.com',
      '*.xboxlive.com',
      '*.logon.battlenet.com.cn',
      '*.logon.battle.net',
      '*.battlenet.com.cn',
      '*.battlenet.com',
      '*.blzstatic.cn',
      '*.battle.net',
      'stun.l.google.com',
      'stun.*',
      '*.turn.twilio.com',
      '*.stun.twilio.com',
      'stun.syncthing.net',
      'link-ip.nextdns.io',
      ...cnFinanceDomains,
    ],
    // per-domain 强制 DNS（覆盖 fallback-filter 的判定）
    'nameserver-policy': {
      // 精确匹配优先：testflight.apple.com 必须排在 +.apple.com 之前
      [overseasDohDomains.join(',')]: proxyDohServers,
      '+.ts.net': magicDnsServers,
      [appleCnDomains.join(',')]: directDnsServers,
      [cnFinanceDomains.join(',')]: directDnsServers,
      [cnAppDomains.join(',')]: directDnsServers,
    },
  },
}

// ── 地区策略组定义 ─────────────────────────────────────
// 用 regex 从订阅节点名里筛出对应地区，url-test 自动选最低延迟
const surgeRegionDefs = [
  {
    name: '🇺🇳自建节点',
    regex: buildRegionRegex(['自建', '家宽', 'Home', 'DIY', 'DMIT']),
    type: 'url-test',
    hidden: false,
    icon: serviceMeta['🇺🇳自建节点'].icon,
  },
  {
    name: '🇭🇰 香港节点',
    regex: buildRegionRegex(['香港', 'Hong Kong'], ['HK', 'HKG']),
    type: 'url-test',
    hidden: true,
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Hong_Kong.png',
  },
  {
    name: '🇺🇸 美国节点',
    regex: buildRegionRegex(['美国', 'United States'], ['US', 'USA']),
    type: 'url-test',
    hidden: true,
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/United_States.png',
  },
  {
    name: '🇯🇵 日本节点',
    regex: buildRegionRegex(['日本', 'Japan'], ['JP', 'JPN']),
    type: 'url-test',
    hidden: true,
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Japan.png',
  },
  {
    name: '🇨🇳 台湾节点',
    regex: buildRegionRegex(['台湾', 'Taiwan'], ['TW', 'TWN']),
    type: 'url-test',
    hidden: true,
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/China.png',
  },
  {
    name: '🇸🇬 新加坡节点',
    regex: buildRegionRegex(['新加坡', 'Singapore'], ['SG', 'SGP']),
    type: 'url-test',
    hidden: true,
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Singapore.png',
  },
  {
    name: '🇹🇷土耳其节点',
    regex: buildRegionRegex(['土耳其', 'Turkey'], ['TR', 'TUR']),
    type: 'url-test',
    hidden: true,
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Turkey.png',
  },
]

// ── 规则提供方（rule providers） ───────────────────────
// 全部从 SKK / Blankwonder 订阅，每天刷新一次
const ruleProviderCommon = {
  type: 'http',
  format: 'text',
  interval: 86400,
  behavior: 'classical', // 域名/IP/进程混合规则
}

const ipRuleProviderCommon = {
  ...ruleProviderCommon,
  behavior: 'ipcidr', // 纯 IP 段规则（更高效）
}

const surgeRuleProviders = {
  unbreak: {
    ...ruleProviderCommon,
    url: 'https://raw.githubusercontent.com/zxfccmm4/Profiles/refs/heads/main/Surge/Ruleset/Unbreak.list',
    path: './ruleset/surge/unbreak.list',
  },
  reject_drop: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/reject-drop.conf',
    path: './ruleset/skk/reject-drop.list',
  },
  reject: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/reject.conf',
    path: './ruleset/skk/reject.list',
  },
  reject_no_drop: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/reject-no-drop.conf',
    path: './ruleset/skk/reject-no-drop.list',
  },
  ai: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/ai.conf',
    path: './ruleset/skk/ai.list',
  },
  apple_intelligence: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/apple_intelligence.conf',
    path: './ruleset/skk/apple-intelligence.list',
  },
  apple_cn: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/apple_cn.conf',
    path: './ruleset/skk/apple-cn.list',
  },
  apple_services: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/apple_services.conf',
    path: './ruleset/skk/apple-services.list',
  },
  microsoft_cdn: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/microsoft_cdn.conf',
    path: './ruleset/skk/microsoft-cdn.list',
  },
  microsoft: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/microsoft.conf',
    path: './ruleset/skk/microsoft.list',
  },
  download: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/download.conf',
    path: './ruleset/skk/download.list',
  },
  neteasemusic: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/neteasemusic.conf',
    path: './ruleset/skk/neteasemusic.list',
  },
  telegram: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/telegram.conf',
    path: './ruleset/skk/telegram.list',
  },
  stream: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/stream.conf',
    path: './ruleset/skk/stream.list',
  },
  lan: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/lan.conf',
    path: './ruleset/skk/lan.list',
  },
  domestic: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/domestic.conf',
    path: './ruleset/skk/domestic.list',
  },
  direct: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/direct.conf',
    path: './ruleset/skk/direct.list',
  },
  global: {
    ...ruleProviderCommon,
    url: 'https://ruleset.skk.moe/List/non_ip/global.conf',
    path: './ruleset/skk/global.list',
  },
  reject_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/reject.conf',
    path: './ruleset/skk/reject-ip.list',
  },
  neteasemusic_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/neteasemusic.conf',
    path: './ruleset/skk/neteasemusic-ip.list',
  },
  telegram_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/telegram.conf',
    path: './ruleset/skk/telegram-ip.list',
  },
  telegram_asn_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/telegram_asn.conf',
    path: './ruleset/skk/telegram-asn-ip.list',
  },
  stream_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/stream.conf',
    path: './ruleset/skk/stream-ip.list',
  },
  lan_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/lan.conf',
    path: './ruleset/skk/lan-ip.list',
  },
  domestic_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/domestic.conf',
    path: './ruleset/skk/domestic-ip.list',
  },
  china_ip: {
    ...ipRuleProviderCommon,
    url: 'https://ruleset.skk.moe/List/ip/china_ip.conf',
    path: './ruleset/skk/china-ip.list',
  },
}

// ── 路由规则（自上而下匹配，命中即停） ─────────────────
const surgeRules = [
  // 0. unbreak 兜底（防止订阅规则误伤）+ DoH 入站方向
  'RULE-SET,unbreak,DIRECT',
  'DOMAIN,dns.alidns.com,DIRECT',
  'DOMAIN,doh.pub,DIRECT',
  'DOMAIN-SUFFIX,xf9pzeslxw.sbs,DIRECT', // 机场订阅域
  'DOMAIN,dns.google,Proxy',
  'DOMAIN-SUFFIX,cloudflare-dns.com,Proxy',
  'DOMAIN-SUFFIX,dns.quad9.net,Proxy',
  'DOMAIN-SUFFIX,dns.nextdns.io,Proxy',
  'DOMAIN-SUFFIX,dns.adguard-dns.com,Proxy',

  // 1. 字节系 / 高通：强制直连（避免走代理触发风控）
  'DOMAIN-SUFFIX,qualcomm.cn,DIRECT',
  'DOMAIN-SUFFIX,bytedance.com,DIRECT',
  'DOMAIN-SUFFIX,byteimg.com,DIRECT',
  'DOMAIN-SUFFIX,bytecdn.cn,DIRECT',
  'DOMAIN-SUFFIX,ibytedtos.com,DIRECT',
  'DOMAIN-SUFFIX,ibytedos.com,DIRECT',

  // 2. 加密货币交易所
  'DOMAIN-SUFFIX,binance.com,Crypto',
  'DOMAIN-SUFFIX,saasexch.com,Crypto',
  'DOMAIN-SUFFIX,astherus.finance,Crypto',
  'DOMAIN-SUFFIX,forter.com,Crypto',
  'DOMAIN-KEYWORD,binance,Crypto',

  // 3. 国内特殊域名：同花顺直连、cttic 工作站直连
  'DOMAIN-SUFFIX,hexin.cn,DIRECT',
  'DOMAIN-KEYWORD,cttic,DIRECT',

  // 4. 单点域名覆盖：CF 节点、Apple Analytics 走港线（避免被识别为机器流量）
  'DOMAIN-SUFFIX,coinbase.com,Proxy',
  'DOMAIN,www.cloudflare.com,Proxy',
  'DOMAIN,cdnjs.cloudflare.com,Proxy',
  'DOMAIN,alpha123.uk,Proxy',
  'DOMAIN,app-analytics-services.com,🇭🇰 香港节点',
  'DOMAIN,app-analytics-services-att.com,🇭🇰 香港节点',

  // 5. TradingView
  'DOMAIN-SUFFIX,tradingview.com,TradingView',
  'DOMAIN-SUFFIX,tradingview-widget.com,TradingView',
  'DOMAIN-KEYWORD,tradingview,TradingView',
  'DOMAIN-SUFFIX,tvc-invdn-com.com,TradingView',
  'DOMAIN-SUFFIX,tvc4.com,TradingView',
  'DOMAIN-SUFFIX,tvcmaps.com,TradingView',
  'DOMAIN-SUFFIX,tvcpush.com,TradingView',
  'DOMAIN-SUFFIX,tvcharts.co,TradingView',
  'DOMAIN-SUFFIX,tvextbot.com,TradingView',
  'DOMAIN-SUFFIX,tvwidget.com,TradingView',

  // 6. YouTube
  'DOMAIN-SUFFIX,youtube.com,YouTube',
  'DOMAIN-SUFFIX,youtu.be,YouTube',
  'DOMAIN-SUFFIX,googlevideo.com,YouTube',
  'DOMAIN-SUFFIX,ytimg.com,YouTube',
  'DOMAIN-SUFFIX,ggpht.com,YouTube',
  'DOMAIN-SUFFIX,youtubei.googleapis.com,YouTube',

  // 7. AI 服务（OpenAI / Anthropic / 第三方依赖：Intercom 客服 / Datadog 日志 / Statsig 实验 / Segment 埋点）
  'DOMAIN-SUFFIX,chatgpt.com,ChatGPT',
  'DOMAIN-SUFFIX,openai.com,ChatGPT',
  'DOMAIN-SUFFIX,oaistatic.com,ChatGPT',
  'DOMAIN-SUFFIX,oaiusercontent.com,ChatGPT',
  'DOMAIN-SUFFIX,anthropic.com,ChatGPT',
  'DOMAIN-SUFFIX,claude.ai,ChatGPT',
  'DOMAIN-SUFFIX,claude.com,ChatGPT',
  'DOMAIN-SUFFIX,intercom.io,ChatGPT',
  'DOMAIN-SUFFIX,intercomcdn.com,ChatGPT',
  'DOMAIN-SUFFIX,intercom-attachments-1.com,ChatGPT',
  'DOMAIN-SUFFIX,datadoghq.com,ChatGPT',
  'DOMAIN-SUFFIX,datadoghq-browser-agent.com,ChatGPT',
  'DOMAIN-SUFFIX,statsigapi.net,ChatGPT',
  'DOMAIN-SUFFIX,segment.io,ChatGPT',
  'DOMAIN-SUFFIX,segment.com,ChatGPT',

  // 8. 拦截：Apple SiteAssociation 探测、反诈 96110 / 国家反诈中心域名
  'DOMAIN,app-site-association.cdn-apple.com,REJECT',
  'DOMAIN,prpr.96110.cn.com,DIRECT',
  'DOMAIN-KEYWORD,96110,REJECT',
  'DOMAIN-SUFFIX,gjfzpt.cn,REJECT',

  // 9. 香港银行
  'DOMAIN-SUFFIX,bochk.com,HKBank',
  'DOMAIN-SUFFIX,bocpay.hk,HKBank',
  'DOMAIN-SUFFIX,za.group,HKBank',
  'DOMAIN-SUFFIX,zabank.hk,HKBank',
  'DOMAIN-SUFFIX,hsbc.com.hk,HKBank',
  'DOMAIN-SUFFIX,hsbc.com,HKBank',

  // 10. 券商
  'DOMAIN-SUFFIX,hafoo.com.hk,Stock',
  'DOMAIN-SUFFIX,hafoo.com.cn,Stock',
  'DOMAIN-SUFFIX,hafoo.com,Stock',
  'DOMAIN-SUFFIX,hafoo.cn,Stock',
  'DOMAIN-SUFFIX,fosunwealth.com,Stock',
  'DOMAIN-SUFFIX,futunn.com,Stock',
  'DOMAIN-SUFFIX,futuhk.com,Stock',
  'DOMAIN-SUFFIX,moomoo.com,Stock',
  'DOMAIN-SUFFIX,interactivebrokers.com,Stock',
  'DOMAIN-SUFFIX,interactivebrokers.com.hk,Stock',
  'DOMAIN-SUFFIX,ibkr.com,Stock',
  'DOMAIN-SUFFIX,ibkrcampus.com,Stock',
  'DOMAIN-SUFFIX,ibllc.com,Stock',
  'DOMAIN-SUFFIX,ibllc.com.cn,Stock',

  'DOMAIN-SUFFIX,bnbstatic.com,Crypto',

  // 11. 域名规则集（SKK）—— 顺序敏感：广告拦截在前，分类规则在后
  'RULE-SET,reject_drop,REJECT-DROP',
  'RULE-SET,reject,REJECT-DROP',
  'RULE-SET,reject_no_drop,REJECT',
  'RULE-SET,ai,ChatGPT',
  'RULE-SET,apple_intelligence,ChatGPT',
  'RULE-SET,apple_cn,DIRECT',
  'RULE-SET,apple_services,Apple',
  'RULE-SET,microsoft_cdn,Microsoft',
  'RULE-SET,microsoft,Microsoft',
  'RULE-SET,download,DIRECT',
  'RULE-SET,neteasemusic,DIRECT',
  'RULE-SET,telegram,Proxy',
  'RULE-SET,stream,Proxy',
  'RULE-SET,lan,DIRECT',
  'RULE-SET,domestic,DIRECT',
  'RULE-SET,direct,DIRECT',
  'RULE-SET,global,Proxy',

  // 12. IP 规则
  // 100.64/10 = Tailscale CGNAT，必须直连（绝不能进 TUN 排除路由，会断 Tailscale）
  'IP-CIDR,100.64.0.0/10,DIRECT,no-resolve',
  // 工作 / 内网专用 IP（cttic 等）
  'IP-CIDR,218.240.180.173/32,DIRECT,no-resolve',
  'IP-CIDR,43.171.112.138/32,DIRECT,no-resolve',
  'IP-CIDR,103.151.149.0/24,DIRECT,no-resolve',
  'IP-CIDR,157.119.173.0/24,DIRECT,no-resolve',
  'RULE-SET,reject_ip,REJECT',
  'RULE-SET,neteasemusic_ip,DIRECT',
  'RULE-SET,telegram_ip,Proxy',
  'RULE-SET,telegram_asn_ip,Proxy',
  'RULE-SET,stream_ip,Proxy',
  'RULE-SET,lan_ip,DIRECT',
  'RULE-SET,domestic_ip,DIRECT',
  'RULE-SET,china_ip,DIRECT',

  // 13. 兜底：内网 / GEOIP CN 直连，其余走 Proxy
  'GEOSITE,private,DIRECT',
  'GEOIP,private,DIRECT,no-resolve',
  'GEOIP,cn,DIRECT,no-resolve',
  'MATCH,Proxy',
]

// ── 应用 General 段 ────────────────────────────────────
// 把 surgeGeneralSection 合并进订阅原 config（保留订阅自带的 fake-ip-filter 等条目）
function applyGeneralSection(config) {
  config.mode = surgeGeneralSection.mode
  config.ipv6 = surgeGeneralSection.ipv6
  config['allow-lan'] = surgeGeneralSection['allow-lan']
  config['unified-delay'] = true
  config['tcp-concurrent'] = true
  config['find-process-mode'] = 'off'
  config.profile = {
    ...(config.profile || {}),
    ...surgeGeneralSection.profile,
  }

  const existingDns = config.dns || {}
  const existingFakeIpFilter = Array.isArray(existingDns['fake-ip-filter'])
    ? existingDns['fake-ip-filter']
    : []
  const existingNameserverPolicy =
    typeof existingDns['nameserver-policy'] === 'object' &&
    existingDns['nameserver-policy'] !== null
      ? existingDns['nameserver-policy']
      : {}

  config.dns = {
    ...existingDns,
    ...surgeGeneralSection.dns,
    'fake-ip-filter': uniqueList([
      ...existingFakeIpFilter,
      ...surgeGeneralSection.dns['fake-ip-filter'],
    ]),
    'nameserver-policy': {
      ...existingNameserverPolicy,
      ...surgeGeneralSection.dns['nameserver-policy'],
    },
  }

  config.hosts = {
    ...(config.hosts || {}),
    ...surgeStaticHosts,
  }
}

// ── 入口 ───────────────────────────────────────────────
// Clash Verge Rev 调用：function main(config) { ... return config }
function main(config) {
  config = config || {}

  if (!enable) return config

  config.proxies = Array.isArray(config.proxies) ? config.proxies : []

  applyGeneralSection(config)

  // 节点名集合：全部节点 / 排除流量信息节点（手动选择组用）
  const allProxyNames = uniqueList(
    config.proxies.map((proxy) => proxy?.name).filter(Boolean)
  )
  const manualProxyNames = allProxyNames.filter(
    (name) => !surgeTrafficRegex.test(name)
  )
  const manualGroupProxies = listOrFallback(manualProxyNames, [DIRECT_POLICY])

  // 按地区正则筛选节点，构造地区策略组
  const regionProxyGroups = []
  const regionProxyNames = new Map()

  surgeRegionDefs.forEach((region) => {
    const proxies = filterProxyNamesByRegex(allProxyNames, region.regex)
    if (proxies.length === 0) return

    regionProxyNames.set(region.name, proxies)
    regionProxyGroups.push({
      ...(region.type === 'url-test' ? urlTestBaseOption : groupBaseOption),
      name: region.name,
      type: region.type,
      proxies,
      hidden: region.hidden,
      icon: region.icon,
    })
  })

  // 地区组若实际无节点（订阅没该地区），引用时返回 null 由 listOrFallback 过滤掉
  const regionOrNull = (name) =>
    regionProxyNames.get(name)?.length ? name : null

  // ── 各服务策略组的备选项（顺序即优先级） ────────────
  const proxyGroupProxies = listOrFallback(
    [
      regionOrNull('🇺🇳自建节点'),
      regionOrNull('🇭🇰 香港节点'),
      regionOrNull('🇯🇵 日本节点'),
      regionOrNull('🇨🇳 台湾节点'),
      regionOrNull('🇸🇬 新加坡节点'),
      regionOrNull('🇺🇸 美国节点'),
      '手动选择',
      DIRECT_POLICY,
    ],
    ['手动选择', DIRECT_POLICY]
  )

  const chatgptGroupProxies = listOrFallback(
    [regionOrNull('🇺🇳自建节点'), regionOrNull('🇺🇸 美国节点')],
    ['Proxy']
  )
  const googleGroupProxies = listOrFallback(
    [regionOrNull('🇺🇳自建节点'), 'Proxy'],
    ['Proxy']
  )
  const youtubeGroupProxies = listOrFallback(
    [
      regionOrNull('🇭🇰 香港节点'),
      regionOrNull('🇺🇳自建节点'),
      regionOrNull('🇯🇵 日本节点'),
      regionOrNull('🇨🇳 台湾节点'),
      regionOrNull('🇸🇬 新加坡节点'),
    ],
    ['Proxy']
  )
  const tradingviewGroupProxies = listOrFallback(
    [
      regionOrNull('🇭🇰 香港节点'),
      regionOrNull('🇯🇵 日本节点'),
      regionOrNull('🇸🇬 新加坡节点'),
      regionOrNull('🇺🇳自建节点'),
    ],
    ['Proxy']
  )
  const cryptoGroupProxies = listOrFallback(
    [
      regionOrNull('🇨🇳 台湾节点'),
      regionOrNull('🇸🇬 新加坡节点'),
      DIRECT_POLICY,
    ],
    [DIRECT_POLICY]
  )
  const hkbankGroupProxies = listOrFallback(
    [DIRECT_POLICY, regionOrNull('🇭🇰 香港节点'), regionOrNull('🇺🇳自建节点')],
    [DIRECT_POLICY]
  )
  const stockGroupProxies = listOrFallback(
    [DIRECT_POLICY, regionOrNull('🇭🇰 香港节点'), regionOrNull('🇺🇳自建节点')],
    [DIRECT_POLICY]
  )
  const appleGroupProxies = listOrFallback(
    [
      DIRECT_POLICY,
      'Proxy',
      regionOrNull('🇺🇳自建节点'),
      regionOrNull('🇹🇷土耳其节点'),
    ],
    [DIRECT_POLICY, 'Proxy']
  )
  const microsoftGroupProxies = listOrFallback(
    [regionOrNull('🇺🇳自建节点')],
    ['Proxy']
  )

  // ── 输出 proxy-groups（顺序决定 GUI 展示顺序） ──────
  config['proxy-groups'] = [
    {
      ...groupBaseOption,
      name: 'Proxy',
      type: 'select',
      proxies: proxyGroupProxies,
      icon: serviceMeta.Proxy.icon,
    },
    {
      ...groupBaseOption,
      name: 'ChatGPT',
      type: 'fallback',
      proxies: chatgptGroupProxies,
      url: serviceMeta.ChatGPT.url,
      timeout: 5000,
      icon: serviceMeta.ChatGPT.icon,
    },
    {
      ...groupBaseOption,
      name: 'Google',
      type: 'fallback',
      proxies: googleGroupProxies,
      icon: serviceMeta.Google.icon,
    },
    {
      ...groupBaseOption,
      name: 'Microsoft',
      type: 'select',
      proxies: microsoftGroupProxies,
      icon: serviceMeta.Microsoft.icon,
    },
    {
      ...groupBaseOption,
      name: 'YouTube',
      type: 'fallback',
      proxies: youtubeGroupProxies,
      icon: serviceMeta.YouTube.icon,
    },
    {
      ...groupBaseOption,
      name: 'TradingView',
      type: 'select',
      proxies: tradingviewGroupProxies,
      timeout: 5000,
      icon: serviceMeta.TradingView.icon,
    },
    {
      ...groupBaseOption,
      name: 'Crypto',
      type: 'select',
      proxies: cryptoGroupProxies,
      timeout: 5000,
      icon: serviceMeta.Crypto.icon,
    },
    {
      ...groupBaseOption,
      name: 'HKBank',
      type: 'select',
      proxies: hkbankGroupProxies,
      timeout: 5000,
      icon: serviceMeta.HKBank.icon,
    },
    {
      ...groupBaseOption,
      name: 'Stock',
      type: 'select',
      proxies: stockGroupProxies,
      timeout: 5000,
      icon: serviceMeta.Stock.icon,
    },
    {
      ...groupBaseOption,
      name: 'Apple',
      type: 'select',
      proxies: appleGroupProxies,
      icon: serviceMeta.Apple.icon,
    },
    {
      ...groupBaseOption,
      name: '手动选择',
      type: 'select',
      proxies: manualGroupProxies,
      icon: serviceMeta['手动选择'].icon,
    },
    ...regionProxyGroups,
  ]

  config['rule-providers'] = {
    ...(config['rule-providers'] || {}),
    ...surgeRuleProviders,
  }

  config.rules = surgeRules

  return config
}
