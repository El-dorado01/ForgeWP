# Comfortable Decor — Hybrid Design Direction Plan

## Context

**Project:** Stage 1 design/prototype of a premium furniture & décor WooCommerce frontend in `comfortable-decor` (Vite + React + TS + Tailwind + ForgeWP). Mock data only; no WordPress APIs yet.

**References (mix both):**
- [Ohio Demo 19](https://ohio.clbthemes.com/demo19/) — furniture e-commerce store (commerce structure)
- [Ohio Demo 34](https://ohio.clbthemes.com/demo34/) — architecture studio (editorial visual language)

**Current state:** Starter ForgeWP app only (`page.tsx` is a framework landing page). No store UI yet. Typography tokens partially set (Space Grotesk headings); Outfit body font still to wire per brief.

---

## Capability note (images vs URLs)

| Source | What I can extract well |
|--------|-------------------------|
| **Live URL** | Page structure, section order, IA, copy hierarchy, component inventory, commerce patterns (filters, PDP options, cards). Best for multi-page systems. |
| **Images / screenshots** | Exact spacing, color, type scale, hover/mobile states, visual weight. Best for pixel-level fidelity on specific frames. |
| **Both** | Highest fidelity — structure from URL + visual polish from images. |

For this project we are using **live URLs**. That is enough to lock layout systems and section composition. If a section must match a specific frame later, screenshots help fine-tune.

**Constraint:** We **inspire and remix**, not clone Ohio pixel-for-pixel or reuse their assets/code. Brand is Comfortable Decor; fonts follow the project brief (Space Grotesk / Outfit / JetBrains Mono); products/copy are our mock data.

---

## What each demo contributes

### Demo 19 — Commerce backbone (primary for store UX)

Use for:

- Announcement bar + multi-message promos
- Header with cart, search, menu
- Full-bleed commercial hero (collection CTA: “Go shopping”)
- Trust strip under hero (Crafted Quality / Secure Checkout / Delivery)
- Popular category cards (image + title + short blurb)
- Editorial promo tiles (campaign / weekly highlights / showroom)
- Product card system:
  - Primary + hover secondary image
  - Sale badge
  - Category links
  - Rating
  - Price / sale price
  - Inline color/option swatches + “Select options”
- Product grids (new products, picked collection)
- Shop page: filters, sort, result count, grid
- PDP: multi-image gallery, variations, qty, ATC, tabs (shipping / size / reviews), related products
- Reviews strip + brand marquee
- Blog cards (“Insights”)
- Newsletter + utility footer promos
- Cart drawer pattern

### Demo 34 — Editorial / premium visual language

Use for:

- Large, confident display typography and multi-line headlines
- Generous whitespace and section rhythm
- “Selected works” style image grids (asymmetry, meta captions) → adapt as **lookbook / lifestyle collections**
- Numbered process / values steps (01–04) → brand values or how-we-source
- Stats / counters block → trust metrics
- Quote / founder testimonial presentation
- Journal layout with meta (author, date, read time)
- Clean mega-nav / contact-panel energy (elevated chrome)
- Soft cinematic imagery treatment (architecture interiors → décor lifestyle)

### Explicit mix (homepage section order proposal)

1. Announcement bar — **19**
2. Header / nav / cart / search — **19 structure + 34 restraint**
3. Hero (collection statement + primary CTA) — **19 commerce CTA + 34 type scale**
4. Trust strip (3 value props) — **19**
5. Featured product teaser or dual promo tiles — **19**
6. Popular categories — **19**
7. Editorial lifestyle / lookbook grid — **34 selected-works rhythm**
8. New products grid — **19 product cards**
9. Promo banner (configurator / free design plan style) — **19**
10. Second product collection — **19**
11. Brand values / process (numbered) — **34**
12. Reviews + brand marquee — **19**
13. Journal / insights — **34 card meta + 19 density**
14. Newsletter + footer utility strip — **19**

Other pages:

| Page | Primary reference |
|------|-------------------|
| Shop / Category / Search | Demo 19 |
| Product detail | Demo 19 (+ 34-level type hierarchy) |
| Cart / Checkout / Account | Demo 19 commerce patterns (clean, focused) |
| About | Demo 34 editorial storytelling |
| Blog archive / article | Demo 34 journal + Demo 19 cards |
| Contact / FAQ / Policies | Clean content templates; 34 spacing, 19 form clarity |
| Promo landing | Hybrid modular sections |

---

## Design system (tokens to implement first)

### Typography (brief + demos)

- Headings: **Space Grotesk** (already partially configured)
- Body: **Outfit** (add)
- Mono: **JetBrains Mono** (technical/SKU if needed)
- Hero H1: large, multi-line, tight tracking (Demo 34 energy)
- Section titles: strong but not oversized on commerce pages
- Product card titles: smaller, medium weight; prices clearly hierarchical

### Color / surface

- Warm light base (off-white / soft stone), not pure SaaS gray
- Near-black text, muted secondary text
- Subtle borders; minimal shadow (editorial, not card-shadow soup)
- Accent sparingly for sale / CTA (warm terracotta/amber or deep ink solid buttons — finalize during token pass; avoid Ohio brand colors as identity)
- Sale badge: solid, small, high contrast

### Layout primitives

- Max content width ~1200–1400px for shop grids; full-bleed for heroes/promos
- Generous vertical section padding (desktop larger than mobile)
- Product grids: 2 col mobile → 3–4 col desktop
- Sharp / low radius corners (premium retail; avoid over-rounded SaaS cards)
- Sticky mobile ATC on PDP where useful

### Motion

- Intentional only: menu, cart drawer, image hover crossfade, dialogs
- Respect `prefers-reduced-motion`
- Prefer CSS transitions; Framer Motion only where it earns its weight

---

## Architecture (Stage 1)

Align with brief; adapt to existing ForgeWP starter under `comfortable-decor/src/`:

```text
src/
├── app/                    # routes + pages (existing ForgeWP app folder)
│   ├── layout.tsx
│   ├── routes.tsx
│   ├── page.tsx            # homepage (replace starter)
│   └── pages/              # shop, product, cart, account, etc.
├── components/
│   ├── ui/                 # button, input, dialog, accordion, tabs…
│   ├── layout/             # announcement, header, footer, nav, mega-menu
│   ├── commerce/           # price, badges, rating, filters, sort
│   ├── product/            # card, grid, gallery, variants
│   ├── cart/               # drawer, line item, cart page
│   ├── checkout/
│   └── marketing/          # hero, category cards, promo, newsletter
├── data/                   # mock products, categories, reviews, blog
├── types/
├── lib/
└── assets/
```

**Data boundary:** UI → data accessors → mock modules (swap later for ForgeWP/Woo).

**No** `'use client'`. Normal React + Vite.

---

## Implementation phases

### Phase 0 — Design lock (this plan)
- Confirm hybrid mix and homepage section order
- Confirm we proceed URL-first (screenshots optional later)

### Phase 1 — Foundation
- Tokens in `globals.css` (fonts, colors, spacing, radius)
- UI primitives (Button, Link styles, Input, Badge, Dialog, Drawer shell, Accordion, Tabs)
- Mock types + seed data (products with variants/images, categories, reviews, blog posts)
- App shell: AnnouncementBar, Header, Footer, CartDrawer (empty state), routing skeleton

### Phase 2 — Homepage (flagship)
- Build section components matching hybrid order above
- Wire mock data into product grids / categories / blog / reviews
- Desktop + mobile pass

### Phase 3 — Commerce core
- Shop (filters, sort, grid, empty/loading)
- Category template (`/category/:slug`)
- PDP (gallery, variants, ATC, tabs, related)
- Search
- Cart page + cart state (mock)
- Checkout UI + order confirmation (no real payments)

### Phase 4 — Account & wishlist
- Account dashboard, orders, order detail, addresses, details
- Wishlist with local mock state

### Phase 5 — Content & legal
- About (editorial 34-style)
- Contact, FAQ, Shipping, Returns, Privacy, Terms
- Blog archive + article
- Promo/landing template

### Phase 6 — Polish
- Empty / loading / error / OOS / sale states across surfaces
- A11y pass (focus, labels, dialogs, contrast)
- Responsive QA on nav, filters, gallery, sticky ATC, checkout
- Light motion polish

---

## Success criteria (Stage 1)

Matches project brief completion criteria **and**:

- Homepage clearly reflects Demo 19 commerce flow with Demo 34 editorial polish
- Product cards and PDP feel like premium retail (19), not generic template
- About / journal feel architectural-editorial (34), not blog-template generic
- Entire store runs on mock data with no WP dependency
- Design system is consistent and reusable for other dropshipping stores

---

## Out of scope (for now)

- Real WooCommerce / ForgeWP data integration (Stage 2)
- Real payments, auth, cart persistence beyond mock
- Pixel-perfect Ohio clone or licensed Ohio assets
- Full clone of every Ohio animation plugin behavior

---

## Open decisions (confirm on approval)

1. **Homepage mix** — Proposed section order above OK?
2. **Primary commerce reference** — Demo 19 for shop/PDP/cart; Demo 34 for About/blog/type OK?
3. **Accent color** — Warm premium (stone + ink + warm accent) vs cooler gallery white?
4. **Start execution** — Phase 1 foundation first, then homepage?

Once approved, implementation begins with Phase 1 (tokens, shell, mock data), then Phase 2 homepage as the visual proof of the hybrid.



IMPLEMENTATION PLAN 2

# Comfortable Decor — Hybrid Redesign Plan (v2)

## Decision priority (absolute)

1. **Screenshots** `ref-demo19.png` + `ref-demo34.png` (layout bible)
2. **Live demos** [Demo 19](https://ohio.clbthemes.com/demo19/) + [Demo 34](https://ohio.clbthemes.com/demo34/) (motion, hover, interaction feel)
3. **Project brief** — scope, pages, Stage 1 mock-data rules only (not visual density)

Remix / inspire — do not clone Ohio assets or source code. Brand: Comfortable Decor. Fonts: Space Grotesk / Outfit / JetBrains Mono.

---

## Why Demo 19 was weighted for *commerce structure* (not “picked over” 34)

There was **no aesthetic preference for 19 over 34**. The split was functional:

| Domain | Primary reference | Why |
|--------|-------------------|-----|
| **What the store *is*** (IA, products, cart, shop, PDP, cards, sale UI) | **Demo 19** | It is a **furniture e-commerce** homepage: hero CTA “Go shopping”, bento promos, product grids with swatches/sale badges, cart chrome, newsletter commerce footer. Demo 34 is an **architecture portfolio** (Selected works, Services accordion, “Say Hi”) — no product cards, no shop conversion path. Our product is a WooCommerce dropshipping store → commerce patterns must come from 19. |
| **How it *feels*** (scale, type, color drama, whitespace, section height, scroll theatre) | **Demo 34 + both screenshots** | 34’s giant display type, full-bleed color blocks, monumental CTAs, and airy rhythm match what the client asked for (“giant sections”, font sizes, color mixes). Demo 19’s **screenshot** also shows that scale in a retail form (huge hero type, tall bento, soft sage/pink) — our first build under-delivered both. |

### Honest correction

In the first implementation I under-weighted:

- Section **height** and type **scale** (both demos)
- Demo 19’s **color mix** (sage, blush, cream, wood — not generic terracotta SaaS)
- Demo 19’s **asymmetric bento** (not equal grids)
- Demo 34’s **editorial drama** on non-product sections
- **Motion** entirely

So it was not “19 > 34”; it was “19 for shopping chrome” that accidentally became “19-ish compact retail” without 19’s real scale or 34’s theatrical polish.

### Hybrid going forward (balanced)

```text
Demo 19  →  homepage section TYPES + commerce components + shop/PDP/cart
Demo 34  →  type scale, vertical rhythm, image dominance, stats/quote/closing energy
Both screenshots →  exact density, color blocks, bento geometry, footer weight
```

**Homepage remains Demo 19’s section sequence** (commerce conversion path), rebuilt at **Demo 34–level scale** with **Demo 19 screenshot color/bento fidelity**.

If you want the **opposite** (Demo 34 homepage structure with shop bolted on), say so — that would be a different IA (portfolio-first brand site, not store-first). Default assumption remains **store-first** (19 IA × 34 scale).

---

## Animation & transition strategy

### Install

- Add `framer-motion` to `comfortable-decor`
- Prefer Framer for: scroll reveals, stagger, layout transitions, drawer/sheet content, page transitions
- Keep CSS for: simple hover color, focus rings, reduced-motion fallbacks

### Will I re-inspect the live page / “raw files”?

**Yes on live demos + screenshots. No on Ohio theme source.**

| Inspect | How | What we extract |
|---------|-----|-----------------|
| Screenshots | Vision on `ref-demo19.png` / `ref-demo34.png` | Scale, color blocks, grid geometry, section order |
| Live URLs | Re-browse + DevTools-style observation (network CSS, computed feel) | Hover swaps, scroll timing, drawer, sticky header, marquee speed |
| Ohio PHP/SCSS package | **Out of scope** | Commercial ThemeForest theme — we don’t fork their code; we **recreate the feeling** in React + Tailwind + Framer |

Ohio typically uses CSS transitions + scroll libraries (AOS-like / custom Ohio JS). We **approximate the same UX language** with Framer Motion, not a line-by-line port.

### Rough motion system (concrete)

1. **Scroll reveal (most sections)**  
   - `motion` wrapper: `initial={{ opacity: 0, y: 40 }}` → `whileInView={{ opacity: 1, y: 0 }}`  
   - `viewport={{ once: true, amount: 0.2 }}`  
   - Duration ~0.6–0.9s, ease `[0.22, 1, 0.36, 1]` (smooth “premium” ease-out)

2. **Stagger children** (product grids, category tiles, trust items)  
   - Parent `staggerChildren: 0.08–0.12`  
   - Children fade/slide up slightly

3. **Hero**  
   - Staggered headline lines + CTA fade  
   - Optional slow image scale `1.05 → 1` on load (subtle, not flashy)

4. **Product card**  
   - Image crossfade on hover (CSS opacity is fine; Framer if we need layout)  
   - Soft lift or media zoom ~1.03–1.05

5. **Cart drawer / mobile menu**  
   - Sheet already slides; enhance with Framer spring for content list  
   - Overlay fade

6. **Page transitions** (optional, tasteful)  
   - Wouter route change: short opacity + y on `main` (~200–300ms)  
   - Respect reduced motion → disable

7. **Marquee / brand strip**  
   - CSS infinite translate (already) or Framer for pause-on-hover

8. **Counters (if we take 34 stats block)**  
   - Animate numbers when in view (simple spring or `useMotionValue` + `animate`)

9. **`prefers-reduced-motion`**  
   - Global: if reduced, skip transforms; instant opacity only or none

### Motion principles (client loves animation, still not chaos)

- Almost every major section enters once on scroll  
- Interactive chrome always feels responsive (menu, cart, hover)  
- Avoid constant parallax noise and long 2s delays  
- Match reference **calm luxury** — Demo 34 is cinematic; Demo 19 is soft retail motion — blend both

---

## Redesign execution (next build pass)

### Phase A — Tokens & motion foundation
- Install `framer-motion`
- Retoken colors from Demo 19 screenshot: sage, blush pink, cream, charcoal, wood warmth (accent sparingly)
- Display type scale: hero ~clamp(3rem → 5.5rem+), section titles much larger
- Spacing: section py closer to 6–10rem desktop where references are tall
- `Motion` helpers: `Reveal`, `Stagger`, `FadeIn` in `src/components/motion/`

### Phase B — Homepage rebuild (screenshot-faithful)
Rebuild against **ref-demo19.png** structure at full scale:

1. Announcement + header  
2. Giant hero (type + product photo composition)  
3. Trust under hero  
4. Dual bento promos (not flat equal cards)  
5. Popular categories **asymmetric bento** (large + medium tiles)  
6. Showroom split (color panel + image)  
7. New products + side promo panel  
8. Picked collection (editorial image + grid + CTA tile)  
9. Large review quote + image panel  
10. Brand marquee  
11. Journal 4-up  
12. Inspiration / careers dual panels  
13. Newsletter split  
14. Multi-column footer  

Inject **Demo 34 energy** on: type scale, selected-works-like lookbook if retained, numbered values, optional stats, monumental closers.

### Phase C — Commerce pages (still Demo 19 UX)
- PDP, shop filters, cart — after homepage visual approval  
- Same motion system + color tokens

---

## Open choice (confirm if needed)

**Default:** Store-first hybrid (19 IA × 34 scale × 19 screenshot color/bento).

**Alternative:** Brand-first (34 homepage as primary experience, commerce secondary) — only if client wants portfolio feel over shop conversion on home.

---

## Success criteria for redesign pass

- Homepage feels **giant and airy** when compared side-by-side with screenshots  
- Color mix reads sage/blush/cream/warm wood, not flat SaaS  
- Bento asymmetry matches Demo 19 geometry  
- Scroll + hover animations are present and intentional  
- Framer Motion installed and used for core reveals  
- Still mock-data only; no WP APIs  
