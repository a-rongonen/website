# Project instructions

- Check `ignored-files/`, including its `AGENTS.md` and `implementation-plan-for-the-human.md`, for local planning context. This folder stays out of Git. The updated implementation plan takes precedence over older proposals in the other notes.
- Never store passwords, access tokens, API keys, or other secrets in this repository, including ignored files.
- Prefer Bash or Python for custom scripts. Do not create PowerShell scripts without the user's explicit agreement.

## Architecture

- Use conventional static Astro, npm, and the committed `package-lock.json`.
- Use Node.js 24.12.0, recorded in `.node-version`. Record any intentional version change in the documentation too.
- Use Astro file-based pages and a shared layout. No server rendering, Cloudflare adapter, client framework, database, or CMS is needed.
- The intended host is Cloudflare Workers Static Assets, with GitHub-based automatic deployment configured in a later step. `site` is `https://rongonen.fi`.
- Use `/` for the English homepage, `/cv` for the English CV, `/cv-fi` for the Finnish CV, `/en/portfolio` for the English portfolio, and `/en/blog` for the English blog. Only the CV has language alternatives. Do not introduce whole-site language prefixes or a root redirect.
- Preserve these URLs without trailing slashes. Static output uses `build.format: 'file'`; configure Cloudflare HTML handling to match when deployment is added.

## Content and design

- The first launch may use plain “coming soon” placeholders. The user leads content design and will provide CV/portfolio structure, content, and style direction later.
- Do not invent biographical details, CV sections, project descriptions, content blocks, sample articles, or visual design requirements.
- Keep HTML semantic, navigation keyboard-accessible, and layouts usable on small screens. Keep canonical URLs and page languages accurate; language alternatives belong only on the two CV pages.
- A blog content system, sitemap, RSS, and analytics are later steps, not prerequisites for the placeholder foundation.

## Verification and Git

- Run `npm run check` and `npm run build` after implementation changes. Verify affected routes in a local preview.
- Preserve user work and planning files. Ignore `node_modules/`, `dist/`, `.astro/`, and local credentials.
- Saving, committing, pushing, and deploying are separate actions. Once deployment is connected, a push to `main` publishes after the Cloudflare build succeeds.
