// Optional production-preview regression; no project Playwright dependency needed.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8805';
const errors = [];
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function ready(page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/portfolio', { waitUntil: 'domcontentloaded' });
  await page.locator('portfolio-case[data-enhanced="true"]').last().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await settled(page);
}

const dimensions = page => page.evaluate(() => ({
  page: document.documentElement.scrollHeight,
  cards: [...document.querySelectorAll('.portfolio-feature-card, .portfolio-cases-box')].map(element => element.getBoundingClientRect().height),
  media: [...document.querySelectorAll('[data-portfolio-media]')].map(element => element.getBoundingClientRect().height),
}));

function sameDimensions(before, after, label) {
  for (const key of ['page', 'cards', 'media']) {
    const first = Array.isArray(before[key]) ? before[key] : [before[key]];
    const last = Array.isArray(after[key]) ? after[key] : [after[key]];
    assert.equal(last.length, first.length, label);
    assert(first.every((value, index) => Math.abs(value - last[index]) < 1), `${label}: ${key}: ${JSON.stringify({ before: first, after: last })}`);
  }
}

async function mediaSource(wrapper) {
  return wrapper.evaluate(element => {
    const media = element.querySelector('img, video, iframe') || element.querySelector('template')?.content.querySelector('img, video, iframe');
    return new URL(media.getAttribute('src'), location.href).href;
  });
}

async function select(widget, number) {
  await widget.locator('[data-case-slider]').evaluate((slider, value) => {
    slider.value = String(value);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }, number);
}

async function centered(wrapper) {
  await wrapper.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await wrapper.locator('img, video, iframe').waitFor({ state: 'attached' });
}

const waitForPlaying = video => video.evaluate(video => new Promise((resolve, reject) => {
  const deadline = setTimeout(() => reject(new Error('Selected visible video did not play')), 30000);
  const check = () => {
    if (!video.paused && video.currentTime > 0 && video.videoWidth > 0) {
      clearTimeout(deadline);
      resolve();
    } else setTimeout(check, 50);
  };
  check();
}));

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const requested = new Set();
  const initialGate = deferred();
  let initialBlocked = true;
  let selectedSource;
  let selectedGate;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.youtube-nocookie.com') {
      requested.add(url.href);
      await route.abort();
    } else if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/videos/')) {
      requested.add(url.href);
      if (initialBlocked) await initialGate.promise;
      if (url.href === selectedSource) await selectedGate.promise;
      await route.continue().catch(() => {});
    } else await route.continue();
  });
  await ready(page);
  const hero = page.locator('.portfolio-hero [data-portfolio-media]');
  const heroSource = await mediaSource(hero);
  await page.waitForTimeout(350);
  assert.deepEqual([...requested], [heroSource], 'A cold landing requests only the opening video');
  assert.equal(await page.locator('[data-portfolio-media] > :is(img, video, iframe)').count(), 1,
    'Only opening media is materialized on arrival');
  assert(await page.locator('[data-portfolio-media]').evaluateAll(wrappers => wrappers.every(wrapper => {
    const media = wrapper.querySelector('img, video, iframe') || wrapper.querySelector('template')?.content.querySelector('img, video, iframe');
    return media && (media.tagName === 'IFRAME' || Number(media.getAttribute('width')) > 0 && Number(media.getAttribute('height')) > 0) && getComputedStyle(wrapper).aspectRatio !== 'auto';
  })), 'Every local asset declares its dimensions and every inert wrapper reserves its aspect ratio before downloading');
  const initialDimensions = await dimensions(page);
  initialBlocked = false;
  initialGate.resolve();
  await waitForPlaying(hero.locator('video'));
  await settled(page);
  sameDimensions(initialDimensions, await dimensions(page), 'Decoded opening video causes no layout shift');

  const widget = page.locator('portfolio-case').first();
  const panels = widget.locator('[data-case-panel]');
  const first = panels.nth(0).locator('[data-portfolio-media]');
  const second = panels.nth(1).locator('[data-portfolio-media]');
  const third = panels.nth(2).locator('[data-portfolio-media]');
  const firstSource = await mediaSource(first);
  const secondSource = await mediaSource(second);
  const thirdSource = await mediaSource(third);
  const initiallyHiddenSources = await page.locator('[data-case-panel][hidden] [data-portfolio-media]').evaluateAll(wrappers => wrappers.map(wrapper => {
    const media = wrapper.querySelector('template').content.querySelector('img, video, iframe');
    return new URL(media.getAttribute('src'), location.href).href;
  }));
  assert(initiallyHiddenSources.every(source => !requested.has(source)), 'No hidden slide image or video is requested on arrival');

  selectedSource = firstSource;
  selectedGate = deferred();
  const firstRequest = page.waitForRequest(firstSource);
  await first.evaluate(element => scrollTo({ top: scrollY + element.getBoundingClientRect().top - innerHeight - 125, behavior: 'instant' }));
  await first.locator('img').waitFor({ state: 'attached' });
  await firstRequest;
  assert.equal(await first.getAttribute('data-media-loaded'), 'true', 'Selected media records its loaded state');
  assert.equal(await first.locator('template[data-media-template]').count(), 0, 'A materialized image replaces its inert template');
  const near = await first.evaluate(element => element.getBoundingClientRect().top - innerHeight);
  assert(near > 0 && near < 150, 'Selected media is primed shortly before it enters view');
  assert.equal(await second.locator('img').count(), 0, 'The second slide remains inert beside a primed first slide');
  assert.equal(await third.locator('video').count(), 0, 'The third slide video remains inert beside a primed first slide');
  await page.waitForTimeout(150);
  assert(requested.has(firstSource), 'The nearby selected image starts downloading');
  assert(initiallyHiddenSources.every(source => !requested.has(source)), 'Scrolling to a case does not download its hidden slides');
  const blockedImageDimensions = await dimensions(page);
  selectedGate.resolve();
  await first.locator('img').evaluate(image => image.decode());
  await settled(page);
  sameDimensions(blockedImageDimensions, await dimensions(page), 'The selected image has its final card/page height while its request is blocked');

  await select(widget, 2);
  await second.locator('img').waitFor({ state: 'attached' });
  await second.locator('img').evaluate(image => image.decode());
  assert(requested.has(secondSource), 'Selecting the next slide downloads that image');
  assert.equal(requested.has(thirdSource), false, 'Selecting the second slide does not download the next video');
  assert.equal(await first.locator('img').count(), 1, 'Loaded images are retained when their slides are hidden');
  assert(initiallyHiddenSources.filter(source => source !== secondSource).every(source => !requested.has(source)),
    'Other hidden slides remain unrequested after a case page change');

  selectedSource = thirdSource;
  selectedGate = deferred();
  const blockedVideoRequest = page.waitForRequest(thirdSource);
  await select(widget, 3);
  await third.evaluate(element => scrollTo({ top: scrollY + element.getBoundingClientRect().top - innerHeight - 100, behavior: 'instant' }));
  await third.locator('video').waitFor({ state: 'attached' });
  const video = third.locator('video');
  await settled(page);
  assert(await third.evaluate(element => element.getBoundingClientRect().top > innerHeight), 'The result video is primed while still below the viewport');
  assert(await video.evaluate(video => video.paused && !video.autoplay), 'Nearby video preloading does not start offscreen playback');
  await centered(third);
  await blockedVideoRequest;
  await page.waitForFunction(() => {
    const video = document.querySelector('portfolio-case [data-case-page="3"] video');
    return !video.paused && video.readyState === 0;
  });
  await widget.locator('[data-case-slider]').evaluate(slider => {
    for (const value of ['1', '3']) {
      slider.value = value;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  selectedGate.resolve();
  await waitForPlaying(video);
  assert(await video.evaluate(video => video.autoplay), 'Rapid away/back selection recovers an interrupted pending play request');
  assert(requested.has(thirdSource), 'Selecting the result downloads its video');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('portfolio-case [data-case-page="3"] video').paused);
  await centered(third);
  await waitForPlaying(video);
  await select(widget, 1);
  await page.waitForFunction(() => document.querySelector('portfolio-case [data-case-page="3"] video').paused);
  assert.equal(await third.locator('video').count(), 1, 'The hidden video pauses and retains its downloaded source');
  await select(widget, 3);
  await centered(third);
  await waitForPlaying(video);

  await video.evaluate(video => video.pause());
  await settled(page);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await settled(page);
  await centered(third);
  await page.waitForTimeout(250);
  assert(await video.evaluate(video => video.paused), 'A user pause survives leaving and reentering the viewport');
  await video.evaluate(video => video.play());
  await waitForPlaying(video);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-portfolio-video]')].every(video => video.paused && !video.autoplay));
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await centered(third);
  assert(await video.evaluate(video => video.paused), 'Reduced motion keeps newly visible videos paused');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await waitForPlaying(video);
  await context.close();

  const printContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const printPage = await printContext.newPage();
  await printContext.route('https://www.youtube-nocookie.com/**', route => route.abort());
  await ready(printPage);
  await printPage.emulateMedia({ media: 'print' });
  await printPage.waitForFunction(() => document.querySelectorAll('portfolio-case img').length === 5);
  for (const image of await printPage.locator('portfolio-case img').all()) await image.evaluate(image => image.decode());
  assert.equal(await printPage.locator('portfolio-case video').count(), 0, 'Printing hydrates every case image without downloading case videos');
  assert.equal(await printPage.locator('iframe').count(), 0, 'Printing does not load the external video player');
  await printContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const mobile = await mobileContext.newPage();
  const mobileGate = deferred();
  const frameGate = deferred();
  const imageGate = deferred();
  let mobileBlocked = true;
  let mobileImageSource;
  await mobileContext.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.youtube-nocookie.com') {
      await frameGate.promise;
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Media frame fixture</title>' });
    } else if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/videos/')) {
      if (mobileBlocked) await mobileGate.promise;
      if (url.href === mobileImageSource) await imageGate.promise;
      await route.continue().catch(() => {});
    } else await route.continue();
  });
  await ready(mobile);
  const mobileInitial = await dimensions(mobile);
  mobileBlocked = false;
  mobileGate.resolve();
  await waitForPlaying(mobile.locator('.portfolio-hero video'));
  await settled(mobile);
  sameDimensions(mobileInitial, await dimensions(mobile), 'Mobile opening video reserves its height before decoding');
  const frameWrapper = mobile.locator('.portfolio-background [data-portfolio-media]');
  await frameWrapper.evaluate(element => scrollTo({ top: scrollY + element.getBoundingClientRect().top - innerHeight - 125, behavior: 'instant' }));
  await frameWrapper.locator('iframe').waitFor({ state: 'attached' });
  await settled(mobile);
  sameDimensions(mobileInitial, await dimensions(mobile), 'Mobile iframe reserves its minimum height before materializing');
  frameGate.resolve();
  await mobile.frameLocator('.portfolio-background iframe').locator('title').waitFor({ state: 'attached' });
  await settled(mobile);
  sameDimensions(mobileInitial, await dimensions(mobile), 'Mobile external player response causes no layout shift');
  const mobileFirst = mobile.locator('portfolio-case').first().locator('[data-case-panel]:not([hidden]) [data-portfolio-media]');
  mobileImageSource = await mediaSource(mobileFirst);
  const mobileBeforeImage = await dimensions(mobile);
  const mobileImageRequest = mobile.waitForRequest(mobileImageSource);
  await mobileFirst.evaluate(element => scrollTo({ top: scrollY + element.getBoundingClientRect().top - innerHeight - 125, behavior: 'instant' }));
  await mobileFirst.locator('img').waitFor({ state: 'attached' });
  await mobileImageRequest;
  await settled(mobile);
  sameDimensions(mobileBeforeImage, await dimensions(mobile), 'Mobile image reserves its native height while downloading');
  imageGate.resolve();
  await mobileFirst.locator('img').evaluate(image => image.decode());
  await settled(mobile);
  sameDimensions(mobileBeforeImage, await dimensions(mobile), 'Mobile decoded image causes no card or page shift');
  await mobileContext.close();

  assert.deepEqual(errors, [], 'No browser errors');
  console.log('Portfolio cold-load requests, selected-slide streaming, nearby priming, stable desktop/mobile media/card/page geometry, viewport playback, rapid selection, user pause, reduced motion and print images PASS');
} finally { await browser.close(); }
