# create-forgewp 🚀

The official initializer for **ForgeWP** themes.

Scaffold a high-performance, React-powered WordPress theme project in seconds. Featuring **Vite**, **Tailwind CSS 4**, and a pre-configured WordPress template engine.

## 🏁 Quick Start

```bash
npx create-forgewp
```

Or with specific options:

```bash
npx create-forgewp my-new-theme --yes --adapter html
# Or
npx create-forgewp --projectName my-new-theme --adapter react
```

## 🛠️ What's Included?

- **Vite 6** Dev Server with HMR.
- **Tailwind CSS 4** with the "Sharp Edge" preset.
- **WordPress Compiler** for one-click theme generation.
- **Component Registry** integration (shadcn/ui compatible).
- **TypeScript** configured for React 19.

## 🧩 Framework Adapter Support

`create-forgewp` scaffolds a theme with a framework adapter boundary built in. The default adapter is `react`, but ForgeWP supports multiple adapters through the compiler package.

The starter template uses `@forgewp/compiler` to load the selected adapter at build time and discover hydration entrypoints via `getHydrationRollupInputs(__dirname)`.

### Example `wp.config.ts`

```ts
export default {
  name: 'My ForgeWP Theme',
  slug: 'my-forgewp-theme',
  version: '0.1.0',
  description: 'A ForgeWP starter theme',
  textDomain: 'my-forgewp-theme',
  frameworkAdapter: 'html',
};
```

This will make the compiler use the `html` adapter for static HTML-based themes instead of React.

## 📖 Usage

```bash
Usage:
  npm init @forgewp [project-directory] [options]

Options:
  -y, --yes           Use defaults (skip prompts)
  --no-install        Skip dependency install
  -h, --help          Show help
```

---

Built with ❤️ for the WordPress Community.
