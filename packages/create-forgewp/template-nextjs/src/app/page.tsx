import { BlockArea } from '@forgewp/react';
import { ArrowUpRightIcon, GithubIcon } from '@/components/BrandLogos';
import { WaveLines } from '@/components/WaveLines';
import { getPageContent } from '@/lib/content';

export default async function HomePage() {
  const page = await getPageContent('home');

  return (
    <main className="fwp-main">
      <WaveLines className="forgewp-wave fwp-wave" />

      <section className="fwp-hero">
        <div className="fwp-hero-copy">
          <h1 className="fwp-headline">
            Next.js structure.
            <br />
            React speed.
            <br />
            <span className="fwp-accent">WordPress power.</span>
          </h1>

          {/* Editable in WordPress: this paragraph is the page's saved content. */}
          <div className="fwp-lead">
            <BlockArea name="home-content" content={page.content} />
          </div>

          {/* CTAs match the forgewp.dev landing hero: tinted brand button + text link */}
          <div className="fwp-actions">
            <a
              href="https://forgewp.dev/docs"
              target="_blank"
              rel="noreferrer"
              className="fwp-button"
            >
              Read the docs
            </a>
            <a
              href="https://github.com/El-dorado01/ForgeWP"
              target="_blank"
              rel="noreferrer"
              className="fwp-text-link"
            >
              <GithubIcon />
              View on GitHub
              <ArrowUpRightIcon />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
