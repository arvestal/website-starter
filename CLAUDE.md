# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

This repo started from `arvestal/website-starter` — a template distilled from two prior
projects: [softball](https://github.com/arvestal/softball) (allenvestal.com, no DB) and
[playoff-fantasy](https://github.com/arvestal/playoff-fantasy) (playoffrally.com, SQLite +
OAuth + email). The sections below "Reusable conventions" carry lessons from both and should
stay accurate across every project forked from this template — update them here (and ideally
port the fix back to the other repos) if a convention turns out to be wrong, not just in one
project's copy. Everything under "Project-specific" is a placeholder for the new project to
fill in.

---

## Reusable conventions

### Stack

Node.js + Express + Handlebars (`express-handlebars`) views, vanilla JS on the frontend (no
build step, no frontend framework — both source projects deliberately dropped AngularJS/jQuery
in favor of server-rendered HTML plus small `public/js/*.js` files for the occasional bit of
interactivity, e.g. click-to-sort tables). Deployed on Railway.

### Testable app.js pattern

`src/app.js` builds and exports the Express `app` unconditionally, and only calls
`app.listen()` when run directly:

```js
/* istanbul ignore if -- exercised by starting the process, not by tests */
if (require.main === module) {
  app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
}
module.exports = app;
```

This lets `tests/app.test.js` `require('../src/app')` and drive it with `supertest` without
binding a real port. The same pattern applies to any standalone script with a `main()` (see
softball's `scripts/generate-stats.js`): export the pure functions, guard the auto-run.

### Testing

Jest + `supertest`. `package.json`'s `jest.collectCoverageFrom` scopes the 100%
lines/functions/branches/statements threshold to the files that matter (`src/app.js`,
`src/lib/**`, `src/routes/**`) rather than the whole repo — this is how both source projects
avoid needing to test things like DB seed scripts or one-off CLI tools to the same bar. Add new
directories to `collectCoverageFrom` as the project grows; don't just drop the threshold instead.

Env-var-dependent branches (a `SITE_HOST`/`PORT` fallback, etc.) need `jest.doMock` +
`jest.resetModules()` to exercise both branches — see `tests/app-port.test.js` and the
"with SITE_HOST configured" block in `tests/app.test.js` for the pattern.

### Linting

`eslint.config.js` (flat config) — plain Node/CommonJS, no browser/JSX globals. `public/` and
`data/` are excluded from lint (client-side scripts and generated/data files respectively).

### Data: no DB by default

This template has no database. If a project's data is static or changes rarely (like softball's
season stats, sourced from CSV exports), prefer softball's pattern: a one-off generator script
(`scripts/generate-stats.js`) that reads the raw source and writes a committed, plain JS data
module the app just `require()`s — no runtime parsing, no cache layer, no DB. Re-run the
generator and commit the diff when the source data changes.

### Adding a database (when a project actually needs persistence/accounts)

Follow playoff-fantasy's pattern rather than reinventing it:
- `better-sqlite3`, schema in `src/db/database.js` using `CREATE TABLE IF NOT EXISTS`.
- **This does not migrate an existing DB on schema changes.** In dev/pre-launch, the fix is
  `rm -rf data/ && npm run seed` (or equivalent), not a hand-written `ALTER TABLE`. Only
  introduce real migrations once there's production data that can't be thrown away.
- Any column used with `INSERT OR IGNORE` for dedup MUST have a `UNIQUE` constraint, or the
  dedup silently fails and re-seeding doubles every row.
- On Railway, SQLite needs a persistent volume mounted at the DB's directory (Service → Settings
  → Volumes). Don't set volume config in `railway.toml` — playoff-fantasy found this conflicts
  with a UI-attached volume. Keep `railway.toml` to just `startCommand`.
- Runtime state that changes at runtime (current week, feature flags, etc.) belongs in a
  key/value `settings` table read/written through small `getSetting`/`setSetting` helpers, not
  scattered `.env` values that would need a redeploy to change.

### Adding auth (Google OAuth)

playoff-fantasy's pattern: `passport` + `passport-google-oauth20`, session store via
`connect-sqlite3` (or swap for whatever DB the project uses), `express-session`. Grant admin by
matching the signed-in email against a hardcoded constant (`arvestal@gmail.com` in
playoff-fantasy) rather than a DB flag that needs manual setup — simplest option for a
single-admin personal project.

### Adding email

Use [Resend](https://resend.com) (HTTPS API) — **not SMTP**, Railway blocks outbound port 465.
Without an API key set, email sends should no-op silently rather than crash the request that
triggered them; don't make email delivery a hard dependency for a user-facing action to
succeed.

### Handlebars gotcha

A custom helper used as a block (`{{#helperName}}...{{/helperName}}`) MUST check
`options.fn`/`options.inverse` and branch on it. A plain `(a, b) => a === b` helper invoked with
block syntax renders its raw boolean return value as literal "true"/"false" text instead of
conditionally showing content — this was a real bug in playoff-fantasy. If a helper is only ever
used inline (`{{helperName a b}}`), a plain function is fine.

### Deployment (Railway)

- Push to the deploy branch (`main` or `master` — pick one and be consistent) → Railway
  auto-deploys via its GitHub connection, building with Railpack (no Dockerfile needed).
- **Auto-deploy-on-push is not automatic just because the service has a connected source repo.**
  It requires an explicit GitHub push deploy trigger (`Service.repoTriggers` in Railway's API —
  there's no CLI/dashboard command for it as of this writing; create it with the
  `deploymentTriggerCreate` GraphQL mutation, `{ branch, checkSuites: true, environmentId,
  projectId, provider: "github", repository: "<owner>/<repo>", serviceId }`). Check for it early
  when standing up a new project from this template — don't assume it exists just because
  `service.source.repo` is set; query `repoTriggers { edges { node { branch } } }` and confirm it's
  non-empty. allenvestal.com had `source.repo` set but an empty `repoTriggers` list for a while
  after a repo rename, so every push silently required a manual redeploy (see below) until this
  was caught.
  - If `deploymentTriggerCreate` fails with "no one in the project has access to it", Railway's
    GitHub App isn't authorized on that repo — grant it at `github.com/settings/installations`
    (switch to "All repositories" or add the repo explicitly), then retry.
- **Redeploying an already-connected service does not necessarily pull the newest commit.**
  `railway redeploy` re-deploys whatever commit is *already* built. To force a fresh pull after
  pushing, reconnect the source: `railway service source connect --repo <owner>/<repo> --branch
  <branch> --service <name>` — this both re-syncs to the latest commit and triggers a build.
  This was a repeated footgun in softball; don't assume a plain redeploy picked up new code
  without checking `railway deployment list --json` for the commit hash.
- Keep `railway.toml` minimal (just `startCommand`) unless there's a specific reason for more —
  see the DB/volumes note above for why over-specifying can conflict with dashboard-managed
  resources.
- `/health` returning `200 {"status":"ok"}` is wired up from the start for Railway's
  healthcheck gate, even before anything else exists.
- **Static assets need cache-busting or CSS/JS changes won't show up for returning visitors.**
  Cloudflare (and most CDNs) stamp static file extensions with a long browser `Cache-Control`
  (observed: `public, max-age=14400`, 4 hours) regardless of what the origin sends — a returning
  visitor's browser won't even re-check the server until that window expires. This template
  already handles it: `src/app.js` sets `ASSET_VERSION` from Railway's auto-injected
  `RAILWAY_GIT_COMMIT_SHA` (falling back to `'dev'` locally) and exposes it as
  `res.locals.assetVersion`; `views/layouts/main.hbs` appends it to the stylesheet link
  (`/css/main.css?v={{assetVersion}}`) so every deploy gets a new URL and bypasses stale caches.
  Keep this wiring if you add more static assets (JS files, etc.) rather than dropping it as
  unnecessary complexity — allenvestal.com shipped a CSS change that silently didn't render for
  the project owner until a hard refresh, purely because of this.

### Deployment (custom domain + Cloudflare DNS)

Once a project has a real domain:
1. Add the domain as a Railway custom domain on the service (`railway domain <domain>
   --service <name>`) — this returns a required CNAME target and a `_railway-verify` TXT record.
2. If DNS is on Cloudflare: create a CNAME at the apex pointing to that target, **unproxied**
   (grey cloud) so Railway can issue its own Let's Encrypt cert directly. Add the verification
   TXT record. Cloudflare flattens apex CNAMEs into A records automatically — this is normal
   and expected, not a misconfiguration.
3. Railway's free plan allows only **one custom domain per service** — `www` can't be a second
   Railway custom domain. Point `www`'s CNAME at the same Railway target, **proxied** (orange
   cloud), and add a Cloudflare Page Rule redirecting `www.<domain>/*` →
   `https://<domain>/$1` (301). This is how both source projects handle `www`.
4. **If the apex's own Railway-issued certificate gets stuck** (Railway dashboard/API shows
   `CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP` for an extended period, well past normal
   issuance time, even with verified-correct DNS) — don't just keep waiting or repeatedly
   delete/recreate the domain (risks Let's Encrypt rate limits). Instead, flip the apex CNAME to
   **proxied** too, matching `www`. Cloudflare's own Universal SSL certificate already covers
   both the apex and `*.<domain>` (confirm via the SAN list on `www`'s cert), so proxying the
   apex serves visitors a valid cert from Cloudflare's edge regardless of Railway's stuck
   internal state — this fully sidesteps the problem rather than fixing Railway's cert. Origin
   traffic from Cloudflare to Railway keeps working through whatever SSL/TLS mode is already in
   use (confirmed by `www` already working before you touch the apex).
5. A DNS-only property in Google Search Console just needs one TXT record at the apex — no API
   key or OAuth needed, no code changes.

### Git workflow

Default to feature branch → PR → CI (lint + test) → merge, matching playoff-fantasy. This is a
**per-project, sometimes per-phase** call, not a fixed rule — e.g. softball started with
branch+PR, then the project owner explicitly asked to switch to committing straight to `master`
once it was just content changes on a low-stakes personal project. Follow whatever the project
owner has most recently said for *this* repo; don't assume the other repo's current mode
applies here. Whichever mode is active, still run lint + the full test suite before every
commit — that expectation doesn't relax even when the branch/PR ceremony does.

### Known footguns (general)

- A tracked `.DS_Store` (macOS) that Finder keeps rewriting will repeatedly block `git pull`/
  `git checkout` with "local changes would be overwritten." Untrack it immediately
  (`git rm --cached` + `**/.DS_Store` in `.gitignore`) rather than fighting it commit after
  commit.
- CSV/export column layouts drift between export dates — don't hardcode a positional column
  index array by hand-counting; look up columns by header name instead (`header.indexOf(name)`
  after splitting the first line). A hand-counted positional array in softball's original code
  silently shifted every field after one missing comma, and nobody noticed for years because the
  resulting numbers still looked plausible.
- Treat any third-party undocumented/public API (ESPN's scoreboard API in playoff-fantasy, etc.)
  as unverified — fail gracefully (skip/return null) on missing fields rather than throwing and
  aborting a whole batch job over one bad record.

---

## Project-specific

*(Replace everything below with details for the actual project.)*

### Core concept

What this site/app does, in 2-3 sentences.

### Commands

```bash
npm run dev     # nodemon auto-restart (development)
npm start        # production start
npm run lint
npm test          # jest with coverage
```

### Architecture map

- `src/app.js` — entry point, view engine setup, middleware, route mounting
- `src/lib/` — pure/testable logic (helpers, data transforms)
- `src/routes/` — Express routers
- `views/` — Handlebars templates (`views/layouts/main.hbs` is the shared layout)
- `public/` — static assets served as-is

### Conventions specific to this project

(Anything that doesn't apply to every fork of this template — naming, business rules, data
sources, etc.)

### Known footguns / past bugs (don't reintroduce)

(Populate as they're discovered.)

### Local dev

```bash
npm install
cp .env.example .env
npm run dev
```

### Deployment

- Railway project: _name_, service: _name_, custom domain: _domain_
- DNS: _where it's hosted (Cloudflare/registrar/etc.)_
