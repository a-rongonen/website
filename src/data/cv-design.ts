/** Shared presentation controls for both CV languages. */
export const cvDesign = {
  sectionEdgeDistance: 'clamp(4rem, 8vw, 6.5rem)', // Equal top/bottom content inset; any nonnegative CSS length.
  contentColor: '#d1d4d4', // Shared body text, icons, small headings, and table text.
  boxes: {
    defaultColor: '#182225', // Six-digit hex; its lightness controls how dark boxes stay.
    tint: 0.75, // 0 = default color; 1 = section hue/saturation at the same dark lightness.
    saturationLimit: 0.4, // 0-1; cap the section tint so bright themes stay restrained.
    shade: 0.25, // 0-1; darken the second gradient stop by this fraction.
    opacity: 0.92, // 0-1; glass fill opacity.
  },
  borders: {
    tint: 0.8, // 0 = original gray glass edges; 1 = section-colored edges.
    whiteMix: 0.25, // 0 = pure section color; 1 = white highlights.
  },
  headings: {
    tint: 0.8, // 0 = white; 1 = full white-to-section-color gradient.
    whiteMix: 0.25, // Lighten the lower color; useful for dark section palettes.
    whiteStop: 0, // Percentage down the text where white ends (0–100).
    colorStop: 100, // Percentage down the text where the tinted color arrives.
  },
  hero: {
    backgroundSrc: '/images/cv-background-placeholder.svg', // Public image URL, e.g. /images/cv-background.jpg.
    backgroundPosition: 'center',
    backgroundOpacity: 0.7, // 0–1; keep the title readable over a photo.
    bottomFade: 140, // CSS pixels fading the image into the section background.
  },
};

const unitInterval = (value: number) => Math.max(0, Math.min(1, value));

/** Read hue/saturation without importing a section's bright lightness. */
function hsl(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('CV box and section colors must use six-digit hex.');
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lightness = (max + min) / 2, delta = max - min;
  if (!delta) return { hue: 0, saturation: 0, lightness };
  const hue = max === r ? ((g - b) / delta + 6) % 6
    : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { hue: hue * 60, saturation: delta / (1 - Math.abs(2 * lightness - 1)), lightness };
}

export function cvDesignStyle(sectionBaseColor: string) {
  const { borders, headings, hero, boxes } = cvDesign;
  const source = hsl(boxes.defaultColor), theme = hsl(sectionBaseColor);
  const tint = unitInterval(boxes.tint);
  const saturation = Math.min(theme.saturation, unitInterval(boxes.saturationLimit));
  const fill = (lightness: number) => {
    const original = `hsl(${source.hue} ${source.saturation * 100}% ${lightness * 100}%)`;
    const tinted = `hsl(${theme.hue} ${saturation * 100}% ${lightness * 100}%)`;
    if (tint === 0) return original;
    if (tint === 1) return tinted;
    // Mix two dark colors, avoiding the unrelated hues of a hue-angle lerp.
    return `color-mix(in srgb, ${original}, ${tinted} ${tint * 100}%)`;
  };
  const whiteStop = Math.max(0, Math.min(100, headings.whiteStop));
  return `--cv-content-color: ${cvDesign.contentColor};
    --cv-section-edge-distance: ${cvDesign.sectionEdgeDistance};
    --cv-box-top: ${fill(source.lightness)};
    --cv-box-bottom: ${fill(source.lightness * (1 - unitInterval(boxes.shade)))};
    --cv-box-opacity: ${unitInterval(boxes.opacity) * 100}%;
    --cv-border-tint: ${unitInterval(borders.tint) * 100}%;
    --cv-border-white: ${unitInterval(borders.whiteMix) * 100}%;
    --cv-heading-tint: ${unitInterval(headings.tint) * 100}%;
    --cv-heading-white: ${unitInterval(headings.whiteMix) * 100}%;
    --cv-heading-white-stop: ${whiteStop}%;
    --cv-heading-color-stop: ${Math.max(whiteStop, Math.min(100, headings.colorStop))}%;
    --cv-hero-position: ${hero.backgroundPosition};
    --cv-hero-opacity: ${unitInterval(hero.backgroundOpacity)};
    --cv-hero-fade: ${Math.max(0, hero.bottomFade)}px;`;
}
