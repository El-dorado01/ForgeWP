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
pnpm forgewp:add button
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

Maintainable, Scalable, WordPress-native.
