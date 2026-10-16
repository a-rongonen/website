// Optional rendered-ink regression; use the external Playwright setup documented in README.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8796';
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
});
const page = await context.newPage();
const pixelReader = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

// Change paint only. Keep the real fonts, wrapping, line boxes, padding and background-clip.
const contrastPaint = `
  .cv-page, .cv-network-section, .glass { background: #000 !important; }
  .cv-network-section::before, .cv-network-section::after, cv-network { display: none !important; }
  .glass { border-color: #000 !important; box-shadow: none !important; backdrop-filter: none !important; }
  .portfolio-case-heading h2 { --cv-heading-white-stop: 100%; --cv-heading-color-stop: 100%; }
`;
const settled = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function inkEdges(clip) {
  const screenshot = await page.screenshot({ clip });
  return pixelReader.evaluate(async source => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = Infinity, bottom = -Infinity, count = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const offset = (y * canvas.width + x) * 4;
        if (pixels[offset] > 140 && pixels[offset + 1] > 140 && pixels[offset + 2] > 140) {
          top = Math.min(top, y);
          bottom = y;
          count++;
        }
      }
    }
    return { top, bottom, count };
  }, 'data:image/png;base64,' + screenshot.toString('base64'));
}

async function comparePaint(heading) {
  await heading.scrollIntoViewIfNeeded();
  await settled();
  const box = await heading.boundingBox();
  assert(box && box.width > 0 && box.height > 0, 'The case heading is visible');
  // Include space beyond the element: a solid glyph can overflow its line box while
  // background-clipped text silently loses the same descender outside that box.
  const clip = { x: box.x, y: box.y - 8, width: box.width, height: box.height + 24 };
  const gradient = await inkEdges(clip);
  const id = await heading.getAttribute('id');
  const solidStyle = await page.addStyleTag({ content: `#${id} { color: #fff !important; background: none !important; }` });
  let solid;
  try {
    assert.deepEqual(await heading.boundingBox(), box, 'The solid reference changes paint without moving the glyphs');
    solid = await inkEdges(clip);
  } finally {
    await solidStyle.evaluate(element => element.remove());
  }
  assert(gradient.count > 0 && solid.count > 0, 'Both images contain readable heading ink');
  return { title: await heading.textContent(), gradient, solid };
}

function assertUnclipped(result, label) {
  assert(Math.abs(result.gradient.top - result.solid.top) <= 1,
    `${label}: gradient preserves the top of the glyphs: ${JSON.stringify(result)}`);
  assert(Math.abs(result.gradient.bottom - result.solid.bottom) <= 1,
    `${label}: gradient preserves the descenders: ${JSON.stringify(result)}`);
}

try {
  await page.goto(base + '/portfolio');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: contrastPaint });
  const headings = page.locator('.portfolio-case-heading h2');
  assert.equal(await headings.count(), 3, 'All three case headings are tested');

  for (const width of [390, 1440]) {
    for (const fontSize of [16, 32]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(size => document.documentElement.style.fontSize = `${size}px`, fontSize);
      await settled();
      for (const heading of await headings.all()) {
        const result = await comparePaint(heading);
        assertUnclipped(result, `${width}px viewport, ${fontSize}px root, ${result.title}`);
      }
    }
  }

  // Prove this detects clipped ink with the current font, not just CSS values.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => document.documentElement.style.fontSize = '16px');
  const firstHeading = headings.first();
  assert.equal(await firstHeading.textContent(), 'Shattering Platforms');
  const clippedStyle = await page.addStyleTag({
    content: '.portfolio-page .portfolio-unique .portfolio-case-heading h2 { line-height: .75 !important; padding-block: 0 !important; }',
  });
  let clipped;
  try {
    clipped = await comparePaint(firstHeading);
    assert(clipped.solid.bottom - clipped.gradient.bottom > 1,
      'The deliberately tight line box must reproduce missing descender pixels: ' + JSON.stringify(clipped));
  } finally {
    await clippedStyle.evaluate(element => element.remove());
  }
  assertUnclipped(await comparePaint(firstHeading), 'Restored heading after negative control');
  assert.deepEqual(errors, []);
  console.log(`All three case headings preserve gradient glyph ink at 390/1440px and normal/doubled text. Negative control reproduced ${clipped.solid.bottom - clipped.gradient.bottom}px of clipped descender ink; restored styles pass.`);
} finally {
  await browser.close();
}
