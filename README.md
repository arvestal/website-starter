# website-starter

Starter template for new Node/Express/Handlebars sites, distilled from
[softball](https://github.com/arvestal/softball) (allenvestal.com) and
[playoff-fantasy](https://github.com/arvestal/playoff-fantasy) (playoffrally.com). No database,
no auth — just the parts every new site needs. See `CLAUDE.md` for the full conventions this
was built from and how to extend it (adding a DB, sessions, OAuth, email).

## Using this for a new project

1. On GitHub: use this repo's **"Use this template"** button (or `gh repo create <name>
   --template arvestal/website-starter`) to create a new repo — don't fork directly, a fresh
   repo keeps history clean.
2. Find-and-replace `Site Name` in `views/layouts/main.hbs` and `views/home.hbs` with the real
   name, and update `package.json`'s `name`/`description`.
3. `npm install`, copy `.env.example` to `.env`.
4. Update `CLAUDE.md`'s project-specific sections (everything below "Project-specific" — the
   sections above that are the reusable conventions, keep those as-is unless they've changed).

## Development

```
npm install
npm run dev    # nodemon, http://localhost:8080
npm run lint
npm test        # jest, 100% coverage required on src/app.js, src/lib/**, src/routes/**
```

## Deployment

Railway, auto-deploying from `master`/`main`. See `CLAUDE.md`'s Deployment section for the exact
steps (custom domain, Cloudflare DNS, the deploy-doesn't-pull-new-commits gotcha).
