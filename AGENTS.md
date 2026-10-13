# Project instructions

- Check `ignored-files/`, including its `AGENTS.md`, `implementation-plan-for-the-human.md`, and `operations-handover.md`, for local context. The handover records verified deployment, authentication, resource identifiers, and troubleshooting lessons. This folder stays out of Git and may be absent in a fresh clone; use README and actual configuration in that case. The updated implementation plan takes precedence over older proposals in the other notes.
- Never store passwords, access tokens, API keys, or other secrets in this repository, including ignored files.
- Prefer Bash or Python for custom scripts. Do not create PowerShell scripts without the user's explicit agreement.

## Architecture

- Use conventional static Astro, npm, and the committed `package-lock.json`.
- Use Node.js 24.12.0, recorded in `.node-version`. Record any intentional version change in the documentation too.
- Use Astro file-based pages and a shared layout. No server rendering, Cloudflare adapter, client framework, database, or CMS is needed.
- The host is Cloudflare Workers Static Assets, Worker `website`, connected to `a-rongonen/website` for builds from `main`. `site` is `https://rongonen.fi`. Keep the Worker name and custom domain in `wrangler.jsonc` consistent with Cloudflare.
- Use `/` for the English homepage, `/cv` for the English CV, `/cv-fi` for the Finnish CV, `/en/portfolio` for the English portfolio, and `/en/blog` for the English blog. Only the CV has language alternatives. Do not introduce whole-site language prefixes or a root redirect.
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

- The first launch may use plain “coming soon” placeholders. The user leads content design and will provide CV/portfolio structure, content, and style direction later.
- Do not invent biographical details, CV sections, project descriptions, content blocks, sample articles, or visual design requirements.
- Use `ignored-files/cv-and-portfolio-assets/cv-copies.md` as the local guide to CV copy. It links to the owner's source snippets and records translation guidance; read it before adding or revising CV content. Keep the source document link and unused snippets in the ignored notes rather than publishing them.
- Finnish is the original CV copy language. Translate only the snippets used in the English CV, and record those translations in `cv-copies.md` for reuse. The source includes extra skill snippets for customized CVs; the website's four default skills are **markkinointi, luovuus, tekoäly, oppiminen** (marketing, creativity, AI, learning), in that reading order. Do not add more skill cards just because more snippets are available.
- Keep HTML semantic, navigation keyboard-accessible, and layouts usable on small screens. Keep each page’s canonical URL and HTML language accurate without adding links to either CV language version.
- A blog content system, sitemap, RSS, and analytics are later steps, not prerequisites for the placeholder foundation.

## Verification and Git

- Run `npm run check` and `npm run build` after implementation changes. Verify affected routes in a local preview.
- Preserve user work and planning files. Ignore `node_modules/`, `dist/`, `.astro/`, and local credentials.
- Saving, committing, pushing, and deploying are separate actions. Deployment is connected: every push to `main`, including documentation changes, starts a production build. Confirm the matching commit's successful Cloudflare build when publishing.
- Update README for portable hosting changes, and the ignored handover/plan for local operations and progress. Keep secrets out of every file. A code revert does not reverse DNS, redirect, or build-dashboard changes.
