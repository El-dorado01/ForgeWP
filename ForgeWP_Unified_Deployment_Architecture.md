# ForgeWP Milestone — The Unified WordPress Deployment Architecture

**Date:** June 2026

---

# Purpose

This document records one of the most significant architectural milestones in ForgeWP's evolution.

ForgeWP no longer provides only a native WordPress theme export pipeline.

It now supports **two deployment strategies** while preserving a single development experience.

Developers write one React application and decide later whether it should be deployed as:

* a native WordPress theme, or
* a decoupled WordPress frontend.

The application code remains the same.

Only the deployment strategy changes.

---

# The Philosophy

ForgeWP has never been about replacing WordPress.

It has always been about modernizing how developers build for WordPress.

The framework exists to remove the traditional trade-off between native WordPress development and decoupled WordPress development.

Instead of forcing developers to choose one approach at the beginning of a project, ForgeWP allows that decision to happen at deployment time.

This philosophy can be summarized simply:

> **Write once in React. Choose how WordPress is deployed later.**

---

# The Architecture

The architecture now looks conceptually like this:

```text
             React Project
                    │
             ForgeWP Compiler
                    │
        Choose Deployment Strategy
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
 Native WordPress         Decoupled Frontend
      Theme                 (WordPress API)
```

Both deployment strategies continue to use WordPress as the CMS.

The difference lies only in how the frontend is delivered.

---

# Deployment Strategy One

## Native WordPress Theme

Command:

```bash
pnpm forgewp export
```

This pipeline produces:

* installable WordPress theme
* native PHP templates
* WordPress-compatible assets
* hydration bundles
* theme package

Internally the compiler performs:

1. React Server Rendering
2. Static HTML generation
3. HTML analysis
4. ForgeWP semantic processing
5. PHP transpilation
6. Theme generation
7. ZIP packaging

The final result behaves like a hand-written WordPress theme while preserving the React authoring experience.

---

# Deployment Strategy Two

## Decoupled WordPress Frontend

Command:

```bash
pnpm build
```

The project can then be deployed to services such as Vercel.

Unlike the export pipeline, this build does **not** generate PHP.

Instead it produces:

* frontend assets
* optimized JavaScript bundles
* CSS
* HTML entry files
* runtime connection to a remote WordPress installation

WordPress continues to manage:

* content
* users
* media
* plugins
* REST APIs

The frontend is deployed independently while still being powered entirely by WordPress.

---

# Why Two Separate Pipelines Exist

The separation is intentional.

A frontend deployment should not waste time generating PHP that will never be used.

Likewise, exporting a native WordPress theme should focus entirely on producing WordPress artifacts.

Each pipeline performs only the work required for its deployment strategy.

Benefits include:

* faster frontend builds
* cleaner compiler design
* simpler maintenance
* independent optimization
* clearer separation of responsibilities

---

# One Project

The most important achievement is that both deployment strategies use the same source code.

Example:

```tsx
<HomeHero />

<ProductGrid />

<ContactForm />
```

These components are written once.

Depending on the deployment strategy they become either:

Native WordPress

or

Decoupled WordPress frontend.

There is no need to maintain:

* two repositories
* duplicate page implementations
* separate routing systems
* different component libraries

ForgeWP keeps a single application model throughout development.

---

# Configuration Philosophy

ForgeWP supports two complementary configuration methods.

## Project Configuration

```ts
headless: {
    apiUrl: "...",
    jwtAuth: true
}
```

This configuration is committed to the repository.

Ideal for:

* local development
* fixed deployments
* open source projects

---

## Environment Variables

```text
FORGEWP_API_URL
FORGEWP_JWT_AUTH
```

These are supplied by the deployment platform.

Ideal for:

* staging
* production
* CI/CD
* Vercel
* Netlify

Configuration priority should follow:

```text
Environment Variables

↓

Project Configuration

↓

Framework Defaults
```

---

# Build vs Export

A useful distinction has emerged inside ForgeWP.

## Build

Produces runnable frontend assets.

Output:

```text
dist/
```

Designed for frontend hosting platforms.

---

## Export

Produces installable WordPress artifacts.

Output:

```text
theme.zip
```

Designed for WordPress installations.

Although both originate from the same React project, they serve different deployment purposes.

---

# What Has Changed

Previously, ForgeWP focused exclusively on exporting native WordPress themes.

Today, ForgeWP supports two equally valid deployment strategies without changing how developers build their applications.

This represents an important evolution.

The framework no longer asks developers to decide between native WordPress and decoupled WordPress before they begin development.

Instead, both approaches share the same application code.

Deployment becomes an implementation decision rather than an architectural commitment.

---

# What Has Not Changed

Despite this milestone, ForgeWP remains intentionally focused on WordPress.

The framework is **not** attempting to become a universal application compiler or a cross-platform runtime.

Everything in ForgeWP continues to revolve around one ecosystem:

* WordPress
* React
* modern frontend tooling
* compiler-driven development

The introduction of a second deployment strategy does not change ForgeWP's identity.

It strengthens it.

---

# Core Principles Reinforced

This milestone reinforces several principles that have guided ForgeWP from the beginning.

## WordPress First

WordPress remains the platform ForgeWP is built for.

---

## Compiler First

The compiler is responsible for adapting React applications to different WordPress deployment strategies.

---

## One Development Experience

Developers should not have to maintain separate frontend implementations simply because deployment requirements change.

---

## Separation of Concerns

Frontend builds and WordPress exports are independent compiler pipelines with different responsibilities.

---

## Modern Without Abandoning WordPress

ForgeWP embraces modern React development while preserving the strengths of the WordPress ecosystem.

---

# Milestone Summary

ForgeWP now provides a unified development experience for both native and decoupled WordPress projects.

Developers continue to write a single React application.

At deployment time they choose whether to:

```bash
# Export a native WordPress theme
pnpm forgewp export
```

or

```bash
# Build a decoupled frontend
pnpm build
```

The compiler handles the differences.

The developer experience remains the same.

This milestone represents an important step toward ForgeWP's long-term vision:

> **Modern frontend development for WordPress without forcing developers to choose between native and decoupled architectures.**
