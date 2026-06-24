Achieving these two milestones would elevate ForgeWP to a state-of-the-art compiler framework (similar to React Server Components or Astro's internal compiler).

Here is a realistic estimate of the engineering complexity and timeline for each milestone:

1. No page-level <Hydrate> (Automatic Island Detection)
Complexity: High
Time Estimate: 3 to 5 Weeks
Why it takes this long:
AST Static Analysis: We need to parse every component in the page route using an AST parser (like SWC or Babel) to detect client-side triggers:
Hooks (useState, useEffect, useRef, useContext).
Inline event handlers (onClick, onChange, onSubmit).
Browser-only API references (window, document, localStorage).
Boundary Splitting: The compiler must decide where to split the code. If <Header> contains a <SearchBar> with an onClick event, the compiler must automatically isolate <SearchBar> as the interactive island while keeping the rest of the <Header> statically compiled.
Dynamic Rollup Inputs: The build pipeline must dynamically feed these auto-detected components as inputs to Vite/Rollup and generate hydration scripts on-the-fly.
2. Auto-generating Provider Wiring
Complexity: Medium
Time Estimate: 1 to 2 Weeks
Why it takes this long:
Hook Usage Detection: The AST parser must scan components for imports of @forgewp/auth hooks (useWpUser, useWpAuth, useWpCapability).
Compiler Wrapping: If the compiler finds auth hook usage inside an interactive island, it must rewrite the export during transpilation to wrap it automatically in <WpAuthProvider>:
Developer writes:
typescript
export default function ProfileWidget() { const user = useWpUser(); ... }
Compiler outputs for bundle:
javascript
import { WpAuthProvider } from '@forgewp/auth';
function ProfileWidget() { ... }
export default (props) => <WpAuthProvider><ProfileWidget {...props} /></WpAuthProvider>
Global Layout SSR Injection: The compiler also needs to automatically wrap the SSR render pipeline in <WpAuthProvider> during template compilation so server-side rendering doesn't crash.
📅 Summary Timeline: 4 to 7 Weeks (1 Dev)
Step	Focus	Timeline
Step 1	AST Scanner & Hook Analyzer: Detect interactivity & auth hooks	1 Week
Step 2	Auto-Provider Injection: Automatically wrap islands and layouts	1 Week
Step 3	Boundary Splitter: Find best split-points and auto-insert island nodes	2 Weeks
Step 4	Dynamic Bundler Integration: Sync compiler with Vite's Rollup inputs	1 Week
Step 5	Edge Cases & Testing: Prop serialization (e.g. dynamic children) and test suite	1-2 Weeks
Implementing this would remove almost all boilerplate, turning ForgeWP into a zero-config, compiler-driven framework where developers write pure React code and the compiler handles all optimization and hydration decisions under the hood.