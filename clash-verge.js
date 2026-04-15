/***
 * Clash Verge Rev override (Surge-style minimal groups)
 * 说明：通过脚本动态生成策略组、规则集与规则，减少手工维护成本。
 */

// 总开关：false 时直接返回原始配置，不做任何修改
const enable = true

// 策略组通用参数（会被每个策略组继承）
const groupBaseOption = {
  interval: 300,
  timeout: 2000,
  url: 'http://www.apple.com/library/test/success.html',
  lazy: true,
  'max-failed-times': 3,
  hidden: false,
}


// url-test 组专用参数：降低切换抖动并减少无意义探测
const urlTestBaseOption = {
  ...groupBaseOption,
  interval: 600,
  timeout: 3000,
  tolerance: 50,
  url: 'https://cp.cloudflare.com/generate_204',
}

// 流量信息节点筛选关键字：只把带流量信息的节点放到“流量信息”组里
const surgeTrafficRegex = /(SSRDOG|XgCloud)/i

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
// 地区分组名称/匹配/图标：用于生成“香港节点/美国节点...”等分组
const surgeRegionDefs = [
  {
    name: '香港节点',
    regex: buildRegionRegex(['香港', 'Hong Kong'], ['HK', 'HKG']),
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Hong_Kong.png',
  },
  {
    name: '美国节点',
    regex: buildRegionRegex(['美国', 'United States'], ['US', 'USA']),
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/United_States.png',
  },
  {
    name: '日本节点',
    regex: buildRegionRegex(['日本', 'Japan'], ['JP', 'JPN']),
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Japan.png',
  },
  {
    name: '台湾节点',
    regex: buildRegionRegex(['台湾', 'Taiwan'], ['TW', 'TWN']),
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/China.png',
  },
  {
    name: '自建节点',
    regex: buildRegionRegex(['自建', '家宽', 'Home', 'DIY', 'DMIT']),
    type: 'select',
    icon: 'https://raw.githubusercontent.com/hujx99/Proxy_Configuration/main/photo/vps.png',
  },
  {
    name: '新加坡节点',
    regex: buildRegionRegex(['新加坡', 'Singapore'], ['SG', 'SGP']),
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Singapore.png',
  },
  {
    name: '土耳其节点',
    regex: buildRegionRegex(['土耳其', 'Turkey'], ['TR', 'TUR']),
    icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Rounded_Rectangle/Turkey.png',
  },
]

// 策略组图标与测速 URL：用于 UI 展示与测速配置
const serviceMeta = {
  流量信息:    { icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Universal/Speedtest.png' },
  Proxy:      { icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/05icon/liuliang.png' },
  ChatGPT:    { url: 'http://www.gstatic.com/generate_204', icon: 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/light/openai.png' },
  手动选择:    { icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Universal/Auto_Speed.png' },
  All:        { icon: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Universal/Airport.png' },
  Google:     { icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/04ProxySoft/google(1).png' },
  HKBank:     { icon: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons@master/icons/outline/building-bank.svg' },
  Stock:      { icon: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons@master/icons/outline/chart-line.svg' },
  YouTube:    { icon: 'https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/apps/YouTube_01.png' },
  Apple:      { icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/03CNSoft/apple.png' },
  Microsoft:  { icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Windows_11.png' },
  Crypto:     { icon: 'https://raw.githubusercontent.com/lige47/QuanX-icon-rule/main/icon/04ProxySoft/bian.png' },
  TradingView:{ icon: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/tradingview.svg' },
}

// 远程规则集公共配置：所有 rule-providers 的通用字段
const ruleProviderCommon = {
  type: 'http',
  format: 'text',
  interval: 86400,
}

// 去重并过滤空值，保持原始顺序
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
  const normalizedList = uniqueList(list)
  return normalizedList.length > 0 ? normalizedList : uniqueList(fallback)
}

// 按正则过滤代理名列表，安全处理空输入
function filterProxyNamesByRegex(proxyNames, regex) {
  if (!Array.isArray(proxyNames) || !regex) return []
  return proxyNames.filter((name) => regex.test(name))
}

function main(config) {
  config = config || {}

  // 开关关闭时不改动配置
  if (!enable) return config

  // 确保 proxies 数组存在
  config.proxies = config?.proxies || []
  // 补一个直连代理，避免规则指向不存在
  if (!config.proxies.find((p) => p?.name === '直连')) {
    config.proxies.push({
      name: '直连',
      type: 'direct',
      udp: true,
    })
  }

  // 全部节点名/真实节点名（不含直连）
  const allProxyNames = config.proxies.map((proxy) => proxy.name)
  const realProxyNames = allProxyNames.filter((name) => name !== '直连')
  const allGroupProxies = listOrFallback(realProxyNames, ['直连'])
  // 仅流量信息节点与其兜底列表
  const trafficProxyNames = filterProxyNamesByRegex(realProxyNames, surgeTrafficRegex)
  const trafficGroupProxies = listOrFallback(trafficProxyNames, ['直连'])
  // 手动选择：排除流量信息节点，防止手动组被“测速节点”淹没
  const manualProxyNames = realProxyNames.filter((name) => !surgeTrafficRegex.test(name))
  const manualGroupProxies = listOrFallback(
    manualProxyNames.length > 0 ? [...manualProxyNames, 'All'] : ['All'],
    ['直连']
  )

  // 按地区生成策略组与地区节点映射
  const regionProxyGroups = []
  const regionProxyNames = new Map()
  surgeRegionDefs.forEach((region) => {
    const proxies = filterProxyNamesByRegex(realProxyNames, region.regex)
    if (proxies.length === 0) return
    const groupType = region.type || 'url-test'
    const regionGroupBaseOption =
      groupType === 'select' ? groupBaseOption : urlTestBaseOption
    regionProxyNames.set(region.name, proxies)
    regionProxyGroups.push({
      ...regionGroupBaseOption,
      name: region.name,
      type: groupType,
      proxies: proxies,
      hidden: region.name !== '自建节点',
      icon: region.icon,
    })
  })

  // Proxy：直接承接地区分组，省掉单独的“智能策略”中间层
  const proxyRegionGroupNames = uniqueList(
    surgeRegionDefs.map((region) =>
      regionProxyNames.get(region.name)?.length ? region.name : null
    )
  )
  const chatgptProxyNames = uniqueList([
    regionProxyNames.get('自建节点')?.length ? '自建节点' : null,
    regionProxyNames.get('美国节点')?.length ? '美国节点' : null,
    'Proxy',
  ])
  const proxyGroupProxies = uniqueList([
    ...proxyRegionGroupNames,
    '手动选择',
    '直连',
  ])

  // 便捷函数：地区组有节点时返回组名，否则返回 null（由 uniqueList 过滤掉）
  const regionOrNull = (name) => regionProxyNames.get(name)?.length ? name : null

  const googleGroupProxies      = uniqueList([regionOrNull('自建节点'), 'Proxy'])
  const hkbankGroupProxies      = uniqueList(['直连', regionOrNull('香港节点'), regionOrNull('自建节点')])
  const stockGroupProxies       = uniqueList(['直连', regionOrNull('香港节点'), regionOrNull('自建节点')])
  const youtubeGroupProxies     = uniqueList([
    regionOrNull('香港节点'), regionOrNull('自建节点'), regionOrNull('日本节点'),
    regionOrNull('台湾节点'), regionOrNull('新加坡节点'), 'Proxy',
  ])
  const appleGroupProxies       = uniqueList([
    '直连', regionOrNull('自建节点'), regionOrNull('土耳其节点'), regionOrNull('美国节点'),
  ])
  const microsoftGroupProxies   = uniqueList(['直连', regionOrNull('自建节点'), 'Proxy'])
  const cryptoGroupProxies      = uniqueList([regionOrNull('台湾节点'), regionOrNull('新加坡节点'), '直连'])
  const tradingviewGroupProxies = uniqueList([
    regionOrNull('香港节点'), regionOrNull('日本节点'),
    regionOrNull('新加坡节点'), regionOrNull('自建节点'), 'Proxy',
  ])

  // 构建策略组顺序：基础组 -> 地区组 -> All
  config['proxy-groups'] = [
    {
      ...groupBaseOption,
      name: '流量信息',
      type: 'select',
      proxies: trafficGroupProxies,
      icon: serviceMeta['流量信息'].icon,
    },
    {
      ...groupBaseOption,
      name: 'Proxy',
      type: 'select',
      proxies: proxyGroupProxies,
      icon: serviceMeta['Proxy'].icon,
    },
    {
      ...groupBaseOption,
      name: 'ChatGPT',
      type: 'select',
      url: serviceMeta['ChatGPT'].url,
      interval: 3600,
      proxies: chatgptProxyNames,
      icon: serviceMeta['ChatGPT'].icon,
    },
    {
      ...urlTestBaseOption,
      name: 'Google',
      type: 'fallback',
      proxies: googleGroupProxies,
      icon: serviceMeta['Google'].icon,
    },
    {
      ...groupBaseOption,
      name: 'HKBank',
      type: 'select',
      proxies: hkbankGroupProxies,
      icon: serviceMeta['HKBank'].icon,
    },
    {
      ...groupBaseOption,
      name: 'Stock',
      type: 'select',
      proxies: stockGroupProxies,
      icon: serviceMeta['Stock'].icon,
    },
    {
      ...urlTestBaseOption,
      name: 'YouTube',
      type: 'fallback',
      proxies: youtubeGroupProxies,
      icon: serviceMeta['YouTube'].icon,
    },
    {
      ...groupBaseOption,
      name: 'Apple',
      type: 'select',
      proxies: appleGroupProxies,
      icon: serviceMeta['Apple'].icon,
    },
    {
      ...urlTestBaseOption,
      name: 'Microsoft',
      type: 'fallback',
      proxies: microsoftGroupProxies,
      icon: serviceMeta['Microsoft'].icon,
    },
    {
      ...groupBaseOption,
      name: 'Crypto',
      type: 'select',
      proxies: cryptoGroupProxies,
      icon: serviceMeta['Crypto'].icon,
    },
    {
      ...urlTestBaseOption,
      name: 'TradingView',
      type: 'fallback',
      proxies: tradingviewGroupProxies,
      icon: serviceMeta['TradingView'].icon,
    },
    {
      ...groupBaseOption,
      name: '手动选择',
      type: 'select',
      proxies: manualGroupProxies,
      icon: serviceMeta['手动选择'].icon,
    },
    ...regionProxyGroups,
    {
      ...groupBaseOption,
      name: 'All',
      type: 'select',
      proxies: allGroupProxies,
      icon: serviceMeta['All'].icon,
    },
  ]

  // 远程规则集定义（依赖 Clash Verge 的 ruleset 功能）
  config['rule-providers'] = {
    apple_intelligence: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://ruleset.skk.moe/List/non_ip/apple_intelligence.conf',
      path: './ruleset/skk/apple_intelligence.list',
    },
    ai: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://ruleset.skk.moe/List/non_ip/ai.conf',
      path: './ruleset/skk/ai.list',
    },
    blocked: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://github.com/Blankwonder/surge-list/raw/master/blocked.list',
      path: './ruleset/Blankwonder/blocked.list',
    },
    cn: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://github.com/Blankwonder/surge-list/raw/master/cn.list',
      path: './ruleset/Blankwonder/cn.list',
    },
    apple: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://github.com/Blankwonder/surge-list/raw/master/apple.list',
      path: './ruleset/Blankwonder/apple.list',
    },
    youtube: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/YouTube/YouTube.list',
      path: './ruleset/blackmatrix7/YouTube.list',
    },
    bilibili: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/BiliBili/BiliBili.list',
      path: './ruleset/blackmatrix7/BiliBili.list',
    },
    apple_all: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Apple/Apple_All_No_Resolve.list',
      path: './ruleset/blackmatrix7/Apple_All.list',
    },
    microsoft: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Microsoft/Microsoft.list',
      path: './ruleset/blackmatrix7/Microsoft.list',
    },
    google_rules: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Google/Google.list',
      path: './ruleset/blackmatrix7/Google.list',
    },
    crypto_rules: {
      ...ruleProviderCommon,
      behavior: 'classical',
      url: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Surge/Crypto/Crypto.list',
      path: './ruleset/blackmatrix7/Crypto.list',
    },
  }

  // 规则顺序很重要：从特例到通配，最后 MATCH 兜底
  config['rules'] = [
    // 手动指定
    'DOMAIN-KEYWORD,cttic,DIRECT',
    'DOMAIN,alpha123.uk,Proxy',
    'DOMAIN-SUFFIX,coinbase.com,Proxy',
    // TradingView 专用
    'DOMAIN-SUFFIX,tradingview.com,TradingView',
    'DOMAIN-SUFFIX,tradingview-widget.com,TradingView',
    'DOMAIN-KEYWORD,tradingview,TradingView',
    // AI 服务
    'RULE-SET,apple_intelligence,ChatGPT',
    'RULE-SET,ai,ChatGPT',
    // 港区银行
    'DOMAIN-SUFFIX,bochk.com,HKBank',
    'DOMAIN-SUFFIX,bocpay.hk,HKBank',
    'DOMAIN-SUFFIX,za.group,HKBank',
    'DOMAIN-SUFFIX,zabank.hk,HKBank',
    'DOMAIN-SUFFIX,hsbc.com,HKBank',
    // 港区券商
    'DOMAIN-SUFFIX,hafoo.com.hk,Stock',
    'DOMAIN-SUFFIX,hafoo.com.cn,Stock',
    'DOMAIN-SUFFIX,hafoo.com,Stock',
    'DOMAIN-SUFFIX,hafoo.cn,Stock',
    'DOMAIN-SUFFIX,fosunwealth.com,Stock',
    'DOMAIN-SUFFIX,futunn.com,Stock',
    'DOMAIN-SUFFIX,futuhk.com,Stock',
    'DOMAIN-SUFFIX,moomoo.com,Stock',
    'DOMAIN-SUFFIX,interactivebrokers.com,Stock',
    'DOMAIN-SUFFIX,ibkr.com,Stock',
    'DOMAIN-SUFFIX,ibkrcampus.com,Stock',
    'DOMAIN-SUFFIX,ibllc.com,Stock',
    // 加密货币固定域名
    'DOMAIN-SUFFIX,bnbstatic.com,Crypto',
    // 广告屏蔽
    'DOMAIN-SUFFIX,doubleclick.net,REJECT',
    'DOMAIN-SUFFIX,googlesyndication.com,REJECT',
    'DOMAIN-SUFFIX,adsystem.com,REJECT',
    // 流媒体
    'RULE-SET,youtube,YouTube',
    'RULE-SET,bilibili,直连',
    // Apple（保留部分精确覆盖，再跟完整规则集）
    'DOMAIN,apps.apple.com,Proxy',
    'DOMAIN-SUFFIX,ls.apple.com,DIRECT',
    'DOMAIN-SUFFIX,store.apple.com,DIRECT',
    'RULE-SET,apple_all,Apple',
    // Microsoft / Google / 加密货币
    'RULE-SET,microsoft,Microsoft',
    'RULE-SET,google_rules,Google',
    'RULE-SET,crypto_rules,Crypto',
    // 代理与国内
    'RULE-SET,blocked,Proxy',
    'RULE-SET,cn,DIRECT',
    // 地理位置兜底
    'GEOSITE,private,DIRECT',
    'GEOIP,private,DIRECT,no-resolve',
    'GEOIP,cn,DIRECT',
    'MATCH,Proxy',
  ]

  return config
}
