/** Small inline-only syntax for authored copy; HTML always remains plain text. */
export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: InlineNode[] }
  | { type: 'em'; children: InlineNode[] }
  | { type: 'link'; href: string; children: InlineNode[] };

function safeHref(href: string) {
  if (!href || /[\s\\\u0000-\u001f\u007f]/u.test(href)) return false;
  try {
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(href, 'https://rongonen.fi').protocol);
  } catch {
    return false;
  }
}

function closingStars(text: string, start: number, count: number) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '\\') { index += 1; continue; }
    if (text[index] !== '*') continue;
    const run = text.slice(index).match(/^\*+/)![0].length;
    if (index > start && !/\s/u.test(text[index - 1]) && run >= count && (count !== 1 || run % 2 === 1)) {
      // In **bold *italic*** / *italic **bold***, the inner delimiter closes first.
      return index + run - count;
    }
    index += run - 1;
  }
  return -1;
}

/** Supports **bold**, *italic*, ***both***, [label](URL), and backslash escapes. */
export function parseInlineText(text: string, allowLinks = true, depth = 0): InlineNode[] {
  if (depth >= 12) return [{ type: 'text', value: text }];
  const nodes: InlineNode[] = [];
  let plain = '';
  const flush = () => {
    if (plain) nodes.push({ type: 'text', value: plain });
    plain = '';
  };
  for (let index = 0; index < text.length;) {
    if (text[index] === '\\' && /[\\*\[\]()]/u.test(text[index + 1] || '')) {
      plain += text[index + 1];
      index += 2;
      continue;
    }
    if (allowLinks && text[index] === '[') {
      let labelEnd = index + 1;
      for (; labelEnd < text.length; labelEnd += 1) {
        if (text[labelEnd] === '\\') labelEnd += 1;
        else if (text[labelEnd] === ']') break;
      }
      if (labelEnd > index + 1 && text[labelEnd + 1] === '(') {
        let urlEnd = labelEnd + 2;
        let parentheses = 1;
        for (; urlEnd < text.length; urlEnd += 1) {
          if (text[urlEnd] === '(') parentheses += 1;
          if (text[urlEnd] === ')' && --parentheses === 0) break;
        }
        const href = text.slice(labelEnd + 2, urlEnd);
        if (parentheses === 0 && safeHref(href)) {
          flush();
          nodes.push({ type: 'link', href, children: parseInlineText(text.slice(index + 1, labelEnd), false, depth + 1) });
          index = urlEnd + 1;
          continue;
        }
      }
    }
    if (text[index] === '*') {
      const count = Math.min(3, text.slice(index).match(/^\*+/)![0].length);
      const contentStart = index + count;
      const end = !/\s/u.test(text[contentStart] || ' ') ? closingStars(text, contentStart, count) : -1;
      if (end > contentStart) {
        flush();
        const children = parseInlineText(text.slice(contentStart, end), allowLinks, depth + 1);
        nodes.push(count === 3
          ? { type: 'strong', children: [{ type: 'em', children }] }
          : { type: count === 2 ? 'strong' : 'em', children });
        index = end + count;
        continue;
      }
    }
    plain += text[index];
    index += 1;
  }
  flush();
  return nodes;
}
