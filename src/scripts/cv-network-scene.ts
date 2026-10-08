/** Pure scene geometry, kept independent of the DOM for verification. */
export type Point3D = { x: number; y: number; z: number };
export type Edge = { from: number; to: number; toRowOffset: number };
export type SceneOptions = {
  nodeCount: number;
  scene: { width: number; height: number; depth: number };
  connectionRadius: number;
  connectionFrequency: number;
  maxConnectionsPerNode: number;
  seed: number;
  /** Connect across the top/bottom boundary when this cell repeats vertically. */
  wrapY?: boolean;
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createScene(options: SceneOptions) {
  let seed = options.seed >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Prevent an accidental config edit from producing an unbounded scene.
  const count = clamp(Math.round(options.nodeCount), 0, 600);
  const worldHeight = Math.max(1, options.scene.height);
  const nodes: Point3D[] = Array.from({ length: count }, () => ({
    x: (random() - 0.5) * Math.max(1, options.scene.width),
    y: (random() - 0.5) * worldHeight,
    z: (random() - 0.5) * Math.max(1, options.scene.depth),
  }));
  const edges: Edge[] = [];
  const degrees = new Uint16Array(count);
  const limit = clamp(Math.round(options.maxConnectionsPerNode), 0, 12);
  const radiusSquared = Math.max(0, options.connectionRadius) ** 2;
  const frequency = clamp(options.connectionFrequency, 0, 1);
  // Neighborhood work happens once, never in the animation loop.
  for (let from = 0; from < count; from++) {
    const neighbors: { to: number; toRowOffset: number; distance: number }[] = [];
    for (let to = from + 1; to < count; to++) {
      const a = nodes[from];
      const b = nodes[to];
      // Choose the nearest copy of b in this cell or its immediate vertical neighbors.
      const toRowOffset = options.wrapY ? Math.round((a.y - b.y) / worldHeight) || 0 : 0;
      const dy = a.y - (b.y + toRowOffset * worldHeight);
      const distance = (a.x - b.x) ** 2 + dy ** 2 + (a.z - b.z) ** 2;
      if (distance <= radiusSquared && random() < frequency) neighbors.push({ to, toRowOffset, distance });
    }
    neighbors.sort((a, b) => a.distance - b.distance);
    for (const { to, toRowOffset } of neighbors) {
      if (degrees[from] >= limit) break;
      if (degrees[to] >= limit) continue;
      edges.push({ from, to, toRowOffset });
      degrees[from]++;
      degrees[to]++;
    }
  }
  return { nodes, edges };
}

export function depthBrightness(distance: number, near: number, far: number, strength: number) {
  const depth = clamp((distance - near) / Math.max(1, far - near), 0, 1);
  return 1 - clamp(strength, 0, 1) * depth;
}

export function projectPoint(point: Point3D, cameraDistance: number, cameraY: number, focalLength: number) {
  const distance = Math.max(1, cameraDistance - point.z);
  const scale = focalLength / distance;
  return { x: point.x * scale, y: (point.y - cameraY) * scale, scale, distance };
}
