import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="site-main">
      <h1>Page Not Found</h1>
      <p>The page you requested could not be found.</p>
      <p>
        <Link href="/">Return Home</Link>
      </p>
    </main>
  );
}
