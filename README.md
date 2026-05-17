# ForgeWP ⚒️

**ForgeWP** is a premium component-based development system for building ultra-fast, modern WordPress themes using **React**, **Tailwind CSS 4**, and **Vite**.

It bridges the gap between high-end React development and the WordPress ecosystem, allowing developers to build themes with a "Sharp Edges" aesthetic while maintaining full WordPress compatibility.

---

## 🏗️ Architecture

The ForgeWP ecosystem consists of three core pillars:

| Package | Purpose | Command |
| :--- | :--- | :--- |
| **`create-forgewp`** | The initializer CLI for new themes. | `npx create-forgewp` |
| **`@forgewp/compiler`** | The engine that compiles React to PHP & Gutenberg blocks. | `pnpm export` / `pnpm forgewp` |
| **`@forgewp/registry`** | A curated library of "Sharp" components. | `pnpm forgewp add` |

---

## ✨ Key Features

- **Sharp Aesthetics**: Zero border-radius by default. A brutalist, premium design system.
- **Dynamic Gutenberg Integration**: Write dynamic Gutenberg blocks in React, compile to native PHP blocks.
- **Static-First**: Ultra-performance by rendering React to static PHP templates.
- **shadcn/ui Integration**: Native support for the industry-standard UI library with automatic "Sharpening" transformation.
- **Developer Ownership**: No runtime dependencies in your WordPress theme. You own the code.

---

## 🚀 Getting Started

Start your first theme in seconds:

```bash
npx create-forgewp my-new-theme
```

---

## 📄 License

MIT © [Your Name/ForgeWP]
