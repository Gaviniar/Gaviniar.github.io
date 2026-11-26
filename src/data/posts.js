/**
 * 个人博客文章库（全站统一 Markdown 驱动）
 * - 所有文章均保存在 src/data/articles.json，可在 #/admin 论坛式可视化编辑器中随时新建、编辑、置顶、隐藏或删除
 * - 自动提取章节目录（TOC）、字数与预计阅读时间
 */

import rawMdArticles from './articles.json';
import { SITE_CONFIG } from './siteConfig.js';
import {
  parseMarkdown,
  renderMarkdownArticleShell,
  estimateWordCount,
  estimateReadTime
} from '../engine/markdown.js';

export const CATEGORIES = ['全部', '技术攻略', '设计手记', '随笔思考', '工具箱'];

function hydrateMdArticle(item, idx) {
  const parsed = parseMarkdown(item.markdown || '');
  const toc = [
    { id: 'sec-overview', num: '00', label: '文章导览' },
    ...parsed.toc
  ];
  const postObj = {
    slug: item.slug,
    source: 'markdown',
    status: item.status || 'published',
    index: String(idx).padStart(2, '0'),
    pinned: Boolean(item.pinned),
    category: item.category || '随笔思考',
    categoryEn: 'ARTICLE // MD',
    date: item.date || '2026.01.01',
    readTime: item.readTime || estimateReadTime(item.markdown || ''),
    wordCount: estimateWordCount(item.markdown || ''),
    title: item.title || '未命名文章',
    shortTitle: item.shortTitle || item.title || '未命名文章',
    excerpt: item.excerpt || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    markdown: item.markdown || '',
    toc,
    renderContent: () => renderMarkdownArticleShell(postObj)
  };
  return postObj;
}

const overrides = SITE_CONFIG.postOverrides || {};

export const ALL_POSTS = (Array.isArray(rawMdArticles) ? rawMdArticles : [])
  .map((item, i) => hydrateMdArticle(item, i + 1))
  .map((p) => {
    const ov = overrides[p.slug];
    if (!ov) return p;
    return {
      ...p,
      pinned: typeof ov.pinned === 'boolean' ? ov.pinned : p.pinned,
      status: ov.status || p.status
    };
  })
  .sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return String(b.date || '').localeCompare(String(a.date || ''));
  })
  .map((p, i, arr) => ({ ...p, index: String(arr.length - i).padStart(2, '0') }));

export const POSTS = ALL_POSTS.filter((p) => p.status === 'published');

export function getRawMarkdownArticles() {
  return Array.isArray(rawMdArticles) ? JSON.parse(JSON.stringify(rawMdArticles)) : [];
}

export function getPostBySlug(slug) {
  return ALL_POSTS.find((p) => p.slug === slug) || POSTS[0] || ALL_POSTS[0];
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
