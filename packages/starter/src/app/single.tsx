import { MainLayout } from "@/components/layouts/MainLayout";
import { useWpTitle, useWpContent } from "@/lib/wordpress";

export default function SinglePage() {
  const title = useWpTitle();
  const content = useWpContent();
  const homeLink = "/"; // local dev home link

  return (
    <MainLayout>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-8">
          <a href={homeLink} className="text-sm font-medium text-zinc-500 hover:text-zinc-800 hover:underline">
            &larr; Back to all posts
          </a>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl" dangerouslySetInnerHTML={{ __html: title }} />
          <div className="mt-4 text-sm text-zinc-500">
            Published in WordPress
          </div>
        </header>

        <div className="prose max-w-none text-zinc-700 leading-relaxed space-y-6" dangerouslySetInnerHTML={{ __html: content }} />
      </article>
    </MainLayout>
  );
}
