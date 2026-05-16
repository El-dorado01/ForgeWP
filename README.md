# ForgeWP ⚒️

**ForgeWP** is a premium component-based development system for building ultra-fast, modern WordPress themes using **React**, **Tailwind CSS 4**, and **Vite**.

It bridges the gap between high-end React development and the WordPress ecosystem, allowing developers to build themes with a "Sharp Edges" aesthetic while maintaining full WordPress compatibility.

---

## 🏗️ Architecture

The ForgeWP ecosystem consists of three core pillars:

| Package | Purpose | Command |
| :--- | :--- | :--- |
| **`@forgewp/create`** | The initializer CLI for new themes. | `npm init @forgewp` |
| **`@forgewp/compiler`** | The engine that turns React into PHP. | `pnpm export` |
| **`@forgewp/registry`** | A curated library of "Sharp" components. | `pnpm forgewp:add` |

---

## ✨ Key Features

- **Sharp Aesthetics**: Zero border-radius by default. A brutalist, premium design system.
- **Static-First**: Ultra-performance by rendering React to static PHP templates.
- **shadcn/ui Integration**: Native support for the industry-standard UI library with automatic "Sharpening" transformation.
- **Developer Ownership**: No runtime dependencies in your WordPress theme. You own the code.

---

## 🚀 Getting Started

Start your first theme in seconds:

```bash
npm init @forgewp
```

---

## 📄 License

MIT © [Your Name/ForgeWP]
