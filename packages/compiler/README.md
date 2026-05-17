# @forgewp/compiler ⚙️

The core engine of the ForgeWP ecosystem. It transforms modern React applications into standards-compliant WordPress themes.

## 📦 Features

### 1. Theme Export
Compiles your React components into `header.php`, `footer.php`, and `index.php`. It automatically:
- Resolves asset paths.
- Injects standard WordPress PHP hooks (`wp_head()`, `wp_footer()`).
- Replaces relative links with dynamic WordPress routing (`home_url()`).

```bash
pnpm export
```

### 2. Smart Component Adder
A powerful utility that pulls components from the ForgeWP Registry or shadcn/ui and applies the signature **Sharpness Transformer**.

```bash
pnpm forgewp add navbar
# Or
pnpm forgewp add --name navbar
```

### 3. Native Gutenberg Block Generator
Dynamically scaffolds dynamic WordPress blocks authored in React with options for custom attributes:

```bash
pnpm forgewp make:block HeroBlock --attributes=heading,text,image,buttonText
```

### 4. Post-Type Loop Component Scaffolder
Instantly scaffolds beautifully designed React loop grid components bound to custom WordPress post types (ACF-like integration):

```bash
pnpm forgewp make:component PortfolioGrid --postType=portfolio
```
*Note: If the requested post type does not exist in `wordpress/mock-data.json`, the compiler will automatically register and seed it for you!*

### 5. Resilient Framework Immunity & Diagnostics
Keep your monorepo perfectly healthy, clean, and self-healing:

```bash
pnpm forgewp doctor   # Run diagnostic health & dependency checks
pnpm forgewp repair   # Force restore framework utility blueprints
pnpm forgewp clean    # Prune build artifacts and clear caches
```

## 🔌 Configuration

ForgeWP is controlled via `wp.config.ts` in your project root:

```typescript
export default {
  themeName: "My Sharp Theme",
  slug: "my-sharp-theme",
  style: "forgewp" // or "shadcn"
};
```

---

Maintainable, Resilient, WordPress-native.

