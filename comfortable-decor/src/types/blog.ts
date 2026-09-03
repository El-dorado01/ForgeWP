export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  categorySlug: string;
  author: string;
  date: string;
  readTime: string;
  featured?: boolean;
};
