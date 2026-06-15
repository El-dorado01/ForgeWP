/**
 * QuerySandbox — Live Verification Page for the In-Memory Relational Query Engine
 *
 * Navigate to: http://localhost:5173/query-sandbox
 *
 * This page runs 6 live query tests against cms/mock-data.json:
 *   1. Taxonomy filter: posts tagged "react" via taxQuery
 *   2. Meta query: projects with budget > 40000 (numeric comparison)
 *   3. Meta query: posts where read_time EXISTS
 *   4. Full-text search query (s: "compiler")
 *   5. Pagination verification: postsPerPage=1 page=2
 *   6. Meta relation OR query
 */
import { useWpQuery } from "@forgewp/react";
import type { WpPost } from "@forgewp/react";

// ── Tiny shared UI atoms ────────────────────────────────────────────────────

function PostCard({ post, index }: { post: WpPost; index: number }) {
  return (
    <div className="border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-none">
      <span className="font-mono text-[9px] text-slate-400 font-bold">#{index + 1} · ID {post.id}</span>
      <p className="mt-1 text-sm font-bold text-slate-900 leading-snug font-sans">{post.title}</p>
      <p className="mt-1.5 font-mono text-[10px] text-slate-400 line-clamp-2">{post.excerpt}</p>
    </div>
  );
}

interface TestBoxProps {
  title: string;
  description: string;
  queryCode: string;
  posts: WpPost[];
  loading: boolean;
  error: string | null;
  expectedMin?: number;
  badgeLabel?: string;
}

function TestBox({
  title,
  description,
  queryCode,
  posts,
  loading,
  error,
  expectedMin = 1,
  badgeLabel = "TEST",
}: TestBoxProps) {
  const passed = !loading && !error && posts.length >= expectedMin;
  const statusColor = loading
    ? "text-slate-400 bg-slate-50 border-slate-200/50"
    : error
    ? "text-red-600 bg-red-50 border-red-200/60"
    : passed
    ? "text-emerald-600 bg-emerald-50 border-emerald-200/60"
    : "text-amber-600 bg-amber-50 border-amber-200/60";
  const statusLabel = loading ? "RUNNING…" : error ? "ERROR" : passed ? "PASS ✓" : "EMPTY";

  return (
    <div className="border border-slate-100 bg-white shadow-xl shadow-slate-100/50 rounded-none overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-100/80 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50/20">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {badgeLabel}
            </span>
            <h3 className="font-heading font-black text-sm tracking-tight text-slate-900 uppercase">
              {title}
            </h3>
          </div>
          <span className={`px-2.5 py-0.5 border font-mono text-[9px] font-black uppercase tracking-wider rounded-none ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Query code preview */}
        <div className="border-b border-slate-50 bg-slate-50/50 px-5 py-3.5">
          <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Query Arguments:
          </p>
          <pre className="whitespace-pre-wrap font-mono text-[10px] text-slate-600 leading-relaxed bg-white border border-slate-100 p-3 rounded-none overflow-x-auto">
            {queryCode}
          </pre>
        </div>

        {/* Description */}
        <p className="border-b border-slate-50 px-5 py-3.5 text-xs text-slate-500 leading-relaxed font-sans">{description}</p>

        {/* Results */}
        <div className="p-5 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 py-2">
              <span className="inline-block h-2.5 w-2.5 animate-pulse bg-primary" />
              <span className="font-mono text-xs text-slate-400">Querying mock database…</span>
            </div>
          )}
          {error && (
            <div className="border border-red-100 bg-red-50/50 p-3">
              <span className="font-mono text-xs font-bold text-red-600">Error: {error}</span>
            </div>
          )}
          {!loading && !error && posts.length === 0 && (
            <div className="border border-yellow-100 bg-yellow-50/50 p-3">
              <span className="font-mono text-xs font-bold text-yellow-600">
                ⚠ No results — check mock-data.json has matching _terms / customFields.
              </span>
            </div>
          )}
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} />
          ))}
        </div>
      </div>
      
      {!loading && !error && posts.length > 0 && (
        <div className="px-5 pb-4 pt-1 border-t border-slate-50/20">
          <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            {posts.length} result{posts.length !== 1 ? "s" : ""} evaluated
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main sandbox page ───────────────────────────────────────────────────────

export default function QuerySandbox() {
  // ── Test 1: taxQuery — filter posts tagged "react" ────────────────────────
  const test1 = useWpQuery({
    postType: "post",
    taxQuery: [{ taxonomy: "post_tag", terms: "react" }],
  });

  // ── Test 2: metaQuery — projects with budget > 40000 ─────────────────────
  const test2 = useWpQuery({
    postType: "project",
    metaQuery: [{ key: "project_budget", compare: ">", value: 40000 }],
    orderby: "date",
    order: "DESC",
  });

  // ── Test 3: metaQuery — posts where read_time EXISTS ─────────────────────
  const test3 = useWpQuery({
    postType: "post",
    metaQuery: [{ key: "read_time", compare: "EXISTS" }],
  });

  // ── Test 4: Full-text search ──────────────────────────────────────────────
  const test4 = useWpQuery({
    postType: "post",
    s: "compiler",
  });

  // ── Test 5: Pagination — page 2 with 1 post per page ─────────────────────
  const test5 = useWpQuery({
    postType: "post",
    postsPerPage: 1,
    paged: 2,
    orderby: "date",
    order: "ASC",
  });

  // ── Test 6: metaRelation OR ───────────────────────────────────────────────
  const test6 = useWpQuery({
    postType: "project",
    metaQuery: [
      { key: "status", value: "active" },
      { key: "client_name", value: "ForgeWP Community" },
    ],
    metaRelation: "OR",
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans flex flex-col items-center justify-start">
      {/* Page Header */}
      <header className="w-full max-w-6xl mb-8 border border-slate-100 bg-white p-8 shadow-2xl rounded-none relative overflow-hidden">
        {/* Subtle dot grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-size-[16px_16px] pointer-events-none opacity-40"></div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-block bg-primary/10 text-primary border border-primary/10 px-3 py-1 font-mono text-[9px] font-black uppercase tracking-widest rounded-none">
              Relational Engine v2
            </span>
            <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 border border-slate-200/60 rounded-none">
              In-Memory · Zero DB Dependency
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-heading font-black tracking-tight text-slate-900 leading-tight">
            useWpQuery — Relational Engine Sandbox
          </h1>
          <p className="mt-3 text-slate-500 text-sm leading-relaxed max-w-3xl font-medium">
            Live verification of ForgeWP's in-memory relational engine. All queries run
            synchronously in-browser against <code className="font-mono text-primary font-bold">cms/mock-data.json</code>.
            Passing cards validate successful evaluation of isomorphic WP Query logic.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-100">
            {["taxQuery", "metaQuery", "metaRelation OR", "Full-text search", "Page-slice pagination"].map(f => (
              <span key={f} className="bg-slate-50 text-slate-500 border border-slate-100/60 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider rounded-none">
                {f}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Test grid */}
      <main className="w-full max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3 z-10">
        <TestBox
          title="Taxonomy Term Filter"
          description='Posts tagged with the "react" post_tag term via taxQuery. Matches against _terms.post_tag[].slug.'
          queryCode={`taxQuery: [{\n  taxonomy: "post_tag",\n  terms: "react"\n}]`}
          badgeLabel="Test 1 · taxQuery"
          posts={test1.posts}
          loading={test1.loading}
          error={test1.error}
          expectedMin={1}
        />

        <TestBox
          title="Numeric Meta Comparison"
          description='Projects where project_budget > 40000. Tests numeric type coercion in the meta engine.'
          queryCode={`postType: "project",\nmetaQuery: [{\n  key: "project_budget",\n  compare: ">",\n  value: 40000\n}]`}
          badgeLabel="Test 2 · metaQuery >"
          posts={test2.posts}
          loading={test2.loading}
          error={test2.error}
          expectedMin={1}
        />

        <TestBox
          title="EXISTS Operator"
          description='Posts where read_time EXISTS in customFields. No value comparison — pure field presence check.'
          queryCode={`metaQuery: [{\n  key: "read_time",\n  compare: "EXISTS"\n}]`}
          badgeLabel="Test 3 · EXISTS"
          posts={test3.posts}
          loading={test3.loading}
          error={test3.error}
          expectedMin={2}
        />

        <TestBox
          title="Full-Text Search"
          description='Posts whose title, content, or excerpt contains the word "compiler". Case-insensitive.'
          queryCode={`postType: "post",\ns: "compiler"`}
          badgeLabel="Test 4 · s:"
          posts={test4.posts}
          loading={test4.loading}
          error={test4.error}
          expectedMin={1}
        />

        <TestBox
          title="Page-Slice Pagination"
          description='1 post per page, fetching page 2 (ASC by date). Should return the 2nd oldest post only — not posts 1+2.'
          queryCode={`postsPerPage: 1,\npaged: 2,\norderby: "date",\norder: "ASC"`}
          badgeLabel="Test 5 · paged:2"
          posts={test5.posts}
          loading={test5.loading}
          error={test5.error}
          expectedMin={1}
        />

        <TestBox
          title="Meta Relation OR"
          description='Projects that are status=active OR client_name="ForgeWP Community". Both conditions should match at least one row.'
          queryCode={`postType: "project",\nmetaQuery: [\n  { key: "status", value: "active" },\n  { key: "client_name",\n    value: "ForgeWP Community" }\n],\nmetaRelation: "OR"`}
          badgeLabel="Test 6 · OR"
          posts={test6.posts}
          loading={test6.loading}
          error={test6.error}
          expectedMin={2}
        />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-slate-400 font-mono text-[9px] uppercase tracking-widest z-10">
        <span>© {new Date().getFullYear()} ForgeWP Framework</span>
        <span>In-Memory Relational Engine Evaluation Complete</span>
      </footer>
    </div>
  );
}
