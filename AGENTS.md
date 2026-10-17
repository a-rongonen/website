# Project instructions

- Check `ignored-files/`, including its `AGENTS.md`, `implementation-plan-for-the-human.md`, and `operations-handover.md`, for local context. The handover records verified deployment, authentication, resource identifiers, and troubleshooting lessons. This folder stays out of Git and may be absent in a fresh clone; use README and actual configuration in that case. The updated implementation plan takes precedence over older proposals in the other notes.
- Never store passwords, access tokens, API keys, or other secrets in this repository, including ignored files.
- Prefer Bash or Python for custom scripts. Do not create PowerShell scripts without the user's explicit agreement.

## Architecture

- Use conventional static Astro, npm, and the committed `package-lock.json`.
- Use Node.js 24.12.0, recorded in `.node-version`. Record any intentional version change in the documentation too.
- Use Astro file-based pages and a shared layout. No server rendering, Cloudflare adapter, client framework, database, or CMS is needed.
- The host is Cloudflare Workers Static Assets, Worker `website`, connected to `a-rongonen/website` for builds from `main`. `site` is `https://rongonen.fi`. Keep the Worker name and custom domain in `wrangler.jsonc` consistent with Cloudflare.
- Use `/` for the English homepage, `/cv` for the English CV, `/cv-fi` for the Finnish CV, `/portfolio` for the English portfolio, and `/blog` for the English blog. Only the CV has language alternatives. Do not introduce whole-site language prefixes or a root redirect.
- The visible site structure is Home → Portfolio / Blog. Keep both CV routes orphaned: no links to them from any page or navigation, no links between them, and no language switcher. Omit alternate-language cross-links and exclude the CVs from any future sitemap.
- Both CV routes render `src/layouts/CvLayout.astro` with shared styles in `src/styles/cv.css` and localized content in `src/data/cv.ts`. Keep this shared structure and the orphan-page behavior when editing either language.
- CV body sections are ordered data entries rendered by `CvSection.astro`. Empty entries must produce no section, heading, spacing or palette band; headings alone do not count as content. Palettes follow visible positions, and transitions must use actual visible neighbors in CSS and both canvas renderers. Keep the combined Profile text/strength bullets and the reusable empty final entry; extend the section list rather than hard-coding more layout sections. `cvDesign.bulletGap` controls spacing between bullet items.
- Preserve these URLs without trailing slashes. Static output uses `build.format: 'file'`; Cloudflare uses `html_handling: 'drop-trailing-slash'` and `not_found_handling: '404-page'`.
- Keep build-time pathname normalization in `PageLayout.astro`: file-format builds expose `.html` paths, which must not leak into canonical URLs or break current-navigation matching.
- The `www` 301 redirect is a Cloudflare zone Single Redirect plus a proxied DNS record, separate from Wrangler. Preserve paths, queries, and both HTTP/HTTPS support. README documents the rule. Do not recreate the Worker or GitHub connection when continuing setup.

## Existing account access

- On the original Windows machine, the Cloudflare token is stored in the Windows **User** environment as `CLOUDFLARE_API_TOKEN`. Existing command processes may need to load that scope explicitly. Separate PowerShell or WSL terminal exports do not propagate to this process. Never print the value; see the local handover for the working method.
- WSL Ubuntu has an authenticated GitHub CLI for `a-rongonen`. Windows Git did not have push credentials during setup. Prefer the existing WSL authentication before asking the user to sign in again; see the handover for the per-command Git credential helper.
- The redirect permission's dashboard name is **Zone → Single Redirect → Edit**. Some API documentation calls it Dynamic URL Redirects Write. Check actual errors and request only required access.

## Content and design

- If an asset needs compression or re-encoding, tell the owner the required size/format and let them do it. The owner wants to fine-tune the quality/compression trade-off; do not compress or re-encode assets yourself unless explicitly asked.
- The first launch may use plain “coming soon” placeholders. The user leads content design and will provide CV/portfolio structure, content, and style direction later.
- Do not invent biographical details, CV sections, project descriptions, content blocks, sample articles, or visual design requirements.
- Use `ignored-files/cv-and-portfolio-assets/cv-copies.md` as the local guide to CV copy. It links to the owner's source snippets and records translation guidance; read it before adding or revising CV content. Keep the source document link and unused snippets in the ignored notes rather than publishing them.
- Finnish is the original CV copy language. Translate only the snippets used in the English CV, and record those translations in `cv-copies.md` for reuse. The source includes extra skill snippets for customized CVs; the website's four default skills are **markkinointi, luovuus, tekoäly, oppiminen** (marketing, creativity, AI, learning), in that reading order. Do not add more skill cards just because more snippets are available.
- Keep HTML semantic, navigation keyboard-accessible, and layouts usable on small screens. Keep each page’s canonical URL and HTML language accurate without adding links to either CV language version.
- A blog content system, sitemap, RSS, and analytics are later steps, not prerequisites for the placeholder foundation.

## Media loading and scrolling performance

- Treat demand loading, stable layout and smooth scrolling as requirements for new website content and effects. Reuse the existing shared components and scheduling patterns rather than adding independent eager loaders or animation loops.
- On the portfolio, use `PortfolioMedia.astro` (and `PortfolioFeature.astro` where appropriate). Only the opening reel is eager. Keep other image, video, poster and embed sources inert until their selected content approaches the viewport; hidden slider/tab pages must wait for selection. Native `loading="lazy"` and `preload` hints alone do not enforce this. Preserve the current 150px loading lead unless a measured need justifies changing it. Elsewhere, eagerly load only media needed for the opening viewport and apply the same demand-loading principles below it.
- Supply accurate natural `width` and `height` for local images/videos and update them when replacing files. Reserve the final frame before downloading, including embed minimum heights and responsive sizing. Loading, decoding or initializing a player must not change the surrounding card/page geometry.
- Local-video autoplay requires selected content, actual viewport visibility, a visible document and no reduced-motion preference. Pause offscreen, hidden-slide and hidden-tab videos; preserve manual pauses and retain loaded elements for revisits. Preserve native keyboard/touch controls, no-JavaScript access and print behavior. Handle rapid selection while playback is buffering without stuck playback or repeated denied-autoplay retries.
- Use shared `IntersectionObserver` instances for visibility. Cache layout measurements and refresh them on relevant layout/font/content changes. Avoid per-scroll geometry reads, root style writes that repaint the page, and repeated heavy initialization. Schedule necessary scroll rendering through one pending `requestAnimationFrame` callback, with passive scroll listeners.
- Prefer opacity/transform animations over continuously animated shadows, filters or other paint-heavy properties. Pause decorative animation offscreen and in hidden tabs, and respect reduced motion. Preserve the owner's visual settings; profile a suspected effect before changing its appearance or disabling it.
- For media/loading or case-widget changes, run `tests/portfolio-loading.browser.mjs` and `tests/portfolio.browser.mjs` against a production preview, in addition to check/build. Extend relevant coverage when adding a new interaction: cold requests, hidden-content isolation, blocked/decoded desktop/mobile geometry, viewport playback, manual pause, rapid selection, reduced motion, keyboard/touch and no-JS/print. Adapt the same checks to new routes/components rather than relying on the portfolio tests to cover them automatically.
- For changes to scrolling, animation or rendering, compare representative before/after traces under the same viewport, DPR, CPU throttling and scroll sequence, without competing test browsers. Inspect paint/layout/main-thread work as well as frame timings; do not equate a headless workload improvement with a physical-device FPS guarantee. Keep portable behavior and verification guidance in README and machine-specific traces/results in ignored notes. Asset compression/re-encoding still requires the owner's explicit request.

## Verification and Git

- Run `npm run check` and `npm run build` after implementation changes. Verify affected routes in a local preview.
- Preserve user work and planning files. Ignore `node_modules/`, `dist/`, `.astro/`, and local credentials.
- Saving, committing, pushing, and deploying are separate actions. Deployment is connected: every push to `main`, including documentation changes, starts a production build. Confirm the matching commit's successful Cloudflare build when publishing.
- Update README for portable hosting changes, and the ignored handover/plan for local operations and progress. Keep secrets out of every file. A code revert does not reverse DNS, redirect, or build-dashboard changes.
