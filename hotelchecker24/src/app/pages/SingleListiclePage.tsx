# ForgeWP × Hotelchecker24 — Agent Handoff Guide

> **Purpose**: Everything the next agent needs to continue development on this monorepo. Read this **before** writing any code.

---

## 1. Monorepo Architecture

```
c:\Users\hp\Desktop\ForgeWP\          ← pnpm workspace root
├── packages/
│   ├── react/                        ← @forgewp/react  — Core hooks, types, context
│   │   └── src/
│   │       ├── index.ts              ← Public API re-exports
│   │       ├── hooks.ts              ← useWpTitle, useWpQuery, WpMenu, etc.
│   │       └── types.ts              ← WpQueryArgs, WpPost, WpMenuProps, etc.
│   ├── compiler/                     ← @forgewp/compiler — React→PHP build pipeline
│   │   └── lib/
│   │       ├── generate-theme.js     ← SSR render → split header/footer/content → PHP
│   │       ├── blueprints.js         ← PHP template strings for WP_Query, menus, etc.
│   │       ├── framework-adapter.js  ← Vite/React adapter loader
│   │       └── diagnostics.js        ← Hydration island size analyzer
│   ├── starter/                      ← Reference theme scaffold (MUST stay in sync)
│   │   └── src/.forgewp/wordpress.tsx  ← Data bridge (starter copy)
│   ├── create-forgewp/               ← CLI scaffolder (`npx create-forgewp`)
│   │   └── template/     
- [Layout](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/app/layout.tsx)
- [Navbar](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/components/Navbar.tsx)
- [SiteFooter](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/components/SiteFooter.tsx)
- [HeroSection](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/components/HeroSection.tsx)
- [HotelsPage](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/app/pages/HotelsPage.tsx)
- [SingleHotelPage](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/app/pages/SingleHotelPage.tsx)
- [ListiclesPage](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/app/pages/ListiclesPage.tsx)
- [SingleListiclePage](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/src/app/pages/SingleListiclePage.tsx)

### Data
- [mock-data.json](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/cms/mock-data.json)
- [menus.json](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/cms/menus.json)
- [site-settings.json](file:///c:/Users/hp/Desktop/ForgeWP/hotelchecker24/cms/site-settings.json)

### Scripts
- [sync-cli-template.mjs](file:///c:/Users/hp/Desktop/ForgeWP/scripts/sync-cli-template.mjs)
- [sync-to-wp.mjs](file:///c:/Users/hp/Desktop/ForgeWP/scripts/sync-to-wp.mjs)

---

## 9. Checklist for the Next Agent

Before making any changes, verify you understand:

- [ ] Which file you're editing — is it a **project file** or a **framework file**?
- [ ] If it's `wordpress.tsx`, did you update **all three locations**?
- [ ] If you added a new hook, did you update `hooks.ts`, `types.ts`, `index.ts`, and `blueprints.js`?
- [ ] After code changes, run `pnpm run export --no-zip` in hotelchecker24
- [ ] After export, run robocopy to sync to Local WP
- [ ] After sync, hard-refresh the browser to verify
