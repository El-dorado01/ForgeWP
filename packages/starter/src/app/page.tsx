import { Badge } from "@/components/Badge";
import { MainLayout } from "./layout";

export default function HomePage() {
  return (
    <MainLayout>
      <section className="mx-auto max-w-3xl px-6 py-16">
        <Badge>ForgeWP</Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900">
          Build WordPress themes like modern web apps
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          This starter runs on Vite, React, TypeScript, and Tailwind. The theme
          compiler will export this project as a native WordPress theme in a later
          step.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <FeatureCard
            title="React authoring"
            description="Components, pages, and layouts in a familiar frontend stack."
          />
          <FeatureCard
            title="WordPress output"
            description="Compiled PHP templates and assets — installable on any host."
          />
        </div>
      </section>
    </MainLayout>
  );
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
