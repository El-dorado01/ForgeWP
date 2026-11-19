# ForgeWP design history

The original root documents are preserved in [the archive](README.md). This guide groups the discussions by the problem they explored rather than assigning invented dates or treating every proposal as a shipped feature.

## From framework idea to compiler workflow

The [foundation manual](archive/forgewp-docs.md), [architectural principles](archive/architectural-principles.md), [strategic review](archive/forgewp_architecture_review_and_strategic_roadmap.md) and [roadmap audit](archive/forgewp_roadmap_audit.md) record the early framework model and its assessments. Their phase numbers, percentages and feature claims belong to those snapshots.

The later plans explore specific parts of that model: [JavaScript configuration](archive/forgewp_javascript_config_roadmap.md), [virtual modules](archive/FORGEWP_ZERO_CLUTTER_VIRTUAL_MODULES_ROADMAP.md), [CMS typing](archive/FORGEWP_CMS_TYPING_SPEC_AND_ROADMAP.md), [asset orchestration](archive/FORGEWP_ASSET_ORCHESTRATION_ROADMAP.md), [data synchronization](archive/FORGEWP_DATA_SEEDING_AND_SYNC_ROADMAP.md) and [developer-facing errors](archive/FORGEWP_ERROR_HANDLING_DX_ROADMAP.md).

## From page editing to explicit content ownership

The [block-theme proposal](archive/block_theme_proposal_and_ownership_model.md) and [strategy assessment](archive/block_strategy_assessment.md) discuss how React-authored layouts and Gutenberg editing should coexist. The [structured editable-content brief](archive/forgewp-structured-editable-content-architecture.md), [handoff](archive/editable_architecture_handoff.md) and [bounded-editing roadmap](archive/new-roadmap.md) explore implementation details.

The [ownership/scaffolding discussion](archive/standardize-ownership-policy.md) proposes further conventions and tooling. Its suggested next steps are not automatically today's backlog. Compare them with the current [content-ownership guide](https://www.forgewp.dev/docs/core/content-ownership/page-content-and-editables) before reviving them.

## From isolated interactivity to session-aware behavior

The [early island/provider TODO](archive/ABSOLUTE_TODO.md), [Auth roadmap](archive/forgewp-auth-roadmap.md), [progressive query/navigation roadmap](archive/forgewp_hybrid_roadmap.md) and [repeater/icon plan](archive/forgewp-repeater-roadmap.md) capture different aspects of interactive behavior. They are separate design records, not one cumulative list of outstanding work.

Current Auth usage is documented publicly, and the [security audit](../audit/auth-security-review.md) records the recent request/session hardening and its limits. Live WordPress acceptance remains in the [active brief](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md).

## Native forms and project-driven findings

The [forms specification](archive/forgewp_forms_spec.md) and [WordPress-first plan](archive/FORGEWP_NATIVE_FORMS_WORDPRESS_FIRST_IMPLEMENTATION_PLAN.md) record the field-ownership and backend direction. The [edge-case audit](archive/edge-case-audit.md), [rendering analysis](archive/block-rendering-analysis.md), [editor-height brief](archive/forgewp_issue_brief.md), [investigation response](archive/result.md) and [registry UX review](archive/component-registry-ux-review.md) retain implementation findings that must be checked against current code.

The [Hospitality events](archive/handoff_notes.md) and [block-rendering handoffs](archive/hospitality-block-rendering-handoff.md) are project snapshots. Their WordPress page IDs, browser sessions, ZIP paths and operational steps must be revalidated before use. They are not current deployment instructions.

## Parallel explorations

The [deployment vision](archive/ForgeWP_Unified_Deployment_Architecture.md), [commerce roadmap](archive/forgewp-woocommerce-roadmap.md) and [translation discussion](archive/translations.md) explore broader directions. Each needs its own implementation and acceptance evidence; the presence of a proposal does not establish a supported integration.

The [content guide](archive/phase3_content_guide.md) and [two](archive/suggestion-1.md) [presentation notes](archive/suggestion-2.md) are communication material rather than framework specifications.

## What this cleanup changes

The root now keeps the project README and active improvement brief. The other 36 root Markdown files live under `docs/archive/`, retaining their filenames and original discussions. This index, the [architecture overview](architecture.md), and the [documentation directory](README.md) provide three concise entry points. Links that depended on the old root locations are adjusted where needed; historical machine-local paths and line references may still describe an older checkout.

This is an organizational cleanup, not a fresh audit of every historical claim. It does not close old findings, approve proposed APIs or migrate old TODOs into the active brief. If an archived idea becomes current work, first verify its status and write a scoped plan beside the relevant implementation.
