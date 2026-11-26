# Gavin's Blog · 管理员后台配置指南（`#/admin`）

管理员后台默认对普通访客隐藏，进入方式有两种：
1. 直接访问：`https://blog.gavinli.top/#/admin`
2. 快捷键：在任意页面按 `Ctrl + Shift + A`，或**双击页面底部版权文字** `© 2026 Gavin's Blog`。

> 未配置任何云端服务时，后台也会以「本机模式」正常运行；按下面两步配置完后，即可解锁 **全网真实访客记录** 与 **浏览器直接发布碎碎念/近况到 GitHub**！

---

## 一、2 分钟开通「全网真实访客统计」（Cloudflare Workers 免费版）

> 免费额度每天 100,000 次请求，无需绑卡，自带访客国家/城市地理信息。

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/) → 左侧进入 **Storage & Databases → Workers KV** → 点击 **Create**，名称填 `BLOG_ANALYTICS`。
2. 左侧进入 **Compute (Workers) → Workers & Pages** → 点击 **Create** → 选择 **Hello World** 模板 → 命名（例如 `blog-analytics`）→ 点击 **Deploy**。
3. 点击右上角 **Edit code**，将本仓库 [`worker/analytics-worker.js`](./worker/analytics-worker.js) 的全部代码完整覆盖粘贴进去，点击右上角 **Deploy**。
4. 回到 Worker 详情页 → **Settings**：
   - **Bindings → Add binding → KV namespace**：
     - Variable name 填：`ANALYTICS_KV`
     - KV namespace 选：`BLOG_ANALYTICS`
   - **Variables and Secrets → Add**：
     - Type 选 **Secret**，Variable name 填：`ADMIN_TOKEN`，Value 填你自己设定的管理员密码（例如 `gavin_2026_xxxx`）
     - （可选）再加一条文本变量 `ALLOWED_ORIGIN` = `https://blog.gavinli.top`
5. 复制你的 Worker 网址（例如 `https://blog-analytics.你的账号.workers.dev`）：
   - **要让所有访客都上报统计**：把该地址填入 `src/data/siteConfig.js` 中的 `analyticsEndpoint` 字段并推送到 GitHub；
   - **在管理员后台查看数据**：打开 `https://blog.gavinli.top/#/admin` → **后台配置**，填入同一个 Worker 地址和你刚设置的 `ADMIN_TOKEN`（密码仅保存在你自己的浏览器本地，不会写进代码仓库）。

---

## 二、开通「浏览器一键发布碎碎念 & 此刻在做」（GitHub Token）

想在手机或浏览器里直接发碎碎念、修改「此刻在做」而不用开 IDE 写代码，只需创建一个仅限本仓库的细粒度 Token：

1. 打开 [GitHub Fine-grained Personal Access Tokens](https://github.com/settings/personal-access-tokens/new)。
2. **Token name** 填 `GavinsBlog-Admin`，**Repository access** 选 **Only select repositories** → 只勾选 `Gaviniar/Gaviniar.github.io`。
3. **Permissions → Repository permissions** 中仅将 **Contents** 设为 **Read and write**，其余保持 No access，点击生成并复制 Token。
4. 打开 `https://blog.gavinli.top/#/admin` → **后台配置**，粘贴该 Token 保存（仅存于你当前浏览器的 `localStorage`，安全不泄露）。
5. 之后在后台「快捷发布台」发一条碎碎念或修改「此刻在做」，点击**一键推送到 GitHub**，约 30 秒后博客会自动重新构建上线！
