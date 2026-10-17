import { alignSectionText } from './cv-section-spacing';
import { startHeadingBackdrops } from './heading-backdrops';
import { boxNoiseTilePixels, cvDesign } from '../data/cv-design';
alignSectionText();
startHeadingBackdrops();

// Boxes scroll with the page. Offset the repeating texture inside each box so
// its apparent screen travel matches the configured fraction of page travel.
if (cvDesign.boxes.noise.mix > 0 && cvDesign.boxes.noise.contrast > 0 && cvDesign.boxes.noise.scrollMovement !== 1 && document.querySelector('.glass')) {
  const tileSize = boxNoiseTilePixels * Math.max(0.25, Math.min(4, cvDesign.boxes.noise.scale));
  const movement = Math.max(0, Math.min(2, cvDesign.boxes.noise.scrollMovement));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
  const textureMoves = () => !reducedMotion.matches && !reducedTransparency.matches;
  let noiseFrame = 0;
  const updateNoise = () => {
    noiseFrame = 0;
    if (!textureMoves()) return;
    const offset = window.scrollY * (1 - movement);
    const wrapped = ((offset % tileSize) + tileSize) % tileSize;
    document.documentElement.style.setProperty('--cv-noise-scroll-shift', `${wrapped}px`);
  };
  const scheduleNoise = () => {
    if (!noiseFrame && textureMoves()) noiseFrame = requestAnimationFrame(updateNoise);
  };
  window.addEventListener('scroll', scheduleNoise, { passive: true });
  window.addEventListener('pageshow', scheduleNoise);
  const onPreferenceChange = () => {
    if (!textureMoves()) {
      cancelAnimationFrame(noiseFrame);
      noiseFrame = 0;
      document.documentElement.style.removeProperty('--cv-noise-scroll-shift');
    } else scheduleNoise();
  };
  reducedMotion.addEventListener('change', onPreferenceChange);
  reducedTransparency.addEventListener('change', onPreferenceChange);
  scheduleNoise();
}

// Keep each name word intact, fitting the actual rendered font to its column.
// The heading's own width/font stay stable so fitting cannot shrink its grid track.
const name = document.querySelector<HTMLElement>('.hero-copy h1');
if (name) {
  const words = Array.from(name.querySelectorAll<HTMLElement>('.cv-name-word'));
  const fitName = () => {
    name.style.setProperty('--cv-name-font-size', '1em');
    const available = name.getBoundingClientRect().width;
    const widest = Math.max(...words.map(word => word.getBoundingClientRect().width));
    const preferred = parseFloat(getComputedStyle(name).fontSize);
    if (available > 0 && widest > available) {
      name.style.setProperty('--cv-name-font-size', `${preferred * (available - 1) / widest}px`);
    }
  };
  new ResizeObserver(fitName).observe(name);
  document.fonts.ready.then(fitName);
  document.fonts.addEventListener('loadingdone', fitName);
  window.addEventListener('resize', fitName);
  fitName();
}

// The image cannot affect grid sizing, so measuring the actual hero height
// also handles enlarged text without a resize feedback loop or scroll work.
const heroInner = document.querySelector<HTMLElement>('.hero-inner');
if (heroInner) {
  const observer = new ResizeObserver(([entry]) => {
    heroInner.style.setProperty('--hero-height', `${entry.contentRect.height}px`);
  });
  observer.observe(heroInner);
}

const scrollCue = document.querySelector<HTMLElement>('.cv-scroll-cue');
if (scrollCue) {
  const updateScrollCue = () => {
    // A deliberate scroll: a quarter-screen, bounded for short/tall viewports.
    const threshold = Math.max(120, Math.min(240, window.innerHeight * .25));
    scrollCue.classList.toggle('is-paused', window.scrollY >= threshold || document.hidden);
  };
  window.addEventListener('scroll', updateScrollCue, { passive: true });
  window.addEventListener('resize', updateScrollCue);
  window.addEventListener('pageshow', updateScrollCue);
  document.addEventListener('visibilitychange', updateScrollCue);
  updateScrollCue();
}

// Small progressive enhancement: pack uneven cards while keeping the DOM in
// left/right reading order. Without JS, the same cards form a regular grid.
for (const stack of document.querySelectorAll<HTMLElement>('[data-card-stack]')) {
  const cards = Array.from(stack.querySelectorAll<HTMLElement>('.cv-card'));
  const observer = new ResizeObserver(() => {
    const desktop = window.matchMedia('(min-width: 700px)').matches;
    stack.classList.toggle('is-packed', desktop);
    const nextRow = [1, 1];
    for (const [index, card] of cards.entries()) {
      const column = index % 2;
      const span = Math.ceil(card.getBoundingClientRect().height);
      // Leave a gap only between cards, never after the last card in a column.
      card.style.gridRow = desktop ? `${nextRow[column]} / span ${span}` : '';
      nextRow[column] += span + 24;
    }
  });
  for (const card of cards) observer.observe(card);
  observer.observe(stack);
}
