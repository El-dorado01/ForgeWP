import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="fwp-card" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div>
        <h1 className="fwp-headline" style={{ color: 'var(--primary)' }}>
          404
        </h1>
        <p className="fwp-lead" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
          The page you requested could not be found.
        </p>
        <div className="fwp-actions" style={{ justifyContent: 'center' }}>
          <Link href="/" className="fwp-btn-primary">
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
