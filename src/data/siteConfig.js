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
  // 全网访客统计接口（通过 stat.blog.gavinli.top 免费 Vercel Edge 中转至 Cloudflare Worker，国内直连可用）
  analyticsEndpoint: 'https://stat.blog.gavinli.top',
  links: [],
  nowList: []
};

/**
 * 碎碎念 / 庄园短记时间轴
 */
export const MICRO_NOTES = [];
