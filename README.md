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
- `astro.config.mjs` sets the canonical domain to `https://rongonen.fi`. The live domain connection is configured separately in `wrangler.jsonc`.
- `public/`, if needed later, is for files copied directly to the public website. Never place private material there.
- `ignored-files/` holds local planning notes and is excluded from Git. The implementation plan records the agreed scope; `operations-handover.md` records machine-specific access, deployment identifiers, verification, and troubleshooting lessons. These files are not included in a fresh clone. Older context documents contain superseded proposals. No credentials belong there.

There is no CV content model, portfolio content model, blog publishing system, sitemap, RSS, or analytics yet. Those will be added when their content and design are agreed. Do not add sample experience or projects to fill the placeholders.

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
