import { cn } from '@/lib/utils';
import { useWpCurrency } from '@forgewp/woocommerce';
import { formatPrice as fallbackFormatPrice } from '@/data/products';

type PriceProps = {
  price: number;
  compareAtPrice?: number;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function Price({
  price,
  compareAtPrice,
  currency,
  className,
  size = 'md',
}: PriceProps) {
  const { formatPrice } = useWpCurrency();
  const onSale = compareAtPrice != null && compareAtPrice > price;
  const sizeClass =
    size === 'sm'
      ? 'text-sm'
      : size === 'lg'
        ? 'text-lg md:text-xl'
        : 'text-[0.9375rem] md:text-base';

  const formattedPrice = currency
    ? fallbackFormatPrice(price, currency)
    : formatPrice(price);

  const formattedComparePrice = compareAtPrice != null
    ? currency
      ? fallbackFormatPrice(compareAtPrice, currency)
      : formatPrice(compareAtPrice)
    : null;

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', sizeClass, className)}>
      <span
        className={cn(
          'font-heading font-medium tabular-nums',
          onSale ? 'text-sale' : 'text-foreground',
        )}
      >
        {formattedPrice}
      </span>
      {onSale && formattedComparePrice && (
        <span className="text-muted-foreground line-through tabular-nums text-[0.85em]">
          {formattedComparePrice}
        </span>
      )}
    </div>
  );
}
