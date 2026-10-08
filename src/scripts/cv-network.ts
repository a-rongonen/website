import { cvNetworkConfig as config, networkPalette, type NetworkSection } from '../data/cv-network';
import { clamp, createScene, depthBrightness, projectPoint } from './cv-network-scene';

type ProjectedNode = { x: number; y: number; radius: number; brightness: number };
type PaletteBand = {
  element: HTMLElement;
  top: number;
  height: number;
  rgb: number[];
};

const rgbChannels = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));

export function startNetwork(host: HTMLElement): () => void {
  const canvas = host.querySelector('canvas');
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return () => {};

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
  const bands: PaletteBand[] = Array.from(document.querySelectorAll<HTMLElement>('[data-network-section]')).map(element => ({
    element, top: 0, height: 0,
    rgb: rgbChannels(networkPalette(element.dataset.networkSection as NetworkSection).baseColor),
  }));
  let frame = 0;
  let elapsed = 0;
  let previousTime = 0;
  let disposed = false;

  const world = {
    width: Math.max(1, config.scene.width),
    height: Math.max(1, config.scene.height),
    depth: Math.max(1, config.scene.depth),
  };
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
    height = window.innerHeight;
    const nextMobile = width < config.mobileBreakpoint;
    if (mobile !== nextMobile) {
      mobile = nextMobile;
      // One graph for the whole CV, with connections across vertical repeats.
      geometry = createScene({
        ...config,
        scene: world,
        wrapY: true,
        nodeCount: config.nodeCount * (mobile ? clamp(config.mobileNodeRatio, 0, 1) : 1),
      });
    }
    pixelRatio = Math.min(window.devicePixelRatio || 1, Math.max(1, config.maxPixelRatio));
    const backingWidth = Math.round(width * pixelRatio);
    const backingHeight = Math.round(height * pixelRatio);
    if (canvas!.width !== backingWidth || canvas!.height !== backingHeight) {
      canvas!.width = backingWidth;
      canvas!.height = backingHeight;
    }
    for (const band of bands) {
      const bounds = band.element.getBoundingClientRect();
      band.top = bounds.top + window.scrollY;
      band.height = bounds.height;
    }
    requestDraw();
  }

  function draw(time: number) {
    frame = 0;
    if (disposed || document.hidden || print.matches) return;
    if (continuous() && previousTime) elapsed += Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    const ctx = context!;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const count = geometry.nodes.length;
    if (!count) return;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
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
    const period = world.height * unitScale;

    // Include neighboring rows for edges that cross the repeating volume's ends.
    // Only viewport-neighbor copies are needed, however long the CV becomes.
    const viewExtent = (height / 2 + nodeSize * 2.5) / farthestScale;
    const staticExtent = (world.height / 2 + Math.abs(drift)) * closestScale + nodeSize * 2.5;
    const firstRow = parallax === 0
      ? Math.floor((-anchorY - staticExtent) / period) - 1
      : Math.floor((cameraY - viewExtent) / world.height) - 1;
    const lastRow = parallax === 0
      ? Math.ceil((height - anchorY + staticExtent) / period) + 1
      : Math.ceil((cameraY + viewExtent) / world.height) + 1;
    const rowCount = lastRow - firstRow + 1;
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
        const rowOffset = (firstRow + row) * (parallax === 0 ? period : world.height * point.scale);
        output.y = anchorY + point.y + rowOffset;
        output.radius = nodeSize * clamp(point.scale, 0.4, 2.5);
        output.brightness = brightness;
      }
    }

    for (const band of bands) {
      const top = band.top - scrollY;
      const bottom = top + band.height;
      if (bottom <= 0 || top >= height) continue;
      const clipTop = Math.max(0, top);
      const clipBottom = Math.min(height, bottom);
      const colors = geometry.nodes.map((_, i) =>
        `rgb(${band.rgb.map(channel => Math.round(channel * projected[i].brightness)).join(',')})`);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, clipTop, width, clipBottom - clipTop);
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
            gradient.addColorStop(0, colors[edge.from]);
            gradient.addColorStop(1, colors[edge.to]);
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
          const node = projected[i];
          if (node.x < -node.radius || node.x > width + node.radius
            || node.y < clipTop - node.radius || node.y > clipBottom + node.radius) continue;
          ctx.fillStyle = colors[i % count];
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

  window.addEventListener('scroll', requestDraw, { ...events, passive: true });
  window.addEventListener('resize', measure, events);
  window.addEventListener('pageshow', measure, events);
  document.addEventListener('visibilitychange', refreshMotion, events);
  reducedMotion.addEventListener('change', refreshMotion, events);
  print.addEventListener('change', refreshMotion, events);
  const resize = new ResizeObserver(measure);
  measure();
  for (const band of bands) resize.observe(band.element);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    abort.abort();
  };
}
