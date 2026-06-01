# Agent Handoff Note — Hotelchecker24 / ForgeWP
**Date**: 2026-05-29  
**Workspace**: `c:\Users\hp\Desktop\ForgeWP\`  
**Local WordPress site**: `http://hotelchecker24.local`  
**Local WP theme path**: `C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24\`  

---

## 1. Project Overview

**Hotelchecker24** is a German-language premium hotel directory and editorial listicle website, styled after Momondo/Trivago editorial aesthetics. It is built as a **ForgeWP theme** — a custom React → WordPress compiler framework located at `c:\Users\hp\Desktop\ForgeWP\`.

The site is entirely in **German** with an English fallback. The design uses **Ubuntu** font, a steel-blue/lemon-green palette, and a card-based editorial style.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing (dev) | Wouter |
| Bundler | Vite |
| Framework | ForgeWP (custom, local monorepo) |
| WordPress | Local WP (Local by Flywheel) |
| Custom Fields | ACF (Advanced Custom Fields) |
| Icons | Lucide React |

### Key Packages in the Monorepo (`c:\Users\hp\Desktop\ForgeWP\packages\`)
| Package | Purpose |
|---|---|
| `compiler/` | Vite build → PHP theme generator. Key files: `generate-theme.js`, `blueprints.js` |
| `react/` | `@forgewp/react` — ForgeWP React primitives (`<Hydrate>`, `<WpQueryLoop>`, etc.) |
| `starter/` | Default starter template — must stay in sync with local project's `wordpress.tsx` |

---

## 3. Custom Post Types & Taxonomies

Defined in `hotelchecker24/wp.config.ts`:

### CPTs
| Slug | Label | Description |
|---|---|---|
| `hotel` | Hotels | Main hotel profiles |
| `listicle` | Listicles | Editorial ranking/comparison articles |

### Taxonomies
| Slug | Attached To | Values used |
|---|---|---|
| `category` (native) | `hotel`, `listicle` | Boutique, Wellness & Spa, Adults-Only, Family, Business, etc. |
| `country` | `hotel` | Austria, Germany, Switzerland, Italy |

### ACF Fields on `hotel`
| Field Key | Type | Description |
|---|---|---|
| `rating` | text | e.g. `4.8` |
| `price_range` | text | e.g. `$$$` |
| `stars` | text | `3`–`5` |
| `city` | text | City name |
| `location` | text | Full address |
| `website` | text/url | Hotel website URL |
| `contact_email` | email | Booking email |
| `featured` | text | `"true"` or `"false"` |

### ACF Fields on `listicle`
| Field Key | Type | Description |
|---|---|---|
| `read_time` | text | Minutes e.g. `"6"` |
| `intro_text` | textarea | Editorial intro paragraph |
| `related_hotels` | relationship | Array of hotel post IDs linked to this listicle |

---

## 4. Page Architecture

### Static Pages (React page components → WordPress page templates)
| Route | File | WordPress Template |
|---|---|---|
| `/` | `src/app/page.tsx` | `index.php` |
| `/hotels` | `src/app/pages/HotelsPage.tsx` | `page-hotels-page.php` |
| `/listicles` | `src/app/pages/ListiclesPage.tsx` | `page-listicles-page.php` |
| `/uber-uns` | `src/app/pages/BerUnsPage.tsx` | `page-ber-uns-page.php` |
| `/kontakt` | `src/app/pages/KontaktPage.tsx` | `page-kontakt-page.php` |

### Dynamic Pages (CPT templates)
| Route | File | WordPress Template |
|---|---|---|
| `/hotel/:id` | `src/app/pages/SingleHotelPage.tsx` | `single-hotel.php` |
| `/listicle/:id` | `src/app/pages/SingleListiclePage.tsx` | `single-listicle.php` |

### Components Map
| Component | File | Purpose |
|---|---|---|
| HeroSection | `src/components/HeroSection.tsx` | Homepage hero with animated search |
| FeaturedHotelsGrid | `src/components/FeaturedHotelsGrid.tsx` | Homepage featured hotels |
| LatestListiclesGrid | `src/components/LatestListiclesGrid.tsx` | Homepage listicle cards |
| DestinationsGrid | `src/components/DestinationsGrid.tsx` | Homepage destination cards |
| HotelsGrid | `src/components/HotelsGrid.tsx` | Full hotel listing grid |
| HotelListicles | `src/components/HotelListicles.tsx` | Lists listicles a hotel appears in |
| ListicleQuicklinks | `src/components/ListicleQuicklinks.tsx` | Quicklinks sidebar on single listicle |
| ListicleRankedHotels | `src/components/ListicleRankedHotels.tsx` | Ranked hotel cards on single listicle |
| Navbar | `src/components/Navbar.tsx` | Global navigation |
| SiteFooter | `src/components/SiteFooter.tsx` | Global footer |
| ContactForm | `src/components/ContactForm.tsx` | Kontakt page form |

---

## 5. The ForgeWP Compile Pipeline

### How it works
1. **Dev mode** (`pnpm dev`): Vite SPA with mock data from `cms/mock-data.json`
2. **Export** (`pnpm forgewp export`): 
   - Vite builds assets to `dist/`
   - Node SSR renders each page/template to static HTML with placeholder tokens
   - `generate-theme.js` replaces tokens with PHP code
   - Hydration islands are split into separate JS chunks
   - Full WordPress theme is packaged to `.forgewp/out/hotelchecker24/`
3. **Sync**: Copy `.forgewp/out/hotelchecker24/*` → Local WP themes directory

### Critical File: `src/.forgewp/wordpress.tsx`
This is the isomorphic data bridge. It has three execution modes:
- **Dev**: Returns mock data from JSON files
- **Node SSR compile-time**: Returns token strings like `__FORGEWP_THE_TITLE__`
- **Browser hydration**: Reads from `window.forgeWpHydration.*` or fetches from WP REST API

**⚠️ Important**: This file exists in THREE places that must stay in sync:
1. `hotelchecker24/src/.forgewp/wordpress.tsx` — the active project file
2. `packages/starter/src/.forgewp/wordpress.tsx` — the starter template
3. `packages/compiler/lib/blueprints.js` — the self-healing blueprint (embedded as a template string)

### PHP Token → PHP Replacement Table (in `generate-theme.js`)
| Token | PHP Output |
|---|---|
| `__FORGEWP_THE_TITLE__` | `<?php echo html_entity_decode( get_the_title(), ENT_QUOTES \| ENT_HTML5, 'UTF-8' ); ?>` |
| `__FORGEWP_THE_CONTENT__` | `<?php the_content(); ?>` |
| `__FORGEWP_THE_EXCERPT__` | `<?php the_excerpt(); ?>` |
| `__FORGEWP_THE_PERMALINK__` | `<?php the_permalink(); ?>` |
| `__FORGEWP_THE_POST_THUMBNAIL_URL__` | `<?php echo esc_url( get_the_post_thumbnail_url(...) ); ?>` |
| `__FORGEWP_CUSTOM_FIELD__fieldname__` | `<?php echo esc_html( get_post_meta( get_the_ID(), 'fieldname', true ) ); ?>` |
| `__FORGEWP_TAXONOMY_LIST_taxonomy__` | `<?php echo html_entity_decode( wp_strip_all_tags( get_the_term_list(...) ) ); ?>` |

---

## 6. Mock Data Structure (`cms/mock-data.json`)

The mock data contains:
- `listicle[]` — 2 sample listicles (IDs: 1, 2)
- `hotel[]` — 6 hotel profiles (IDs: 1–6), 7th coming soon
- `_taxonomy_country[]` — country taxonomy terms
- `_taxonomy_category[]` — hotel category taxonomy terms

**Hotels in mock data**:
1. Grand Ferdinand Vienna (Boutique, Austria)
2. Forestis Dolomites (Wellness & Spa, Italy)
3. Schloss Elmau (Wellness & Spa, Germany)
4. The Chedi Andermatt (Luxury, Switzerland)
5. (+ 2 more)

**Listicle → Hotel relationships** (via `related_hotels` field):
- Listicle 1 → Hotels [2, 3, 4, 5]
- Listicle 2 → Hotel [6]

---

## 7. Single Listicle Page Layout & Specifications

A premium single listicle page (`SingleListiclePage.tsx` compiled to `single-listicle.php`) is designed to display a highly engaging, structured rank-list comparing multiple hotels. It contains the following elements:

1. **Title & Meta Header Section**:
   - `__FORGEWP_I18N_Redaktioneller Beitrag__` editorial badge.
   - Decoded **Listicle Title** (H1) and post **Excerpt** (as description meta-tag).
   - **Meta Row**: Author, Date (formatted dynamically), and custom `read_time` ACF field value.
2. **Hero Image Aspect Panel**: Displays the high-resolution featured image in a custom widescreen `aspect-21/9` border frame.
3. **Editorial Intro Text / Quote**: Displays the custom ACF `intro_text` block styled with lemon-green shading, borders, and custom quotation marks.
4. **Table of Contents / Quicklinks Bar** (`ListicleQuicklinks` island component):
   - Displays a grid of all hotels linked to the listicle (via the `related_hotels` ACF relationship field).
   - Shows the hotel number, name, city, and expert score.
   - Clicking any item triggers a smooth client-side scroll to the exact hotel card via `#hotel-card-${h.id}`.
5. **Editorial Article Content (Gutenberg/WP Editor)**: Renders the central rich-text WordPress HTML post content.
6. **Ranked Hotel Cards List** (`ListicleRankedHotels` island component):
   - Renders hotel cards based on the selected relationship order.
   - **Hotel Photo Panel**: Features an image zoom hover animation, linked directly to the hotel's profile page via `h.permalink`.
   - **Floating Premium Rank Badge**: Shows the numeric placement of the hotel.
   - **Interactive Metadata**: Stars, city/address, expert score, and price level (`$`/`$$`/`$$$`).
   - **Hotel Name (Clickable Title)**: Linked dynamically to the WordPress post permalink (`h.permalink`).
   - **Review ansehen Button**: Dynamically loads `h.permalink` to navigate seamlessly to the full hotel page.
   - **Website Button**: Opens the hotel's external website link in a new tab.
7. **Return Overview Button**: WpLink with an ArrowLeft icon pointing dynamically to `/listicles` page using `useWpPageLink`.

---

## 8. What Has Been Completed

### ✅ Theme Structure & Design
- Full SPA with Wouter routing in dev, multi-page PHP in production
- Homepage, Hotels page, Listicles page, Über Uns, Kontakt all built
- Single Hotel page with all ACF fields displayed
- Single Listicle page with content, quicklinks, ranked hotels
- Navbar with language switcher, mobile hamburger menu
- Footer with links, social, newsletter

### ✅ Custom Post Types
- `hotel` CPT registered with `category` and `country` taxonomies
- `listicle` CPT registered with `category` taxonomy
- Category taxonomy attached to both CPTs in WordPress admin sidebar
- ACF field groups registered and visible in WP admin

### ✅ HTML Entity Decoding (Major fix)
All three `wordpress.tsx` files (project + starter + blueprint) now have a robust `decodeHtmlEntities()` utility:
- Handles named entities (`&amp;`, `&lt;`, `&quot;`, `&nbsp;`, `&middot;`, etc.)
- Handles decimal numeric entities (`&#8217;`, `&#039;`, etc.)
- Handles hex numeric entities (`&#x201C;`, etc.)
- Applied to: post titles, term/category names in `useWpQuery`, `useWpTerms`
- PHP tokens also upgraded: `html_entity_decode()` on `get_the_title()` and taxonomy lists

### ✅ Production Hydration & Listicle Pages Fixed
- Fixed the `/listicles/` grid hydration which was previously loading an empty skeleton state due to stale production chunks. Re-compiled, optimized, and synced the new assets.
- Integrated robust bilingual query support via `lang` parameters in both `useWpQuery` and `useWpTerms`.

### ✅ Dynamic Hotel Permalinks on Ranked Cards
- Modified `ListicleRankedHotels.tsx` to use the dynamic post permalink (`h.permalink || /hotel/${h.id}`) on the hotel title, photo panel, and **Review ansehen** button. This ensures that users on the live site are directed to the actual WordPress SEO-friendly page instead of a hardcoded mock route.

### ✅ Listicle Components
- `ListicleQuicklinks` — shows numbered quicklink list of related hotels on a listicle page
- `ListicleRankedHotels` — shows full hotel cards with rating, price, stars, Review/Website buttons
- Both handle: array of IDs, object arrays `{ID: n}`, JSON string, comma-separated string
- Both wrapped in `<Hydrate trigger="load">` islands in `SingleListiclePage.tsx`

### ✅ Build & Sync
- Theme exports cleanly with all 11 hydration islands within healthy size thresholds
- Theme files synced to `C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24\`

---

## 9. Known Issues / Open Items

### 🔲 Pages Still Needed
Per the original site spec, the following dynamic page types need templates:
- **Country pages** — Austria, Germany, Switzerland, Italy (4 pages)
- **Region pages** — states, cantons, regions within each country (~30–40 pages)
- **Hotel category pages** — Boutique, Wellness, Family, Adults-Only, Business, Holiday Apartment (6 pages)
- **About page** (`BerUnsPage.tsx`) — exists but may need content review
- **Contact/Get Listed page** (`KontaktPage.tsx`) — exists but form submission may need backend hook

### 🔲 "Kuration & Expertentipps" Section
On the single hotel page, there is a section titled "Kuration & Expertentipps" which renders blank. This should map to a WordPress custom field or ACF block. The field key and display logic need to be defined.

### 🔲 WpRepeater & WpIcon Components (Framework-level feature)
A full technical specification is documented in:  
`c:\Users\hp\Desktop\ForgeWP\forgewp-repeater-roadmap.md`

These are not yet implemented. The roadmap covers:
- **Phase 1**: `<WpRepeater>` and `<WpIcon>` components in `packages/react/`
- **Phase 2**: Compiler support in `generate-theme.js` (repeater loop PHP, icon dictionary injection in `functions.php`)
- **Phase 3**: Blueprint sync in `blueprints.js`
- **Phase 4**: Starter template update in `packages/starter/`

### 🔲 Translations
`cms/translations.json` has a German/English dictionary. Review whether all new UI strings added during recent sessions have been added to the translations file.

---

## 9. How to Run Locally

```powershell
# Start dev server
cd C:\Users\hp\Desktop\ForgeWP\hotelchecker24
pnpm dev
# → opens http://localhost:5173

# Export theme (build + compile)
pnpm forgewp export

# Sync to Local WP
$src = "C:\Users\hp\Desktop\ForgeWP\hotelchecker24\.forgewp\out\hotelchecker24"
$dest = "C:\Users\hp\Local Sites\hotelchecker24\app\public\wp-content\themes\hotelchecker24"
Copy-Item -Path "$src\*" -Destination $dest -Recurse -Force
```

---

## 10. How to Add a Listicle in WordPress Admin

1. Go to **WordPress Admin → Listicles → Add New**
2. Set a **Title** (German, can include `&` — will decode correctly)
3. Set a **Featured Image**
4. In the **ACF metabox** fill in:
   - `read_time`: minutes as string e.g. `"7"`
   - `intro_text`: editorial intro paragraph
   - `related_hotels`: select hotels using the relationship field picker
5. Assign **Categories** in the right sidebar
6. Publish

---

## 11. File Reference Map

| Purpose | File Path |
|---|---|
| Main project config | `hotelchecker24/wp.config.ts` |
| Mock data (dev) | `hotelchecker24/cms/mock-data.json` |
| Menus | `hotelchecker24/cms/menus.json` |
| Translations | `hotelchecker24/cms/translations.json` |
| Site settings | `hotelchecker24/cms/site-settings.json` |
| Data bridge (isomorphic) | `hotelchecker24/src/.forgewp/wordpress.tsx` |
| Compiler hooks (custom) | `hotelchecker24/src/compiler-hooks.js` |
| Theme generator | `packages/compiler/lib/generate-theme.js` |
| Framework blueprints | `packages/compiler/lib/blueprints.js` |
| Starter template | `packages/starter/src/.forgewp/wordpress.tsx` |
| WpRepeater roadmap | `c:\Users\hp\Desktop\ForgeWP\forgewp-repeater-roadmap.md` |
| Compiled theme output | `hotelchecker24/.forgewp/out/hotelchecker24/` |
| Compiled theme ZIP | `hotelchecker24/.forgewp/hotelchecker24.zip` |
