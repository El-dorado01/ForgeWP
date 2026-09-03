import type { Review } from '@/types';
import mockData from '../../cms/mock-data';

export const reviews: Review[] = ((mockData.review || []) as any[]) as Review[];

export function getAllReviews(): Review[] {
  return reviews;
}

export function getHomepageReviews(limit = 3): Review[] {
  return reviews.slice(0, limit);
}

export function getProductReviews(productId: number): Review[] {
  return reviews.filter((r) => r.productId === productId);
}
