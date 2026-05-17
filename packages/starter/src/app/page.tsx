import { Badge } from "@/components/Badge";
import { MainLayout } from "@/components/layouts/MainLayout";
import { WpLoop, useWpTitle, useWpExcerpt, useWpPermalink } from "@/lib/wordpress";
import { Helmet } from "react-helmet-async";

export default function HomePage() {
  return (
    <MainLayout>
      <Helmet>
        <title>__FORGEWP_THE_TITLE__</title>
      </Helmet>
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Badge>ForgeWP Data Hooks</Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900">
          Native WordPress loops, built in React.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          Below is a grid powered by `WpLoop`. Locally, it renders dummy posts so you can design your cards. When exported, the compiler converts this into a true `while(have_posts())` PHP loop.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <WpLoop>
            <PostCard />
          </WpLoop>
        </div>
      </section>
    </MainLayout>
  );
}

function PostCard() {
  const title = useWpTitle();
  const excerpt = useWpExcerpt();
  const link = useWpPermalink();

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h2 className="text-xl font-bold text-zinc-900 mb-2" dangerouslySetInnerHTML={{ __html: title }} />
      <div className="text-sm leading-relaxed text-zinc-600 mb-6" dangerouslySetInnerHTML={{ __html: excerpt }} />
      <a href={link} className="inline-flex items-center text-sm font-semibold text-zinc-900 hover:underline">
        Read Article &rarr;
      </a>
    </article>
  );
}
