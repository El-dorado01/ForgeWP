/**
 * @forgewp/react — WordPress Data Types
 *
 * Minimal TypeScript interfaces for WordPress data shapes.
 * These are used by hooks and components in both dev (mock) and
 * production (compiled PHP) contexts.
 */

export interface WpPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  featuredImage: string;
  permalink?: string;
  customFields?: Record<string, string | number | boolean>;
  __postType?: string;
}

export interface WpMenuItem {
  title: string;
  url: string;
  children?: WpMenuItem[];
}

export type WpMenuLocation = "primary" | "footer" | "sidebar" | string;

export type WpMenuData = Record<WpMenuLocation, WpMenuItem[]>;
