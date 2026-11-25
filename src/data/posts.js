/**
 * 个人博客文章库
 * - 每篇文章都会自动出现在首页文章流、文章检索页与上下篇导航中
 * - Google Cloud VPS 指南作为其中一篇「技术攻略」收录在博客体系内
 */

export const CATEGORIES = ['全部', '技术攻略', '设计手记', '随笔思考', '工具箱'];

export const POSTS = [
  {
    slug: 'google-cloud-vps-ai-pro',
    index: '01',
    pinned: false,
    category: '技术攻略',
    categoryEn: 'GUIDE // CLOUD',
    date: '2026.02.18',
    readTime: '8 MIN',
    title: '用 Google AI Pro 每月 $10 赠金，搭建长期免维护的谷歌云 VPS',
    shortTitle: 'Google Cloud 免费 VPS 搭建与 AI Pro $10 赠金抵扣完整指南',
    excerpt:
      '以美国俄勒冈 Always Free 永久免费层级为底座，叠加 Google AI Pro 每月 $10 赠金自动抵扣，系统梳理入站/出站与 CDN 互联流量规则、无域名与有域名双方案一键部署，以及试用期续活与链式代理提速实践。',
    tags: ['GCP', 'AI Pro', 'sing-box', 'VPS', '自托管'],
    toc: [
      { id: 'sec-overview', num: '00', label: '核心架构与指标' },
      { id: 'sec-billing', num: '01', label: '结算账号与 $10 赠金' },
      { id: 'sec-vm', num: '02', label: '创建 VM 与开放防火墙' },
      { id: 'sec-traffic', num: '03', label: '流量规则与 CDN 计费' },
      { id: 'sec-deploy', num: '04', label: 'SSH 与双方案一键部署' },
      { id: 'sec-advanced', num: '05', label: '试用期续活与链式代理' },
      { id: 'sec-sources', num: '06', label: '参考资料与官方链接' }
    ],
    renderContent: renderGcpVpsArticle
  }
];

export function getPostBySlug(slug) {
  return POSTS.find((p) => p.slug === slug) || POSTS[0];
}

export function getAllTags() {
  const counts = new Map();
  for (const post of POSTS) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/* ==========================================================================
   POST 01: GOOGLE CLOUD VPS & AI PRO $10 GUIDE (OVERHAULED SWISS MONOGRAPH)
   ========================================================================== */
function renderGcpVpsArticle() {
  return `
    <!-- 00 / MASTHEAD & KPI SPEC STRIP -->
    <header class="art-masthead" id="sec-overview">
      <div class="art-kicker-row">
        <span class="swiss-kicker">技术攻略 // GUIDE 01 · INFRASTRUCTURE</span>
        <div class="art-tags">
          <span class="swiss-tag swiss-tag-tech">GCP ALWAYS FREE</span>
          <span class="swiss-tag swiss-tag-accent">AI PRO $10</span>
          <span class="swiss-tag">SING-BOX</span>
          <span class="swiss-tag">MIHOMO</span>
        </div>
      </div>
      <h1 class="art-h1">用 Google AI Pro 每月 $10 赠金，<br />搭建长期免维护的谷歌云 VPS</h1>
      <p class="art-lead">
        借助 Google Cloud 美国俄勒冈区的 Always Free 永久免费层级，配合 Google AI Pro 附带的每月 $10 开发者赠金自动抵扣，我们完全可以零运维、近乎零成本地长期运行一台独享 IP 的海外 VPS。本文将从结算账号绑定、实例避坑配置、入站/出站与 CDN 互联计费原理，到无域名/有域名双方案一键部署与进阶链式代理，完整梳理整套搭建流程。
      </p>

      <div class="swiss-kpi-grid">
        <div class="swiss-kpi-item">
          <div class="swiss-kpi-num">200 GiB</div>
          <div class="swiss-kpi-tag">FREE STANDARD EGRESS</div>
          <div class="swiss-kpi-desc">标准网络层级每月免费单向出站额度（入站全部免费，额度不打对折）</div>
        </div>
        <div class="swiss-kpi-item is-accent">
          <div class="swiss-kpi-num">$10 / 月</div>
          <div class="swiss-kpi-tag">AUTO-APPLIED CREDIT</div>
          <div class="swiss-kpi-desc">Google AI Pro 开发者赠金自动抵扣，轻松覆盖极少量 CDN 互联微费</div>
        </div>
        <div class="swiss-kpi-item">
          <div class="swiss-kpi-num">62–89 GB</div>
          <div class="swiss-kpi-tag">REAL-WORLD USAGE</div>
          <div class="swiss-kpi-desc">日常重度主力连续三个月实测出站用量，尚不足免费额度一半</div>
        </div>
      </div>
    </header>

    <!-- 01 / BILLING & CREDITS -->
    <section class="art-section" id="sec-billing">
      <div class="sec-header">
        <div class="sec-num">01</div>
        <div>
          <h2 class="sec-title">开通 Google Cloud 结算账号并自动绑定 $10 赠金</h2>
          <p class="sec-subtitle">新旧账号皆可享受 Always Free 永久免费层级，核心在于提前锁定同一账号的月度自动续领。</p>
        </div>
      </div>

      <p class="art-p">
        新注册 Google Cloud 账号可获 <strong>90 天 $300 试用赠金</strong>，而已有旧账号（即便曾用过试用期）只要升级为完整结算账号，依然享有永久免费层级。关键在于提前把 Google AI Pro 福利绑定到同一结算账号，并开启自动续领。
      </p>

      <div class="swiss-step-cols">
        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">注册与付款资料要点</h3>
            <span class="swiss-card-code">STEP 01.A</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span>打开 <a href="https://cloud.google.com/free?hl=zh-CN" target="_blank" rel="noopener noreferrer">Google Cloud 免费计划页面</a>，使用<strong>已订阅 Google AI Pro 的同一个 Google 账号</strong>登录。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span>创建付款资料时选择<strong>个人</strong>；账单地址建议填写美国免税州（如俄勒冈州）以减少潜在税费。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span>绑定可正常扣款的外币 Visa / Mastercard 信用卡或借记卡（可重复使用，<strong>勿绑空卡</strong>以免后续扣款失败被停机）。</span>
            </li>
            <li>
              <span class="step-badge">04</span>
              <span>首次进入 Compute Engine 提示启用 API 属正常操作，启用 API 本身不产生费用。</span>
            </li>
          </ol>
        </div>

        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">领取并自动应用 AI Pro 赠金</h3>
            <span class="swiss-card-code">STEP 01.B</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span>前往 <a href="https://me.developers.google.com/benefits?hl=zh-cn" target="_blank" rel="noopener noreferrer">Google 开发者计划福利页面</a>，用同一 Google 账号登录。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span>找到 <strong>Google AI Pro 每月 $10 Google Cloud 赠金</strong>卡片，选择你的结算账号，并务必勾选<strong>“始终使用此结算账号”</strong>（<a href="https://developers.google.com/profile/help/benefits?hl=zh-cn" target="_blank" rel="noopener noreferrer">开发者计划 FAQ</a>）。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span>若页面显示促销代码，复制后前往 <code>console.cloud.google.com/billing/redeem</code> 兑换绑定。</span>
            </li>
            <li>
              <span class="step-badge">04</span>
              <span>发放按首次领取的月度周年日循环，每笔赠金自发放起 <strong>1 年内有效</strong>，自动顺延抵扣账单。</span>
            </li>
          </ol>
        </div>
      </div>

      <div class="swiss-callout is-tech">
        <strong>非美区结算账号无需重来：</strong>若此前已选了日本等非美国区，结算国家<strong>不影响</strong>你在控制台选择美国俄勒冈机房，每月 $10 赠金也会按汇率自动折算抵扣（详见 <a href="https://docs.cloud.google.com/billing/docs/how-to/modify-billing-account" target="_blank" rel="noopener noreferrer">官方结算文档</a>）。
      </div>
    </section>

    <!-- 02 / STEP-BY-STEP VM CREATION & VPC FIREWALL -->
    <section class="art-section" id="sec-vm">
      <div class="sec-header">
        <div class="sec-num">02</div>
        <div>
          <h2 class="sec-title">一步一步按免费层级创建 VM 实例并放行防火墙</h2>
          <p class="sec-subtitle">跟着下面 6 个步骤逐项点击配置，避开默认磁盘、备份与高级网络三处扣费陷阱。</p>
        </div>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">02.1</span>进入「创建实例」页面</h3>
      <p class="art-p">
        登录 Google Cloud 控制台（<a href="https://cloud.google.com/" target="_blank" rel="noopener noreferrer">cloud.google.com</a>）后，可通过以下任意一种方式进入虚拟机创建界面：
      </p>

      <div class="swiss-step-cols">
        <div class="swiss-card">
          <div class="swiss-card-head">
            <h4 class="swiss-card-title">方法一：顶部搜索（最快捷）</h4>
            <span class="swiss-card-code">RECOMMENDED</span>
          </div>
          <p class="module-body">
            直接在控制台最顶部搜索框输入 <code>虚拟机实例</code>，点击搜索结果进入列表页，再点击顶部蓝色按钮 <strong>创建实例</strong>。
          </p>
        </div>
        <div class="swiss-card">
          <div class="swiss-card-head">
            <h4 class="swiss-card-title">方法二：左侧导航菜单</h4>
            <span class="swiss-card-code">MENU PATH</span>
          </div>
          <p class="module-body">
            点击左上角导航菜单图标（三条横线 <code>☰</code>）→ 鼠标移到 <strong>Compute Engine</strong> → 点击 <strong>虚拟机实例</strong> → 点击顶部 <strong>创建实例</strong>。
          </p>
        </div>
      </div>

      <div class="swiss-callout">
        <strong>首次进入提示：</strong>如果是第一次打开，系统可能会提示正在启用 <code>Compute Engine API</code>，静待约 1 分钟刷新页面即可看到“创建实例”按钮（启用 API 本身免费）。
      </div>

      <h3 class="art-subhead"><span class="sub-idx">02.2</span>按顺序逐项配置实例（共 6 步）</h3>
      <p class="art-p">
        进入“创建实例”页面后，按以下顺序逐项点击配置（谷歌云新版界面左侧带有分组目录，旧版直接向下滚动找到对应栏目即可）：
      </p>

      <div class="tutorial-steps">
        <div class="tutorial-step">
          <div class="tutorial-step-head">
            <span class="tutorial-step-num">STEP 01</span>
            <h4 class="tutorial-step-title">设置名称与免费区域</h4>
          </div>
          <ul class="tutorial-kv">
            <li><strong>名称：</strong>保持默认即可，或自定义（仅限小写字母、数字和短横线）。</li>
            <li><strong>区域：</strong>下拉选择 <span class="param-pill">us-west1（俄勒冈）</span>（美西距国内最近；亦可任选 <code>us-central1</code> 爱荷华或 <code>us-east1</code> 南卡罗来纳）。</li>
            <li><strong>可用区：</strong>保持系统默认分配即可，无需改动。</li>
          </ul>
        </div>

        <div class="tutorial-step">
          <div class="tutorial-step-head">
            <span class="tutorial-step-num">STEP 02</span>
            <h4 class="tutorial-step-title">选择免费机型（e2-micro）</h4>
          </div>
          <ul class="tutorial-kv">
            <li>在 <strong>机器配置</strong> 栏中，<strong>系列</strong> 选择 <span class="param-pill">E2</span>。</li>
            <li><strong>机器类型：</strong>下拉选择配置最低的 <span class="param-pill">e2-micro</span>（2 个 vCPU，1 GB 内存，保持默认标准预配）。</li>
          </ul>
        </div>

        <div class="tutorial-step is-critical">
          <div class="tutorial-step-head">
            <span class="tutorial-step-num">STEP 03</span>
            <h4 class="tutorial-step-title">修改操作系统与 30 GB 标准磁盘</h4>
            <span class="swiss-tag swiss-tag-accent">防扣费重点</span>
          </div>
          <p class="tutorial-lead">默认磁盘类型不是标准盘，<strong>必须手动修改</strong>。点击左侧 <strong>操作系统和存储空间</strong>（旧版向下滚动找到“启动磁盘”），点击 <strong>更改</strong> 按钮：</p>
          <ul class="tutorial-kv">
            <li><strong>操作系统：</strong>选择 <span class="param-pill">Ubuntu</span>（切勿选 Windows，含授权费）。</li>
            <li><strong>版本：</strong>选择带 <code>x86/64</code> 的 LTS 版本（如 <code>Ubuntu 22.04</code> 或 <code>24.04 LTS</code>）。</li>
            <li><strong>启动磁盘类型：</strong>下拉改为 <span class="param-pill is-red">标准永久性磁盘</span>（默认是平衡磁盘，不改会扣费）。</li>
            <li><strong>大小（GB）：</strong>改为 <span class="param-pill">30</span>，然后点击底部 <strong>选择</strong> 保存。</li>
          </ul>
        </div>

        <div class="tutorial-step is-critical">
          <div class="tutorial-step-head">
            <span class="tutorial-step-num">STEP 04</span>
            <h4 class="tutorial-step-title">关闭数据保护备份</h4>
            <span class="swiss-tag swiss-tag-accent">防扣费重点</span>
          </div>
          <ul class="tutorial-kv">
            <li>点击左侧 <strong>数据保护</strong>，找到备份方案，点选 <span class="param-pill is-red">无备份</span>，防止默认自动快照产生额外存储费用。</li>
          </ul>
        </div>

        <div class="tutorial-step is-critical">
          <div class="tutorial-step-head">
            <span class="tutorial-step-num">STEP 05</span>
            <h4 class="tutorial-step-title">配置防火墙与标准网络层级</h4>
            <span class="swiss-tag swiss-tag-accent">防扣费重点</span>
          </div>
          <p class="tutorial-lead">网络层级默认是高级，<strong>必须手动改为标准</strong>。点击左侧 <strong>网络</strong> 选项卡：</p>
          <ul class="tutorial-kv">
            <li><strong>防火墙：</strong>勾选 <span class="param-pill">允许 HTTP 流量</span> 和 <span class="param-pill">允许 HTTPS 流量</span>。</li>
            <li><strong>网络接口：</strong>找到列表中的 <code>default</code>，点击展开修改：</li>
            <li><strong>外部 IPv4 地址：</strong>确认保持默认 <span class="param-pill">临时</span>（不要改为静态 IP，闲置会扣费）。</li>
            <li><strong>网络服务层级：</strong>手动点选 <span class="param-pill is-red">标准 (Standard)</span>（这样才享有每月 200 GiB 免费出站流量）。</li>
            <li>如果下方出现 <strong>完成</strong> 按钮，点击收起保存。</li>
          </ul>
        </div>

        <div class="tutorial-step">
          <div class="tutorial-step-head">
            <span class="tutorial-step-num">STEP 06</span>
            <h4 class="tutorial-step-title">点击创建并等待开机</h4>
          </div>
          <ul class="tutorial-kv">
            <li>其余未提及选项全部保持默认，拉到页面最底部点击蓝色的 <strong>创建</strong> 按钮。</li>
            <li>等待约 <strong>30 秒</strong>，虚拟机实例列表中出现绿色对勾即表示创建完成；随后点击该行右侧的 <strong>SSH</strong> 按钮即可登录跑脚本。</li>
          </ul>
        </div>
      </div>

      <div class="swiss-callout is-tech">
        <strong>关于右侧“每月估算费用”：</strong>配置完成后，页面右侧依然会显示每月约 <strong>$6–$7</strong> 的估算价格，这是正常现象——估算器不会计入免费层级抵扣；只要配置完全符合上述要求，实际出账单时符合 <a href="https://docs.cloud.google.com/free/docs/free-cloud-features?hl=zh-cn" target="_blank" rel="noopener noreferrer">Always Free 规则</a> 的资源会自动抵扣为 <strong>$0</strong>。
      </div>

      <h3 class="art-subhead"><span class="sub-idx">02.3</span>开放防火墙（VPC 网络）</h3>
      <p class="art-p">
        VM 实例创建完成后，还需要在谷歌云控制台放行入站端口，否则后续部署的节点将无法从外部连入。在控制台顶部搜索框搜索<strong>“防火墙”</strong>，进入<strong>“防火墙（VPC 网络）”</strong>设置界面，点击顶部<strong>“创建防火墙规则”</strong>，按以下参数填写后点击创建即可：
      </p>

      <div class="swiss-card">
        <div class="swiss-card-head">
          <h4 class="swiss-card-title">创建防火墙规则配置清单</h4>
          <span class="swiss-card-code">VPC FIREWALL</span>
        </div>
        <ol class="step-list">
          <li>
            <span class="step-badge">01</span>
            <span><strong>名称：</strong>随意填写（例如 <code>allow-all-ingress</code>，仅作标识）。</span>
          </li>
          <li>
            <span class="step-badge">02</span>
            <span><strong>目标：</strong>选择<strong>“网络中的所有实例”</strong>。</span>
          </li>
          <li>
            <span class="step-badge">03</span>
            <span><strong>流量方向：</strong>保持默认<strong>入站</strong>。</span>
          </li>
          <li>
            <span class="step-badge">04</span>
            <span><strong>来源 IPv4 范围：</strong>填写 <code>0.0.0.0/0</code>（表示允许任意外部 IP 访问）。</span>
          </li>
          <li>
            <span class="step-badge">05</span>
            <span><strong>协议和端口：</strong>选择<strong>全部允许</strong>，确认无误后点击底部<strong>创建</strong>即可生效。</span>
          </li>
        </ol>
      </div>
    </section>

    <!-- 03 / TRAFFIC BILLING RULES: INGRESS, EGRESS & CLOUDFLARE CDN INTERCONNECT -->
    <section class="art-section" id="sec-traffic">
      <div class="sec-header">
        <div class="sec-num">03</div>
        <div>
          <h2 class="sec-title">流量计费规则：入站、出站与 Cloudflare CDN 互联</h2>
          <p class="sec-subtitle">读懂谷歌云的三层流量计费逻辑，就能彻底避免莫名账单，把每月 200 GiB 免费额度用到极致。</p>
        </div>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">03.1</span>入站流量（Ingress）：完全免费</h3>
      <p class="art-p">
        入站流量是指数据从外部互联网进入你的谷歌云 VPS。无论体量多大，谷歌云对入站流量均实行 <strong>100% 免费</strong>政策。在代理使用场景中，当你通过 VPS 观看 YouTube 或浏览网页时，VPS 从目标网站拉取视频与页面数据的过程属于“入站”，完全不花钱；同理，从本地设备向 VPS 上传文件也计为入站，同样免费。
      </p>

      <h3 class="art-subhead"><span class="sub-idx">03.2</span>出站流量（Egress）：核心计费项</h3>
      <p class="art-p">
        出站流量是指数据从谷歌云 VPS 发往外部互联网——例如 VPS 将拉取到的视频数据转发回你的手机或电脑，或是 VPS 向目标网站发出访问请求。谷歌云的出站流量划分为两种网络层级，创建实例时系统默认勾选高级层级，<strong>必须手动切换为标准层级</strong>才能享受免费额度：
      </p>

      <div class="tier-table-wrap">
        <table class="swiss-table" aria-label="谷歌云标准层级与高级层级流量计费对比">
          <thead>
            <tr>
              <th>对比项</th>
              <th class="col-good">标准层级（Standard Tier）✅ 必选</th>
              <th class="col-bad">高级层级（Premium Tier）❌ 默认</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>路由线路</td>
              <td>走普通公网线路，延迟略高但日常完全可用</td>
              <td>走谷歌全球私有骨干网，速度与延迟更优</td>
            </tr>
            <tr>
              <td>每月免费额度</td>
              <td><strong>200 GiB</strong>（全账号共享）</td>
              <td>仅 <strong>1 GiB</strong>（发往中国大陆甚至无免费额度）</td>
            </tr>
            <tr>
              <td>超出后单价（美区）</td>
              <td><code>$0.085 / GiB</code>（前 10 TiB）</td>
              <td><code>$0.12 / GiB</code> 起（发往中国大陆高达 <code>$0.23 / GiB</code>）</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="swiss-callout is-tech">
        <strong>为什么说“200 GiB 不打对折”？</strong> 许多常规 VPS 商家采用“双向计费”（入站 + 出站合并统计），看 1 GB 视频实际要扣掉 2 GB 流量。而谷歌云<strong>只计出站</strong>：VPS 从目标站点下载 1 GB 视频（入站免费）→ 再转发到你的终端（出站 1 GB），因此 200 GiB 免费额度可以实打实用满整整 200 GiB 的真实下载量。
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">重度主力连续 3 个月实测出站用量 vs 200 GiB 免费上限</h3>
          <span class="chart-ceiling-badge">免费红线 · 200 GiB / 月</span>
        </div>

        <div class="bar-chart-rows">
          <div class="bar-row">
            <div class="bar-label">第 1 月实测<span>MONTH 01</span></div>
            <div class="bar-track" title="62 GB / 200 GB (31.0%)">
              <div class="bar-fill" style="width: 28.2%"></div>
              <div class="bar-limit-line"></div>
            </div>
            <div class="bar-metric">62 GB<small>31.0% · 余 138 GB</small></div>
          </div>

          <div class="bar-row">
            <div class="bar-label">第 2 月实测<span>MONTH 02</span></div>
            <div class="bar-track" title="83 GB / 200 GB (41.5%)">
              <div class="bar-fill" style="width: 37.7%"></div>
              <div class="bar-limit-line"></div>
            </div>
            <div class="bar-metric">83 GB<small>41.5% · 余 117 GB</small></div>
          </div>

          <div class="bar-row">
            <div class="bar-label">第 3 月实测<span>MONTH 03</span></div>
            <div class="bar-track" title="89 GB / 200 GB (44.5%)">
              <div class="bar-fill" style="width: 40.5%"></div>
              <div class="bar-limit-line"></div>
            </div>
            <div class="bar-metric">89 GB<small>44.5% · 余 111 GB</small></div>
          </div>
        </div>

        <div class="chart-axis">
          <span></span>
          <div class="chart-ticks">
            <span>0 GB</span>
            <span>55 GB</span>
            <span>110 GB</span>
            <span>165 GB</span>
            <span style="color: var(--accent-cobalt); font-weight: 700;">200 GB 免费线</span>
          </div>
          <span></span>
        </div>

        <p class="chart-caption">
          参考俄勒冈标准层级结算报告实测：即便作为日常主力（查资料、看高清视频、上传素材），月均出站也仅在 60–90 GB 左右，余量超过 <strong>55%</strong>。
        </p>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">03.3</span>Cloudflare 为什么会导致单独扣费？</h3>
      <p class="art-p">
        谷歌云与 Cloudflare 等大型 CDN 服务商之间存在单独的 <strong>CDN 互联（CDN Interconnect）</strong>计费项。凡是从谷歌云 VPS 出站并流向 Cloudflare 网络的数据，<strong>不会计入每月 200 GiB 的标准层级免费额度</strong>，而是直接按 CDN 互联费率（通常每 GiB 几美分）单独出账。
      </p>

      <p class="art-p">
        <strong>1. 必须避开的 4 个“大额反撸”操作：</strong>以下任意一项都会让节点流量大规模流经 Cloudflare，使 200 GiB 免费额度形同虚设并触发明显扣费：
      </p>

      <div class="redline-detail-grid">
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>域名解析开启“小黄云”代理</div>
          <p>客户端连接节点时，VPS 发回给你的全部下行数据都会先经由 Cloudflare，全额按 CDN 互联出站计费。</p>
        </div>
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>使用 Cloudflare Argo 隧道</div>
          <p>原理与开启代理一致，全部转发流量都会穿过 Cloudflare 边缘网络，产生持续互联出账。</p>
        </div>
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>使用 Cloudflare CDN 回源</div>
          <p>将 VPS 作为源站接入 Cloudflare CDN 加速，源站向 Cloudflare 回传内容同样触发大额互联出站。</p>
        </div>
        <div class="redline-detail-card">
          <div class="redline-detail-head"><span class="redline-x">✕</span>在 VPS 端开启 Cloudflare WARP</div>
          <p>VPS 发出的一切外部访问请求都会经由 Cloudflare WARP 节点转出，直接触发互联计费。</p>
        </div>
      </div>

      <p class="art-p">
        <strong>2. 为什么避开了所有坑，账单里依然会有几美分？</strong> 互联网上有大量常用网站（例如 ChatGPT、X / Twitter 等）本身托管在 Cloudflare CDN 之后。当你通过谷歌云 VPS 访问这些网站时，VPS 发往它们的请求数据（如输入的提问文本、点击指令与请求头）属于“出站至 Cloudflare”，仍会触发 CDN 互联计费。好在这类请求体积微乎其微（通常仅几 KB），而网站返回的网页、图片与回答正文属于免费的入站流量，随后由 VPS 直连发往你的设备走的是 200 GiB 标准层级免费额度。因此正常中等强度使用，全年往往只产生几美分（长期实测一年约 <strong>$0.05</strong>），完全会被每月 $10 的 AI Pro 赠金无感抵扣。
      </p>

      <div class="swiss-callout is-warn">
        <strong>重要提醒：</strong>正是因为这几美分不可避免的微小账单，90 天试用期结束并升级为完整账号后，<strong>绑定的银行卡必须能够正常扣款</strong>（切勿使用空卡或失效卡）。一旦后续扣款失败，谷歌云会直接封停整个结算账号与实例。
      </div>
    </section>

    <!-- 04 / SSH LOGIN & DUAL-MODE ONE-CLICK DEPLOYMENT -->
    <section class="art-section" id="sec-deploy">
      <div class="sec-header">
        <div class="sec-num">04</div>
        <div>
          <h2 class="sec-title">SSH 登录与一键部署（无域名 / 有域名双方案）</h2>
          <p class="sec-subtitle">使用官方网页 SSH 免配密钥登录，结合 sing-box-yg 一键脚本，按是否持有域名灵活选择自签或正规证书。</p>
        </div>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.1</span>登录网页 SSH 并切换 root 权限</h3>
      <p class="art-p">
        在 Google Cloud 控制台的虚拟机实例列表中，直接点击目标实例右侧的 <strong>SSH</strong> 按钮，并在弹窗中确认即可进入浏览器网页终端。进入后先执行以下命令切换至 <code>root</code> 权限：
      </p>

      <div class="code-block">
        <div class="code-bar">
          <span class="code-lang">BASH · SWITCH TO ROOT</span>
          <button type="button" class="copy-btn" data-copy="sudo -i">复制命令</button>
        </div>
        <pre><code>sudo -i</code></pre>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.2</span>运行一键安装脚本与基础选项确认</h3>
      <p class="art-p">
        打开 <a href="https://github.com/yonggekkk/sing-box-yg" target="_blank" rel="noopener noreferrer">yonggekkk/sing-box-yg</a> 项目主页，复制其中的 VPS 专用一键安装命令（通常取第一条即可）粘贴至 SSH 终端回车运行：
      </p>

      <div class="code-block">
        <div class="code-bar">
          <span class="code-lang">BASH · SING-BOX-YG INSTALL</span>
          <button type="button" class="copy-btn" data-copy="bash <(curl -Ls https://raw.githubusercontent.com/yonggekkk/sing-box-yg/main/sb.sh)">复制命令</button>
        </div>
        <pre><code>bash &lt;(curl -Ls https://raw.githubusercontent.com/yonggekkk/sing-box-yg/main/sb.sh)</code></pre>
      </div>

      <div class="swiss-callout is-tech">
        <strong>脚本初始化提示要点：</strong>脚本加载完成后选择<strong>一键安装</strong>；若脚本弹出 <strong>IPv4 与 IPv6 相关确认项</strong>，请依次输入两个 <code>yes</code> 确认放行/启用；随后出现的两项基础配置询问——<strong>是否开放端口</strong>与<strong>选择内核版本</strong>——均直接回车沿用默认设置即可。
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.3</span>配置证书：无域名 vs 有域名双方案</h3>
      <p class="art-p">
        接下来脚本会询问采用自签证书还是申请正规域名证书。请根据自身是否拥有域名二选一（使用 Cloudflare 解析域名时<strong>切勿开启代理小黄云</strong>）：
      </p>

      <div class="swiss-step-cols">
        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">方案 A：无域名（最省事）</h3>
            <span class="swiss-card-code">SELF-SIGNED</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span>脚本询问证书类型时，直接按<strong>回车</strong>选择默认<strong>自签证书</strong>。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span>无需任何 DNS 解析步骤，后续交互一路回车即可自动完成全部协议部署。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span>适合希望几分钟内快速跑通验证、暂不打算绑定个人域名的场景。</span>
            </li>
          </ol>
        </div>

        <div class="swiss-card">
          <div class="swiss-card-head">
            <h3 class="swiss-card-title">方案 B：有域名（推荐）</h3>
            <span class="swiss-card-code">ACME TLS</span>
          </div>
          <ol class="step-list">
            <li>
              <span class="step-badge">01</span>
              <span><strong>添加 A 记录：</strong>登录 Cloudflare 进入目标域名的 DNS 页面，添加一条 <code>A</code> 记录；名称填自定义前缀（如 <code>test</code>），IPv4 地址填入谷歌云实例的外部 IP，<strong>务必关闭代理状态（小黄云）</strong>以防触发 CDN 互联扣费。</span>
            </li>
            <li>
              <span class="step-badge">02</span>
              <span><strong>验证解析生效：</strong>在本地电脑打开命令提示符（CMD），运行 <code>ping 你的完整域名</code>，确认括号内返回的 IP 与谷歌云外部 IP 一致（有丢包不影响解析验证）。</span>
            </li>
            <li>
              <span class="step-badge">03</span>
              <span><strong>脚本申请证书：</strong>回到 SSH 终端输入 <code>2</code> 选择申请正规证书；待依赖组件装完后，在证书申请菜单中依次输入 <code>1</code> → <code>1</code>。</span>
            </li>
            <li>
              <span class="step-badge">04</span>
              <span><strong>跳过邮箱并绑定域名：</strong>提示输入邮箱时直接回车跳过，接着填入刚解析好的完整域名；脚本校验域名与 IP 匹配后将自动完成正规证书签发。</span>
            </li>
          </ol>
        </div>
      </div>

      <h3 class="art-subhead"><span class="sub-idx">04.4</span>完成端口、UUID 设置并导入测试</h3>
      <p class="art-p">
        证书配置完成后，脚本会继续询问各协议的监听端口，直接<strong>回车采用默认端口</strong>即可，节点所需的 UUID 也会由脚本自动生成。安装全部结束后，终端会一次性输出 4 种协议的节点链接与一条底部聚合订阅链接：
      </p>

      <div class="protocol-grid protocol-grid-4">
        <div class="protocol-card">
          <span class="swiss-tag swiss-tag-tech">推荐 · 首选</span>
          <div class="protocol-name">Hysteria2</div>
          <p class="protocol-desc">基于 UDP 的高吞吐传输协议，日常与晚高峰拉流表现突出。</p>
        </div>
        <div class="protocol-card">
          <span class="swiss-tag swiss-tag-tech">推荐 · 首选</span>
          <div class="protocol-name">TUIC</div>
          <p class="protocol-desc">UDP 拥塞控制温和稳定，长连接浏览与开发工具体验流畅。</p>
        </div>
        <div class="protocol-card">
          <span class="swiss-tag">TCP 兜底</span>
          <div class="protocol-name">VLESS-Reality-Vision</div>
          <p class="protocol-desc">无需依赖 UDP，适合对 UDP 限速或封禁较严的办公/校园网环境。</p>
        </div>
        <div class="protocol-card">
          <span class="swiss-tag">备用通道</span>
          <div class="protocol-name">VMess-WS-TLS</div>
          <p class="protocol-desc">经典 WebSocket 加密传输协议，便于配合传统客户端或链式落地。</p>
        </div>
      </div>

      <div class="swiss-callout">
        <strong>客户端导入与测试：</strong>直接复制终端底部输出的<strong>聚合订阅链接</strong>导入到 <code>v2rayN</code> 等客户端中并执行真连接测试。四条协议中偶有个别协议因网络环境不通属于正常现象，日常优先挑选 <strong>Hysteria2</strong> 或 <strong>TUIC</strong> 节点使用即可。
      </div>
    </section>

    <!-- 05 / TRIAL ACTIVATION & CHAIN PROXY -->
    <section class="art-section" id="sec-advanced">
      <div class="sec-header">
        <div class="sec-num">05</div>
        <div>
          <h2 class="sec-title">试用期续活窗口与链式代理提速</h2>
          <p class="sec-subtitle">顺利跨过 90 天试用期转正节点，并借助链式代理在晚高峰兼得干净独享 IP 与高速带宽。</p>
        </div>
      </div>

      <div class="swiss-callout is-warn">
        <strong>90 天试用期满后 30 天内务必手动激活：</strong>新账号 90 天试用期到期后，VM 实例会被自动暂停。请务必在 <strong>30 天宽限期内</strong>登录控制台，点击顶部<strong>升级 / 激活完整账号</strong>按钮以保留原有实例与全部数据（超期将被永久清理）。升级前确认配置完全符合免费层级且绑定银行卡有效；未用完的 $300 试用金不会顺延。
      </div>

      <p class="art-p" style="margin-top: 24px;">
        <strong>进阶优化 · 链式代理化解晚高峰降速与 UDP 断流：</strong>谷歌云美西独享 IP 的纯净度远高于多人共享的普通机场节点，但晚高峰直连 TCP 可能偏慢，而高强度 UDP 协议（Hysteria2 / TUIC）在部分地区偶发运营商 QOS 断流。一个兼顾速度与纯净 IP 的成熟方案是<strong>链式代理</strong>：用低延迟的<strong>香港机场节点作为前置中转</strong>，再转发至 <strong>GCP 美西节点（普通 VLESS / VMess TCP 即可）作为最终落地</strong>。实测下行速率可从直连 <strong>20+ Mbps</strong> 提升至 <strong>500+ Mbps</strong>，彻底告别晚高峰拥堵与 UDP 断流。
      </p>

      <div class="chain-diagram" aria-label="链式代理拓扑架构图">
        <div class="chain-node">
          <div class="chain-node-kicker">01 · CLIENT</div>
          <div class="chain-node-title">本机代理客户端</div>
          <div class="chain-node-sub">配置前置中转与落地出口</div>
        </div>
        <div class="chain-arrow">→</div>
        <div class="chain-node">
          <div class="chain-node-kicker">02 · RELAY (FRONT)</div>
          <div class="chain-node-title">香港低延迟中转节点</div>
          <div class="chain-node-sub">稳定高速跨境传输链路</div>
        </div>
        <div class="chain-arrow">→</div>
        <div class="chain-node is-highlight">
          <div class="chain-node-kicker">03 · LANDING (EXIT)</div>
          <div class="chain-node-title">GCP 俄勒冈独享落地</div>
          <div class="chain-node-sub">普通 VLESS/VMess TCP · 500+ Mbps</div>
        </div>
      </div>

      <div class="code-block">
        <div class="code-bar">
          <span class="code-lang">YAML · MIHOMO CHAIN PROXY</span>
          <button type="button" class="copy-btn" data-copy="proxies:&#10;  - name: GCP-Oregon-CleanIP&#10;    type: vless&#10;    server: us.你的域名&#10;    port: 443&#10;    dialer-proxy: 香港中转节点名">复制片段</button>
        </div>
        <pre><code>proxies:
  - name: GCP-Oregon-CleanIP
    type: vless
    server: us.你的域名
    port: 443
    dialer-proxy: 香港中转节点名</code></pre>
      </div>
    </section>

    <!-- 06 / REFERENCES COLOPHON -->
    <section class="art-section" id="sec-sources">
      <div class="sec-header">
        <div class="sec-num">06</div>
        <div>
          <h2 class="sec-title">参考资料与官方链接</h2>
          <p class="sec-subtitle">官方文档、开源部署脚本与延伸参考索引。</p>
        </div>
      </div>

      <ol class="sources-grid">
        <li class="source-item">
          <span class="source-idx">[01]</span>
          <span>Google Cloud，<a href="https://docs.cloud.google.com/free/docs/free-cloud-features?hl=zh-cn" target="_blank" rel="noopener noreferrer">免费 Google Cloud 功能与 Always Free 层级官方文档</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[02]</span>
          <span>Google Cloud，<a href="https://cloud.google.com/network-tiers/pricing" target="_blank" rel="noopener noreferrer">Network Service Tiers 定价（标准层级每月 200 GiB 免费出站）</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[03]</span>
          <span>Google for Developers，<a href="https://developers.google.com/profile/help/benefits?hl=zh-cn" target="_blank" rel="noopener noreferrer">Google 开发者计划福利 FAQ（AI Pro 每月 $10 赠金领取与自动应用）</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[04]</span>
          <span>Google Cloud，<a href="https://docs.cloud.google.com/billing/docs/how-to/modify-billing-account" target="_blank" rel="noopener noreferrer">修改 Cloud Billing 结算账号官方文档</a>。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[05]</span>
          <span>yonggekkk，<a href="https://github.com/yonggekkk/sing-box-yg" target="_blank" rel="noopener noreferrer">sing-box-yg 多协议 VPS 一键部署脚本</a>，GitHub。</span>
        </li>
        <li class="source-item">
          <span class="source-idx">[06]</span>
          <span>Seven科技生活，<a href="https://7techlife.blogspot.com/" target="_blank" rel="noopener noreferrer">Seven Tech Life 博客与谷歌云实测参考</a>。</span>
        </li>
      </ol>
    </section>
  `;
}
