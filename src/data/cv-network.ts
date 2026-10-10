import { cvDesignStyle } from './cv-design.ts';

export type NetworkPalette = {
  /** Six-digit hex colors. Nodes and lines always share the base color. */
  baseColor: string;
  centerColor: string;
  edgeColor: string;
};

/** Edit this object to tune both CV language versions. No renderer edits needed. */
export const cvNetworkConfig = {
  defaults: {
    baseColor: '#8bc9cf',
    centerColor: '#102b30',
    edgeColor: '#000000',
  } satisfies NetworkPalette,

  // Each section inherits defaults; override any of the three colors here.
  sections: {
    hero: { baseColor: '#000000', centerColor: '#000000' },
    profile: { baseColor: '#a3e3ff', centerColor: '#031519' },
    strengths: { baseColor: '#b3a2ff', centerColor: '#08031f' },
    skills: { baseColor: '#ff6767', centerColor: '#1f0513' },
    history: { baseColor: '#8fffba', centerColor: '#061810' },
  } satisfies Record<string, Partial<NetworkPalette>>,

  sectionTransition: 400, // CSS pixels centered across section boundaries; 0 = hard boundary.

  nodeCount: 170, // Per shared, vertically repeating mesh volume. Mobile scales this count.
  scene: { width: 1800, height: 800, depth: 3000 }, // World units.
  verticalRepeat: {
    enabled: true, // Reuse the same connected mesh vertically.
    height: 800, // World units per repeat; larger = repeats farther apart / fewer dots in view.
  },
  connectionRadius: 1000, // Maximum 3D distance between linked nodes.
  connectionFrequency: 0.8, // Chance of linking eligible neighbors: 0–1.
  maxConnectionsPerNode: 3, // Bounds clutter and drawing work.
  lineWidth: 0.66, // CSS pixels; zero hides lines.
  nodeSize: 7.0, // Radius in CSS pixels at unit projection scale; zero hides dots.
  depthDarkening: 0.80, // 0 = none; 1 = darkest far plane.
  cameraDistance: 1250, // World units. Keep greater than half the scene diagonal.
  parallax: 0.5, // Scroll-induced camera travel; 0 disables scroll parallax.
  motion: {
    enabled: false, // Default: only scrolling moves the scene.
    drift: 0, // Gentle drift amplitude in world units.
    autoRotation: 0.0, // Speed of subtle oscillating rotation; 0 disables it.
  },
  mobileBreakpoint: 700,
  mobileNodeRatio: 0.6,
  maxPixelRatio: 1.75, // Limit high-DPI viewport canvas memory.
  seed: 651, // Change for a different repeatable network arrangement.
};

export type NetworkSection = keyof typeof cvNetworkConfig.sections;

export function networkPalette(section: NetworkSection): NetworkPalette {
  return { ...cvNetworkConfig.defaults, ...cvNetworkConfig.sections[section] };
}

/** The hero has a sharp edge; only content sections blend into one another. */
export function networkTransitionNeighbors(section: NetworkSection) {
  const sections = Object.keys(cvNetworkConfig.sections) as NetworkSection[];
  const index = sections.indexOf(section);
  const previous = sections[Math.max(0, index - 1)];
  const next = sections[Math.min(sections.length - 1, index + 1)];
  return {
    previous: section === 'hero' || previous === 'hero' ? section : previous,
    next: section === 'hero' || next === 'hero' ? section : next,
  };
}

/** The gradient is present even when JavaScript or canvas is unavailable. */
export function networkSectionStyle(section: NetworkSection) {
  const palette = networkPalette(section);
  const neighbors = networkTransitionNeighbors(section);
  const previous = networkPalette(neighbors.previous);
  const next = networkPalette(neighbors.next);
  const transition = Math.max(0, cvNetworkConfig.sectionTransition);
  return `--network-base: ${palette.baseColor}; --network-center: ${palette.centerColor};
    --network-edge: ${palette.edgeColor}; --network-previous-center: ${previous.centerColor};
    --network-previous-edge: ${previous.edgeColor}; --network-next-center: ${next.centerColor};
    --network-next-edge: ${next.edgeColor};
    --network-transition-in: ${neighbors.previous === section ? 0 : transition}px;
    --network-transition-out: ${neighbors.next === section ? 0 : transition}px; ${cvDesignStyle(palette.baseColor)}`;
}
