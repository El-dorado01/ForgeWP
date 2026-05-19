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
- **Resilient "Self-Healing" Architecture**: An active framework immune system that auto-repairs missing configuration files or corrupted internal hooks on dev server boot.
- **Dynamic Gutenberg Integration**: Scaffold React blocks with attributes using simple command line parameters (`pnpm forgewp make:block`).
- **Post-Type Loop Components**: Instantly build loop layouts synced with dynamic simulated databases (`pnpm forgewp make:component`).
- **Static-First Performance**: Extreme speed and safety by transpiling React trees into standard zero-dependency WordPress PHP templates.
- **shadcn/ui Integration**: Native support for standard libraries with automatic "Sharpening" visual transforms.

---

## 🚀 CLI Commands At-A-Glance

| Command | Action | Example |
| :--- | :--- | :--- |
| **`doctor`** | Perform system diagnostic audits. | `pnpm forgewp doctor` |
| **`repair`** | Force heal/restore framework blueprints. | `pnpm forgewp repair` |
| **`clean`** | Prune workspace cache & build folders. | `pnpm forgewp clean` |
| **`make:block`** | Scaffold Gutenberg editor blocks. | `pnpm forgewp make:block PromoBlock --attributes=heading` |
| **`make:component`** | Scaffold custom post type grid loops. | `pnpm forgewp make:component JobList --postType=job` |
| **`make:post-type`** | Register mock database custom fields. | `pnpm forgewp make:post-type event --customFields=v_name` |
| **`add`** | Add shadcn or registry elements. | `pnpm forgewp add navbar` |
| **`export`** | Compile and package into production ZIP. | `pnpm forgewp export` |

Note: The export command supports `--validate` to run post-export validation and `--strict` to treat warnings as failures.

---

## 📄 License

MIT © ForgeWP Community

