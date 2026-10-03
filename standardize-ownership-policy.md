Updated todo list

Yes, but I would do them in a controlled order.

## Do now

### Phase 1: Formalize the convention

This is already mostly done:

- The docs define the canonical section architecture.
- The workflow skill requires framework and docs changes together.
- The current APIs support schemas, block projections, inline editing, and dual hosting.

This gives us a stable standard without breaking existing projects.

### Phase 2: Add `make:section`

This should be the next implementation step.

Something like:

```bash
pnpm forgewp make:section HeroSection --page=front-page --block
```

It should generate:

- `cms/editables/sections/hero.ts`
- Page-schema composition
- Shared section component
- `useWpMeta()` fallback
- Block props and `setAttributes`
- `@forgewp-block`
- `WpEditable` examples
- A focused test or validation fixture

This is the biggest DX improvement because developers get the correct architecture by default instead of assembling it manually.

### Phase 3: Add compiler diagnostics

Also worth doing soon, but as warnings first.

The compiler should warn about:

- Missing editable schema for a block section.
- Invalid `pickEditable()` fields.
- Duplicate page-meta mappings.
- Missing defaults.
- A block-to-ACF mapping without explicit dual-host intent.
- Sections using `useWpMeta()` but not declaring the corresponding schema.

Warnings should remain non-breaking by default and fail only with:

```bash
pnpm forgewp export --strict
```

## Defer for now

### Phase 4: Add `defineSection()`

I would not introduce a new high-level API yet.

A helper such as:

```ts
defineSection({
  schema,
  page,
  block: true,
  ownership: 'dual',
});
```

could eventually improve the API, but it would introduce:

- A new abstraction to learn.
- Migration questions.
- More compiler rules.
- Risk of hiding important source-of-truth decisions.

We should first test the convention through a few real sections and themes.

## Best sequence

```text
1. Documentation and convention       Done
2. make:section scaffolding           Do now
3. Non-breaking compiler diagnostics  Do next
4. Migrate one pilot section          Alongside phases 2–3
5. defineSection() abstraction        Reconsider later
```

I recommend using one real section as the pilot, preferably a hero or editorial section. That will expose the practical issues around ACF defaults, block defaults, inline editing, hydration, generated PHP, and dual-host synchronization before we standardize the API further.