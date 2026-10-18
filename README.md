# rongonen.fi

A static Astro personal website. Both CV pages use the owner's supplied content and portrait, with Finnish originals and English translations. The portfolio includes the owner's background, Panic Lane trailer, and three interactive game design cases with images and gameplay videos. Home and Blog remain simple placeholders.

## Run locally

Use **Node.js 24.12.0** (also recorded in `.node-version`) and npm. From the repository root:

```text
npm ci
npm run dev
```

Open the address printed in the terminal, normally `http://localhost:4321`. Keep the command running while reviewing or editing; stop it with **Ctrl+C**.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the versions recorded in `package-lock.json` |
| `npm run dev` | Start the local development site with live updates |
| `npm run check` | Check Astro files and TypeScript |
| `npm run build` | Generate the static website in `dist/` |
| `npm run preview` | Serve the last production build locally; run build first |
| `npm run preview:cloudflare` | Serve the last build with Cloudflare's local runtime; run build first |
| `npm run deploy` | Check, build, and publish using an authorized Cloudflare account |

Before publishing a change, run `npm run check` and `npm run build`. A local preview is available only while its process is running. It is not a public deployment.

## Pages and files

| URL | Language | Source |
| --- | --- | --- |
| `/` | English | `src/pages/index.astro` |
| `/cv` | English | `src/pages/cv.astro` |
| `/cv-fi` | Finnish | `src/pages/cv-fi.astro` |
| `/portfolio` | English | `src/pages/portfolio.astro` |
| `/blog` | English | `src/pages/blog.astro` |

Only the CV has two language versions; the homepage, portfolio, and blog are English. The homepage stays at `/` without a language redirect.

Portfolio and Blog use no language prefix. `public/_redirects` permanently redirects the former `/en/portfolio` and `/en/blog` URLs to `/portfolio` and `/blog` on Cloudflare.

The visible site structure is **Home → Portfolio / Blog**. Keep `/cv` and `/cv-fi` as orphan pages reached by direct URL: no links to either CV from any page or navigation, no links between the CVs, and no language switcher. Omit alternate-language cross-links and exclude both CV routes from any future sitemap. Keep each page’s own canonical URL and correct HTML language.

Both CV routes pass localized content to `src/layouts/CvLayout.astro`, with shared styles in `src/styles/cv.css`. The template provides the name/portrait area followed by an ordered list of content sections. Currently these are Profile (one shared glass box with text on the left and unheaded strengths with check marks on the right), Skills, and Work and studies. The profile columns stack inside the same box in that reading order below 700px. Section-colored 3D network backgrounds, dark glass cards, SVG card icons, and alternating table rows follow the owner's structure and visual direction.

Edit the English and Finnish text in `src/data/cv.ts`; its `CvContent` type defines the common content shape. Separate paragraphs within profile/card text with `\n\n`. CV and portfolio copy support `**bold**`, `*italic*`, `***both***`, and `[link text](https://example.com)` using the shared `InlineText.astro` renderer. HTML stays escaped text; links accept HTTP(S), email, telephone and relative URLs. By default, HTTP(S) links open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`; email, telephone and relative links open normally. Emphasis and underlined links share the checkmark accent color. Cards are stored in mobile reading order: first left, first right, second left, second right. The default skill order is Marketing, Creativity, Artificial intelligence, Learning. Work history uses the table; education and languages occupy the two cards below it. A small browser enhancement packs different-height cards into desktop columns; without JavaScript they remain a regular two-column grid. Below 700px all cards use one column in their original reading order.

### Adding, moving and hiding sections

Profile columns align at the top. Profile paragraphs, check-mark strengths and skill-card text share the same `1.05rem` font size and `1.8` line height in `cv.css`.

Each language has a `sections` array in `src/data/cv.ts`. Every entry has a unique, URL-safe `id` and a `heading`, plus any of these optional blocks: `text`, `bullets`, `table` (title, three column labels and rows), and `cards`. `src/components/CvSection.astro` renders the same blocks for any section; there is no fixed section count. Text and bullets share a row when both are present, followed by the table and cards. Reorder array entries to reorder the page. Keep equivalent content/order in both languages.

`visibleCvSections()` filters empty entries at build time. Whitespace-only text/bullets, cards without body text, and fully blank table rows do not count as content; a heading alone does not make a section visible. Empty sections leave no heading, spacing, anchor or background band. The former standalone strengths entry remains at the bottom as `{ id: 'strengths', heading: '' }`. Add content to reuse it, rename its ID/heading to suit that content, or append further entries. The portfolio has its own section content and does not import the CV history.

### Portfolio

`src/pages/portfolio.astro` has five sections: a title/video hero, Background, Panic Lane, three game design cases shown in stacked boxes, and Small Wins. Below 700px the hero title/video group's midpoint targets 35% of the stable large viewport height; header clearance takes priority on short screens or with enlarged text. Desktop hero positioning is unchanged. `PortfolioFeature.astro` renders each video and its copy inside one glass card matching the game-design case width, border and responsive padding. Videos fill the padded card width; the centered copy keeps its previous text width and paragraph styling without a separate visible box. The shared `portfolio-box` class keeps feature and case padding in sync. Small Wins replaces the portfolio's former Work and studies boxes; both CV pages retain their own history. Main site navigation remains available; there are no links to either CV. Every portfolio section, including the opening, uses the shared gradient/network background with palettes and transitions following visible position. The CV hero image is used only on the CVs.

Edit unique copy and media in `src/data/portfolio.ts`. `portfolioDesign.titleColor` controls only the word “PORTFOLIO” (default light yellow `#fff2a8`). `portfolioDesign.titleScale` controls that word's font size relative to the name above it: `1.5` (default) makes it 50% larger; `1` restores equal sizing. The opening reads “Aleksanteri's PORTFOLIO”; both lines shrink responsively for narrow screens or enlarged text. “PORTFOLIO” always has its own line. Shared `cvDesign.accentColor` controls bold/italic text, links and checkmarks on all three pages. Portfolio heading styles live in `src/styles/portfolio.css`; headings share Kanit Semibold (600) with the CVs.

All page headings, table captions and table headers use self-hosted Kanit Semibold through `PageLayout.astro`; regular text retains its existing system/Segoe UI font stack. Shared heading/caption letter spacing is `-0.01em`; the portfolio owner line uses `-0.01em`, PORTFOLIO uses `-0.02em`, and CV name spans use `0.04em`. Table headers keep their responsive spacing. The portfolio opening uses `line-height: 1` and no extra margin between its two lines, approximately halving their former visible gap. Heading copy uses initial capitals for each word, with the uppercase PORTFOLIO exception. Keep this capitalization in the source copy so font-aware text measurements match the rendered letters. Large gradient heading line boxes allow room for lowercase descenders.

`public/fonts/kanit/Kanit-SemiBold.ttf` is the unmodified font from the [Google Fonts Kanit source](https://github.com/google/fonts/tree/main/ofl/kanit), accompanied by its copyright and [SIL Open Font License 1.1](public/fonts/kanit/OFL.txt). The license allows commercial use and web embedding/self-hosting. Retain the copyright/license when distributing the font; do not sell the font on its own or relicense it. The font license does not require website content to use the same license. No external font service or visitor-installed font is required.

The hero plays `public/videos/portfolio-demo-reel.mp4` without playback controls, pointer interaction, picture-in-picture or remote-playback UI. Case videos use the same interaction-revealed controls as the Panic Lane trailer. The Panic Lane section plays `public/videos/panic-lane-portfolio-trailer.mp4` with native controls initially hidden, revealed on hover, keyboard focus or touch through `controlsOnInteraction`. Controls hide on pointer exit or blur when the video is neither hovered nor focused; browsers manage fading during touch playback. Without JavaScript, native controls remain available. Local videos use muted inline looping playback. Autoplay requires a selected slide, an onscreen frame, a visible document and no reduced-motion preference. Leaving the viewport or selecting another slide pauses playback; returning resumes automatically paused videos while preserving a visitor's manual pause.

`PortfolioMedia.astro` loads only the opening reel immediately. All other image, video and iframe elements stay inside inert templates until their selected content approaches within 150px of the viewport. Hidden slider pages stay inert until selected, so neither the HTML preload scanner nor a video's autoplay can fetch them early. Two shared intersection observers manage loading and playback without per-scroll layout measurements. Loaded elements stay available for revisits. No-JavaScript media is supplied through `noscript`; printing materializes all case images while leaving unvisited video and iframe sources deferred.

The background uses a lazy-loaded, user-initiated YouTube privacy-enhanced embed (`kind: 'youtube'`) for the supplied Unreal Fest clip, with `start=6441` (1:47:21) and `end=6555` (1:49:15). Unreal Fest is plain text so visitors watch the adjacent embedded video. These times are absolute seconds from the video's beginning; see [YouTube's player parameters](https://developers.google.com/youtube/player_parameters#end).

Panic Lane uses `portfolio.learning.text`, a single string with `\n\n` between paragraphs. The shared feature card renders its video above the copy on both desktop and mobile. Property order in `src/data/portfolio.ts` does not control layout. Both CV languages keep their checkmark lists.

Empty media `src` values render labelled placeholders. To add a video, put the file in `public/` and set its root-relative `src`, accessible `label`, natural pixel `width` and `height`, and optional `poster`. Update the dimensions when replacing an asset: they reserve its final frame before downloading and prevent media-induced layout shifts. Case media can also use `kind: 'image'`. Local images and videos render at their native aspect ratios, with responsive width and automatic height; YouTube embeds and empty placeholders retain their 16:9 frame. The embed's 200px minimum height is reserved before it loads. Until media paints, every frame shows `public/images/unloaded-media-asset.jpg` as a CSS background over a dark fallback color. All frames share one small download (about 25 KB) and one decoded copy, and the static background is painted once rather than on every scroll. Portfolio images must stay opaque, or the background shows through them. Each frame's `<noscript>` fallback uses `display: contents` only under `@media (scripting: none)`. With scripting on, its content is raw text that would otherwise paint inside the frame. The case titles are Shattering Platforms, A New Drifting Mechanic, and Driving on a Pipe. Each case's `pages` array contains the supplied Problem, Solution and Result copy; edit each page's `heading`, `text` and `media` separately. All nine case media slots use owner-supplied assets: five images and four videos, ordered Problem / Solution / Result. The first drifting clip is `careful-driving-demo.mp4`.

The hero MP4 has fast-start metadata at the beginning, so playback can begin while the rest downloads. This does not require HTTP byte-range support (the local Cloudflare preview currently returns a full `200` response to range requests). `preload="metadata"` is a hint; autoplay takes precedence and the browser chooses how much to buffer, potentially downloading the whole video. This is progressive playback, not adaptive-bitrate streaming. Keep each file below Cloudflare Workers Static Assets' 25 MiB limit (26,214,400 bytes). For future exports, prefer H.264 MP4 with fast-start metadata at the beginning. The owner handles compression/re-encoding to choose the quality trade-off; request a replacement rather than modifying the encoding automatically. Moving metadata for fast start does not alter the encoded audio/video quality.

`PortfolioCases.astro` renders an independent three-page widget for each case. The case number and permanent H2 title sit inside its glass box above a native range, with no visible instruction text. One glowing handle and two smaller circles show the three positions. The track ends at the outer circle centers; circles before the handle use the yellow accent and upcoming circles stay gray, updating in both directions. Dragging, clicking/tapping the track, and arrow/Home/End keys change only that case's content. Page changes are announced to assistive technology. Reduced motion stops the glow. Without JavaScript and when printing, all nine pages remain readable, grouped under their case headings. Shared card packing and section text alignment are loaded through `src/scripts/cv-enhancements.ts`.

Small Wins is the portfolio's final section, a swipeable carousel documented in [Small Wins carousel](#small-wins-carousel) below.

Case sliders use `portfolio-glow.css`, which crossfades two static shadows with compositor opacity animations. `portfolio-visibility.ts` uses one shared observer to pause offscreen widgets, and document visibility pauses hidden-tab animation; reduced motion removes it. This avoids repainting animated box shadows while scrolling.

Run `node tests/portfolio.browser.mjs` using the browser environment below to verify layout, independent page interactions and accessibility fallbacks. `node tests/portfolio-loading.browser.mjs` checks cold media requests, hidden-slide isolation, stable layout with blocked media responses, viewport/user/reduced-motion playback and print loading. `node tests/portfolio-carousel.browser.mjs` adds finite carousel navigation, adjacent-card peeks, live mouse dragging, native touch velocity/multiple-card travel, smooth settling/interruption, keyboard controls, responsive geometry, no-JS/print, and isolated test media to exercise future carousel image/video loading and playback. `node tests/portfolio-heading.browser.mjs` compares gradient and solid glyph pixels to catch clipped case-title descenders.

Background palettes follow **visible position**, not content IDs. The existing `profile`, `strengths`, `skills`, `history` keys in `cv-network.ts` now name four reusable color slots in that order. Today Profile uses slot 1, Skills slot 2, Work and studies slot 3, and slot 4 is unused. Additional sections cycle through those slots. CSS and both canvas renderers blend only actual neighboring sections; the hero and the page's lower edge remain sharp. The hero scroll cue targets the first visible section and disappears when all sections are empty.

### Small Wins carousel

Small Wins is rendered by `src/components/PortfolioCarousel.astro` from `portfolio.smallWins` in `src/data/portfolio.ts`. Its behavior lives in `src/scripts/portfolio-carousel.ts`, its layout in `src/styles/portfolio-carousel.css`, and its browser checks in `tests/portfolio-carousel.browser.mjs`.

**Editing slides.** Each entry in `smallWins.slides` has `text` and `media`. Separate paragraphs in `text` with blank lines; the same inline markup as the other portfolio copy works. `media` uses the `PortfolioMedia` shape: `label` (always set; it is the visible placeholder text and the accessible name for the media), plus optional `src`, `poster`, `width`, `height` and `kind` (`video`, `image` or `youtube`). An entry without `src` renders its labelled placeholder with no asset downloads. Give local images and videos their natural `width` and `height` so the frame is reserved before the file loads. The five slides hold, in order, the moose centaur model, Ubuntu competition and YouTube channel images, then the Panic Lane @ Games First 2026 and Unreal Engine 5.4 Motion Design YouTube videos. Their `text` is still placeholder copy (`Small win 01` to `05`). For a YouTube slide, set `kind: 'youtube'` and a `https://www.youtube-nocookie.com/embed/<id>` `src`; the component adds `enablejsapi=1` itself. A swipe that starts on a YouTube player stays inside the player, so visitors swipe those cards from the copy or card edges.

**Changing the number of slides.** The component reads the slide count from the data, but `tests/portfolio-carousel.browser.mjs` hard-codes `const count = 5` and replaces every card's media with isolated fixtures. Its YouTube checks need at least two YouTube cards. Update those assertions with any count change, or the carousel suite will fail for the wrong reason.

**Navigation.** The track is finite: the first and last cards have one neighbor, and dragging past either end meets light resistance rather than wrapping. Mouse drags and horizontal touch swipes move the track with the pointer. On release, the speed of the most recent movement projects a short coast, so a quick flick can cross several cards; the track then decelerates onto a card with a bounded cubic. A visitor can catch the track mid-motion. Clicking or tapping a neighbor's visible slice slides that card to the middle; neighbors are `inert`, so the tap reaches the track and its position picks the card from the cached card width and gap. Vertical touch movement scrolls the page, and a drag does not trigger clicks on links or media inside the card. There are no visible arrows, counters, indicators or instructions, and no automatic advance.

**Layout.** The viewport spans the full layout width, so the centered card shows a slice of each neighbor on desktop and a narrower slice on phones. Each card is the same width as a game-design case box: `min(100% - 3rem, 960px)` on desktop and `min(100% - 2rem, 520px)` below 700px. The heading and the no-JavaScript/print stack use the same centered widths. Keep these values aligned with `.cv-container` when the shared page sizing changes. The flex row reserves the height of the tallest card, and the card's media sits above its copy, reusing the feature-card treatment from the Background and Panic Lane sections.

**Keyboard and assistive technology.** The viewport is focusable. Left and Right move one card, and Home and End jump to the first and last cards; these keys are ignored while focus is inside a link, button, input or media control, so those controls keep their own keys. Each change updates an `aria-live` status ("Small win N of 5"). Only the selected card is accessible: the others are `inert` and `aria-hidden`. Two visually hidden previous and next buttons serve touch screen readers without adding visual hints.

**Media and motion.** Only the selected card's media is eligible to load. Neighboring cards stay inert and unloaded until selected, then load under the shared 150px lead used elsewhere in the portfolio. Loaded media is retained when the visitor moves away. A local video autoplays only while it is selected, intersects the carousel viewport, the document is visible, and reduced motion is off. The shared visibility observer stops motion offscreen and in hidden tabs. YouTube players never start by themselves and keep their sound; when a player stops being visible (another card selected, scrolled out of view, a hidden tab or print), `portfolio-media.ts` sends it a `pauseVideo` command through the player's postMessage API. The script first announces `listening` (retrying briefly, as YouTube's own API does) and sends commands only after the player answers, because earlier commands throw inside the player. Player state reports limit pauses to players that are actually playing or buffering, and also catch playback that starts while the card is hidden. Returning does not resume it, and a fullscreen player is left alone. The same applies to the Background embed. Drag frames use cached card width and gap, batched into one `requestAnimationFrame` callback. Measurements refresh on resize and font loading. Reduced motion removes the animated settle and jumps directly to the selected card.

**Without JavaScript and in print.** All cards render as a vertical list with a 2rem gap, and the offscreen controls are hidden. Print also removes the track transform so every card prints.

Run `node tests/portfolio-carousel.browser.mjs` against a production preview (`CV_PREVIEW_URL` selects it) to check finite navigation, neighbor peeks, mouse and touch swipes, keyboard controls, settling and interruption, responsive geometry, reduced motion, no-JS/print, the isolated media fixtures neighbor click/tap selection, and YouTube pausing on card change, scroll-away and hidden tabs (using a stand-in player that answers the handshake, reports play/pause states and records its commands).

### Shared presentation controls

The hero uses the supplied `public/images/cv-background-v2.jpg` (2311 × 1491) as a non-repeating background and `public/images/cv-image.png` (1944 × 2738) as a transparent foreground portrait. The background uses proportional `cover` sizing, centered horizontally and bottom-aligned: its full height is visible in a narrower hero, its full width in a wider hero, and the entire image at the same aspect ratio. Excess image area is cropped so the hero always stays filled. The portrait sits flush with the bottom by default. Both languages share these settings.

Edit **`src/data/cv-design.ts` → `cvDesign`** for both languages:

| Setting | Effect |
| --- | --- |
| `sectionEdgeDistance` | Shared distance from either content-section edge to the content. CSS length, e.g. `'64px'` or `'4rem'`; default `'clamp(4rem, 8vw, 6.5rem)'` (responsive 64-104px). |
| `hero.backgroundSrc` | Public background image path; an empty string disables the image. |
| `bulletGap` | Extra vertical space between bullet items, separate from their normal line height. CSS length; default `'1.5rem'`. Applies to the combined profile's strengths and any future bullet lists. |
| `profileColumnGap` | Gap between equal-width profile/strengths columns, centered in the box. Percentage of the inner width; default `8` (8%), clamped to 0–50. Mobile keeps its vertical stacking gap. |
| `accentColor` | Shared bold/italic text, underlined links and bullet checkmarks across both CVs and portfolio. Default light yellow `'#fff2a8'`; print and forced colors use readable solid colors. Replaces `checkmarkColor`. |
| `hero.backgroundOpacity` | Image visibility from 0 to 1 (default 1). |
| `hero.bottomFade` | Optional image fade at the hero bottom, in CSS pixels. Default 0 keeps the image sharp to its lower edge. |
| `contentColor` | Shared body text, icons, small headings, captions, table headers/cells, and labels. Defaults to the former body text color `#d1d4d4`; use any CSS color, e.g. `#cccccc`. |
| `boxes.defaultColor` | Six-digit hex for the untinted fill (current value `#1b2629`). Its HSL lightness sets the darkness for every section. |
| `boxes.tint` | 0 uses the default fill; 1 adopts the section hue and capped saturation while preserving the default color's lightness. Current value 1. Gray themes desaturate the fill. |
| `boxes.saturationLimit` | Maximum theme saturation (0-1; current value 0.5), keeping vivid base colors restrained. |
| `boxes.shade` | Fraction to darken the lower fill-gradient stop (0-1; current value 0.6). |
| `boxes.opacity` | Fill opacity (0-1; current value 0.93). Reduced-transparency mode uses an opaque tinted fill. |
| `borders.tint` | Lerp from the original gray edges (0) to section-colored edges (1); default 0.8. |
| `borders.whiteMix` | Mix white into the colored edge highlight (0–1); default 0.25. |
| `headings.tint` | Lerp from white text (0) to the vertical white-to-section-color gradient (1); default 0.8. |
| `headings.whiteMix` | Lighten the gradient's lower color (0–1); default 0.25 keeps dark palettes legible. Use 0 for the pure base color. |
| `headings.whiteStop`, `colorStop` | Gradient stop positions as percentages down each text box; defaults 50 and 100. Multiline titles share one gradient. |
| `headings.backdrop.color`, `opacity` | Soft radial-gradient backdrop behind headings directly over the node background, shared by CVs and portfolio. Currently black and 0.4; 1 gives an opaque center, 0 disables the effect entirely. |
| `headings.backdrop.paddingX`, `paddingY` | Percentages of the actual text width/height added on each side; currently 70 horizontally and vertically. For example, X=50 adds half the text width on each side (2× total width). All text rows form one combined bounding box, including the space between rows; wrapping automatically adjusts the backdrop. |
| `headings.backdrop.solidStop` | Percentage of the ellipse radius that stays solid before fading to transparent; default 45. Increase it for stronger darkening toward the ends of a long heading. |
| `headings.backdrop.offsetX`, `offsetY` | Horizontal/vertical shift as percentages of the combined text width/height, before padding; both default to 0. Glass-box headings and the CV photo hero are excluded; print/forced colors hide the backdrop. |

Heading backdrops occupy a separate, non-interactive page layer: network at z-index 1, gradients at 2, content containers at 3. Even oversized or offset backdrops remain behind content across section boundaries. `heading-backdrops.ts` reuses one empty element per heading and measures actual text bounds only on layout/font changes. There are no copied text trees, SVG filters, live blurs, or per-scroll backdrop updates. The old `headings.shadow` controls are replaced by `headings.backdrop`; padding and gradient stops now control the fade instead of blur. Backdrops are clipped at the page boundary to prevent horizontal overflow; with JavaScript disabled, headings remain readable without them. Keep future page content inside the foreground `.cv-container` layer.

One `sectionEdgeDistance` replaces the separate start/end controls in both CV languages. Outer margins and trailing card-stack gaps are removed, exposed first/last text uses font-aware trimming with automatic accent and descender allowance, and color transitions meet at their 50/50 midpoint on the section boundary. This keeps content spacing and the visual color boundary aligned as text wraps and cards change height. Measurements update when text wraps, fonts load, or text changes, with no per-scroll text measurements. Without JavaScript or native text-box trimming, headings keep ordinary readable line spacing. The hero keeps its separate portrait layout and a sharp boundary with Profile; print uses 2rem at both edges.

Box fills, borders, and main headings inherit `sections.<name>.baseColor` from `cv-network.ts`. Heading gradients cover only the name and section titles (h1/h2). Body text, icons, card titles, table captions, headers/cells, and labels share `contentColor`. Box tint mixes the default fill with a dark version of the section hue and capped saturation. Both endpoints use the default color's HSL lightness, so tinting never imports the bright theme lightness or spins through unrelated hues. Print and forced-color modes use readable solid text. Changing a section base color updates its mesh, box fills, edges, and main headings together.

### Hero sizing and positioning

In **`src/data/cv-design.ts` → `cvDesign.hero`**, edit the `desktop` and `mobile` blocks independently. Mobile applies below 700 CSS pixels; desktop applies from 700 upwards. Save while `npm run dev` is running to see changes; rebuild if using a production preview.

| Setting in each block | Effect |
| --- | --- |
| `minHeight` | Minimum height of the whole hero, including its background. Both desktop and mobile default to `100lvh`, filling the viewport with browser bars retracted and staying stable as those bars move. With bars expanded, the hero can extend below the visible area. Rotation and window resizing still update it. Content can make it taller on short screens or with enlarged text to avoid clipping the title. |
| `foregroundHeight` | Requested image height as a fraction of the **whole hero**: `0.9` means 90%. Defaults: desktop `0.9`, mobile `1.0`. Clamped to 0–1. Image proportions are preserved; width or space below the mobile title can reduce the actual height. Source pixel resolution does not set its displayed size. |
| `foregroundPositionX` | Horizontal position within available image space: `0` = left, `0.5` = center, `1` = right. Defaults: desktop `0`, mobile `1`. Clamped to 0–1. |
| `foregroundPositionY` | Vertical position within available image space: `0` = top, `0.5` = center, `1` = bottom. Defaults to `1` to keep the image flush with the hero bottom. Clamped to 0–1. |
| `copyPaddingTop`, `copyPaddingBottom` | Space above/below the title block. |
| `gap` | Space between title and portrait: horizontal on desktop, vertical on mobile. |

Change `mobile.minHeight` or `desktop.minHeight` to adjust the hero height; the background automatically covers the resulting aspect ratio. Set `desktop.foregroundHeight` to `0.9` for a requested height of 90%, or `mobile.foregroundPositionX` to `0.5` to center the portrait. The old width/max-height/scale/offset/alignment controls are replaced by these three controls. The portrait fits within a separate grid cell beside the title on desktop and below it on mobile, so even extreme settings cannot move it over the title. Position controls distribute spare space; they have no visible effect along an axis the image completely fills. Negative text padding and gaps are clamped to zero.

On desktop, the title stays aligned with the content below and takes its content width (up to half the hero's available width). The portrait uses the remaining space out to the right viewport gutter. It is not restricted to the 960px content container or a fixed column fraction. A full-height portrait is possible when that space can accommodate its aspect ratio; narrower windows still reduce its height to protect the title.

Each word of the name stays on its own unbroken line. A container-relative font size provides a no-JavaScript fallback; rendered-width measurements fit both words to the available title width after resizing or font loading, without exceeding the preferred responsive size.

A resize observer supplies the actual hero height when text makes it taller than `minHeight`; the out-of-flow image never expands the hero itself. Without JavaScript, the height target uses `minHeight`, while the same fitting and separation rules still apply. On short screens the mobile portrait reserves at least 12rem of layout space so enlarged text can expand the hero without hiding the image. Transparent padding inside the source image counts toward its height.

`rem` follows the root text size, `vw` is a percentage of the viewport width, and `%` follows the reference described above. These are CSS layout units, independent of physical display pixels; browser zoom and text-size preferences still work. The repeating tile itself is intentionally 1 CSS pixel wide. The existing `bottomFade` option remains in CSS pixels and defaults to 0 for a sharp lower edge.

The localized `portrait` entries in `src/data/cv.ts` select the foreground file, alt text, and its natural `width`/`height`. Update those dimensions if replacing the image so the browser can reserve the correct aspect ratio before loading. Replace placeholder copy and table rows with supplied facts only.

- `src/layouts/PageLayout.astro` contains shared HTML, canonical URLs, and basic site navigation; the CV view omits the site header. There are no CV navigation or alternate-language links.
- `src/pages/404.astro` supplies the missing-page message.
- `astro.config.mjs` sets the canonical domain to `https://rongonen.fi`. The live domain connection is configured separately in `wrangler.jsonc`.
- `public/` contains assets copied directly to the public website. Never place private material there.
- `ignored-files/` holds local planning notes and is excluded from Git. The implementation plan records the agreed scope; `operations-handover.md` records machine-specific access, deployment identifiers, verification, and troubleshooting lessons. These files are not included in a fresh clone. Older context documents contain superseded proposals. No credentials belong there.

Portfolio content lives in the typed data described above. There is no blog publishing system, sitemap, RSS, or analytics yet. Those will be added when their content and design are agreed. Do not add sample experience or projects to fill the placeholders.

## Performance requirements for future additions

New content and effects should preserve demand loading, stable layout and smooth scrolling. The corresponding agent requirements are in `AGENTS.md` under **Media loading and scrolling performance**.

For portfolio media, reuse `PortfolioMedia.astro`, `PortfolioFeature.astro` and the existing `portfolio-media.ts` controller. Only the opening reel is eager; other sources stay in inert templates until selected content is within 150px of the viewport. A hidden slider or tab must not fetch its media just because its parent section is visible. On other routes, eagerly load only assets needed for the opening viewport and defer the rest. Browser lazy-loading/preload hints alone are insufficient to guarantee request isolation. Keep loaded elements for revisits.

Record natural image/video dimensions and reserve responsive frame sizes, including embed minimum heights, before starting requests. Downloads, image decoding and player initialization should leave surrounding card and page heights unchanged. Local videos autoplay only in selected, onscreen content while the tab is visible and motion is welcome. Pause them when hidden; preserve deliberate user pauses, accessible native controls and no-JS/print access. Test rapid selection while a video is still buffering as well as ordinary playback.

Use shared visibility observers and cached geometry. Keep layout measurements out of scroll handlers; batch necessary rendering through a single pending animation frame. Prefer opacity/transform animation, pause decorative effects offscreen and in hidden tabs, and respect reduced motion. Preserve the chosen visual design while investigating performance: identify expensive work with a trace before altering the effect.

After relevant implementation changes, run `npm run check`, `npm run build` and the affected browser suites against the built preview. Media/case changes require both `tests/portfolio-loading.browser.mjs` and `tests/portfolio.browser.mjs`; extend or adapt their checks for new components/routes. Verify cold requests, hidden-slide isolation, layout with blocked and completed media responses at desktop/mobile widths, viewport/user/reduced-motion playback, rapid switching, keyboard/touch controls and no-JS/print fallbacks. For animation/rendering/scroll changes, compare before/after traces with the same viewport, DPR, throttling and scroll sequence, closing other test browsers first. Report paint/layout/main-thread work separately from frame timings and physical-device results. Keep local profiling scripts/results in `ignored-files/`, and let the owner choose any asset compression or re-encoding.

## CV network background

Both CV languages share a lightweight WebGL2 renderer that projects real 3D nodes and connections, with a Canvas2D fallback when WebGL is unavailable or its context is lost. There is no new runtime dependency. One continuous mesh and camera span the entire CV. Section masks change only its colors: a line crossing a boundary stays connected and gradually changes color through the same fade as the background. Perspective makes nearby nodes move faster than distant nodes during scrolling. The mesh repeats vertically with connections between neighboring repeats, so it covers any CV length without restarting at headings.

Edit **`src/data/cv-network.ts` → `cvNetworkConfig`** and save while `npm run dev` is running. Build again to update a production preview. Use six-digit hex colors.

| Setting | Effect |
| --- | --- |
| `defaults.baseColor`, `centerColor`, `edgeColor` | Shared node/line color, gradient center, and gradient edges (black by default). |
| `sections.hero/profile/strengths/skills/history` | Override any of those three colors for the hero or four ordered content palette slots. Slot names are independent of content IDs. Existing base/center overrides take precedence over defaults. The hero is always excluded from the node graph, regardless of its colors; its palette still controls its heading and CSS background. |
| `sectionTransition` | Full fade distance in CSS pixels centered on each content-section boundary (the hero is excluded; default 180: 90px on each side). Zero restores hard boundaries. Each half is capped at half its section's height so short sections cannot overlap fades. CSS backgrounds and both mesh renderers share the same midpoint. |
| `nodeCount` | Nodes in the shared repeating volume; capped at 600. Mobile uses `mobileNodeRatio`. |
| `scene.width/height/depth` | Scene framing and depth in world units. More depth increases perspective differences; framing stays independent of repeat spacing. |
| `verticalRepeat.enabled` | Repeat the connected mesh down the entire CV. Turning this off leaves one finite volume, which can scroll out of view. |
| `verticalRepeat.height` | World units per repeated volume; minimum 100. Larger values spread the same node count over a taller repeat and make repeats less frequent. Smaller values increase density. |
| `connectionRadius`, `connectionFrequency` | Link nearby nodes within this 3D radius, with a probability from 0 to 1. |
| `maxConnectionsPerNode` | Limit visual density and drawing work; capped at 12. |
| `lineWidth`, `nodeSize` | Line width and dot radius in CSS pixels; dot size also responds to perspective. Zero hides either primitive. |
| `depthDarkening` | 0 gives constant color; 1 gives the strongest fade toward black with depth. Lines interpolate their endpoints' node colors. |
| `cameraDistance` | Distance to the scene center; lower values zoom in. Clamped outside half the scene diagonal so rotated nodes cannot cross the camera. |
| `parallax` | Scroll-driven camera travel (0–2). Zero makes a static projection scroll with the document. |
| `motion.enabled`, `motion.drift`, `motion.autoRotation` | Optional idle motion. Disabled by default. Drift is world-unit amplitude; autoRotation is the speed of a subtle oscillating yaw, not full revolutions. |
| `mobileBreakpoint`, `mobileNodeRatio`, `maxPixelRatio` | Responsive density and rendering resolution limits. |
| `seed` | Repeatable arrangement; change for a new network. |

For example, change `sections.skills.centerColor` for the third visible content slot's background, `sections.skills.baseColor` for its dots and lines, or add `edgeColor: '#080808'` to that slot to replace its black edges with dark gray. This slot currently contains Work and studies.

The canvas uses stable large-viewport height (`100lvh`, with a `100vh` fallback), and the renderer measures that same CSS box. Mobile address-bar expansion therefore does not rescale the camera or stretch the bitmap; normal window resizing and rotation still update it. The GPU uploads node and line geometry once and draws its vertical repeats with instancing. Both renderers paint nodes from far to near across all repeats, so overlapping nodes respect depth. This order is cached during scrolling; enabling optional yaw animation recomputes the order and updates only the small GPU node buffer as the angle changes. Scrolling updates camera and color uniforms instead of rebuilding per-line gradients. Only visible section colors are drawn; all-black-on-black sections are skipped. The renderer coalesces scroll updates and stops when idle or the tab is hidden. Touch devices retain the dark glass tint but omit backdrop blur to avoid repeatedly blurring the animated background. It sits behind the existing content and cannot intercept clicks. Reduced-motion preferences disable parallax and idle animation; a static projection continues across the sections and scrolls with the document. Printing hides the canvas; CSS gradients and all CV content remain available without JavaScript.

Implementation: `src/components/CvNetwork.astro`, `src/scripts/cv-network.ts`, the GPU shaders in `src/scripts/cv-network-webgl.ts`, and the pure geometry module `src/scripts/cv-network-scene.ts`. Run `node --test tests/cv-network-scene.test.mjs` for the geometry regression checks, plus the usual `npm run check` and `npm run build`. Browser review should cover both CV routes, section boundaries, narrow screens, scroll depth, and reduced motion.

The rendered-spacing regression is `node tests/cv-spacing.browser.mjs` with the browser environment variables below (default port 8793). It measures painted heading letters and card borders, compares gradient and solid text to catch clipped accents, and checks both languages at desktop/mobile widths and custom shared distances.

The design regression suite is `node tests/cv-design.browser.mjs` (same environment variables below; defaults to preview port 8788). It checks actual interpolated pixel colors in both renderers, image loading, narrow screens, print, forced colors, and no-JavaScript rendering.

The hero regression suite is `node tests/cv-hero.browser.mjs` (same environment variables; default port 8797). It covers both CV languages, responsive layouts, height ratios, extreme positions, identical sizing across source resolutions, text-driven hero growth, and no-JavaScript separation.

Run `node tests/cv-name-profile.browser.mjs` (same environment variables; default port 8796) for name fitting at 240–1920px with normal/doubled root text size, with and without JavaScript, plus equal profile columns, percentage gaps, and checkmark colors.

The optional browser regression suite is `node tests/cv-network-webgl.browser.mjs` against a running production preview. It uses an externally installed Playwright runtime (no new production dependency). Set `PLAYWRIGHT_MODULE` to its ESM module URL if it is not on Node's module path, `BROWSER_CHANNEL` to an installed channel such as `msedge` if needed, and `CV_PREVIEW_URL` to override the default `http://127.0.0.1:8787`. Run `node tests/cv-network-depth.browser.mjs` with the same browser settings for deterministic overlap pixel checks, including repeated rows and rotation. The main suite checks GPU buffer reuse, pixel-level vertical repetition, repeat controls, shared cameras, mobile toolbar/orientation behavior, reduced motion, optional animation, and GPU failure fallback.

## Hosting

The site uses **Cloudflare Workers Static Assets**, Worker `website`, with source in [a-rongonen/website](https://github.com/a-rongonen/website). `wrangler.jsonc` contains the account, Worker name, static-asset settings, and `rongonen.fi` custom domain.

- Public site: [rongonen.fi](https://rongonen.fi)
- Cloudflare address: [website.aleksanteri-rongonen1.workers.dev](https://website.aleksanteri-rongonen1.workers.dev)
- Worker dashboard: [website on Cloudflare](https://dash.cloudflare.com/e42f3d2616075ff3e985c02dedbcfcbe/workers/services/view/website/production)
- Production branch: `main`. This repository is connected to Workers Builds; check its Builds tab after each push. A successful Git push does not itself confirm a successful deployment.

The build produces `index.html` plus individual HTML files such as `cv.html` and `blog.html`. Wrangler serves `./dist`, with `assets.html_handling: 'drop-trailing-slash'` and `assets.not_found_handling: '404-page'`. This preserves the requested URLs and serves the custom 404 with an HTTP 404 status. No Astro Cloudflare adapter or server rendering is required.

Use **Node 24.12.0** in Cloudflare too, through `.node-version` or the `NODE_VERSION` build variable. Workers Builds uses production branch `main`, repository root, build command `npm run check && npm run build`, and deploy command `npx wrangler deploy`. The Worker name must match `website` in `wrangler.jsonc`. Branch preview URLs are disabled for the initial setup.

Cloudflare API credentials are supplied outside the repository through the command environment. Never store them in this project or print them. The Cloudflare GitHub app has already been connected for this repository. OVHcloud remains the domain registrar. Preserve unrelated DNS records, including mail, during hosting changes.

`www.rongonen.fi` redirects permanently (HTTP 301) to `https://rongonen.fi`, preserving the path and query string for both HTTP and HTTPS requests. The zone's **Website redirects** ruleset contains the `www_to_root` Single Redirect rule: match `http.host eq "www.rongonen.fi"`, target `concat("https://rongonen.fi", http.request.uri.path)`, preserve query string. A proxied DNS A record for `www` points to `192.0.2.0` solely to route requests through Cloudflare; the redirect runs before that placeholder address is used. These are zone settings, separate from Wrangler's root-domain configuration. Editing the rule through the API requires **Zone → Single Redirect → Edit** permission.

To undo a published code change, create a Git revert commit for that change and push it, then confirm the resulting Cloudflare build succeeds. Worker configuration and root-domain attachment live in `wrangler.jsonc`; GitHub build settings and any zone redirect rules live in Cloudflare's dashboard. Keep them documented here when changed.

The `miniflare` dependency override selects the patched `sharp` 0.35.5 release for Wrangler's local image tooling (GHSA-wq5f-xc86-pv6w). Remove the override once Wrangler's dependency includes that fix, and verify local Cloudflare preview after changing it.

## Git workflow

Saving changes local files. A commit records a checkpoint. A push sends commits to GitHub. Cloudflare automatic deployment is configured: every push to `main`, including documentation changes, starts a production build and publishes after that build and deployment succeed.

Review `git status` and `git diff` before committing; inspect new files too. Commit source files and `package-lock.json`. Generated folders (`node_modules/`, `dist/`, `.astro/`) and local planning notes stay ignored. Prefer Bash or Python for custom scripts; do not add PowerShell scripts without the owner's agreement.
