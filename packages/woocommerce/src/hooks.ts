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

export interface ProductVariation {
  id: number;
  attributes: Record<string, string>;
  price: string;
  regular_price: string;
  stock_status: "instock" | "outofstock" | "onbackorder";
  image?: { id?: number; url: string };
}

export interface ProductAttribute {
  name: string;
  options: string[];
}

export interface ProductReview {
  id: number;
  author: string;
  content: string;
  rating: number;
  date: string;
}

export interface WooCommerceProduct {
  id: number;
  type: ProductType;
  title: string;
  excerpt: string;
  content: string;
  price: string;
  regular_price?: string;
  on_sale?: boolean;
  sku: string;
  stock_status: "instock" | "outofstock" | "onbackorder";
  featuredImage: string;
  images?: Array<{ id?: number; url: string }>;
  attributes?: ProductAttribute[];
  variations?: ProductVariation[];
  grouped_products?: number[];
  external_url?: string;
  button_text?: string;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: Array<{ name: string; url: string }>;
  average_rating: string;
  rating_count: number;
  reviews: ProductReview[];
  _terms?: {
    product_cat?: Array<{ id: number; slug: string; name: string }>;
    product_tag?: Array<{ id: number; slug: string; name: string }>;
  };
}

export function useWpProducts(): { products: WooCommerceProduct[]; loading: boolean; error: string | null } {
  const [products, setProducts] = React.useState<WooCommerceProduct[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const mockProds = window._forgeWpMockPosts?.["product"] || [];
      setProducts(mockProds);
      setLoading(false);
    }
  }, []);

  return { products, loading, error: null };
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

export const WpCartContext = React.createContext<{
  cart: CartState;
  itemCount: number;
  cartTotal: string;
  addToCart: (productId: number, quantity: number, variation?: Record<string, string>) => Promise<void>;
  addToCartBatch: (items: Array<{ productId: number; quantity: number; variation?: Record<string, string> }>) => Promise<void>;
  updateQuantity: (key: string, qty: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: (code: string) => Promise<void>;
  calculateShipping: (address: { country: string; city: string; postcode: string }) => Promise<void>;
  setShippingMethod: (methodId: string) => void;
  isLoading: boolean;
  clearCart: () => void;
} | null>(null);

export function useWpCart() {
  const context = React.useContext(WpCartContext);
  if (!context) {
    throw new Error("useWpCart must be used within a WpCartProvider");
  }
  return context;
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
}

export function useWpCheckout() {
  const cartContext = useWpCart();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const shippingMethods: ShippingMethod[] = [
    { id: "flat_rate", title: "Flat Rate Shipping", cost: 10.0, description: "Standard ground delivery (3-5 business days)" },
    { id: "free_shipping", title: "Free Shipping", cost: 0.0, description: "Available for orders over $100" },
    { id: "local_pickup", title: "Local Pickup", cost: 0.0, description: "Pickup from our warehouse location" }
  ];

  const paymentGateways: PaymentGateway[] = [
    { id: "stripe", title: "Credit Card (Stripe)", description: "Pay securely with your credit card." },
    { id: "paypal", title: "PayPal", description: "Log in and pay using your PayPal account." },
    { id: "cod", title: "Cash on Delivery", description: "Pay with cash upon delivery of your order." }
  ];

  const processOrder = async (
    billingAddress: Record<string, string>,
    shippingAddress: Record<string, string>,
    gatewayId: string
  ) => {
    setIsSubmitting(true);
    setError(null);

    if (!IS_DEV) {
      try {
        // 1. Update customer billing/shipping details in session
        await fetchStoreApi("cart/update-customer", {
          method: "POST",
          body: JSON.stringify({
            billing_address: billingAddress,
            shipping_address: shippingAddress
          })
        });

        // 2. Submit order to checkout
        const checkoutResult = await fetchStoreApi("checkout", {
          method: "POST",
          body: JSON.stringify({
            billing_address: billingAddress,
            shipping_address: shippingAddress,
            payment_method: gatewayId,
            payment_data: []
          })
        });

        cartContext.clearCart();
        setIsSubmitting(false);

        const status = checkoutResult.payment_result?.payment_status;
        const redirectUrl = checkoutResult.payment_result?.redirect_url || "/checkout/order-received";

        return {
          success: status === "success" || status === "pending" || !!checkoutResult.order_id,
          orderId: checkoutResult.order_id,
          redirectUrl: redirectUrl
        };
      } catch (err: any) {
        setError(err.message || "Failed to process order. Please try again.");
        setIsSubmitting(false);
        return { success: false };
      }
    }

    // Simulate network submission delay in dev mode
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!billingAddress.first_name || !billingAddress.email || !billingAddress.address_1) {
      setError("Please complete all required billing fields.");
      setIsSubmitting(false);
      return { success: false };
    }

    // Verify shippingAddress and gatewayId parameters to satisfy compiler
    if (!shippingAddress || !gatewayId) {
      setError("Shipping details and payment method are required.");
      setIsSubmitting(false);
      return { success: false };
    }

    // Success response simulation
    cartContext.clearCart();
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
  date: string;
  status: string;
  total: string;
  itemsCount: number;
  items: Array<{ title: string; qty: number }>;
  downloadableFiles?: Array<{ name: string; url: string }>;
}

export function useWpCustomer() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [customer, setCustomer] = React.useState<CustomerProfile | null>(null);
  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

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
      } else {
        // Seed default order history if empty
        const defaultOrders: OrderRecord[] = [
          {
            id: 9812,
            date: "June 1, 2026",
            status: "completed",
            total: "$59.99",
            itemsCount: 1,
            items: [{ title: "Minimalist Brutalist Hoodie", qty: 1 }]
          },
          {
            id: 9410,
            date: "May 15, 2026",
            status: "completed",
            total: "$9.99",
            itemsCount: 1,
            items: [{ title: "Brutalist Poster Art Print", qty: 1 }],
            downloadableFiles: [{ name: "High-Res PDF Vector", url: "https://example.com/downloads/brutalist-poster.pdf" }]
          }
        ];
        setOrders(defaultOrders);
        localStorage.setItem("forgewp-customer-orders", JSON.stringify(defaultOrders));
      }
    }
  }, []);

  const login = async (userEmail: string, pass: string) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!userEmail || !pass) {
      setLoading(false);
      throw new Error("Username and Password are required.");
    }

    const mockProfile: CustomerProfile = {
      username: userEmail.split("@")[0],
      email: userEmail,
      first_name: "John",
      last_name: "Doe",
      billing: {
        first_name: "John",
        last_name: "Doe",
        email: userEmail,
        address_1: "128 Concrete Alley",
        city: "Berlin",
        postcode: "10115",
        country: "DE"
      },
      shipping: {
        first_name: "John",
        last_name: "Doe",
        address_1: "128 Concrete Alley",
        city: "Berlin",
        postcode: "10115",
        country: "DE"
      }
    };

    setCustomer(mockProfile);
    setIsLoggedIn(true);
    localStorage.setItem("forgewp-customer", JSON.stringify(mockProfile));
    setLoading(false);
    return true;
  };

  const register = async (username: string, email: string, pass: string) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (!username || !email || !pass) {
      setLoading(false);
      throw new Error("All registration fields are required.");
    }

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
    setCustomer(null);
    setIsLoggedIn(false);
    localStorage.removeItem("forgewp-customer");
  };

  return {
    isLoggedIn,
    customer,
    orders,
    login,
    register,
    logout,
    loading
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
  const [wishlist, setWishlist] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("forgewp-wishlist");
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
    }
  }, []);

  const isWishlisted = React.useCallback((id: number) => {
    return wishlist.includes(id);
  }, [wishlist]);

  const toggleWishlist = (id: number) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (typeof window !== "undefined") {
        localStorage.setItem("forgewp-wishlist", JSON.stringify(next));
      }
      return next;
    });
  };

  return {
    wishlist,
    isWishlisted,
    toggleWishlist
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

