// Pure, React-free helpers, types, and REST transport for @forgewp/woocommerce.
// Safe to import and execute directly inside Next.js App Router Server Components.

export function readRuntimeEnv(key: string): string {
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

export function hasRuntimeWpUrl(): boolean {
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

export function isDevFallbackMode(): boolean {
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

// ── Product Types & Helpers ───────────────────────────────────────────────────

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

export function normalizeProductRecord(raw: any, currency?: CommerceCurrency): WooCommerceProduct {
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

// ── Cart Contract Types & Normalizers (§15.3) ────────────────────────────────

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

export function emptyCartState(
  currency: CommerceCurrency = getHydratedCommerceCurrency(),
): WpCartState {
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

// ── Checkout Helpers (§15.4) ─────────────────────────────────────────────────

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

export function toContractAddress(
  raw: Record<string, any> | undefined | null,
): Record<string, string> {
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

// ── Currency Price Formatter (§15.1) ─────────────────────────────────────────

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
