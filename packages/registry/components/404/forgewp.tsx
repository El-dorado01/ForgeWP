export function NotFoundPage() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center overflow-hidden">
      {/* Aesthetic grid decoration using Tailwind 4 utility */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white [background-image:linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [background-size:40px_40px]"></div>

      <div className="relative border-4 border-zinc-900 bg-white p-8 sm:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Error 404
        </span>
        <h1 className="mt-4 text-6xl font-black tracking-tighter text-zinc-900 sm:text-8xl">
          LOST?
        </h1>
        <p className="mx-auto mt-6 max-w-md text-sm sm:text-lg leading-relaxed text-zinc-600">
          The page you are looking for has been moved, deleted, or never existed in the first place.
        </p>
        <div className="mt-10">
          <a
            href="#"
            className="inline-flex h-14 items-center justify-center border-2 border-zinc-900 bg-zinc-900 px-8 text-sm font-bold text-white transition-all hover:bg-white hover:text-zinc-900 active:translate-x-1 active:translate-y-1"
          >
            BACK TO HOME
          </a>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
