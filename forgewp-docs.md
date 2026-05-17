# ForgeWP Framework Reference & Documentation Guide ⚒️📖

Welcome to the official developer guide for **ForgeWP**—the premium, component-driven visual framework that lets you build lightning-fast, modern WordPress themes using **React**, **Tailwind CSS v4**, and **Vite**.

This guide is organized phase-by-phase (aligned with our architectural roadmap) to serve as a complete developer reference with concrete code examples, CLI commands, and implementation specifications.

---

## 📦 How to Publish ForgeWP Packages

Before publishing, ensure you are logged into your npm account (`npm login`). Because ForgeWP uses scoped packages and standard monorepo workspace dependencies, use the following commands to publish to the npm registry:

### 1. Publish All Workspace Packages at Once
To publish all workspace packages (`create-forgewp`, `@forgewp/compiler`, `@forgewp/registry`) together:
```bash
pnpm -r publish --access public
```
*Tip: If you have uncommitted changes or tags you want to bypass during testing, add the `--no-git-checks` flag:*
```bash
pnpm -r publish --access public --no-git-checks
```

### 2. Publish a Single Specific Package
To publish only one of the packages (e.g., only the CLI compiler):
```bash
pnpm --filter @forgewp/compiler publish --access public
```

---

## 🟢 Phase 1 — Foundation

The foundation configures a lightning-fast developer environment using a pnpm monorepo structure.

### Project Structure Conventions
Every ForgeWP theme has a minimal, predictable structure:
```text
my-theme/
├── src/
│   ├── app/
│   │   └── page.tsx         # Main entry point (compiles to front-page.php/index.php)
│   ├── blocks/              # Custom Gutenberg Block definitions
│   │   └── HeroBlock.tsx
│   ├── components/          # Shared layout components
│   │   └── ui/
│   └── lib/                 # Core framework bindings & self-healing library
│       └── wordpress.tsx
├── wp.config.ts             # Theme configuration file
├── vite.config.ts           # Vite + Tailwind compiler setup
└── package.json
```

### Theme Configuration File (`wp.config.ts`)
Controls theme output settings, fonts, and styles:
```typescript
import { defineConfig } from "./src/lib/wordpress";

export default defineConfig({
  themeName: "ForgeWP Starter Theme",
  slug: "forgewp-starter",
  style: "forgewp", // Aesthetics: "forgewp" (brutalist, sharp) or "shadcn" (curved)
  googleFonts: [
    "Outfit:wght@300;400;500;600;700",
    "Lora:ital,wght@0,400;0,500;1,400"
  ]
});
```

---

## 🟢 Phase 2 — Theme Compiler

The theme compiler compiles a React single page application (SPA) layout into standard, fully compatible, installable WordPress PHP theme template structures.

### Compiled Theme Outputs
When running `pnpm export`, the compiler generates:
1.  **`index.php` & `front-page.php`**: Handled via dynamic rendering.
2.  **`single.php` & `page.php`**: Built with the signature Gutenberg dynamic loader.
3.  **`header.php` & `footer.php`**: Extracted statically from your React layout file splits.
4.  **`theme.json`**: Pre-configured global settings and Tailwind preset design tokens.
5.  **`functions.php`**: Registers styles, editor-styles, block enqueues, and preconnect fonts.

---

## 🟢 Phase 3 — Component System & Tailwind Customizer

ForgeWP features an elegant neo-brutalist registry and custom CSS transformations.

### 1. CLI Component Adder
Instantly fetch pre-built responsive components and add them to your `src/components/ui/` folder:
```bash
# Add a component using the unified CLI
pnpm forgewp add navbar
# Or with the explicit name parameter
pnpm forgewp add --name navbar
```

### 2. Auto-Sharpen Regex Resolver
If the theme config style is set to `"forgewp"`, the compiler automatically parses registry files and converts standard Tailwind rounded corners (`rounded-lg`, `rounded-md`, `rounded-full`) to `rounded-none` on the fly to guarantee a sleek, brutalist look without manual code updates!

---

## 🟢 Phase 4 — WordPress React Data Layer

ForgeWP provides zero-runtime React hooks and loop components that compile directly to clean, standard PHP functions.

### 1. WordPress Hooks API
Use hooks directly inside components to fetch post metadata:
```tsx
import { 
  useWpTitle, 
  useWpContent, 
  useWpDate, 
  useWpAuthor, 
  useWpFeaturedImage 
} from "@/lib/wordpress";

export default function BlogPostDetail() {
  const title = useWpTitle();
  const content = useWpContent();
  const date = useWpDate();
  const author = useWpAuthor();
  const featuredImage = useWpFeaturedImage();

  return (
    <article className="border-4 border-black p-6 bg-white">
      {featuredImage && (
        <img src={featuredImage} alt={title} className="w-full h-64 object-cover mb-4 border-2 border-black" />
      )}
      <span className="text-xs font-mono font-bold text-zinc-500">{date} by {author}</span>
      <h1 className="text-3xl font-black mt-2 mb-4 uppercase">{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content }} className="prose max-w-none" />
    </article>
  );
}
```

### 2. Loop Abstractions
Render standard WordPress post loops directly in React:

#### Standard Loop (`<WpLoop>`)
Iterates over current query context (e.g., inside index pages or search results):
```tsx
import { WpLoop } from "@/lib/wordpress";
import BlogPostCard from "@/components/BlogPostCard";

export default function BlogIndex() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <WpLoop>
        <BlogPostCard />
      </WpLoop>
    </div>
  );
}
```

#### Custom Loop (`<WpQueryLoop>`)
Retrieves custom queries by post type, limits, or categories:
```tsx
import { WpQueryLoop } from "@/lib/wordpress";
import ProjectCard from "@/components/ProjectCard";

export default function FeaturedProjects() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <WpQueryLoop postType="project" postsPerPage={4} categoryName="featured">
        <ProjectCard />
      </WpQueryLoop>
    </div>
  );
}
```

### 3. Dynamic WordPress Menus (`<WpMenu>`)
Renders native WordPress dynamic menu items using standard loop declarations:
```tsx
import { WpMenu } from "@/lib/wordpress";

export default function Navigation() {
  return (
    <nav className="flex space-x-6">
      <WpMenu location="primary">
        {(item) => (
          <a 
            key={item.id} 
            href={item.url} 
            className="text-sm font-bold uppercase tracking-widest hover:text-brand"
          >
            {item.title}
          </a>
        )}
      </WpMenu>
    </nav>
  );
}
```

### 4. Advanced Custom Fields (ACF) Integration
Get custom metadata fields with default fallbacks:
```tsx
import { useWpCustomField } from "@/lib/wordpress";

export default function PortfolioItem() {
  const clientName = useWpCustomField("client_name", "N/A");
  const budget = useWpCustomField("project_budget", "Confidential");

  return (
    <div className="border-4 border-black p-4 bg-yellow-100 font-mono">
      <p><strong>Client:</strong> {clientName}</p>
      <p><strong>Budget:</strong> {budget}</p>
    </div>
  );
}
```

---

## 🟢 Phase 5 — Gutenberg Integration

ForgeWP features first-class React scaffolding and dynamic PHP code transpilation for WordPress Gutenberg blocks.

### 1. Scaffolding Custom Blocks via CLI
To scaffold a custom React block inside your theme:
```bash
# Positionally
pnpm forgewp make:block PromoBanner
# Or using the name parameter flag
pnpm forgewp make:block --name PromoBanner
```
This generates a starter block component file inside `src/blocks/PromoBanner.tsx`.

### 2. Block Component Layout & Settings Export
A dynamic block consists of a default React component function representing its layout, and a named `settings` object:
```tsx
// src/blocks/PromoBanner.tsx
export default function PromoBanner({ title, buttonText }: { title: string; buttonText: string }) {
  return (
    <div className="p-8 bg-zinc-950 text-white border-4 border-zinc-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] my-6">
      <h3 className="text-2xl font-black mb-3">{title}</h3>
      <button className="bg-white text-zinc-950 font-bold px-4 py-2 border-2 border-white hover:bg-zinc-950 hover:text-white transition-all">
        {buttonText}
      </button>
    </div>
  );
}

export const settings = {
  title: "Sharp Promo Banner",
  icon: "tickets-alt", // WordPress Dashicons slug
  category: "design",
  attributes: {
    title: { type: "string", default: "Get 50% Off Today!" },
    buttonText: { type: "string", default: "Claim Offer Now" }
  }
};
```

---

## 🏁 Developer Cheat Sheet: CLI Subcommands

A summary of all subcommands available through the unified CLI runner:

| Command | Action | Example |
| :--- | :--- | :--- |
| **`forgewp add <component>`** | Downloads a visual component to `src/components/ui/` | `pnpm forgewp add navbar` |
| **`forgewp make:block <BlockName>`** | Scaffolds a new dynamic React Gutenberg Block template | `pnpm forgewp make:block Hero` |
| **`forgewp export`** | Compiles, bundles, and creates the installable theme ZIP file | `pnpm forgewp export` |

---

## 🔒 Protected Core & Self-Healing Mechanisms
To keep developer environments robust and safe, ForgeWP features a **self-healing core engine**. If critical system files like `src/lib/wordpress.tsx` or styling sheets are accidentally modified or deleted, the compiler automatically detects, repairs, and restores the files during build stages to prevent compilation crashes and ensure framework stability!
