import { cvNetworkConfig as config, networkPalette, networkTransitionNeighbors, type NetworkSection } from '../data/cv-network';
import { clamp, createScene, createDepthOrder, depthBrightness, projectPoint } from './cv-network-scene';
import { createNetworkGpu } from './cv-network-webgl';

type ProjectedNode = { x: number; y: number; radius: number; brightness: number };
type PaletteBand = {
  element: HTMLElement;
  top: number;
  height: number;
  rgb: number[];
  previousRgb: number[];
  nextRgb: number[];
  fadeIn: boolean;
  fadeOut: boolean;
  visibleRanges: { top: number; height: number }[];
  transition: number;
  invisible: boolean;
};

const rgbChannels = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));

export function startNetwork(host: HTMLElement): () => void {
  let canvas = host.querySelector('canvas');
  if (!canvas) return () => {};
  let gpu = createNetworkGpu(canvas);
  let context: CanvasRenderingContext2D | null = null;
  const useCanvasFallback = () => {
    gpu?.dispose();
    gpu = null;
    const replacement = document.createElement('canvas');
    canvas!.replaceWith(replacement);
    canvas = replacement;
    context = canvas.getContext('2d');
  };
  if (!gpu) useCanvasFallback();
  if (!gpu && !context) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const print = window.matchMedia('print');
  const abort = new AbortController();
  const events = { signal: abort.signal };
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let mobile: boolean | undefined;
  let geometry: ReturnType<typeof createScene> = { nodes: [], edges: [] };
  const projected: ProjectedNode[] = [];
  let depthOrder = createDepthOrder(geometry.nodes);
  const bands: PaletteBand[] = Array.from(document.querySelectorAll<HTMLElement>('[data-network-section]')).map(element => {
    const section = element.dataset.networkSection as NetworkSection;
    const palette = networkPalette(section);
    const neighbors = networkTransitionNeighbors(section);
    return { element, top: 0, height: 0,
      previousRgb: rgbChannels(networkPalette(neighbors.previous).baseColor),
      nextRgb: rgbChannels(networkPalette(neighbors.next).baseColor),
      fadeIn: neighbors.previous !== section, fadeOut: neighbors.next !== section, visibleRanges: [], transition: 0, rgb: rgbChannels(palette.baseColor),
      invisible: [palette.baseColor, palette.centerColor, palette.edgeColor].every(color => color.toLowerCase() === '#000000') };
  });
  const visiblePalettes = bands.map(band => !band.invisible);
  bands.forEach((band, index) => {
    if (config.sectionTransition > 0 && ((band.fadeIn && visiblePalettes[index - 1])
      || (band.fadeOut && visiblePalettes[index + 1]))) band.invisible = false;
  });
  let frame = 0;
  let elapsed = 0;
  let previousTime = 0;
  let disposed = false;

  const world = {
    width: Math.max(1, config.scene.width),
    height: Math.max(1, config.scene.height),
    depth: Math.max(1, config.scene.depth),
  };
  // Keep repeat spacing independent of the camera's framing dimensions.
  const repeatHeight = config.verticalRepeat.enabled ? Math.max(100, config.verticalRepeat.height) : world.height;
  // Rotation is around the vertical axis; translated rows never affect depth.
  const sceneRadius = Math.hypot(world.width, world.height, world.depth) / 2;
  const cameraDistance = Math.max(config.cameraDistance, sceneRadius + 20);
  const lineWidth = clamp(config.lineWidth, 0, 8);
  const nodeSize = clamp(config.nodeSize, 0, 20);
  const continuous = () => config.motion.enabled && !reducedMotion.matches
    && (config.motion.drift !== 0 || config.motion.autoRotation !== 0);

  function requestDraw() {
    if (!disposed && !frame && !document.hidden && !print.matches) frame = requestAnimationFrame(draw);
  }

  function measure() {
    width = document.documentElement.clientWidth;
    // Match the stable CSS viewport instead of the toolbar-sensitive innerHeight.
    // Both the bitmap and projection must use the same size to avoid stretching.
    height = host.clientHeight;
    const nextMobile = width < config.mobileBreakpoint;
    if (mobile !== nextMobile) {
      mobile = nextMobile;
      // One graph for the whole CV, with connections across vertical repeats.
      geometry = createScene({
        ...config,
        scene: { ...world, height: repeatHeight },
        wrapY: config.verticalRepeat.enabled,
        nodeCount: config.nodeCount * (mobile ? clamp(config.mobileNodeRatio, 0, 1) : 1),
      });
      gpu?.setGeometry(geometry.nodes, geometry.edges);
      depthOrder = createDepthOrder(geometry.nodes);
    }
    pixelRatio = Math.min(window.devicePixelRatio || 1, Math.max(1, config.maxPixelRatio));
    const backingWidth = Math.round(width * pixelRatio);
    const backingHeight = Math.round(height * pixelRatio);
    if (canvas!.width !== backingWidth || canvas!.height !== backingHeight) {
      canvas!.width = backingWidth;
      canvas!.height = backingHeight;
    }
    for (const [index, band] of bands.entries()) {
      const bounds = band.element.getBoundingClientRect();
      band.top = bounds.top + window.scrollY;
      band.height = bounds.height;
      // Each half stays inside its section, including unusually short sections.
      band.transition = Math.min(bounds.height, Math.max(0, config.sectionTransition));
      // A black section normally has no mesh. Paint only enabled half-fades;
      // the hero remains entirely outside the content-section transitions.
      const half = band.transition / 2;
      band.visibleRanges = visiblePalettes[index] ? [{ top: band.top, height: band.height }] : [
        ...(half > 0 && band.fadeIn && visiblePalettes[index - 1] ? [{ top: band.top, height: half }] : []),
        ...(half > 0 && band.fadeOut && visiblePalettes[index + 1] ? [{ top: band.top + band.height - half, height: half }] : []),
      ];
    }
    requestDraw();
  }

  function draw(time: number) {
    frame = 0;
    if (disposed || document.hidden || print.matches) return;
    if (continuous() && previousTime) elapsed += Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    if (width <= 0 || height <= 0) return;
    const count = geometry.nodes.length;
    const scrollY = window.scrollY;
    const motion = continuous();
    const yaw = motion ? Math.sin(elapsed * config.motion.autoRotation) * 0.18 : 0;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const drift = motion ? Math.sin(elapsed * 0.3) * config.motion.drift : 0;
    const unitScale = Math.max(width / world.width, height / world.height);
    const focalLength = 1100 * unitScale;
    const parallax = reducedMotion.matches ? 0 : clamp(config.parallax, 0, 2);
    const cameraY = parallax === 0 ? drift : scrollY * parallax / unitScale + drift;
    const anchorY = parallax === 0 ? height / 2 - scrollY : height / 2;
    const depthExtent = Math.abs(sin) * world.width / 2 + Math.abs(cos) * world.depth / 2;
    const closestScale = focalLength / (cameraDistance - depthExtent);
    const farthestScale = focalLength / (cameraDistance + depthExtent);
    const period = repeatHeight * unitScale;

    // Include neighboring rows for edges that cross the repeating volume's ends.
    // Only viewport-neighbor copies are needed, however long the CV becomes.
    const viewExtent = (height / 2 + nodeSize * 2.5) / farthestScale;
    const staticExtent = (repeatHeight / 2 + Math.abs(drift)) * closestScale + nodeSize * 2.5;
    const firstRow = !config.verticalRepeat.enabled ? 0 : parallax === 0
      ? Math.floor((-anchorY - staticExtent) / period) - 1
      : Math.floor((cameraY - viewExtent) / repeatHeight) - 1;
    const lastRow = !config.verticalRepeat.enabled ? 0 : parallax === 0
      ? Math.ceil((height - anchorY + staticExtent) / period) + 1
      : Math.ceil((cameraY + viewExtent) / repeatHeight) + 1;
    const rowCount = lastRow - firstRow + 1;
    if (gpu) {
      gpu.render({ width, height, pixelRatio, cameraDistance, cameraY, anchorY, focalLength,
        sin, cos, depthExtent, depthDarkening: config.depthDarkening, repeatHeight, unitScale,
        staticProjection: parallax === 0, firstRow, rowCount, lineWidth, nodeSize }, bands, scrollY);
      if (motion) requestDraw();
      return;
    }
    const ctx = context!;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!count) return;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    const pointCount = rowCount * count;
    while (projected.length < pointCount) projected.push({ x: 0, y: 0, radius: 0, brightness: 0 });
    projected.length = pointCount;

    // Project once, before any section coloring. No section changes the camera
    // or coordinates, so a line is perfectly continuous across color boundaries.
    for (let i = 0; i < count; i++) {
      const node = geometry.nodes[i];
      const rotated = { x: node.x * cos + node.z * sin, y: node.y, z: node.z * cos - node.x * sin };
      const point = projectPoint(rotated, cameraDistance, cameraY, focalLength);
      const brightness = depthBrightness(point.distance, cameraDistance - depthExtent,
        cameraDistance + depthExtent, config.depthDarkening);
      for (let row = 0; row < rowCount; row++) {
        const output = projected[row * count + i];
        output.x = width / 2 + point.x;
        // Without parallax, repeat a static projection at a uniform screen-space
        // interval. Every point then scrolls exactly with the document.
        const rowOffset = (firstRow + row) * (parallax === 0 ? period : repeatHeight * point.scale);
        output.y = anchorY + point.y + rowOffset;
        output.radius = nodeSize * clamp(point.scale, 0.4, 2.5);
        output.brightness = brightness;
      }
    }

    const nodeOrder = depthOrder(sin, cos);
    for (const band of bands) {
      const top = band.top - scrollY;
      const bottom = top + band.height;
      if (bottom <= 0 || top >= height || band.invisible || !band.visibleRanges.length) continue;
      const clipTop = Math.max(0, band.visibleRanges[0].top - scrollY);
      const lastRange = band.visibleRanges[band.visibleRanges.length - 1];
      const clipBottom = Math.min(height, lastRange.top + lastRange.height - scrollY);
      if (clipBottom <= clipTop) continue;
      const transitionStops = [top, top + band.transition / 4, top + band.transition / 2,
        bottom - band.transition / 2, bottom - band.transition / 4, bottom];
      const colorAt = (y: number, brightness: number) => {
        const incoming = band.transition > 0 ? clamp(.5 + (y - top) / band.transition, .5, 1) : 1;
        const outgoing = band.transition > 0 ? clamp(.5 - (bottom - y) / band.transition, 0, .5) : 0;
        return `rgb(${band.rgb.map((channel, i) => {
          const color = band.previousRgb[i] + (channel - band.previousRgb[i]) * incoming;
          return Math.round((color + (band.nextRgb[i] - color) * outgoing) * brightness);
        }).join(',')})`;
      };
      ctx.save();
      ctx.beginPath();
      for (const range of band.visibleRanges) {
        const rangeTop = Math.max(0, range.top - scrollY);
        const rangeBottom = Math.min(height, range.top + range.height - scrollY);
        if (rangeBottom > rangeTop) ctx.rect(0, rangeTop, width, rangeBottom - rangeTop);
      }
      ctx.clip();

      if (lineWidth > 0) {
        for (let row = 0; row < rowCount; row++) {
          for (const edge of geometry.edges) {
            const toRow = row + edge.toRowOffset;
            if (toRow < 0 || toRow >= rowCount) continue;
            const a = projected[row * count + edge.from];
            const b = projected[toRow * count + edge.to];
            if (Math.max(a.y, b.y) < clipTop || Math.min(a.y, b.y) > clipBottom
              || Math.max(a.x, b.x) < 0 || Math.min(a.x, b.x) > width) continue;
            const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            gradient.addColorStop(0, colorAt(a.y, a.brightness));
            // Stops at the fade boundaries keep long crossing edges continuous.
            if (b.y !== a.y && band.transition > 0) {
              for (const y of transitionStops) {
                const t = (y - a.y) / (b.y - a.y);
                if (t > 0 && t < 1) gradient.addColorStop(t, colorAt(y, a.brightness + (b.brightness - a.brightness) * t));
              }
            }
            gradient.addColorStop(1, colorAt(b.y, b.brightness));
            ctx.strokeStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      if (nodeSize > 0) {
        for (let i = 0; i < pointCount; i++) {
          const index = nodeOrder[Math.floor(i / rowCount)];
          const node = projected[(i % rowCount) * count + index];
          if (node.x < -node.radius || node.x > width + node.radius
            || node.y < clipTop - node.radius || node.y > clipBottom + node.radius) continue;
          if (band.transition > 0 && (node.y - node.radius < top + band.transition / 2
            || node.y + node.radius > bottom - band.transition / 2)) {
            const gradient = ctx.createLinearGradient(0, node.y - node.radius, 0, node.y + node.radius);
            gradient.addColorStop(0, colorAt(node.y - node.radius, node.brightness));
            for (const y of transitionStops) {
              const t = (y - node.y + node.radius) / (2 * node.radius);
              if (t > 0 && t < 1) gradient.addColorStop(t, colorAt(y, node.brightness));
            }
            gradient.addColorStop(1, colorAt(node.y + node.radius, node.brightness));
            ctx.fillStyle = gradient;
          } else ctx.fillStyle = colorAt(node.y, node.brightness);
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    if (motion) requestDraw();
  }

  function refreshMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    requestDraw();
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    useCanvasFallback();
    measure();
  }, events);
  window.addEventListener('scroll', requestDraw, { ...events, passive: true });
  window.addEventListener('resize', measure, events);
  window.addEventListener('pageshow', measure, events);
  document.addEventListener('visibilitychange', refreshMotion, events);
  reducedMotion.addEventListener('change', refreshMotion, events);
  print.addEventListener('change', refreshMotion, events);
  const resize = new ResizeObserver(measure);
  measure();
  resize.observe(host);
  for (const band of bands) resize.observe(band.element);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    abort.abort();
    gpu?.dispose();
  };
}
