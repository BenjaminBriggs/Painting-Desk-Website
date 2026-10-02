# CLAUDE.md

Marketing and support site for Painting Desk, the miniature-painting tracker, at paintingdesk.app
(app repo: `../Plinth`). The app was called Plinth until 2026-10-02: the code, bundle ID
(`pro.briggs.plinth`) and repo folders keep that name; copy, titles and meta never use it (SPEC.md §11.1).
A lowercase "plinth" is still the physical display base, the `plinth` colour token and the
`.on-plinth` class (the strip under a photo).
**What the site is and why lives in `SPEC.md` — read it first.** Same stack as
`../Magic-Sudoku-Website`.

## Stack

- Static HTML, no build step. Tailwind via CDN with the theme in `js/tailwind-theme.js`
  (tokens from `../Plinth/docs/DESIGN.md`); component classes in `css/site.css`.
- Header and footer are client-side includes (`include-html="/includes/…"`, `js/includes.js`).
- `js/app-store.js` is the release switch: `APP_RELEASED = false` turns App Store links into
  "Coming soon".
- Netlify publishes the repo root; all config in `netlify.toml`.

## Development

```
netlify dev --dir . --port 8890 --staticServerPort 4001
```

## Rules

- No Games Workshop marks anywhere (SPEC.md §4).
- British spelling. No emoji, no gradient washes, no highlighter effects on headlines.
- One accent action per page.
- Verify before deploying (SPEC.md §9). `main` deploys to production; work on `dev`.
