import { MainLayout } from "@/components/layouts/MainLayout";

export default function NotFoundPage() {
  return (
    <MainLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6 py-24">
        <p className="text-base font-semibold text-zinc-900">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">Page not found</h1>
        <p className="mt-6 text-base leading-7 text-zinc-600">Sorry, we couldn’t find the page you’re looking for.</p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/"
            className="rounded-md bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Go back home
          </a>
        </div>
      </div>
    </MainLayout>
  );
}
