// Optional rendered-ink regression; uses the same external Playwright setup as the mesh suite.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, channel: process.env.BROWSER_CHANNEL || undefined});
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8793';
const pixelReader = await browser.newPage();
// Change paint only: text shaping, wrapping, line boxes, margins and card geometry stay real.
// White borders make the last painted card edge measurable independently of its DOM box.
const contrastPaint = `
  .cv-page, .cv-network-section { background: #000 !important; }
  .cv-network-section::before, .cv-network-section::after, cv-network { display: none !important; }
  .glass { background: #000 !important; border-color: #fff !important; box-shadow: none !important; backdrop-filter: none !important; }
  .glass * { color: #fff !important; }
`;
let paintId = 0;
async function addPaint(page, content) {
  const id = 'cv-test-paint-' + ++paintId;
  // addStyleTag waits for a style load callback that is disabled in a no-JS context.
  await page.evaluate(({id, content}) => { const style = document.createElement('style'); style.id = id; style.textContent = content; document.head.append(style); }, {id, content});
  return page.locator('#' + id);
}
async function paintedEdges(page) {
  const boxes = await page.locator('.cv-section').evaluateAll(sections => sections.map(section => {
    const rect = section.getBoundingClientRect(), style = getComputedStyle(section);
    return {section: section.dataset.networkSection, top: rect.top + scrollY, bottom: rect.bottom + scrollY,
      expected: parseFloat(style.paddingTop), expectedEnd: parseFloat(style.paddingBottom)};
  }));
  const screenshot = await page.screenshot({fullPage: true});
  return pixelReader.evaluate(async ({source, boxes}) => {
    const image = new Image(); image.src = source; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return boxes.map(box => {
      let first = Infinity, last = -Infinity;
      for (let y = Math.max(0, Math.floor(box.top)); y < Math.min(canvas.height, Math.ceil(box.bottom)); y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (pixels[i] > 140 && pixels[i + 1] > 140 && pixels[i + 2] > 140) {
            first = Math.min(first, y); last = y; break;
          }
        }
      }
      return {...box, inkStart: first - box.top, inkEnd: box.bottom - (last + 1)};
    });
  }, {source: 'data:image/png;base64,' + screenshot.toString('base64'), boxes});
}
async function verify(page, label, optical = true) {
  if (optical) await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const gradient = await paintedEdges(page);
  const solidPaint = await addPaint(page, '.cv-page h2 { color: #fff !important; background: none !important; }');
  const solid = await paintedEdges(page);
  await solidPaint.evaluate(element => element.remove());
  for (const [index, value] of solid.entries()) {
    // Compare real gradient glyphs to solid glyphs, so clipped Finnish accents cannot pass.
    assert(Math.abs(gradient[index].inkStart - value.inkStart) <= 1, label + ' clipped heading ink: ' + JSON.stringify({gradient: gradient[index], solid: value}));
    if (optical) assert(Math.abs(value.inkStart - value.expected) <= 2, label + ' heading ink distance: ' + JSON.stringify(value));
    assert(Math.abs(value.inkEnd - value.expectedEnd) <= 2, label + ' card border distance: ' + JSON.stringify(value));
    if (optical) assert(Math.abs(value.inkStart - value.inkEnd) <= 2, label + ' unequal painted edges: ' + JSON.stringify(value));
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log(label + ': ' + JSON.stringify(solid.map(({section, inkStart, inkEnd}) => ({section, inkStart, inkEnd}))));
}
try {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({javaScriptEnabled, viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/cv', '/cv-fi']) {
      await page.goto(base + route); if (javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      await addPaint(page, contrastPaint);
      for (const width of javaScriptEnabled ? [1440, 390, 325] : [390]) {
        await page.setViewportSize({width, height: 1000});
        await verify(page, route + ' JS=' + javaScriptEnabled + ' width=' + width, javaScriptEnabled);
      }
      if (javaScriptEnabled) {
        await page.locator('.cv-strengths .cv-card p').first().evaluate(element => element.textContent = element.textContent.repeat(3));
        for (const distance of [48, 112]) {
          await page.locator('.cv-section').evaluateAll((sections, distance) => sections.forEach(section => section.style.setProperty('--cv-section-edge-distance', distance + 'px')), distance);
          for (const width of [390, 1440]) {
            await page.setViewportSize({width, height: 1000});
            await verify(page, route + ' uneven cards width=' + width + ' distance=' + distance);
          }
        }
      }
    }
    assert.deepEqual(errors, []); await context.close();
  }
  // Rewrite only the response under test before page scripts attach their observers.
  // The plain-text fixture exercises a lowercase first edge and a descending last edge.
  const fixtureContext = await browser.newContext({viewport: {width: 390, height: 1000}, deviceScaleFactor: 1});
  const fixture = await fixtureContext.newPage();
  await fixture.route(base + '/cv', async route => {
    const response = await route.fetch(), html = await response.text();
    const replacement = '<div class="cv-container"><p>some uneven cases, no uppercase</p><p>A final paragraph ending with descenders: gyp</p></div></section>';
    const body = html.replace(/(<section[^>]*data-network-section="profile"[^>]*>)[\s\S]*?<\/section>/, '$1' + replacement);
    assert.notEqual(body, html, 'Paragraph fixture must replace the profile section');
    await route.fulfill({response, body});
  });
  await fixture.goto(base + '/cv');
  await fixture.evaluate(() => document.fonts.ready);
  await addPaint(fixture, contrastPaint);
  for (const width of [390, 1440]) {
    await fixture.setViewportSize({width, height: 1000});
    await verify(fixture, 'Plain paragraphs at both edges width=' + width);
  }
  await fixtureContext.close();
  console.log('Visible heading ink, Finnish accents, card borders, paragraph edges, responsive wrapping and shared custom distance PASS');
} finally { await browser.close(); }
