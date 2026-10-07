# rongonen.fi

A minimal static Astro foundation for a personal website. The initial pages deliberately contain only placeholders. Content structure, CV and portfolio material, and visual direction will be designed with the owner later.

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

Only the CV has two language versions. The CV pages link to each other; the homepage, portfolio, and blog are English. The homepage stays at `/` without a language redirect.

- `src/layouts/PageLayout.astro` contains the shared HTML, navigation, basic CSS, canonical URLs, and CV language links.
- `src/pages/404.astro` supplies the missing-page message.
- `astro.config.mjs` sets the future canonical domain to `https://rongonen.fi`. That setting does not publish the website or connect the domain.
- `public/`, if needed later, is for files copied directly to the public website. Never place private material there.
- `ignored-files/` holds local planning notes and is excluded from Git. Read the updated implementation plan there for the agreed scope; older context documents contain superseded proposals. No credentials belong there.

There is no CV content model, portfolio content model, blog publishing system, sitemap, RSS, or analytics yet. Those will be added when their content and design are agreed. Do not add sample experience or projects to fill the placeholders.

## Hosting

The hosting target is **Cloudflare Workers Static Assets**, Worker `rongonen-website`, with source in [a-rongonen/website](https://github.com/a-rongonen/website). `wrangler.jsonc` contains deployment configuration. Public deployment and the GitHub build connection still need verification; this section will record their URLs when setup succeeds.

The build produces `index.html` plus individual HTML files such as `cv.html` and `en/blog.html`. Wrangler serves `./dist`, with `assets.html_handling: 'drop-trailing-slash'` and `assets.not_found_handling: '404-page'`. This preserves the requested URLs and serves the custom 404 with an HTTP 404 status. No Astro Cloudflare adapter or server rendering is required.

Use **Node 24.12.0** in Cloudflare too, through `.node-version` or the `NODE_VERSION` build variable. Workers Builds should use production branch `main`, repository root, build command `npm run check && npm run build`, and deploy command `npx wrangler deploy`. The Worker name must match `rongonen-website` in `wrangler.jsonc`.

Cloudflare API credentials are supplied outside the repository through the command environment. Never store them in this project or print them. Connecting automatic GitHub builds may require the owner's approval of Cloudflare's GitHub app. OVHcloud remains the domain registrar. No existing website needs to stay available during setup, but unrelated DNS records, including mail, must be preserved.

The `miniflare` dependency override selects the patched `sharp` 0.35.5 release for Wrangler's local image tooling (GHSA-wq5f-xc86-pv6w). Remove the override once Wrangler's dependency includes that fix, and verify local Cloudflare preview after changing it.

## Git workflow

Saving changes local files. A commit records a checkpoint. A push sends commits to GitHub. Once Cloudflare automatic deployment is configured, a push to `main` publishes only after its build and deployment succeed.

Review `git status` and `git diff` before committing; inspect new files too. Commit source files and `package-lock.json`. Generated folders (`node_modules/`, `dist/`, `.astro/`) and local planning notes stay ignored. Prefer Bash or Python for custom scripts; do not add PowerShell scripts without the owner's agreement.
