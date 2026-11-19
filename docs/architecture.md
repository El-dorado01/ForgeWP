# ForgeWP architecture overview

This is a short orientation to the current theme workflow, not a replacement API specification. The [published guides](https://www.forgewp.dev/docs/core/getting-started/introduction), installed types and current source describe the supported contracts. [Historical proposals](README.md) preserve the reasoning, including ideas that were changed or deferred.

## Author React, export a WordPress theme

A theme project uses React, TypeScript, Tailwind CSS and Vite for authoring and preview. The standard export builds assets, renders markup, converts recognized ForgeWP constructs into WordPress integration, generates theme files and registered Gutenberg blocks, and packages the theme ZIP.

Ordinary React components supply rendered markup; the compiler does not translate arbitrary JavaScript into PHP. Interactive islands supply browser behavior where needed. The standard exported theme runs inside WordPress without a separate Node.js frontend server.

Start with the [export pipeline](../packages/compiler/lib/export-theme.js), [theme generator](../packages/compiler/lib/generate-theme.js), [React adapter](../packages/compiler/lib/react-adapter.js), and [block compiler](../packages/compiler/lib/blocks/index.js).

## Package boundaries

| Area | Responsibility |
| --- | --- |
| [`packages/create-forgewp`](../packages/create-forgewp/) | Project scaffolding and starter setup |
| [`packages/compiler`](../packages/compiler/) | CLI, source analysis, rendering, WordPress generation and export |
| [`packages/react`](../packages/react/) | React bindings, content primitives and schema APIs |
| [`packages/ui`](../packages/ui/) | Shared UI and styling resources |
| [`packages/auth`](../packages/auth/) | Auth components/hooks and their preview/session behavior |
| [`packages/woocommerce`](../packages/woocommerce/) | The separate commerce integration workstream |

Other adapters and deployment modes have their own contracts. The broad promises in the [early deployment vision](archive/ForgeWP_Unified_Deployment_Architecture.md) should not be read as acceptance evidence for every target.

## Make content ownership explicit

Developer-owned layouts and editor-owned content are separate choices. Named page values use editable schemas and metadata bindings. Saved WordPress content belongs in a `BlockArea`. Movable reusable sections use registered Gutenberg blocks, with nested blocks where composition is required.

For the supported patterns, use [Content Ownership and Editability](https://www.forgewp.dev/docs/core/content-ownership/page-content-and-editables). The [editable architecture brief](archive/forgewp-structured-editable-content-architecture.md), [block-theme proposal](archive/block_theme_proposal_and_ownership_model.md), and [ownership discussion](archive/standardize-ownership-policy.md) explain the design exploration rather than establishing new APIs.

## Preview is a simulation

The local `cms/` data supports design and development without requiring a WordPress database for the standard preview. It does not prove live permissions, cookie behavior, email delivery, plugin integration or persistence. Exported behavior needs the acceptance checks in the [remaining-work brief](../FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md).

## Keep server authorization on the server

Auth UI gates and displayed role/JWT claims are interface behavior, not authorization for protected data. Generated WordPress handlers validate their own inputs and permissions. Cookie logout requires a current session and REST nonce. Consult the [Auth security review](../audit/auth-security-review.md) and [published endpoint reference](https://www.forgewp.dev/docs/auth/auth-reference/endpoints) for the implemented checks and remaining deployment limits.

Native forms similarly separate developer/client field ownership from server-side validation and submission. Their [original specification](archive/forgewp_forms_spec.md) and [implementation plan](archive/FORGEWP_NATIVE_FORMS_WORDPRESS_FIRST_IMPLEMENTATION_PLAN.md) retain historical details; current usage lives in the [native forms guide](https://www.forgewp.dev/docs/core/forms-search/native-forms).

## Read historical status carefully

The archive includes competing proposals, implementation notes, completed checklists and unresolved findings. It is evidence of how decisions evolved, not a single synchronized roadmap. Use [Design history](history.md) to choose the right record, and recheck source/tests before resuming work from one.
