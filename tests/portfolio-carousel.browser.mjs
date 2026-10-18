// Run against a production preview using the external browser runtime in README.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8805';
const errors = [];
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function ready(page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://www.youtube-nocookie.com/**', route => route.abort());
  await page.goto(base + '/portfolio', { waitUntil: 'domcontentloaded' });
  await page.locator('portfolio-carousel[data-enhanced="true"]').waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
  await settled(page);
  return page.locator('portfolio-carousel');
}

async function selected(widget, index) {
  assert.deepEqual(await widget.locator('[data-carousel-panel]').evaluateAll(panels => panels.map(panel => !panel.hidden)),
    [0, 1, 2].map(value => value === index), 'Exactly the requested carousel slide is selected');
  assert.equal(await widget.locator('[data-carousel-previous]').isDisabled(), index === 0, 'Previous is disabled only at the beginning');
  assert.equal(await widget.locator('[data-carousel-next]').isDisabled(), index === 2, 'Next is disabled only at the end');
  assert.match(await widget.locator('[data-carousel-status]').textContent(), new RegExp(`${index + 1}\\s*(of|/)\\s*3`), 'Status announces the selected slide');
}

async function choose(widget, index) {
  await widget.locator('[data-carousel-controls]').evaluate((controls, requested) => {
    controls.dispatchEvent(new KeyboardEvent('keydown', { key: requested === 2 ? 'End' : 'Home', bubbles: true }));
    if (requested === 1) controls.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  }, index);
  await selected(widget, index);
}

async function readable(page, mode) {
  const widget = page.locator('portfolio-carousel');
  assert.equal(await widget.locator('[data-carousel-panel]').count(), 3);
  assert.equal(await widget.locator('[data-carousel-controls]').isVisible(), false, `${mode}: inactive controls are hidden`);
  for (const panel of await widget.locator('[data-carousel-panel]').all()) {
    assert(await panel.isVisible(), `${mode}: every slide is readable`);
    assert(await panel.locator('.portfolio-feature-copy').isVisible(), `${mode}: every caption is readable`);
    assert(await panel.locator('.portfolio-media').isVisible(), `${mode}: every media frame is present`);
  }
}

async function dimensions(widget) {
  return widget.evaluate(element => {
    const panel = element.querySelector('[data-carousel-panel]:not([hidden])');
    const rect = panel.getBoundingClientRect();
    const media = panel.querySelector('.portfolio-media').getBoundingClientRect();
    const copy = panel.querySelector('.portfolio-feature-copy').getBoundingClientRect();
    const controls = element.querySelector('[data-carousel-controls]').getBoundingClientRect();
    return {
      page: document.documentElement.scrollHeight,
      widget: element.getBoundingClientRect().height,
      panel: rect.height,
      media: media.height,
      stacked: copy.top >= media.bottom - 1,
      contained: rect.left >= -1 && rect.right <= innerWidth + 1 && controls.left >= -1 && controls.right <= innerWidth + 1,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

function stable(before, after, label) {
  for (const key of ['page', 'widget', 'panel', 'media']) {
    assert(Math.abs(before[key] - after[key]) < 1, `${label}: ${key} changed: ${JSON.stringify({ before, after })}`);
  }
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

// Supply isolated media only in the test response. Production keeps its owner's
// placeholders, while these exercise future assets through the real component.
async function mediaFixtures(context) {
  await context.route(base + '/portfolio', async route => {
    const response = await route.fetch();
    const html = await response.text();
    let fixtureCount = 0;
    const body = html.replace(/<portfolio-carousel\b[\s\S]*?<\/portfolio-carousel>/, carousel => carousel.replace(
      /<div class="portfolio-media portfolio-media-placeholder"[^>]*>[\s\S]*?<\/svg>\s*<span>[\s\S]*?<\/span>\s*<\/div>\s*<\/div>/g,
      () => {
        const number = ++fixtureCount;
        const src = number === 3 ? '/videos/portfolio-demo-reel.mp4?carousel-fixture=3' : `/images/carousel-fixture-${number}.svg`;
        const asset = number === 3
          ? `<video src="${src}" width="1920" height="1080" aria-label="Carousel video fixture" loop muted playsinline controls preload="none" data-portfolio-video></video>`
          : `<img src="${src}" width="1600" height="900" alt="Carousel image fixture ${number}" loading="lazy" decoding="async">`;
        return `<div class="portfolio-media" data-portfolio-media data-media-kind="${number === 3 ? 'video' : 'image'}" style="aspect-ratio: 16 / 9;"><template data-media-template>${asset}</template><noscript>${asset}</noscript></div>`;
      }
    ));
    assert.equal(fixtureCount, 3, 'Media fixtures replace exactly the three Small Wins placeholders');
    await route.fulfill({ response, body });
  });
}

async function playing(video) {
  await video.evaluate(video => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Carousel video did not play')), 30000);
    const inspect = () => {
      if (!video.paused && video.currentTime > 0 && video.videoWidth > 0) { clearTimeout(timeout); resolve(); }
      else setTimeout(inspect, 50);
    };
    inspect();
  }));
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const widget = await ready(page);
  assert.equal(await page.locator('.portfolio-small-wins .portfolio-section-title').textContent(), 'Small Wins');
  assert.equal(await widget.locator('.portfolio-media-placeholder').count(), 3, 'All three entries are honest media placeholders');
  assert.equal(await widget.locator('img, video, iframe').count(), 0, 'Placeholders make no asset downloads');
  await selected(widget, 0);
  assert.equal(await widget.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0,
    'Offscreen carousel has no running decorative animation');
  await widget.scrollIntoViewIfNeeded();
  const previous = widget.locator('[data-carousel-previous]');
  const next = widget.locator('[data-carousel-next]');
  for (const button of [previous, next]) {
    assert(await button.getAttribute('aria-label'), 'Arrow button has an accessible name');
    const bounds = await button.boundingBox();
    assert(bounds.width >= 44 && bounds.height >= 44, 'Arrow buttons are usable touch targets');
  }
  await next.click();
  await selected(widget, 1);
  await next.click();
  await selected(widget, 2);
  // A disabled final control does not wrap even when activated programmatically.
  await next.evaluate(button => button.click());
  await selected(widget, 2);
  await previous.focus();
  await previous.press('Home');
  await selected(widget, 0);
  assert(await widget.locator('[data-carousel-controls]').evaluate(element => element === document.activeElement), 'Focus moves to controls when Previous becomes disabled');
  await page.keyboard.press('ArrowRight');
  await selected(widget, 1);
  await page.keyboard.press('Home');
  await selected(widget, 0);
  await next.focus();
  await next.press('ArrowLeft');
  await selected(widget, 0);
  await next.press('ArrowRight');
  await selected(widget, 1);
  await next.press('End');
  await selected(widget, 2);
  assert(await widget.locator('[data-carousel-controls]').evaluate(element => element === document.activeElement), 'Focus moves to controls when Next becomes disabled');
  await page.keyboard.press('ArrowLeft');
  await selected(widget, 1);
  await page.keyboard.press('End');
  await selected(widget, 2);
  await previous.focus();
  await previous.press('ArrowRight');
  await selected(widget, 2);
  await previous.press('ArrowLeft');
  await selected(widget, 1);
  await widget.locator('[data-carousel-controls]').evaluate(controls => {
    for (const key of ['Home', 'ArrowRight', 'End', 'Home', 'End', 'ArrowLeft']) {
      controls.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
  });
  await selected(widget, 1);
  await page.waitForFunction(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'), await widget.elementHandle());
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(element => element.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), await widget.elementHandle());
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'), await widget.elementHandle());
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(element => element.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'), await widget.elementHandle());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await widget.scrollIntoViewIfNeeded();
  await choose(widget, 2);
  await settled(page);
  assert.equal(await widget.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0,
    'Reduced motion removes slide and glow animation while controls still work');

  for (const width of [240, 320, 390, 700, 1440]) {
    for (const fontSize of [16, 32]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(size => document.documentElement.style.fontSize = `${size}px`, fontSize);
      await choose(widget, 0);
      await settled(page);
      const initial = await dimensions(widget);
      assert(initial.stacked && initial.contained && !initial.overflow, `Media, copy and controls fit ${width}px at ${fontSize}px text`);
      for (const index of [1, 2, 0]) {
        await choose(widget, index);
        await settled(page);
        stable(initial, await dimensions(widget), `Selecting ${index + 1} at ${width}px/${fontSize}px text`);
      }
    }
  }
  if (process.env.PORTFOLIO_SCREENSHOTS) {
    await page.evaluate(() => document.documentElement.style.fontSize = '16px');
    for (const [name, width] of [['desktop', 1440], ['mobile', 390]]) {
      await page.setViewportSize({ width, height: 900 });
      await settled(page);
      await page.locator('.portfolio-small-wins').screenshot({ path: `ignored-files/portfolio-small-wins-${name}.png` });
    }
  }
  await page.emulateMedia({ media: 'print' });
  await readable(page, 'Print');
  await page.emulateMedia({ media: 'screen' });
  await selected(widget, 0);
  await context.close();

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJs.newPage();
  await fallback.route('https://www.youtube-nocookie.com/**', route => route.abort());
  await fallback.goto(base + '/portfolio', { waitUntil: 'domcontentloaded' });
  await readable(fallback, 'No JavaScript');
  assert(await fallback.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No-JavaScript mobile page does not overflow');
  await noJs.close();

  const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const touchPage = await touch.newPage();
  const touchWidget = await ready(touchPage);
  const cdp = await touch.newCDPSession(touchPage);
  async function swipe(dx, dy = 0) {
    const media = touchWidget.locator('[data-carousel-panel]:not([hidden]) .portfolio-media');
    await media.scrollIntoViewIfNeeded();
    const bounds = await media.boundingBox();
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 5; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / 5, y: y + dy * step / 5 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await settled(touchPage);
  }
  await swipe(-100);
  await selected(touchWidget, 1);
  await swipe(-100);
  await selected(touchWidget, 2);
  await swipe(-100);
  await selected(touchWidget, 2);
  await swipe(100);
  await selected(touchWidget, 1);
  await swipe(10, -80);
  await selected(touchWidget, 1);
  await choose(touchWidget, 0);
  await swipe(100);
  await selected(touchWidget, 0);
  await touch.close();

  // Both viewport sizes reserve final frames before and after blocked downloads.
  for (const width of [1440, 390]) {
    const fixtureContext = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    await mediaFixtures(fixtureContext);
    const requested = new Set();
    const gates = new Map([1, 2, 3].map(number => [number, deferred()]));
    await fixtureContext.route(/carousel-fixture/, async route => {
      const url = route.request().url();
      const number = Number(url.match(/carousel-fixture[-=](\d)/)[1]);
      requested.add(number);
      await gates.get(number).promise;
      if (number === 3) await route.continue().catch(() => {});
      else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#234"/></svg>' });
    });
    const fixturePage = await fixtureContext.newPage();
    const fixtureWidget = await ready(fixturePage);
    await fixturePage.waitForTimeout(150);
    assert.deepEqual([...requested], [], 'Cold landing leaves every carousel asset inert');
    const firstMedia = fixtureWidget.locator('[data-carousel-panel]').nth(0).locator('.portfolio-media');
    const before = await dimensions(fixtureWidget);
    await firstMedia.evaluate(element => scrollTo({ top: scrollY + element.getBoundingClientRect().top - innerHeight - 125, behavior: 'instant' }));
    await firstMedia.locator('img').waitFor({ state: 'attached' });
    await fixturePage.waitForFunction(() => document.querySelector('portfolio-carousel img')?.complete === false);
    assert.deepEqual([...requested], [1], 'Only selected nearby media downloads');
    stable(before, await dimensions(fixtureWidget), `${width}px blocked image`);
    gates.get(1).resolve();
    await firstMedia.locator('img').evaluate(image => image.decode());
    stable(before, await dimensions(fixtureWidget), `${width}px decoded image`);
    await choose(fixtureWidget, 1);
    const secondImage = fixtureWidget.locator('[data-carousel-panel]').nth(1).locator('img');
    await secondImage.waitFor({ state: 'attached' });
    gates.get(2).resolve();
    await secondImage.evaluate(image => image.decode());
    assert.deepEqual([...requested], [1, 2], 'Selection loads the second asset without requesting the third');
    stable(before, await dimensions(fixtureWidget), `${width}px second image`);
    await choose(fixtureWidget, 2);
    const video = fixtureWidget.locator('video');
    await video.waitFor({ state: 'attached' });
    assert(await video.evaluate(video => video.paused && !video.autoplay), 'Nearby video does not autoplay outside the viewport');
    await video.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await fixturePage.waitForFunction(() => {
      const video = document.querySelector('portfolio-carousel video');
      return !video.paused && video.readyState === 0;
    });
    stable(before, await dimensions(fixtureWidget), `${width}px buffering video`);
    await choose(fixtureWidget, 0);
    await choose(fixtureWidget, 2);
    gates.get(3).resolve();
    await playing(video);
    stable(before, await dimensions(fixtureWidget), `${width}px decoded video`);
    await choose(fixtureWidget, 0);
    await fixturePage.waitForFunction(() => document.querySelector('portfolio-carousel video').paused);
    assert.equal(await fixtureWidget.locator('img').count(), 2, 'Loaded hidden images remain available for revisits');
    assert.equal(await fixtureWidget.locator('video').count(), 1, 'Hidden video is retained and paused');
    await choose(fixtureWidget, 2);
    await playing(video);
    await video.evaluate(video => video.pause());
    await settled(fixturePage);
    await choose(fixtureWidget, 0);
    await choose(fixtureWidget, 2);
    await settled(fixturePage);
    assert(await video.evaluate(video => video.paused), 'Manual pause survives a slide round trip');
    await video.evaluate(video => video.play());
    await playing(video);
    await fixturePage.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await fixturePage.waitForFunction(() => document.querySelector('portfolio-carousel video').paused);
    await video.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await playing(video);
    await fixturePage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await fixturePage.waitForFunction(() => document.querySelector('portfolio-carousel video').paused);
    await fixturePage.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await playing(video);
    await fixturePage.emulateMedia({ reducedMotion: 'reduce' });
    await fixturePage.waitForFunction(() => document.querySelector('portfolio-carousel video').paused);
    assert(await video.evaluate(video => !video.autoplay), 'Reduced motion stops carousel autoplay');
    await fixtureContext.close();
  }

  const printContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await mediaFixtures(printContext);
  await printContext.route(/carousel-fixture-\d\.svg/, route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"/>' }));
  const printPage = await printContext.newPage();
  const printWidget = await ready(printPage);
  await printPage.emulateMedia({ media: 'print' });
  await printWidget.locator('img').nth(1).waitFor({ state: 'attached' });
  assert.equal(await printWidget.locator('video').count(), 0, 'Printing loads carousel still images without downloading its video');
  await readable(printPage, 'Print with media');
  await printContext.close();
  assert.deepEqual(errors, [], 'No browser errors');
  console.log('Small Wins finite navigation, keyboard/touch, rapid selection, reduced motion, offscreen glow, responsive geometry, media loading/playback, no-JS and print PASS');
} finally { await browser.close(); }
