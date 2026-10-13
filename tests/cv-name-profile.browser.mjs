// Run against a production preview with the browser environment documented in README.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8796';
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
try {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/cv', '/cv-fi']) {
      await page.goto(base + route);
      for (const width of [1440, 700, 699, 390, 320, 240, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        for (const fontSize of [16, 32]) {
          await page.evaluate(size => document.documentElement.style.fontSize = `${size}px`, fontSize);
          if (javaScriptEnabled) await settled(page);
          const name = await page.locator('.hero-copy h1').evaluate(heading => {
            const box = heading.getBoundingClientRect();
            return [...heading.children].map(word => {
              const range = document.createRange();
              range.selectNodeContents(word);
              const lines = [...range.getClientRects()];
              return { text: word.textContent, lines: lines.length,
                fits: lines.every(line => line.left >= box.left - 1 && line.right <= box.right + 1) };
            });
          });
          assert.deepEqual(name.map(word => word.text), ['Aleksanteri', 'Rongonen']);
          assert(name.every(word => word.lines === 1 && word.fits), JSON.stringify({ route, javaScriptEnabled, width, fontSize, name }));
        }
      }
      await page.evaluate(() => document.documentElement.style.fontSize = '16px');
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const gap of [8, 12, 0]) {
        await page.locator('.cv-profile').evaluate((section, gap) => section.style.setProperty('--cv-profile-column-gap', `${gap}%`), gap);
        const columns = await page.locator('.cv-intro-split').evaluate(box => {
          const [left, right] = [...box.children].map(child => child.getBoundingClientRect());
          const style = getComputedStyle(box);
          return { left: left.width, right: right.width, gap: right.left - left.right,
            inner: box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            center: (left.right + right.left) / 2, boxCenter: box.getBoundingClientRect().left + box.getBoundingClientRect().width / 2 };
        });
        assert(Math.abs(columns.left - columns.right) < 1, 'Equal profile columns');
        assert(Math.abs(columns.center - columns.boxCenter) < 1, 'Gap centered in profile box');
        assert(Math.abs(columns.gap - columns.inner * gap / 100) < 1, 'Relative configurable gap');
      }
      assert.equal(await page.locator('.cv-bullets li').first().evaluate(item => getComputedStyle(item, '::marker').color), 'rgb(255, 242, 168)');
      await page.locator('.cv-profile').evaluate(section => section.style.setProperty('--cv-checkmark-color', '#aabbcc'));
      assert.equal(await page.locator('.cv-bullets li').first().evaluate(item => getComputedStyle(item, '::marker').color), 'rgb(170, 187, 204)');
      console.log(`${route}, JS=${javaScriptEnabled}: unbroken fitted names, equal columns, relative gap and marker color passed`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); }
