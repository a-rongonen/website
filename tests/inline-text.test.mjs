// Run with Node 24: node --test tests/inline-text.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInlineText } from '../src/data/inline-text.ts';

const text = value => ({ type: 'text', value });
const strong = (...children) => ({ type: 'strong', children });
const em = (...children) => ({ type: 'em', children });
const link = (href, ...children) => ({ type: 'link', href, children });

test('plain copy and punctuation stay unchanged', () => {
  const copy = 'Let’s address the elephant in the room.\n\nMarkkinointi, luovuus, tekoäly & oppiminen — 100%.';
  assert.deepEqual(parseInlineText(copy), [text(copy)]);
  assert.deepEqual(parseInlineText(''), []);
  assert.deepEqual(parseInlineText('“**Bold**”, (*italic*)!'), [
    text('“'), strong(text('Bold')), text('”, ('), em(text('italic')), text(')!'),
  ]);
});

test('bold, italic and combined emphasis can nest in either direction', () => {
  assert.deepEqual(parseInlineText('**Bold *and italic***'), [strong(text('Bold '), em(text('and italic')))]);
  assert.deepEqual(parseInlineText('*Italic **and bold***'), [em(text('Italic '), strong(text('and bold')))]);
  assert.deepEqual(parseInlineText('***Both***, **bold**, *italic*.'), [
    strong(em(text('Both'))), text(', '), strong(text('bold')), text(', '), em(text('italic')), text('.'),
  ]);
});

test('links preserve parenthesized URLs and support emphasized labels', () => {
  const href = 'https://example.com/case_(one)?view=detail&lang=en#media';
  assert.deepEqual(parseInlineText(`[**Bold** and *italic*](${href}).`), [
    link(href, strong(text('Bold')), text(' and '), em(text('italic'))), text('.'),
  ]);
  assert.deepEqual(parseInlineText('**[Read more](/portfolio)**'), [strong(link('/portfolio', text('Read more')))]);
  for (const url of ['/portfolio', '../project', '#case-1', 'http://example.com', 'mailto:person@example.com', 'tel:+358123']) {
    assert.deepEqual(parseInlineText(`[Read](${url})`), [link(url, text('Read'))], url);
  }
});

test('backslash escapes keep literal syntax and work inside emphasis', () => {
  assert.deepEqual(parseInlineText(String.raw`\*literal\* and \[label\](https://example.com)`), [
    text('*literal* and [label](https://example.com)'),
  ]);
  assert.deepEqual(parseInlineText(String.raw`*a \* b*`), [em(text('a * b'))]);
  assert.deepEqual(parseInlineText(String.raw`A \\ B \q`), [text(String.raw`A \ B \q`)]);
});

test('unsafe URL schemes, controls and raw HTML remain inert text', () => {
  for (const href of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,test', 'vbscript:msgbox(1)',
    'file:///private.txt', 'java\tscript:alert(1)', 'https://example.com/\u0000bad', 'https://example.com/has space',
  ]) {
    const source = `[Unsafe](${href})`;
    assert.deepEqual(parseInlineText(source), [text(source)], JSON.stringify(href));
  }
  const html = '<script>alert(1)</script><img src=x onerror="alert(1)">&lt;b&gt;';
  assert.deepEqual(parseInlineText(html), [text(html)]);
  assert.deepEqual(parseInlineText(`[${html}](/portfolio)`), [link('/portfolio', text(html))]);
});

test('incomplete or whitespace-delimited markup falls back to plain copy', () => {
  for (const source of ['**unfinished', '*unfinished', '***', '** bold **', '* italic *', '[Label]', '[Label](', '[Label](https://example.com', '[Label]()']) {
    assert.deepEqual(parseInlineText(source), [text(source)], source);
  }
});
