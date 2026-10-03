---
name: forgewp-development
description: 'Use when developing, debugging, reviewing, or documenting ForgeWP framework features. Keep framework implementation and the sibling forgewp-docs app synchronized, prefer additive beta improvements with minimal breaking changes, and validate both code and documentation.'
---

# ForgeWP Development Workflow

ForgeWP is a beta framework and its documentation is part of the product. Treat framework behavior and the `forgewp-docs` app as one coordinated change surface.

## Repository Layout

- Framework packages: `packages/`
- Framework tests: package-local `test/` directories
- Starter/template projects: `packages/starter/` and `packages/create-forgewp/template/`
- Documentation app: sibling workspace folder `forgewp-docs/`
- Framework design notes and roadmaps: repository root Markdown files

## Core Rule

When a framework behavior, public API, CLI command, generated output, or recommended workflow changes:

1. Inspect the owning implementation and its nearest tests before editing.
2. Update the implementation with the smallest coherent change.
3. Update the relevant documentation in `forgewp-docs/content/` in the same task.
4. Cross-check the documentation against the actual implementation, examples, generated output, and public exports.
5. Add or update focused tests for the behavior and run documentation validation.

Do not document an intended API as supported until the implementation and a verification path exist.

## Beta Change Policy

Prefer improvements that are:

- Additive and backward-compatible.
- Explicitly opt-in when behavior could surprise existing themes.
- Consistent with existing APIs, file conventions, and generated output.
- Narrow in scope, with no unrelated refactors.
- Reversible if the behavior is still experimental.

Before changing a public API, compiler output, CLI behavior, generated file shape, or data contract:

- Search for usages across `packages/`, starter templates, docs, and sample projects.
- Identify the current behavior and the compatibility risk.
- Preserve existing syntax where practical.
- Add a migration note when old behavior must change.
- Do not silently rename or remove exports, commands, configuration keys, or generated fields.

## Framework and Docs Pairing

For every framework feature, make the docs answer:

- What problem does it solve?
- Where is it authored?
- What is the public API and minimal example?
- What is persisted, generated, or rendered?
- What happens in local preview, WordPress/Gutenberg, and the visitor frontend?
- What are the limits, fallback behavior, and compatibility considerations?
- Which command, test, or build validates it?

For documentation-only claims, verify the claim against source code before publishing it. Correct broad or misleading statements, especially claims that imply automatic behavior.

## Validation Checklist

Use the narrowest useful checks first, then broaden when the change warrants it:

- Framework package tests for the touched compiler or runtime slice.
- Typecheck or package build for changed TypeScript/JavaScript packages.
- CLI smoke test for changed commands or scaffolding.
- Theme export validation when compiler output or generated PHP changes.
- In `forgewp-docs/`: `pnpm run typecheck` and `pnpm run build` for content or docs-app changes.
- Review generated artifacts only as verification; edit source files, not generated output.

Report pre-existing failures separately from regressions introduced by the change.

## Documentation Style

Use concrete examples and distinguish these concepts precisely:

- Authoring source versus generated output.
- Stored data versus editor controls versus inline editing.
- Local Vite preview versus Gutenberg editor behavior versus visitor output.
- Supported public APIs versus compiler internals.
- Scaffolding commands versus actual runtime/export mechanisms.

When explaining a choice, include the recommended path and when an alternative is appropriate. Keep documentation concise enough to scan, but complete enough that a new theme author can implement the feature without reading compiler internals.

## Completion Criteria

A ForgeWP task is complete only when:

- The framework behavior works at its owning abstraction.
- Focused tests or validation cover the changed path.
- The relevant docs describe the actual behavior and limitations.
- Public examples compile or are otherwise verified.
- Backward compatibility and any remaining beta caveats are stated.
