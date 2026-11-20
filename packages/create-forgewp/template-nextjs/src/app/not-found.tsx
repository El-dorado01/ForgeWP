import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="site-main">
      <section className="not-found-card">
        <p className="not-found-code">404</p>
        <h1 className="section-title" style={{ marginBottom: '0.5rem' }}>
          Page Not Found
        </h1>
        <p className="hero-subtitle" style={{ margin: '0 auto 1.5rem' }}>
          The route you requested does not exist in this ForgeWP Next.js theme.
        </p>
        <Link href="/" className="btn-primary">
          ← Return Home
        </Link>
      </section>
    </main>
  );
}
