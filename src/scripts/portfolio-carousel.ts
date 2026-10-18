import { observePortfolioVisibility } from './portfolio-visibility';

interface Gesture {
  id: number;
  x: number;
  y: number;
  origin: number;
  dragging: boolean;
  samples: { x: number; time: number }[];
}

class PortfolioCarousel extends HTMLElement {
  cleanup?: () => void;

  connectedCallback() {
    this.cleanup?.();
    const panels = Array.from(this.querySelectorAll<HTMLElement>('[data-carousel-panel]'));
    const viewport = this.querySelector<HTMLElement>('[data-carousel-viewport]');
    const track = this.querySelector<HTMLElement>('[data-carousel-track]');
    const status = this.querySelector<HTMLElement>('[data-carousel-status]');
    const previous = this.querySelector<HTMLButtonElement>('[data-carousel-accessible-previous]');
    const next = this.querySelector<HTMLButtonElement>('[data-carousel-accessible-next]');
    if (!panels.length || !viewport || !track || !status) return;

    const controller = new AbortController();
    const { signal } = controller;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const interactive = 'button, a, input, textarea, select, video, iframe, [contenteditable]';
    let selected = Math.max(0, Math.min(panels.length - 1, Number(this.dataset.carouselSelected || 1) - 1));
    let shown = -1;
    let step = 0;
    let inset = 0;
    let position = 0;
    let gesture: Gesture | undefined;
    let animation: Animation | undefined;
    let frame = 0;
    let suppressClick = false;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const transform = (value: number) => `translate3d(${inset - value}px, 0, 0)`;
    const paint = () => { frame = 0; track.style.transform = transform(position); };
    const queuePaint = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const clearMotion = () => {
      animation?.cancel();
      animation = undefined;
      cancelAnimationFrame(frame);
      frame = 0;
      delete this.dataset.carouselMoving;
    };
    const releaseCapture = () => {
      const current = gesture;
      gesture = undefined;
      if (current && viewport.hasPointerCapture(current.id)) viewport.releasePointerCapture(current.id);
      delete this.dataset.carouselDragging;
    };
    const updateSelection = (index: number) => {
      // Taps, vertical scrolls and snap-backs settle on the shown card. Skip the
      // redundant attribute writes, status re-announcement and media refresh.
      if (index === shown) return;
      shown = index;
      const focus = document.activeElement;
      if (focus && panels.some((panel, page) => page !== index && panel.contains(focus))) viewport.focus({ preventScroll: true });
      selected = index;
      this.dataset.carouselSelected = String(index + 1);
      panels.forEach((panel, page) => {
        const active = page === index;
        panel.dataset.carouselActive = String(active);
        panel.inert = !active;
        if (active) panel.removeAttribute('aria-hidden');
        else panel.setAttribute('aria-hidden', 'true');
      });
      status.textContent = `Small win ${index + 1} of ${panels.length}`;
      if (previous) previous.disabled = index === 0;
      if (next) next.disabled = index === panels.length - 1;
      this.dispatchEvent(new Event('portfolio:pagechange', { bubbles: true }));
    };
    // Read the current compositor position only when a visitor interrupts a
    // settle. Drag frames use cached dimensions and one transform write.
    const interrupt = () => {
      if (animation) position = inset - new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
      clearMotion();
      paint();
    };
    const settle = (value: number, velocity = 0, animate = true) => {
      interrupt();
      releaseCapture();
      const index = clamp(value, 0, panels.length - 1);
      const from = position;
      const to = index * step;
      const distance = Math.abs(to - from);
      position = to;
      paint();
      if (!animate || reducedMotion.matches || this.dataset.carouselInView !== 'true' || distance < 1) {
        updateSelection(index);
        return;
      }

      // Match the release speed, then decelerate to zero at the destination.
      // A cubic with a bounded initial slope never overshoots an endpoint.
      const along = Math.sign(to - from) * velocity;
      const duration = clamp(along > .1 ? distance / along * 2.5 : 340 + distance * .25, 320, 1100);
      const slope = along > .1 ? clamp(along * duration / distance, 0, 3) : 2.5;
      this.dataset.carouselMoving = 'true';
      const current = track.animate([
        { transform: transform(from) }, { transform: transform(to) },
      ], { duration, easing: `cubic-bezier(0.333333, ${slope / 3}, 0.666667, 1)` });
      animation = current;
      updateSelection(index);
      current.onfinish = () => {
        if (animation !== current) return;
        clearMotion();
        // Reconcile visibility after travel, including a large momentum jump.
        this.dispatchEvent(new Event('portfolio:pagechange', { bubbles: true }));
      };
    };
    const finishImmediately = () => {
      clearMotion();
      releaseCapture();
      position = selected * step;
      paint();
    };
    const measure = () => {
      // Width and gap are invalidated by resizing/font changes, never scrolling.
      const width = panels[0].getBoundingClientRect().width;
      step = width + parseFloat(getComputedStyle(track).columnGap);
      inset = (viewport.clientWidth - width) / 2;
      finishImmediately();
    };

    viewport.tabIndex = 0;
    viewport.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End');
    this.dataset.enhanced = 'true';
    measure();
    updateSelection(selected);
    for (const control of [previous, next]) if (control) control.hidden = panels.length < 2;
    previous?.addEventListener('click', () => settle(selected - 1), { signal });
    next?.addEventListener('click', () => settle(selected + 1), { signal });
    const stopObserving = observePortfolioVisibility(this, 'data-carousel-in-view', finishImmediately);
    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    document.fonts?.addEventListener('loadingdone', measure, { signal });

    viewport.addEventListener('keydown', event => {
      if ((event.target as Element).closest(interactive)) return;
      const destinations: Record<string, number> = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: panels.length - 1 };
      if (!(event.key in destinations) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      settle(destinations[event.key]);
    }, { signal });
    viewport.addEventListener('pointerdown', event => {
      suppressClick = false;
      if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest(interactive)) return;
      interrupt();
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: position, dragging: false, samples: [{ x: event.clientX, time: event.timeStamp }] };
    }, { passive: true, signal });
    viewport.addEventListener('pointermove', event => {
      const current = gesture;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (!current.dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { settle(Math.round(position / step)); return; }
        current.dragging = true;
        viewport.setPointerCapture(event.pointerId);
        // Script focus during a touch drag matches :focus-visible and would show
        // the keyboard outline. Mouse presses already focus the viewport.
        if (event.pointerType === 'mouse') viewport.focus({ preventScroll: true });
        this.dataset.carouselDragging = 'true';
        this.dataset.carouselMoving = 'true';
        window.getSelection()?.removeAllRanges();
      }
      event.preventDefault();
      const raw = current.origin - dx;
      const bound = clamp(raw, 0, (panels.length - 1) * step);
      // Gentle resistance at the finite ends; never reveal a wrapped card.
      position = bound + (raw - bound) * .18;
      current.samples.push({ x: event.clientX, time: event.timeStamp });
      current.samples = current.samples.filter(sample => event.timeStamp - sample.time <= 100);
      queuePaint();
    }, { signal });
    const endGesture = (event: PointerEvent, cancelled = false) => {
      const current = gesture;
      if (!current || current.id !== event.pointerId) return;
      if (!current.dragging) { releaseCapture(); settle(Math.round(position / step)); return; }
      suppressClick = !cancelled;
      const recent = current.samples.filter(sample => event.timeStamp - sample.time <= 100);
      const first = recent[0];
      const elapsed = first ? event.timeStamp - first.time : 0;
      const velocity = !cancelled && first && elapsed > 8 ? clamp((first.x - event.clientX) / elapsed, -6, 6) : 0;
      // Project a short coast from recent movement, so a deliberate slow drag
      // stays precise and a quick flick can cover several cards at once.
      const destination = Math.round((position + (Math.abs(velocity) > .25 ? velocity * 300 : 0)) / step);
      settle(destination, velocity);
    };
    viewport.addEventListener('pointerup', event => endGesture(event), { signal });
    viewport.addEventListener('pointercancel', event => endGesture(event, true), { signal });
    viewport.addEventListener('lostpointercapture', event => {
      // Touch starts with implicit capture on the touched descendant. Its
      // bubbling loss during transfer to the viewport is not a cancelled drag.
      if (event.target === viewport) endGesture(event, true);
    }, { signal });
    window.addEventListener('pointerup', event => endGesture(event), { signal });
    viewport.addEventListener('dragstart', event => { if (!(event.target as Element).closest(interactive)) event.preventDefault(); }, { signal });
    viewport.addEventListener('click', event => {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, { capture: true, signal });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishImmediately(); }, { signal });
    window.addEventListener('beforeprint', finishImmediately, { signal });

    this.cleanup = () => {
      finishImmediately();
      resize.disconnect();
      stopObserving();
      controller.abort();
    };
  }

  disconnectedCallback() { this.cleanup?.(); }
}

if (!customElements.get('portfolio-carousel')) customElements.define('portfolio-carousel', PortfolioCarousel);
