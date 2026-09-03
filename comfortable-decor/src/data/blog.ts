import type { BlogPost } from '@/types';
import mockData from '../../cms/mock-data';

export const blogPosts: BlogPost[] = ((mockData.post || []) as any[]).map((p) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  content: p.content,
  image: typeof p.featuredImage === 'string' ? p.featuredImage : (p.featuredImage?.url || p.image || ''),
  category: p.category || (p._terms?.category?.[0]?.name || 'Interior Design'),
  categorySlug: p.categorySlug || (p._terms?.category?.[0]?.slug || 'interior-design'),
  author: p.author || 'Comfortable Decor',
  date: p.date ? p.date.split('T')[0] : '2026-05-11',
  readTime: p.readTime || '4 min read',
  featured: Boolean(p.featured),
}));

export function getAllPosts(): BlogPost[] {
  return blogPosts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getFeaturedPosts(limit = 4): BlogPost[] {
  return blogPosts.slice(0, limit);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return blogPosts
    .filter((p) => p.id !== post.id && p.categorySlug === post.categorySlug)
    .slice(0, limit);
}
