import React from "react";
import { WpPostContext } from "@forgewp/react";

export const IS_DEV =
  typeof import.meta !== 'undefined' &&
  // @ts-ignore
  (import.meta as any).env?.DEV === true;

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as any).FORGEWP_API_URL) {
    return (window as any).FORGEWP_API_URL;
  }
  try {
    const viteUrl = (import.meta as any).env?.VITE_WP_API_URL;
    if (viteUrl) return viteUrl;
  } catch (e) {}
  try {
    if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env) {
      const nextUrl = (globalThis as any).process.env.NEXT_PUBLIC_WP_API_URL || (globalThis as any).process.env.WP_API_URL;
      if (nextUrl) return nextUrl;
    }
  } catch (e) {}
  if (typeof window !== 'undefined') {
    const homeUrl = (window as any).forgeWpHydration?.siteSettings?.options?.home;
    if (homeUrl) {
      try {
        return new URL(homeUrl).pathname.replace(/\/$/, '');
      } catch (e) {}
    }
  }
  return '';
}

export type ProductType = "simple" | "variable" | "grouped" | "external";

export interface ProductDimensions {
  /** Length of the product (in store unit, e.g. cm or in) */
  length: number | string;
  /** Width of the product (in store unit, e.g. cm or in) */
  width: number | string;
  /** Height of the product (in store unit, e.g. cm or in) */
  height: number | string;
  /** Optional measurement unit */
  unit?: "cm" | "in" | "m" | "mm";
}

export interface ProductVariation {
  id: number;
  /** Attribute key-value pairs selecting this variation, e.g. `{ color: "Charcoal", size: "Large" }` */
  attributes: Record<string, string>;
  /** Variation sale or active price */
  price: string | number;
  /** Variation regular / original price */
  regular_price?: string | number;
  /** Variation sale price */
  sale_price?: string | number;
  /** Stock inventory status */
  stock_status: "instock" | "outofstock" | "onbackorder";
  /** Stock quantity available */
  stock_quantity?: number | null;
  /** SKU for this specific variation */
  sku?: string;
  /** Swatch image for this variation */
  image?: { id?: number; url: string; alt?: string } | string;
  [key: string]: any;
}

export interface ProductAttributeOption {
  id?: string;
  label?: string;
  value: string;
  color?: string;
  image?: string;
  [key: string]: any;
}

export interface ProductAttribute {
  /** Attribute taxonomy or display name (e.g. "Color", "Finish", "Size") */
  name: string;
  /** Available options or values */
  options: string[] | ProductAttributeOption[];
  /** Whether this attribute is used for product variations */
  variation?: boolean;
}

export interface ProductDownload {
  id?: string;
  name: string;
  file_url: string;
}

export interface ProductReview {
  id: number;
  author: string;
  content: string;
  rating: number;
  date: string;
  email?: string;
  verified?: boolean;
}

/**
 * Standard WooCommerce Product Data Contract.
 * Covers all native WooCommerce product tabs and properties.
 */
export interface WooCommerceProduct {
  /** Unique product ID */
  id: number;
  /** URL-friendly post slug */
  slug?: string;
  /** WooCommerce product type */
  type?: ProductType;
  /** Product display name (matches post_title) */
  name?: string;
  /** Product title alias (for compatibility with WP Post schema) */
  title?: string;
  /** Short summary / product excerpt displayed near price */
  shortDescription?: string;
  /** Alias for shortDescription */
  excerpt?: string;
  /** Full editorial description / post content */
  description?: string;
  /** Alias for description */
  content?: string;

  // --- Pricing & General ---
  /** Active price (sale price if on sale, otherwise regular price) */
  price: string | number;
  /** Regular price before discounts */
  regular_price?: string | number;
  /** Sale price during discount periods */
  sale_price?: string | number;
  /** Whether the product is currently on sale */
  on_sale?: boolean;
  /** Sale start date (ISO 8601 string) */
  date_on_sale_from?: string;
  /** Sale end date (ISO 8601 string) */
  date_on_sale_to?: string;

  // --- Inventory & Stock ---
  /** Stock Keeping Unit */
  sku?: string;
  /** Whether stock management is enabled at product level */
  manage_stock?: boolean;
  /** Exact numerical stock quantity available */
  stock_quantity?: number | null;
  /** General stock status */
  stock_status?: "instock" | "outofstock" | "onbackorder";
  /** Limit purchases to 1 item per order */
  sold_individually?: boolean;

  // --- Shipping & Dimensions ---
  /** Physical weight (e.g. in kg or lbs) */
  weight?: number | string;
  /** Physical dimensions (length, width, height) or display string */
  dimensions?: ProductDimensions | string;
  /** WooCommerce shipping class slug */
  shipping_class?: string;

  // --- Media & Visuals ---
  /** Featured product main image URL */
  featuredImage?: string;
  /** Image gallery URLs or image objects */
  images?: Array<string | { id?: number; url: string; alt?: string }>;
  /** Optional badge label (e.g. "Featured", "New", "Bestseller") */
  badge?: string;

  // --- Attributes & Variations ---
  /** Configured product attributes (e.g. Finish, Size, Color) */
  attributes?: ProductAttribute[];
  /** Pre-configured variations for variable products */
  variations?: ProductVariation[];
  /** Alias for attributes in starter themes */
  variants?: any[];

  // --- Grouped & External Products ---
  /** Child product IDs for Grouped products */
  grouped_products?: number[];
  /** External affiliate target URL */
  external_url?: string;
  /** Custom call-to-action button text for external products */
  button_text?: string;

  // --- Virtual & Downloadable Products ---
  /** Virtual product flag (no physical shipping required) */
  virtual?: boolean;
  /** Downloadable digital product flag */
  downloadable?: boolean;
  /** Downloadable file links delivered upon purchase */
  downloads?: ProductDownload[];

  // --- Taxonomies ---
  /** Product department categories */
  categories?: string[] | Array<{ id: number; slug: string; name: string }>;
  /** Primary category name */
  category?: string;
  /** Primary category slug */
  categorySlug?: string;
  /** Search and filtering tags */
  tags?: string[] | Array<{ id: number; slug: string; name: string }>;
  /** Brand name or taxonomy */
  brand?: string;

  // --- Linked Products ---
  /** Upsell product recommendation IDs */
  upsell_ids?: number[];
  /** Cross-sell product recommendation IDs (shown in cart) */
  cross_sell_ids?: number[];

  // --- Reviews & Social Proof ---
  /** Average verified review score (e.g. 4.9) */
  average_rating?: string | number;
  /** Total verified customer reviews count */
  rating_count?: number;
  /** Review score alias */
  rating?: number;
  /** Review count alias */
  reviewCount?: number;
  /** Customer review feedback entries */
  reviews?: ProductReview[];

  // --- WordPress Taxonomy Terms Hydration ---
  _terms?: {
    product_cat?: Array<{ id: number; slug: string; name: string }>;
    product_tag?: Array<{ id: number; slug: string; name: string }>;
    [taxonomy: string]: Array<{ id: number; slug: string; name: string }> | undefined;
  };

  /** Custom metadata fields */
  meta?: Record<string, any>;
  [key: string]: any;
}

/**
 * Type-safe helper for declaring WooCommerce product catalog seeds in `cms/products.ts`.
 * Provides full IDE autocomplete, JSDoc tooltips, and compile-time validation for all
 * standard WooCommerce product fields (prices, stock, dimensions, variations, downloads).
 *
 * @example
 * ```ts
 * // cms/products.ts
 * import { defineProducts } from '@forgewp/woocommerce';
 *
 * export const products = defineProducts([
 *   {
 *     id: 1,
 *     name: "About A Chair AA51",
 *     slug: "about-a-chair-aa51",
 *     type: "simple",
 *     price: 276,
 *     stock_status: "instock",
 *     dimensions: { length: 59, width: 52, height: 79, unit: "cm" },
 *     weight: 4.8,
 *     sku: "AAC-AA51-OAK",
 *   }
 * ]);
 * ```
 */
export function defineProducts(products: WooCommerceProduct[]): WooCommerceProduct[] {
  return products;
}

/**
 * Type-safe helper for declaring a single WooCommerce product.
 */
export function defineProduct(product: WooCommerceProduct): WooCommerceProduct {
  return product;
}

export interface UseWpProductsParams {
  category?: string;
  tag?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  perPage?: number;
  sortBy?: string;
}

export function useWpProducts(params?: UseWpProductsParams): {
  products: WooCommerceProduct[];
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  page: number;
  refetch: () => Promise<void>;
} {
  const [products, setProducts] = React.useState<WooCommerceProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [page, setPage] = React.useState(1);

  const fetchProducts = React.useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!IS_DEV) {
      try {
        setLoading(true);
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.tag) searchParams.set('tag', params.tag);
        if (params?.minPrice !== undefined) searchParams.set('min_price', String(params.minPrice));
        if (params?.maxPrice !== undefined) searchParams.set('max_price', String(params.maxPrice));
        if (params?.sortBy) searchParams.set('orderby', params.sortBy);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.perPage) searchParams.set('per_page', String(params.perPage));

        const queryStr = searchParams.toString();
        const url = `${getApiBaseUrl()}/wp-json/forgewp/v1/products${queryStr ? '?' + queryStr : ''}`;
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.products && Array.isArray(data.products)) {
            setProducts(data.products);
            setTotal(data.total || data.products.length);
            setTotalPages(data.totalPages || 1);
            setPage(data.page || 1);
            setLoading(false);
            return;
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to fetch products');
      }
    }

    const mockProds = window._forgeWpMockPosts?.["product"] || [];
    setProducts(mockProds);
    setTotal(mockProds.length);
    setTotalPages(1);
    setPage(1);
    setLoading(false);
  }, [
    params?.search,
    params?.category,
    params?.tag,
    params?.minPrice,
    params?.maxPrice,
    params?.sortBy,
    params?.page,
    params?.perPage,
  ]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, total, totalPages, page, refetch: fetchProducts };
}

export function useWpProduct(productId: number | string): { product: WooCommerceProduct | null; loading: boolean; error: string | null } {
  const { products, loading } = useWpProducts();
  
  const product = React.useMemo(() => {
    if (typeof productId === "number") {
      return products.find((p) => p.id === productId) || null;
    }
    return products.find((p) => p.sku === productId) || null;
  }, [products, productId]);

  return { product, loading, error: null };
}

export interface WpProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  meta?: Record<string, any>;
}

export interface WpProductTag {
  id: number;
  name: string;
  slug: string;
  count?: number;
  meta?: Record<string, any>;
}

export function useWpProductCategories(): WpProductCategory[] {
  const [categories, setCategories] = React.useState<WpProductCategory[]>([]);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const mockCats = window._forgeWpMockPosts?.["_taxonomy_product_cat"] || [];
      setCategories(mockCats);
    }
  }, []);
  return categories;
}

export function useWpProductTags(): WpProductTag[] {
  const [tags, setTags] = React.useState<WpProductTag[]>([]);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const mockTags = window._forgeWpMockPosts?.["_taxonomy_product_tag"] || [];
      setTags(mockTags);
    }
  }, []);
  return tags;
}

// ── 1. Shopping Cart Context & Hook ──────────────────────────────────────────

export interface CartItem {
  key: string;
  id: number;
  quantity: number;
  variation?: Record<string, string>;
  title: string;
  price: string;
  regular_price?: string;
  featuredImage: string;
  line_subtotal: string;
}

export interface CartTotals {
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  total: string;
}

export interface CartState {
  items: CartItem[];
  totals: CartTotals;
  coupons: string[];
  shippingAddress: {
    country: string;
    city: string;
    postcode: string;
  };
  shippingMethod: string;
}

let storeApiNonce =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage.getItem("forgewp-store-nonce") || ""
    : "";

export async function fetchStoreApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${getApiBaseUrl()}/wp-json/wc/store/v1/${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (storeApiNonce) {
    headers.set("Nonce", storeApiNonce);
  }
  headers.set("Content-Type", "application/json");

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("forgewp_jwt_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const nextNonce = response.headers.get("Nonce");
  if (nextNonce) {
    storeApiNonce = nextNonce;
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      window.localStorage.setItem("forgewp-store-nonce", nextNonce);
    }
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch (e) {}
    throw new Error(errorData?.message || `Store API request failed with status ${response.status}`);
  }

  return response.json();
}

export function mapStoreApiToCartState(storeCart: any): CartState {
  const precision = storeCart.totals?.currency_minor_unit ?? 2;
  const parseAmount = (val: string | number) => {
    const num = typeof val === "number" ? val : parseInt(String(val || "0"), 10);
    return (num / Math.pow(10, precision)).toFixed(precision);
  };

  const items = (storeCart.items || []).map((item: any) => {
    let featuredImage = "https://picsum.photos/seed/placeholder/300/300";
    if (item.images && item.images.length > 0) {
      featuredImage = item.images[0].thumbnail || item.images[0].src || featuredImage;
    }
    
    const priceStr = parseAmount(item.prices?.price || 0);
    const regularPriceStr = item.prices?.regular_price ? parseAmount(item.prices.regular_price) : undefined;
    const lineSubtotalStr = parseAmount(item.totals?.line_subtotal || 0);

    const variation: Record<string, string> = {};
    if (Array.isArray(item.variation)) {
      item.variation.forEach((v: any) => {
        if (v.attribute && v.value) {
          const name = v.attribute.replace(/^attribute_/, "");
          variation[name] = v.value;
        }
      });
    }

    return {
      key: item.key,
      id: item.id,
      quantity: item.quantity,
      variation,
      title: item.name,
      price: priceStr,
      regular_price: regularPriceStr,
      featuredImage,
      line_subtotal: lineSubtotalStr
    };
  });

  const totals = {
    subtotal: parseAmount(storeCart.totals?.total_items || 0),
    discount: parseAmount(storeCart.totals?.total_discount || 0),
    shipping: parseAmount(storeCart.totals?.total_shipping || 0),
    tax: parseAmount(storeCart.totals?.total_tax || 0),
    total: parseAmount(storeCart.totals?.total_price || 0)
  };

  const coupons = (storeCart.coupons || []).map((c: any) => c.code.toUpperCase());

  const shippingAddress = {
    country: storeCart.shipping_address?.country || "US",
    city: storeCart.shipping_address?.city || "",
    postcode: storeCart.shipping_address?.postcode || ""
  };

  let shippingMethod = "flat_rate";
  if (storeCart.shipping_rates && storeCart.shipping_rates.length > 0) {
    const pkg = storeCart.shipping_rates[0];
    const selected = pkg.shipping_rates?.find((r: any) => r.selected);
    if (selected) {
      shippingMethod = selected.rate_id;
    }
  }

  return {
    items,
    totals,
    coupons,
    shippingAddress,
    shippingMethod
  };
}

export interface WpCartLineItem {
  id: string;
  key?: string;
  productId: number;
  variationId?: number;
  slug?: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  quantity: number;
  variantLabel?: string;
  variation?: Record<string, string>;
  lineSubtotal?: number;
}

export interface WpCartState {
  items: WpCartLineItem[];
  itemCount: number;
  subtotal: number;
  totals: {
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
  };
  coupons: string[];
  currency: string;
  shippingAddress?: {
    country: string;
    city: string;
    postcode: string;
  };
  shippingMethod?: string;
}

export type WpCartContextType = {
  cart: WpCartState;
  items: WpCartLineItem[];
  itemCount: number;
  subtotal: number;
  cartTotal: string;
  totals: WpCartState['totals'];
  coupons: string[];
  currency: string;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: any, quantity?: number, variantLabel?: string | Record<string, string>) => Promise<boolean>;
  addToCart: (productId: number, quantity?: number, variation?: Record<string, string>) => Promise<void>;
  addToCartBatch: (items: Array<{ productId: number; quantity: number; variation?: Record<string, string> }>) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<boolean>;
  removeItem: (lineId: string) => Promise<boolean>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: (code: string) => Promise<void>;
  calculateShipping: (address: { country: string; city: string; postcode: string }) => Promise<void>;
  setShippingMethod: (methodId: string) => void;
  refreshCart: () => Promise<void>;
  isLoading: boolean;
};

// Global Cross-Island Cart Store
function getInitialCartState(): WpCartState {
  if (typeof window !== 'undefined') {
    try {
      const savedState = localStorage.getItem('forgewp_cart_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed && Array.isArray(parsed.items)) {
          return parsed;
        }
      }
      const savedItems = localStorage.getItem('forgewp_cart_items');
      if (savedItems) {
        const parsed = JSON.parse(savedItems);
        if (Array.isArray(parsed)) {
          const subtotal = parsed.reduce((sum: number, i: any) => sum + (Number(i.price) || 0) * (i.quantity || 1), 0);
          return {
            items: parsed,
            itemCount: parsed.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
            subtotal,
            totals: {
              subtotal: subtotal.toFixed(2),
              discount: '0.00',
              shipping: '0.00',
              tax: '0.00',
              total: subtotal.toFixed(2),
            },
            coupons: [],
            currency: '$',
            shippingMethod: 'flat_rate',
          };
        }
      }
    } catch (e) {}
  }
  return {
    items: [],
    itemCount: 0,
    subtotal: 0,
    totals: {
      subtotal: '0.00',
      discount: '0.00',
      shipping: '0.00',
      tax: '0.00',
      total: '0.00',
    },
    coupons: [],
    currency: '$',
    shippingMethod: 'flat_rate',
  };
}

let globalCartState: WpCartState = getInitialCartState();
let globalCartIsOpen = false;
let globalCartLoading = false;
const globalCartListeners = new Set<() => void>();

function notifyCartListeners() {
  globalCartListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {}
  });
}

function isPlaceholderImage(img?: string): boolean {
  if (!img) return true;
  return (
    img.includes('woocommerce-placeholder') ||
    img.includes('image-fallback') ||
    img.includes('placeholder')
  );
}

function saveLocalCart(state: WpCartState) {
  const mergedItems = (state.items || []).map((item) => {
    if (!isPlaceholderImage(item.image)) {
      return item;
    }
    const existing = globalCartState.items.find(
      (l) => l.id === item.id || l.key === item.key || (item.slug && l.slug === item.slug) || (item.productId && l.productId === item.productId)
    );
    if (existing?.image && !isPlaceholderImage(existing.image)) {
      return { ...item, image: existing.image };
    }
    return item;
  });

  const cleanState: WpCartState = {
    ...state,
    items: mergedItems,
  };

  globalCartState = cleanState;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('forgewp_cart_items', JSON.stringify(cleanState.items));
      localStorage.setItem('forgewp_cart_state', JSON.stringify(cleanState));
    } catch {}
  }
  notifyCartListeners();
}

async function fetchForgeWpCart(action: string = '', body?: any): Promise<WpCartState | null> {
  if (typeof window === 'undefined') return null;
  const baseUrl = getApiBaseUrl();
  const endpoint = action ? `/wp-json/forgewp/v1/cart/${action}` : '/wp-json/forgewp/v1/cart';
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if ((window as any).forgeWpHydration?.restNonce) {
    headers['X-WP-Nonce'] = (window as any).forgeWpHydration.restNonce;
  }
  const token = window.localStorage.getItem('forgewp_jwt_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (data && Array.isArray(data.items)) {
    return data as WpCartState;
  }
  return null;
}

let globalInitialSyncPromise: Promise<void> | null = null;

export const WpCartContext = React.createContext<WpCartContextType | null>(null);

export function useWpCart(): WpCartContextType {
  const context = React.useContext(WpCartContext);
  const [state, setState] = React.useState<WpCartState>(() => {
    if (globalCartState.items.length > 0) return globalCartState;
    const initial = getInitialCartState();
    if (initial.items.length > 0) {
      globalCartState = initial;
      return initial;
    }
    return globalCartState;
  });
  const [isOpen, setIsOpen] = React.useState(() => globalCartIsOpen);
  const [isLoading, setIsLoading] = React.useState(() => globalCartLoading);

  React.useEffect(() => {
    // 1. Initial local state hydration from storage
    const latestLocal = getInitialCartState();
    if (latestLocal.items.length > 0 && globalCartState.items.length === 0) {
      globalCartState = latestLocal;
      setState(latestLocal);
      notifyCartListeners();
    }

    // 2. Fetch live cart from WooCommerce Database via REST (deduplicated across all islands on the page)
    if (!IS_DEV) {
      if (!globalInitialSyncPromise) {
        globalInitialSyncPromise = (async () => {
          try {
            const serverCart = await fetchForgeWpCart();
            if (serverCart && Array.isArray(serverCart.items) && serverCart.items.length > 0) {
              saveLocalCart(serverCart);
            } else if (globalCartState.items.length > 0) {
              const synced = await fetchForgeWpCart('sync', {
                items: globalCartState.items.map((i) => ({
                  productId: i.productId,
                  id: i.productId,
                  slug: i.slug,
                  name: i.name,
                  price: i.price,
                  image: i.image,
                  quantity: i.quantity,
                  variation: i.variation,
                  variantLabel: i.variantLabel,
                })),
              });
              if (synced && synced.items && synced.items.length > 0) {
                saveLocalCart(synced);
              }
            }
          } catch (e) {
          } finally {
            setIsLoading(false);
            notifyCartListeners();
          }
        })();
      }
    }

    const handleSync = () => {
      setState({ ...globalCartState });
      setIsOpen(globalCartIsOpen);
      setIsLoading(globalCartLoading);
    };

    globalCartListeners.add(handleSync);
    return () => {
      globalCartListeners.delete(handleSync);
    };
  }, []);

  const refreshCart = React.useCallback(async () => {
    if (typeof window === 'undefined' || IS_DEV) return;
    globalCartLoading = true;
    setIsLoading(true);
    notifyCartListeners();
    try {
      const serverCart = await fetchForgeWpCart();
      if (serverCart) {
        saveLocalCart(serverCart);
      }
    } catch (e) {
    } finally {
      globalCartLoading = false;
      setIsLoading(false);
      notifyCartListeners();
    }
  }, []);

  const openCart = React.useCallback(() => {
    globalCartIsOpen = true;
    setIsOpen(true);
    notifyCartListeners();
  }, []);

  const closeCart = React.useCallback(() => {
    globalCartIsOpen = false;
    setIsOpen(false);
    notifyCartListeners();
  }, []);

  const toggleCart = React.useCallback(() => {
    globalCartIsOpen = !globalCartIsOpen;
    setIsOpen(globalCartIsOpen);
    notifyCartListeners();
  }, []);

  const addItem = React.useCallback(
    async (product: any, quantity = 1, variantLabelOrVariation?: string | Record<string, string>) => {
      const prodId = typeof product === 'number' ? product : (product?.id || 0);
      const prodName = typeof product === 'object' ? (product.name || product.title || 'Product') : 'Product';
      const prodPrice = typeof product === 'object' ? Number(product.price || 0) : 0;
      const prodImage = typeof product === 'object' ? (Array.isArray(product.images) ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.src || product.images[0]?.url) : product.featuredImage || product.image || '') : '';
      const prodSlug = typeof product === 'object' ? product.slug || '' : '';
      const variantLabel = typeof variantLabelOrVariation === 'string' ? variantLabelOrVariation : '';
      const variation = typeof variantLabelOrVariation === 'object' ? variantLabelOrVariation : undefined;

      const lineKey = `${prodId}::${variantLabel || (variation ? JSON.stringify(variation) : 'default')}`;
      const prevItems = globalCartState.items;
      const existing = prevItems.find((i) => i.id === lineKey || i.key === lineKey);

      let newItems: WpCartLineItem[];
      if (existing) {
        newItems = prevItems.map((i) =>
          (i.id === lineKey || i.key === lineKey) ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        const newLine: WpCartLineItem = {
          id: lineKey,
          key: lineKey,
          productId: prodId,
          slug: prodSlug,
          name: prodName,
          price: prodPrice,
          compareAtPrice: typeof product === 'object' ? product.compareAtPrice : null,
          image: prodImage,
          quantity,
          variantLabel,
          variation,
          lineSubtotal: prodPrice * quantity,
        };
        newItems = [...prevItems, newLine];
      }

      const subtotal = newItems.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 1), 0);
      const updatedState: WpCartState = {
        ...globalCartState,
        items: newItems,
        itemCount: newItems.reduce((s, i) => s + (i.quantity || 1), 0),
        subtotal,
        totals: {
          ...globalCartState.totals,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
        },
      };

      globalCartIsOpen = true;
      saveLocalCart(updatedState);

      // Server Sync
      if (!IS_DEV) {
        try {
          const serverCart = await fetchForgeWpCart('add', {
            productId: prodId,
            id: prodId,
            slug: prodSlug,
            name: prodName,
            price: prodPrice,
            image: prodImage,
            quantity,
            variation,
            variantLabel,
          });
          if (serverCart && serverCart.items && serverCart.items.length > 0) {
            saveLocalCart(serverCart);
          }
        } catch (e) {}
      }
      return true;
    },
    []
  );

  const addToCart = React.useCallback(
    async (productId: number, quantity = 1, variation?: Record<string, string>) => {
      await addItem({ id: productId }, quantity, variation);
    },
    [addItem]
  );

  const addToCartBatch = React.useCallback(
    async (batchItems: Array<{ productId: number; quantity: number; variation?: Record<string, string> }>) => {
      for (const item of batchItems) {
        await addItem({ id: item.productId }, item.quantity, item.variation);
      }
    },
    [addItem]
  );

  const updateQuantity = React.useCallback(
    async (lineId: string, quantity: number) => {
      let newItems: WpCartLineItem[];
      if (quantity <= 0) {
        newItems = globalCartState.items.filter((i) => i.id !== lineId && i.key !== lineId);
      } else {
        newItems = globalCartState.items.map((i) =>
          (i.id === lineId || i.key === lineId) ? { ...i, quantity, lineSubtotal: (Number(i.price) || 0) * quantity } : i
        );
      }

      const subtotal = newItems.reduce((s, i) => s + (Number(i.price) || 0) * (i.quantity || 1), 0);
      const updatedState: WpCartState = {
        ...globalCartState,
        items: newItems,
        itemCount: newItems.reduce((s, i) => s + (i.quantity || 1), 0),
        subtotal,
        totals: {
          ...globalCartState.totals,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
        },
      };

      saveLocalCart(updatedState);

      if (!IS_DEV) {
        try {
          const serverCart = await fetchForgeWpCart('update', { key: lineId, quantity });
          if (serverCart) {
            saveLocalCart(serverCart);
          }
        } catch (e) {}
      }
      return true;
    },
    []
  );

  const removeItem = React.useCallback(
    async (lineId: string) => {
      return updateQuantity(lineId, 0);
    },
    [updateQuantity]
  );

  const clearCart = React.useCallback(async () => {
    const updatedState: WpCartState = {
      ...globalCartState,
      items: [],
      itemCount: 0,
      subtotal: 0,
      totals: {
        ...globalCartState.totals,
        subtotal: '0.00',
        total: '0.00',
      },
    };
    saveLocalCart(updatedState);

    if (!IS_DEV) {
      try {
        const serverCart = await fetchForgeWpCart('clear');
        if (serverCart) {
          saveLocalCart(serverCart);
        }
      } catch (e) {}
    }
  }, []);

  const applyCoupon = React.useCallback(async (code: string) => {
    if (!code) return false;
    if (IS_DEV) {
      const upper = code.toUpperCase();
      if (!globalCartState.coupons.includes(upper)) {
        saveLocalCart({
          ...globalCartState,
          coupons: [...globalCartState.coupons, upper],
        });
        return true;
      }
      return false;
    }

    try {
      const serverCart = await fetchForgeWpCart('apply-coupon', { code });
      if (serverCart) {
        saveLocalCart(serverCart);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  const removeCoupon = React.useCallback(async (code: string) => {
    if (!code) return;
    if (IS_DEV) {
      saveLocalCart({
        ...globalCartState,
        coupons: globalCartState.coupons.filter((c) => c !== code),
      });
      return;
    }

    try {
      const serverCart = await fetchForgeWpCart('remove-coupon', { code });
      if (serverCart) {
        saveLocalCart(serverCart);
      }
    } catch (e) {}
  }, []);

  const calculateShipping = React.useCallback(async (address: { country: string; city: string; postcode: string; state?: string }) => {
    saveLocalCart({
      ...globalCartState,
      shippingAddress: address,
    });

    if (!IS_DEV && typeof window !== "undefined") {
      try {
        const token = window.localStorage.getItem('forgewp_jwt_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/cart/shipping-rates`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(address),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.totals) {
            saveLocalCart(data.totals);
          }
        }
      } catch (e) {}
    }
  }, []);

  const setShippingMethod = React.useCallback((methodId: string) => {
    saveLocalCart({
      ...globalCartState,
      shippingMethod: methodId,
    });
  }, []);

  if (context) return context;

  return {
    cart: state,
    items: state.items,
    itemCount: state.itemCount,
    subtotal: state.subtotal,
    cartTotal: `${state.currency || '$'}${state.totals?.total || state.subtotal.toFixed(2)}`,
    totals: state.totals,
    coupons: state.coupons,
    currency: state.currency,
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    addItem,
    addToCart,
    addToCartBatch,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    calculateShipping,
    setShippingMethod,
    refreshCart,
    isLoading,
  };
}

// ── 2. Checkout Hook ─────────────────────────────────────────────────────────

export interface ShippingMethod {
  id: string;
  title: string;
  cost: number;
  description: string;
}

export interface PaymentGateway {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export function useWpCheckout() {
  const cartContext = useWpCart();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentGateways, setPaymentGateways] = React.useState<PaymentGateway[]>([
    { id: "stripe", title: "Credit Card (Stripe)", description: "Pay securely with your credit card." },
    { id: "paypal", title: "PayPal", description: "Log in and pay using your PayPal account." },
    { id: "cod", title: "Cash on Delivery", description: "Pay with cash upon delivery of your order." },
    { id: "bacs", title: "Direct Bank Transfer", description: "Make your payment directly into our bank account." },
  ]);

  const shippingMethods: ShippingMethod[] = [
    { id: "flat_rate", title: "Flat Rate Shipping", cost: 10.0, description: "Standard ground delivery (3-5 business days)" },
    { id: "free_shipping", title: "Free Shipping", cost: 0.0, description: "Available for orders over $100" },
    { id: "local_pickup", title: "Local Pickup", cost: 0.0, description: "Pickup from our warehouse location" }
  ];

  React.useEffect(() => {
    if (!IS_DEV && typeof window !== "undefined") {
      fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/checkout/gateways`, {
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.gateways && Array.isArray(data.gateways) && data.gateways.length > 0) {
            setPaymentGateways(data.gateways);
          }
        })
        .catch(() => {});
    }
  }, []);

  const processOrder = async (
    billingAddress: Record<string, string>,
    shippingAddress: Record<string, string>,
    gatewayId: string,
    customerNote: string = ""
  ) => {
    setIsSubmitting(true);
    setError(null);

    if (!IS_DEV) {
      try {
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('forgewp_jwt_token') : null;
        const nonce = typeof window !== 'undefined' ? ((window as any).forgeWpHydration?.restNonce || (window as any).forgeWpHydration?.nonce || '') : '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (nonce) headers['X-WP-Nonce'] = nonce;

        const response = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/checkout/process`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            billing_address: billingAddress,
            shipping_address: shippingAddress || billingAddress,
            payment_method: gatewayId,
            customer_note: customerNote,
          })
        });

        const checkoutResult = await response.json();
        if (response.ok && checkoutResult?.success) {
          await cartContext.clearCart();
          setIsSubmitting(false);
          return {
            success: true,
            orderId: checkoutResult.orderId,
            orderKey: checkoutResult.orderKey,
            orderNumber: checkoutResult.orderNumber,
            redirectUrl: checkoutResult.redirectUrl || "/checkout/order-received"
          };
        } else {
          const msg = checkoutResult?.message || "Failed to process order. Please try again.";
          setError(msg);
          setIsSubmitting(false);
          return { success: false, error: msg };
        }
      } catch (err: any) {
        const msg = err.message || "Failed to process order. Please try again.";
        setError(msg);
        setIsSubmitting(false);
        return { success: false, error: msg };
      }
    }

    // Dev simulation fallback
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!billingAddress.first_name || !billingAddress.email || !billingAddress.address_1) {
      const msg = "Please complete all required billing fields.";
      setError(msg);
      setIsSubmitting(false);
      return { success: false, error: msg };
    }

    await cartContext.clearCart();
    setIsSubmitting(false);
    return {
      success: true,
      orderId: Math.floor(100000 + Math.random() * 90000),
      redirectUrl: "/checkout/order-received"
    };
  };

  return {
    shippingMethods,
    paymentGateways,
    processOrder,
    isSubmitting,
    error
  };
}

// ── 3. Customer & Accounts Hook ─────────────────────────────────────────────

export interface CustomerProfile {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  billing: Record<string, string>;
  shipping: Record<string, string>;
}

export interface OrderRecord {
  id: number;
  orderNumber?: string;
  date: string;
  status: string;
  total: string;
  totalAmount?: number;
  currency?: string;
  itemsCount: number;
  items: Array<{ title: string; qty: number; name?: string; quantity?: number; price?: number; image?: string }>;
  downloadableFiles?: Array<{ name: string; url: string }>;
  viewUrl?: string;
}

export interface CustomerDownloadRecord {
  id: string;
  name: string;
  productName?: string;
  url: string;
  downloadsRemaining: string | number;
  accessExpires: string;
}

export function useWpCustomer() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [customer, setCustomer] = React.useState<CustomerProfile | null>(null);
  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [downloads, setDownloads] = React.useState<CustomerDownloadRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);

  const fetchCustomerData = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem('forgewp_jwt_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (!IS_DEV) {
      try {
        setLoading(true);
        setError(null);
        const [ordersRes, dlRes] = await Promise.all([
          fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/customer/orders`, { headers, credentials: 'include' }),
          fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/customer/downloads`, { headers, credentials: 'include' }),
        ]);

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          if (data?.orders && Array.isArray(data.orders)) {
            setOrders(data.orders);
            window.localStorage.setItem('forgewp-customer-orders', JSON.stringify(data.orders));
          }
        }
        if (dlRes.ok) {
          const dlData = await dlRes.json();
          if (dlData?.downloads && Array.isArray(dlData.downloads)) {
            setDownloads(dlData.downloads);
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to fetch customer data.');
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Initialize from LocalStorage in browser
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCust = localStorage.getItem("forgewp-customer");
      const storedOrders = localStorage.getItem("forgewp-customer-orders");
      if (storedCust) {
        setCustomer(JSON.parse(storedCust));
        setIsLoggedIn(true);
      }
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }
      fetchCustomerData();
    }
  }, [fetchCustomerData]);

  const login = async (userEmail: string, pass: string) => {
    setLoading(true);
    setError(null);
    if (!userEmail || !pass) {
      setLoading(false);
      const msg = "Username and Password are required.";
      setError(msg);
      throw new Error(msg);
    }

    if (!IS_DEV && typeof window !== "undefined") {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: userEmail, password: pass }),
        });
        const data = await res.json();
        if (res.ok && data?.user) {
          if (data.token) {
            window.localStorage.setItem('forgewp_jwt_token', data.token);
          }
          const prof: CustomerProfile = {
            username: data.user.username || data.user.slug || userEmail,
            email: data.user.email || userEmail,
            first_name: data.user.firstName || '',
            last_name: data.user.lastName || '',
            billing: data.user.billing || {},
            shipping: data.user.shipping || {},
          };
          setCustomer(prof);
          setIsLoggedIn(true);
          window.localStorage.setItem('forgewp-customer', JSON.stringify(prof));
          await fetchCustomerData();
          setLoading(false);
          return true;
        } else {
          setLoading(false);
          const msg = data?.message || 'Login failed. Please check credentials.';
          setError(msg);
          throw new Error(msg);
        }
      } catch (err: any) {
        setLoading(false);
        setError(err.message || 'Login failed.');
        throw err;
      }
    }

    // Dev mode fallback
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockProfile: CustomerProfile = {
      username: userEmail.split("@")[0],
      email: userEmail,
      first_name: "Customer",
      last_name: "",
      billing: { first_name: "Customer", email: userEmail },
      shipping: { first_name: "Customer" },
    };
    setCustomer(mockProfile);
    setIsLoggedIn(true);
    localStorage.setItem("forgewp-customer", JSON.stringify(mockProfile));
    setLoading(false);
    return true;
  };

  const register = async (username: string, email: string, pass: string) => {
    setLoading(true);
    setError(null);
    if (!username || !email || !pass) {
      setLoading(false);
      const msg = "All registration fields are required.";
      setError(msg);
      throw new Error(msg);
    }

    if (!IS_DEV && typeof window !== "undefined") {
      try {
        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, email, password: pass }),
        });
        const data = await res.json();
        if (res.ok && data?.user) {
          if (data.token) {
            window.localStorage.setItem('forgewp_jwt_token', data.token);
          }
          const prof: CustomerProfile = {
            username: data.user.username || username,
            email: data.user.email || email,
            first_name: data.user.firstName || username,
            last_name: data.user.lastName || '',
            billing: { first_name: username, email },
            shipping: { first_name: username },
          };
          setCustomer(prof);
          setIsLoggedIn(true);
          window.localStorage.setItem('forgewp-customer', JSON.stringify(prof));
          setLoading(false);
          return true;
        } else {
          setLoading(false);
          const msg = data?.message || 'Registration failed.';
          setError(msg);
          throw new Error(msg);
        }
      } catch (err: any) {
        setLoading(false);
        setError(err.message || 'Registration failed.');
        throw err;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockProfile: CustomerProfile = {
      username,
      email,
      first_name: username,
      last_name: "",
      billing: { first_name: username, email, country: "US" },
      shipping: { first_name: username, country: "US" }
    };

    setCustomer(mockProfile);
    setIsLoggedIn(true);
    localStorage.setItem("forgewp-customer", JSON.stringify(mockProfile));
    setLoading(false);
    return true;
  };

  const logout = () => {
    if (!IS_DEV && typeof window !== "undefined") {
      fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
      window.localStorage.removeItem('forgewp_jwt_token');
    }
    setCustomer(null);
    setIsLoggedIn(false);
    setError(null);
    localStorage.removeItem("forgewp-customer");
  };

  const updateProfile = async (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; customer?: CustomerProfile }> => {
    setLoading(true);
    setError(null);
    if (!IS_DEV && typeof window !== 'undefined') {
      try {
        const token = window.localStorage.getItem('forgewp_jwt_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/customer/profile`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (res.ok && resData?.user) {
          const prof: CustomerProfile = {
            username: resData.user.username || '',
            email: resData.user.email || '',
            first_name: resData.user.firstName || '',
            last_name: resData.user.lastName || '',
            billing: resData.user.billing || {},
            shipping: resData.user.shipping || {},
          };
          setCustomer(prof);
          window.localStorage.setItem('forgewp-customer', JSON.stringify(prof));
          setLoading(false);
          return { success: true, message: resData.message || 'Profile updated successfully.', customer: prof };
        } else {
          setLoading(false);
          const msg = resData?.message || 'Failed to update profile.';
          setError(msg);
          throw new Error(msg);
        }
      } catch (err: any) {
        setLoading(false);
        setError(err.message || 'Failed to update profile.');
        throw err;
      }
    }

    // Dev fallback
    let updated: CustomerProfile = customer || {
      username: 'dev_user',
      email: data.email || 'dev@example.com',
      first_name: data.firstName || 'Customer',
      last_name: data.lastName || '',
      billing: {},
      shipping: {},
    };
    if (customer) {
      updated = {
        ...customer,
        first_name: data.firstName || customer.first_name,
        last_name: data.lastName || customer.last_name,
        email: data.email || customer.email,
        billing: {
          ...customer.billing,
          phone: data.phone || customer.billing?.phone || '',
        },
      };
      setCustomer(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('forgewp-customer', JSON.stringify(updated));
      }
    }
    setLoading(false);
    return { success: true, message: 'Profile updated.', customer: updated };
  };

  const updateAddress = async (data: {
    name?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
    type?: 'shipping' | 'billing';
  }): Promise<{ success: boolean; message: string; customer?: CustomerProfile }> => {
    setLoading(true);
    setError(null);
    if (!IS_DEV && typeof window !== 'undefined') {
      try {
        const token = window.localStorage.getItem('forgewp_jwt_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/customer/address`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(data),
        });
        const resData = await res.json();
        if (res.ok && resData?.user) {
          const prof: CustomerProfile = {
            username: resData.user.username || '',
            email: resData.user.email || '',
            first_name: resData.user.firstName || '',
            last_name: resData.user.lastName || '',
            billing: resData.user.billing || {},
            shipping: resData.user.shipping || {},
          };
          setCustomer(prof);
          window.localStorage.setItem('forgewp-customer', JSON.stringify(prof));
          setLoading(false);
          return { success: true, message: resData.message || 'Address saved successfully.', customer: prof };
        } else {
          setLoading(false);
          const msg = resData?.message || 'Failed to update address.';
          setError(msg);
          throw new Error(msg);
        }
      } catch (err: any) {
        setLoading(false);
        setError(err.message || 'Failed to update address.');
        throw err;
      }
    }

    // Dev fallback
    let updated: CustomerProfile = customer || {
      username: 'dev_user',
      email: 'dev@example.com',
      first_name: 'Customer',
      last_name: '',
      billing: {},
      shipping: {},
    };
    if (customer) {
      updated = {
        ...customer,
        shipping: {
          ...customer.shipping,
          address_1: data.street || customer.shipping?.address_1 || '',
          city: data.city || customer.shipping?.city || '',
          postcode: data.postalCode || customer.shipping?.postcode || '',
          country: data.country || customer.shipping?.country || 'US',
          phone: data.phone || customer.shipping?.phone || '',
        },
      };
      setCustomer(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('forgewp-customer', JSON.stringify(updated));
      }
    }
    setLoading(false);
    return { success: true, message: 'Address saved.', customer: updated };
  };

  return {
    isLoggedIn,
    customer,
    orders,
    downloads,
    login,
    register,
    logout,
    updateProfile,
    updateAddress,
    refreshOrders: fetchCustomerData,
    refreshCustomer: fetchCustomerData,
    loading,
    error,
  };
}

// ── 4. Faceted Search & Filters Hook ────────────────────────────────────────

export interface ActiveFiltersState {
  categories: string[];
  tags: string[];
  attributes: Record<string, string[]>;
  priceRange: [number, number];
  sortBy: string;
  search: string;
}

export function useWpProductFilters() {
  const [activeFilters, setActiveFilters] = React.useState<ActiveFiltersState>({
    categories: [],
    tags: [],
    attributes: {},
    priceRange: [0, 100],
    sortBy: "date",
    search: ""
  });

  // Load URL Search Parameters on mount to mimic production behavior
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const categories: string[] = [];
      const tags: string[] = [];
      const attributes: Record<string, string[]> = {};
      let priceRange: [number, number] = [0, 100];
      let sortBy = "date";
      let search = "";

      params.forEach((value, key) => {
        if (key === "product_cat") {
          categories.push(value);
        } else if (key === "product_tag") {
          tags.push(value);
        } else if (key === "orderby") {
          sortBy = value;
        } else if (key === "s" || key === "q") {
          search = value;
        } else if (key === "min_price") {
          priceRange[0] = parseFloat(value);
        } else if (key === "max_price") {
          priceRange[1] = parseFloat(value);
        } else if (key.startsWith("filter_")) {
          const attrName = key.replace("filter_", "");
          attributes[attrName] = value.split(",");
        }
      });

      setActiveFilters({
        categories,
        tags,
        attributes,
        priceRange,
        sortBy,
        search
      });
    }
  }, []);

  // Update URL parameters
  const updateUrl = (filters: ActiveFiltersState) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      
      filters.categories.forEach(c => params.append("product_cat", c));
      filters.tags.forEach(t => params.append("product_tag", t));
      
      Object.entries(filters.attributes).forEach(([name, vals]) => {
        if (vals.length > 0) {
          params.append(`filter_${name}`, vals.join(","));
        }
      });

      if (filters.priceRange[0] > 0) {
        params.append("min_price", String(filters.priceRange[0]));
      }
      if (filters.priceRange[1] < 100) {
        params.append("max_price", String(filters.priceRange[1]));
      }
      if (filters.sortBy !== "date") {
        params.append("orderby", filters.sortBy);
      }
      if (filters.search) {
        params.append("s", filters.search);
      }

      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? "?" + newSearch : ""}`;
      window.history.pushState(null, "", newUrl);
    }
  };

  const setFilter = (type: "category" | "tag" | string, value: string, active: boolean) => {
    setActiveFilters((prev) => {
      let updated: ActiveFiltersState;
      if (type === "category") {
        const categories = active 
          ? [...prev.categories, value]
          : prev.categories.filter(c => c !== value);
        updated = { ...prev, categories };
      } else if (type === "tag") {
        const tags = active
          ? [...prev.tags, value]
          : prev.tags.filter(t => t !== value);
        updated = { ...prev, tags };
      } else {
        // Attribute filter
        const currentVals = prev.attributes[type] || [];
        const updatedVals = active
          ? [...currentVals, value]
          : currentVals.filter(v => v !== value);
        
        const attributes = { ...prev.attributes, [type]: updatedVals };
        if (updatedVals.length === 0) {
          delete attributes[type];
        }
        updated = { ...prev, attributes };
      }
      updateUrl(updated);
      return updated;
    });
  };

  const setPriceRange = (min: number, max: number) => {
    setActiveFilters((prev) => {
      const updated = { ...prev, priceRange: [min, max] as [number, number] };
      updateUrl(updated);
      return updated;
    });
  };

  const setSortBy = (sortOption: string) => {
    setActiveFilters((prev) => {
      const updated = { ...prev, sortBy: sortOption };
      updateUrl(updated);
      return updated;
    });
  };

  const resetFilters = () => {
    const cleared: ActiveFiltersState = {
      categories: [],
      tags: [],
      attributes: {},
      priceRange: [0, 100],
      sortBy: "date",
      search: ""
    };
    setActiveFilters(cleared);
    updateUrl(cleared);
  };

  return {
    activeFilters,
    setFilter,
    setPriceRange,
    setSortBy,
    resetFilters
  };
}

// ── 5. Wishlist / Favorites Hook ────────────────────────────────────────────

export function useWpWishlist() {
  const [wishlist, setWishlist] = React.useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("forgewp-wishlist");
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchWishlist = React.useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!IS_DEV) {
      try {
        setLoading(true);
        setError(null);
        const token = window.localStorage.getItem('forgewp_jwt_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/wishlist`, {
          headers,
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.wishlist && Array.isArray(data.wishlist)) {
            if (data.wishlist.length > 0) {
              setWishlist(data.wishlist);
              window.localStorage.setItem("forgewp-wishlist", JSON.stringify(data.wishlist));
            } else if (wishlist.length > 0) {
              // Sync local guest items to user database
              await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/wishlist/sync`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ items: wishlist }),
              });
            }
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to fetch wishlist.');
      } finally {
        setLoading(false);
      }
    }
  }, [wishlist]);

  React.useEffect(() => {
    fetchWishlist();
  }, []);

  const isWishlisted = React.useCallback((id: number) => {
    return wishlist.includes(Number(id));
  }, [wishlist]);

  const toggleWishlist = React.useCallback(async (id: number): Promise<{ success: boolean; isWishlisted: boolean; wishlist: number[] }> => {
    const numId = Number(id);
    const wasWishlisted = wishlist.includes(numId);
    const willBeWishlisted = !wasWishlisted;
    const next = willBeWishlisted ? [...wishlist, numId] : wishlist.filter((x) => x !== numId);

    setWishlist(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("forgewp-wishlist", JSON.stringify(next));
    }

    if (!IS_DEV && typeof window !== "undefined") {
      try {
        const token = window.localStorage.getItem('forgewp_jwt_token');
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${getApiBaseUrl()}/wp-json/forgewp/v1/wishlist/toggle`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ id: numId }),
        });
        const data = await res.json();
        if (res.ok && data?.wishlist) {
          setWishlist(data.wishlist);
          window.localStorage.setItem("forgewp-wishlist", JSON.stringify(data.wishlist));
          return {
            success: true,
            isWishlisted: data.isWishlisted ?? willBeWishlisted,
            wishlist: data.wishlist,
          };
        }
      } catch (err: any) {
        setError(err.message || 'Failed to toggle wishlist.');
      }
    }

    return {
      success: true,
      isWishlisted: willBeWishlisted,
      wishlist: next,
    };
  }, [wishlist]);

  return {
    wishlist,
    count: wishlist.length,
    isWishlisted,
    toggleWishlist,
    refreshWishlist: fetchWishlist,
    loading,
    error,
  };
}

export function useWpProductPrice(): string {
  if (!IS_DEV) {
    return '__FORGEWP_PRODUCT_PRICE__';
  }
  const post = React.useContext(WpPostContext);
  if (!post || post.__postType !== "product") return "$19.99";
  const reg = post.customFields?.regular_price;
  const price = post.customFields?.price;
  if (post.customFields?.on_sale && reg && reg !== price) {
    return `$${price} (Sale: was $${reg})`;
  }
  return `$${price}`;
}

export function useWpProductSKU(): string {
  if (!IS_DEV) {
    return '__FORGEWP_PRODUCT_SKU__';
  }
  const post = React.useContext(WpPostContext);
  if (!post || post.__postType !== "product") return "SKU-MOCK";
  return post.customFields?.sku || "";
}

export function useWpProductRating(): string {
  if (!IS_DEV) {
    return '__FORGEWP_PRODUCT_RATING__';
  }
  const post = React.useContext(WpPostContext);
  if (!post || post.__postType !== "product") return "4.5";
  return post.customFields?.average_rating || "5.0";
}

// ── 6. Store Currency & Price Formatter Hook ────────────────────────────────

export interface WpCurrencySettings {
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: "left" | "right" | "left_space" | "right_space";
  thousandSeparator: string;
  decimalSeparator: string;
  decimals: number;
}

export function formatWpPrice(
  amount: number | string | null | undefined,
  customOptions?: Partial<WpCurrencySettings>
): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || "0"));
  if (isNaN(num)) return "$0.00";

  let settings: WpCurrencySettings = {
    currencyCode: "USD",
    currencySymbol: "$",
    currencyPosition: "left",
    thousandSeparator: ",",
    decimalSeparator: ".",
    decimals: 0,
  };

  if (typeof window !== "undefined") {
    const siteOptions = (window as any).forgeWpHydration?.siteSettings?.options;
    if (siteOptions) {
      const wcCurrency = siteOptions.woocommerce_currency;
      const wcSymbol = siteOptions.woocommerce_currency_symbol;
      const wcPos = siteOptions.woocommerce_currency_pos;
      const wcThousand = siteOptions.woocommerce_price_thousand_sep;
      const wcDecimal = siteOptions.woocommerce_price_decimal_sep;
      const wcDecimals = siteOptions.woocommerce_price_num_decimals;

      settings = {
        currencyCode: wcCurrency || "USD",
        currencySymbol: wcSymbol || (wcCurrency === "EUR" ? "€" : wcCurrency === "GBP" ? "£" : "$"),
        currencyPosition: (wcPos as any) || "left",
        thousandSeparator: wcThousand !== undefined ? wcThousand : ",",
        decimalSeparator: wcDecimal !== undefined ? wcDecimal : ".",
        decimals: typeof wcDecimals === "number" ? wcDecimals : 0,
      };
    }
  }

  const config = { ...settings, ...customOptions };
  const fixed = config.decimals > 0 ? num.toFixed(config.decimals) : Math.round(num).toString();
  const [intPart, decPart] = fixed.split(".");

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);
  const formattedNumber = decPart !== undefined && config.decimals > 0
    ? `${formattedInt}${config.decimalSeparator}${decPart}`
    : formattedInt;

  switch (config.currencyPosition) {
    case "left":
      return `${config.currencySymbol}${formattedNumber}`;
    case "left_space":
      return `${config.currencySymbol} ${formattedNumber}`;
    case "right":
      return `${formattedNumber}${config.currencySymbol}`;
    case "right_space":
      return `${formattedNumber} ${config.currencySymbol}`;
    default:
      return `${config.currencySymbol}${formattedNumber}`;
  }
}

export function useWpCurrency(): WpCurrencySettings & {
  formatPrice: (amount: number | string, customOptions?: Partial<WpCurrencySettings>) => string;
} {
  const settings = React.useMemo<WpCurrencySettings>(() => {
    if (typeof window !== "undefined") {
      const siteOptions = (window as any).forgeWpHydration?.siteSettings?.options;
      const wcCurrency = siteOptions?.woocommerce_currency;
      const wcSymbol = siteOptions?.woocommerce_currency_symbol;
      const wcPos = siteOptions?.woocommerce_currency_pos;
      const wcThousand = siteOptions?.woocommerce_price_thousand_sep;
      const wcDecimal = siteOptions?.woocommerce_price_decimal_sep;
      const wcDecimals = siteOptions?.woocommerce_price_num_decimals;

      return {
        currencyCode: wcCurrency || "USD",
        currencySymbol: wcSymbol || (wcCurrency === "EUR" ? "€" : wcCurrency === "GBP" ? "£" : "$"),
        currencyPosition: (wcPos as any) || "left",
        thousandSeparator: wcThousand !== undefined ? wcThousand : ",",
        decimalSeparator: wcDecimal !== undefined ? wcDecimal : ".",
        decimals: typeof wcDecimals === "number" ? wcDecimals : 0,
      };
    }

    return {
      currencyCode: "USD",
      currencySymbol: "$",
      currencyPosition: "left",
      thousandSeparator: ",",
      decimalSeparator: ".",
      decimals: 0,
    };
  }, []);

  const formatPrice = React.useCallback(
    (amount: number | string, customOptions?: Partial<WpCurrencySettings>): string => {
      return formatWpPrice(amount, { ...settings, ...customOptions });
    },
    [settings]
  );

  return {
    ...settings,
    formatPrice,
  };
}

// ── 7. Variable Product Variations Headless Hook ────────────────────────────

export interface UseWpProductVariationsReturn {
  product: WooCommerceProduct | null;
  attributes: ProductAttribute[];
  selectedAttributes: Record<string, string>;
  setAttribute: (name: string, value: string) => void;
  setAttributes: (attrs: Record<string, string>) => void;
  resetAttributes: () => void;
  matchingVariation: ProductVariation | null;
  isSelectionComplete: boolean;
  currentPrice: string;
  currentRegularPrice?: string;
  currentImage: string;
  currentStockStatus: "instock" | "outofstock" | "onbackorder";
  isOutOfStock: boolean;
  isOnSale: boolean;
}

export function useWpProductVariations(
  productOrId: WooCommerceProduct | number | string | null
): UseWpProductVariationsReturn {
  const isDirectProduct = typeof productOrId === "object" && productOrId !== null;
  const productId = isDirectProduct ? (productOrId as WooCommerceProduct).id : (productOrId as number | string);
  const { product: fetchedProduct } = useWpProduct(isDirectProduct ? 0 : productId || 0);

  const product: WooCommerceProduct | null = isDirectProduct
    ? (productOrId as WooCommerceProduct)
    : fetchedProduct;

  const [selectedAttributes, setSelectedAttributes] = React.useState<Record<string, string>>({});

  const attributes = React.useMemo(() => product?.attributes || [], [product]);
  const variations = React.useMemo(() => product?.variations || [], [product]);

  const setAttribute = React.useCallback(
    (name: string, value: string) => {
      setSelectedAttributes((prev) => {
        const next = { ...prev, [name]: value };
        if (product && variations.length > 0) {
          const match = variations.find((v) =>
            Object.entries(next).every(([attr, val]) => v.attributes[attr] === val)
          );
          if (match && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent(`forgewp-variation-selected-${product.id}`, { detail: match })
            );
          }
        }
        return next;
      });
    },
    [product, variations]
  );

  const setAttributes = React.useCallback(
    (attrs: Record<string, string>) => {
      setSelectedAttributes(attrs);
      if (product && variations.length > 0) {
        const match = variations.find((v) =>
          Object.entries(attrs).every(([attr, val]) => v.attributes[attr] === val)
        );
        if (match && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(`forgewp-variation-selected-${product.id}`, { detail: match })
          );
        }
      }
    },
    [product, variations]
  );

  const resetAttributes = React.useCallback(() => {
    setSelectedAttributes({});
  }, []);

  const isSelectionComplete = React.useMemo(() => {
    if (attributes.length === 0) return true;
    return attributes.every((attr) => Boolean(selectedAttributes[attr.name]));
  }, [attributes, selectedAttributes]);

  const matchingVariation = React.useMemo(() => {
    if (!isSelectionComplete || variations.length === 0) return null;
    return (
      variations.find((v) =>
        Object.entries(selectedAttributes).every(([attr, val]) => v.attributes[attr] === val)
      ) || null
    );
  }, [isSelectionComplete, variations, selectedAttributes]);

  const currentPrice = React.useMemo(() => {
    if (matchingVariation) return String(matchingVariation.price);
    if (product?.price !== undefined) return String(product.price);
    return "0.00";
  }, [matchingVariation, product]);

  const currentRegularPrice = React.useMemo(() => {
    if (matchingVariation?.regular_price !== undefined) return String(matchingVariation.regular_price);
    if (product?.regular_price !== undefined) return String(product.regular_price);
    return undefined;
  }, [matchingVariation, product]);

  const currentImage = React.useMemo(() => {
    if (matchingVariation?.image) {
      if (typeof matchingVariation.image === 'string') return matchingVariation.image;
      if (matchingVariation.image.url) return matchingVariation.image.url;
    }
    return product?.featuredImage || "https://picsum.photos/seed/placeholder/300/300";
  }, [matchingVariation, product]);

  const currentStockStatus = React.useMemo<"instock" | "outofstock" | "onbackorder">(() => {
    if (matchingVariation) return matchingVariation.stock_status || "instock";
    return product?.stock_status || "instock";
  }, [matchingVariation, product]);

  const isOutOfStock = currentStockStatus === "outofstock";
  const isOnSale = Boolean(
    product?.on_sale ||
    (currentRegularPrice && parseFloat(String(currentRegularPrice)) > parseFloat(String(currentPrice)))
  );

  return {
    product,
    attributes,
    selectedAttributes,
    setAttribute,
    setAttributes,
    resetAttributes,
    matchingVariation,
    isSelectionComplete,
    currentPrice,
    currentRegularPrice,
    currentImage,
    currentStockStatus,
    isOutOfStock,
    isOnSale,
  };
}

// ── 8. Product Reviews & Submission Headless Hook ───────────────────────────

export interface SubmitReviewParams {
  author: string;
  email?: string;
  content: string;
  rating: number;
}

export type ReviewSortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface UseWpProductReviewsOptions {
  perPage?: number;
  initialSort?: ReviewSortOption;
}

export interface UseWpProductReviewsReturn {
  // Review collections
  reviews: ProductReview[];
  userReview: ProductReview | null;
  otherReviews: ProductReview[];

  // Metrics & Breakdown
  ratingCount: number;
  averageRating: string;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;

  // Sorting
  sort: ReviewSortOption;
  setSort: (sort: ReviewSortOption) => void;

  // Numbered Pagination
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalReviews: number;

  // Load More / Infinite Scroll
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;

  // State & Actions
  isEditing: boolean;
  isSubmitting: boolean;
  isDeleting: boolean;
  loading: boolean;
  error: string | null;
  submitReview: (params: SubmitReviewParams) => Promise<boolean>;
  deleteReview: () => Promise<boolean>;
  refreshReviews: () => Promise<void>;
}

export function useWpProductReviews(
  productId: number,
  options?: UseWpProductReviewsOptions
): UseWpProductReviewsReturn {
  const perPage = options?.perPage || 5;
  const initialSort = options?.initialSort || 'newest';

  const { product, loading: productLoading } = useWpProduct(productId);
  const [reviews, setReviews] = React.useState<ProductReview[]>([]);
  const [userReview, setUserReview] = React.useState<ProductReview | null>(null);
  const [ratingBreakdown, setRatingBreakdown] = React.useState<Record<1 | 2 | 3 | 4 | 5, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [sort, setSortState] = React.useState<ReviewSortOption>(initialSort);
  const [page, setPageState] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalReviews, setTotalReviews] = React.useState<number>(0);
  const [serverRatingCount, setServerRatingCount] = React.useState<number>(0);
  const [serverAvgRating, setServerAvgRating] = React.useState<string>('0.0');

  const [loading, setLoading] = React.useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // In production/WordPress, resolve real numeric post ID from hydration context
  const effectiveProductId = React.useMemo(() => {
    if (typeof window !== "undefined" && (window as any).forgeWpHydration?.post?.id) {
      return Number((window as any).forgeWpHydration.post.id);
    }
    return typeof productId === "number" ? productId : 0;
  }, [productId]);

  const fetchPage = React.useCallback(
    async (pageToLoad: number, sortOption: ReviewSortOption, append: boolean = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      if (typeof window !== "undefined" && !IS_DEV && effectiveProductId) {
        try {
          const nonce =
            (window as any).forgeWpHydration?.restNonce ||
            (window as any).forgeWpHydration?.nonce ||
            "";
          const headers: Record<string, string> = {};
          if (nonce) headers["X-WP-Nonce"] = nonce;

          const url = `${getApiBaseUrl()}/wp-json/forgewp/v1/products/${effectiveProductId}/reviews?sort=${sortOption}&page=${pageToLoad}&per_page=${perPage}`;
          const res = await fetch(url, {
            headers,
            credentials: "include",
          });

          if (res.ok) {
            const data = await res.json();
            if (data) {
              if (append) {
                setReviews((prev) => [...prev, ...(data.reviews || [])]);
              } else {
                setReviews(data.reviews || []);
              }
              if (data.userReview !== undefined) {
                setUserReview(data.userReview);
              }
              if (data.ratingBreakdown) {
                setRatingBreakdown(data.ratingBreakdown);
              }
              if (data.totalPages !== undefined) setTotalPages(data.totalPages);
              if (data.totalReviews !== undefined) setTotalReviews(data.totalReviews);
              if (data.ratingCount !== undefined) setServerRatingCount(data.ratingCount);
              if (data.averageRating !== undefined) setServerAvgRating(data.averageRating);
            }
          }
        } catch (e: any) {
          setError(e.message || "Failed to load reviews.");
        } finally {
          setLoading(false);
          setIsLoadingMore(false);
        }
        return;
      }

      // Dev mock simulation
      const baseReviews: ProductReview[] = product?.reviews || [];
      const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      baseReviews.forEach((r) => {
        const star = (Math.max(1, Math.min(5, r.rating || 5)) as 1 | 2 | 3 | 4 | 5);
        breakdown[star]++;
        sum += star;
      });

      const sorted = [...baseReviews].sort((a, b) => {
        if (sortOption === "oldest") return (a.date || "").localeCompare(b.date || "");
        if (sortOption === "highest") return (b.rating || 5) - (a.rating || 5);
        if (sortOption === "lowest") return (a.rating || 5) - (b.rating || 5);
        return (b.date || "").localeCompare(a.date || "");
      });

      const totalCount = sorted.length;
      const pages = Math.max(1, Math.ceil(totalCount / perPage));
      const offset = (pageToLoad - 1) * perPage;
      const paginated = sorted.slice(offset, offset + perPage);

      if (append) {
        setReviews((prev) => [...prev, ...paginated]);
      } else {
        setReviews(paginated);
      }
      setRatingBreakdown(breakdown);
      setTotalPages(pages);
      setTotalReviews(totalCount);
      setServerRatingCount(totalCount);
      setServerAvgRating(totalCount > 0 ? (sum / totalCount).toFixed(2) : "0.00");
      setLoading(false);
      setIsLoadingMore(false);
    },
    [effectiveProductId, perPage, product]
  );

  // Initial load or sort/product change
  React.useEffect(() => {
    setPageState(1);
    fetchPage(1, sort, false);
  }, [fetchPage, sort]);

  const setSort = React.useCallback(
    (newSort: ReviewSortOption) => {
      setSortState(newSort);
      setPageState(1);
    },
    []
  );

  const setPage = React.useCallback(
    (newPage: number) => {
      setPageState(newPage);
      fetchPage(newPage, sort, false);
    },
    [fetchPage, sort]
  );

  const loadMore = React.useCallback(async () => {
    if (page < totalPages && !isLoadingMore) {
      const nextPage = page + 1;
      setPageState(nextPage);
      await fetchPage(nextPage, sort, true);
    }
  }, [page, totalPages, isLoadingMore, fetchPage, sort]);

  const refreshReviews = React.useCallback(async () => {
    await fetchPage(1, sort, false);
  }, [fetchPage, sort]);

  const submitReview = React.useCallback(
    async (params: SubmitReviewParams): Promise<boolean> => {
      const { author, email, content, rating } = params;
      if (!content) {
        setError("Review content is required.");
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      if (!IS_DEV) {
        try {
          const userEmail = email || (author ? `${author.toLowerCase().replace(/\s+/g, "")}@example.com` : "");
          const nonce =
            (typeof window !== "undefined" &&
              ((window as any).forgeWpHydration?.restNonce ||
                (window as any).forgeWpHydration?.nonce)) ||
            "";
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (nonce) headers["X-WP-Nonce"] = nonce;

          const response = await fetch(
            `${getApiBaseUrl()}/wp-json/forgewp/v1/products/${effectiveProductId || productId}/reviews`,
            {
              method: "POST",
              headers,
              credentials: "include",
              body: JSON.stringify({
                author: author || "Customer",
                email: userEmail,
                content,
                rating: Number(rating) || 5,
              }),
            }
          );

          const data = await response.json();
          if (response.ok && data?.success && data?.review) {
            setUserReview(data.review);
            setIsSubmitting(false);
            await fetchPage(1, sort, false);
            return true;
          } else {
            setError(data?.message || "Failed to submit review. Please try again.");
            setIsSubmitting(false);
            return false;
          }
        } catch (err: any) {
          setError(err.message || "An unexpected error occurred.");
          setIsSubmitting(false);
          return false;
        }
      }

      // Dev mock simulation
      await new Promise((resolve) => setTimeout(resolve, 600));
      const newRev: ProductReview = {
        id: userReview?.id || Date.now(),
        author: author || "Customer",
        content,
        rating: rating || 5,
        date: new Date().toISOString().split("T")[0],
        verified: true,
      };
      setUserReview(newRev);
      setIsSubmitting(false);
      return true;
    },
    [effectiveProductId, productId, userReview, fetchPage, sort]
  );

  const deleteReview = React.useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    if (!IS_DEV) {
      try {
        const nonce =
          (typeof window !== "undefined" &&
            ((window as any).forgeWpHydration?.restNonce ||
              (window as any).forgeWpHydration?.nonce)) ||
          "";
        const headers: Record<string, string> = {};
        if (nonce) headers["X-WP-Nonce"] = nonce;

        const res = await fetch(
          `${getApiBaseUrl()}/wp-json/forgewp/v1/products/${effectiveProductId || productId}/reviews`,
          {
            method: "DELETE",
            headers,
            credentials: "include",
          }
        );

        const data = await res.json();
        if (res.ok && data?.success) {
          setUserReview(null);
          setIsDeleting(false);
          await fetchPage(1, sort, false);
          return true;
        } else {
          setError(data?.message || "Failed to delete review.");
          setIsDeleting(false);
          return false;
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        setIsDeleting(false);
        return false;
      }
    }

    // Dev mock simulation
    await new Promise((resolve) => setTimeout(resolve, 400));
    setUserReview(null);
    setIsDeleting(false);
    return true;
  }, [effectiveProductId, productId, fetchPage, sort]);

  const otherReviews = React.useMemo(() => {
    if (!userReview) return reviews;
    return reviews.filter((r) => r.id !== userReview.id);
  }, [reviews, userReview]);

  const hasMore = page < totalPages;
  const isEditing = Boolean(userReview);

  return {
    reviews,
    userReview,
    otherReviews,
    ratingCount: serverRatingCount,
    averageRating: serverAvgRating,
    ratingBreakdown,
    sort,
    setSort,
    page,
    setPage,
    totalPages,
    totalReviews,
    hasMore,
    loadMore,
    isLoadingMore,
    isEditing,
    isSubmitting,
    isDeleting,
    loading: loading || productLoading,
    error,
    submitReview,
    deleteReview,
    refreshReviews,
  };
}


