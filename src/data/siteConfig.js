/**
 * 个人博客站点配置
 * 可在 #/admin 管理员后台直接编辑并一键推送至 GitHub 自动部署。
 */

export const SITE_CONFIG = {
  brandName: "Gavin's Blog",
  owner: 'Gavin',
  bio: '小舟从此逝，江海寄余生',
  coords: 'UTC+8 · BEIJING // PERSONAL BLOG',
  established: '2026',
  // Cloudflare Worker 全网访客统计接口（公开上报端点，管理密码仅存于浏览器本地）
  analyticsEndpoint: 'https://blog-analytics.traplijun.workers.dev',
  links: [],
  nowList: []
};

/**
 * 碎碎念 / 庄园短记时间轴
 */
export const MICRO_NOTES = [];
