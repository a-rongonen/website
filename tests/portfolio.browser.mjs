// Optional browser regression; use the external Playwright setup documented in README.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const base = process.env.CV_PREVIEW_URL || 'http://127.0.0.1:8796';
const portfolioUrl = base + '/en/portfolio';
const errors = [];
const geometryErrors = [];
const trackErrors = page => page.on('pageerror', error => errors.push(error.message));
const settled = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function geometry(page, width, fontSize, javaScriptEnabled) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(size => document.documentElement.style.fontSize = `${size}px`, fontSize);
  if (javaScriptEnabled) await settled(page);
  const result = await page.evaluate(() => {
    const bounds = selector => document.querySelector(selector).getBoundingClientRect();
    const title = bounds('.portfolio-title');
    const owner = bounds('.portfolio-owner');
    const word = bounds('.portfolio-title-word');
    const media = bounds('.portfolio-hero .portfolio-media');
    const learning = [...document.querySelector('.portfolio-learning-columns').children].map(element => element.getBoundingClientRect());
    const background = [...document.querySelector('.portfolio-background .portfolio-columns').children].map(element => element.getBoundingClientRect());
    const ranges = [...document.querySelectorAll('.portfolio-owner > span, .portfolio-title-word')].map(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()];
      return { text: element.textContent, lines: rects.length,
        fits: rects.every(rect => rect.left >= title.left - 1 && rect.right <= title.right + 1),
        top: rects[0]?.top };
    });
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      separateTitleRow: word.top >= owner.bottom - 1,
      titleBeforeMedia: media.top >= title.bottom,
      mediaCentered: Math.abs(media.left + media.width / 2 - innerWidth / 2) < 1,
      learningStacked: learning[1].top >= learning[0].bottom,
      learningBeside: learning[1].left >= learning[0].right && Math.abs(learning[1].top - learning[0].top) < 1,
      backgroundStacked: background[1].top >= background[0].bottom,
      backgroundBeside: background[1].left >= background[0].right && Math.abs(background[1].top - background[0].top) < 1,
      ranges,
    };
  });
  const label = JSON.stringify({ width, fontSize, javaScriptEnabled, ...result });
  assert.equal(result.overflow, false, 'No horizontal scrolling: ' + label);
  assert(result.separateTitleRow && result.titleBeforeMedia && result.mediaCentered, 'Centered title then media: ' + label);
  assert.deepEqual(result.ranges.map(range => range.text), ["Aleksanteri's", 'Portfolio']);
  assert(result.ranges.every(range => range.lines === 1 && range.fits), 'Whole title words fit: ' + label);
  assert(width < 700 ? result.learningStacked : result.learningBeside, 'Learning layout follows reading order: ' + label);
  assert(width < 700 ? result.backgroundStacked : result.backgroundBeside, 'Background text/video layout follows reading order: ' + label);
}

async function selectedPage(widget, index, announce = true) {
  const panels = widget.locator('[data-case-panel]');
  const title = await widget.locator('[data-case-title]').textContent();
  const description = `Page ${index} of 3`;
  assert.deepEqual(await panels.evaluateAll(elements => elements.map(element => getComputedStyle(element).display !== 'none')),
    [1, 2, 3].map(value => value === index), `${title}: exactly the selected content page is visible`);
  const slider = widget.getByRole('slider', { name: `Content page for ${title}` });
  assert.equal(await slider.inputValue(), String(index));
  assert.equal(await slider.getAttribute('aria-valuetext'), description);
  assert(await widget.locator('[data-case-title]').isVisible(), `${title}: the case title stays visible`);
  assert.match(await panels.nth(index - 1).locator('.portfolio-case-copy').textContent(), new RegExp(`Page ${index} content coming soon`));
  assert.match(await panels.nth(index - 1).locator('.portfolio-case-media').textContent(), new RegExp(`Page ${index} media coming soon`));
  if (announce) assert.equal(await widget.locator('[data-case-status]').textContent(), `${title}: ${description}`);
}

async function allPagesReadable(page, mode) {
  assert.equal(await page.locator('portfolio-case').count(), 3, `${mode}: every case remains present`);
  for (const widget of await page.locator('portfolio-case').all()) {
    assert.equal(await widget.locator('[data-case-controls]').isVisible(), false, `${mode}: inactive controls are hidden`);
    assert(await widget.locator('[data-case-title]').isVisible(), `${mode}: each case retains its heading`);
    assert.equal(await widget.locator('[data-case-panel]').count(), 3);
    for (const [index, panel] of (await widget.locator('[data-case-panel]').all()).entries()) {
      assert(await panel.isVisible(), `${mode}: every content page is readable`);
      const heading = panel.locator('.portfolio-case-fallback-heading');
      assert(await heading.isVisible(), `${mode}: every page has a fallback heading`);
      assert.equal(await heading.evaluate(element => element.tagName), 'H3');
      assert.equal(await heading.textContent(), `Page ${index + 1}`);
    }
  }
}

async function sliderStops(widget, selected) {
  const result = await widget.evaluate(element => {
    const rect = node => {
      const bounds = node.getBoundingClientRect();
      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    };
    const slider = element.querySelector('[data-case-slider]');
    const range = element.querySelector('.portfolio-case-range');
    const track = getComputedStyle(range, '::before');
    const rangeBounds = range.getBoundingClientRect();
    return {
      trackLeft: rangeBounds.left + parseFloat(track.left),
      trackRight: rangeBounds.right - parseFloat(track.right),
      accent: getComputedStyle(slider).color,
      slider: rect(slider),
      halo: rect(element.querySelector('.portfolio-case-halo')),
      stops: [...element.querySelectorAll('[data-case-stop]')].map(stop => ({
        ...rect(stop), visible: getComputedStyle(stop).visibility !== 'hidden', color: getComputedStyle(stop).backgroundColor,
      })),
    };
  });
  assert.equal(result.stops.length, 3, 'Three evenly spaced stops belong to the slider line');
  assert.deepEqual(result.stops.map(stop => stop.visible), [1, 2, 3].map(index => index !== selected), 'The handle replaces its gray stop');
  assert(result.stops.every(stop => Math.abs(stop.y - result.slider.y) < 1), 'Gray stops lie on the draggable line');
  assert(Math.abs(result.halo.y - result.slider.y) < 1, 'Glowing handle lies on the draggable line');
  assert(Math.abs(result.halo.x - result.stops[selected - 1].x) < 1, 'Glowing handle aligns with the selected stop');
  assert(Math.abs(result.stops[1].x - (result.stops[0].x + result.stops[2].x) / 2) < 1, 'The middle stop is centered');
  assert(Math.abs(result.trackLeft - result.stops[0].x) < 1, 'Track starts at the first circle center');
  assert(Math.abs(result.trackRight - result.stops[2].x) < 1, 'Track ends at the last circle center');
  for (const [index, stop] of result.stops.entries()) {
    if (!stop.visible) continue;
    if (index < selected - 1) {
      assert.equal(stop.color, result.accent, 'Passed circles use the yellow accent');
      continue;
    }
    const channels = stop.color.match(/[\d.]+/g).slice(0, 3).map(Number);
    assert(Math.max(...channels) - Math.min(...channels) <= 10, 'Upcoming circles are gray');
  }
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  trackErrors(page);
  await page.goto(portfolioUrl);
  await page.locator('portfolio-case[data-enhanced="true"]').last().waitFor();
  await page.evaluate(() => document.fonts.ready);

  const heroVideo = page.locator('.portfolio-hero video');
  assert.equal(await heroVideo.getAttribute('src'), '/videos/portfolio-demo-reel.mp4');
  assert.equal(await heroVideo.getAttribute('aria-label'), 'Portfolio demo reel');
  await page.waitForFunction(() => {
    const video = document.querySelector('.portfolio-hero video');
    return video && !video.paused && video.currentTime > 0 && video.videoWidth > 0 && video.getVideoPlaybackQuality().totalVideoFrames > 0;
  });
  assert.deepEqual(await heroVideo.evaluate(video => [video.autoplay, video.loop, video.muted, video.playsInline, video.controls]),
    [true, true, true, true, true], 'Hero autoplays muted inline with looping and controls');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settled(page);
  assert.equal(await heroVideo.evaluate(video => video.paused && !video.autoplay), true, 'Reduced motion pauses hero autoplay');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.equal(await page.locator('.portfolio-hero .cv-hero-background').count(), 0, 'Portfolio opening has no static CV background image');
  assert.equal(await page.locator('.portfolio-hero').getAttribute('data-network-section'), 'profile', 'Opening uses the first content palette and participates in the network');
  assert.equal(await page.locator('.portfolio-background h1').textContent(), 'background');
  assert.match(await page.locator('.portfolio-background .profile-card').textContent(), /Background text coming soon/);
  assert.equal(await page.locator('.portfolio-background + .portfolio-learning').count(), 1, 'Background precedes Panic Lane');
  const widgets = page.locator('portfolio-case');
  const titles = ['Shattering Platforms', 'A New Drifting Mechanic', 'Driving on a Pipe'];
  assert.equal(await widgets.count(), 3, 'Each case has its own widget');
  assert.equal(await widgets.locator('[data-case-panel]').count(), 9, 'Each case has three content pages');
  assert.equal(await widgets.getByRole('button').count(), 0, 'Numbered buttons are removed');
  assert.deepEqual(await widgets.locator('[data-case-title]').allTextContents(), titles);
  assert.deepEqual(await widgets.locator('.portfolio-case-number').allTextContents(), ['Case 1', 'Case 2', 'Case 3']);
  assert.equal(await page.getByText(/Drag the slider/i).count(), 0, 'Slider instruction text is removed');
  for (const widget of await widgets.all()) {
    assert.equal(await widget.locator('.portfolio-cases-box h2[data-case-title]').count(), 1, 'Case H2 lives inside its widget box');
    assert.equal(await widget.locator('[data-case-panel]').count(), 3);
    assert.equal(await widget.locator('.portfolio-case-fallback-heading:visible').count(), 0, 'Enhanced pages do not duplicate headings');
    await selectedPage(widget, 1, false);
  }
  assert.equal(await page.locator('.portfolio-learning h1.portfolio-section-title').textContent(), 'Panic Lane');
  assert.equal(await page.locator('.cv-history').count(), 1, 'Existing Work and studies remains after the unique sections');
  assert.equal(await page.locator('.cv-profile, .cv-skills, .cv-strengths').count(), 0, 'Replaced and empty CV sections do not leak into the portfolio');
  assert.equal(await page.locator('.portfolio-title-word').evaluate(element => getComputedStyle(element).color), 'rgb(255, 242, 168)', 'Portfolio title starts light yellow');
  await page.locator('.portfolio-hero').evaluate(element => element.style.setProperty('--portfolio-title-color', '#aabbcc'));
  assert.equal(await page.locator('.portfolio-title-word').evaluate(element => getComputedStyle(element).color), 'rgb(170, 187, 204)', 'Portfolio title has its own color control');
  assert.notEqual(await page.locator('.portfolio-owner').evaluate(element => getComputedStyle(element).color), 'rgb(170, 187, 204)', 'Title accent does not recolor the owner name');
  await page.locator('.portfolio-hero').evaluate(element => element.style.setProperty('--portfolio-title-color', '#fff2a8'));

  for (const width of [240, 320, 390, 699, 700, 1440, 1920]) {
    for (const fontSize of [16, 32]) {
      try { await geometry(page, width, fontSize, true); }
      catch (error) { geometryErrors.push(error.message); }
    }
  }
  await page.evaluate(() => document.documentElement.style.fontSize = '16px');
  await page.setViewportSize({ width: 1440, height: 1000 });

  const firstWidget = widgets.nth(0);
  const thirdWidget = widgets.nth(2);
  const slider = firstWidget.getByRole('slider', { name: `Content page for ${titles[0]}` });
  const thirdSlider = thirdWidget.getByRole('slider', { name: `Content page for ${titles[2]}` });
  await selectedPage(firstWidget, 1, false);
  await sliderStops(firstWidget, 1);
  await slider.focus();
  await slider.press('ArrowRight');
  await selectedPage(firstWidget, 2);
  await sliderStops(firstWidget, 2);
  assert.deepEqual(await widgets.locator('[data-case-slider]').evaluateAll(sliders => sliders.map(slider => Number(slider.value))), [2, 1, 1],
    'Changing the first case page leaves the other cases on page one');
  assert(await slider.evaluate(element => element === document.activeElement), 'Keyboard selection retains slider focus');
  await thirdSlider.press('End');
  await selectedPage(thirdWidget, 3);
  await sliderStops(thirdWidget, 3);
  await selectedPage(firstWidget, 2);
  assert.deepEqual(await widgets.locator('[data-case-slider]').evaluateAll(sliders => sliders.map(slider => Number(slider.value))), [2, 1, 3],
    'Each case retains its own page selection');
  await slider.press('End');
  await selectedPage(firstWidget, 3);
  await slider.press('ArrowRight');
  await selectedPage(firstWidget, 3);
  await slider.press('Home');
  await selectedPage(firstWidget, 1);
  await sliderStops(firstWidget, 1);
  await slider.press('ArrowRight');
  await selectedPage(firstWidget, 2);

  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  assert(box && box.width > 100 && box.height >= 44, 'Range has a usable pointer target');
  assert.equal(await slider.evaluate(element => getComputedStyle(element).cursor), 'grab');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await selectedPage(firstWidget, 3);
  await slider.click({ position: { x: 10, y: box.height / 2 } });
  await selectedPage(firstWidget, 1);

  for (const widget of await widgets.all()) {
    assert(await widget.evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running')),
      'Every slider handle has a running glow animation');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  assert.equal(await widgets.evaluateAll(elements => elements.flatMap(element => element.getAnimations({ subtree: true })).filter(animation => animation.playState === 'running').length), 0,
    'Case chooser has no running animation with reduced motion');
  await slider.press('End');
  await selectedPage(firstWidget, 3);
  await page.emulateMedia({ media: 'print' });
  await allPagesReadable(page, 'Print');
  await page.emulateMedia({ media: 'screen', reducedMotion: 'no-preference', forcedColors: 'active' });
  assert.notEqual(await page.locator('.portfolio-title-word').evaluate(element => getComputedStyle(element).color), 'rgba(0, 0, 0, 0)');
  await slider.press('Home');
  await selectedPage(firstWidget, 1);
  await thirdSlider.press('Home');
  await page.emulateMedia({ forcedColors: 'none' });

  if (process.env.PORTFOLIO_SCREENSHOTS) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'ignored-files/portfolio-desktop.png', fullPage: true });
    await firstWidget.screenshot({ path: 'ignored-files/portfolio-case-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'ignored-files/portfolio-mobile.png', fullPage: true });
    await firstWidget.screenshot({ path: 'ignored-files/portfolio-case-mobile.png' });
  }

  // Inject only formatting fixtures; actual source parsing has a separate unit suite.
  for (const [route, sectionSelector] of [['/cv', '.cv-profile'], ['/cv-fi', '.cv-profile'], ['/en/portfolio', '.portfolio-learning']]) {
    await page.goto(base + route);
    const result = await page.locator(sectionSelector).evaluate(section => {
      section.style.setProperty('--cv-accent-color', '#aabbcc');
      const fixture = document.createElement('p');
      for (const tag of ['strong', 'b', 'em', 'i', 'a']) {
        const element = document.createElement(tag);
        element.textContent = 'Formatting';
        if (tag === 'a') { element.className = 'inline-link'; element.href = '#main'; }
        fixture.append(element);
      }
      section.append(fixture);
      const result = {
        colors: [...fixture.children].map(element => getComputedStyle(element).color),
        underline: getComputedStyle(fixture.querySelector('a')).textDecorationLine,
        marker: getComputedStyle(section.querySelector('li'), '::marker').color,
      };
      fixture.remove();
      section.style.removeProperty('--cv-accent-color');
      return result;
    });
    assert(result.colors.every(color => color === 'rgb(170, 187, 204)'), `${route}: shared bold/italic/link accent`);
    assert.equal(result.marker, 'rgb(170, 187, 204)', `${route}: checkmarks use the same accent`);
    assert.match(result.underline, /underline/, `${route}: links retain underlining`);
  }

  for (const [route, lang] of [['/', 'en'], ['/en/portfolio', 'en'], ['/en/blog', 'en'], ['/cv', 'en'], ['/cv-fi', 'fi']]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://rongonen.fi${route}`);
    assert.equal(await page.locator('a[href="/cv"], a[href="/cv-fi"], link[rel="alternate"][hreflang]').count(), 0, `${route}: CVs stay orphaned`);
    if (route === '/en/portfolio') {
      assert.match(await page.title(), /Aleksanteri's Portfolio/);
      assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /Panic Lane/);
      assert.equal(await page.getByRole('navigation').getByRole('link', { name: 'Portfolio' }).getAttribute('aria-current'), 'page');
    }
  }
  await context.close();

  // Simulate supplied case videos before page scripts initialize. No remote media needed.
  const mediaContext = await browser.newContext({ reducedMotion: 'no-preference' });
  const mediaPage = await mediaContext.newPage();
  trackErrors(mediaPage);
  await mediaPage.route(portfolioUrl, async route => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll('<div class="portfolio-case-media">',
      '<div class="portfolio-case-media"><video data-portfolio-video loop muted playsinline controls></video>');
    await route.fulfill({ response, body });
  });
  await mediaPage.goto(portfolioUrl);
  await mediaPage.locator('portfolio-case[data-enhanced="true"]').last().waitFor();
  const videoAutoplay = () => mediaPage.locator('[data-case-panel] video').evaluateAll(videos => videos.map(video => video.autoplay));
  assert.deepEqual(await videoAutoplay(), [true, false, false, true, false, false, true, false, false], 'Each case autoplays only its visible content page');
  await mediaPage.getByRole('slider').first().press('End');
  assert.deepEqual(await videoAutoplay(), [false, false, true, true, false, false, true, false, false], 'Changing a content page only transfers autoplay within its own case');
  await mediaPage.getByRole('slider').last().press('ArrowRight');
  assert.deepEqual(await videoAutoplay(), [false, false, true, true, false, false, false, true, false], 'The third case controls its videos independently');
  await mediaPage.emulateMedia({ reducedMotion: 'reduce' });
  await settled(mediaPage);
  assert.deepEqual(await videoAutoplay(), Array(9).fill(false), 'Reduced motion disables autoplay in every case');
  await mediaPage.emulateMedia({ reducedMotion: 'no-preference' });
  await settled(mediaPage);
  assert.deepEqual(await videoAutoplay(), [false, false, true, true, false, false, false, true, false], 'Restoring motion only autoplays the selected page in each case');
  await mediaContext.close();

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  const fallback = await noJs.newPage();
  trackErrors(fallback);
  await fallback.goto(portfolioUrl);
  await allPagesReadable(fallback, 'No JavaScript');
  for (const width of [240, 390, 700, 1440]) {
    for (const fontSize of [16, 32]) {
      try { await geometry(fallback, width, fontSize, false); }
      catch (error) { geometryErrors.push(error.message); }
    }
  }
  await noJs.close();
  assert.deepEqual(errors, [], 'No browser errors');
  assert.deepEqual(geometryErrors, [], 'Responsive layouts');
  console.log('Portfolio responsive title/media, independent case pages, keyboard/pointer interactions, accessibility fallbacks, shared accents and route metadata PASS');
} finally { await browser.close(); }
