/**
 * 404 — Not Found Page
 *
 * This template is intentionally standalone — it does NOT import MainLayout.
 * The ForgeWP compiler wraps this in WordPress's get_header() / get_footer()
 * automatically via 404.php, so your site header and footer still appear.
 *
 * You can safely style this page without worrying about layout dependencies.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
        404
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-6 max-w-md text-base leading-7 text-zinc-500">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It may
        have been moved, deleted, or never existed.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <a
          href="/"
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Go back home
        </a>
        <a
          href="#"
          className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          Contact support →
        </a>
      </div>
    </div>
  );
}
