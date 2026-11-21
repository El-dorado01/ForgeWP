import Link from 'next/link';
import { BlockArea, Hydrate } from '@forgewp/react';
import { CounterIsland } from '@/components/CounterIsland';
import { getPageContent } from '@/lib/content';

export default async function HomePage() {
  const page = await getPageContent('home');

  return (
    <main className="fwp-card">
      <div className="fwp-grid">
        <div>
          <h1 className="fwp-headline">
            Next.js Structure.
            <br />
            React Speed.
            <br />
            WordPress Power.
          </h1>

          <div className="fwp-lead">
            <BlockArea name="home-content" content={page.content} />
          </div>

          <div className="fwp-actions">
            <a
              href="https://forgewp.dev/docs"
              target="_blank"
              rel="noreferrer"
              className="fwp-btn-primary"
            >
              <span>Read Framework Docs</span>
            </a>
            <a
              href="https://github.com/El-dorado01/ForgeWP"
              target="_blank"
              rel="noreferrer"
              className="fwp-btn-secondary"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <div className="fwp-stack">
          <Link href="/about" className="fwp-tile">
            <span className="fwp-tile-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </span>
            <div className="fwp-tile-body">
              <h2 className="fwp-tile-title">{page.title}</h2>
              <p className="fwp-tile-desc">
                Inspect native WordPress theme export alongside decoupled Next.js mode
                using the same App Router codebase.
              </p>
            </div>
            <span className="fwp-tile-arrow" aria-hidden="true">→</span>
          </Link>

          <Hydrate id="counter-island" trigger="visible">
            <CounterIsland initialCount={1} />
          </Hydrate>
        </div>
      </div>
    </main>
  );
}
