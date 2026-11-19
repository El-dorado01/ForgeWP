# ForgeWP Block Theme Strategy & Ownership Model (Working Proposal)

## Background

ForgeWP was originally designed around a very clear philosophy:

> Developers build modern React applications. ForgeWP compiles them into native WordPress themes without surrendering the project to page builders.

This solved many long-standing WordPress issues:

* React-first developer experience
* High performance
* Minimal plugin dependency
* Predictable architecture
* Content editing via `useWpMeta()`
* No runtime React in production (Native Mode)

However, a practical concern emerged.

Many WordPress clients don't simply want to edit text and images—they want some degree of layout freedom.

The challenge is finding a solution that preserves ForgeWP's philosophy without becoming another Elementor or visual page builder.

---

# Research Findings

Current WordPress trends indicate that Blocks—not traditional page builders—are becoming the future of WordPress.

Modern block themes, `theme.json`, selective asset loading and Full Site Editing continue to mature.

Meanwhile, the WordPress ecosystem can roughly be divided into two groups.

## Group A

Developer-controlled sites.

Characteristics:

* Custom themes
* Framework-based projects
* Performance-first
* Clients edit content only

ForgeWP already serves this market very well.

---

## Group B

Client-controlled sites.

Characteristics:

* Agencies
* Freelancers
* Marketing teams
* Small businesses

These users frequently request:

* Rearranging sections
* Creating landing pages
* Reusing components
* Building campaign pages

They generally don't want unrestricted design freedom—they want controlled flexibility.

This represents a significant portion of the WordPress ecosystem.

---

# Initial Idea

The first idea explored was:

React

↓

Compile into Gutenberg Blocks

↓

Client assembles pages

This initially sounded attractive.

However, it introduced a major problem.

Existing React pages would now compete with Gutenberg pages.

Questions immediately arose.

Who owns:

* Homepage?
* Layout?
* Updates?
* Client rearrangements?
* Future deployments?

This led to complicated merge strategies and synchronization problems.

---

# Key Realization

The breakthrough came after reframing the problem.

ForgeWP should **not** convert the React application into a Gutenberg site.

Instead, ForgeWP should continue producing exactly what it already does today:

React

↓

Native WordPress Theme

AND additionally export

↓

A reusable Gutenberg Block Library.

These are separate outputs.

---

# Revised Vision

The exported project contains two products.

## Product One

Native Theme

This is exactly what the developer built.

Current routing remains unchanged.

Example:

src/app/pages/home.tsx

↓

front-page.php

Developer owns these pages.

Nothing changes.

---

## Product Two

ForgeWP Block Library

A collection of reusable Gutenberg blocks derived from developer-approved React components.

These blocks are optional.

They exist to help editors create:

* Landing pages
* Campaign pages
* Temporary pages
* Marketing pages
* Custom content

without requiring React development.

---

# Ownership Model

Instead of shared ownership, ownership becomes explicit.

## Developer owns

* React source
* Design system
* Styling
* Animations
* Component implementation
* Component API
* Theme templates
* Default site experience

---

## Client owns

* Content
* Gutenberg pages
* Block composition
* Block ordering
* New custom pages

There is no synchronization between these ownership models.

Each page has one clear owner.

---

# Existing Site Behaviour

Nothing changes for existing ForgeWP users.

Home page remains:

src/app/pages/home.tsx

↓

front-page.php

The exported theme behaves exactly like today's Native Mode.

Performance remains unchanged.

---

# Client Customization Workflow

If a client later decides to redesign an existing page, they may simply stop using the compiled template.

Example:

Current:

Home Page

↓

front-page.php

Later:

Pages

↓

Home

↓

Template

↓

Default

↓

Begin inserting ForgeWP blocks.

At this point ownership transfers naturally.

The page is now Gutenberg-driven.

The original compiled template still exists and can be restored at any time.

No merge required.

No synchronization required.

---

# Future Enhancement

Rather than relying only on WordPress's Default template, ForgeWP may optionally provide its own template.

Example:

ForgeWP Builder

This template would:

* Load theme header/footer
* Render Gutenberg content
* Maintain ForgeWP styling
* Provide an obvious editing experience

This gives agencies a dedicated editing canvas while preserving the developer-built theme.

---

# Hybrid Ownership (Future)

A possible future capability is hybrid templates.

Example:

React Template

↓

Header

↓

Hero

↓

Editable Gutenberg Slot

↓

Testimonials

↓

Footer

This allows developers to expose only specific editable regions while protecting the rest of the page.

This should be considered an advanced capability and not part of the initial implementation.

---

# Block Generation Philosophy

A major discussion centered around automatic block generation.

The conclusion:

ForgeWP should avoid trying to infer architecture from React.

Different developers structure applications differently.

Examples:

Developer A

Hero component

Pricing component

FAQ component

Developer B

Everything inside one HomePage component.

Developer C

Dynamic rendering.

Developer D

CMS-driven rendering.

Static analysis is unreliable.

ForgeWP should not dictate application structure.

---

# Existing make:block Command

ForgeWP already provides:

pnpm forgewp make:block <BlockName>

This command remains important.

It serves a completely different purpose.

These are handcrafted Gutenberg blocks.

Examples:

* Complex editor experiences
* Interactive blocks
* Commerce blocks
* Blocks that require custom `edit()` and `save()` implementations

These remain developer-owned source files.

They should never be regenerated.

---

# Generated Block Library

The compiler-generated block library should coexist with manually created blocks.

Conceptually there are two categories.

## Handwritten Blocks

Created with:

pnpm forgewp make:block

Characteristics:

* Fully developer controlled
* Permanent source files
* Never overwritten
* Custom editor behaviour

---

## Generated Blocks

Produced during export.

Characteristics:

* Derived from React
* Generated automatically
* Disposable compiler output
* Regenerated each export

Both collections are exported together into the final WordPress theme.

This avoids conflicts while preserving developer work.

---

# Remaining Open Question

The biggest unresolved problem is:

How does ForgeWP know what should become a block?

Automatic React analysis is unlikely to be reliable.

Possible directions include:

* Explicit publishing
* Interactive export selection
* Metadata declarations
* Compiler-assisted discovery

This decision should be made carefully because it affects the developer experience for years to come.

The solution must:

* Require minimal manual work.
* Avoid forcing developers into a specific architecture.
* Respect any React coding style.
* Keep React as the source of truth.

---

# Block Discovery & Editor Experience

If ForgeWP exports dozens or hundreds of blocks, clients should not be presented with a flat list.

Instead, the compiler should generate a curated block library.

Examples:

Marketing

* Hero
* Features
* Pricing
* Testimonials

Commerce

* Product Hero
* Product Grid
* Categories

Blog

* Featured Posts
* Newsletter
* Author

Contact

* Contact Form
* FAQ
* Map

Every block should have:

* Friendly name
* Description
* Preview image
* Logical category
* Search keywords

The goal is for non-technical editors to immediately recognize the purpose of each block.

---

# Long-Term Vision

ForgeWP should not compete with Elementor.

ForgeWP should not become another page builder.

Instead, ForgeWP should become:

> A compiler that publishes a React design system into multiple WordPress experiences.

Those experiences include:

1. Native compiled WordPress themes.
2. Optional Gutenberg block libraries.
3. Future hybrid templates with editable regions.
4. Decoupled applications.

React remains the source of development.

WordPress remains the content management system.

The compiler bridges the two worlds while allowing developers and clients to each work in the environment best suited to them.

---

# Guiding Principle

Developers build once in React.

ForgeWP compiles that work into the appropriate WordPress experiences without forcing developers to adopt page-builder concepts or surrender control of their architecture.

Clients gain safe, curated flexibility through Gutenberg, while developers retain ownership of the design system and performance characteristics of the application.
