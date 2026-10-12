// Run against a production preview with the browser environment documented in README.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8797';

async function geometry(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const { x, y, width, height, right, bottom } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    const image = document.querySelector('.cv-portrait img');
    const box = rect('.cv-portrait img');
    const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
    return { hero: rect('.cv-hero'), copy: rect('.hero-copy'), cell: rect('.cv-portrait'), box,
      painted: { width: image.naturalWidth * scale, height: image.naturalHeight * scale },
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
}
function safe(g) {
  const { copy, cell, box, hero } = g;
  assert(!g.overflow, 'No horizontal overflow');
  assert(copy.right <= cell.x + 1 || copy.bottom <= cell.y + 1, 'Separate title and image cells');
  assert(box.x >= cell.x - 1 && box.right <= cell.right + 1 && box.y >= cell.y - 1 && box.bottom <= cell.bottom + 1,
    `Image box stays inside its cell: ${JSON.stringify(g)}`);
  assert(box.bottom <= hero.bottom + 1 && box.y >= hero.y - 1, 'Image stays inside hero');
}
async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
try {
  for (const route of ['/cv', '/cv-fi']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Desktop must use free viewport space, not cap the portrait at ~50%
    // inside the former fixed 960px / 1.5fr + 1fr content grid.
    for (const [width, height, minimumRatio] of [[1440, 1000, 0.9], [1920, 1080, 0.999]]) {
      await page.setViewportSize({ width, height });
      await page.goto(base + route);
      await page.locator('.cv-portrait img').evaluate(image => image.decode());
      await page.locator('.cv-hero').evaluate(hero => hero.style.setProperty('--cv-hero-desktop-foreground-height', '1'));
      await settled(page);
      const g = await geometry(page);
      safe(g);
      assert(g.painted.height / g.hero.height >= minimumRatio, `Use available desktop space: ${JSON.stringify(g)}`);
    }
    for (const [width, height] of [[1440, 1000], [1440, 700], [700, 700], [699, 700], [390, 844], [325, 568], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.goto(base + route);
      await page.locator('.cv-portrait img').evaluate(image => image.decode());
      await settled(page);
      safe(await geometry(page));
      for (const ratio of [0, 0.25, 0.9, 5, -1]) {
        for (const position of ['-500%', '50%', '500%']) {
          await page.locator('.cv-hero').evaluate((hero, { ratio, position }) => {
            for (const mode of ['desktop', 'mobile']) {
              hero.style.setProperty(`--cv-hero-${mode}-foreground-height`, ratio);
              hero.style.setProperty(`--cv-hero-${mode}-foreground-position-x`, position);
              hero.style.setProperty(`--cv-hero-${mode}-foreground-position-y`, position);
            }
          }, { ratio, position });
          const g = await geometry(page);
          safe(g);
          assert(g.painted.height <= g.hero.height * Math.max(0, Math.min(1, ratio)) + 1);
          if (ratio === 0.25) assert(Math.abs(g.painted.height / g.hero.height - 0.25) < 0.002, 'Requested ratio when space permits');
        }
      }
    }
    // Low/high source resolutions with identical proportions must render identically.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + route);
    const dimensions = [];
    for (const factor of [0.2, 1, 4]) {
      await page.locator('.cv-portrait img').evaluate(async (image, factor) => {
        image.src = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${725 * factor}" height="${1000 * factor}"><rect width="100%" height="100%" fill="red"/></svg>`);
        image.width = 725 * factor;
        image.height = 1000 * factor;
        await image.decode();
      }, factor);
      await settled(page);
      const g = await geometry(page);
      safe(g);
      dimensions.push(g.painted);
    }
    for (const d of dimensions) assert(Math.abs(d.height - dimensions[0].height) < 0.1 && Math.abs(d.width - dimensions[0].width) < 0.1);
    // Text-driven section growth: the target follows actual height, not minHeight.
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto(base + route);
    await page.addStyleTag({ content: '.hero-copy h1 { font-size: 6rem; } .hero-copy { padding-block: 10rem; } .hero-inner { --hero-min-height: 200px; }' });
    await page.locator('.cv-hero').evaluate(hero => hero.style.setProperty('--cv-hero-mobile-foreground-height', '.1'));
    await settled(page);
    const enlarged = await geometry(page);
    safe(enlarged);
    assert(enlarged.hero.height > 500);
    assert(Math.abs(enlarged.painted.height / enlarged.hero.height - 0.1) < 0.002, JSON.stringify(enlarged));
    assert.deepEqual(errors, []);
    await page.close();

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await noJs.newPage();
    await staticPage.goto(base + route);
    safe(await geometry(staticPage));
    await noJs.close();
    console.log(`${route}: responsive sizing, safe controls, source resolution, enlarged text, and no-JS passed`);
  }
} finally { await browser.close(); }
