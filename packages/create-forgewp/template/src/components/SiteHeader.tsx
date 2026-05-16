export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          ForgeWP Starter
        </span>
        <nav className="flex gap-6 text-sm text-zinc-600" aria-label="Main">
          <a href="#" className="hover:text-zinc-900">
            Home
          </a>
          <a href="#" className="hover:text-zinc-900">
            Blog
          </a>
        </nav>
      </div>
    </header>
  );
}
