import type { Category } from '@/types';
import { categoriesTaxonomy } from '../../cms/products';

export const categories: Category[] = categoriesTaxonomy as unknown as Category[];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getAllCategories(): Category[] {
  return categories;
}
