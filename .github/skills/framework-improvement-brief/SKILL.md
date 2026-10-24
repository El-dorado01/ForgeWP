---
name: framework-improvement-brief
description: 'Use when working in the ForgeWP monorepo and you discover a framework usability, architecture, workflow, or documentation improvement worth tracking in the root improvement brief.'
---

# ForgeWP Improvement Brief Workflow

Use this skill when a ForgeWP task reveals a reusable framework improvement that is outside, or broader than, the immediate task.

## Source of Truth

Maintain relevant findings in the monorepo-root file:

`FORGEWP_FRAMEWORK_UX_AND_CONTENT_MODEL_IMPROVEMENT_BRIEF.md`

Read the current brief before editing it. Do not create a competing improvement list elsewhere unless the user requests one. The brief is a current working backlog and shared progress tracker. Retain completed items so the user can track delivered work alongside remaining work.

## Evidence First

Before recording a finding:

1. Trace the behavior to its owning source code, nearest test, generated output, or documented contract.
2. Distinguish verified behavior from inference. State uncertainty where behavior has not been reproduced.
3. Explain the user-facing problem with a concrete workflow example.
4. Check the current brief for duplicates and update an existing item when the new evidence belongs there.
5. Recheck nearby suggestions for status changes caused by the current work or intervening edits.

Do not record a general preference as a framework defect. A project-specific design decision belongs in project notes unless it exposes a reusable framework issue.

## Write Findings as Proposals

For each new item, include:

- **Observed behavior:** what the framework does today, with relevant source paths.
- **Why it matters:** the practical confusion, inconsistency, migration risk, or extra work.
- **Suggested improvement:** a bounded direction, not an assumed implementation.
- **Acceptance criteria:** observable behavior and focused verification.

Keep verified current behavior separate from proposed future behavior. Do not describe an unimplemented suggestion as a supported API.

## Keep the Brief Current

Whenever the brief is touched:

- Mark an item completed when its acceptance criteria are implemented and verified. Retain its checked criteria and a concise verification note. Distinguish implementation/test completion from deferred WordPress acceptance; never mark untested live behavior as verified.
- Keep implementation details concise and link to owning code/docs rather than duplicating them. Retain completion status and verification evidence in the brief.
- Remove or rewrite a suggestion when code inspection disproves its premise. Do not leave a refuted concern phrased as an open defect.
- Mark an item as partial when only one acceptance criterion is met. Keep remaining work explicit.
- If another contributor or user changed relevant files, inspect the current source before changing the brief's status.
- Prefer a concise active backlog over preserving every past idea. Keep historical context only when needed for migration, compatibility, or decision rationale.

## Scope and Safety

- Updating the brief does not authorize implementing the proposed improvement. Implement only when the active user request asks for it.
- Prefer additive, backward-compatible proposals. Call out public API, generated output, stored-data, or migration risks.
- Do not broaden a task into unrelated cleanup.
- Keep `forgewp-docs` generic. Do not copy a client or project name, route, CPT, or content requirement into framework documentation; use a generic example unless documenting a real public API.
- Do not edit generated `.forgewp/` output as source of truth.

## Finish

After updating the brief, verify active items against current source, tests, generated output, and docs; mark verified work complete and rewrite invalidated concerns with a short explanation; then check that remaining entries are clear, non-duplicative, and point to real paths. In the response, say what changed in the brief and whether the suggestions were only recorded or also implemented.
