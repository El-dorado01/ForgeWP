/**
 * @forgewp/react — WordPress Data Types
 *
 * Minimal TypeScript interfaces for WordPress data shapes.
 * These are used by hooks and components in both dev (mock) and
 * production (compiled PHP) contexts.
 */

export interface WpAttachment {
  id: number;
  url: string;
  alt: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  sizes?: Record<string, { url: string; width: number; height: number }>;
}

export interface WpPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  modified?: string;
  author: string;
  featuredImage: string | WpAttachment;
  permalink?: string;
  customFields?: Record<string, any>;
  __postType?: string;
}

export interface WpMenuItem {
  title: string;
  url: string;
  children?: WpMenuItem[];
}

export type WpMenuLocation = "primary" | "footer" | "sidebar" | string;

export type WpMenuData = Record<WpMenuLocation, WpMenuItem[]>;

export interface WpTaxQuery {
  /** Taxonomy slug, e.g. "category", "post_tag", or a custom taxonomy */
  taxonomy: string;
  /** The field used to look up terms. "slug" (default) or "id" or "name" */
  field?: 'slug' | 'id' | 'name';
  /** One or more term slugs / IDs / names to filter by */
  terms: string | number | (string | number)[];
}

export interface WpMetaQuery {
  /** The meta_key / custom field name */
  key: string;
  /** The value to compare against */
  value?: string | number | boolean;
  /** Comparison operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'EXISTS' | 'NOT EXISTS' */
  compare?: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'EXISTS' | 'NOT EXISTS';
}

export interface WpQueryArgs {
  queryId?: string;
  postType?: string;
  postsPerPage?: number;
  categoryName?: string;
  s?: string;           // Full-text search query
  paged?: number;       // Page number (1-based)
  orderby?: string;
  order?: 'ASC' | 'DESC';
  /** Relational taxonomy/term filter — mirrors WP_Query tax_query */
  taxQuery?: WpTaxQuery[];
  /** Relational meta/custom-field filter — mirrors WP_Query meta_query */
  metaQuery?: WpMetaQuery[];
  /** Meta-query relation between multiple meta conditions */
  metaRelation?: 'AND' | 'OR';
}

export interface WpQueryResults {
  posts: WpPost[];
  loading: boolean;
  error: string | null;
  /** Whether there are more pages beyond the currently loaded data (for load-more/infinite scroll) */
  hasMore: boolean;
  /** Total number of pages for the current query (from X-WP-TotalPages header) */
  totalPages: number;
  /** The currently active page number (1-based) */
  currentPage: number;
  /** Append the next page of results to the existing list (load-more / infinite scroll) */
  loadMore: () => Promise<void>;
  /**
   * Jump directly to a specific page, replacing the current post list.
   * Works for numbered pagination (click "Page 3") or Prev/Next buttons.
   * @param page - 1-based page number to navigate to
   */
  goToPage: (page: number) => void;
  refetch: (newArgs?: WpQueryArgs) => Promise<void>;
}

