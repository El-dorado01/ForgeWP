# Comfortable Decor — Implementation Roadmap & TODO

This document tracks the phased execution for crafting the animated, luxury e-commerce frontend combining the **frictionless commerce of Ohio Demo 19** and the **monumental architectural editorial weight of Ohio Demo 34**.

---

## 📋 Phase-by-Phase Checklist

### Phase 1: Design Tokens, Palette & Curated Asset Engine
- [x] Refine color palette tokens in `src/app/globals.css` (Warm Cream, Deep Charcoal/Ink, Terracotta/Blush, Pistachio/Sage, Sunny Ochre, Soft Sand).
- [x] Calibrate typography clamp scale (Space Grotesk monumental headings, Outfit body text, JetBrains Mono metadata/tags).
- [x] Curate high-resolution lifestyle and cut-out product photography with alternate angles in `src/data/products.ts` and `src/data/categories.ts`.

### Phase 2: Animation & Micro-Interaction Primitives
- [x] Magnetic button physics with spring damping (`src/components/ui/button.tsx`).
- [x] Rolling 3D cube and slide button label transitions (`ButtonLabel`).
- [x] Interactive 3D mouse-tracking tilt card with specular highlights (`src/components/motion/tilt-card.tsx`).
- [x] Kinetic split-text and line-by-line reveal masks (`src/components/motion/split-text.tsx`).
- [x] Interactive radar hotspot tags on lifestyle photography (`src/components/product/product-hotspot.tsx`).
- [x] Interactive product card color swatch engine with real-time image crossfades (`src/components/product/product-card.tsx`).
- [x] Continuous silky-smooth marquee component (`src/components/ui/marquee.tsx`).

### Phase 3: Demo 19 Master Storefront (`src/app/page.tsx`)
- [x] Polish top announcement bar and luxury header with live cart balance and search trigger.
- [x] Rebuild Hero section with high-res warm interior scene, floating interactive hotspot card, and magnetic CTA button.
- [x] Rebuild 3-Pillar Trust Strip with warm monochrome icons and micro-hover lifts.
- [x] Recreate 2-Column Promo Split (Dark Forest/Slate project card + Warm Blush/Terracotta card with floating 3D armchair).
- [x] Build 6-card Popular Categories masonry grid with dark gradient overlays and hover diagonal arrows.
- [x] Recreate Showroom Split with pistachio background, dual pill badges (`New`, `Showroom`), and modern kitchen/showroom photo.
- [x] Build New Products Grid with interactive swatches + embedded Sunny Ochre `Create your perfect chair` promo card.
- [x] Build Picked Collection Grid (Dark `Explore our new designs` card + product cards + `Get a free design plan` card).
- [x] Build Trustpilot Customer Reviews Split with 5-star rating, quote styling, and brand signature marquee.
- [x] Build Journal / Insights 4-card editorial preview with pill tags and reading times.
- [x] Build Dual Split CTA (Physical Spaces & Sustainable Perspectives) + Warm Peach Newsletter Block.
- [x] Build Multi-column Footer with trust guarantee strip, payment method badges, and smooth scroll-to-top.

### Phase 4: Demo 34 Master Architectural Studio (`src/app/pages/studio.tsx`)
- [x] Build Full-screen Monumental Architectural Hero with all-caps typography, vertical metadata rails, and video trigger.
- [x] Build Asymmetric Statement Card (Sage accent + dual action buttons) + offset photo gallery.
- [x] Build 3-Column Staggered Masonry Selected Works Grid with video hover overlays and metadata tags.
- [x] Build Monochrome Press & Architecture Award Logos Bar (`stir`, `archdaily`, `designboom`, `dezeen`, `FRAME`).
- [x] Build 4-Color Process Cards Array (Grey, Sage, Terracotta, Ink) with hover expansion + panoramic photo strip.
- [x] Build Interactive Department Accordion with real-time photo crossfade on hover/click.
- [x] Build Designer Portrait & Monumental Quote Section with CEO signature.
- [x] Build Monumental Terracotta Stats Banner (`SOLUTIONS FOR TODAY...`) with animated count-up numbers.
- [x] Build Dark Moodboard Testimonial with glowing orb lamp and dark wood interior.
- [x] Build Monumental Closing CTA (`SAY HI` / `SHOP THE STORE`).

### Phase 5: Global Commerce Drawers & Interactive Modals
- [x] Build Slide-Over Cart Drawer with blur backdrop, free shipping progress bar, quantity controls, and checkout CTA.
- [x] Build Quick-View Modal for instant product inspection with thumbnail gallery and variation picker.
- [x] Build Full-Screen Search Modal with live autocomplete and suggested categories.

### Phase 6: Quality Assurance, Responsive Polish & Verification
- [x] Test and polish responsiveness across Mobile (375px), Tablet (768px), and Desktop (1440px+).
- [x] Audit accessibility, contrast ratios, and `prefers-reduced-motion` compliance.
- [x] Run Vite production build (`pnpm build`) to guarantee clean, zero-error output.
