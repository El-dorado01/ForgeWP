import React from "react";
import { WpPostContext } from "@forgewp/react";

function isDevFallbackMode(): boolean {
  const isDevEnv =
    typeof import.meta !== "undefined" &&
    // @ts-ignore
    (import.meta as any).env?.DEV === true;
  if (!isDevEnv) return false;
  return !hasRuntimeWpUrl() && !getCommerceApiBaseUrl();
}

export const IS_DEV =
  typeof import.meta !== "undefined" &&
  // @ts-ignore
  (import.meta as any).env?.DEV === true &&
  !hasRuntimeWpUrl();

function readRuntimeEnv(key: string): string {
  try {
    const procEnv = (globalThis as any).process?.env;
    if (procEnv && typeof procEnv[key] === "string" && procEnv[key].trim()) {
      return procEnv[key].trim();
    }
  } catch {}
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && typeof metaEnv[key] === "string" && metaEnv[key].trim()) {
      return metaEnv[key].trim();
    }
  } catch {}
  return "";
}

function hasRuntimeWpUrl(): boolean {
  if (typeof window !== "undefined" && (window as any).forgeWpHydration) {
    return true;
  }
  return Boolean(
    readRuntimeEnv("FORGEWP_WP_URL") ||
      readRuntimeEnv("NEXT_PUBLIC_FORGEWP_WP_URL") ||
      readRuntimeEnv("VITE_FORGEWP_WP_URL"),
  );
}

/**
 * Resolves the WordPress API base URL from ForgeWP's runtime env vars
 * (`FORGEWP_WP_URL` / `NEXT_PUBLIC_FORGEWP_WP_URL`) or native site hydration,
 * falling back to legacy package vars only when runtime vars are absent.
 */
export function getCommerceApiBaseUrl(): string {
  const runtimeUrl =
    readRuntimeEnv("FORGEWP_WP_URL") ||
    readRuntimeEnv("NEXT_PUBLIC_FORGEWP_WP_URL") ||
    readRuntimeEnv("VITE_FORGEWP_WP_URL");
  if (runtimeUrl) {
    return runtimeUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const hydration = (window as any).forgeWpHydration;
    const homeUrl =
      hydration?.siteSettings?.options?.home ||
      hydration?.resources?.["site-settings"]?.site?.homeUrl;
    if (homeUrl) {
      try {
        return new URL(homeUrl).pathname.replace(/\/+$/, "");
      } catch {}
    }
  }

  // Legacy package env fallbacks (kept only if runtime vars are unset)
  const legacyEnv =
    readRuntimeEnv("NEXT_PUBLIC_WP_API_URL") ||
    readRuntimeEnv("WP_API_URL") ||
    readRuntimeEnv("VITE_WP_API_URL");
  if (legacyEnv) {
    return legacyEnv.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && (window as any).FORGEWP_API_URL) {
    return String((window as any).FORGEWP_API_URL).replace(/\/+$/, "");
  }
  return "";
}

function getRestNonce(): string {
  if (typeof window === "undefined") return "";
  const h = (window as any).forgeWpHydration;
  return String(h?.restNonce || h?.nonce || "").trim();
}

export const CART_TOKEN_STORAGE_KEY = "forgewp_cart_token";
let memoryCartToken = "";

export function getCartToken(): string {
  if (memoryCartToken) return memoryCartToken;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(CART_TOKEN_STORAGE_KEY) || "";
      if (stored) {
        memoryCartToken = stored;
        return stored;
      }
    } catch {}
  }
  return "";
}

export function setCartToken(token: string): void {
  const clean = String(token || "").trim();
  if (!clean) return;
  memoryCartToken = clean;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CART_TOKEN_STORAGE_KEY, clean);
    } catch {}
  }
}

export function clearGuestCartToken(): void {
  memoryCartToken = "";
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CART_TOKEN_STORAGE_KEY);
    } catch {}
  }
}

// ── 0. Currency & Money Formatting (§15.1) ──────────────────────────────────

export interface CommerceCurrency {
  code: string;
  symbol: string;
  minorUnit: number;
  decimalSeparator: string;
  thousandSeparator: string;
  prefix: string;
  suffix: string;
}

export const DEFAULT_COMMERCE_CURRENCY: CommerceCurrency = {
  code: "USD",
  symbol: "$",
  minorUnit: 2,
  decimalSeparator: ".",
  thousandSeparator: ",",
  prefix: "$",
  suffix: "",
};

export function getHydratedCommerceCurrency(): CommerceCurrency {
  if (typeof window !== "undefined") {
    const hydration = (window as any).forgeWpHydration;
    const contractCur = hydration?.resources?.["commerce-settings"]?.currency;
    if (contractCur && typeof contractCur === "object") {
      return {
        ...DEFAULT_COMMERCE_CURRENCY,
        ...contractCur,
        minorUnit:
          typeof contractCur.minorUnit === "number"
            ? contractCur.minorUnit
            : DEFAULT_COMMERCE_CURRENCY.minorUnit,
      };
    }
    const siteOptions =
      hydration?.siteSettings?.options ||
      hydration?.resources?.["site-settings"]?.options;
    if (siteOptions && siteOptions.woocommerce_currency) {
      const code = String(siteOptions.woocommerce_currency || "USD");
      const symbol = String(
        siteOptions.woocommerce_currency_symbol ||
          (code === "EUR" ? "€" : code === "GBP" ? "£" : "$"),
      );
      const pos = String(siteOptions.woocommerce_currency_pos || "left");
      const minorUnit =
        typeof siteOptions.woocommerce_price_num_decimals === "number"
          ? siteOptions.woocommerce_price_num_decimals
          : 2;
      return {
        code,
        symbol,
        minorUnit,
        decimalSeparator: String(siteOptions.woocommerce_price_decimal_sep ?? "."),
        thousandSeparator: String(siteOptions.woocommerce_price_thousand_sep ?? ","),
        prefix:
          pos === "left" ? symbol : pos === "left_space" ? `${symbol} ` : "",
        suffix:
          pos === "right" ? symbol : pos === "right_space" ? ` ${symbol}` : "",
      };
    }
  }
  return { ...DEFAULT_COMMERCE_CURRENCY };
}

/**
 * Formats integer minor units (e.g. `2550` USD -> `"$25.50"`, `3` JPY -> `"¥3"`)
 * matching WordPress `wc_price()` without floating-point drift.
 */
export function formatMoney(
  amountMinorUnits: number | null | undefined,
  currency?: Partial<CommerceCurrency> | null,
): string {
  const base = getHydratedCommerceCurrency();
  const cfg: CommerceCurrency = {
    ...base,
    ...(currency || {}),
    minorUnit:
      typeof currency?.minorUnit === "number"
        ? currency.minorUnit
        : base.minorUnit,
  };
  const minor =
    typeof amountMinorUnits === "number" && Number.isFinite(amountMinorUnits)
      ? Math.trunc(amountMinorUnits)
      : 0;
  const negative = minor < 0;
  const absMinor = Math.abs(minor);
  const minorUnit = Math.max(0, Math.min(8, Math.trunc(cfg.minorUnit)));

  let intPart = absMinor;
  let fracPart = 0;
  if (minorUnit > 0) {
    const factor = Math.pow(10, minorUnit);
    intPart = Math.floor(absMinor / factor);
    fracPart = absMinor % factor;
  }

  const intFormatted = String(intPart).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    cfg.thousandSeparator,
  );
  const formattedNumber =
    minorUnit > 0
      ? `${intFormatted}${cfg.decimalSeparator}${String(fracPart).padStart(minorUnit, "0")}`
      : intFormatted;

  return `${negative ? "-" : ""}${cfg.prefix}${formattedNumber}${cfg.suffix}`;
}

export interface CommerceFetchOptions extends RequestInit {
  contractV2?: boolean;
  includeCartToken?: boolean;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Unified HTTP helper for `forgewp/v1/*` WooCommerce routes:
 * appends `?contract=2` on shared transition paths, sends `X-WP-Nonce` when present,
 * forwards `Authorization: Bearer <jwt>`, and reads/sends `X-ForgeWP-Cart-Token`.
 */
export async function commerceFetch<T = any>(
  path: string,
  options: CommerceFetchOptions = {},
): Promise<{ ok: boolean; status: number; data: T | null; headers: Headers }> {
  const {
    contractV2 = false,
    includeCartToken = true,
    params,
    headers: customHeaders,
    ...restInit
  } = options;

  const baseUrl = getCommerceApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const [rawPathname, rawSearch] = cleanPath.split("?");
  const searchParams = new URLSearchParams(rawSearch || "");
  if (contractV2 && !searchParams.has("contract")) {
    searchParams.set("contract", "2");
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.set(k, String(v));
      }
    }
  }
  const qs = searchParams.toString();
  const url = `${baseUrl}/wp-json/forgewp/v1${rawPathname}${qs ? `?${qs}` : ""}`;

  const headers = new Headers(customHeaders || {});
  if (restInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const nonce = getRestNonce();
  if (nonce && !headers.has("X-WP-Nonce")) {
    headers.set("X-WP-Nonce", nonce);
  }

  if (typeof window !== "undefined") {
    try {
      const jwt = window.localStorage.getItem("forgewp_jwt_token");
      if (jwt && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${jwt}`);
      }
    } catch {}
  }

  if (includeCartToken && !headers.has("X-ForgeWP-Cart-Token")) {
    const cartToken = getCartToken();
    if (cartToken) {
      headers.set("X-ForgeWP-Cart-Token", cartToken);
    }
  }

  const response = await fetch(url, {
    ...restInit,
    headers,
    credentials: "include",
  });

  const nextCartToken = response.headers.get("X-ForgeWP-Cart-Token");
  if (nextCartToken) {
    setCartToken(nextCartToken);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {}

  return {
    ok: response.ok,
    status: response.status,
    data: data as T | null,
    headers: response.headers,
  };
}

// ── Product Types & Hooks ────────────────────────────────────────────────────

export type ProductType = "simple" | "variable" | "grouped" | "external";

export interface ProductDimensions {
  length: number | string;
  width: number | string;
  height: number | string;
  unit?: "cm" | "in" | "m" | "mm";
}

export interface ProductVariation {
  id: number;
  attributes: Record<string, string>;
  price?: string | number;
  regular_price?: string | number;
  sale_price?: string | number;
  prices?: {
    price: number;
    regularPrice: number;
    salePrice: number | null;
    onSale: boolean;
  };
  stock_status?: "instock" | "outofstock" | "onbackorder";
  stock_quantity?: number | null;
  stock?: {
    status: "instock" | "outofstock" | "onbackorder";
    quantity: number | null;
    backorders: string;
  };
  sku?: string;
  purchasable?: boolean;
  image?:
    | { id?: number; src?: string; url?: string; alt?: string }
    | string
    | null;
  [key: string]: any;
}

export interface ProductAttributeOption {
  id?: string;
  slug?: string;
  name?: string;
  label?: string;
  value?: string;
  color?: string;
  image?: string;
  [key: string]: any;
}

export interface ProductAttribute {
  name: string;
  slug?: string;
  options: Array<string | ProductAttributeOption>;
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

export interface WooCommerceProduct {
  id: number;
  slug?: string;
  type?: ProductType;
  name?: string;
  title?: string;
  path?: string;
  permalink?: string;
  shortDescription?: string;
  excerpt?: string;
  description?: string;
  content?: string;
  price: string | number;
  regular_price?: string | number;
  sale_price?: string | number;
  on_sale?: boolean;
  prices?: {
    price: number;
    regularPrice: number;
    salePrice: number | null;
    onSale: boolean;
    range: { min: number; max: number } | null;
  };
  currency?: CommerceCurrency;
  date_on_sale_from?: string;
  date_on_sale_to?: string;
  sku?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  stock?: {
    status: "instock" | "outofstock" | "onbackorder";
    quantity: number | null;
    backorders: string;
  };
  purchasable?: boolean;
  sold_individually?: boolean;
  weight?: number | string;
  dimensions?: ProductDimensions | string;
  shipping_class?: string;
  featuredImage?: string;
  images?: Array<string | { id?: number; src?: string; url?: string; alt?: string; srcset?: string; width?: number; height?: number }>;
  badge?: string;
  attributes?: ProductAttribute[];
  variations?: ProductVariation[];
  variants?: any[];
  grouped_products?: number[];
  external_url?: string;
  button_text?: string;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: ProductDownload[];
  categories?: Array<string | { id: number; slug: string; name: string; path?: string }>;
  category?: string;
  categorySlug?: string;
  tags?: Array<string | { id: number; slug: string; name: string }>;
  brand?: string;
  upsell_ids?: number[];
  cross_sell_ids?: number[];
  related?: number[];
  upsells?: number[];
  crossSells?: number[];
  reviewsAllowed?: boolean;
  average_rating?: string | number;
  rating_count?: number;
  rating?: number | { average: number; count: number };
  reviewCount?: number;
  reviews?: ProductReview[];
  _terms?: {
    product_cat?: Array<{ id: number; slug: string; name: string }>;
    product_tag?: Array<{ id: number; slug: string; name: string }>;
    [taxonomy: string]: Array<{ id: number; slug: string; name: string }> | undefined;
  };
  meta?: Record<string, any>;
  [key: string]: any;
}

export function defineProducts(products: WooCommerceProduct[]): WooCommerceProduct[] {
  return products;
}

export function defineProduct(product: WooCommerceProduct): WooCommerceProduct {
  return product;
}

function getProductDisplayUrl(img: any): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  return img.src || img.url || img.thumbnail || "";
}

function normalizeProductRecord(raw: any, currency?: CommerceCurrency): WooCommerceProduct {
  const firstImg = Array.isArray(raw.images) ? getProductDisplayUrl(raw.images[0]) : "";
  const stockStatus = raw.stock?.status || raw.stock_status || "instock";
  const priceMinor = typeof raw.prices?.price === "number" ? raw.prices.price : undefined;
  return {
    ...raw,
    title: raw.title || raw.name || "Product",
    name: raw.name || raw.title || "Product",
    price: priceMinor !== undefined ? priceMinor : raw.price ?? 0,
    on_sale: raw.prices?.onSale ?? raw.on_sale ?? false,
    stock_status: stockStatus,
    featuredImage: raw.featuredImage || firstImg || "",
    currency: raw.currency || currency,
  };
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
  order?: "asc" | "desc";
  onSale?: boolean;
  featured?: boolean;
  lang?: string;
}

export function useWpProducts(params?: UseWpProductsParams): {
  products: WooCommerceProduct[];
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  page: number;
  currency: CommerceCurrency;
  refetch: () => Promise<void>;
} {
  const [products, setProducts] = React.useState<WooCommerceProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [currency, setCurrency] = React.useState<CommerceCurrency>(() =>
    getHydratedCommerceCurrency(),
  );

  const fetchProducts = React.useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!isDevFallbackMode()) {
      try {
        setLoading(true);
        setError(null);
        const res = await commerceFetch("/products", {
          contractV2: true,
          includeCartToken: false,
          params: {
            search: params?.search,
            category: params?.category,
            tag: params?.tag,
            orderby: params?.sortBy,
            order: params?.order,
            page: params?.page,
            perPage: params?.perPage,
            onSale: params?.onSale ? "1" : undefined,
            featured: params?.featured ? "1" : undefined,
            lang: params?.lang,
          },
        });
        if (res.ok && res.data) {
          const cur: CommerceCurrency = res.data.currency || getHydratedCommerceCurrency();
          const list = Array.isArray(res.data.items)
            ? res.data.items
            : Array.isArray(res.data.products)
              ? res.data.products
              : [];
          setCurrency(cur);
          setProducts(list.map((p: any) => normalizeProductRecord(p, cur)));
          setTotal(typeof res.data.total === "number" ? res.data.total : list.length);
          setTotalPages(typeof res.data.totalPages === "number" ? res.data.totalPages : 1);
          setPage(typeof res.data.page === "number" ? res.data.page : 1);
          setLoading(false);
          return;
        }
        setError((res.data as any)?.message || `Failed to fetch products (${res.status})`);
      } catch (e: any) {
        setError(e.message || "Failed to fetch products");
      } finally {
        setLoading(false);
      }
      return;
    }

    const mockProds = (window as any)._forgeWpMockPosts?.["product"] || [];
    setProducts(mockProds);
    setTotal(mockProds.length);
    setTotalPages(1);
    setPage(1);
    setLoading(false);
  }, [
    params?.search,
    params?.category,
    params?.tag,
    params?.sortBy,
    params?.order,
    params?.page,
    params?.perPage,
    params?.onSale,
    params?.featured,
    params?.lang,
  ]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, total, totalPages, page, currency, refetch: fetchProducts };
}

export function useWpProduct(productId: number | string): {
  product: WooCommerceProduct | null;
  loading: boolean;
  error: string | null;
} {
  const { products, loading, error } = useWpProducts();

  const product = React.useMemo(() => {
    if (typeof productId === "number") {
      return products.find((p) => p.id === productId) || null;
    }
    return products.find((p) => p.slug === productId || p.sku === productId) || null;
  }, [products, productId]);

  return { product, loading, error };
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
      const mockCats = (window as any)._forgeWpMockPosts?.["_taxonomy_product_cat"] || [];
      setCategories(mockCats);
    }
  }, []);
  return categories;
}

export function useWpProductTags(): WpProductTag[] {
  const [tags, setTags] = React.useState<WpProductTag[]>([]);
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const mockTags = (window as any)._forgeWpMockPosts?.["_taxonomy_product_tag"] || [];
      setTags(mockTags);
    }
  }, []);
  return tags;
}

// ── 1. Unified Contract Cart (§15.3) ─────────────────────────────────────────

export interface ContractCartImage {
  id: number;
  src: string;
  srcset: string;
  alt: string;
  width: number;
  height: number;
}

export interface ContractCartItem {
  key: string;
  productId: number;
  variationId: number;
  slug: string;
  path: string;
  name: string;
  quantity: number;
  quantityLimits: { min: number; max: number | null; step: number };
  variation: Array<{ attribute: string; value: string }>;
  image: ContractCartImage;
  prices: { price: number; regularPrice: number };
  totals: { subtotal: number; subtotalTax: number; total: number; totalTax: number };
  backordered: boolean;
}

export interface ContractCartCoupon {
  code: string;
  discount: number;
  discountTax: number;
}

export interface ContractCartFee {
  id: string;
  name: string;
  amount: number;
  tax: number;
}

export interface ContractCartShippingRate {
  id: string;
  label: string;
  cost: number;
  selected: boolean;
}

export interface ContractCartShippingPackage {
  id: number;
  destination: { country: string; state?: string; postcode: string; city: string };
  rates: ContractCartShippingRate[];
}

export interface ContractCartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  fees: number;
  tax: number;
  total: number;
}

export interface ContractCartError {
  code: string;
  message: string;
  itemKey?: string;
}

export interface ContractCart {
  items: ContractCartItem[];
  itemCount: number;
  coupons: ContractCartCoupon[];
  fees: ContractCartFee[];
  needsShipping: boolean;
  shippingPackages: ContractCartShippingPackage[];
  totals: ContractCartTotals;
  needsPayment: boolean;
  errors: ContractCartError[];
  currency: CommerceCurrency;
}

export interface WpCartLineItem extends ContractCartItem {
  id: string;
  title: string;
  price: number;
  regularPrice: number;
  featuredImage: string;
  lineSubtotal: number;
}

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
  shippingAddress: { country: string; city: string; postcode: string };
  shippingMethod: string;
}

export interface WpCartState {
  items: WpCartLineItem[];
  itemCount: number;
  subtotal: number;
  totals: ContractCartTotals;
  coupons: ContractCartCoupon[];
  couponCodes: string[];
  fees: ContractCartFee[];
  needsShipping: boolean;
  shippingPackages: ContractCartShippingPackage[];
  shippingAddress: { country: string; state?: string; postcode: string; city: string };
  shippingMethod: string;
  needsPayment: boolean;
  errors: ContractCartError[];
  currency: CommerceCurrency;
}

export type WpCartContextType = {
  cart: WpCartState;
  items: WpCartLineItem[];
  itemCount: number;
  subtotal: number;
  cartTotal: string;
  totals: ContractCartTotals;
  coupons: ContractCartCoupon[];
  couponCodes: string[];
  currency: CommerceCurrency;
  isOpen: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (
    product: any,
    quantity?: number,
    variantLabel?: string | Record<string, string>,
  ) => Promise<boolean>;
  addToCart: (
    productId: number,
    quantity?: number,
    variation?: Record<string, string>,
  ) => Promise<void>;
  addToCartBatch: (
    items: Array<{ productId: number; quantity: number; variation?: Record<string, string> }>,
  ) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<boolean>;
  removeItem: (lineId: string) => Promise<boolean>;
  clearCart: (options?: { localOnly?: boolean }) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: (code: string) => Promise<void>;
  calculateShipping: (address: {
    country: string;
    city: string;
    postcode: string;
    state?: string;
  }) => Promise<void>;
  setShippingMethod: (methodId: string, packageId?: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  isLoading: boolean;
};

const OPTIMISTIC_CART_STORAGE_KEY = "forgewp_cart_state";

function emptyCartState(currency: CommerceCurrency = getHydratedCommerceCurrency()): WpCartState {
  return {
    items: [],
    itemCount: 0,
    subtotal: 0,
    totals: { subtotal: 0, discount: 0, shipping: 0, fees: 0, tax: 0, total: 0 },
    coupons: [],
    couponCodes: [],
    fees: [],
    needsShipping: false,
    shippingPackages: [],
    shippingAddress: { country: "US", state: "", postcode: "", city: "" },
    shippingMethod: "",
    needsPayment: false,
    errors: [],
    currency,
  };
}

export function normalizeContractCart(raw: any): WpCartState {
  if (!raw || typeof raw !== "object") {
    return emptyCartState();
  }
  const currency: CommerceCurrency =
    raw.currency && typeof raw.currency === "object"
      ? { ...DEFAULT_COMMERCE_CURRENCY, ...raw.currency }
      : getHydratedCommerceCurrency();

  const items: WpCartLineItem[] = Array.isArray(raw.items)
    ? raw.items.map((item: any) => {
        const price = Number(item?.prices?.price ?? item?.price ?? 0) || 0;
        const regularPrice =
          Number(item?.prices?.regularPrice ?? item?.regularPrice ?? price) || price;
        const subtotalMinor =
          Number(item?.totals?.subtotal ?? item?.lineSubtotal ?? price * (item?.quantity || 1)) ||
          0;
        const totalMinor = Number(item?.totals?.total ?? subtotalMinor) || subtotalMinor;
        const imageObj: ContractCartImage =
          item?.image && typeof item.image === "object"
            ? {
                id: Number(item.image.id || 0),
                src: String(item.image.src || item.image.url || ""),
                srcset: String(item.image.srcset || ""),
                alt: String(item.image.alt || ""),
                width: Number(item.image.width || 0),
                height: Number(item.image.height || 0),
              }
            : {
                id: 0,
                src: String(item?.featuredImage || item?.image || ""),
                srcset: "",
                alt: String(item?.name || ""),
                width: 0,
                height: 0,
              };
        return {
          key: String(item.key || item.id || `${item.productId || 0}`),
          id: String(item.key || item.id || `${item.productId || 0}`),
          productId: Number(item.productId || item.id || 0),
          variationId: Number(item.variationId || 0),
          slug: String(item.slug || ""),
          path: String(item.path || ""),
          name: String(item.name || item.title || "Product"),
          title: String(item.name || item.title || "Product"),
          quantity: Number(item.quantity || 1),
          quantityLimits: item.quantityLimits || { min: 1, max: null, step: 1 },
          variation: Array.isArray(item.variation) ? item.variation : [],
          image: imageObj,
          featuredImage: imageObj.src,
          prices: { price, regularPrice },
          price,
          regularPrice,
          totals: {
            subtotal: subtotalMinor,
            subtotalTax: Number(item?.totals?.subtotalTax || 0),
            total: totalMinor,
            totalTax: Number(item?.totals?.totalTax || 0),
          },
          lineSubtotal: subtotalMinor,
          backordered: Boolean(item.backordered),
        };
      })
    : [];

  const coupons: ContractCartCoupon[] = Array.isArray(raw.coupons)
    ? raw.coupons.map((c: any) =>
        typeof c === "string"
          ? { code: c, discount: 0, discountTax: 0 }
          : {
              code: String(c.code || ""),
              discount: Number(c.discount || 0),
              discountTax: Number(c.discountTax || 0),
            },
      )
    : [];

  const packages: ContractCartShippingPackage[] = Array.isArray(raw.shippingPackages)
    ? raw.shippingPackages
    : [];
  const firstPkg = packages[0];
  const selectedRate = firstPkg?.rates?.find((r) => r.selected);

  const totals: ContractCartTotals = {
    subtotal: Number(raw.totals?.subtotal ?? 0),
    discount: Number(raw.totals?.discount ?? 0),
    shipping: Number(raw.totals?.shipping ?? 0),
    fees: Number(raw.totals?.fees ?? 0),
    tax: Number(raw.totals?.tax ?? 0),
    total: Number(raw.totals?.total ?? 0),
  };

  return {
    items,
    itemCount:
      typeof raw.itemCount === "number"
        ? raw.itemCount
        : items.reduce((s, i) => s + i.quantity, 0),
    subtotal: totals.subtotal,
    totals,
    coupons,
    couponCodes: coupons.map((c) => c.code.toUpperCase()),
    fees: Array.isArray(raw.fees) ? raw.fees : [],
    needsShipping: Boolean(raw.needsShipping),
    shippingPackages: packages,
    shippingAddress: firstPkg?.destination ||
      raw.shippingAddress || { country: "US", state: "", postcode: "", city: "" },
    shippingMethod: selectedRate?.id || String(raw.shippingMethod || ""),
    needsPayment: Boolean(raw.needsPayment),
    errors: Array.isArray(raw.errors) ? raw.errors : [],
    currency,
  };
}

function readOptimisticCartCache(): WpCartState {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(OPTIMISTIC_CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          return normalizeContractCart(parsed);
        }
      }
    } catch {}
  }
  return emptyCartState();
}

let globalCartState: WpCartState = readOptimisticCartCache();
let globalCartIsOpen = false;
let globalCartLoading = false;
let globalCartError: string | null = null;
const globalCartListeners = new Set<() => void>();

function notifyCartListeners() {
  globalCartListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function saveOptimisticCartCache(state: WpCartState) {
  globalCartState = state;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(OPTIMISTIC_CART_STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
  notifyCartListeners();
}

export async function mergeGuestCart(): Promise<WpCartState | null> {
  if (typeof window === "undefined" || isDevFallbackMode()) return null;
  const res = await commerceFetch<ContractCart>("/cart/merge", {
    method: "POST",
    includeCartToken: true,
  });
  if (res.ok && res.data && Array.isArray(res.data.items)) {
    const normalized = normalizeContractCart(res.data);
    saveOptimisticCartCache(normalized);
    return normalized;
  }
  return null;
}

let globalInitialSyncPromise: Promise<void> | null = null;

export const WpCartContext = React.createContext<WpCartContextType | null>(null);

export function useWpCart(): WpCartContextType {
  const context = React.useContext(WpCartContext);
  const [state, setState] = React.useState<WpCartState>(() => globalCartState);
  const [isOpen, setIsOpen] = React.useState(() => globalCartIsOpen);
  const [isLoading, setIsLoading] = React.useState(() => globalCartLoading);
  const [error, setError] = React.useState<string | null>(() => globalCartError);

  React.useEffect(() => {
    if (!isDevFallbackMode() && typeof window !== "undefined") {
      if (!globalInitialSyncPromise) {
        globalInitialSyncPromise = (async () => {
          globalCartLoading = true;
          notifyCartListeners();
          try {
            const res = await commerceFetch<ContractCart>("/cart", {
              method: "GET",
              contractV2: true,
              includeCartToken: true,
            });
            if (res.ok && res.data && Array.isArray(res.data.items)) {
              globalCartError = null;
              saveOptimisticCartCache(normalizeContractCart(res.data));
            }
          } catch (e: any) {
            globalCartError = e?.message || "Failed to fetch cart";
          } finally {
            globalCartLoading = false;
            notifyCartListeners();
          }
        })();
      }
    }

    const handleSync = () => {
      setState({ ...globalCartState });
      setIsOpen(globalCartIsOpen);
      setIsLoading(globalCartLoading);
      setError(globalCartError);
    };

    globalCartListeners.add(handleSync);
    return () => {
      globalCartListeners.delete(handleSync);
    };
  }, []);

  const refreshCart = React.useCallback(async () => {
    if (typeof window === "undefined" || isDevFallbackMode()) return;
    globalCartLoading = true;
    notifyCartListeners();
    try {
      const res = await commerceFetch<ContractCart>("/cart", {
        method: "GET",
        contractV2: true,
        includeCartToken: true,
      });
      if (res.ok && res.data && Array.isArray(res.data.items)) {
        globalCartError = null;
        saveOptimisticCartCache(normalizeContractCart(res.data));
      } else if (res.data && (res.data as any).message) {
        globalCartError = String((res.data as any).message);
      }
    } catch (e: any) {
      globalCartError = e?.message || "Failed to refresh cart";
    } finally {
      globalCartLoading = false;
      notifyCartListeners();
    }
  }, []);

  const openCart = React.useCallback(() => {
    globalCartIsOpen = true;
    notifyCartListeners();
  }, []);

  const closeCart = React.useCallback(() => {
    globalCartIsOpen = false;
    notifyCartListeners();
  }, []);

  const toggleCart = React.useCallback(() => {
    globalCartIsOpen = !globalCartIsOpen;
    notifyCartListeners();
  }, []);

  const addItem = React.useCallback(
    async (
      product: any,
      quantity = 1,
      variantLabelOrVariation?: string | Record<string, string>,
    ): Promise<boolean> => {
      const prodId = typeof product === "number" ? product : Number(product?.id || 0);
      const variationId =
        typeof product === "object" && product?.variationId ? Number(product.variationId) : 0;
      const variation =
        typeof variantLabelOrVariation === "object" && variantLabelOrVariation !== null
          ? variantLabelOrVariation
          : undefined;

      if (!isDevFallbackMode()) {
        globalCartLoading = true;
        globalCartIsOpen = true;
        notifyCartListeners();
        try {
          const payload: Record<string, any> = {
            productId: prodId,
            quantity,
          };
          if (variationId > 0) payload.variationId = variationId;
          if (variation && Object.keys(variation).length > 0) payload.variation = variation;

          const res = await commerceFetch<ContractCart>("/cart/items", {
            method: "POST",
            includeCartToken: true,
            body: JSON.stringify(payload),
          });
          if (res.ok && res.data && Array.isArray(res.data.items)) {
            globalCartError = null;
            saveOptimisticCartCache(normalizeContractCart(res.data));
            return true;
          }
          globalCartError =
            (res.data as any)?.message || "Could not add item to cart.";
          return false;
        } catch (e: any) {
          globalCartError = e?.message || "Could not add item to cart.";
          return false;
        } finally {
          globalCartLoading = false;
          notifyCartListeners();
        }
      }

      // Local dev simulation (no WordPress backend)
      const prodName =
        typeof product === "object" ? product.name || product.title || "Product" : "Product";
      const rawPrice = typeof product === "object" ? Number(product.price || 0) : 0;
      const minorPrice =
        typeof product === "object" && typeof product.prices?.price === "number"
          ? product.prices.price
          : Math.round(rawPrice * Math.pow(10, globalCartState.currency.minorUnit));
      const imgSrc =
        typeof product === "object"
          ? getProductDisplayUrl(product.images?.[0]) || product.featuredImage || ""
          : "";
      const key = `${prodId}::${variation ? JSON.stringify(variation) : "default"}`;
      const existing = globalCartState.items.find((i) => i.key === key);
      const newItems: WpCartLineItem[] = existing
        ? globalCartState.items.map((i) =>
            i.key === key
              ? {
                  ...i,
                  quantity: i.quantity + quantity,
                  totals: {
                    ...i.totals,
                    subtotal: (i.quantity + quantity) * i.price,
                    total: (i.quantity + quantity) * i.price,
                  },
                  lineSubtotal: (i.quantity + quantity) * i.price,
                }
              : i,
          )
        : [
            ...globalCartState.items,
            {
              key,
              id: key,
              productId: prodId,
              variationId,
              slug: typeof product === "object" ? String(product.slug || "") : "",
              path: typeof product === "object" ? String(product.path || "") : "",
              name: prodName,
              title: prodName,
              quantity,
              quantityLimits: { min: 1, max: null, step: 1 },
              variation: variation
                ? Object.entries(variation).map(([attribute, value]) => ({ attribute, value }))
                : [],
              image: { id: 0, src: imgSrc, srcset: "", alt: prodName, width: 0, height: 0 },
              featuredImage: imgSrc,
              prices: { price: minorPrice, regularPrice: minorPrice },
              price: minorPrice,
              regularPrice: minorPrice,
              totals: {
                subtotal: minorPrice * quantity,
                subtotalTax: 0,
                total: minorPrice * quantity,
                totalTax: 0,
              },
              lineSubtotal: minorPrice * quantity,
              backordered: false,
            },
          ];
      const subtotal = newItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
      globalCartIsOpen = true;
      saveOptimisticCartCache({
        ...globalCartState,
        items: newItems,
        itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
        subtotal,
        totals: { ...globalCartState.totals, subtotal, total: subtotal },
      });
      return true;
    },
    [],
  );

  const addToCart = React.useCallback(
    async (productId: number, quantity = 1, variation?: Record<string, string>) => {
      await addItem({ id: productId }, quantity, variation);
    },
    [addItem],
  );

  const addToCartBatch = React.useCallback(
    async (
      batchItems: Array<{ productId: number; quantity: number; variation?: Record<string, string> }>,
    ) => {
      for (const item of batchItems) {
        await addItem({ id: item.productId }, item.quantity, item.variation);
      }
    },
    [addItem],
  );

  const updateQuantity = React.useCallback(async (lineId: string, quantity: number) => {
    if (!isDevFallbackMode()) {
      globalCartLoading = true;
      notifyCartListeners();
      try {
        const res =
          quantity <= 0
            ? await commerceFetch<ContractCart>(`/cart/items/${encodeURIComponent(lineId)}`, {
                method: "DELETE",
                includeCartToken: true,
              })
            : await commerceFetch<ContractCart>(`/cart/items/${encodeURIComponent(lineId)}`, {
                method: "POST",
                includeCartToken: true,
                body: JSON.stringify({ quantity }),
              });
        if (res.ok && res.data && Array.isArray(res.data.items)) {
          globalCartError = null;
          saveOptimisticCartCache(normalizeContractCart(res.data));
          return true;
        }
        globalCartError = (res.data as any)?.message || "Could not update cart item.";
        return false;
      } catch (e: any) {
        globalCartError = e?.message || "Could not update cart item.";
        return false;
      } finally {
        globalCartLoading = false;
        notifyCartListeners();
      }
    }

    const newItems =
      quantity <= 0
        ? globalCartState.items.filter((i) => i.key !== lineId && i.id !== lineId)
        : globalCartState.items.map((i) =>
            i.key === lineId || i.id === lineId
              ? {
                  ...i,
                  quantity,
                  totals: { ...i.totals, subtotal: i.price * quantity, total: i.price * quantity },
                  lineSubtotal: i.price * quantity,
                }
              : i,
          );
    const subtotal = newItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
    saveOptimisticCartCache({
      ...globalCartState,
      items: newItems,
      itemCount: newItems.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      totals: { ...globalCartState.totals, subtotal, total: subtotal },
    });
    return true;
  }, []);

  const removeItem = React.useCallback(
    async (lineId: string) => updateQuantity(lineId, 0),
    [updateQuantity],
  );

  const clearCart = React.useCallback(async (options?: { localOnly?: boolean }) => {
    saveOptimisticCartCache(emptyCartState(globalCartState.currency));
    if (!isDevFallbackMode() && !options?.localOnly) {
      try {
        const res = await commerceFetch<ContractCart>("/cart/items", {
          method: "DELETE",
          includeCartToken: true,
        });
        if (res.ok && res.data && Array.isArray(res.data.items)) {
          saveOptimisticCartCache(normalizeContractCart(res.data));
        }
      } catch {}
    }
  }, []);

  const applyCoupon = React.useCallback(async (code: string) => {
    if (!code) return false;
    if (isDevFallbackMode()) {
      const upper = code.toUpperCase();
      if (!globalCartState.couponCodes.includes(upper)) {
        const coupons = [...globalCartState.coupons, { code: upper, discount: 0, discountTax: 0 }];
        saveOptimisticCartCache({
          ...globalCartState,
          coupons,
          couponCodes: coupons.map((c) => c.code),
        });
        return true;
      }
      return false;
    }

    globalCartLoading = true;
    notifyCartListeners();
    try {
      const res = await commerceFetch<ContractCart>("/cart/coupons", {
        method: "POST",
        includeCartToken: true,
        body: JSON.stringify({ code }),
      });
      if (res.ok && res.data && Array.isArray(res.data.items)) {
        globalCartError = null;
        saveOptimisticCartCache(normalizeContractCart(res.data));
        return true;
      }
      globalCartError = (res.data as any)?.message || "Invalid coupon code.";
      return false;
    } catch (e: any) {
      globalCartError = e?.message || "Could not apply coupon.";
      return false;
    } finally {
      globalCartLoading = false;
      notifyCartListeners();
    }
  }, []);

  const removeCoupon = React.useCallback(async (code: string) => {
    if (!code) return;
    if (isDevFallbackMode()) {
      const coupons = globalCartState.coupons.filter(
        (c) => c.code.toLowerCase() !== code.toLowerCase(),
      );
      saveOptimisticCartCache({
        ...globalCartState,
        coupons,
        couponCodes: coupons.map((c) => c.code.toUpperCase()),
      });
      return;
    }

    globalCartLoading = true;
    notifyCartListeners();
    try {
      const res = await commerceFetch<ContractCart>(
        `/cart/coupons/${encodeURIComponent(code)}`,
        {
          method: "DELETE",
          includeCartToken: true,
        },
      );
      if (res.ok && res.data && Array.isArray(res.data.items)) {
        globalCartError = null;
        saveOptimisticCartCache(normalizeContractCart(res.data));
      }
    } catch {} finally {
      globalCartLoading = false;
      notifyCartListeners();
    }
  }, []);

  const calculateShipping = React.useCallback(
    async (address: { country: string; city: string; postcode: string; state?: string }) => {
      if (isDevFallbackMode()) {
        saveOptimisticCartCache({
          ...globalCartState,
          shippingAddress: {
            country: address.country,
            city: address.city,
            postcode: address.postcode,
            state: address.state || "",
          },
        });
        return;
      }

      globalCartLoading = true;
      notifyCartListeners();
      try {
        const res = await commerceFetch<ContractCart>("/cart/customer", {
          method: "POST",
          includeCartToken: true,
          body: JSON.stringify({ shippingAddress: address }),
        });
        if (res.ok && res.data && Array.isArray(res.data.items)) {
          saveOptimisticCartCache(normalizeContractCart(res.data));
        }
      } catch {} finally {
        globalCartLoading = false;
        notifyCartListeners();
      }
    },
    [],
  );

  const setShippingMethod = React.useCallback(
    async (methodId: string, packageId = 0) => {
      if (isDevFallbackMode()) {
        saveOptimisticCartCache({
          ...globalCartState,
          shippingMethod: methodId,
        });
        return;
      }

      globalCartLoading = true;
      notifyCartListeners();
      try {
        const res = await commerceFetch<ContractCart>("/cart/shipping-rate", {
          method: "POST",
          includeCartToken: true,
          body: JSON.stringify({ packageId, rateId: methodId }),
        });
        if (res.ok && res.data && Array.isArray(res.data.items)) {
          saveOptimisticCartCache(normalizeContractCart(res.data));
        }
      } catch {} finally {
        globalCartLoading = false;
        notifyCartListeners();
      }
    },
    [],
  );

  if (context) return context;

  return {
    cart: state,
    items: state.items,
    itemCount: state.itemCount,
    subtotal: state.subtotal,
    cartTotal: formatMoney(state.totals.total, state.currency),
    totals: state.totals,
    coupons: state.coupons,
    couponCodes: state.couponCodes,
    currency: state.currency,
    isOpen,
    error,
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

// ── 2. Checkout Hook (§15.4) ─────────────────────────────────────────────────

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
  supports?: string[];
  flow?: "offline" | "redirect" | "client";
}

export interface CheckoutOrderResponse {
  success: boolean;
  orderId?: number;
  orderKey?: string;
  orderNumber?: string;
  status?: string;
  paymentMethod?: string;
  total?: number;
  currency?: CommerceCurrency;
  needsRedirect?: boolean;
  redirectUrl?: string;
  code?: string;
  error?: string;
}

function toContractAddress(raw: Record<string, any> | undefined | null): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const map: Record<string, string> = {
    first_name: "firstName",
    last_name: "lastName",
    address_1: "address1",
    address_2: "address2",
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    out[map[k] || k] = String(v);
  }
  return out;
}

export async function fetchCheckoutOrder(id: number, orderKey: string): Promise<any | null> {
  if (isDevFallbackMode()) return null;
  const res = await commerceFetch("/checkout/order", {
    method: "GET",
    includeCartToken: false,
    params: { id, key: orderKey },
  });
  return res.ok ? res.data : null;
}

export async function submitCheckoutOrder(
  params: {
    billingAddress: Record<string, string>;
    shippingAddress?: Record<string, string>;
    paymentMethod: string;
    paymentData?: Array<{ key: string; value: string }>;
    customerNote?: string;
    createAccount?: boolean;
  },
  onClearCart?: () => Promise<void>,
): Promise<CheckoutOrderResponse> {
  const res = await commerceFetch<any>("/checkout", {
    method: "POST",
    includeCartToken: true,
    body: JSON.stringify({
      billingAddress: toContractAddress(params.billingAddress),
      shippingAddress:
        params.shippingAddress && Object.keys(params.shippingAddress).length > 0
          ? toContractAddress(params.shippingAddress)
          : toContractAddress(params.billingAddress),
      paymentMethod: params.paymentMethod,
      paymentData: params.paymentData || [],
      customerNote: params.customerNote || "",
      createAccount: Boolean(params.createAccount),
    }),
  });

  if (res.ok && res.data) {
    const needsRedirect = Boolean(res.data.needsRedirect);
    if (!needsRedirect && onClearCart) {
      await onClearCart();
    }
    return {
      success: true,
      orderId: res.data.orderId,
      orderKey: res.data.orderKey,
      orderNumber: res.data.orderNumber,
      status: res.data.status,
      paymentMethod: res.data.paymentMethod,
      total: res.data.total,
      currency: res.data.currency,
      needsRedirect,
      redirectUrl: res.data.redirectUrl || "/checkout/order-received",
    };
  }

  return {
    success: false,
    code: res.data?.code,
    error: res.data?.message || "Failed to process order. Please try again.",
  };
}

export function useWpCheckout() {
  const cartContext = useWpCart();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paymentGateways, setPaymentGateways] = React.useState<PaymentGateway[]>(
    isDevFallbackMode()
      ? [
          {
            id: "cod",
            title: "Cash on Delivery",
            description: "Pay with cash upon delivery of your order.",
            flow: "offline",
          },
          {
            id: "bacs",
            title: "Direct Bank Transfer",
            description: "Make your payment directly into our bank account.",
            flow: "offline",
          },
        ]
      : [],
  );

  const shippingMethods: ShippingMethod[] = React.useMemo(() => {
    const pkg = cartContext.cart.shippingPackages?.[0];
    if (pkg && Array.isArray(pkg.rates) && pkg.rates.length > 0) {
      return pkg.rates.map((r) => ({
        id: r.id,
        title: r.label,
        cost: r.cost,
        description: formatMoney(r.cost, cartContext.currency),
      }));
    }
    return [
      { id: "flat_rate", title: "Flat Rate Shipping", cost: 1000, description: "Standard ground delivery" },
      { id: "free_shipping", title: "Free Shipping", cost: 0, description: "Orders over minimum threshold" },
      { id: "local_pickup", title: "Local Pickup", cost: 0, description: "Pickup from store location" },
    ];
  }, [cartContext.cart.shippingPackages, cartContext.currency]);

  React.useEffect(() => {
    if (!isDevFallbackMode() && typeof window !== "undefined") {
      commerceFetch<{ gateways?: PaymentGateway[] }>("/checkout/gateways", {
        method: "GET",
        includeCartToken: true,
      })
        .then((res) => {
          if (res.ok && res.data?.gateways && Array.isArray(res.data.gateways)) {
            setPaymentGateways(res.data.gateways);
          }
        })
        .catch(() => {});
    }
  }, []);

  const processOrder = async (
    billingAddress: Record<string, string>,
    shippingAddress: Record<string, string>,
    gatewayId: string,
    customerNote = "",
    extra?: {
      paymentData?: Array<{ key: string; value: string }>;
      createAccount?: boolean;
    },
  ): Promise<CheckoutOrderResponse> => {
    setIsSubmitting(true);
    setError(null);

    if (!isDevFallbackMode()) {
      try {
        const result = await submitCheckoutOrder(
          {
            billingAddress,
            shippingAddress,
            paymentMethod: gatewayId,
            paymentData: extra?.paymentData,
            customerNote,
            createAccount: extra?.createAccount,
          },
          () => cartContext.clearCart({ localOnly: true }),
        );
        if (!result.success && result.error) {
          setError(result.error);
        }
        setIsSubmitting(false);
        return result;
      } catch (err: any) {
        const msg = err.message || "Failed to process order. Please try again.";
        setError(msg);
        setIsSubmitting(false);
        return { success: false, error: msg };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    const normBilling = toContractAddress(billingAddress);
    if (!normBilling.firstName || !normBilling.email || !normBilling.address1) {
      const msg = "Please complete all required billing fields.";
      setError(msg);
      setIsSubmitting(false);
      return { success: false, error: msg };
    }

    await cartContext.clearCart({ localOnly: true });
    setIsSubmitting(false);
    return {
      success: true,
      orderId: Math.floor(100000 + Math.random() * 90000),
      needsRedirect: false,
      redirectUrl: "/checkout/order-received",
    };
  };

  return {
    shippingMethods,
    paymentGateways,
    processOrder,
    fetchCheckoutOrder,
    isSubmitting,
    error,
  };
}

// ── 3. Customer & Accounts Hook (§15.5) ──────────────────────────────────────

export interface CustomerAddress {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  email?: string;
}

export interface CustomerProfile {
  username?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  billing: Record<string, string>;
  shipping: Record<string, string>;
}

export interface OrderRecord {
  id: number;
  number?: string;
  orderNumber?: string;
  date: string;
  status: string;
  statusLabel?: string;
  total: number | string;
  itemCount?: number;
  itemsCount?: number;
  path?: string;
  currency?: CommerceCurrency | string;
  items?: Array<{
    id?: number;
    productId?: number;
    variationId?: number;
    name?: string;
    title?: string;
    quantity?: number;
    qty?: number;
    totals?: { subtotal: number; total: number; tax: number };
    image?: ContractCartImage;
    downloadable?: boolean;
  }>;
  downloadableFiles?: Array<{ name: string; url: string }>;
  viewUrl?: string;
}

export interface CustomerDownloadRecord {
  productId: number;
  name: string;
  downloadName: string;
  url: string;
  remaining: number | string | null;
  expires: string | null;
}

export function useWpCustomer() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [customer, setCustomer] = React.useState<CustomerProfile | null>(null);
  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [downloads, setDownloads] = React.useState<CustomerDownloadRecord[]>([]);
  const [currency, setCurrency] = React.useState<CommerceCurrency>(() =>
    getHydratedCommerceCurrency(),
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchCustomerData = React.useCallback(async () => {
    if (typeof window === "undefined" || IS_DEV) return;
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, dlRes, profileRes, addressRes] = await Promise.all([
        commerceFetch<{ items?: OrderRecord[]; currency?: CommerceCurrency }>(
          "/customer/orders",
          { method: "GET", contractV2: true, includeCartToken: false },
        ),
        commerceFetch<{ items?: CustomerDownloadRecord[] }>("/customer/downloads", {
          method: "GET",
          contractV2: true,
          includeCartToken: false,
        }),
        commerceFetch<CustomerProfile>("/customer/profile", {
          method: "GET",
          includeCartToken: false,
        }),
        commerceFetch<{ billing?: Record<string, string>; shipping?: Record<string, string> }>(
          "/customer/address",
          { method: "GET", includeCartToken: false },
        ),
      ]);

      if (ordersRes.status === 401) {
        setIsLoggedIn(false);
      } else if (ordersRes.ok && ordersRes.data) {
        setIsLoggedIn(true);
        if (ordersRes.data.currency) setCurrency(ordersRes.data.currency);
        if (Array.isArray(ordersRes.data.items)) {
          setOrders(ordersRes.data.items);
        }
      }
      if (dlRes.ok && dlRes.data && Array.isArray(dlRes.data.items)) {
        setDownloads(dlRes.data.items);
      }
      if (profileRes.ok && profileRes.data) {
        const addr = addressRes.ok && addressRes.data ? addressRes.data : {};
        const prof: CustomerProfile = {
          firstName: profileRes.data.firstName || "",
          lastName: profileRes.data.lastName || "",
          displayName: profileRes.data.displayName || "",
          email: profileRes.data.email || "",
          first_name: profileRes.data.firstName || "",
          last_name: profileRes.data.lastName || "",
          billing: addr.billing || {},
          shipping: addr.shipping || {},
        };
        setCustomer(prof);
        setIsLoggedIn(true);
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch customer data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      fetchCustomerData();
    }
  }, [fetchCustomerData]);

  const getOrder = React.useCallback(async (orderId: number) => {
    if (IS_DEV) return null;
    const res = await commerceFetch(`/customer/orders/${encodeURIComponent(String(orderId))}`, {
      method: "GET",
      contractV2: true,
      includeCartToken: false,
    });
    return res.ok ? res.data : null;
  }, []);

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
        const res = await commerceFetch<any>("/auth/login", {
          method: "POST",
          includeCartToken: true,
          body: JSON.stringify({ username: userEmail, password: pass }),
        });
        const data = res.data;
        if (res.ok && data?.user) {
          if (data.token) {
            window.localStorage.setItem("forgewp_jwt_token", data.token);
          }
          const prof: CustomerProfile = {
            username: data.user.username || data.user.slug || userEmail,
            email: data.user.email || userEmail,
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            displayName: data.user.displayName || "",
            first_name: data.user.firstName || "",
            last_name: data.user.lastName || "",
            billing: data.user.billing || {},
            shipping: data.user.shipping || {},
          };
          setCustomer(prof);
          setIsLoggedIn(true);
          if (getCartToken()) {
            await mergeGuestCart();
          }
          await fetchCustomerData();
          setLoading(false);
          return true;
        }
        setLoading(false);
        const msg = data?.message || "Login failed. Please check credentials.";
        setError(msg);
        throw new Error(msg);
      } catch (err: any) {
        setLoading(false);
        setError(err.message || "Login failed.");
        throw err;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    const mockProfile: CustomerProfile = {
      username: userEmail.split("@")[0],
      email: userEmail,
      firstName: "Customer",
      lastName: "",
      first_name: "Customer",
      last_name: "",
      billing: { firstName: "Customer", email: userEmail },
      shipping: { firstName: "Customer" },
    };
    setCustomer(mockProfile);
    setIsLoggedIn(true);
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
        const res = await commerceFetch<any>("/auth/signup", {
          method: "POST",
          includeCartToken: true,
          body: JSON.stringify({ username, email, password: pass }),
        });
        const data = res.data;
        if (res.ok && data?.user) {
          if (data.token) {
            window.localStorage.setItem("forgewp_jwt_token", data.token);
          }
          const prof: CustomerProfile = {
            username: data.user.username || username,
            email: data.user.email || email,
            firstName: data.user.firstName || username,
            lastName: data.user.lastName || "",
            first_name: data.user.firstName || username,
            last_name: data.user.lastName || "",
            billing: { firstName: username, email },
            shipping: { firstName: username },
          };
          setCustomer(prof);
          setIsLoggedIn(true);
          setLoading(false);
          return true;
        }
        setLoading(false);
        const msg = data?.message || "Registration failed.";
        setError(msg);
        throw new Error(msg);
      } catch (err: any) {
        setLoading(false);
        setError(err.message || "Registration failed.");
        throw err;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    const mockProfile: CustomerProfile = {
      username,
      email,
      firstName: username,
      lastName: "",
      first_name: username,
      last_name: "",
      billing: { firstName: username, email, country: "US" },
      shipping: { firstName: username, country: "US" },
    };
    setCustomer(mockProfile);
    setIsLoggedIn(true);
    setLoading(false);
    return true;
  };

  const logout = () => {
    if (!IS_DEV && typeof window !== "undefined") {
      commerceFetch("/auth/logout", {
        method: "POST",
        includeCartToken: false,
      }).catch(() => {});
      window.localStorage.removeItem("forgewp_jwt_token");
      clearGuestCartToken();
    }
    setCustomer(null);
    setIsLoggedIn(false);
    setOrders([]);
    setDownloads([]);
    setError(null);
  };

  const updateProfile = async (data: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    email?: string;
  }): Promise<{ success: boolean; message: string; customer?: CustomerProfile }> => {
    setLoading(true);
    setError(null);
    if (!IS_DEV && typeof window !== "undefined") {
      try {
        const res = await commerceFetch<any>("/customer/profile", {
          method: "POST",
          contractV2: true,
          includeCartToken: false,
          body: JSON.stringify(data),
        });
        if (res.ok && res.data) {
          const prof: CustomerProfile = {
            ...(customer || { billing: {}, shipping: {} }),
            firstName: res.data.firstName || "",
            lastName: res.data.lastName || "",
            displayName: res.data.displayName || "",
            email: res.data.email || "",
            first_name: res.data.firstName || "",
            last_name: res.data.lastName || "",
          };
          setCustomer(prof);
          setLoading(false);
          return { success: true, message: "Profile updated successfully.", customer: prof };
        }
        setLoading(false);
        const msg = res.data?.message || "Failed to update profile.";
        setError(msg);
        throw new Error(msg);
      } catch (err: any) {
        setLoading(false);
        setError(err.message || "Failed to update profile.");
        throw err;
      }
    }

    const updated: CustomerProfile = {
      ...(customer || {
        username: "dev_user",
        email: data.email || "dev@example.com",
        firstName: data.firstName || "Customer",
        lastName: data.lastName || "",
        billing: {},
        shipping: {},
      }),
      ...(data.firstName !== undefined ? { firstName: data.firstName, first_name: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName, last_name: data.lastName } : {}),
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    };
    setCustomer(updated);
    setLoading(false);
    return { success: true, message: "Profile updated.", customer: updated };
  };

  const updateAddress = async (data: {
    billing?: Record<string, string>;
    shipping?: Record<string, string>;
    type?: "shipping" | "billing";
    [key: string]: any;
  }): Promise<{ success: boolean; message: string; customer?: CustomerProfile }> => {
    setLoading(true);
    setError(null);
    const payload: Record<string, any> = {};
    if (data.billing || data.shipping) {
      if (data.billing) payload.billing = toContractAddress(data.billing);
      if (data.shipping) payload.shipping = toContractAddress(data.shipping);
    } else {
      const target = data.type === "billing" ? "billing" : "shipping";
      const mapped = toContractAddress(data);
      if (mapped.street && !mapped.address1) mapped.address1 = mapped.street;
      if (mapped.postalCode && !mapped.postcode) mapped.postcode = mapped.postalCode;
      payload[target] = mapped;
    }

    if (!IS_DEV && typeof window !== "undefined") {
      try {
        const res = await commerceFetch<any>("/customer/address", {
          method: "POST",
          contractV2: true,
          includeCartToken: false,
          body: JSON.stringify(payload),
        });
        if (res.ok && res.data) {
          const prof: CustomerProfile = {
            ...(customer || { firstName: "", lastName: "", email: "" }),
            billing: res.data.billing || customer?.billing || {},
            shipping: res.data.shipping || customer?.shipping || {},
          };
          setCustomer(prof);
          setLoading(false);
          return { success: true, message: "Address saved successfully.", customer: prof };
        }
        setLoading(false);
        const msg = res.data?.message || "Failed to update address.";
        setError(msg);
        throw new Error(msg);
      } catch (err: any) {
        setLoading(false);
        setError(err.message || "Failed to update address.");
        throw err;
      }
    }

    const updated: CustomerProfile = {
      ...(customer || {
        username: "dev_user",
        email: "dev@example.com",
        firstName: "Customer",
        lastName: "",
        billing: {},
        shipping: {},
      }),
      ...(payload.billing ? { billing: payload.billing } : {}),
      ...(payload.shipping ? { shipping: payload.shipping } : {}),
    };
    setCustomer(updated);
    setLoading(false);
    return { success: true, message: "Address saved.", customer: updated };
  };

  return {
    isLoggedIn,
    customer,
    orders,
    downloads,
    currency,
    getOrder,
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
    search: "",
  });

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const categories: string[] = [];
      const tags: string[] = [];
      const attributes: Record<string, string[]> = {};
      const priceRange: [number, number] = [0, 100];
      let sortBy = "date";
      let search = "";

      params.forEach((value, key) => {
        if (key === "product_cat") categories.push(value);
        else if (key === "product_tag") tags.push(value);
        else if (key === "orderby") sortBy = value;
        else if (key === "s" || key === "q") search = value;
        else if (key === "min_price") priceRange[0] = parseFloat(value);
        else if (key === "max_price") priceRange[1] = parseFloat(value);
        else if (key.startsWith("filter_")) {
          attributes[key.replace("filter_", "")] = value.split(",");
        }
      });

      setActiveFilters({ categories, tags, attributes, priceRange, sortBy, search });
    }
  }, []);

  const updateUrl = (filters: ActiveFiltersState) => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      filters.categories.forEach((c) => params.append("product_cat", c));
      filters.tags.forEach((t) => params.append("product_tag", t));
      Object.entries(filters.attributes).forEach(([name, vals]) => {
        if (vals.length > 0) params.append(`filter_${name}`, vals.join(","));
      });
      if (filters.priceRange[0] > 0) params.append("min_price", String(filters.priceRange[0]));
      if (filters.priceRange[1] < 100) params.append("max_price", String(filters.priceRange[1]));
      if (filters.sortBy !== "date") params.append("orderby", filters.sortBy);
      if (filters.search) params.append("s", filters.search);
      const newSearch = params.toString();
      window.history.pushState(null, "", `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`);
    }
  };

  const setFilter = (type: "category" | "tag" | string, value: string, active: boolean) => {
    setActiveFilters((prev) => {
      let updated: ActiveFiltersState;
      if (type === "category") {
        updated = {
          ...prev,
          categories: active
            ? [...prev.categories, value]
            : prev.categories.filter((c) => c !== value),
        };
      } else if (type === "tag") {
        updated = {
          ...prev,
          tags: active ? [...prev.tags, value] : prev.tags.filter((t) => t !== value),
        };
      } else {
        const currentVals = prev.attributes[type] || [];
        const updatedVals = active
          ? [...currentVals, value]
          : currentVals.filter((v) => v !== value);
        const attributes = { ...prev.attributes, [type]: updatedVals };
        if (updatedVals.length === 0) delete attributes[type];
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
      search: "",
    };
    setActiveFilters(cleared);
    updateUrl(cleared);
  };

  return { activeFilters, setFilter, setPriceRange, setSortBy, resetFilters };
}

// ── 5. Wishlist / Favorites Hook (§15.5) ────────────────────────────────────

export function useWpWishlist() {
  const [wishlist, setWishlist] = React.useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("forgewp-wishlist");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchWishlist = React.useCallback(async () => {
    if (typeof window === "undefined" || IS_DEV) return;
    try {
      setLoading(true);
      setError(null);
      const res = await commerceFetch<{ items?: number[]; wishlist?: number[] }>("/wishlist", {
        method: "GET",
        contractV2: true,
        includeCartToken: false,
      });

      if (res.ok && res.data) {
        const items = Array.isArray(res.data.items)
          ? res.data.items
          : Array.isArray(res.data.wishlist)
            ? res.data.wishlist
            : [];
        if (items.length > 0) {
          setWishlist(items);
          window.localStorage.setItem("forgewp-wishlist", JSON.stringify(items));
        } else if (wishlist.length > 0) {
          const mergeRes = await commerceFetch<{ items?: number[] }>("/wishlist/merge", {
            method: "POST",
            includeCartToken: false,
            body: JSON.stringify({ items: wishlist }),
          });
          if (mergeRes.ok && Array.isArray(mergeRes.data?.items)) {
            setWishlist(mergeRes.data.items);
            window.localStorage.setItem("forgewp-wishlist", JSON.stringify(mergeRes.data.items));
          }
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to fetch wishlist.");
    } finally {
      setLoading(false);
    }
  }, [wishlist]);

  React.useEffect(() => {
    fetchWishlist();
  }, []);

  const isWishlisted = React.useCallback(
    (id: number) => wishlist.includes(Number(id)),
    [wishlist],
  );

  const toggleWishlist = React.useCallback(
    async (
      id: number,
    ): Promise<{ success: boolean; isWishlisted: boolean; wishlist: number[] }> => {
      const numId = Number(id);
      const wasWishlisted = wishlist.includes(numId);
      const willBeWishlisted = !wasWishlisted;
      const next = willBeWishlisted
        ? [...wishlist, numId]
        : wishlist.filter((x) => x !== numId);

      setWishlist(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("forgewp-wishlist", JSON.stringify(next));
      }

      if (!IS_DEV && typeof window !== "undefined") {
        try {
          const res = willBeWishlisted
            ? await commerceFetch<{ items?: number[] }>("/wishlist/items", {
                method: "POST",
                includeCartToken: false,
                body: JSON.stringify({ productId: numId }),
              })
            : await commerceFetch<{ items?: number[] }>(
                `/wishlist/items/${encodeURIComponent(String(numId))}`,
                {
                  method: "DELETE",
                  includeCartToken: false,
                },
              );
          if (res.ok && Array.isArray(res.data?.items)) {
            setWishlist(res.data.items);
            window.localStorage.setItem("forgewp-wishlist", JSON.stringify(res.data.items));
            return {
              success: true,
              isWishlisted: res.data.items.includes(numId),
              wishlist: res.data.items,
            };
          }
        } catch (err: any) {
          setError(err.message || "Failed to toggle wishlist.");
        }
      }

      return {
        success: true,
        isWishlisted: willBeWishlisted,
        wishlist: next,
      };
    },
    [wishlist],
  );

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
    return "__FORGEWP_PRODUCT_PRICE__";
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
    return "__FORGEWP_PRODUCT_SKU__";
  }
  const post = React.useContext(WpPostContext);
  if (!post || post.__postType !== "product") return "SKU-MOCK";
  return post.customFields?.sku || "";
}

export function useWpProductRating(): string {
  if (!IS_DEV) {
    return "__FORGEWP_PRODUCT_RATING__";
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
  customOptions?: Partial<WpCurrencySettings>,
): string {
  const base = getHydratedCommerceCurrency();
  const decimals =
    typeof customOptions?.decimals === "number" ? customOptions.decimals : base.minorUnit;
  const symbol = customOptions?.currencySymbol ?? base.symbol;
  const pos = customOptions?.currencyPosition;
  const currency: CommerceCurrency = {
    code: customOptions?.currencyCode ?? base.code,
    symbol,
    minorUnit: decimals,
    decimalSeparator: customOptions?.decimalSeparator ?? base.decimalSeparator,
    thousandSeparator: customOptions?.thousandSeparator ?? base.thousandSeparator,
    prefix:
      pos !== undefined
        ? pos === "left"
          ? symbol
          : pos === "left_space"
            ? `${symbol} `
            : ""
        : base.prefix,
    suffix:
      pos !== undefined
        ? pos === "right"
          ? symbol
          : pos === "right_space"
            ? ` ${symbol}`
            : ""
        : base.suffix,
  };
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || "0"));
  if (Number.isNaN(num)) return formatMoney(0, currency);
  const minor = Math.round(num * Math.pow(10, currency.minorUnit));
  return formatMoney(minor, currency);
}

export function useWpCurrency(): WpCurrencySettings & {
  formatPrice: (amount: number | string, customOptions?: Partial<WpCurrencySettings>) => string;
  formatMoney: (amountMinorUnits: number, currency?: Partial<CommerceCurrency>) => string;
} {
  const settings = React.useMemo<WpCurrencySettings>(() => {
    const cur = getHydratedCommerceCurrency();
    const pos: WpCurrencySettings["currencyPosition"] = cur.suffix.startsWith(" ")
      ? "right_space"
      : cur.suffix
        ? "right"
        : cur.prefix.endsWith(" ")
          ? "left_space"
          : "left";
    return {
      currencyCode: cur.code,
      currencySymbol: cur.symbol,
      currencyPosition: pos,
      thousandSeparator: cur.thousandSeparator,
      decimalSeparator: cur.decimalSeparator,
      decimals: cur.minorUnit,
    };
  }, []);

  const formatPrice = React.useCallback(
    (amount: number | string, customOptions?: Partial<WpCurrencySettings>): string =>
      formatWpPrice(amount, { ...settings, ...customOptions }),
    [settings],
  );

  return {
    ...settings,
    formatPrice,
    formatMoney,
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
  productOrId: WooCommerceProduct | number | string | null,
): UseWpProductVariationsReturn {
  const isDirectProduct = typeof productOrId === "object" && productOrId !== null;
  const productId = isDirectProduct
    ? (productOrId as WooCommerceProduct).id
    : (productOrId as number | string);
  const { product: fetchedProduct } = useWpProduct(isDirectProduct ? 0 : productId || 0);

  const product: WooCommerceProduct | null = isDirectProduct
    ? (productOrId as WooCommerceProduct)
    : fetchedProduct;

  const [selectedAttributes, setSelectedAttributes] = React.useState<Record<string, string>>({});
  const attributes = React.useMemo(() => product?.attributes || [], [product]);
  const variations = React.useMemo(() => product?.variations || [], [product]);

  const attrKey = React.useCallback(
    (attr: ProductAttribute) => attr.slug || attr.name,
    [],
  );

  const findMatch = React.useCallback(
    (sel: Record<string, string>) =>
      variations.find((v) =>
        Object.entries(sel).every(([attr, val]) => v.attributes[attr] === val),
      ) || null,
    [variations],
  );

  const setAttribute = React.useCallback(
    (name: string, value: string) => {
      setSelectedAttributes((prev) => {
        const next = { ...prev, [name]: value };
        const match = product ? findMatch(next) : null;
        if (match && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(`forgewp-variation-selected-${product!.id}`, { detail: match }),
          );
        }
        return next;
      });
    },
    [product, findMatch],
  );

  const setAttributes = React.useCallback(
    (attrs: Record<string, string>) => {
      setSelectedAttributes(attrs);
      const match = product ? findMatch(attrs) : null;
      if (match && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(`forgewp-variation-selected-${product!.id}`, { detail: match }),
        );
      }
    },
    [product, findMatch],
  );

  const resetAttributes = React.useCallback(() => {
    setSelectedAttributes({});
  }, []);

  const isSelectionComplete = React.useMemo(() => {
    if (attributes.length === 0) return true;
    return attributes.every(
      (attr) => Boolean(selectedAttributes[attrKey(attr)] || selectedAttributes[attr.name]),
    );
  }, [attributes, selectedAttributes, attrKey]);

  const matchingVariation = React.useMemo(() => {
    if (!isSelectionComplete || variations.length === 0) return null;
    return findMatch(selectedAttributes);
  }, [isSelectionComplete, variations, selectedAttributes, findMatch]);

  const currentPrice = React.useMemo(() => {
    if (matchingVariation) {
      if (typeof matchingVariation.prices?.price === "number") {
        return formatMoney(matchingVariation.prices.price, product?.currency);
      }
      return String(matchingVariation.price ?? "");
    }
    if (typeof product?.prices?.price === "number") {
      return formatMoney(product.prices.price, product.currency);
    }
    return String(product?.price ?? "0");
  }, [matchingVariation, product]);

  const currentRegularPrice = React.useMemo(() => {
    if (typeof matchingVariation?.prices?.regularPrice === "number") {
      return formatMoney(matchingVariation.prices.regularPrice, product?.currency);
    }
    if (matchingVariation?.regular_price !== undefined) {
      return String(matchingVariation.regular_price);
    }
    if (typeof product?.prices?.regularPrice === "number") {
      return formatMoney(product.prices.regularPrice, product.currency);
    }
    if (product?.regular_price !== undefined) {
      return String(product.regular_price);
    }
    return undefined;
  }, [matchingVariation, product]);

  const currentImage = React.useMemo(() => {
    if (matchingVariation?.image) {
      const src = getProductDisplayUrl(matchingVariation.image);
      if (src) return src;
    }
    return product?.featuredImage || getProductDisplayUrl(product?.images?.[0]) || "";
  }, [matchingVariation, product]);

  const currentStockStatus = React.useMemo<"instock" | "outofstock" | "onbackorder">(() => {
    if (matchingVariation) {
      return matchingVariation.stock?.status || matchingVariation.stock_status || "instock";
    }
    return product?.stock?.status || product?.stock_status || "instock";
  }, [matchingVariation, product]);

  const isOutOfStock = currentStockStatus === "outofstock";
  const isOnSale = Boolean(
    matchingVariation?.prices?.onSale ?? product?.prices?.onSale ?? product?.on_sale,
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

export type ReviewSortOption = "newest" | "oldest" | "highest" | "lowest";

export interface UseWpProductReviewsOptions {
  perPage?: number;
  initialSort?: ReviewSortOption;
}

export interface UseWpProductReviewsReturn {
  reviews: ProductReview[];
  userReview: ProductReview | null;
  otherReviews: ProductReview[];
  ratingCount: number;
  averageRating: string;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  sort: ReviewSortOption;
  setSort: (sort: ReviewSortOption) => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalReviews: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;
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
  options?: UseWpProductReviewsOptions,
): UseWpProductReviewsReturn {
  const perPage = options?.perPage || 5;
  const initialSort = options?.initialSort || "newest";

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
  const [serverAvgRating, setServerAvgRating] = React.useState<string>("0.0");

  const [loading, setLoading] = React.useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const effectiveProductId = React.useMemo(() => {
    if (typeof window !== "undefined" && (window as any).forgeWpHydration?.post?.id) {
      return Number((window as any).forgeWpHydration.post.id);
    }
    return typeof productId === "number" ? productId : 0;
  }, [productId]);

  const fetchPage = React.useCallback(
    async (pageToLoad: number, sortOption: ReviewSortOption, append = false) => {
      if (append) setIsLoadingMore(true);
      else setLoading(true);
      setError(null);

      if (typeof window !== "undefined" && !IS_DEV && effectiveProductId) {
        try {
          const res = await commerceFetch<any>(
            `/products/${effectiveProductId}/reviews`,
            {
              method: "GET",
              includeCartToken: false,
              params: { sort: sortOption, page: pageToLoad, per_page: perPage },
            },
          );
          if (res.ok && res.data) {
            const data = res.data;
            if (append) setReviews((prev) => [...prev, ...(data.reviews || [])]);
            else setReviews(data.reviews || []);
            if (data.userReview !== undefined) setUserReview(data.userReview);
            if (data.ratingBreakdown) setRatingBreakdown(data.ratingBreakdown);
            if (data.totalPages !== undefined) setTotalPages(data.totalPages);
            if (data.totalReviews !== undefined) setTotalReviews(data.totalReviews);
            if (data.ratingCount !== undefined) setServerRatingCount(data.ratingCount);
            if (data.averageRating !== undefined) setServerAvgRating(data.averageRating);
          }
        } catch (e: any) {
          setError(e.message || "Failed to load reviews.");
        } finally {
          setLoading(false);
          setIsLoadingMore(false);
        }
        return;
      }

      const baseReviews: ProductReview[] = product?.reviews || [];
      const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      baseReviews.forEach((r) => {
        const star = Math.max(1, Math.min(5, r.rating || 5)) as 1 | 2 | 3 | 4 | 5;
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
      if (append) setReviews((prev) => [...prev, ...paginated]);
      else setReviews(paginated);
      setRatingBreakdown(breakdown);
      setTotalPages(pages);
      setTotalReviews(totalCount);
      setServerRatingCount(totalCount);
      setServerAvgRating(totalCount > 0 ? (sum / totalCount).toFixed(2) : "0.00");
      setLoading(false);
      setIsLoadingMore(false);
    },
    [effectiveProductId, perPage, product],
  );

  React.useEffect(() => {
    setPageState(1);
    fetchPage(1, sort, false);
  }, [fetchPage, sort]);

  const setSort = React.useCallback((newSort: ReviewSortOption) => {
    setSortState(newSort);
    setPageState(1);
  }, []);

  const setPage = React.useCallback(
    (newPage: number) => {
      setPageState(newPage);
      fetchPage(newPage, sort, false);
    },
    [fetchPage, sort],
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
          const userEmail =
            email || (author ? `${author.toLowerCase().replace(/\s+/g, "")}@example.com` : "");
          const res = await commerceFetch<any>(
            `/products/${effectiveProductId || productId}/reviews`,
            {
              method: "POST",
              includeCartToken: false,
              body: JSON.stringify({
                author: author || "Customer",
                email: userEmail,
                content,
                rating: Number(rating) || 5,
              }),
            },
          );
          if (res.ok && res.data?.success && res.data?.review) {
            setUserReview(res.data.review);
            setIsSubmitting(false);
            await fetchPage(1, sort, false);
            return true;
          }
          setError(res.data?.message || "Failed to submit review. Please try again.");
          setIsSubmitting(false);
          return false;
        } catch (err: any) {
          setError(err.message || "An unexpected error occurred.");
          setIsSubmitting(false);
          return false;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
      setUserReview({
        id: userReview?.id || Date.now(),
        author: author || "Customer",
        content,
        rating: rating || 5,
        date: new Date().toISOString().split("T")[0],
        verified: true,
      });
      setIsSubmitting(false);
      return true;
    },
    [effectiveProductId, productId, userReview, fetchPage, sort],
  );

  const deleteReview = React.useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    if (!IS_DEV) {
      try {
        const res = await commerceFetch<any>(
          `/products/${effectiveProductId || productId}/reviews`,
          {
            method: "DELETE",
            includeCartToken: false,
          },
        );
        if (res.ok && res.data?.success) {
          setUserReview(null);
          setIsDeleting(false);
          await fetchPage(1, sort, false);
          return true;
        }
        setError(res.data?.message || "Failed to delete review.");
        setIsDeleting(false);
        return false;
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        setIsDeleting(false);
        return false;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    setUserReview(null);
    setIsDeleting(false);
    return true;
  }, [effectiveProductId, productId, fetchPage, sort]);

  const otherReviews = React.useMemo(() => {
    if (!userReview) return reviews;
    return reviews.filter((r) => r.id !== userReview.id);
  }, [reviews, userReview]);

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
    hasMore: page < totalPages,
    loadMore,
    isLoadingMore,
    isEditing: Boolean(userReview),
    isSubmitting,
    isDeleting,
    loading: loading || productLoading,
    error,
    submitReview,
    deleteReview,
    refreshReviews,
  };
}
