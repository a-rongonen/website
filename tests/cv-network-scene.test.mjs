import assert from 'node:assert/strict';
import test from 'node:test';
import { createScene, depthBrightness, projectPoint } from '../src/scripts/cv-network-scene.ts';
import { cvNetworkConfig, networkPalette, networkSectionStyle } from '../src/data/cv-network.ts';

const options = {
  nodeCount: cvNetworkConfig.nodeCount,
  scene: cvNetworkConfig.scene,
  connectionRadius: cvNetworkConfig.connectionRadius,
  connectionFrequency: cvNetworkConfig.connectionFrequency,
  maxConnectionsPerNode: cvNetworkConfig.maxConnectionsPerNode,
  seed: cvNetworkConfig.seed,
};

const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10,
  `Expected ${actual} to be approximately ${expected}`);

test('scene is repeatable, seed-sensitive, and bounded in all three dimensions', () => {
  const first = createScene(options);
  assert.deepEqual(createScene(options), first);
  assert.notDeepEqual(createScene({ ...options, seed: options.seed + 1 }).nodes, first.nodes);
  assert.equal(first.nodes.length, options.nodeCount);
  for (const node of first.nodes) {
    for (const [axis, dimension] of [['x', 'width'], ['y', 'height'], ['z', 'depth']]) {
      assert.ok(Number.isFinite(node[axis]));
      assert.ok(Math.abs(node[axis]) <= options.scene[dimension] / 2);
    }
  }
  assert.deepEqual(createScene({ ...options, connectionFrequency: 0 }).nodes, first.nodes,
    'Connection tuning must not reposition the seeded dots');
});

test('every connection respects radius and degree limits, with no duplicate or self edges', () => {
  const { nodes, edges } = createScene(options);
  assert.ok(edges.length > 0, 'Default settings should actually draw a network');
  const degrees = new Array(nodes.length).fill(0);
  const seen = new Set();
  for (const { from, to } of edges) {
    assert.ok(from >= 0 && from < to && to < nodes.length);
    const key = `${from}:${to}`;
    assert.ok(!seen.has(key));
    seen.add(key);
    const a = nodes[from];
    const b = nodes[to];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= options.connectionRadius);
    degrees[from]++;
    degrees[to]++;
  }
  assert.ok(degrees.every(degree => degree <= options.maxConnectionsPerNode));
});

test('connection controls can disable all edges or connect every eligible pair', () => {
  for (const change of [
    { connectionFrequency: 0 },
    { connectionRadius: 0 },
    { maxConnectionsPerNode: 0 },
  ]) {
    assert.equal(createScene({ ...options, ...change }).edges.length, 0);
  }
  const complete = createScene({ ...options, nodeCount: 10, connectionRadius: 10000,
    connectionFrequency: 1, maxConnectionsPerNode: 12 });
  assert.equal(complete.edges.length, 45, 'All 10 choose 2 pairs should be present');
});

test('empty and accidentally excessive node counts stay safe', () => {
  assert.deepEqual(createScene({ ...options, nodeCount: 0 }), { nodes: [], edges: [] });
  assert.deepEqual(createScene({ ...options, nodeCount: -10 }), { nodes: [], edges: [] });
  assert.equal(createScene({ ...options, nodeCount: 10000, connectionFrequency: 0 }).nodes.length, 600);
});

test('depth darkening is monotonic, bounded, and can be switched off', () => {
  const near = 500;
  const far = 1500;
  const distances = [0, near, 750, 1000, 1250, far, 2000];
  for (const strength of [0, 0.5, 1]) {
    const brightness = distances.map(distance => depthBrightness(distance, near, far, strength));
    assert.ok(brightness.every(value => value >= 0 && value <= 1));
    assert.ok(brightness.every((value, i) => i === 0 || value <= brightness[i - 1]));
    if (strength === 0) assert.ok(brightness.every(value => value === 1));
  }
  closeTo(depthBrightness(near, near, far, 0.8), 1);
  closeTo(depthBrightness(1000, near, far, 0.8), 0.6);
  closeTo(depthBrightness(far, near, far, 0.8), 0.2);
  assert.ok(depthBrightness(1000, near, far, 0.8) < depthBrightness(1000, near, far, 0.3));
  assert.ok(Number.isFinite(depthBrightness(600, near, near, 1)));
});

test('camera motion produces greater parallax displacement for nearby dots', () => {
  const near = { x: 100, y: 100, z: 500 };
  const far = { x: 100, y: 100, z: -500 };
  const displacement = point => Math.abs(
    projectPoint(point, 1250, 120, 1000).y - projectPoint(point, 1250, 0, 1000).y,
  );
  assert.ok(displacement(near) > displacement(far));
  closeTo(displacement(near) / displacement(far), 1750 / 750);
  const projected = projectPoint(near, 1250, 120, 1000);
  closeTo(projected.x, 100 * 1000 / 750);
  assert.ok(projectPoint(near, 1250, 0, 1000).scale > projectPoint(far, 1250, 0, 1000).scale);
});

test('projection guards distance at and behind the camera against division by zero', () => {
  for (const z of [1249, 1250, 2000]) {
    const projected = projectPoint({ x: 10, y: 10, z }, 1250, 5, 1000);
    assert.equal(projected.distance, 1);
    assert.ok(Object.values(projected).every(Number.isFinite));
  }
  assert.equal(projectPoint({ x: 0, y: 0, z: -500 }, 1250, 0, 1000).distance, 1750);
});

test('section palettes resolve complete colors and CSS gradient variables', () => {
  for (const section of Object.keys(cvNetworkConfig.sections)) {
    const palette = networkPalette(section);
    for (const color of Object.values(palette)) assert.match(color, /^#[0-9a-f]{6}$/i);
    assert.equal(palette.edgeColor, cvNetworkConfig.sections[section].edgeColor ?? cvNetworkConfig.defaults.edgeColor);
    assert.ok(networkSectionStyle(section).includes(`--network-center: ${palette.centerColor}`));
    assert.ok(networkSectionStyle(section).includes(`--network-edge: ${palette.edgeColor}`));
  }
});


test('vertical wrapping preserves seeded dots and leaves nonwrapping scenes unchanged', () => {
  const original = createScene(options);
  assert.deepEqual(createScene({ ...options, wrapY: false }), original);
  assert.ok(original.edges.every(edge => edge.toRowOffset === 0));
  const wrapped = createScene({ ...options, wrapY: true });
  assert.deepEqual(createScene({ ...options, wrapY: true }), wrapped);
  assert.deepEqual(wrapped.nodes, original.nodes,
    'Palette passes and repeated cells must use the same seeded node positions');
});

test('periodic connections cross cell boundaries and obey wrapped radius and degree limits', () => {
  const settings = { ...options, nodeCount: 80, scene: { width: 10, height: 100, depth: 10 },
    connectionRadius: 15, connectionFrequency: 1, maxConnectionsPerNode: 5, seed: 713, wrapY: true };
  const { nodes, edges } = createScene(settings);
  const degrees = new Array(nodes.length).fill(0);
  let boundaryEdges = 0;
  for (const { from, to, toRowOffset } of edges) {
    assert.ok([-1, 0, 1].includes(toRowOffset));
    const a = nodes[from];
    const b = nodes[to];
    const dy = a.y - (b.y + toRowOffset * settings.scene.height);
    assert.ok(Math.abs(dy) <= settings.scene.height / 2);
    assert.ok(Math.hypot(a.x - b.x, dy, a.z - b.z) <= settings.connectionRadius);
    if (toRowOffset !== 0) {
      boundaryEdges++;
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > settings.connectionRadius,
        'A boundary link should join nearby copies rather than span the entire cell');
    }
    degrees[from]++;
    degrees[to]++;
  }
  assert.ok(boundaryEdges > 0, 'The repeat boundary must have actual connecting lines');
  assert.ok(degrees.every(degree => degree <= settings.maxConnectionsPerNode));
  assert.equal(createScene({ ...settings, connectionFrequency: 0 }).edges.length, 0);
});

test('repeated cell endpoints share node positions and translate continuously with the camera', () => {
  const settings = { ...options, wrapY: true };
  const { nodes, edges } = createScene(settings);
  const height = settings.scene.height;
  const nodeInRow = (index, row) => ({ ...nodes[index], y: nodes[index].y + row * height });
  for (const edge of edges) {
    const a = nodeInRow(edge.from, 0);
    const b = nodeInRow(edge.to, edge.toRowOffset);
    const reference = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    for (const row of [-2, -1, 1, 2]) {
      const repeatedA = nodeInRow(edge.from, row);
      const repeatedB = nodeInRow(edge.to, row + edge.toRowOffset);
      closeTo(Math.hypot(repeatedA.x - repeatedB.x, repeatedA.y - repeatedB.y,
        repeatedA.z - repeatedB.z), reference);
      const firstProjection = projectPoint(b, 1250, 0, 1000);
      const repeatedProjection = projectPoint(repeatedB, 1250, row * height, 1000);
      closeTo(firstProjection.x, repeatedProjection.x);
      closeTo(firstProjection.y, repeatedProjection.y);
    }
  }
});
