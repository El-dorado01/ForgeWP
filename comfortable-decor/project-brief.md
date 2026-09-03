# WooCommerce Dropshipping Store — Frontend Design Brief

## 1. Project Overview

We are building a premium, modern WooCommerce e-commerce store for a furniture, lighting, home décor and eco-friendly products business.

The store must be designed as a **reusable e-commerce frontend architecture**, meaning the design system and components should be suitable for other WooCommerce/dropshipping stores in the future rather than being tightly coupled to one specific product catalogue.

The current project is being developed with **ForgeWP**.

### Important Technology Requirement

This is a:

* React project
* TypeScript project
* Vite project
* TailwindCSS project
* ForgeWP-based project

**Do NOT treat this as a Next.js project.**

Do **not** add:

```tsx
'use client'
```

There is no Next.js App Router or Server Components architecture here.

The application should be written as a normal **Vite + React + TypeScript application**. ForgeWP will later handle compilation/export into the native WordPress/WooCommerce environment.

---

# 2. Development Strategy

We are deliberately separating **UI/design development** from **WordPress/WooCommerce integration**.

### Stage 1 — Design & Frontend Prototype

Build the entire customer-facing experience using:

* React
* TypeScript
* Vite
* TailwindCSS
* Local mock data
* Reusable components

At this stage:

* No WordPress API
* No WooCommerce API
* No authentication API
* No real product queries
* No real cart persistence
* No real checkout processing

Use realistic mock data to make the entire store feel functional.

### Stage 2 — ForgeWP Integration

Once the UI and UX are approved, progressively replace mock implementations with ForgeWP APIs and WordPress/WooCommerce data sources.

Examples:

```text
Mock Products
      ↓
WooCommerce Products
```

```text
Mock Menu
      ↓
WpMenu / WordPress Menu
```

```text
Mock Product Data
      ↓
WooCommerce / ForgeWP data layer
```

```text
Mock Customer State
      ↓
WordPress / WooCommerce authentication
```

The goal is to make Stage 2 fast because the UI architecture has already been completed.

---

# 3. Design Direction

The visual direction should feel:

* Premium
* Warm
* Modern
* Elegant
* Editorial
* Trustworthy
* Minimal but not empty
* High-end furniture/decor commerce

Avoid:

* Generic SaaS aesthetics
* Excessive gradients
* Overly rounded cards everywhere
* Excessive animations
* Template-like layouts
* Cheap dropshipping aesthetics
* Excessive UI decoration

The interface should feel closer to a premium interior-design retailer than a generic WooCommerce store.

Use generous spacing, strong typography, quality imagery and editorial product presentation.

---

# 4. Core Design System

Create reusable design primitives before building individual pages.

### Typography

Use the project typography system where appropriate:

* Headings: Space Grotesk
* Body: Outfit
* Technical/code elements: JetBrains Mono

### Components

Build reusable components for:

* Header
* Navigation
* Mega menu
* Announcement bar
* Footer
* Buttons
* Links
* Product cards
* Product grids
* Product badges
* Product rating
* Price display
* Sale price
* Image gallery
* Breadcrumbs
* Filters
* Sort controls
* Search interface
* Quantity selector
* Add-to-cart button
* Wishlist button
* Cart drawer
* Cart item
* Checkout fields
* Form controls
* Tabs
* Accordions
* Modal/dialog
* Toast notifications
* Newsletter form
* Review components
* Related products
* Recently viewed products
* Recommended products
* Empty states
* Loading states

Components should be composable and reusable.

---

# 5. Required Pages

Build the following pages.

## 5.1 Homepage

The homepage should be the primary conversion and brand page.

Recommended structure:

1. Announcement bar
2. Header/navigation
3. Hero section
4. Primary CTA
5. Featured collections
6. Best sellers
7. New arrivals
8. Promotional/editorial section
9. Category showcase
10. Lifestyle/image section
11. Recommended products
12. Trust/value propositions
13. Customer reviews
14. Newsletter signup
15. Footer

The homepage should demonstrate the store's visual identity immediately.

---

# 5.2 Shop / All Products

Create a complete product discovery page.

Include:

* Page title
* Breadcrumbs
* Product count
* Category/filter controls
* Sorting
* Product grid
* Pagination/load more
* Product cards
* Sale badges
* Wishlist action
* Quick-view capability if appropriate

Desktop and mobile layouts must be designed separately where necessary.

---

# 5.3 Product Category Page

Create a reusable category template.

Example:

```text
Furniture
Lighting
Decor
Eco-Friendly
```

Do not hardcode these categories into the architecture.

The template should work with arbitrary WooCommerce categories.

Include:

* Category title
* Category description
* Optional category hero image
* Breadcrumbs
* Filters
* Sorting
* Product grid
* Product count
* Pagination
* Related collections

---

# 5.4 Product Detail Page

This is one of the most important pages.

Include:

* Breadcrumbs
* Product image gallery
* Product title
* Rating
* Review count
* Price
* Sale price
* Product description
* Product options/variations
* Quantity selector
* Add to cart
* Buy now
* Wishlist
* Stock state
* Shipping information
* Trust messaging
* Product details
* Specifications
* Materials
* Dimensions
* Care information
* Reviews
* Related products
* Frequently bought together
* Recently viewed products

Design this page around conversion rather than simply displaying product information.

---

# 5.5 Search Results

Create a dedicated search experience.

Include:

* Search input
* Search query
* Product count
* Results
* Filters
* Sorting
* Empty search state
* Suggested categories
* Suggested products

The search interface should work well on mobile.

---

# 5.6 Cart

Create both:

### Cart Drawer

For quick cart interaction without leaving the current page.

Include:

* Product thumbnail
* Product name
* Variation
* Quantity
* Price
* Remove
* Subtotal
* Checkout CTA

### Full Cart Page

Include:

* Cart items
* Quantity controls
* Remove
* Coupon field
* Subtotal
* Shipping estimate
* Total
* Continue shopping
* Checkout CTA
* Recommended products

---

# 5.7 Checkout

Design a clean, conversion-focused checkout.

Include:

* Contact information
* Billing details
* Shipping information
* Shipping method
* Payment method
* Order summary
* Coupon
* Terms/consent
* Place order

Keep checkout visually focused and minimize unnecessary distractions.

Do not implement real payment processing during this design stage.

---

# 5.8 Order Confirmation

Create a post-purchase success page.

Include:

* Confirmation message
* Order number
* Order summary
* Customer information
* Shipping information
* Continue shopping
* Support/contact option

---

# 5.9 Customer Account

Create the customer dashboard and supporting screens.

### Account Dashboard

* Welcome message
* Recent orders
* Account summary
* Quick actions

### Orders

* Order list
* Order status
* Order details

### Order Detail

* Products
* Quantity
* Pricing
* Shipping
* Payment status
* Order status

### Addresses

* Billing address
* Shipping address

### Account Details

* Name
* Email
* Password

---

# 5.10 Wishlist

Create:

* Wishlist product grid
* Product cards
* Remove item
* Add to cart
* Empty wishlist state

Use mock local state for now.

---

# 5.11 About

Create a premium editorial-style About page.

Suggested sections:

* Brand introduction
* Brand story
* Values
* Sustainability/eco-friendly philosophy
* Quality statement
* Lifestyle imagery
* CTA

The page should feel brand-led rather than like a generic corporate page.

---

# 5.12 Contact

Include:

* Contact information
* Contact form
* FAQ link
* Customer support information
* Social links
* Optional location/map section

The form should be UI-only at this stage.

---

# 5.13 FAQ

Create categorized FAQs.

Possible groups:

* Orders
* Shipping
* Returns
* Products
* Payments
* Sustainability
* Account

Use reusable accordion components.

---

# 5.14 Shipping & Delivery

Include:

* Shipping information
* Delivery times
* Shipping regions
* Tracking information
* Delivery FAQs

---

# 5.15 Returns & Refunds

Create a clear policy page with:

* Return eligibility
* Return process
* Refund process
* Damaged products
* Non-returnable products
* Contact/support CTA

---

# 5.16 Privacy Policy

Create a clean legal-content template.

---

# 5.17 Terms & Conditions

Create a clean legal-content template.

---

# 5.18 Blog / Journal

Create the blog archive.

Include:

* Featured article
* Article grid
* Categories
* Search
* Pagination

---

# 5.19 Blog Article

Create a reusable article template.

Include:

* Featured image
* Category
* Title
* Author
* Date
* Article content
* Social sharing
* Related articles
* Newsletter CTA

---

# 5.20 Promotional / Landing Page Template

Create a flexible marketing page structure for future campaigns.

Possible sections:

* Hero
* Promotional offer
* Product collection
* Benefits
* Social proof
* Testimonials
* CTA
* Newsletter

This should be reusable for future marketing campaigns rather than being tied to one promotion.

---

# 6. Important UI States

Do not only design successful states.

Create reusable states for:

### Products

* Loading
* Empty
* Out of stock
* Sale
* New
* Featured

### Cart

* Empty
* Has items
* Updating
* Error

### Search

* Results
* No results
* Loading

### Account

* Logged out
* Logged in
* Loading
* Error

### Checkout

* Validation errors
* Loading
* Payment error
* Success

---

# 7. Responsive Design

Every page must be designed for:

* Desktop
* Tablet
* Mobile

Do not simply shrink the desktop layout.

Pay particular attention to:

* Mobile navigation
* Product grids
* Filters
* Product galleries
* Sticky add-to-cart
* Cart drawer
* Checkout
* Forms
* Typography
* Touch targets

---

# 8. Product Mock Data

Create realistic mock product data.

Example structure:

```ts
type Product = {
  id: number
  slug: string
  name: string
  price: number
  compareAtPrice?: number
  currency: string
  images: string[]
  category: string
  rating?: number
  reviewCount?: number
  badge?: string
  description: string
  materials?: string[]
  dimensions?: string
  variants?: Variant[]
  inStock: boolean
}
```

Do not hardcode products directly inside components.

Create a central mock data layer so it can later be replaced with WooCommerce data.

Example:

```text
src/
├── data/
│   ├── products.ts
│   ├── categories.ts
│   ├── reviews.ts
│   └── blog.ts
```

---

# 9. Routing Architecture

Use a clean route structure.

Example:

```text
/
├── /shop
├── /category/:slug
├── /product/:slug
├── /search
├── /cart
├── /checkout
├── /order-confirmation
│
├── /account
├── /account/orders
├── /account/orders/:id
├── /account/addresses
├── /account/details
│
├── /wishlist
│
├── /about
├── /contact
├── /faq
├── /shipping
├── /returns
├── /privacy
├── /terms
│
├── /blog
└── /blog/:slug
```

Keep routing independent from WordPress for now.

ForgeWP integration will be introduced later.

---

# 10. Suggested Project Structure

Use a clean Vite/React structure.

```text
src/
├── app/
│   └── pages/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── commerce/
│   ├── product/
│   ├── cart/
│   ├── checkout/
│   └── marketing/
│
├── data/
│   ├── products.ts
│   ├── categories.ts
│   ├── reviews.ts
│   └── blog.ts
│
├── lib/
│   └── utils.ts
│
├── types/
│   ├── product.ts
│   ├── order.ts
│   └── customer.ts
│
├── assets/
│
└── main.tsx
```

Adapt this structure to the existing ForgeWP starter architecture if the project already has one.

---

# 11. ForgeWP Integration Boundary

For this first stage, keep WordPress-specific logic isolated.

Do not scatter future WordPress calls throughout UI components.

Bad:

```tsx
<ProductCard>
  fetch(...)
</ProductCard>
```

Prefer:

```text
UI Components
      ↓
Application Data Layer
      ↓
Mock Data
```

Later:

```text
UI Components
      ↓
Application Data Layer
      ↓
ForgeWP / WooCommerce APIs
```

This allows the entire UI to remain unchanged when real data is introduced.

---

# 12. Hydration Planning

Do not turn the whole application into a client-side SPA.

The final ForgeWP architecture is **static-first with selective hydration**. Product listings and product information should remain server-renderable where possible, while interactive areas such as variation selection, cart, checkout and wishlist can receive focused hydration.

During this design stage, however, it is acceptable to prototype interactions using normal React state.

Later, during ForgeWP integration, determine which components actually require hydration.

Potential interactive islands include:

* Product variation selector
* Add-to-cart interaction
* Cart drawer
* Quantity controls
* Product filtering
* Search interaction
* Wishlist
* Account interactions
* Checkout interaction
* Mobile navigation
* Dialogs/modals

Do not add hydration boundaries everywhere.

---

# 13. Animation

Use animation intentionally.

Preferred tools:

* Framer Motion where appropriate
* CSS transitions for simple interactions

Use animation for:

* Page transitions
* Menu opening
* Cart drawer
* Product image transitions
* Hover states
* Scroll reveals
* Modal/dialog transitions

Avoid excessive motion.

Respect reduced-motion preferences.

---

# 14. Accessibility

The design must include:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* Accessible buttons
* Proper form labels
* Alt text
* Sufficient contrast
* Accessible dialogs
* Accessible navigation
* Reduced-motion support

Do not sacrifice accessibility for visual effects.

---

# 15. Performance

Even though this is currently a design/prototype stage, write the frontend with the eventual ForgeWP architecture in mind.

Avoid:

* unnecessary client state
* giant component trees
* excessive dependencies
* unnecessary JavaScript
* duplicated components
* excessive animation libraries
* unnecessary API abstractions

Prefer:

* reusable components
* static-friendly markup
* CSS for simple interactions
* optimized images
* lazy loading where appropriate
* selective interactivity

ForgeWP's core philosophy is static-first rendering with minimal runtime overhead and intentional hydration.

---

# 16. Critical Instruction About `'use client'`

This project is **NOT Next.js**.

Do not automatically add:

```tsx
'use client'
```

There is no need for Next.js Server/Client Component directives.

Use normal React components.

If a component requires browser interaction, simply implement the interaction using normal React patterns.

Later, ForgeWP's hydration/compiler architecture will determine how that interactive component is delivered to WordPress.

---

# 17. Design-First Completion Criteria

The first stage is considered complete when:

* All required pages exist
* All major reusable components exist
* Desktop layouts are complete
* Mobile layouts are complete
* Mock product data is connected
* Product browsing works visually
* Product detail pages work visually
* Cart interactions are prototyped
* Checkout flow is prototyped
* Account screens exist
* Search UI exists
* Wishlist UI exists
* Blog templates exist
* Legal/content pages exist
* Empty/loading/error states are represented
* Navigation is complete
* Design system is consistent
* Components are reusable
* No WordPress dependency is required to run the frontend

---

# 18. Most Important Development Rule

**Build the UI as if it will eventually receive real WooCommerce data, but do not connect WooCommerce yet.**

The objective is:

```text
Design
  ↓
React Components
  ↓
Mock Data
  ↓
Complete Frontend Experience
  ↓
Design Approval
  ↓
ForgeWP APIs
  ↓
WordPress
  ↓
WooCommerce
  ↓
Production Theme
```

Do not prematurely integrate WordPress APIs.

The design should be sufficiently complete that replacing the mock data layer with ForgeWP/WooCommerce integrations becomes an implementation task rather than a redesign.
