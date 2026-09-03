import { Link } from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import { WpImage } from '@forgewp/react';

export function EditorialBanner() {
  return (
    <section className="py-4 md:py-8">
      <div className="container-wide">
        <div className="relative min-h-[320px] md:min-h-[400px] overflow-hidden bg-ink flex items-center">
          <WpImage
            src="https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1600&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="relative z-10 p-8 md:p-14 max-w-lg text-cream">
            <h2 className="font-heading text-3xl md:text-4xl font-medium leading-tight">
              Create your
              <br />
              perfect space
            </h2>
            <p className="mt-4 text-sm text-cream/80 leading-relaxed">
              Choose from considered models, materials, and colours to configure
              a home that feels entirely yours.
            </p>
            <Button
              asChild
              className="mt-8 bg-cream text-ink hover:bg-white"
              size="lg"
            >
              <Link href="/shop">Start exploring</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
