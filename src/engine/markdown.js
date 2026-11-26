/**
 * Swiss-Styled Markdown Engine (Zero Dependencies)
 * Supports: Headings (auto-TOC), Fenced Code Blocks (with copy button),
 * Callouts (> [!NOTE] / [!TIP] / [!WARN]), Tables, Lists, Task Lists,
 * Blockquotes, Images with captions, Bold/Italic/Strike/Code/Links, Horizontal Rules.
 */

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeUrl(url = '') {
  const trimmed = String(url).trim();
  if (/^(https?:|mailto:|#|\.|\/)/i.test(trimmed)) return trimmed;
  return '#';
}

function renderInline(text = '') {
  const codeSlots = [];
  let safe = escapeHtml(text);

  // Protect inline code spans first
  safe = safe.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = codeSlots.length;
    codeSlots.push(`<code>${code}</code>`);
    return `\u0000CODE${idx}\u0000`;
  });

  // Images: ![alt](src)
  safe = safe.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src, title) => {
    const cleanSrc = sanitizeUrl(src);
    const caption = title || alt;
    return `<figure class="md-figure"><img src="${cleanSrc}" alt="${alt}" loading="lazy" />${
      caption ? `<figcaption>${caption}</figcaption>` : ''
    }</figure>`;
  });

  // Links: [label](href)
  safe = safe.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const cleanHref = sanitizeUrl(href);
    const isExt = /^https?:\/\//i.test(cleanHref);
    return `<a href="${cleanHref}"${isExt ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  });

  // Bold + Italic, Bold, Italic, Strikethrough
  safe = safe.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  safe = safe.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Restore inline code
  safe = safe.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeSlots[Number(i)] || '');
  return safe;
}

export function estimateWordCount(text = '') {
  const plain = String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`[\]()!|-]/g, ' ');
  const cjk = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (plain.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
  return cjk + words;
}

export function estimateReadTime(text = '') {
  const count = estimateWordCount(text);
  const mins = Math.max(1, Math.ceil(count / 320));
  return `${mins} MIN`;
}

export function parseMarkdown(markdown = '') {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const toc = [];
  let secCounter = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Fenced code block ```lang
    const fenceMatch = line.match(/^```([\w-]*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || 'TEXT';
      const codeLines = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // consume closing ```
      const rawCode = codeLines.join('\n');
      const escapedCode = escapeHtml(rawCode);
      const copyAttr = escapeHtml(rawCode);
      html.push(`
        <div class="code-block">
          <div class="code-bar">
            <span class="code-lang">${escapeHtml(lang.toUpperCase())}</span>
            <button type="button" class="copy-btn" data-copy="${copyAttr}">复制代码</button>
          </div>
          <pre><code>${escapedCode}</code></pre>
        </div>
      `);
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      html.push('<hr class="md-hr" />');
      i += 1;
      continue;
    }

    // Headings (# / ## / ### / ####)
    const headMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headMatch) {
      const level = headMatch[1].length;
      const rawHeading = headMatch[2].trim();
      if (level <= 2) {
        secCounter += 1;
        const num = String(secCounter).padStart(2, '0');
        const id = `sec-md-${secCounter}`;
        toc.push({ id, num, label: rawHeading.replace(/[*`~]/g, '').slice(0, 26) });
        html.push(`
          <div class="sec-header md-sec-header" id="${id}">
            <div class="sec-num">${num}</div>
            <div><h2 class="sec-title">${renderInline(rawHeading)}</h2></div>
          </div>
        `);
      } else if (level === 3) {
        html.push(`<h3 class="md-h3">${renderInline(rawHeading)}</h3>`);
      } else {
        html.push(`<h4 class="md-h4">${renderInline(rawHeading)}</h4>`);
      }
      i += 1;
      continue;
    }

    // Blockquote / Swiss Callout (> [!TIP] / [!WARN] / [!NOTE])
    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      const first = quoteLines[0] || '';
      const calloutMatch = first.match(/^\[!(TIP|WARN|WARNING|NOTE|INFO)\]\s*(.*)$/i);
      if (calloutMatch) {
        const type = calloutMatch[1].toUpperCase();
        const rest = [calloutMatch[2], ...quoteLines.slice(1)].filter(Boolean);
        const cls =
          type === 'WARN' || type === 'WARNING'
            ? 'is-warn'
            : type === 'TIP'
              ? 'is-tech'
              : '';
        html.push(`<div class="swiss-callout ${cls}">${rest.map((l) => renderInline(l)).join('<br />')}</div>`);
      } else {
        html.push(`<blockquote class="md-blockquote">${quoteLines.map((l) => renderInline(l)).join('<br />')}</blockquote>`);
      }
      continue;
    }

    // Table (header | sep | rows)
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(lines[i + 1])
    ) {
      const splitRow = (row) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const headers = splitRow(line);
      i += 2; // skip header & separator
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      html.push(`
        <div class="tier-table-wrap">
          <table class="swiss-table">
            <thead><tr>${headers.map((h) => `<th>${renderInline(h)}</th>`).join('')}</tr></thead>
            <tbody>${rows
              .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`)
              .join('')}</tbody>
          </table>
        </div>
      `);
      continue;
    }

    // Unordered list (including task lists - [ ] / - [x])
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*+]\s+/, '');
        const task = text.match(/^\[( |x|X)\]\s+(.*)$/);
        if (task) {
          const checked = task[1].toLowerCase() === 'x';
          items.push(
            `<li class="md-task-item"><span class="md-check ${checked ? 'is-done' : ''}">${checked ? '✓' : ''}</span><span>${renderInline(task[2])}</span></li>`
          );
        } else {
          items.push(`<li>${renderInline(text)}</li>`);
        }
        i += 1;
      }
      html.push(`<ul class="md-list">${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      html.push(`<ol class="md-olist">${items.join('')}</ol>`);
      continue;
    }

    // Standalone image line
    if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line.trim())) {
      html.push(renderInline(line.trim()));
      i += 1;
      continue;
    }

    // Regular paragraph (consume consecutive plain lines)
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|```|>\s?|\s*[-*+]\s+|\s*\d+\.\s+|(-{3,}|\*{3,}|_{3,})\s*$)/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    html.push(`<p class="art-p">${paraLines.map((l) => renderInline(l)).join('<br />')}</p>`);
  }

  return {
    html: html.join('\n'),
    toc
  };
}

export function renderMarkdownArticleShell(post) {
  const parsed = parseMarkdown(post.markdown || '');
  return `
    <header class="art-masthead" id="sec-overview">
      <div class="art-kicker-row">
        <span class="swiss-kicker">${escapeHtml(post.category || '文章')} // NO.${escapeHtml(post.index || '01')}</span>
        <div class="art-tags">
          ${(post.tags || []).map((t) => `<span class="swiss-tag">#${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      <h1 class="art-h1">${escapeHtml(post.title || '未命名文章')}</h1>
      ${post.excerpt ? `<p class="art-lead">${escapeHtml(post.excerpt)}</p>` : ''}
    </header>
    <div class="md-article-body">
      ${parsed.html || '<p class="art-p">暂无正文内容。</p>'}
    </div>
  `;
}
