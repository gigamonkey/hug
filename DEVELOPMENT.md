# Development

## Local testing

Build first, then test:

```bash
npm run build
npx hug --help
npx hug init --template webapp /tmp/test-project
```

Run the test suite:

```bash
npm test
```

To test as if installed globally, link the package:

```bash
npm link
hug --help
```

To unlink:

```bash
npm unlink -g @peterseibel/hug
```

## Project structure

- `src/cli.ts` — CLI entry point (commander-based).
- `src/clasp.ts` — Clasp resolution, auth error detection.
- `src/commands/` — One file per subcommand (init, fork, deploy, etc.).
- `src/deployment.ts` — Deployment selection and update helpers.
- `src/config-file.ts` — config.js read/write.
- `src/templates.ts` — Template resolution.
- `templates/` — Project templates copied by `hug init`.
- `plans/` — Implementation plans. `plans/done/` holds completed plans.

## Publishing to npm

The package is scoped as `@peterseibel/hug`.

### First time

Make sure you're logged in to npm and that your scope is configured:

```bash
npm login
```

Scoped packages are private by default. To publish as public:

```bash
npm publish --access public
```

### Automated publishing via GitHub Actions

Pushing a version tag triggers a GitHub Actions workflow that publishes to npm
automatically using [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
(OIDC — no npm token needed).

**One-time setup:**

1. On npmjs.com, go to the package settings for `@peterseibel/hug`.
2. Add a trusted publisher: your GitHub user/repo and workflow filename
   (`publish.yml`).

**To release:**

```bash
npm version patch   # or minor / major
git push --follow-tags
```

`npm version` bumps `package.json`, commits, and creates a `v*` tag. Pushing the
tag triggers the workflow in `.github/workflows/publish.yml`. (You can also use
`git config push.followTags true` to configure the repo to always push tags and
then `npm version patch && git push` will do the trick.)


## Dependencies

The only runtime dependency is `@google/clasp`. It's listed in `package.json`
so it gets installed when users `npm install -g @peterseibel/hug`.

In user projects created by `hug init`, clasp is installed as a dev dependency
via `ensureClasp` in `src/clasp.ts`.

## Auth

Clasp credentials live in `~/.clasprc.json` (global, not per-project). To test
commands that talk to the Apps Script API, you need to have run `clasp login`
at least once.
