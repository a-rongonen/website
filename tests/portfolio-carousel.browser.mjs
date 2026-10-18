// Run against a production preview using the external browser runtime in README.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8805';
const errors = [];
const count = 6;
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
  await widget.page().waitForFunction(({ element, value }) => element.dataset.carouselSelected === String(value + 1),
    { element: await widget.elementHandle(), value: index });
  assert.deepEqual(await widget.locator('[data-carousel-panel]').evaluateAll(panels => panels.map(panel => ({
    active: panel.dataset.carouselActive === 'true', hidden: panel.hidden, inert: panel.inert, ariaHidden: panel.getAttribute('aria-hidden') === 'true',
  }))), Array.from({ length: count }, (_, value) => ({ active: value === index, hidden: false, inert: value !== index,
    ariaHidden: value !== index })), 'Only the current card is accessible; neighboring cards remain in the track');
  assert.match(await widget.locator('[data-carousel-status]').textContent(), new RegExp(`${index + 1}\\s*(of|/)\\s*${count}`), 'Status announces the selected slide');
}

async function choose(widget, index) {
  await widget.locator('[data-carousel-viewport]').evaluate((viewport, requested) => {
    if (requested === viewport.querySelectorAll('[data-carousel-panel]').length - 1) {
      viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      return;
    }
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    for (let step = 0; step < requested; step++) viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  }, index);
  await selected(widget, index);
}

async function atRest(widget) {
  await widget.page().waitForFunction(element => {
    if (element.dataset.carouselMoving === 'true') return false;
    const viewport = element.querySelector('[data-carousel-viewport]').getBoundingClientRect();
    const active = element.querySelector('[data-carousel-active="true"]').getBoundingClientRect();
    return Math.abs((active.left + active.right - viewport.left - viewport.right) / 2) < 1;
  }, await widget.elementHandle());
}

async function peeks(widget, index) {
  await atRest(widget);
  const geometry = await widget.evaluate(element => {
    const viewport = element.querySelector('[data-carousel-viewport]').getBoundingClientRect();
    const caseWidth = document.querySelector('.portfolio-cases-box').getBoundingClientRect().width;
    return { viewportLeft: viewport.left, viewportRight: viewport.right, screenWidth: document.documentElement.clientWidth, caseWidth,
      panels: [...element.querySelectorAll('[data-carousel-panel]')].map(panel => {
      const rect = panel.getBoundingClientRect();
      return { width: rect.width, visible: Math.max(0, Math.min(viewport.right, rect.right) - Math.max(viewport.left, rect.left)) };
    }) };
  });
  assert(Math.abs(geometry.viewportLeft) < 1 && Math.abs(geometry.viewportRight - geometry.screenWidth) < 1, 'Carousel clips only at the screen edges, including with a scrollbar');
  for (const [page, item] of geometry.panels.entries()) {
    assert(Math.abs(item.width - geometry.caseWidth) < 1, 'Every carousel card matches the large game-design case box width');
    if (page === index) assert(Math.abs(item.visible - item.width) < 1, 'Current card is fully visible');
    else if (Math.abs(page - index) === 1) assert(item.visible > 3 && item.visible < item.width / 2, 'An adjacent card shows a partial preview');
    else assert(item.visible < 1, 'Cards beyond immediate neighbors stay outside the viewport');
  }
}

async function readable(page, mode) {
  const widget = page.locator('portfolio-carousel');
  assert.equal(await widget.locator('[data-carousel-panel]').count(), count);
  assert.equal(await widget.locator('[data-carousel-previous], [data-carousel-next], [data-carousel-controls]').count(), 0, `${mode}: no arrow controls`);
  let previousBottom = -Infinity;
  for (const panel of await widget.locator('[data-carousel-panel]').all()) {
    assert(await panel.isVisible(), `${mode}: every slide is readable`);
    assert(await panel.locator('.portfolio-feature-copy').isVisible(), `${mode}: every caption is readable`);
    assert(await panel.locator('.portfolio-media').isVisible(), `${mode}: every media frame is present`);
    const rect = await panel.boundingBox();
    assert(rect.y >= previousBottom - 1, `${mode}: cards form a readable vertical list`);
    previousBottom = rect.y + rect.height;
  }
}

async function dimensions(widget) {
  return widget.evaluate(element => {
    const panel = element.querySelector('[data-carousel-active="true"]');
    const rect = panel.getBoundingClientRect();
    const media = panel.querySelector('.portfolio-media').getBoundingClientRect();
    const copy = panel.querySelector('.portfolio-feature-copy').getBoundingClientRect();
    const viewport = element.querySelector('[data-carousel-viewport]').getBoundingClientRect();
    return {
      page: document.documentElement.scrollHeight,
      widget: element.getBoundingClientRect().height,
      panel: rect.height,
      media: media.height,
      stacked: copy.top >= media.bottom - 1,
      contained: rect.left >= -1 && rect.right <= innerWidth + 1 && viewport.left >= -1 && viewport.right <= innerWidth + 1,
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
    assert.equal(fixtureCount, count, 'Media fixtures replace all six Small Wins placeholders');
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
  assert.equal(await widget.locator('.portfolio-media-placeholder').count(), count, 'All six entries are honest media placeholders');
  assert.equal(await widget.locator('img, video, iframe').count(), 0, 'Placeholders make no asset downloads');
  assert.equal(await widget.locator('button:not(.portfolio-carousel-sr-only), [data-carousel-controls]').count(), 0, 'There are no arrow buttons or extra visible navigation hints');
  await selected(widget, 0);
  assert.notEqual(await widget.getAttribute('data-carousel-moving'), 'true', 'Offscreen carousel is idle');
  await widget.scrollIntoViewIfNeeded();
  await peeks(widget, 0);
  const accessibleNext = widget.locator('[data-carousel-accessible-next]');
  const accessiblePrevious = widget.locator('[data-carousel-accessible-previous]');
  assert(await accessiblePrevious.isDisabled(), 'Screen-reader previous action stops at the beginning');
  await accessibleNext.evaluate(button => button.click());
  await selected(widget, 1);
  await accessiblePrevious.evaluate(button => button.click());
  await selected(widget, 0);
  const viewport = widget.locator('[data-carousel-viewport]');
  assert.equal(await viewport.getAttribute('tabindex'), '0', 'Carousel can receive keyboard focus');
  assert(await viewport.getAttribute('aria-label') || await viewport.getAttribute('aria-labelledby'), 'Keyboard viewport has an accessible name');
  const status = widget.locator('[data-carousel-status]');
  assert.equal(await status.getAttribute('aria-live'), 'polite');
  assert(await status.evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.position === 'absolute' && (rect.width <= 1 || style.clipPath !== 'none');
  }), 'Slide count is available to assistive technology without a visible hint');
  await viewport.focus();
  await page.keyboard.press('ArrowRight');
  await selected(widget, 1);
  await peeks(widget, 1);
  await page.keyboard.press('End');
  await selected(widget, count - 1);
  await peeks(widget, count - 1);
  await page.keyboard.press('ArrowRight');
  await selected(widget, count - 1);
  await page.keyboard.press('Home');
  await selected(widget, 0);
  await page.keyboard.press('ArrowLeft');
  await selected(widget, 0);
  assert(await viewport.evaluate(element => element === document.activeElement), 'Keyboard focus remains on the viewport at either endpoint');
  await viewport.evaluate(element => {
    for (const key of ['Home', 'ArrowRight', 'End', 'Home', 'End', 'ArrowLeft']) {
      element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
  });
  await selected(widget, count - 2);
  await atRest(widget);

  // A desktop drag follows the pointer continuously, then eases to its destination.
  await choose(widget, 0);
  await atRest(widget);
  const first = widget.locator('[data-carousel-panel]').first();
  const media = first.locator('.portfolio-media');
  await media.scrollIntoViewIfNeeded();
  let bounds = await media.boundingBox();
  const startX = bounds.x + bounds.width * 0.8;
  const startY = bounds.y + Math.min(bounds.height / 2, 80);
  const beforeDrag = (await first.boundingBox()).x;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - bounds.width * 0.35, startY, { steps: 8 });
  await settled(page);
  assert((await first.boundingBox()).x < beforeDrag - bounds.width * 0.2, 'Dragging moves cards before pointer release');
  await page.mouse.move(startX - bounds.width * 0.65, startY, { steps: 8 });
  await page.waitForTimeout(180);
  await page.mouse.up();
  await selected(widget, 1);
  const easingSamples = await widget.evaluate(element => new Promise(resolve => {
    const values = [];
    const sample = () => {
      values.push(element.querySelector('[data-carousel-panel]').getBoundingClientRect().x);
      if (element.dataset.carouselMoving === 'true' && values.length < 180) requestAnimationFrame(sample);
      else resolve(values);
    };
    requestAnimationFrame(sample);
  }));
  assert(easingSamples.length > 3, 'Release settles over multiple frames');
  const deltas = easingSamples.slice(1).map((value, index) => Math.abs(value - easingSamples[index]));
  assert(deltas.slice(-3).reduce((sum, value) => sum + value, 0) < Math.max(...deltas) * 1.5,
    'The release slows smoothly near the final card');
  await peeks(widget, 1);

  // Catching a moving track starts from its current rendered position.
  await choose(widget, count - 1);
  await page.waitForTimeout(70);
  bounds = await viewport.boundingBox();
  const interruptX = bounds.x + bounds.width / 2;
  const interruptY = bounds.y + Math.min(bounds.height / 2, 100);
  const beforeCatch = (await first.boundingBox()).x;
  await page.mouse.move(interruptX, interruptY);
  await page.mouse.down();
  const afterCatch = (await first.boundingBox()).x;
  assert(Math.abs(afterCatch - beforeCatch) < bounds.width * 0.3, 'Pointer down does not jump to the previous animation destination');
  await page.mouse.move(interruptX + 80, interruptY, { steps: 5 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await atRest(widget);
  const interruptedIndex = Number(await widget.getAttribute('data-carousel-selected')) - 1;
  assert(interruptedIndex < count - 1, 'An interrupted forward animation can settle on an earlier card');
  await peeks(widget, interruptedIndex);

  await choose(widget, 0);
  await atRest(widget);
  await choose(widget, count - 1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(element => element.dataset.carouselMoving !== 'true', await widget.elementHandle());
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await atRest(widget);
  await choose(widget, 0);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(element => element.dataset.carouselMoving !== 'true', await widget.elementHandle());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await widget.scrollIntoViewIfNeeded();
  await choose(widget, count - 1);
  await settled(page);
  assert.notEqual(await widget.getAttribute('data-carousel-moving'), 'true', 'Reduced motion makes keyboard selection immediate');
  await peeks(widget, count - 1);

  for (const width of [240, 320, 390, 600, 700, 1440, 1920]) {
    for (const fontSize of [16, 32]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(size => document.documentElement.style.fontSize = `${size}px`, fontSize);
      await choose(widget, 0);
      await settled(page);
      await peeks(widget, 0);
      const initial = await dimensions(widget);
      assert(initial.stacked && initial.contained && !initial.overflow, `Media, copy and viewport fit ${width}px at ${fontSize}px text`);
      for (const index of [2, count - 1, 0]) {
        await choose(widget, index);
        await settled(page);
        await peeks(widget, index);
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

  const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const touchPage = await touch.newPage();
  const touchWidget = await ready(touchPage);
  const cdp = await touch.newCDPSession(touchPage);
  async function swipe(dx, dy = 0, duration = 560) {
    await atRest(touchWidget);
    const media = touchWidget.locator('[data-carousel-active="true"] .portfolio-media');
    await media.scrollIntoViewIfNeeded();
    const bounds = await media.boundingBox();
    const x = bounds.x + bounds.width * (dx < 0 ? .85 : .15);
    const y = bounds.y + bounds.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    const steps = duration < 100 ? 3 : 10;
    for (let step = 1; step <= steps; step++) {
      await touchPage.waitForTimeout(duration / steps);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * step / steps, y: y + dy * step / steps }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await atRest(touchWidget);
  }
  // Equal travel at different speeds distinguishes a deliberate step from a fling.
  await swipe(-210);
  await selected(touchWidget, 1);
  assert(!await touchPage.evaluate(() => document.activeElement?.matches(':focus-visible')), 'A touch swipe does not show the keyboard focus outline');
  await choose(touchWidget, 0);
  await atRest(touchWidget);
  await swipe(-210, 0, 24);
  const fastDestination = Number(await touchWidget.getAttribute('data-carousel-selected')) - 1;
  assert(fastDestination >= 2 && fastDestination < count, `A quick swipe crosses multiple cards (reached ${fastDestination + 1})`);
  await peeks(touchWidget, fastDestination);
  await choose(touchWidget, count - 1);
  await swipe(-210, 0, 24);
  await selected(touchWidget, count - 1);
  await peeks(touchWidget, count - 1);
  await swipe(210);
  await selected(touchWidget, count - 2);
  await touchWidget.evaluate(element => {
    window.carouselRewrites = 0;
    window.carouselObserver = new MutationObserver(records => { window.carouselRewrites += records.length; });
    for (const panel of element.querySelectorAll('[data-carousel-panel]')) window.carouselObserver.observe(panel, { attributeFilter: ['inert', 'aria-hidden', 'data-carousel-active'] });
    window.carouselObserver.observe(element.querySelector('[data-carousel-status]'), { childList: true, characterData: true, subtree: true });
  });
  await swipe(10, -80);
  await selected(touchWidget, count - 2);
  assert.equal(await touchPage.evaluate(() => { window.carouselObserver.disconnect(); return window.carouselRewrites; }), 0,
    'A vertical gesture on the current card neither rewrites slide state nor re-announces the status');
  await choose(touchWidget, 0);
  await swipe(210, 0, 24);
  await selected(touchWidget, 0);
  await peeks(touchWidget, 0);
  await touchPage.emulateMedia({ reducedMotion: 'reduce' });
  await swipe(-210);
  await selected(touchWidget, 1);
  assert.notEqual(await touchWidget.getAttribute('data-carousel-moving'), 'true', 'Touch works with reduced motion without continuing animation');
  await touch.close();

  // Both viewport sizes reserve final frames before and after blocked downloads.
  for (const width of [1440, 390]) {
    const fixtureContext = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    await mediaFixtures(fixtureContext);
    const requested = new Set();
    const gates = new Map(Array.from({ length: count }, (_, index) => [index + 1, deferred()]));
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
    await atRest(fixtureWidget);
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
    await atRest(fixtureWidget);
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
    assert.deepEqual([...requested], [1, 2, 3], 'Unselected cards 4–6 never fetch, including the card peeking beside the selected video');
    await choose(fixtureWidget, count - 1);
    const lastImage = fixtureWidget.locator('[data-carousel-panel]').last().locator('img');
    await lastImage.waitFor({ state: 'attached' });
    gates.get(count).resolve();
    await lastImage.evaluate(image => image.decode());
    assert.deepEqual([...requested], [1, 2, 3, count], 'Jumping to the final card does not eagerly load intermediate cards');
    stable(before, await dimensions(fixtureWidget), `${width}px final decoded image`);
    await fixtureContext.close();
  }

  const printContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await mediaFixtures(printContext);
  await printContext.route(/carousel-fixture-\d\.svg/, route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"/>' }));
  const printPage = await printContext.newPage();
  const printWidget = await ready(printPage);
  await printPage.emulateMedia({ media: 'print' });
  await printWidget.locator('img').nth(count - 2).waitFor({ state: 'attached' });
  assert.equal(await printWidget.locator('img').count(), count - 1, 'Printing loads every still image, including unvisited cards');
  assert.equal(await printWidget.locator('video').count(), 0, 'Printing loads carousel still images without downloading its video');
  await readable(printPage, 'Print with media');
  await printContext.close();
  assert.deepEqual(errors, [], 'No browser errors');
  console.log('Small Wins swipe/drag, velocity-based multi-card travel, smooth settling/interruption, finite peeks, keyboard, responsive geometry, media loading/playback, reduced motion, no-JS and print PASS');
} finally { await browser.close(); }
