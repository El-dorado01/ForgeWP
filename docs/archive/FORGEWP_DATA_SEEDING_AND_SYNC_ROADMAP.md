# ForgeWP Data Seeding & Synchronization Engine Roadmap
**Specification & Step-by-Step Implementation Roadmap for `cms/products.ts` and `cms/mock-data.ts` WordPress Synchronization**

---

## 1. Executive Summary & Vision

In ForgeWP, developers author full headless React prototypes rapidly using type-safe CMS mock files:
- `cms/menus.ts`: Navigation menus (currently synced into WP by default).
- `cms/products.ts`: WooCommerce catalog (used as fallback/mock in local dev).
- `cms/mock-data.ts`: WordPress posts, pages, and custom post types (used as fallback/mock in local dev).

Currently, when a developer connects their theme to a fresh WordPress / WooCommerce instance, the WordPress database starts completely empty. Developers are forced to either manually create dozens of products and posts in WP Admin or write one-off WP-CLI scripts.

This roadmap outlines the **ForgeWP Data Seeding & Synchronization Engine** — a declarative, opt-in system that allows developers to sync `cms/products.ts` directly into WooCommerce and `cms/mock-data.ts` directly into WordPress posts/pages/CPTs, with strict safety guards against production data overwrites.

---

## 2. Core Architectural Principles

1. **Opt-in by Default (`seed: false`)**:
   - Menus remain synced by default.
   - Products and mock data sync **never run unless explicitly configured** in `wp.config.ts` or triggered via CLI command.
2. **Idempotency & Fingerprint Hashing**:
   - Seeding routines record a cryptographic hash of the source data in WordPress options (e.g. `forgewp_seed_products_hash`).
   - Prevents duplicate inserts on page loads or recurring theme activations.
3. **Flexible Synchronization Strategies**:
   - `'once'`: Only seeds if the target table/post type has 0 items (clean slate mode).
   - `'upsert'`: Matches items by SKU / slug; inserts missing items and updates existing metadata without duplicate entries.
   - `'force'`: Forces a re-seed.
4. **Production Safety Guards**:
   - By default, auto-sync only runs when `WP_DEBUG` is `true` or in development mode (`developmentOnly: true`), preventing accidental test-data pollution on client production sites.

---

## 3. Configuration API (`wp.config.ts`)

```typescript
import { defineConfig } from '@forgewp/compiler/define-config';

export default defineConfig({
  // ... existing theme config ...

  seed: {
    /**
     * Sync local products from `cms/products.ts` into WooCommerce.
     * Values:
     * - false (default): Do not sync
     * - 'once': Only seed if WooCommerce has 0 products
     * - 'upsert': Insert new and update existing by SKU/Slug
     * - true: Alias for 'once'
     */
    products: 'once',

    /**
     * Sync posts, pages, and CPTs from `cms/mock-data.ts`.
     * Values:
     * - false (default): Do not sync
     * - 'once': Only seed if the post type is empty
     * - 'upsert': Insert new and update existing by slug
     * - { posts: 'once', pages: 'once', project: 'upsert' }: Granular per-type
     */
    mockData: 'once',

    /**
     * Download and sideload external images into the WP Media Library
     * Default: true (if false, keeps external CDN URLs in meta)
     */
    sideloadImages: true,

    /**
     * Safety guard: Only execute when WP_DEBUG is true.
     * Default: true
     */
    developmentOnly: true,
  },
});
```

---

## 4. Subsystem Breakdown

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           wp.config.ts (seed)                             │
└─────────────────────┬───────────────────────────────┬─────────────────────┘
                      │                               │
                      ▼                               ▼
    ┌───────────────────────────────────┐ ┌─────────────────────────────────┐
    │   Part 1: WooCommerce Products    │ │   Part 2: WordPress Mock Data   │
    │        (cms/products.ts)          │ │       (cms/mock-data.ts)        │
    └─────────────────┬─────────────────┘ └─────────────────┬───────────────┘
                      │                               │
                      ▼                               ▼
    ┌───────────────────────────────────┐ ┌─────────────────────────────────┐
    │  • Product Categories (product_cat│ │  • Posts & Pages                │
    │  • Simple & Variable WC Products  │ │  • Custom Post Types (project..)│
    │  • Pricing, SKU, Stock, Attributes│ │  • Taxonomies & Custom Meta     │
    │  • Media Attachment Sideloading   │ │  • Author & Date Preservation   │
    └─────────────────┬─────────────────┘ └─────────────────┬───────────────┘
                      │                               │
                      └───────────────┬───────────────┘
                                      ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                    Part 3: CLI Seeding Interface                      │
    │             `forgewp seed` / `forgewp seed:products`                  │
    └───────────────────────────────────────────────────────────────────────┘
```

---

## 5. Detailed Component Specifications

### Part 1: WooCommerce Products Sync (`cms/products.ts`)

#### Target Data Mapping
| `cms/products.ts` Field | WooCommerce Property | WP Function / Method |
| :--- | :--- | :--- |
| `name` | Product Title | `$product->set_name()` |
| `slug` | Product Slug | `$product->set_slug()` |
| `price` / `salePrice` | Regular / Sale Price | `$product->set_regular_price()`, `$product->set_sale_price()` |
| `description` | Full Description | `$product->set_description()` |
| `shortDescription` | Short Excerpt | `$product->set_short_description()` |
| `sku` | SKU Code | `$product->set_sku()` |
| `category` / `categorySlug` | Product Category | `wp_insert_term(..., 'product_cat')`, `$product->set_category_ids()` |
| `tags` | Product Tags | `wp_set_object_terms(..., 'product_tag')` |
| `rating` / `reviewCount` | Average Rating & Count | `update_post_meta($id, '_wc_average_rating', ...)` |
| `dimensions` / `weight` | Physical Specs | `$product->set_dimensions()`, `$product->set_weight()` |
| `images` | Featured & Gallery Images | Sideloaded via `media_sideload_image()`, `$product->set_image_id()`, `$product->set_gallery_image_ids()` |

#### PHP Seeding Generation (`packages/compiler/lib/functions/seed-products.js`)
- Emits a clean PHP function `forgewp_seed_woocommerce_products()`.
- Hooked to `after_switch_theme` and `admin_init` (guarded by `current_user_can('manage_woocommerce')`).
- Checks `class_exists('WooCommerce')` before execution to prevent fatal errors on non-WooCommerce setups.

---

### Part 2: WordPress Mock Data Sync (`cms/mock-data.ts`)

#### Target Data Mapping
| `cms/mock-data.ts` Entry | WordPress Post Entity | WP Function |
| :--- | :--- | :--- |
| `posts` array | Standard Blog Posts (`post`) | `wp_insert_post(['post_type' => 'post', ...])` |
| `pages` array | Standard Pages (`page`) | `wp_insert_post(['post_type' => 'page', ...])` |
| Custom collections (`projects`, `reviews`, etc.) | Custom Post Types (`project`, `review`) | `wp_insert_post(['post_type' => $cpt, ...])` |
| `meta` object / custom fields | Post Meta Records | `update_post_meta($post_id, $key, $value)` |
| `categories` / `tags` | Terms & Taxonomies | `wp_set_post_terms($post_id, $terms, $taxonomy)` |

#### PHP Seeding Generation (`packages/compiler/lib/functions/seed-mock-data.js`)
- Emits `forgewp_seed_mock_content()`.
- Supports hierarchical parent-child relationships for pages.
- Resolves author assignments to the default admin user.

---

### Part 3: CLI Seeder Command (`bin/seed.js`)

In addition to theme activation triggers, developers can manually run:
```bash
# Seed all configured data
pnpm forgewp seed

# Seed only products into WooCommerce
pnpm forgewp seed:products

# Seed only mock data (posts/pages/CPTs)
pnpm forgewp seed:mock-data

# Force overwrite existing entries
pnpm forgewp seed --force
```

---

## 6. Phased Implementation Steps

### Phase 1: Configuration Types & Validation
- [ ] Add `ForgeWpSeedConfig` interface to `@forgewp/react/src/config.ts`.
- [ ] Add `seed` validation in `@forgewp/compiler/lib/functions/validate-critical-files.js` and `define-config.js`.
- [ ] Ensure full IntelliSense support for `seed: { products: 'once', mockData: 'once' }`.

### Phase 2: WooCommerce Product Seeding Compiler
- [ ] Create `packages/compiler/lib/functions/seed-products.js`.
- [ ] Implement category hierarchy creation (`product_cat`).
- [ ] Implement `WC_Product_Simple` builder with price, SKU, dimensions, and gallery attachments.
- [ ] Add hash fingerprinting & idempotency option guards (`forgewp_seed_products_hash`).
- [ ] Wire into `packages/compiler/lib/functions/index.js`.

### Phase 3: WordPress Mock Data Seeding Compiler
- [ ] Create `packages/compiler/lib/functions/seed-mock-data.js`.
- [ ] Implement `wp_insert_post` batching for `posts`, `pages`, and registered CPTs.
- [ ] Implement custom meta and taxonomy term attachments.
- [ ] Add idempotency option guards (`forgewp_seed_mock_data_hash`).
- [ ] Wire into `packages/compiler/lib/functions/index.js`.

### Phase 4: CLI Seeding Command
- [ ] Create `packages/compiler/bin/seed.js`.
- [ ] Add `forgewp seed`, `forgewp seed:products`, `forgewp seed:mock-data` CLI commands.
- [ ] Add interactive output with formatted progress indicators.

### Phase 5: Testing, Verification & Docs
- [ ] Unit tests in `@forgewp/compiler/test/functions/seed-products.test.js`.
- [ ] Unit tests in `@forgewp/compiler/test/functions/seed-mock-data.test.js`.
- [ ] Verify seamless integration with `comfortable-decor`.
