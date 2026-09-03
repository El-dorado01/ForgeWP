import { Badge } from '@/components/ui/badge';
import type { ProductBadge as ProductBadgeType } from '@/types';

const labelMap: Record<ProductBadgeType, string> = {
  sale: 'Sale',
  new: 'New',
  featured: 'Featured',
  eco: 'Eco',
  bestseller: 'Bestseller',
};

const variantMap: Record<
  ProductBadgeType,
  'sale' | 'new' | 'featured' | 'eco' | 'bestseller'
> = {
  sale: 'sale',
  new: 'new',
  featured: 'featured',
  eco: 'eco',
  bestseller: 'bestseller',
};

export function ProductBadge({ badge }: { badge?: ProductBadgeType }) {
  if (!badge) return null;
  return <Badge variant={variantMap[badge]}>{labelMap[badge]}</Badge>;
}
