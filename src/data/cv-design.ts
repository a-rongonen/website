/** Shared presentation controls for both CV languages. */
export const cvDesign = {
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

export function cvDesignStyle() {
  const { borders, headings, hero } = cvDesign;
  const whiteStop = Math.max(0, Math.min(100, headings.whiteStop));
  return `--cv-border-tint: ${unitInterval(borders.tint) * 100}%;
    --cv-border-white: ${unitInterval(borders.whiteMix) * 100}%;
    --cv-heading-tint: ${unitInterval(headings.tint) * 100}%;
    --cv-heading-white: ${unitInterval(headings.whiteMix) * 100}%;
    --cv-heading-white-stop: ${whiteStop}%;
    --cv-heading-color-stop: ${Math.max(whiteStop, Math.min(100, headings.colorStop))}%;
    --cv-hero-position: ${hero.backgroundPosition};
    --cv-hero-opacity: ${unitInterval(hero.backgroundOpacity)};
    --cv-hero-fade: ${Math.max(0, hero.bottomFade)}px;`;
}
