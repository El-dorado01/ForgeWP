import type { Product } from '@/types';
import { ProductCard } from '@/components/product/product-card';
import { cn } from '@/lib/utils';

type ProductGridProps = {
  products: Product[];
  className?: string;
  columns?: 2 | 3 | 4;
};

export function ProductGrid({
  products,
  className,
  columns = 4,
}: ProductGridProps) {
  const colClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-heading text-lg">No products found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try adjusting your filters or browse the full shop.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12', colClass, className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
