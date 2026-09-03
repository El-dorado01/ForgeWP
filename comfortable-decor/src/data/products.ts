import type { Product } from '@/types';
import { formatWpPrice } from '@forgewp/woocommerce';
import { products as cmsProducts } from '../../cms/products';
import { categories } from './categories';

export const products: Product[] = cmsProducts as unknown as Product[];

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductById(id: number): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter(
    (p) =>
      p.categorySlug === categorySlug ||
      p.categories?.some(
        (c) => c.toLowerCase().replace(/\s+/g, '-') === categorySlug,
      ),
  );
}

export function getFeaturedProducts(limit = 6): Product[] {
  return products.filter((p) => p.featured).slice(0, limit);
}

export function getNewProducts(limit = 6): Product[] {
  return products.filter((p) => p.isNew || p.badge === 'new').slice(0, limit);
}

export function getSaleProducts(limit = 8): Product[] {
  return products.filter((p) => p.compareAtPrice || p.badge === 'sale').slice(0, limit);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
    .slice(0, limit);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q)),
  );
}

export function formatPrice(amount: number | null | undefined, currency?: string): string {
  return formatWpPrice(amount, currency ? { currencyCode: currency } : undefined);
}

/** Keep category product counts in sync for UI */
export function getCategoryProductCount(slug: string): number {
  return getProductsByCategory(slug).length;
}

export function getCategoriesWithCounts() {
  return categories.map((c) => ({
    ...c,
    productCount: getCategoryProductCount(c.slug),
  }));
}
