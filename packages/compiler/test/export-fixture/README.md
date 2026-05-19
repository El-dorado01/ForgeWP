# Export Fixture Integration Test

This folder contains a small Node script to validate `exportTheme()` against the `packages/starter` fixture.

How to run locally

1. Install workspace dependencies:

```bash
pnpm -w install
```

2. Run the test (recommended: let it run the starter build):

```bash
# default: runs the starter build first
node packages/compiler/test/export-fixture/run-export-fixture.js

# to skip the starter build (assume dist already exists)
RUN_BUILD=false node packages/compiler/test/export-fixture/run-export-fixture.js
```

The script exits with code `0` on success and `1` on failure and prints a JSON summary of validated files.

The validation now checks:
- required WordPress theme files like `functions.php`, `style.css`, `index.php`, `single.php`, and `404.php`
- compiled static fragments under `.forgewp/out/<slug>/forgewp-static`
- copied Vite build assets including `forgewp-editor.js` and optional hydration chunks
- generated `forgewp-hydrator.js` when hydration islands are present
- generated `page-*.php` theme templates for any `.forgewp/template-*.html` sources
- valid `theme.json` payload and basic theme metadata in `style.css`
