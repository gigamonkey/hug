# Development

## Local testing

There's no build step or test suite. To test locally, run commands directly:

```bash
./bin/hug --help
./bin/hug init --template webapp /tmp/test-project
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

- `bin/hug` — CLI entry point (bash). All subcommands live here.
- `lib/common.sh` — Shared functions sourced by `bin/hug`.
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

### Subsequent releases

1. Bump the version in `package.json` (or use `npm version`):

   ```bash
   npm version patch   # 0.1.0 -> 0.1.1
   npm version minor   # 0.1.1 -> 0.2.0
   npm version major   # 0.2.0 -> 1.0.0
   ```

   `npm version` creates a git commit and tag automatically.

2. Publish:

   ```bash
   npm publish
   ```

3. Push the version commit and tag:

   ```bash
   git push && git push --tags
   ```

## Dependencies

The only runtime dependency is `@google/clasp`. It's listed in `package.json`
so it gets installed when users `npm install -g @peterseibel/hug`.

In user projects created by `hug init`, clasp is installed as a dev dependency
via `ensure_clasp` in `lib/common.sh`.

## Auth

Clasp credentials live in `~/.clasprc.json` (global, not per-project). To test
commands that talk to the Apps Script API, you need to have run `clasp login`
at least once.
