# rongonen.fi

A static Astro personal website. Both CV pages implement the owner's approved structure with clearly labelled placeholder copy and a portrait silhouette. Home, Portfolio, and Blog remain simple placeholders; final content will be provided by the owner.

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
| `/en/portfolio` | English | `src/pages/en/portfolio.astro` |
| `/en/blog` | English | `src/pages/en/blog.astro` |

Only the CV has two language versions; the homepage, portfolio, and blog are English. The homepage stays at `/` without a language redirect.

The visible site structure is **Home → Portfolio / Blog**. Keep `/cv` and `/cv-fi` as orphan pages reached by direct URL: no links to either CV from any page or navigation, no links between the CVs, and no language switcher. Omit alternate-language cross-links and exclude both CV routes from any future sitemap. Keep each page’s own canonical URL and correct HTML language.

Both CV routes pass localized content to `src/layouts/CvLayout.astro`, with shared styles in `src/styles/cv.css`. The template provides the name/portrait area, Profile, Strengths, Skills, and Work and studies. Section-colored 3D network backgrounds, dark glass cards, unique SVG icons, and alternating table rows follow the owner's structure and visual direction.

Edit the English and Finnish text in `src/data/cv.ts`; its `CvContent` type defines the common content shape. Cards are stored in mobile reading order: first left, first right, second left, second right. A small browser enhancement packs different-height cards into desktop columns; without JavaScript they remain a regular two-column grid. Below 700px all cards use one column in their original reading order.

The hero has two independent image layers: a decorative full-width background and a foreground PNG anchored to its lower edge. The supplied abstract SVG background and transparent silhouette PNG are explicitly temporary placeholders, not a real portrait.

Edit **`src/data/cv-design.ts` → `cvDesign`** for both languages:

| Setting | Effect |
| --- | --- |
| `sectionEdgeDistance` | Shared distance from either content-section edge to the content. CSS length, e.g. `'64px'` or `'4rem'`; default `'clamp(4rem, 8vw, 6.5rem)'` (responsive 64-104px). |
| `hero.backgroundSrc` | Public background image path; an empty string disables the image. |
| `hero.backgroundPosition` | CSS object position for cropping, e.g. `center` or `70% center`. |
| `hero.backgroundOpacity` | Image visibility from 0 to 1 (default 0.7). |
| `hero.bottomFade` | Image fade at the hero bottom, in CSS pixels; 0 disables the fade. |
| `contentColor` | Shared body text, icons, small headings, captions, table headers/cells, and labels. Defaults to the former body text color `#d1d4d4`; use any CSS color, e.g. `#cccccc`. |
| `boxes.defaultColor` | Six-digit hex for the untinted fill (default `#182225`). Its HSL lightness sets the darkness for every section. |
| `boxes.tint` | 0 uses the default fill; 1 adopts the section hue and capped saturation while preserving the default color's lightness. Default 0.75. Gray themes desaturate the fill. |
| `boxes.saturationLimit` | Maximum theme saturation (0-1; default 0.4), keeping vivid base colors restrained. |
| `boxes.shade` | Fraction to darken the lower fill-gradient stop (0-1; default 0.25). |
| `boxes.opacity` | Fill opacity (0-1; default 0.92). Reduced-transparency mode uses an opaque tinted fill. |
| `borders.tint` | Lerp from the original gray edges (0) to section-colored edges (1); default 0.8. |
| `borders.whiteMix` | Mix white into the colored edge highlight (0–1); default 0.25. |
| `headings.tint` | Lerp from white text (0) to the vertical white-to-section-color gradient (1); default 0.8. |
| `headings.whiteMix` | Lighten the gradient's lower color (0–1); default 0.25 keeps dark palettes legible. Use 0 for the pure base color. |
| `headings.whiteStop`, `colorStop` | Gradient stop positions as percentages down each text box; defaults 0 and 100. Multiline titles share one gradient. |

One `sectionEdgeDistance` replaces the separate start/end controls in both CV languages. Outer margins and trailing card-stack gaps are removed, exposed first/last text uses font-aware trimming with automatic accent and descender allowance, and color transitions meet at their 50/50 midpoint on the section boundary. This keeps content spacing and the visual color boundary aligned as text wraps and cards change height. Measurements update when text wraps, fonts load, or text changes, with no per-scroll text measurements. Without JavaScript or native text-box trimming, headings keep ordinary readable line spacing. The hero keeps its separate portrait layout; print uses 2rem at both edges.

Box fills, borders, and main headings inherit `sections.<name>.baseColor` from `cv-network.ts`. Heading gradients cover only the name and section titles (h1/h2). Body text, icons, card titles, table captions, headers/cells, and labels share `contentColor`. Box tint mixes the default fill with a dark version of the section hue and capped saturation. Both endpoints use the default color's HSL lightness, so tinting never imports the bright theme lightness or spins through unrelated hues. Print and forced-color modes use readable solid text. Changing a section base color updates its mesh, box fills, edges, and main headings together.

To replace the silhouette, add the approved transparent PNG to `public/images/` and set each language's optional `portrait` field to `{ src: '/images/your-portrait.png', alt: 'Localized description' }`. The image sits flush with the hero's lower boundary. Keep the asset out of `public/` until it is approved for publication. Replace placeholder copy and table rows with supplied facts only.

- `src/layouts/PageLayout.astro` contains shared HTML, canonical URLs, and basic site navigation; the CV view omits the site header. There are no CV navigation or alternate-language links.
- `src/pages/404.astro` supplies the missing-page message.
- `astro.config.mjs` sets the canonical domain to `https://rongonen.fi`. The live domain connection is configured separately in `wrangler.jsonc`.
- `public/` contains assets copied directly to the public website. Never place private material there.
- `ignored-files/` holds local planning notes and is excluded from Git. The implementation plan records the agreed scope; `operations-handover.md` records machine-specific access, deployment identifiers, verification, and troubleshooting lessons. These files are not included in a fresh clone. Older context documents contain superseded proposals. No credentials belong there.

There is no portfolio content model, blog publishing system, sitemap, RSS, or analytics yet. Those will be added when their content and design are agreed. Do not add sample experience or projects to fill the placeholders.

## CV network background

Both CV languages share a lightweight WebGL2 renderer that projects real 3D nodes and connections, with a Canvas2D fallback when WebGL is unavailable or its context is lost. There is no new runtime dependency. One continuous mesh and camera span the entire CV. Section masks change only its colors: a line crossing a boundary stays connected and gradually changes color through the same fade as the background. Perspective makes nearby nodes move faster than distant nodes during scrolling. The mesh repeats vertically with connections between neighboring repeats, so it covers any CV length without restarting at headings.

Edit **`src/data/cv-network.ts` → `cvNetworkConfig`** and save while `npm run dev` is running. Build again to update a production preview. Use six-digit hex colors.

| Setting | Effect |
| --- | --- |
| `defaults.baseColor`, `centerColor`, `edgeColor` | Shared node/line color, gradient center, and gradient edges (black by default). |
| `sections.hero/profile/strengths/skills/history` | Override any of those three colors for each section. Existing base/center overrides take precedence over defaults. |
| `sectionTransition` | Full fade distance in CSS pixels centered on each section boundary (default 180: 90px on each side). Zero restores hard boundaries. Each half is capped at half its section's height so short sections cannot overlap fades. CSS backgrounds and both mesh renderers share the same midpoint. |
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

For example, change `sections.skills.centerColor` for its background, `sections.skills.baseColor` for its dots and lines, or add `edgeColor: '#080808'` to that section to replace its black edges with dark gray.

The canvas uses stable large-viewport height (`100lvh`, with a `100vh` fallback), and the renderer measures that same CSS box. Mobile address-bar expansion therefore does not rescale the camera or stretch the bitmap; normal window resizing and rotation still update it. The GPU uploads node and line geometry once and draws its vertical repeats with instancing. Both renderers paint nodes from far to near across all repeats, so overlapping nodes respect depth. This order is cached during scrolling; enabling optional yaw animation recomputes the order and updates only the small GPU node buffer as the angle changes. Scrolling updates camera and color uniforms instead of rebuilding per-line gradients. Only visible section colors are drawn; all-black-on-black sections are skipped. The renderer coalesces scroll updates and stops when idle or the tab is hidden. Touch devices retain the dark glass tint but omit backdrop blur to avoid repeatedly blurring the animated background. It sits behind the existing content and cannot intercept clicks. Reduced-motion preferences disable parallax and idle animation; a static projection continues across the sections and scrolls with the document. Printing hides the canvas; CSS gradients and all CV content remain available without JavaScript.

Implementation: `src/components/CvNetwork.astro`, `src/scripts/cv-network.ts`, the GPU shaders in `src/scripts/cv-network-webgl.ts`, and the pure geometry module `src/scripts/cv-network-scene.ts`. Run `node --test tests/cv-network-scene.test.mjs` for the geometry regression checks, plus the usual `npm run check` and `npm run build`. Browser review should cover both CV routes, section boundaries, narrow screens, scroll depth, and reduced motion.

The rendered-spacing regression is `node tests/cv-spacing.browser.mjs` with the browser environment variables below (default port 8793). It measures painted heading letters and card borders, compares gradient and solid text to catch clipped accents, and checks both languages at desktop/mobile widths and custom shared distances.

The design regression suite is `node tests/cv-design.browser.mjs` (same environment variables below; defaults to preview port 8788). It checks actual interpolated pixel colors in both renderers, image loading, narrow screens, print, forced colors, and no-JavaScript rendering.

The optional browser regression suite is `node tests/cv-network-webgl.browser.mjs` against a running production preview. It uses an externally installed Playwright runtime (no new production dependency). Set `PLAYWRIGHT_MODULE` to its ESM module URL if it is not on Node's module path, `BROWSER_CHANNEL` to an installed channel such as `msedge` if needed, and `CV_PREVIEW_URL` to override the default `http://127.0.0.1:8787`. Run `node tests/cv-network-depth.browser.mjs` with the same browser settings for deterministic overlap pixel checks, including repeated rows and rotation. The main suite checks GPU buffer reuse, pixel-level vertical repetition, repeat controls, shared cameras, mobile toolbar/orientation behavior, reduced motion, optional animation, and GPU failure fallback.

## Hosting

The site uses **Cloudflare Workers Static Assets**, Worker `website`, with source in [a-rongonen/website](https://github.com/a-rongonen/website). `wrangler.jsonc` contains the account, Worker name, static-asset settings, and `rongonen.fi` custom domain.

- Public site: [rongonen.fi](https://rongonen.fi)
- Cloudflare address: [website.aleksanteri-rongonen1.workers.dev](https://website.aleksanteri-rongonen1.workers.dev)
- Worker dashboard: [website on Cloudflare](https://dash.cloudflare.com/e42f3d2616075ff3e985c02dedbcfcbe/workers/services/view/website/production)
- Production branch: `main`. This repository is connected to Workers Builds; check its Builds tab after each push. A successful Git push does not itself confirm a successful deployment.

The build produces `index.html` plus individual HTML files such as `cv.html` and `en/blog.html`. Wrangler serves `./dist`, with `assets.html_handling: 'drop-trailing-slash'` and `assets.not_found_handling: '404-page'`. This preserves the requested URLs and serves the custom 404 with an HTTP 404 status. No Astro Cloudflare adapter or server rendering is required.

Use **Node 24.12.0** in Cloudflare too, through `.node-version` or the `NODE_VERSION` build variable. Workers Builds uses production branch `main`, repository root, build command `npm run check && npm run build`, and deploy command `npx wrangler deploy`. The Worker name must match `website` in `wrangler.jsonc`. Branch preview URLs are disabled for the initial setup.

Cloudflare API credentials are supplied outside the repository through the command environment. Never store them in this project or print them. The Cloudflare GitHub app has already been connected for this repository. OVHcloud remains the domain registrar. Preserve unrelated DNS records, including mail, during hosting changes.

`www.rongonen.fi` redirects permanently (HTTP 301) to `https://rongonen.fi`, preserving the path and query string for both HTTP and HTTPS requests. The zone's **Website redirects** ruleset contains the `www_to_root` Single Redirect rule: match `http.host eq "www.rongonen.fi"`, target `concat("https://rongonen.fi", http.request.uri.path)`, preserve query string. A proxied DNS A record for `www` points to `192.0.2.0` solely to route requests through Cloudflare; the redirect runs before that placeholder address is used. These are zone settings, separate from Wrangler's root-domain configuration. Editing the rule through the API requires **Zone → Single Redirect → Edit** permission.

To undo a published code change, create a Git revert commit for that change and push it, then confirm the resulting Cloudflare build succeeds. Worker configuration and root-domain attachment live in `wrangler.jsonc`; GitHub build settings and any zone redirect rules live in Cloudflare's dashboard. Keep them documented here when changed.

The `miniflare` dependency override selects the patched `sharp` 0.35.5 release for Wrangler's local image tooling (GHSA-wq5f-xc86-pv6w). Remove the override once Wrangler's dependency includes that fix, and verify local Cloudflare preview after changing it.

## Git workflow

Saving changes local files. A commit records a checkpoint. A push sends commits to GitHub. Cloudflare automatic deployment is configured: every push to `main`, including documentation changes, starts a production build and publishes after that build and deployment succeed.

Review `git status` and `git diff` before committing; inspect new files too. Commit source files and `package-lock.json`. Generated folders (`node_modules/`, `dist/`, `.astro/`) and local planning notes stay ignored. Prefer Bash or Python for custom scripts; do not add PowerShell scripts without the owner's agreement.
