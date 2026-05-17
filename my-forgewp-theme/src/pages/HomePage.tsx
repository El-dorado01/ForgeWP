import NotFoundPage from "@/components/ui/404";

export function HomePage() {
  return <NotFoundPage />;
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-medium text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
    </article>
  );
}
