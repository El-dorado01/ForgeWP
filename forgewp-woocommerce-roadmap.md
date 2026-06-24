# ForgeWP — WooCommerce Integration & E-Commerce Strategic Roadmap 🛒⚡

This strategic roadmap outlines the technical architecture, dynamic compilation pathways, state management sync, and compiler extension points required to introduce high-fidelity, native **WooCommerce Integration (Phase 3)** into the **ForgeWP** framework.

---

## 🏗️ Architectural Philosophy: The "Isomorphic Cart Bridge"
In typical headless e-commerce setups, integrating WooCommerce requires complete abandonment of the WordPress frontend in favor of the WooCommerce REST API or Store API. This leads to slow initial loads, massive API request overhead, and broken WordPress plugin session cookies.

**ForgeWP's approach is static-first with isomorphic hydration:**
1. **Server-Side PHP (Fast Initial Load)**: The compiler transpiles React catalog pages into native, server-rendered WooCommerce PHP templates, using standard, secure queries (`wc_get_products()`) for maximum speed and SEO optimization.
2. **Client-Side Micro-Hydration**: Dynamic parts (cart counters, checkout panels, variation swatches, review submissions) are isolated as micro-hydration islands (`<Hydrate trigger="interaction">`) that communicate asynchronously with the native WooCommerce Store API.
3. **Session Cookie Preservation**: All AJAX/Fetch requests pass standard credentials, preserving native WordPress/WooCommerce session cookies seamlessly.

```mermaid
graph TD
    A[React Page Layout] -->|pnpm export| B[ForgeWP Compiler]
    
    B -->|Static Templates| C[PHP Products Grid index.php]
    B -->|Interactive Islands| D[Dynamic Cart Island]
    
    C -->|Server Rendered| E[User View: HTML]
    D -->|Hydrated on Viewport/Click| F[Dynamic Cart Hub]
    
    F -->|Store API / AJAX| G[WordPress WooCommerce Engine]
    G -->|WordPress Cookies & Sessions| F
```

---

## 🗺️ The 5-Phase Implementation Plan

### 📅 Phase 1: E-Commerce Mock Database & CLI Bootstrapper
To allow full developer experience (DX) and offline design styling, we must simulate the WooCommerce database inside the local JSON file.

*   **Mock Schema Extensions (`cms/mock-data.json`)**:
    Add standardized structures simulating products (Simple, Variable, Grouped, External, Virtual), reviews, and discount coupons:
    ```json
    {
      "product": [
        {
          "id": 101,
          "type": "simple",
          "title": "Minimalist Brutalist Hoodie",
          "price": "49.99",
          "regular_price": "59.99",
          "on_sale": true,
          "sku": "FWP-BRUT-01",
          "stock_status": "instock",
          "images": [{ "url": "https://picsum.photos/seed/hoodie/600/600" }],
          "categories": ["Apparel", "Brutalist"],
          "average_rating": "4.6",
          "rating_count": 8,
          "reviews": [
            { "id": 1, "author": "Alex Reed", "content": "Excellent quality", "rating": 5, "date": "2026-06-18" }
          ]
        },
        {
          "id": 102,
          "type": "variable",
          "title": "Raw Edge Heavy Tee",
          "sku": "FWP-TEE-02",
          "stock_status": "instock",
          "attributes": [
            { "name": "Size", "options": ["S", "M", "L"] },
            { "name": "Color", "options": ["Concrete", "Coal"] }
          ],
          "variations": [
            {
              "id": 1021,
              "attributes": { "Size": "S", "Color": "Concrete" },
              "price": "29.99",
              "stock_status": "instock",
              "image": { "url": "https://picsum.photos/seed/concrete-tee/600/600" }
            },
            {
              "id": 1022,
              "attributes": { "Size": "M", "Color": "Coal" },
              "price": "34.99",
              "stock_status": "instock",
              "image": { "url": "https://picsum.photos/seed/coal-tee/600/600" }
            }
          ]
        },
        {
          "id": 103,
          "type": "grouped",
          "title": "Studio Concrete Capsule Pack",
          "grouped_products": [101, 102],
          "sku": "FWP-PACK-03"
        },
        {
          "id": 104,
          "type": "external",
          "title": "Brutalist Typography & Layouts Book",
          "price": "19.99",
          "sku": "FWP-BOOK-04",
          "external_url": "https://external-publisher.com/book",
          "button_text": "Purchase from Publisher"
        }
      ]
    }
    ```
*   **CLI Data Bootstrapping**:
    Introduce a new command to scaffold the mock e-commerce tables:
    ```bash
    pnpm forgewp make:ecommerce-sandbox
    ```
    This seeds standard product catalogs, cart structures, and variable mock pricing directly into `cms/mock-data.json`.

---

### 📅 Phase 2: Introducing the Modular `@forgewp/woocommerce` Package & Comprehensive Primitives
To keep the core framework bundle lean and modular, we will create a new, optional monorepo package under `packages/woocommerce` (`@forgewp/woocommerce`). The compiler's self-healing blueprint engine will be updated to detect this package and dynamically stitch/re-export its contents inside the theme's local `src/.forgewp/wordpress.tsx` data bridge file.

Because WooCommerce is vast and handles sensitive e-commerce operations, the `@forgewp/woocommerce` package must expose a complete suite of components and hooks categorized by functional area:

#### 1. Catalog & Product Detail Components
*   `<WpProductLoop postsPerPage={12} category="slug" orderBy="date" order="desc">`: Maps directly to an optimized `wc_get_products()` query block. Supports rendering child listings for Grouped products.
*   `<WpProductGallery productId={id} />`: Renders interactive product image galleries with support for dynamic variation image swapping.
*   `<WpProductPrice productId={id} />`: Renders dynamic pricing, handling discounts, sale badges, tax inclusions, and variable product price ranges (e.g., "$29.99 - $34.99").
*   `<WpProductVariationSelector productId={id} />`: Handles dropdowns/swatches for variable product attributes (size, color, etc.) and updates the selected variation state.
*   `<WpProductStockStatus productId={id} />`: Renders real-time stock levels, low-stock thresholds, and backorder flags.
*   `<WpRelatedProducts productId={id} limit={4} />`: Pulls related products dynamically using standard WooCommerce recommendation algorithms (`wc_get_related_products`).
*   `<WpProductReviews productId={id} />`: Displays a paginated list of product reviews/ratings and renders a micro-hydration form for authenticated/guest review submissions.

#### 2. Shopping Cart Components & Hooks
*   `<WpCartProvider>`: The global React context provider that synchronizes local cart actions with the WooCommerce Store API.
*   `<WpCartLineItems />`: Lists all items in the cart, featuring quantity selectors and line item removal. Supports grouped add/remove actions.
*   `<WpCartCouponForm />`: Standardized input form to apply and display active cart discount coupons.
*   `<WpCartShippingCalculator />`: Form to calculate shipping costs early based on postcode, city, and country selection.
*   `useWpCart()`: Hook to access cart stats, trigger item additions, update line quantities, calculate taxes, and estimate shipping fees:
    ```typescript
    const { 
      cart,           // Full cart object
      itemCount,      // Total items count
      cartTotal,      // Subtotal + shipping + taxes
      addToCart,      // function(productId, quantity, variationData)
      addToCartBatch, // function([{ productId, quantity, variationData }]) for Grouped products
      updateQuantity, // function(lineKey, qty)
      removeItem,     // function(lineKey)
      isLoading 
    } = useWpCart();
    ```

#### 3. Checkout & Payment Integrations
*   `<WpCheckoutForm>`: Coordinates checkout fields (billing/shipping addresses, order notes) and hooks them into validation rules.
*   `<WpShippingSelector />`: Fetches and displays available shipping methods based on the customer's address in real-time.
*   `<WpPaymentGateways />`: Renders available payment gateways (Stripe, PayPal, WooCommerce Payments) and embeds secure credit card input frames.
*   `useWpCheckout()`: Manages checkout submission states, preserves CSRF nonces, processes standard gateway integration responses, and handles successful/failed redirection:
    ```typescript
    const { 
      shippingMethods, 
      paymentGateways, 
      processOrder, // function(billingAddress, shippingAddress, gatewayId)
      isSubmitting, 
      error 
    } = useWpCheckout();
    ```

#### 4. Customer Accounts & Authentication
*   `<WpLoginForm />` / `<WpRegisterForm />`: Fully stylable login and registration grids targeting standard WooCommerce customer creation endpoints.
*   `<WpOrderHistory />`: Renders the customer's purchase history with complete download capabilities for virtual/downloadable products.
*   `useWpCustomer()`: Coordinates customer authentication, handles session cookies, dynamic registration validation, and updates profile metadata.

#### 5. Product Search & Faceted Filtering
*   `<WpProductFilters />`: Container component that displays e-commerce filter widgets (price slider range, attribute multi-checkboxes, category trees, and sorting dropdowns).
*   `useWpProductFilters()`: Core state machine hook for managing URL search query states, selected attributes, active price bounds, and triggering query updates:
    ```typescript
    const {
      activeFilters, // Selected attributes, categories, and ranges
      setFilter,     // function(attributeName, value, active)
      setPriceRange, // function(min, max)
      setSortBy,     // function(sortOption)
      resetFilters   // function()
    } = useWpProductFilters();
    ```

#### 6. Wishlist & Favorites System
*   `<WpWishlistButton productId={id} />`: Add/remove toggle button that handles saving favorited products.
*   `<WpWishlistList />`: Displays the list of customer-favorited products with quick cart-addition links.
*   `useWpWishlist()`: Syncs favorites using local storage for guest clients and database metadata for logged-in users.

#### 7. Global Store Notices
*   `<WpStoreNotice />`: Renders global WooCommerce announcement bars (e.g. demo store warning or seasonal sales) managed from the WP Admin panel.

---

### 📅 Phase 3: The E-Commerce Transpiler Engine (`compileWooCommerce`)
The compiler (`packages/compiler/lib/markup-processor.js`) will parse e-commerce abstractions and compile them to secure, optimized WooCommerce PHP queries.

*   **Catalog Query Loop Transpilation**:
    Transpile `<WpProductLoop>` into standard WooCommerce product loop arrays:
    ```html
    <!-- Input JSX -->
    <WpProductLoop category="apparel" limit={4} />
    ```
    ```php
    <!-- Compiled PHP Output -->
    <?php
    $args = array(
        'limit' => 4,
        'category' => array('apparel'),
        'status' => 'publish',
    );
    $products = wc_get_products($args);
    foreach ($products as $product) {
        global $product; // Setup global context
        setup_postdata(get_the_ID());
    ?>
    ```
*   **Support for External/Affiliate and Grouped Products**:
    *   **Grouped product children**: Compile checks to output sub-products using `$product->get_children()`.
    *   **External action swap**: Transpile product button targets dynamically. If an external product type is matched, swap standard add-to-cart operations with:
        `<?php echo esc_url($product->add_to_cart_url()); ?>` and use button label text `<?php echo esc_html($product->single_add_to_cart_text()); ?>`.
*   **Faceted Filters Compilation**:
    Transpile `<WpProductFilters>` into a combination of native WooCommerce attribute query variables (`$_GET['filter_color']`) and price queries to maintain server-side render capability for search engines.
*   **Dynamic Tag Replacement Matrix**:
    *   `useWpProductPrice()` ➜ `<?php echo $product->get_price_html(); ?>`
    *   `useWpProductSKU()` ➜ `<?php echo esc_html($product->get_sku()); ?>`
    *   `useWpProductRating()` ➜ `<?php echo wc_get_rating_html($product->get_average_rating()); ?>`

---

### 📅 Phase 4: Dynamic Cart & Checkout Hydration Islands
Since checkout operations, carts, wishlist sync, and review submissions require live calculations, these components must run as **Micro-Hydration Islands**.

```tsx
// src/app/pages/CartPage.tsx
import { Hydrate } from "@forgewp/react";
import MiniCart from "@/components/MiniCart";

export default function CartPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-black uppercase mb-6">Your Shopping Cart</h1>
      
      {/* Hydrate dynamically on page load to sync with active WooCommerce PHP session */}
      <Hydrate trigger="load">
        <MiniCart />
      </Hydrate>
    </div>
  );
}
```

*   **Store API Bridge**:
    The framework's JavaScript runtime will expose a lightweight cart/favorites/review synchronizer targeting WooCommerce's Store API endpoints:
    *   **Cart Endpoint**: `/wp-json/wc/store/v1/cart`
    *   **Reviews Endpoint**: `/wp-json/wc/store/v1/products/reviews`

---

### 📅 Phase 5: Production Verification & Escaping Assertions
Guarantee maximum e-commerce site performance, robust security, and seamless checkout operations.

*   **XSS & CSRF Prevention**:
    The compiler enforces deep escaping parameters on all output fields:
    *   Attribute outputs ➜ `esc_attr()`
    *   Prices and HTML fragments ➜ `wp_kses_post()`
    *   Forms and actions ➜ `wp_nonce_field('woocommerce-process_checkout')`
*   **Performance Diagnostics Checks**:
    Integrate verification checks within `validate-export.js` to ensure:
    1.  All dynamic e-commerce loops utilize WooCommerce's built-in optimized pagination wrappers (`wc_get_products()`).
    2.  No heavy JavaScript bundle runs in standard listing blocks, maintaining the **Minimal JS by default** philosophy.
    3.  Critical CSS for e-commerce badges, prices, and filter widgets are inlined to pass Core Web Vitals checks.

---

## 🎯 Proposed Immediate Actions (Sprint 1)
When work on WooCommerce integration begins, the recommended initial tasks are:
1.  **Registering the E-Commerce blueprint schemas** inside `packages/compiler/lib/blueprints.js` to lay down type safety.
2.  **Authoring the mock data templates** for products and shopping sessions to enable offline interface styling.
3.  **Drafting the `<WpProductLoop>` compiler mapping rules** inside `packages/compiler/lib/markup-processor.js`.
