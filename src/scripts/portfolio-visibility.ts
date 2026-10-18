// One observer and document listener serve decorative effects in all widgets.
const widgets = new Map<HTMLElement, { visible: boolean; attribute: string; onHide?: () => void }>();

function update(element: HTMLElement) {
  const state = widgets.get(element);
  if (!state) return;
  const active = state.visible && !document.hidden;
  element.setAttribute(state.attribute, String(active));
  if (!active) state.onHide?.();
}

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const element = entry.target as HTMLElement;
    const state = widgets.get(element);
    if (!state) continue;
    state.visible = entry.isIntersecting;
    update(element);
  }
});

document.addEventListener('visibilitychange', () => {
  for (const element of widgets.keys()) update(element);
});

export function observePortfolioVisibility(element: HTMLElement, attribute: string, onHide?: () => void) {
  widgets.set(element, { visible: false, attribute, onHide });
  update(element);
  observer.observe(element);
  return () => {
    observer.unobserve(element);
    widgets.delete(element);
    element.removeAttribute(attribute);
  };
}
