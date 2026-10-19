export {};

// Sources stay inside inert templates until the selected content approaches the
// viewport. The browser's lazy-loading hints alone can fetch far below the fold.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const print = matchMedia('print');
const lead = 150;

interface MediaState {
  host: HTMLElement;
  inViewport: boolean;
  video?: HTMLVideoElement;
  frame?: HTMLIFrameElement;
  frameReady: boolean;
  framePlaying: boolean;
  frameVisible: boolean;
  userPaused: boolean;
  automaticPause: boolean;
  playPending: boolean;
  playInterrupted: boolean;
}

const states = new Map<HTMLElement, MediaState>();

function selected(host: HTMLElement) {
  if (host.closest('[hidden]')) return false;
  // Guard initial upgrade order for carousels as well as case sliders.
  const slide = host.closest<HTMLElement>('[data-carousel-panel]');
  if (slide && slide.dataset.carouselPage !== (host.closest<HTMLElement>('portfolio-carousel')?.dataset.carouselSelected || '1')) return false;
  // Also guard the interval before the case custom element has upgraded.
  const panel = host.closest<HTMLElement>('[data-case-panel]');
  const slider = host.closest('portfolio-case')?.querySelector<HTMLInputElement>('[data-case-slider]');
  return !panel || panel.dataset.casePage === (slider?.value || '1');
}

// Embedded players never autoplay, but one the visitor started must stop
// once it can no longer be seen. YouTube's postMessage protocol does this
// without loading its separate API script: announce that the page is
// listening, then the player reports readiness and its playing state.
const post = (frame: HTMLIFrameElement, message: object) =>
  frame.contentWindow?.postMessage(JSON.stringify(message), new URL(frame.src).origin);

function connectFrame(state: MediaState, frame: HTMLIFrameElement) {
  state.frame = frame;
  let attempts = 0;
  // The player may attach its listener just after load. Retry briefly, as
  // YouTube's own API does, and stop at the first reply. Messages sent
  // before the player document exists are dropped by the origin check.
  const announce = () => {
    if (state.frameReady || ++attempts > 20) return;
    post(frame, { event: 'listening' });
    setTimeout(announce, 250);
  };
  frame.addEventListener('load', () => {
    state.frameReady = false;
    state.framePlaying = false;
    attempts = 0;
    announce();
  });
  announce();
}

addEventListener('message', event => {
  if (typeof event.data !== 'string') return;
  for (const state of states.values()) {
    const frame = state.frame;
    if (!frame || frame.contentWindow !== event.source || new URL(frame.src).origin !== event.origin) continue;
    let message: { info?: { playerState?: unknown } };
    try { message = JSON.parse(event.data); } catch { return; }
    state.frameReady = true;
    const playerState = message.info?.playerState;
    // 1 is playing and 3 buffering; other states cannot produce sound.
    if (typeof playerState === 'number') state.framePlaying = playerState === 1 || playerState === 3;
    // Covers a start that raced a card change or scroll before readiness.
    if (state.framePlaying && !state.frameVisible) pause(state);
    return;
  }
});

// A fullscreen player has left the page layout, so the observers no longer
// describe whether it can be seen. Mobile browsers also reflow and often
// rotate the page underneath it. iPhone video fullscreen uses its own API.
function fullscreen(state: MediaState) {
  const media = state.video ?? state.frame;
  if (!media) return false;
  if ((media as HTMLVideoElement & { webkitDisplayingFullscreen?: boolean }).webkitDisplayingFullscreen) return true;
  const element = document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
  return !!element?.contains(media);
}

function pause(state: MediaState) {
  const frame = state.frame;
  // Commands before readiness throw inside the player.
  if (frame && state.frameReady && state.framePlaying) {
    post(frame, { event: 'command', func: 'pauseVideo', args: [] });
  }
  const video = state.video;
  if (video && !video.paused) {
    if (state.playPending) state.playInterrupted = true;
    // pause events are queued; keep this flag until that event is delivered.
    state.automaticPause = true;
    video.pause();
  }
}

function updatePlayback(state: MediaState) {
  const full = fullscreen(state);
  const visible = (full || (state.inViewport && selected(state.host))) && !document.hidden && !print.matches;
  if (state.frame) {
    state.frameVisible = visible;
    if (!visible) pause(state);
    return;
  }
  const video = state.video;
  if (!video) return;
  video.autoplay = visible && !reducedMotion.matches && !state.userPaused;
  // Leave a visitor's fullscreen playback alone, also with reduced motion.
  if (!video.autoplay) {
    if (!visible || !full) pause(state);
  } else if (video.paused && !state.playPending) {
    state.playPending = true;
    void video.play().catch(() => {}).finally(() => {
      state.playPending = false;
      // A rapid away/back slide change can interrupt play before it settles,
      // without changing the final intersection. Reconcile that change once;
      // rejected autoplay on its own must not start an endless retry loop.
      if (state.playInterrupted) {
        state.playInterrupted = false;
        updatePlayback(state);
      }
    });
  }
}

function prepareVideo(state: MediaState, video: HTMLVideoElement) {
  state.video = video;
  video.preload = 'metadata';
  if (video.hasAttribute('data-reveal-controls')) {
    video.controls = false;
    video.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') video.controls = true;
    });
    video.addEventListener('pointerleave', () => {
      if (document.activeElement !== video) video.controls = false;
    });
    video.addEventListener('pointerdown', () => { video.controls = true; });
    video.addEventListener('focus', () => { video.controls = true; });
    video.addEventListener('blur', () => {
      if (!video.matches(':hover')) video.controls = false;
    });
  }
  video.addEventListener('pause', () => {
    if (state.automaticPause) state.automaticPause = false;
    else {
      state.userPaused = true;
      video.autoplay = false;
    }
  });
  video.addEventListener('play', () => {
    state.userPaused = false;
    // Native controls still allow deliberate playback with reduced motion.
    if ((!fullscreen(state) && (!state.inViewport || !selected(state.host))) || document.hidden || print.matches) pause(state);
  });
  // iPhone fullscreen fires no document event. Reconcile once it closes.
  video.addEventListener('webkitendfullscreen', () => refresh(state));
}

function load(state: MediaState, printing = false) {
  const { host } = state;
  const template = host.querySelector<HTMLTemplateElement>('template[data-media-template]');
  if (template) {
    if (printing && !template.content.querySelector('img')) return;
    if (!printing && !selected(host)) return;
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const image = fragment.querySelector('img');
    // The observer already supplies the loading distance. Don't let a second
    // browser heuristic postpone a selected slide or an image needed in print.
    if (image) image.loading = 'eager';
    const frame = fragment.querySelector('iframe');
    if (frame) {
      frame.loading = 'eager';
      connectFrame(state, frame);
    }
    const video = fragment.querySelector('video');
    if (video) {
      prepareVideo(state, video);
    }
    template.replaceWith(fragment);
  } else if (!state.video && !state.frame) {
    const video = host.querySelector('video');
    if (video) prepareVideo(state, video);
    const frame = host.querySelector('iframe');
    if (frame) connectFrame(state, frame);
  }
  host.dataset.mediaLoaded = 'true';
  loadObserver.unobserve(host);
  updatePlayback(state);
}

const loadObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const state = states.get(entry.target as HTMLElement);
    if (state && entry.isIntersecting && !document.hidden) load(state, print.matches);
  }
}, { rootMargin: `${lead}px 0px` });

const playbackObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const state = states.get(entry.target as HTMLElement);
    if (!state) continue;
    state.inViewport = entry.isIntersecting && entry.intersectionRect.height > 0 && entry.intersectionRect.width > 0;
    updatePlayback(state);
  }
}, { threshold: [0, 0.001] });

for (const host of document.querySelectorAll<HTMLElement>('[data-portfolio-media]')) {
  const state: MediaState = { host, inViewport: false, frameReady: false, framePlaying: false, frameVisible: false, userPaused: false, automaticPause: false, playPending: false, playInterrupted: false };
  states.set(host, state);
  loadObserver.observe(host);
  playbackObserver.observe(host);
  if (host.hasAttribute('data-media-eager')) load(state);
}

// Only explicit page selection needs a synchronous geometry check. Scrolling
// uses the two shared observers, without layout reads in a scroll handler.
function refresh(state: MediaState) {
  if (selected(state.host) && !document.hidden) {
    const rect = state.host.getBoundingClientRect();
    const carousel = state.host.closest('[data-carousel-viewport]')?.getBoundingClientRect();
    state.inViewport = rect.height > 0 && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight
      && rect.right > (carousel?.left ?? 0) && rect.left < (carousel?.right ?? innerWidth);
    // pageshow can arrive late, after printing began; print loads only images.
    if (rect.bottom > -lead && rect.top < innerHeight + lead) load(state, print.matches);
  } else state.inViewport = false;
  updatePlayback(state);
}

document.addEventListener('portfolio:pagechange', event => {
  for (const state of states.values()) {
    if (event.target instanceof Element && event.target.contains(state.host)) refresh(state);
  }
});
document.addEventListener('visibilitychange', () => {
  for (const state of states.values()) {
    if (document.hidden) updatePlayback(state);
    else refresh(state);
  }
});
// Returning from fullscreen restores the page layout without necessarily
// crossing an observer threshold.
for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(type, () => {
    for (const state of states.values()) refresh(state);
  });
}
reducedMotion.addEventListener('change', () => {
  for (const state of states.values()) updatePlayback(state);
});

function preparePrint() {
  for (const state of states.values()) {
    pause(state);
    // Print CSS exposes all case panels. Only still images need fetching.
    if (state.host.querySelector('template[data-media-template]')) load(state, true);
  }
}
window.addEventListener('beforeprint', preparePrint);
print.addEventListener('change', () => {
  if (print.matches) preparePrint();
  else for (const state of states.values()) refresh(state);
});
window.addEventListener('pageshow', () => {
  for (const state of states.values()) refresh(state);
});
