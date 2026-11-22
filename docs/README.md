# ForgeWP project documentation

This folder keeps the framework's design history out of the repository root. Use the guides below to find current architecture, design plans, and historical context.

| Guide | Use it for |
| --- | --- |
| [Architecture overview](architecture.md) | The current theme-authoring model, package boundaries and links to implementation |
| [Dual-mode portability architecture](dual-mode-portability-architecture.md) | Native / Hybrid / Decoupled portability audit, companion backend plugin split, and WordPress plugin compatibility strategy |
| [Shortcode form preview spec](shortcode-form-preview-spec.md) | Scoped design & portability boundaries for plugin-managed `<WpShortcode>` forms |
| [Next.js adapter design brief](nextjs-archive/nextjs-adapter-design-brief.md) | Goals, design rules, deployment modes, and the agent handoff |
| [Design history](history.md) | How the proposals relate, which discussions to consult, and how to interpret old plans |
| [Remaining work](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md) | The active UX/content-model acceptance and improvement tracker |
| [Public documentation](https://www.forgewp.dev/docs/core/getting-started/introduction) | Installation, supported APIs, recipes and usage guidance |
| [Auth security review](../audit/auth-security-review.md) | The completed local security review and its live-deployment limits |

The archive preserves the 36 planning, review and handoff documents previously at the root. Moving a document here does **not** mean every proposal was accepted, every checkbox is current, or every finding has been resolved. Historical completion percentages, deadlines, generated paths and browser-session IDs describe the original work session. Confirm behavior against the current source, tests and published guides before acting on an old instruction.

## Architecture and specifications

- [Architectural principles](archive/architectural-principles.md): original principles, phased plans and recorded decisions.
- [Foundation developer manual](archive/forgewp-docs.md): the early package/compiler walkthrough.
- [Structured editable-content architecture](archive/forgewp-structured-editable-content-architecture.md): schemas, content ownership and compiler responsibilities.
- [Block-theme and ownership proposal](archive/block_theme_proposal_and_ownership_model.md): working proposal and the reasoning behind bounded editing.
- [Native forms specification](archive/forgewp_forms_spec.md): submission infrastructure and the field-ownership split.
- [Asset orchestration brief](archive/ForgeWP_Asset_Orchestration_Agent_Brief.md): asset-processing design requirements.
- [Unified deployment architecture](archive/ForgeWP_Unified_Deployment_Architecture.md): the native/decoupled deployment vision; verify individual adapter support before using it.
- [Translation discussion](archive/translations.md): translation-service ideas and boundaries.

## Roadmaps and implementation plans

- [Early island/provider TODO](archive/ABSOLUTE_TODO.md)
- [Authentication roadmap](archive/forgewp-auth-roadmap.md)
- [Repeater and icon roadmap](archive/forgewp-repeater-roadmap.md)
- [WooCommerce roadmap](archive/forgewp-woocommerce-roadmap.md)
- [Asset orchestration roadmap](archive/FORGEWP_ASSET_ORCHESTRATION_ROADMAP.md)
- [CMS typing roadmap](archive/FORGEWP_CMS_TYPING_SPEC_AND_ROADMAP.md)
- [Data seeding and synchronization](archive/FORGEWP_DATA_SEEDING_AND_SYNC_ROADMAP.md)
- [Error handling and developer experience](archive/FORGEWP_ERROR_HANDLING_DX_ROADMAP.md)
- [Progressive navigation/query runtime](archive/forgewp_hybrid_roadmap.md)
- [JavaScript configuration roadmap](archive/forgewp_javascript_config_roadmap.md)
- [WordPress-first native forms plan](archive/FORGEWP_NATIVE_FORMS_WORDPRESS_FIRST_IMPLEMENTATION_PLAN.md)
- [Virtual-module roadmap](archive/FORGEWP_ZERO_CLUTTER_VIRTUAL_MODULES_ROADMAP.md)
- [Bounded-editing implementation roadmap](archive/new-roadmap.md)
- [Ownership convention and scaffolding proposals](archive/standardize-ownership-policy.md)

## Reviews and investigations

- [Strategic architecture review](archive/forgewp_architecture_review_and_strategic_roadmap.md)
- [Roadmap audit and gap analysis](archive/forgewp_roadmap_audit.md)
- [Edge-case and integrity audit](archive/edge-case-audit.md)
- [Block-rendering analysis](archive/block-rendering-analysis.md)
- [Block-strategy assessment](archive/block_strategy_assessment.md)
- [Component-registry UX review](archive/component-registry-ux-review.md)
- [Gutenberg editor-height issue brief](archive/forgewp_issue_brief.md)
- [Recorded investigation response](archive/result.md)

## Handoffs

- [Editable architecture handoff](archive/editable_architecture_handoff.md)
- [Hospitality events handoff](archive/handoff_notes.md)
- [Hospitality block-rendering handoff](archive/hospitality-block-rendering-handoff.md)

These are historical handoffs, not instructions to run against a current WordPress site. Recheck the named project, working tree and deployment before following operational steps.

## Communication and launch material

- [Phase-three content guide](archive/phase3_content_guide.md)
- [Workshop and demonstration ideas](archive/suggestion-1.md)
- [Screenshot and presentation ideas](archive/suggestion-2.md)

## Keeping this organized

Keep the root README as the entry point and the root improvement brief as the active scoped tracker. Put new usage documentation in the public docs project. Put durable internal guidance in this folder, reviews in `audit/`, and project-specific operating instructions beside their project. Keep completed or superseded planning records in `archive/` and add them to this index. Revalidate unfinished ideas before promoting them to an active plan; do not create another parallel root TODO file.
