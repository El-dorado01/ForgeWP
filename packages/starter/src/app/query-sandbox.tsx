/**
 * QuerySandbox — Live Verification Page for the In-Memory Relational Query Engine
 *
 * Navigate to: http://localhost:5173/query-sandbox
 *
 * This page runs 5 live query tests against cms/mock-data.json:
 *   1. Taxonomy filter: posts tagged "react" via taxQuery
 *   2. Meta query: projects with budget > 40000 (numeric comparison)
 *   3. Meta query: posts where read_time EXISTS
 *   4. Full-text search query (s: "compiler")
 *   5. Pagination verification: postsPerPage=1 page=2
 *
 * If all cards show data, the relational engine works correctly.
 */
import { useWpQuery } from "@forgewp/react";
import type { WpPost } from "@forgewp/react";

// ── Tiny shared UI atoms ────────────────────────────────────────────────────

function Badge({ label, color = "bg-zinc-950" }: { label: string; color?: string }) {
  return (
    <span
      className={`inline-block ${color} px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-white`}
    >
      {label}
    </span>
  );
}

function PostCard({ post, index }: { post: WpPost; index: number }) {
  return (
    <div className="border border-zinc-200 bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)]">
      <span className="font-mono text-[9px] text-zinc-400">#{index + 1} · ID {post.id}</span>
      <p className="mt-1 text-sm font-bold text-zinc-900 leading-snug">{post.title}</p>
      <p className="mt-1 font-mono text-[10px] text-zinc-500 line-clamp-2">{post.excerpt}</p>
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
  accentColor?: string;
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
  accentColor = "bg-brand",
  badgeLabel = "TEST",
}: TestBoxProps) {
  const passed = !loading && !error && posts.length >= expectedMin;
  const statusColor = loading
    ? "bg-zinc-400"
    : error
    ? "bg-red-600"
    : passed
    ? "bg-green-600"
    : "bg-yellow-500";
  const statusLabel = loading ? "RUNNING…" : error ? "ERROR" : passed ? "PASS ✓" : "EMPTY";

  return (
    <div className="border-2 border-zinc-950 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className={`${accentColor} flex items-center justify-between border-b-2 border-zinc-950 px-4 py-3`}>
        <div className="flex items-center gap-3">
          <Badge label={badgeLabel} />
          <h3 className="font-mono text-xs font-black uppercase tracking-wide text-white">
            {title}
          </h3>
        </div>
        <span className={`${statusColor} px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-white`}>
          {statusLabel}
        </span>
      </div>

      {/* Query code preview */}
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400">
          Query Args:
        </p>
        <pre className="whitespace-pre-wrap font-mono text-[10px] text-zinc-700 leading-relaxed">
          {queryCode}
        </pre>
      </div>

      {/* Description */}
      <p className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">{description}</p>

      {/* Results */}
      <div className="p-4 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 py-2">
            <span className="inline-block h-2 w-2 animate-pulse bg-zinc-400" />
            <span className="font-mono text-xs text-zinc-400">Querying mock database…</span>
          </div>
        )}
        {error && (
          <div className="border border-red-200 bg-red-50 p-3">
            <span className="font-mono text-xs font-bold text-red-700">Error: {error}</span>
          </div>
        )}
        {!loading && !error && posts.length === 0 && (
          <div className="border border-yellow-200 bg-yellow-50 p-3">
            <span className="font-mono text-xs font-bold text-yellow-700">
              ⚠ No results — check mock-data.json has matching _terms / customFields.
            </span>
          </div>
        )}
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
        {!loading && !error && posts.length > 0 && (
          <p className="pt-1 font-mono text-[9px] text-zinc-400">
            {posts.length} result{posts.length !== 1 ? "s" : ""} returned
          </p>
        )}
      </div>
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

  // ── Test 6: metaRelation OR — projects that are active OR have El Dorado ──
  const test6 = useWpQuery({
    postType: "project",
    metaQuery: [
      { key: "status", value: "active" },
      { key: "client_name", value: "ForgeWP Community" },
    ],
    metaRelation: "OR",
  });

  return (
    <div className="min-h-screen bg-zinc-100 p-6 md:p-10 font-sans">
      {/* Page Header */}
      <header className="mx-auto max-w-6xl mb-8">
        <div className="border-4 border-zinc-950 bg-zinc-950 px-6 py-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-block bg-green-500 px-3 py-1 font-mono text-xs font-black uppercase tracking-widest text-white">
              Relational Engine v2
            </span>
            <span className="font-mono text-xs text-zinc-400">In-Memory · No SQLite · No Network</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
            useWpQuery — Relational Query Engine Sandbox
          </h1>
          <p className="mt-2 text-sm text-zinc-400 font-medium max-w-2xl">
            Live verification of the ForgeWP in-memory relational engine. All queries run
            synchronously against <code className="text-green-400">cms/mock-data.json</code>.
            Every passing card validates a different filter path.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["taxQuery", "metaQuery", "metaRelation OR", "Full-text search", "Page-slice pagination"].map(f => (
              <span key={f} className="border border-zinc-700 px-2 py-0.5 font-mono text-[9px] text-zinc-300 uppercase tracking-wider">
                {f}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Test grid */}
      <main className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <TestBox
          title="Taxonomy Term Filter"
          description='Posts tagged with the "react" post_tag term via taxQuery. Matches against _terms.post_tag[].slug.'
          queryCode={`taxQuery: [{\n  taxonomy: "post_tag",\n  terms: "react"\n}]`}
          badgeLabel="Test 1 · taxQuery"
          accentColor="bg-brand"
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
          accentColor="bg-zinc-800"
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
          accentColor="bg-zinc-700"
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
          accentColor="bg-indigo-700"
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
          accentColor="bg-violet-700"
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
          accentColor="bg-emerald-700"
          posts={test6.posts}
          loading={test6.loading}
          error={test6.error}
          expectedMin={2}
        />
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl mt-8 border-t-4 border-zinc-950 pt-4">
        <p className="font-mono text-[10px] text-zinc-500 text-center">
          ForgeWP Relational Query Engine · All filters run in-memory against mock-data.json · Zero network requests
        </p>
      </footer>
    </div>
  );
}
