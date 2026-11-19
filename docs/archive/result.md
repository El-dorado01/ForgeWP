Summary of Findings
Bug 1 — Chained/nested ternaries (cond1 ? (A) : cond2 ? (B) : (C)) leak as literal text
Root cause: transpileTernaries() in packages/compiler/lib/blocks/php-transpiler.js:1191-1251 only recognizes a single-level cond ? (A) : (B) shape, and its structural validation silently rejects anything else instead of recursing.

Walk-through for HotelListicles.tsx ({listiclesLoading ? (…) : matchingListicles.length > 0 ? (…) : (…)}):

condVar extraction (line 1218) and the char-class check (line 1219, /^[a-zA-Z0-9_.\-\s&|!=<>'"]+$/) correctly match listiclesLoading — comparison operators/.length are not the blocker (<> and . are already in the allowed set).
extractTernaryBranch() (lines 1164-1189) correctly extracts the first (loading) branch via extractJsxByTagBalancing.
Line 1224: colonIndex = phpMarkup.indexOf(':', trueBranch.endIndex) finds the : between the first and second ternary — but the code has no concept of "this next ( belongs to ternary #2's true-branch, not ternary #1's false-branch." It blindly extracts the matchingListicles.length > 0 ? ( branch's div as if it were the whole false branch.
Line 1230: endBrace = phpMarkup.indexOf('}', falseBranch.endIndex) then looks for the closing } of the whole {…} expression. Line 1232-1233 requires the text between the (wrongly-scoped) false branch and that } to be exactly ')' or empty:

const gap = phpMarkup.substring(falseBranch.endIndex, endBrace).trim();
if (gap === ')' || gap === '') { … perform replacement … }
Because a third branch exists, gap is actually ": (<div>…empty state…</div>)" — non-empty and not ')' — so the whole if is skipped and the function falls through to index = matchIndex - 1, abandoning the match with no replacement. A plain 2-way ternary works precisely because there is no third branch, so gap is always ''.

The code itself acknowledges this limitation elsewhere but never fixes the main path — see the comment at lines 1316-1326: "Chained dispatch ternaries … are a shape transpileTernaries doesn't support (it only handles a single cond ? A : B, not further ternaries inside the false branch)." There is even a working chain-resolver, resolveStaticTernaryChain() (lines 1359+), but it's only wired into inlineJsxRenderHelperCalls() for hoisted-helper call sites, requires every condition to be statically evaluable (literal comparisons or setAttributes treated as always-false), and is never invoked from transpileTernaries/the main JSX pipeline — so it can't handle a runtime condition like matchingListicles.length > 0.

Compounding it: the un-brace-depth-aware "safety net" regex at index.js:1726-1729 also fails to strip the orphaned text, because its trigger keywords (.map(, .filter(, =>, etc.) must appear in the outer, brace-free segment of the {…} — but by this point transpileLoops has already converted the nested .map() inside branch 2, leaving the outer ternary wrapper with no trigger keyword left to match.

Reusable helpers already available: findMatchingParenClose (line 1124), extractJsxByTagBalancing (line 519), stripJsxParenWrap (line 1402) — a real fix should make extractTernaryBranch/transpileTernaries recursive using these, rather than reinventing paren/tag balancing.

Bug 2 — Universal $parsed = ($JSON ?? null).'';
Root cause: a dead intended-allowlist check in index.js plus neutralizeUnknownJsCalls's dotted-call blindness in php-transpiler.js.

index.js:1041-1046 tries to recognize known-safe calls:

const unknownCall = varValue.match(/^([A-Za-z_$][\w$]*)\s*\(/);
const knownPhpCall = unknownCall &&
  /^(Number|String|Boolean|parseInt|parseFloat|JSON\.parse|Math\.\w+|useWpPageLink)$/.test(unknownCall[1]);
The unknownCall regex requires an identifier immediately followed by (. For JSON.parse(related) there's a . in between, so it never matches — unknownCall is null. The JSON\.parse alternative in the allow-list regex is therefore dead code; it can never be reached. Since unknownCall is null, (unknownCall && !knownPhpCall) is false, so the const parsed = JSON.parse(related) line is not flagged isClientOnly and is treated as a normal server-transpilable local var (confirmed live in hotelchecker24/src/components/HotelListicles.tsx:50, also present in listicle-quicklinks/listicle-ranked-hotels, matching every render.php that actually has $parsed).
2. It falls to translateJsExpressionToPhp(varValue, …) (index.js:1116), which calls neutralizeUnknownJsCalls (php-transpiler.js:304-393). That function scans for IDENT( regardless of any preceding ., so it walks past JSON char-by-char (never matching IDENT( there) until it reaches parse(, which isn't in its callable whitelist (line 307-315, which does list json_decode/json_encode but not bare parse) — it deletes the whole call+args, replacing with ''. Verified directly:


neutralizeUnknownJsCalls("JSON.parse(rawSomething || '{}')") === "JSON.''"
Back in translateJsExpressionToPhp, the orphaned bare JSON identifier (lines 428-465) isn't in skipWords/blockAttrKeys/localVars, so it gets the generic fallback wrap ($JSON ?? null), concatenated with the leftover '' literal → ($JSON ?? null).''. This is then emitted verbatim at index.js:1127: phpVarDefinitions += `$${varName} = ${phpVal};\n`;.
Original intent: genuinely support JSON.parse(acfField) → json_decode($acfField, true) for ACF/meta fields stored as JSON strings — evidenced by json_decode already being in the callable whitelist and JSON\.parse already being (uselessly) listed in the knownPhpCall regex. It's a half-finished feature: the allowlist name was added but the match regex that feeds it was never adapted for dotted (Obj.method() calls, and neutralizeUnknownJsCalls was never taught to special-case JSON.parse → json_decode.

No existing reusable helper covers this — it needs a small dedicated JSON.parse(expr) → json_decode(<phpExpr>, true) rule added before/inside neutralizeUnknownJsCalls, plus fixing unknownCall's regex to capture dotted call heads (/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/).



and with this form controls that we have built, how do we handle the ones we did in the auth that the framework supports? there is a support that allows devs to add more custom fields to the registration form, do you think we should allow clients to be able to manage those as well?

📋 Not code fixes — need WP-Admin / editorial action (I can't do these from source)
#4 Meta descriptions "via AIOSEO field" — note: the React <WpHead description=...> prop is now set on every page I checked, so there may already be real descriptions rendering; whether AIOSEO's own per-page field is also filled in (or conflicts with it) needs a look in wp-admin.

#5 DE menu pointing to EN pages — WordPress menu assignment, not theme code.

#6 /single-hotel, /single-listicle demo posts — I confirmed these aren't referenced in mock-data.json or wp.config.ts, meaning they're real published posts sitting in the database with demo content. Needs deleting (or noindex) in wp-admin; sitemap exclusion is an AIOSEO setting.
#11 Missing EN listicle translations — content creation.
#12 Duplicate H1 on one specific listicle — this is post content (Gutenberg body), not a template bug (it doesn't affect other listicles), so I can't fix it from code — needs opening that one post and removing the duplicate heading.
#18 /contact vs /kontakt slug decision — a call for you/the client, not something to silently pick for you.