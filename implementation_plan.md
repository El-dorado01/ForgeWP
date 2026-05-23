# Implementation Plan: Hotelchecker24 on ForgeWP

Building a bilingual (German + English) premium hotel listicle platform using the ForgeWP framework as a real-world stress test.

---

## Current State

The ForgeWP starter workspace is clean and functional:
- `packages/starter/` — React/Vite dev environment
- `src/.forgewp/wordpress.tsx` — full mock→WP adapter layer (hooks + components)
- `src/app/` — routing via Wouter, layout, globals.css, page.tsx (ForgeWP splash)
- `src/blocks/` — one block (`WpEditableArticle.tsx`)
- `cms/` — `mock-data.json`, `menus.json`, `site-settings.json`
- `packages/compiler/lib/` — `generate-theme.js`, `react-adapter.js`, etc.
- `wp.config.ts` — currently set to `forgewp-starter` identity

Everything compiles. `pnpm dev` is running. The framework is stable.

---

## Proposed Changes

### Phase 1 — Identity & Design Tokens

#### [MODIFY] `wp.config.ts`
- Rename theme to `Hotelchecker24 / hotelchecker24`
- Set palette to editorial warm-slate + amber accent
- Keep `Space Grotesk` (headings) + `Outfit` (body) + add `Lora` (editorial pull-quotes)
- Style mode: `shadcn`

#### [MODIFY] `src/app/globals.css`
- Add CSS custom properties for Hotelchecker24 brand tokens
- Add editorial color palette (warm cream background, deep slate text, amber accent, soft emerald signal)
- Keep Tailwind v4 `@theme` block pattern already established

---

### Phase 2 — Mock Data Schema (`cms/mock-data.json`)

Extend the existing JSON structure to add two new post types and taxonomy support:

```json
{
  "hotel": [...],       // 6 hotel profiles
  "listicle": [...],    // 6 sample listicles
  "page": [...],        // About + Legal pages
  "post": [...],        // existing
  "attachment": [...]   // existing
}
```

**`hotel` shape:**
```json
{
  "id": 1,
  "title": "Grand Ferdinand Vienna",
  "excerpt": "A sophisticated five-star escape...",
  "featuredImage": "https://...",
  "permalink": "/hotel/grand-ferdinand-vienna",
  "customFields": {
    "address": "Schubertring 10-12, 1010 Vienna",
    "website": "https://grandferdand.com",
    "contact_email": "info@grandferdand.com",
    "rating": 4.8,
    "price_range": "$$$",
    "rating_label": "Superb"
  },
  "_terms": {
    "country": [{ "slug": "austria", "name": "Austria" }],
    "region": [{ "slug": "vienna", "name": "Vienna" }],
    "hotel_category": [{ "slug": "boutique", "name": "Boutique" }]
  }
}
```

**`listicle` shape:**
```json
{
  "id": 10,
  "title": "The 10 Best Boutique Hotels in Vienna",
  "excerpt": "Vienna's boutique scene...",
  "featuredImage": "https://...",
  "permalink": "/listicle/best-boutique-hotels-vienna",
  "customFields": {
    "intro_text": "Vienna has long been...",
    "related_hotels": [1, 2, 3]
  },
  "_terms": {
    "country": [{ "slug": "austria", "name": "Austria" }],
    "region": [{ "slug": "vienna", "name": "Vienna" }],
    "hotel_category": [{ "slug": "boutique", "name": "Boutique" }]
  }
}
```

#### [MODIFY] `cms/menus.json`
Add `primary` navigation: Home, Listicles, Hotels, Countries, About, Contact

#### [MODIFY] `cms/site-settings.json`
Update `blogname`, `blogdescription`, `url` to Hotelchecker24 values

---

### Phase 3 — Templates (`src/app/`)

> [!IMPORTANT]
> In ForgeWP, templates live in `src/app/` as route-based pages (or dedicated template files), not in a separate `templates/` folder. The router in `routes.tsx` maps URLs to components. We will follow the existing pattern.

#### [NEW] `src/app/single-hotel.tsx`
Hotel profile page. Displays:
- Full-bleed hero image with overlay title
- Rating stars + price range + category badges
- Address, website, email (ACF fields via `useWpCustomField`)
- Body content via `useWpContent`
- **Relational loop:** `<WpQueryLoop postType="listicle">` filtered to listicles that reference this hotel via `metaQuery LIKE`

#### [NEW] `src/app/single-listicle.tsx`
Ranked editorial article page. Displays:
- Sticky `<Quicklinks />` block (table of contents)
- Hero + intro text
- Numbered ranked hotel cards, each rendered via `<WpQueryLoop postType="hotel">` filtered to `related_hotels` IDs
- Each hotel card shows: image, name, rating, excerpt, CTA button

#### [NEW] `src/app/taxonomy.tsx`
Unified landing page for Country / Region / Category terms. Displays:
- Term title + description hero
- Grid of listicle cards matching the active taxonomy

#### [NEW] `src/app/about.tsx`
About Hotelchecker24 — built from pre-assembled blocks:
- `<EditorialHero>` with brand tagline
- `<FeatureGrid>` with 3 editorial value propositions
- `<SplitContent>` with image + narrative copy

#### [NEW] `src/app/contact.tsx`
Contact / Get Listed page:
- Simple styled form (name, hotel name, email, message)
- `<WpShortcode code="[contact-form-7 ...]">` for WordPress production

#### [NEW] `src/app/homepage.tsx`  *(replaces `page.tsx`)*
Magazine-style editorial homepage:
- Large hero banner with animated headline + search placeholder
- "Featured Listicles" section (`<WpQueryLoop postType="listicle" postsPerPage={4}>`)
- "Browse by Country" taxonomy cards (Austria, Germany, Switzerland, Italy)
- "Recently Added Hotels" section (`<WpQueryLoop postType="hotel" postsPerPage={3}>`)
- Newsletter / Get Listed CTA strip

---

### Phase 4 — Custom Blocks (`src/blocks/`)

#### [NEW] `src/blocks/Quicklinks.tsx`
- Receives an array of hotel titles/anchors as props
- Renders a sticky, numbered table of contents
- In dev: reads from `WpPostContext` → `customFields.related_hotels`
- Compiles to a server-side Gutenberg dynamic block via `defineBlock`

#### [NEW] `src/blocks/EditorialHero.tsx`
- Full-width section: background gradient + overlaid heading + subtext + optional CTA
- Exposes Gutenberg sidebar controls for title, subtitle, CTA label/URL

#### [NEW] `src/blocks/FeatureGrid.tsx`
- 3-column card deck with icon, title, body text
- Cards are editable in Gutenberg (count + content)

#### [NEW] `src/blocks/SplitContent.tsx`
- Alternating 50/50 image left/right + rich text
- Gutenberg controls: image picker + RichText content

#### [NEW] `src/blocks/StandardContent.tsx`
- Clean editorial typography wrapper
- Used in Legal/Terms templates

---

### Phase 5 — Navigation & Layout

#### [MODIFY] `src/app/layout.tsx`
Add a global `<Header>` and `<Footer>` component wrapping `{children}`:
- Header: logo wordmark + `<WpMenu location="primary">` + language switcher placeholder
- Footer: brand tagline, footer menus (Countries, Quick Links, Legal), copyright

#### [MODIFY] `src/app/routes.tsx`
Register all new routes:
```tsx
<Route path="/" component={HomepagePage} />
<Route path="/hotel/:slug" component={SingleHotelPage} />
<Route path="/listicle/:slug" component={SingleListiclePage} />
<Route path="/taxonomy/:type/:term" component={TaxonomyPage} />
<Route path="/about" component={AboutPage} />
<Route path="/contact" component={ContactPage} />
```

---

### Phase 6 — Framework Self-Correction Loop

As we build and compile, we will watch for:
1. **metaQuery `LIKE` / `IN`** — the `WpQueryLoop` mock bridge currently only handles basic meta comparisons. We need to verify the `related_hotels` array `LIKE` query compiles to valid WP_Query PHP.
2. **`useWpPostId()`** — referenced in the plan but not yet in `wordpress.tsx`. We will add this hook.
3. **Taxonomy queries in `WpQueryLoop`** — verify `taxQuery` prop passes through the compiler correctly.
4. **Block registration** — ensure `defineBlock` export works for all new blocks.

---

## Open Questions

> [!IMPORTANT]
> **Homepage Direction:** Do you want the homepage to stay as the ForgeWP splash page (for framework dev purposes), or should we fully replace `page.tsx` with the Hotelchecker24 magazine homepage? I'll assume **full replacement** unless you say otherwise.

> [!IMPORTANT]
> **Mock Data Images:** Should I use real hotel placeholder image URLs (Unsplash/Picsum with seeds) for the mock data, or do you want to provide image URLs? I'll use **Unsplash/Picsum** seeded URLs by default.

> [!IMPORTANT]
> **Language Toggle (UI):** The multilingual structure (WPML/Polylang) is a WordPress-only concern. For local dev, should the UI show a DE/EN toggle as a visual placeholder, or skip it entirely?

---

## Execution Order

| # | Task | Files Touched |
|---|------|---------------|
| 1 | Update `wp.config.ts` + `globals.css` identity | 2 files |
| 2 | Extend `cms/mock-data.json` + menus + site-settings | 3 files |
| 3 | Build Header + Footer components | 2 new files |
| 4 | Update `layout.tsx` + `routes.tsx` | 2 files |
| 5 | Build Homepage (`page.tsx` replacement) | 1 file |
| 6 | Build `SingleHotel` template | 1 file |
| 7 | Build `SingleListicle` template | 1 file |
| 8 | Build `Taxonomy` landing template | 1 file |
| 9 | Build `About` + `Contact` templates | 2 files |
| 10 | Build all 5 custom blocks | 5 files |
| 11 | Add `useWpPostId()` hook to `wordpress.tsx` | 1 file |
| 12 | Verify compiler passes + framework patches | compiler files |

**Total: ~22 file creates/edits**

---

## Verification Plan

### Local Dev (`pnpm dev`)
- All routes load without error
- Mock data renders correctly in all templates
- `WpQueryLoop` filters work (hotel→listicle + listicle→hotel)
- `Quicklinks` renders correct hotel anchors
- Responsive layout on mobile + desktop

### Compiler (`pnpm build`)
- Theme zip generates without errors
- All PHP templates are valid
- ACF field calls compile to correct `get_field()` PHP
- `WpQueryLoop` compiles to `WP_Query` PHP loops

