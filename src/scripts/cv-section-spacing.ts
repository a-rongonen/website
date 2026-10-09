/** Align exposed text ink with the shared section inset, including accents.
 * Measurements run only on resize, text/font changes; never on scrolling. */
export function alignSectionText() {
  if (!CSS.supports('text-box', 'trim-both cap alphabetic')) return;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return;
  const elements = Array.from(document.querySelectorAll<HTMLElement>(
    '.cv-section > .cv-container > :is(h1, h2, h3, h4, h5, h6, p):is(:first-child, :last-child)',
  ));
  const range = document.createRange();

  function edgeLines(element: HTMLElement) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let top: number | undefined;
    let first: string | undefined;
    let text = '';
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      let offset = 0;
      for (const character of node.textContent || '') {
        range.setStart(node, offset);
        offset += character.length;
        range.setEnd(node, offset);
        const bounds = range.getBoundingClientRect();
        if (!bounds.height) continue;
        if (top === undefined) top = bounds.top;
        else if (bounds.top > top + 1) {
          first ??= text;
          text = '';
          top = bounds.top;
        }
        text += character;
      }
    }
    return { first: first ?? text, last: text };
  }

  let frame = 0;
  function update() {
    frame = 0;
    // Batch layout reads before writing corrections to avoid layout thrashing.
    const corrections = elements.map(element => {
      const style = getComputedStyle(element);
      const lines = edgeLines(element);
      const transform = (text: string) => style.textTransform === 'uppercase'
        ? text.toLocaleUpperCase(document.documentElement.lang)
        : style.textTransform === 'lowercase'
          ? text.toLocaleLowerCase(document.documentElement.lang) : text;
      context!.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const cap = context!.measureText('H').actualBoundingBoxAscent;
      return {
        start: element.matches(':first-child')
          ? Math.ceil(context!.measureText(transform(lines.first)).actualBoundingBoxAscent - cap) : 0,
        end: element.matches(':last-child')
          ? Math.ceil(context!.measureText(transform(lines.last)).actualBoundingBoxDescent) : 0,
      };
    });
    elements.forEach((element, index) => {
      for (const [property, correction] of [
        ['--cv-text-overhang', corrections[index].start],
        ['--cv-text-descent', corrections[index].end],
      ] as const) {
        const value = `${correction}px`;
        if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
      }
      element.classList.add('has-edge-trim');
    });
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  const resize = new ResizeObserver(schedule);
  const mutations = new MutationObserver(schedule);
  for (const element of elements) {
    resize.observe(element);
    mutations.observe(element, { childList: true, characterData: true, subtree: true });
  }
  void document.fonts.ready.then(schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  schedule();
}
