/**
 * Reusable Frontend Reader Interaction Widgets:
 * - Article Like ("有帮助 / 喜欢") Bar
 * - Article Comments & Site Guestbook Widget
 */

import {
  fetchPostLikes,
  togglePostLike,
  fetchPublicComments,
  submitPublicComment
} from './analytics.js';
import { escapeHtml } from './markdown.js';

const AUTHOR_CACHE_KEY = 'gavins_blog_comment_author_v1';

function getSavedAuthor() {
  try {
    return JSON.parse(localStorage.getItem(AUTHOR_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function mountLikeWidget(containerEl, slug) {
  if (!containerEl) return;
  containerEl.innerHTML = `
    <div class="like-widget-bar">
      <div class="like-widget-copy">
        <span class="swiss-kicker">READER FEEDBACK // 读者反馈</span>
        <p class="like-widget-desc">如果这篇文章对你有帮助，欢迎点个赞或在下方的评论区交流。</p>
      </div>
      <button type="button" class="like-action-btn" id="btn-article-like">
        <span class="like-icon">♥</span>
        <span id="like-btn-label">觉得有帮助</span>
        <span class="like-count-pill" id="like-count-num">--</span>
      </button>
    </div>
  `;

  const btn = containerEl.querySelector('#btn-article-like');
  const label = containerEl.querySelector('#like-btn-label');
  const num = containerEl.querySelector('#like-count-num');

  const syncUi = (count, liked) => {
    num.textContent = String(count ?? 0);
    btn.classList.toggle('is-liked', Boolean(liked));
    label.textContent = liked ? '已点赞感谢' : '觉得有帮助';
  };

  fetchPostLikes(slug).then((data) => {
    syncUi(data.count || 0, data.liked);
  });

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const data = await togglePostLike(slug);
      syncUi(data.count, data.liked);
    } catch {
      label.textContent = '稍后再试';
    } finally {
      btn.disabled = false;
    }
  });
}

export function mountCommentsWidget(containerEl, { target, title = '评论交流', subtitle = '欢迎留下你的想法、问题或补充建议。', kicker = 'COMMENTS // 讨论区' }) {
  if (!containerEl) return;
  const saved = getSavedAuthor();

  containerEl.innerHTML = `
    <section class="comments-section" id="comments-section">
      <div class="comments-head">
        <div>
          <span class="swiss-kicker">${escapeHtml(kicker)}</span>
          <h2 class="sec-title" style="margin-top: 6px; font-size: var(--fs-xl);">${escapeHtml(title)}</h2>
          <p class="sec-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <span class="swiss-mono" id="comments-count-badge" style="font-size: var(--fs-xs); color: var(--ink-mute);">加载中…</span>
      </div>

      <form class="comment-form" id="public-comment-form">
        <input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <div class="comment-form-row">
          <label class="admin-field">
            <span>昵称 *</span>
            <input type="text" id="cmt-author" class="swiss-search" maxlength="40" required placeholder="怎么称呼你？" value="${escapeHtml(saved.author || '')}" />
          </label>
          <label class="admin-field">
            <span>邮箱（可选，不会公开显示）</span>
            <input type="email" id="cmt-email" class="swiss-search" maxlength="80" placeholder="用于站长联系或回复" value="${escapeHtml(saved.email || '')}" />
          </label>
        </div>
        <label class="admin-field">
          <span>留言内容 *</span>
          <textarea id="cmt-content" rows="3" class="admin-textarea" maxlength="1200" required placeholder="友善交流，支持纯文本换行…"></textarea>
        </label>
        <div id="cmt-feedback"></div>
        <div class="comment-form-foot">
          <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">无须登录 · 隐私保护</span>
          <button type="submit" class="featured-cta" id="cmt-submit-btn" style="border: none; cursor: pointer; padding: 9px 20px;">发表留言 →</button>
        </div>
      </form>

      <div class="comments-list" id="public-comments-list">
        <p class="empty-state" style="padding: 18px 0;">正在加载留言…</p>
      </div>
    </section>
  `;

  const listEl = containerEl.querySelector('#public-comments-list');
  const countEl = containerEl.querySelector('#comments-count-badge');
  const formEl = containerEl.querySelector('#public-comment-form');
  const fbEl = containerEl.querySelector('#cmt-feedback');
  const submitBtn = containerEl.querySelector('#cmt-submit-btn');

  const renderList = (items) => {
    countEl.textContent = `${items.length} 条留言`;
    if (!items.length) {
      listEl.innerHTML = '<p class="empty-state" style="padding: 20px 0;">还没有留言，来抢沙发吧。</p>';
      return;
    }
    listEl.innerHTML = items
      .map(
        (c) => `
      <article class="comment-item ${c.isOwner ? 'is-owner' : ''}">
        <div class="comment-meta">
          <div class="comment-author-wrap">
            <strong class="comment-author">${escapeHtml(c.author)}</strong>
            ${c.isOwner ? '<span class="swiss-tag swiss-tag-accent">站长</span>' : ''}
            ${c.region && !c.isOwner ? `<span class="comment-region">${escapeHtml(c.region)}</span>` : ''}
          </div>
          <span class="swiss-mono comment-time">${escapeHtml(c.ts || '')}</span>
        </div>
        <div class="comment-body">${escapeHtml(c.content).replace(/\n/g, '<br />')}</div>
        ${
          c.ownerReply
            ? `<div class="comment-owner-reply">
                <div class="comment-reply-head">
                  <span class="swiss-tag swiss-tag-tech">站长回复</span>
                  <span class="swiss-mono" style="font-size: var(--fs-xs); color: var(--ink-mute);">${escapeHtml(c.ownerReplyTs || '')}</span>
                </div>
                <div class="comment-body">${escapeHtml(c.ownerReply).replace(/\n/g, '<br />')}</div>
              </div>`
            : ''
        }
      </article>
    `
      )
      .join('');
  };

  const loadComments = async () => {
    const items = await fetchPublicComments(target);
    renderList(items);
  };
  loadComments();

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const author = containerEl.querySelector('#cmt-author').value.trim();
    const email = containerEl.querySelector('#cmt-email').value.trim();
    const content = containerEl.querySelector('#cmt-content').value.trim();
    const website = formEl.querySelector('input[name="website"]').value;
    if (!author || !content) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '提交中…';
    fbEl.innerHTML = '';

    try {
      localStorage.setItem(AUTHOR_CACHE_KEY, JSON.stringify({ author, email }));
      const res = await submitPublicComment({ target, author, email, content, website });
      containerEl.querySelector('#cmt-content').value = '';
      if (res.pending) {
        fbEl.innerHTML = '<div class="swiss-callout is-tech" style="margin: 0;">留言已提交，待站长审核通过后显示！</div>';
      } else {
        fbEl.innerHTML = '<div class="swiss-callout is-tech" style="margin: 0;">留言发布成功！</div>';
        await loadComments();
      }
    } catch (err) {
      fbEl.innerHTML = `<div class="swiss-callout is-warn" style="margin: 0;">${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '发表留言 →';
    }
  });
}
