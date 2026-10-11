/** Shared presentation controls for both CV languages. */
export const cvDesign = {
  sectionEdgeDistance: 'clamp(4rem, 8vw, 6.5rem)', // Shared content inset from either section edge; e.g. '64px'.
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
    backgroundSrc: '/images/cv-background.png', // 1px strip, repeated horizontally; '' disables it.
    backgroundOpacity: 1, // 0–1; 1 preserves the supplied image colors.
    bottomFade: 0, // Optional image fade in CSS pixels; 0 keeps a sharp lower edge.
    // CSS lengths: rem follows text size; vw follows viewport width; % is relative.
    // The full strip always scales to the hero height without cropping, and tiles horizontally.
    desktop: { // Viewports at least 700 CSS px wide.
      minHeight: '100dvh', // Fill the visible viewport; grow only if content needs more room.
      foregroundWidth: '100%', // % of the portrait column (mobile: % of content width).
      foregroundMaxHeight: '28.125rem', // Preserves image proportions; limits its height.
      foregroundAlign: 'center', // 'flex-start', 'center', or 'flex-end' within its column.
      foregroundOffsetX: '0%', // Positive moves right; % of the rendered image width.
      foregroundOffsetY: '0%', // Positive moves down; % of the rendered image height.
      foregroundScale: 1, // Visual zoom from the bottom center; does not change layout.
      copyPaddingTop: '4rem',
      copyPaddingBottom: '4rem',
      gap: '2rem', // Space between the title and portrait columns.
    },
    mobile: { // Viewports below 700 CSS px; title above portrait.
      minHeight: '100dvh', // Follow the visible height as mobile browser bars expand/collapse.
      foregroundWidth: '60%',
      foregroundMaxHeight: '16.25rem',
      foregroundAlign: 'flex-end',
      foregroundOffsetX: '0%',
      foregroundOffsetY: '0%',
      foregroundScale: 1,
      copyPaddingTop: '3.5rem',
      copyPaddingBottom: '1.75rem',
      gap: '0rem',
    },
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
    ${(['desktop', 'mobile'] as const).map(mode => Object.entries(hero[mode]).map(([key, value]) =>
      `--cv-hero-${mode}-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}: ${value};`
    ).join('\n')).join('\n')}
    --cv-hero-opacity: ${unitInterval(hero.backgroundOpacity)};
    --cv-hero-mask: ${hero.bottomFade > 0 ? `linear-gradient(#000 max(0px, calc(100% - ${hero.bottomFade}px)), transparent)` : 'none'};`;
}
