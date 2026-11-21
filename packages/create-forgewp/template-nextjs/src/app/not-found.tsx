import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="fwp-main">
      <section className="fwp-hero">
        <div className="fwp-hero-copy">
          <h1 className="fwp-headline">
            <span className="fwp-accent">404.</span>
            <br />
            Page not found.
          </h1>
          <p className="fwp-lead">The page you requested could not be found.</p>
          <div className="fwp-actions">
            <Link href="/" className="fwp-button">
              Return home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
