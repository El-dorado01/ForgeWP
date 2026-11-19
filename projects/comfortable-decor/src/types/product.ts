export type ProductVariant = {
  id: string;
  name: string;
  options: ProductVariantOption[];
};

export type ProductVariantOption = {
  id: string;
  label: string;
  value: string;
  /** Optional swatch color hex for color options */
  color?: string;
  /** Optional image URL associated with this color/variant */
  image?: string;
  available?: boolean;
};

export type ProductBadge = 'sale' | 'new' | 'featured' | 'eco' | 'bestseller';

export type ProductType = 'standard' | 'variable' | 'grouped' | 'downloadable' | 'external';

export type GroupedItem = {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  sku?: string;
};

export type DownloadableFile = {
  name: string;
  fileFormat: string;
  fileSize: string;
  version?: string;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  type?: ProductType;
  price: number;
  compareAtPrice?: number;
  currency: string;
  images: string[];
  category: string;
  categorySlug: string;
  categories?: string[];
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  reviews?: Array<{ id: number; author: string; content: string; rating: number; date: string; verified?: boolean }>;
  badge?: ProductBadge;
  description: string;
  shortDescription?: string;
  materials?: string[];
  dimensions?: string | { length?: number | string; width?: number | string; height?: number | string; unit?: string };
  care?: string;
  variants?: ProductVariant[];
  groupedItems?: GroupedItem[];
  downloadableFiles?: DownloadableFile[];
  externalUrl?: string;
  inStock: boolean;
  sku?: string;
  brand?: string;
  featured?: boolean;
  isNew?: boolean;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  productCount?: number;
};

export type Review = {
  id: number;
  productId?: number;
  author: string;
  location?: string;
  date: string;
  rating: number;
  title?: string;
  body: string;
  source?: string;
};
