import { cvDesign } from '../data/cv-design';

/** Static gradient patches; measure only on layout/font changes, never scroll. */
export function startHeadingBackdrops() {
  const main = document.querySelector('main');
  const config = cvDesign.headings.backdrop;
  const opacity = Math.max(0, Math.min(1, config.opacity));
  if (!main || !opacity || main.querySelector('.cv-heading-backdrops')) return;
  const headings = Array.from(main.querySelectorAll<HTMLElement>(
    '.cv-network-section:not(.cv-hero) > .cv-container > :is(h1, h2)',
  ));
  if (!headings.length) return;

  const layer = document.createElement('div');
  layer.className = 'cv-heading-backdrops';
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  layer.style.setProperty('--heading-backdrop-color', config.color);
  layer.style.setProperty('--heading-backdrop-stop', `${Math.max(0, Math.min(100, config.solidStop))}%`);
  const patches = headings.map(() => {
    const patch = document.createElement('div');
    patch.style.opacity = String(opacity);
    layer.append(patch);
    return patch;
  });
  main.append(layer);

  const range = document.createRange();
  const update = () => {
    const origin = main.getBoundingClientRect();
    // Measure actual text, not full-width heading boxes. Read all geometry before writes.
    const bounds = headings.map(heading => {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const rects: DOMRect[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        range.selectNodeContents(node);
        rects.push(...Array.from(range.getClientRects()).filter(rect => rect.width && rect.height));
      }
      if (!rects.length) return null;
      const left = Math.min(...rects.map(rect => rect.left));
      const top = Math.min(...rects.map(rect => rect.top));
      // Union all text rows before resolving percentages: one backdrop per heading.
      const width = Math.max(...rects.map(rect => rect.right)) - left;
      const height = Math.max(...rects.map(rect => rect.bottom)) - top;
      const paddingX = width * Math.max(0, config.paddingX) / 100;
      const paddingY = height * Math.max(0, config.paddingY) / 100;
      return {
        left: `${left - origin.left - paddingX + width * config.offsetX / 100}px`,
        top: `${top - origin.top - paddingY + height * config.offsetY / 100}px`,
        width: `${width + paddingX * 2}px`,
        height: `${height + paddingY * 2}px`,
      };
    });
    bounds.forEach((rect, index) => {
      patches[index].hidden = !rect;
      if (rect) Object.assign(patches[index].style, rect);
    });
  };

  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); });
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(main);
  for (const heading of headings) observer.observe(heading);
  window.addEventListener('resize', schedule);
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  update();
}
