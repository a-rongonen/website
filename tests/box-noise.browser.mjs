import assert from 'node:assert/strict';
import { cvDesign } from '../src/data/cv-design.ts';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8796';

async function afterPaint(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

try {
  for (const route of ['/cv', '/cv-fi', '/portfolio']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + route);
    await afterPaint(page);
    const box = page.locator(route === '/portfolio' ? '.portfolio-cases-box' : '.glass').first();
    const style = await box.evaluate(element => {
      const card = getComputedStyle(element);
      const surface = getComputedStyle(element.querySelector('.box-noise'));
      const texture = getComputedStyle(element.querySelector('.box-noise-pattern'));
      return {
        backdrop: card.backdropFilter,
        prefixedBackdrop: card.webkitBackdropFilter,
        fill: card.backgroundImage,
        image: texture.backgroundImage,
        theme: card.getPropertyValue('--network-base').trim(),
        color: texture.backgroundColor,
        blend: texture.backgroundBlendMode,
        contrast: Number(texture.opacity),
        mix: Number(surface.opacity),
        pointerEvents: surface.pointerEvents,
      };
    });
    assert.equal(style.backdrop, 'none', `${route}: no live backdrop blur`);
    assert(!style.prefixedBackdrop || style.prefixedBackdrop === 'none', `${route}: no prefixed backdrop blur`);
    const noise = cvDesign.boxes.noise;
    const clampedIslandBias = Math.max(-1, Math.min(1, noise.noiseBias));
    const islandStep = Math.sign(clampedIslandBias) * Math.round(Math.abs(clampedIslandBias) * 10);
    const islandSuffix = islandStep === 0 ? '' : `-bias-${islandStep > 0 ? 'p' : 'm'}${Math.abs(islandStep)}`;
    assert(style.image.includes(`/box-noise/noise-${Math.round(noise.blur)}${islandSuffix}.png`),
      `${route}: selected preblurred island-bias tile is loaded`);
    const themeRgb = [1, 3, 5].map(index => parseInt(style.theme.slice(index, index + 2), 16));
    const noiseRgb = style.color.startsWith('color(srgb ')
      ? style.color.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\)/)?.slice(1).map(Number)
      : style.color.match(/rgb\((\d+), (\d+), (\d+)\)/)?.slice(1).map(value => Number(value) / 255);
    const colorBias = Math.max(-1, Math.min(1, noise.bias));
    const expectedColor = themeRgb.map(channel => colorBias < 0
      ? channel / 255 * (1 + colorBias) : channel / 255 * (1 - colorBias) + colorBias);
    assert(noiseRgb?.every((channel, index) => Math.abs(channel - expectedColor[index]) < .005),
      `${route}: noise color inherits the section color with the configured color bias`);
    assert.equal(style.blend, 'multiply', `${route}: dark noise shades the section color toward black`);
    assert.equal(style.contrast, noise.contrast, `${route}: noise pattern contrast matches its control`);
    assert.equal(style.mix, noise.mix, `${route}: box/noise mix matches its control`);
    assert.equal(style.pointerEvents, 'none', `${route}: noise cannot intercept controls`);
    if (route === '/cv') {
      const extremes = await page.evaluate(async () => {
        const imageStyle = getComputedStyle(document.querySelector('.box-noise-pattern')).backgroundImage;
        const source = imageStyle.match(/^url\("?(.+?)"?\)$/)?.[1];
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let black = 0, white = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index + 3] !== 255) continue;
          if (pixels[index] === 0) black++;
          if (pixels[index] === 255) white++;
        }
        return { black, white };
      });
      assert(extremes.black > 0 && extremes.white > 0,
        'At contrast 1 the selected tile reaches both fully black and fully bright cores');
    }

    await box.scrollIntoViewIfNeeded();
    await afterPaint(page);
    if (process.env.BOX_NOISE_SCREENSHOTS) {
      await page.screenshot({ path: `ignored-files/box-noise-${route.slice(1)}-desktop.png` });
    }
    const rect = await box.boundingBox();
    const clip = {
      x: Math.ceil(rect.x + 12), y: Math.ceil(rect.y + 12),
      width: Math.min(100, Math.floor(rect.width - 24)),
      height: Math.min(100, Math.floor(rect.height - 24)),
    };
    await page.addStyleTag({ content: 'cv-network { display:none !important; } .cv-network-section { background:#f00 !important; }' });
    const red = await page.screenshot({ clip });
    await page.addStyleTag({ content: '.cv-network-section { background:#00f !important; }' });
    const blue = await page.screenshot({ clip });
    assert(red.equals(blue), `${route}: the box interior does not reveal the background`);
    await page.addStyleTag({ content: '.glass { --cv-noise-mix: 0 !important; }' });
    const plain = await page.screenshot({ clip });
    assert(!blue.equals(plain), `${route}: the baked texture changes visible box pixels`);
    await page.addStyleTag({ content: '.glass { --cv-noise-mix: .5 !important; }' });
    const middle = await page.screenshot({ clip });
    await page.addStyleTag({ content: '.glass { --cv-noise-mix: 1 !important; }' });
    const full = await page.screenshot({ clip });
    assert(!middle.equals(plain), `${route}: half mix differs from the regular fill`);
    assert(!middle.equals(full), `${route}: half mix differs from the full noise surface`);
    assert(!full.equals(plain), `${route}: full mix replaces the regular fill`);

    await page.evaluate(() => scrollTo(0, 1000));
    await afterPaint(page);
    const first = await page.evaluate(() => ({
      scroll: scrollY,
      shift: parseFloat(document.documentElement.style.getPropertyValue('--cv-noise-scroll-shift')),
    }));
    await page.evaluate(() => scrollTo(0, 1400));
    await afterPaint(page);
    const second = await page.evaluate(() => ({
      scroll: scrollY,
      shift: parseFloat(document.documentElement.style.getPropertyValue('--cv-noise-scroll-shift')),
    }));
    assert(second.scroll > first.scroll, `${route}: page scrolled`);
    const tileSize = 512 * Math.max(.25, Math.min(4, noise.scale));
    const actualMovement = ((second.shift - first.shift) % tileSize + tileSize) % tileSize;
    const expectedMovement = (((1 - noise.scrollMovement) * (second.scroll - first.scroll)) % tileSize + tileSize) % tileSize;
    assert(Math.abs(actualMovement - expectedMovement) < 1,
      `${route}: texture screen movement matches its scrollMovement control`);
    assert.deepEqual(errors, [], `${route}: no browser errors`);
    await page.close();
  }

  const reduced = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  await reduced.goto(base + '/cv');
  await reduced.evaluate(() => scrollTo(0, 400));
  await afterPaint(reduced);
  assert.equal(await reduced.locator('.box-noise-pattern').first().evaluate(element => getComputedStyle(element).transform),
    'none', 'Reduced motion keeps the texture still inside the box');
  await reduced.close();
  if (process.env.BOX_NOISE_SCREENSHOTS) {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const route of ['/cv', '/cv-fi', '/portfolio']) {
      await mobile.goto(base + route);
      await mobile.locator(route === '/portfolio' ? '.portfolio-feature-card' : '.glass').first().scrollIntoViewIfNeeded();
      await afterPaint(mobile);
      await mobile.screenshot({ path: `ignored-files/box-noise-${route.slice(1)}-mobile.png` });
    }
    await mobile.close();
  }
  console.log('Opaque moving box noise PASS');
} finally {
  await browser.close();
}
