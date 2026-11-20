import Link from 'next/link';
import { BlockArea, Hydrate } from '@forgewp/react/server';
import { CounterIsland } from '@/components/CounterIsland';
import { getPageContent } from '@/lib/content';

export default async function HomePage() {
  const page = await getPageContent('home');

  return (
    <main className="site-main">
      <section className="hero-shell">
        <div className="hero-eyebrow">
          <span className="hero-dot" />
          <span>Next.js App Router · WordPress Native &amp; Decoupled</span>
        </div>

        <h1 className="hero-title">{page.title}</h1>
        <p className="hero-subtitle">
          Author pages, layouts, and Gutenberg blocks in ordinary Next.js TypeScript.
          Export a zero-bloat native WordPress theme ZIP or deploy decoupled against
          live WordPress REST from the exact same codebase.
        </p>

        <div className="hero-actions">
          <Link href="/about" className="btn-primary">
            Explore Architecture →
          </Link>
          <a href="#island" className="btn-secondary">
            Try Hydration Island
          </a>
        </div>

        <div className="cli-bar">
          <div className="cli-bar-items">
            <span className="cli-cmd">
              <span className="cli-prompt">$</span>
              <span>pnpm dev</span>
            </span>
            <span className="cli-cmd">
              <span className="cli-prompt">$</span>
              <span>pnpm export</span>
            </span>
            <span className="cli-cmd">
              <span className="cli-prompt">$</span>
              <span>pnpm forgewp doctor</span>
            </span>
          </div>
          <span className="cli-meta">adapter: nextjs</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <div>
            <p className="section-kicker">WordPress Editorial Slot</p>
            <h2 className="section-title">Live Gutenberg Content</h2>
          </div>
        </div>
        <div className="editorial-card">
          <BlockArea name="home-content" content={page.content} />
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <div>
            <p className="section-kicker">Core Capabilities</p>
            <h2 className="section-title">Built for Production WordPress</h2>
          </div>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-badge">Native Export</span>
            <h3>Zero Next.js Runtime in WordPress</h3>
            <p>
              Fixed routes compile to clean PHP templates with live permalink resolution
              so wp-admin slug renames work without rebuilding.
            </p>
          </article>
          <article className="feature-card">
            <span className="feature-badge">Gutenberg</span>
            <h3>Typed Blocks &amp; Inline Editing</h3>
            <p>
              Author blocks once with <code>defineBlock</code> and{' '}
              <code>WpEditable</code> in <code>src/blocks/</code> and edit inline inside
              the WordPress Block Editor.
            </p>
          </article>
          <article className="feature-card">
            <span className="feature-badge">Islands</span>
            <h3>Selective Client Hydration</h3>
            <p>
              Wrap interactive <code>&apos;use client&apos;</code> widgets in{' '}
              <code>&lt;Hydrate&gt;</code> to ship tiny standalone esbuild bundles only
              where visitors need interactivity.
            </p>
          </article>
        </div>
      </section>

      <section id="island" className="section-block">
        <div className="section-header">
          <div>
            <p className="section-kicker">Selective Hydration Demo</p>
            <h2 className="section-title">Interactive Client Island</h2>
          </div>
        </div>
        <Hydrate id="counter-island" trigger="visible">
          <CounterIsland initialCount={1} />
        </Hydrate>
      </section>
    </main>
  );
}
