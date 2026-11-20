import Link from 'next/link';
import { BlockArea } from '@forgewp/react/server';
import { getPageContent } from '@/lib/content';

export default async function AboutPage() {
  const page = await getPageContent('about');

  return (
    <main className="site-main">
      <section className="hero-shell">
        <div className="hero-eyebrow">
          <span className="hero-dot" />
          <span>Dual-Mode Architecture</span>
        </div>
        <h1 className="hero-title">{page.title}</h1>
        <p className="hero-subtitle">
          One Next.js App Router codebase, one WordPress editorial experience — choose
          native PHP theme hosting or decoupled Next.js deployment at build time.
        </p>
        <div className="hero-actions" style={{ marginBottom: 0 }}>
          <Link href="/" className="btn-secondary">
            ← Back to Home
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <div>
            <p className="section-kicker">Editable Page Content</p>
            <h2 className="section-title">Managed in WordPress Gutenberg</h2>
          </div>
        </div>
        <div className="editorial-card">
          <BlockArea name="about-content" content={page.content} />
        </div>
      </section>

      <section className="section-block">
        <div className="mode-grid">
          <article className="mode-card">
            <span className="feature-badge">Default Mode</span>
            <h3>Native WordPress Theme</h3>
            <p>
              Run <code>pnpm export</code> to compile fixed routes, CSS, Gutenberg
              blocks, and explicit <code>&lt;Hydrate&gt;</code> islands into an
              installable WordPress theme ZIP with no Node server required.
            </p>
          </article>
          <article className="mode-card is-dark">
            <span className="feature-badge">Decoupled Mode</span>
            <h3>Live Next.js App Router Server</h3>
            <p>
              Set <code>FORGEWP_DEPLOYMENT_MODE=decoupled</code> and{' '}
              <code>FORGEWP_WP_URL</code> to serve live WordPress REST content and
              blocks directly through Next.js with instant SPA transitions.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
