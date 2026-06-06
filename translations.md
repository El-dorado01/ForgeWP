Your instinct is correct.

Using AI as the PRIMARY translation engine for ForgeWP would probably be:

* unnecessarily expensive,
* slower,
* operationally complex,
* and difficult to scale for large multilingual sites.

Especially if:

* builds become frequent,
* projects become large,
* or agencies use ForgeWP heavily.

AI should be:

# an enhancement layer,

NOT:

# the core translation engine.

---

# The best architecture for ForgeWP

I think you should split translation into:

| Layer              | Responsibility             |
| ------------------ | -------------------------- |
| Compiler           | Extraction + orchestration |
| Translation engine | Actual translations        |
| Runtime            | Locale resolution          |
| Optional AI        | Refinement/improvement     |

This is MUCH more scalable.

---

# My strongest recommendation:

# Use traditional translation engines first.

Specifically:

## Best option overall:

# DeepL API

Why:

* translation quality is EXCELLENT,
* especially for European languages,
* much better tone than Google Translate,
* predictable pricing,
* fast,
* developer-friendly.

This is probably the BEST balance for ForgeWP.

---

# Alternative:

# LibreTranslate

This is VERY interesting for ForgeWP.

Why?
Because it is:

* open source,
* self-hostable,
* cheap,
* privacy-friendly,
* API-compatible.

This could become VERY attractive for:

* agencies,
* enterprise,
* self-hosted ForgeWP tooling.

---

# Another option:

# Google Cloud Translate

Pros:

* huge language coverage,
* scalable,
* reliable.

Cons:

* translation quality feels more robotic,
* pricing can grow,
* less “premium” than DeepL.

Still very viable.

---

# My actual recommendation stack

## PHASE 1 (Best starting point)

### Use:

# DeepL API

AND ALSO:

# manual locale overrides.

This gives:

* great quality,
* simple architecture,
* fast implementation.

---

# PHASE 2

Add:

# provider abstraction.

Example:

```ts id="n4pn2m"
interface TranslationProvider {
  translate(text, from, to): Promise<string>
}
```

Then support:

* DeepL
* Google
* LibreTranslate
* OpenAI
* custom providers

This is the scalable architecture.

---

# PHASE 3

Optional:

# AI refinement layer.

Meaning:

* tone enhancement,
* marketing copy refinement,
* localization nuance,
* contextual rewriting.

NOT:

* raw translation generation.

This distinction matters.

---

# VERY IMPORTANT:

# Auto-translation should happen ONLY during extraction/build time.

NOT runtime.

Never runtime.

That would:

* increase costs,
* slow pages,
* create instability,
* and introduce inconsistent outputs.

Instead:

```bash id="k2m5jx"
pnpm forgewp i18n:translate
```

generates static locale files once.

THAT is correct.

---

# This is the ideal workflow

## Developer writes:

```tsx id="2m67xn"
__('Modern WordPress frontend architecture')
```

---

## Compiler extracts:

```json id="fdc43f"
{
  "Modern WordPress frontend architecture": ""
}
```

---

## Translation engine generates:

```json id="b74wh2"
{
  "de": {
    "Modern WordPress frontend architecture":
      "Moderne WordPress-Frontend-Architektur"
  }
}
```

---

## Runtime simply resolves locale.

No API calls.
No AI cost.
No runtime overhead.

This is VERY scalable.

---

# Cost reality

You are also correct about scale.

AI becomes problematic because:

| Scenario         | Problem                |
| ---------------- | ---------------------- |
| Large sites      | token explosion        |
| Frequent builds  | repeated cost          |
| Multiple locales | multiplicative pricing |
| Agencies         | operational cost       |
| CI/CD            | expensive pipelines    |

Traditional translation APIs are MUCH cheaper for this use case.

---

# Another VERY important point

Translation systems should support:

# translation caching.

Example:

If:

```tsx id="uxo1zk"
__('Contact Us')
```

was already translated once,
never translate it again unless:

* text changes,
* locale changes,
* or force refresh is triggered.

This massively reduces costs.

---

# One thing I would strongly avoid

Do NOT tightly couple ForgeWP to:

* OpenAI,
* Claude,
* Gemini,
* or any single AI provider.

That would be strategically risky.

Instead:

# translation-provider abstraction.

Very important.

---

# My actual recommendation for ForgeWP

| Phase                     | Recommendation   |
| ------------------------- | ---------------- |
| Initial release           | DeepL            |
| Budget/self-hosted option | LibreTranslate   |
| Broad language support    | Google Translate |
| Advanced future feature   | AI refinement    |
| Runtime translation       | Avoid            |
| Build-time translation    | YES              |

---

# Honestly?

I think the most elegant ForgeWP experience eventually becomes:

```bash id="q96hrz"
pnpm forgewp i18n:extract
pnpm forgewp i18n:translate
```

Then:

```text id="h1bofv"
✓ Extracted 214 strings
✓ Translated to de, fr, es
✓ Cached 198 existing translations
✓ 16 new strings translated
```

That feels:

* modern,
* intelligent,
* and low-friction.

Exactly aligned with ForgeWP’s philosophy.


No — DeepL is an online API/service.

Meaning:

* it requires internet access,
* requests are sent to DeepL servers,
* translations are returned via API.

So during:

```bash
pnpm forgewp i18n:translate
```

ForgeWP would:

1. extract untranslated strings,
2. send them to DeepL,
3. receive translations,
4. save them locally as JSON files.

After that:

# the WEBSITE itself works fully offline/runtime-local.

Because translations are already compiled into:

* locale JSON files,
* translation bundles,
* or static assets.

No API calls happen in production/runtime.

---

# Important distinction

| Stage                     | Internet Needed? |
| ------------------------- | ---------------- |
| Translation generation    | YES              |
| Website runtime           | NO               |
| Local translation editing | NO               |
| Language switching        | NO               |

This is VERY important.

ForgeWP should NEVER depend on live translation APIs during runtime.

---

# If you want FULL offline translation generation

Then you need:

# self-hosted translation engines.

This is where:

## LibreTranslate

becomes interesting.

Because it can run:

* locally,
* in Docker,
* on your machine,
* or inside ForgeWP tooling.

Meaning:

* no external API,
* no internet dependency after setup,
* full privacy,
* no per-request costs.

---

# But there’s a tradeoff

| Engine           | Quality   | Offline    | Cost             |
| ---------------- | --------- | ---------- | ---------------- |
| DeepL            | Excellent | No         | Paid             |
| Google Translate | Good      | No         | Paid             |
| LibreTranslate   | Moderate  | Yes        | Free/self-hosted |
| AI Models        | Excellent | Usually No | Expensive        |

---

# My honest recommendation for ForgeWP

## Best practical setup

### Default provider:

# DeepL

Because:

* best translation quality,
* easiest DX,
* reliable.

---

## Optional advanced provider:

# LibreTranslate

For:

* privacy-conscious teams,
* offline workflows,
* self-hosted environments,
* agencies,
* enterprise deployments.

---

# This is probably the ideal ForgeWP architecture

Example:

```ts
defineConfig({
  i18n: {
    provider: 'deepl'
  }
})
```

OR:

```ts
defineConfig({
  i18n: {
    provider: 'libretranslate',
    endpoint: 'http://localhost:5000'
  }
})
```

That’s scalable and flexible.

---

# Another VERY important thing

Even if DeepL requires internet:

# translations should be cached permanently.

Meaning:

Once:

```tsx
__('Contact Us')
```

gets translated into German once,
ForgeWP stores it locally forever unless:

* text changes,
* locale changes,
* or cache is cleared.

So internet usage becomes:

* minimal,
* incremental,
* and build-time only.

This is extremely manageable in practice.

---

# Final answer

## NO:

DeepL is NOT offline.

It requires:

* internet,
* and API access.

---

## BUT:

The generated translations become fully local afterwards.

Meaning:

* runtime language switching works offline,
* websites work offline,
* local development works offline after generation.

---

## If you want true offline generation:

Use:

# LibreTranslate

as an optional provider later.
