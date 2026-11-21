import Link from 'next/link';
import { BlockArea } from '@forgewp/react';
import { getPageContent } from '@/lib/content';

export default async function AboutPage() {
  const page = await getPageContent('about');

  return (
    <main className="fwp-card">
      <div className="fwp-grid">
        <div>
          <h1 className="fwp-headline">{page.title}</h1>
          <div className="fwp-lead">
            <BlockArea name="about-content" content={page.content} />
          </div>
          <div className="fwp-actions">
            <Link href="/" className="fwp-btn-secondary">
              ← Back to Home
            </Link>
          </div>
        </div>

        <div className="fwp-stack">
          <div className="fwp-tile">
            <div className="fwp-tile-body" style={{ paddingRight: 0 }}>
              <h2 className="fwp-tile-title">Native WordPress Theme</h2>
              <p className="fwp-tile-desc">
                Run <code>pnpm export</code> to compile fixed routes, CSS, Gutenberg
                blocks, and explicit islands into a standalone WordPress theme ZIP.
              </p>
            </div>
          </div>
          <div className="fwp-tile">
            <div className="fwp-tile-body" style={{ paddingRight: 0 }}>
              <h2 className="fwp-tile-title">Decoupled Next.js Mode</h2>
              <p className="fwp-tile-desc">
                Set <code>FORGEWP_DEPLOYMENT_MODE=decoupled</code> and{' '}
                <code>FORGEWP_WP_URL</code> to serve live WordPress REST content
                directly through Next.js.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
