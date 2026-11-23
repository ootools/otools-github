/**
 * GitHub 渲染 HTML 的白名单清洗器。
 *
 * 纯 TypeScript、零依赖、无 DOM：可在浏览器与 Node 单测里跑同一份逻辑。
 * 去掉 script/style/iframe 等危险块、全部事件属性与 javascript:/data: 链接，
 * 只保留 README / issue 正文需要的一小组标签。
 */

const DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea',
  'select', 'option', 'link', 'meta', 'base', 'svg', 'math', 'video', 'audio', 'canvas',
  'noscript', 'template', 'applet', 'frame', 'frameset', 'portal',
]);

const ALLOWED_TAGS = new Set([
  'a', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'blockquote',
  'ul', 'ol', 'li', 'img', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'div', 'span', 'kbd',
]);

const VOID_TAGS = new Set(['br', 'hr', 'img']);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', colon: ':', sol: '/',
  tab: '\t', newline: '\n', num: '#', exclam: '!',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function safeUrl(raw: string, baseUrl: string): string {
  const decoded = decodeEntities(raw).trim();
  if (!decoded) return '';
  const compact = decoded.replace(/[\u0000-\u0020\u007f]/g, '').toLowerCase();
  if (/^(javascript|vbscript|file):/.test(compact)) return '';
  if (/^data:/.test(compact)) return '';
  if (decoded.startsWith('//')) return `https:${decoded}`;
  if (/^https?:\/\//i.test(decoded)) return decoded;
  try {
    return new URL(decoded, baseUrl).href;
  } catch {
    return '';
  }
}

function safeImageUrl(raw: string, baseUrl: string): string {
  const decoded = decodeEntities(raw).trim();
  if (!decoded) return '';
  const compact = decoded.replace(/[\u0000-\u0020\u007f]/g, '').toLowerCase();
  // 只允许常见位图 data URL；svg data URL 可能带脚本，一律拒绝。
  if (/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(compact)) return decoded;
  if (/^data:/.test(compact)) return '';
  return safeUrl(decoded, baseUrl);
}

interface AttrResult {
  text: string;
}

function cleanAttributes(tag: string, raw: string, baseUrl: string): AttrResult {
  if (tag !== 'a' && tag !== 'img') return { text: '' };
  const keep = tag === 'a' ? new Set(['href', 'title']) : new Set(['src', 'alt', 'title']);
  const parts: string[] = [];
  const attrRegex = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(raw)) !== null) {
    const name = match[1]?.toLowerCase() ?? '';
    if (!keep.has(name)) continue;
    const value = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
    if (tag === 'img' && name === 'src') {
      const safe = safeImageUrl(value, baseUrl);
      if (!safe) return { text: '\u0000DROP_ELEMENT' };
      parts.push(`src="${escapeAttr(safe)}"`);
    } else if (tag === 'a' && name === 'href') {
      const safe = safeUrl(value, baseUrl);
      if (!safe) continue;
      parts.push(`href="${escapeAttr(safe)}"`);
    } else {
      parts.push(`${name}="${escapeAttr(value)}"`);
    }
  }
  if (tag === 'a') parts.push('rel="noopener noreferrer"');
  if (tag === 'img') parts.push('loading="lazy"', 'referrerpolicy="no-referrer"');
  return { text: parts.length ? ` ${parts.join(' ')}` : '' };
}

/** 清洗 HTML；baseUrl 用于解析 README 里的相对链接。 */
export function sanitizeHtml(raw: string | undefined | null, baseUrl = 'https://github.com/'): string {
  const html = String(raw ?? '');
  if (!html) return '';

  const out: string[] = [];
  const stack: Array<{ tag: string; emit: boolean; silent: boolean }> = [];
  const suppressing = (): boolean => stack.length > 0 && !stack[stack.length - 1]!.emit;
  const tokenRegex = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(!|--)[^>]*>|<\/?([a-zA-Z][\w-]*)\b([^>]*)>/g;

  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(html)) !== null) {
    const text = html.slice(cursor, match.index);
    if (text && !suppressing()) out.push(text);
    cursor = match.index + match[0].length;

    const whole = match[0];
    if (whole.startsWith('<!--') || whole.startsWith('<![') || whole.startsWith('<?') || whole.startsWith('<!')) {
      continue;
    }

    const closing = whole.startsWith('</');
    const tag = String(match[2] ?? '').toLowerCase();
    if (!tag) continue;

    if (closing) {
      let index = stack.length - 1;
      while (index >= 0 && stack[index]!.tag !== tag) index -= 1;
      if (index >= 0) {
        while (stack.length > index) {
          const item = stack.pop()!;
          if (item.emit && !item.silent) out.push(`</${item.tag}>`);
        }
      }
      continue;
    }

    const attrs = match[3] ?? '';
    const selfClosing = /\/\s*>$/.test(whole);
    if (DROP_TAGS.has(tag)) {
      if (!VOID_TAGS.has(tag) && !selfClosing) stack.push({ tag, emit: false, silent: true });
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // 未知标签解包：保留其中的文本与子标签，只是不输出标签本身。
      if (!VOID_TAGS.has(tag) && !selfClosing) stack.push({ tag, emit: true, silent: true });
      continue;
    }

    const cleaned = cleanAttributes(tag, attrs, baseUrl);
    if (cleaned.text === '\u0000DROP_ELEMENT') {
      if (!VOID_TAGS.has(tag) && !selfClosing) stack.push({ tag, emit: false, silent: true });
      continue;
    }

    out.push(`<${tag}${cleaned.text}>`);
    if (!VOID_TAGS.has(tag) && !selfClosing) stack.push({ tag, emit: true, silent: false });
  }

  const tail = html.slice(cursor);
  if (tail && !suppressing()) out.push(tail);

  // 关闭所有未闭合的保留标签（GitHub 的 HTML 一般完整，这里兜底）。
  while (stack.length) {
    const item = stack.pop()!;
    if (item.emit && !item.silent) out.push(`</${item.tag}>`);
  }

  return out.join('');
}
