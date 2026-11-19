import { Link } from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import { WpHead } from '@forgewp/react';

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <WpHead title={`${title} — Comfortable Decor`} description={description} />
      <div className="container-wide py-20 md:py-28 text-center max-w-xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Coming next
        </p>
        <h1 className="font-heading text-3xl md:text-4xl font-medium tracking-tight">
          {title}
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          {description ||
            'This page is scaffolded and will be built in the next phase of the storefront.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/shop">Shop</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
