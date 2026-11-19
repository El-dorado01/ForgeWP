# ForgeWP

**Build native WordPress themes with React, Tailwind CSS and Vite.**

ForgeWP brings a modern frontend workflow to WordPress theme development. Author layouts in React and TypeScript, preview them with local CMS data, and export an installable theme with PHP templates, WordPress integration, production assets and registered Gutenberg blocks.

You own the design in code. Editors manage the content you expose through page fields, saved WordPress content and reusable blocks. The exported theme runs inside WordPress without a separate Node.js frontend server.

[Documentation](https://www.forgewp.dev) ? [Getting started](https://www.forgewp.dev/docs/core/installation/create-project) ? [Architecture](docs/architecture.md) ? [Remaining work](FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md)

## Why ForgeWP

- **A frontend workflow for theme developers.** React components, TypeScript, Tailwind CSS and Vite's local feedback loop, with a compiler that produces WordPress theme files.
- **Content ownership you can choose.** Keep layouts in code, expose named editable values, render saved WordPress content, or give editors movable Gutenberg sections.
- **Local preview without a WordPress database.** Develop against mock posts, pages, menus, options and users in the project's `cms/` data. Install WordPress when you are ready to validate the exported behavior.
- **WordPress data in familiar React patterns.** Use framework bindings for queries, menus, media, metadata, options and theme settings.
- **Focused browser interactivity.** Add interactive islands where a component needs browser behavior, with compiler discovery and explicit hydration controls for supported patterns.
- **Account and form workflows.** Use the Auth package for account interfaces and the native forms infrastructure for server-validated submissions, delegated fields and WordPress administration.
- **Tools for repeated work.** Scaffold pages, blocks, shared editable sections, forms and islands; inspect project health and export a theme ZIP from the CLI.

## From source to WordPress

1. **Author and preview.** Build the theme in React and configure its WordPress features in `wp.config.ts`. Use local CMS data to work on layouts and content states.
2. **Export.** ForgeWP builds assets, renders the app, translates recognized framework constructs into WordPress behavior, generates theme files and blocks, and packages the result.
3. **Install and verify.** Upload the theme ZIP to WordPress and check real content, editor behavior, permissions, plugins and deployment settings.

Ordinary React components provide rendered markup. ForgeWP does not translate arbitrary JavaScript into PHP; its supported bindings and compiler patterns determine the generated WordPress behavior. Interactive features can include client-side JavaScript.

## Get started

Use a compatible Node.js version: `^22.18.0 || >=24.11.0`, as declared in the package manifests. The following example uses npm:

```sh
npx create-forgewp my-theme
cd my-theme
npm install
npm run dev
```

Complete the scaffolder's prompts for the React theme workflow. If dependencies were installed by the wizard, the explicit install step is optional. Use the corresponding commands if you choose pnpm, Yarn or Bun.

When the theme is ready, run this from its project directory:

```sh
npm run export
# Or: pnpm forgewp export
```

The export command reports the ZIP location. Install that ZIP through WordPress's theme upload screen. `npm run build` builds the Vite assets; use the **export** command to generate the WordPress theme package.

Continue with [requirements](https://www.forgewp.dev/docs/core/installation/requirements), [local preview](https://www.forgewp.dev/docs/core/installation/run-dev-server), and [theme export](https://www.forgewp.dev/docs/core/installation/export-theme).

## Choose what editors control

| Editing need | ForgeWP approach |
| --- | --- |
| Change named values in a fixed layout | `defineEditable()` schemas and `useWpMeta()` bindings |
| Write saved WordPress content inside a coded template | `BlockArea` |
| Insert and reorder reusable sections | Registered Gutenberg blocks authored with `defineBlock()` |
| Compose smaller blocks inside a section | Parent blocks with `innerBlocks` |
| Share a section between page fields and a block | Explicit content ownership and the `make:section` scaffolder |

See [Content Ownership and Editability](https://www.forgewp.dev/docs/core/content-ownership/page-content-and-editables) before choosing an editing model.

## Packages

| Package | Responsibility |
| --- | --- |
| [`create-forgewp`](packages/create-forgewp/) | Scaffold theme projects |
| [`@forgewp/compiler`](packages/compiler/) | CLI, source analysis, rendering, WordPress generation and export |
| [`@forgewp/react`](packages/react/) | React bindings, content primitives and schema APIs |
| [`@forgewp/ui`](packages/ui/) | Component registry resources used by `forgewp add` |
| [`@forgewp/auth`](packages/auth/) | Login, registration, recovery, sessions and account UI |
| [`@forgewp/plugin-seo`](packages/plugin-seo/) | Compiler extension for SEO integration |
| [`@forgewp/woocommerce`](packages/woocommerce/) | Commerce integration; a separate implementation/documentation workstream |

For Auth, start with the [account workflow guide](https://www.forgewp.dev/docs/auth/auth-overview/overview). For forms, start with [Native Forms](https://www.forgewp.dev/docs/core/forms-search/native-forms).

## Useful CLI commands

Run these from a theme project. These examples use pnpm; the scaffold also exposes the `forgewp` script for other package managers.

| Command | Purpose |
| --- | --- |
| `pnpm forgewp make:page AboutUs` | Scaffold a WordPress page template |
| `pnpm forgewp make:block HeroBlock` | Scaffold a Gutenberg block |
| `pnpm forgewp make:section HeroSection --page=front-page --block` | Scaffold a shared editable page/block section |
| `pnpm forgewp make:island CounterIsland` | Scaffold a browser-interactive island |
| `pnpm forgewp make:form Contact --fields=name:text,email:email,message:textarea` | Scaffold a form configuration and starter component |
| `pnpm forgewp add navbar` | Add a component through the registry workflow |
| `pnpm forgewp doctor` | Inspect project configuration and health |
| `pnpm forgewp export` | Generate the installable WordPress theme ZIP |

See the [CLI reference](https://www.forgewp.dev/docs/core/cli-reference/command-reference) for the full command and option contracts. Review repair, reset and cleanup commands before running them against a project with custom work.

## Validation and current boundaries

Local preview and generated-output tests support development, but real WordPress acceptance is essential for cookies, authorization, mail delivery, editor behavior and plugin compatibility. Auth UI gates and displayed role or JWT claims do not authorize access to protected data.

The [active improvement brief](FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md) tracks remaining acceptance and framework work. The [Auth security review](audit/auth-security-review.md) records the implemented request/session controls and their deployment limits. Companion WordPress plugin ZIP export remains planned work; theme `src/server` code is currently theme-bound.

## Work on the framework

This repository is the framework monorepo; a generated theme is a separate project. Install workspace dependencies with `pnpm install`. The [repository scripts](package.json) provide workspace workflows, and individual packages declare their own checks.

For compiler regressions:

```sh
pnpm --dir packages/compiler test
```

Generated-PHP checks require the PHP CLI. The separate browser checks require Chrome or Chromium; see the [Auth browser-check guide](packages/compiler/test/browser/README.md).

For the internal design context, start with the [documentation index](docs/README.md), [architecture overview](docs/architecture.md), and [design history](docs/history.md). Earlier proposals, reviews and handoffs are preserved in [the archive](docs/archive/) as historical records rather than a synchronized backlog.

## Documentation for agents

The documentation site publishes an [AI-reader index](https://www.forgewp.dev/llms.txt), [full Markdown export](https://www.forgewp.dev/llms-full.txt), and [compact agent guide](https://www.forgewp.dev/reader/agent-guide.md). These cover reviewed Core and Auth guides; unfinished module previews are excluded.

## License

MIT © ForgeWP Community.
