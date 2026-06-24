import React from "react";
import { WpPostContext } from "@forgewp/react";
import {
  Heart,
  Trash2,
  Plus,
  Minus,
  Star,
  Lock,
  User,
  Download,
  SlidersHorizontal,
  X,
  ArrowRight
} from "lucide-react";
import {
  WpCartContext,
  CartItem,
  CartState,
  useWpCart,
  useWpCheckout,
  useWpCustomer,
  useWpProductFilters,
  useWpWishlist,
  useWpProducts,
  useWpProduct,
  useWpProductCategories,
  useWpProductTags,
  fetchStoreApi,
  mapStoreApiToCartState,
  IS_DEV
} from "./hooks";

// ── 1. WpCartProvider ────────────────────────────────────────────────────────

export function WpCartProvider({ children }: { children: React.ReactNode }) {
  const { products } = useWpProducts();
  const [cart, setCart] = React.useState<CartState>({
    items: [],
    totals: { subtotal: "0.00", discount: "0.00", shipping: "0.00", tax: "0.00", total: "0.00" },
    coupons: [],
    shippingAddress: { country: "US", city: "", postcode: "" },
    shippingMethod: "flat_rate"
  });
  const [isLoading, setIsLoading] = React.useState(false);

  // Load from local storage or WooCommerce Store API
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (!IS_DEV) {
        setIsLoading(true);
        fetchStoreApi("cart")
          .then((storeCart) => {
            setCart(mapStoreApiToCartState(storeCart));
          })
          .catch((err) => {
            console.error("Failed to fetch WooCommerce cart:", err);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        const stored = localStorage.getItem("forgewp-cart");
        if (stored) {
          setCart(JSON.parse(stored));
        }
      }
    }
  }, []);

  // Recalculate totals helper (used for dev mock fallback only)
  const recalculateTotals = (items: CartItem[], coupons: string[], shippingMethod: string): CartState["totals"] => {
    const subtotalNum = items.reduce((sum, item) => sum + parseFloat(item.line_subtotal), 0);
    
    // Coupons calculation: "BRUTAL5" is 5% off, "STARK" is flat $10 off
    let discountNum = 0;
    coupons.forEach((code) => {
      if (code.toUpperCase() === "BRUTAL5") {
        discountNum += subtotalNum * 0.05;
      } else if (code.toUpperCase() === "STARK") {
        discountNum += 10.0;
      }
    });
    if (discountNum > subtotalNum) discountNum = subtotalNum;

    // Shipping cost
    let shippingNum = 10.0;
    if (subtotalNum > 100.0 || shippingMethod === "free_shipping") {
      shippingNum = 0.0;
    } else if (shippingMethod === "local_pickup") {
      shippingNum = 0.0;
    }

    // Tax (10% of subtotal after discounts)
    const taxableBase = subtotalNum - discountNum;
    const taxNum = taxableBase > 0 ? taxableBase * 0.1 : 0.0;

    const totalNum = subtotalNum - discountNum + shippingNum + taxNum;

    return {
      subtotal: subtotalNum.toFixed(2),
      discount: discountNum.toFixed(2),
      shipping: shippingNum.toFixed(2),
      tax: taxNum.toFixed(2),
      total: totalNum.toFixed(2)
    };
  };

  const updateCartState = (newItems: CartItem[], newCoupons: string[], newMethod: string, newAddress: any) => {
    const newTotals = recalculateTotals(newItems, newCoupons, newMethod);
    const updatedCart = {
      items: newItems,
      totals: newTotals,
      coupons: newCoupons,
      shippingMethod: newMethod,
      shippingAddress: newAddress
    };
    setCart(updatedCart);
    if (typeof window !== "undefined") {
      localStorage.setItem("forgewp-cart", JSON.stringify(updatedCart));
    }
  };

  const addToCart = async (productId: number, quantity: number, variation?: Record<string, string>) => {
    setIsLoading(true);

    if (!IS_DEV) {
      try {
        const body: any = {
          id: productId,
          quantity
        };
        if (variation) {
          body.variation = Object.entries(variation).map(([name, value]) => ({
            attribute: name.startsWith("attribute_") ? name : `attribute_${name}`,
            value
          }));
        }

        const storeCart = await fetchStoreApi("cart/add-item", {
          method: "POST",
          body: JSON.stringify(body)
        });
        setCart(mapStoreApiToCartState(storeCart));
      } catch (err) {
        console.error("Failed to add item to WooCommerce cart:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    const product = products.find((p) => p.id === productId);
    if (!product) {
      setIsLoading(false);
      return;
    }

    let itemPrice = parseFloat(product.price || "0");
    let variationId = "";
    let itemTitle = product.title;

    if (product.type === "variable" && variation && product.variations) {
      // Find matching variation
      const match = product.variations.find((v) => {
        return Object.entries(variation).every(([attr, val]) => v.attributes[attr] === val);
      });
      if (match) {
        itemPrice = parseFloat(match.price);
        variationId = String(match.id);
        const desc = Object.entries(variation).map(([k, v]) => `${k}: ${v}`).join(", ");
        itemTitle = `${product.title} (${desc})`;
      }
    }

    const lineKey = variationId ? `${productId}_${variationId}` : `${productId}`;
    const existingIndex = cart.items.findIndex((item) => item.key === lineKey);

    const newItems = [...cart.items];
    if (existingIndex > -1) {
      const existing = newItems[existingIndex];
      const newQty = existing.quantity + quantity;
      newItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        line_subtotal: (newQty * parseFloat(existing.price)).toFixed(2)
      };
    } else {
      newItems.push({
        key: lineKey,
        id: productId,
        quantity,
        variation,
        title: itemTitle,
        price: itemPrice.toFixed(2),
        featuredImage: product.featuredImage || "https://picsum.photos/seed/placeholder/300/300",
        line_subtotal: (quantity * itemPrice).toFixed(2)
      });
    }

    updateCartState(newItems, cart.coupons, cart.shippingMethod, cart.shippingAddress);
    setIsLoading(false);
  };

  const addToCartBatch = async (batchItems: Array<{ productId: number; quantity: number; variation?: Record<string, string> }>) => {
    setIsLoading(true);

    if (!IS_DEV) {
      try {
        let lastCart = null;
        for (const item of batchItems) {
          const body: any = {
            id: item.productId,
            quantity: item.quantity
          };
          if (item.variation) {
            body.variation = Object.entries(item.variation).map(([name, value]) => ({
              attribute: name.startsWith("attribute_") ? name : `attribute_${name}`,
              value
            }));
          }
          lastCart = await fetchStoreApi("cart/add-item", {
            method: "POST",
            body: JSON.stringify(body)
          });
        }
        if (lastCart) {
          setCart(mapStoreApiToCartState(lastCart));
        }
      } catch (err) {
        console.error("Failed to add batch to WooCommerce cart:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newItems = [...cart.items];

    batchItems.forEach((b) => {
      const product = products.find((p) => p.id === b.productId);
      if (!product) return;

      let itemPrice = parseFloat(product.price || "0");
      let variationId = "";
      let itemTitle = product.title;

      if (product.type === "variable" && b.variation && product.variations) {
        const match = product.variations.find((v) => {
          return Object.entries(b.variation!).every(([attr, val]) => v.attributes[attr] === val);
        });
        if (match) {
          itemPrice = parseFloat(match.price);
          variationId = String(match.id);
          const desc = Object.entries(b.variation).map(([k, v]) => `${k}: ${v}`).join(", ");
          itemTitle = `${product.title} (${desc})`;
        }
      }

      const lineKey = variationId ? `${b.productId}_${variationId}` : `${b.productId}`;
      const existingIndex = newItems.findIndex((item) => item.key === lineKey);

      if (existingIndex > -1) {
        const existing = newItems[existingIndex];
        const newQty = existing.quantity + b.quantity;
        newItems[existingIndex] = {
          ...existing,
          quantity: newQty,
          line_subtotal: (newQty * parseFloat(existing.price)).toFixed(2)
        };
      } else {
        newItems.push({
          key: lineKey,
          id: b.productId,
          quantity: b.quantity,
          variation: b.variation,
          title: itemTitle,
          price: itemPrice.toFixed(2),
          featuredImage: product.featuredImage || "https://picsum.photos/seed/placeholder/300/300",
          line_subtotal: (b.quantity * itemPrice).toFixed(2)
        });
      }
    });

    updateCartState(newItems, cart.coupons, cart.shippingMethod, cart.shippingAddress);
    setIsLoading(false);
  };

  const updateQuantity = async (key: string, qty: number) => {
    if (qty < 1) {
      await removeItem(key);
      return;
    }
    setIsLoading(true);

    if (!IS_DEV) {
      try {
        const storeCart = await fetchStoreApi("cart/update-item", {
          method: "POST",
          body: JSON.stringify({
            key,
            quantity: qty
          })
        });
        setCart(mapStoreApiToCartState(storeCart));
      } catch (err) {
        console.error("Failed to update item quantity in WooCommerce cart:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const newItems = cart.items.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          quantity: qty,
          line_subtotal: (qty * parseFloat(item.price)).toFixed(2)
        };
      }
      return item;
    });

    updateCartState(newItems, cart.coupons, cart.shippingMethod, cart.shippingAddress);
    setIsLoading(false);
  };

  const removeItem = async (key: string) => {
    setIsLoading(true);

    if (!IS_DEV) {
      try {
        const storeCart = await fetchStoreApi("cart/remove-item", {
          method: "POST",
          body: JSON.stringify({
            key
          })
        });
        setCart(mapStoreApiToCartState(storeCart));
      } catch (err) {
        console.error("Failed to remove item from WooCommerce cart:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    const newItems = cart.items.filter((item) => item.key !== key);
    updateCartState(newItems, cart.coupons, cart.shippingMethod, cart.shippingAddress);
    setIsLoading(false);
  };

  const applyCoupon = async (code: string) => {
    setIsLoading(true);

    if (!IS_DEV) {
      try {
        const storeCart = await fetchStoreApi("cart/apply-coupon", {
          method: "POST",
          body: JSON.stringify({
            code
          })
        });
        setCart(mapStoreApiToCartState(storeCart));
        return true;
      } catch (err) {
        console.error("Failed to apply coupon to WooCommerce cart:", err);
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    const upperCode = code.toUpperCase();
    if (upperCode === "BRUTAL5" || upperCode === "STARK") {
      if (!cart.coupons.includes(upperCode)) {
        updateCartState(cart.items, [...cart.coupons, upperCode], cart.shippingMethod, cart.shippingAddress);
        setIsLoading(false);
        return true;
      }
    }
    setIsLoading(false);
    return false;
  };

  const removeCoupon = async (code: string) => {
    setIsLoading(true);

    if (!IS_DEV) {
      try {
        const storeCart = await fetchStoreApi("cart/remove-coupon", {
          method: "POST",
          body: JSON.stringify({
            code
          })
        });
        setCart(mapStoreApiToCartState(storeCart));
      } catch (err) {
        console.error("Failed to remove coupon from WooCommerce cart:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
    const newCoupons = cart.coupons.filter((c) => c !== code);
    updateCartState(cart.items, newCoupons, cart.shippingMethod, cart.shippingAddress);
    setIsLoading(false);
  };

  const calculateShipping = async (address: { country: string; city: string; postcode: string }) => {
    setIsLoading(true);

    if (!IS_DEV) {
      try {
        const storeCart = await fetchStoreApi("cart/update-customer", {
          method: "POST",
          body: JSON.stringify({
            shipping_address: address,
            billing_address: address
          })
        });
        setCart(mapStoreApiToCartState(storeCart));
      } catch (err) {
        console.error("Failed to update shipping calculation:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
    updateCartState(cart.items, cart.coupons, cart.shippingMethod, address);
    setIsLoading(false);
  };

  const setShippingMethod = async (methodId: string) => {
    if (!IS_DEV) {
      setIsLoading(true);
      try {
        const storeCart = await fetchStoreApi("cart/select-shipping-rate", {
          method: "POST",
          body: JSON.stringify({
            rate_id: methodId
          })
        });
        setCart(mapStoreApiToCartState(storeCart));
      } catch (err) {
        console.error("Failed to select shipping method:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    updateCartState(cart.items, cart.coupons, methodId, cart.shippingAddress);
  };

  const clearCart = () => {
    if (!IS_DEV) {
      setCart({
        items: [],
        totals: { subtotal: "0.00", discount: "0.00", shipping: "0.00", tax: "0.00", total: "0.00" },
        coupons: [],
        shippingAddress: { country: "US", city: "", postcode: "" },
        shippingMethod: "flat_rate"
      });
      return;
    }

    updateCartState([], [], "flat_rate", { country: "US", city: "", postcode: "" });
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = `$${cart.totals.total}`;

  return (
    <WpCartContext.Provider
      value={{
        cart,
        itemCount,
        cartTotal,
        addToCart,
        addToCartBatch,
        updateQuantity,
        removeItem,
        applyCoupon,
        removeCoupon,
        calculateShipping,
        setShippingMethod,
        isLoading,
        clearCart
      }}
    >
      {children}
    </WpCartContext.Provider>
  );
}

// ── 2. Catalog & Product Detail Components ──────────────────────────────────

export function WpProductGallery({ productId }: { productId: number }) {
  const { product, loading } = useWpProduct(productId);
  const [activeImage, setActiveImage] = React.useState("");

  React.useEffect(() => {
    if (product) {
      setActiveImage(product.featuredImage);
    }
  }, [product]);

  // Listen to variation selection events
  React.useEffect(() => {
    const handleVariation = (e: Event) => {
      const variationDetail = (e as CustomEvent).detail;
      if (variationDetail && variationDetail.image && variationDetail.image.url) {
        setActiveImage(variationDetail.image.url);
      }
    };
    window.addEventListener(`forgewp-variation-selected-${productId}`, handleVariation);
    return () => {
      window.removeEventListener(`forgewp-variation-selected-${productId}`, handleVariation);
    };
  }, [productId]);

  if (loading) return <div className="border-4 border-black p-4 font-mono text-center">LOADING GALLERY...</div>;
  if (!product) return <div className="border-4 border-black p-4 font-mono font-bold text-center">PRODUCT NOT FOUND</div>;

  const galleryImages = product.images || [];

  return (
    <div className="space-y-4">
      {/* Main Image Frame */}
      <div className="border-4 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative aspect-square overflow-hidden flex items-center justify-center">
        {product.on_sale && (
          <span className="absolute top-4 left-4 bg-yellow-400 border-2 border-black px-3 py-1 font-mono font-black text-xs uppercase z-10">
            Sale
          </span>
        )}
        <img src={activeImage} alt={product.title} className="max-w-full max-h-full object-cover" />
      </div>

      {/* Thumbnails */}
      {galleryImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveImage(product.featuredImage)}
            className={`border-2 border-black p-1 bg-white aspect-square overflow-hidden flex items-center justify-center ${
              activeImage === product.featuredImage ? "outline outline-4 outline-black" : ""
            }`}
          >
            <img src={product.featuredImage} alt="Featured" className="max-w-full max-h-full object-cover" />
          </button>
          {galleryImages.map((img: any, idx: number) => (
            <button
              key={img.id || idx}
              onClick={() => setActiveImage(img.url)}
              className={`border-2 border-black p-1 bg-white aspect-square overflow-hidden flex items-center justify-center ${
                activeImage === img.url ? "outline outline-4 outline-black" : ""
              }`}
            >
              <img src={img.url} alt={`Gallery ${idx}`} className="max-w-full max-h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WpProductPrice({ productId }: { productId: number }) {
  const { product, loading } = useWpProduct(productId);
  const [selectedPriceHtml, setSelectedPriceHtml] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleVariation = (e: Event) => {
      const variationDetail = (e as CustomEvent).detail;
      if (variationDetail && variationDetail.price) {
        setSelectedPriceHtml(`$${parseFloat(variationDetail.price).toFixed(2)}`);
      }
    };
    window.addEventListener(`forgewp-variation-selected-${productId}`, handleVariation);
    return () => {
      window.removeEventListener(`forgewp-variation-selected-${productId}`, handleVariation);
    };
  }, [productId]);

  if (loading || !product) return null;

  if (selectedPriceHtml) {
    return <div className="font-mono text-2xl font-black">{selectedPriceHtml}</div>;
  }

  if (product.type === "variable" && product.variations && product.variations.length > 0) {
    const prices = product.variations.map((v) => parseFloat(v.price));
    const minPrice = Math.min(...prices).toFixed(2);
    const maxPrice = Math.max(...prices).toFixed(2);
    return (
      <div className="font-mono text-2xl font-black">
        ${minPrice} — ${maxPrice}
      </div>
    );
  }

  const hasDiscount = product.on_sale && product.regular_price && product.regular_price !== product.price;

  return (
    <div className="flex items-center gap-3 font-mono text-2xl font-black">
      {hasDiscount && (
        <span className="text-zinc-400 line-through text-lg">${parseFloat(product.regular_price!).toFixed(2)}</span>
      )}
      <span>${parseFloat(product.price).toFixed(2)}</span>
    </div>
  );
}

export function WpProductVariationSelector({ productId }: { productId: number }) {
  const { product, loading } = useWpProduct(productId);
  const [selections, setSelections] = React.useState<Record<string, string>>({});

  if (loading || !product || product.type !== "variable" || !product.attributes) return null;

  const handleSelect = (attrName: string, optionVal: string) => {
    const next = { ...selections, [attrName]: optionVal };
    setSelections(next);

    // Dispatch selection change
    if (product.variations) {
      const matchedVariation = product.variations.find((v) => {
        return Object.entries(next).every(([attr, val]) => v.attributes[attr] === val);
      });
      if (matchedVariation) {
        window.dispatchEvent(
          new CustomEvent(`forgewp-variation-selected-${productId}`, { detail: matchedVariation })
        );
      }
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {product.attributes.map((attr) => (
        <div key={attr.name} className="space-y-2">
          <span className="font-bold text-xs uppercase text-zinc-500">{attr.name}</span>
          <div className="flex flex-wrap gap-2">
            {attr.options.map((opt) => {
              const isSelected = selections[attr.name] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(attr.name, opt)}
                  className={`border-2 border-black px-4 py-2 text-xs font-black uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    isSelected ? "bg-black text-white translate-x-[1px] translate-y-[1px] shadow-none" : "bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WpProductStockStatus({ productId }: { productId: number }) {
  const { product, loading } = useWpProduct(productId);
  const [status, setStatus] = React.useState("instock");

  React.useEffect(() => {
    if (product) {
      setStatus(product.stock_status || "instock");
    }
  }, [product]);

  React.useEffect(() => {
    const handleVariation = (e: Event) => {
      const variationDetail = (e as CustomEvent).detail;
      if (variationDetail && variationDetail.stock_status) {
        setStatus(variationDetail.stock_status);
      }
    };
    window.addEventListener(`forgewp-variation-selected-${productId}`, handleVariation);
    return () => {
      window.removeEventListener(`forgewp-variation-selected-${productId}`, handleVariation);
    };
  }, [productId]);

  if (loading || !product) return null;

  const isInstock = status === "instock";
  const label = isInstock ? "In Stock" : status === "outofstock" ? "Out of Stock" : "On Backorder";

  return (
    <div className="font-mono text-xs uppercase flex items-center gap-2">
      <span className={`w-3 h-3 border-2 border-black ${isInstock ? "bg-emerald-400" : "bg-red-500"}`} />
      <span className="font-bold">{label}</span>
    </div>
  );
}

export function WpRelatedProducts({ productId, limit = 4 }: { productId: number; limit?: number }) {
  const { product: targetProduct, loading: loadingTarget } = useWpProduct(productId);
  const { products, loading: loadingAll } = useWpProducts();

  if (loadingTarget || loadingAll || !targetProduct) return null;

  const targetCategory = targetProduct._terms?.product_cat?.[0]?.slug;
  const related = products
    .filter((p) => p.id !== productId && p._terms?.product_cat?.some((cat) => cat.slug === targetCategory))
    .slice(0, limit);

  if (related.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="font-mono font-black text-3xl uppercase tracking-wider border-b-4 border-black pb-2">
        Related Products
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {related.map((p) => (
          <div key={p.id} className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div className="aspect-square border-2 border-black overflow-hidden flex items-center justify-center bg-zinc-50 mb-4">
              <img src={p.featuredImage} alt={p.title} className="max-w-full max-h-full object-cover" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs uppercase text-zinc-400">
                {p._terms?.product_cat?.[0]?.name}
              </span>
              <h3 className="font-mono font-black text-lg uppercase my-1 truncate">{p.title}</h3>
              <div className="font-mono font-black text-md text-accent">
                ${parseFloat(p.price || "0").toFixed(2)}
              </div>
            </div>
            <a
              href={`/product/${p.sku}`}
              className="mt-4 border-4 border-black bg-black text-white text-center font-mono font-bold py-2 uppercase hover:bg-white hover:text-black transition-all block"
            >
              View Item
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WpProductReviews({ productId }: { productId: number }) {
  const { product, loading } = useWpProduct(productId);
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [rating, setRating] = React.useState(5);

  React.useEffect(() => {
    if (product && product.reviews) {
      setReviews(product.reviews);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const author = data.get("author") as string;
    const content = data.get("content") as string;

    if (!author || !content) return;

    if (!IS_DEV) {
      try {
        const body = new URLSearchParams();
        body.append("comment_post_ID", String(productId));
        body.append("author", author);
        body.append("email", `${author.toLowerCase().replace(/\s+/g, "")}@example.com`);
        body.append("comment", content);
        body.append("rating", String(rating));

        const response = await fetch("/wp-comments-post.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: body.toString()
        });

        if (response.ok || response.redirected) {
          const newRev = {
            id: Date.now(),
            author,
            content,
            rating,
            date: new Date().toISOString().split("T")[0]
          };
          setReviews([newRev, ...reviews]);
          e.currentTarget.reset();
        } else {
          console.error("Failed to submit WooCommerce review");
        }
      } catch (err) {
        console.error("Error submitting review:", err);
      }
      return;
    }

    const newRev = {
      id: Date.now(),
      author,
      content,
      rating,
      date: new Date().toISOString().split("T")[0]
    };

    const next = [newRev, ...reviews];
    setReviews(next);
    e.currentTarget.reset();
  };

  if (loading || !product) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono border-t-4 border-black pt-8">
      {/* Review Feed */}
      <div className="space-y-6">
        <h3 className="font-black text-2xl uppercase border-b-4 border-black pb-2">
          Customer Feedbacks ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <p className="text-zinc-500 italic text-sm">No reviews yet. Be the first to leave one!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-4 border-black p-4 bg-zinc-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-sm uppercase">{r.author}</span>
                  <span className="text-xs text-zinc-500">{r.date}</span>
                </div>
                <div className="flex gap-1 mb-2 text-yellow-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < r.rating ? "fill-current" : "text-zinc-300"} />
                  ))}
                </div>
                <p className="text-xs font-semibold leading-relaxed text-zinc-700">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Form Island */}
      <div className="border-4 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] self-start">
        <h3 className="font-black text-xl uppercase mb-4 border-b-2 border-black pb-2">Add a Review</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-zinc-500">Rating</label>
            <div className="flex gap-2 text-yellow-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className="focus:outline-none"
                >
                  <Star size={24} className={i < rating ? "fill-current" : "text-zinc-300"} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-zinc-500">Your Name</label>
            <input
              name="author"
              required
              className="w-full border-2 border-black p-2 text-xs focus:outline-none focus:ring-0 focus:border-black"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-zinc-500">Your Feedback</label>
            <textarea
              name="content"
              required
              rows={4}
              className="w-full border-2 border-black p-2 text-xs focus:outline-none focus:ring-0 focus:border-black"
            />
          </div>
          <button
            type="submit"
            className="w-full border-4 border-black bg-black text-white font-bold py-3 uppercase text-xs hover:bg-white hover:text-black transition-all"
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 3. Shopping Cart Components ─────────────────────────────────────────────

export function WpCartLineItems() {
  const { cart, updateQuantity, removeItem, isLoading } = useWpCart();

  if (cart.items.length === 0) {
    return (
      <div className="border-4 border-black p-8 font-mono text-center font-bold bg-white uppercase">
        Your Cart is empty.
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      {cart.items.map((item) => (
        <div
          key={item.key}
          className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row gap-4 items-center justify-between"
        >
          {/* Thumb and title */}
          <div className="flex gap-4 items-center w-full sm:w-auto">
            <div className="w-16 h-16 border-2 border-black overflow-hidden flex-shrink-0 flex items-center justify-center bg-zinc-50">
              <img src={item.featuredImage} alt={item.title} className="object-cover w-full h-full" />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase leading-tight truncate max-w-[200px]">{item.title}</h4>
              <span className="text-xs font-bold text-accent">${item.price}</span>
            </div>
          </div>

          {/* Qty and price adjustments */}
          <div className="flex gap-6 items-center w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center border-2 border-black">
              <button
                disabled={isLoading}
                onClick={() => updateQuantity(item.key, item.quantity - 1)}
                className="p-2 hover:bg-zinc-100 border-r-2 border-black disabled:opacity-50"
              >
                <Minus size={12} />
              </button>
              <span className="px-4 text-xs font-bold">{item.quantity}</span>
              <button
                disabled={isLoading}
                onClick={() => updateQuantity(item.key, item.quantity + 1)}
                className="p-2 hover:bg-zinc-100 border-l-2 border-black disabled:opacity-50"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="font-black text-md min-w-[70px] text-right">
              ${parseFloat(item.line_subtotal).toFixed(2)}
            </div>

            <button
              disabled={isLoading}
              onClick={() => removeItem(item.key)}
              className="text-red-500 hover:text-black disabled:opacity-50"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WpCartCouponForm() {
  const { cart, applyCoupon, removeCoupon, isLoading } = useWpCart();
  const [success, setSuccess] = React.useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = data.get("coupon_code") as string;
    if (!code) return;

    const applied = await applyCoupon(code);
    setSuccess(applied);
    if (applied) {
      e.currentTarget.reset();
    }
  };

  return (
    <div className="border-4 border-black p-4 bg-zinc-50 font-mono space-y-4">
      <h4 className="font-black text-sm uppercase border-b-2 border-black pb-1">Promotional Coupons</h4>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="coupon_code"
          placeholder="COUPON CODE"
          required
          className="border-2 border-black p-2 text-xs uppercase flex-1 focus:outline-none focus:ring-0"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-black text-white border-2 border-black px-4 py-2 text-xs font-black uppercase hover:bg-white hover:text-black transition-all"
        >
          Apply
        </button>
      </form>
      
      {success === false && (
        <p className="text-red-500 text-xs font-bold uppercase">Invalid Code. Try "BRUTAL5" or "STARK"</p>
      )}

      {cart.coupons.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-200">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Active Coupons:</span>
          <div className="flex flex-wrap gap-2">
            {cart.coupons.map((c) => (
              <span
                key={c}
                className="bg-yellow-300 border-2 border-black px-2 py-1 text-[10px] font-black uppercase flex items-center gap-2"
              >
                {c}
                <button type="button" onClick={() => removeCoupon(c)} className="hover:text-red-500">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WpCartShippingCalculator() {
  const { cart, calculateShipping, isLoading } = useWpCart();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    calculateShipping({
      country: data.get("country") as string,
      city: data.get("city") as string,
      postcode: data.get("postcode") as string
    });
  };

  return (
    <div className="border-4 border-black p-4 bg-zinc-50 font-mono space-y-4">
      <h4 className="font-black text-sm uppercase border-b-2 border-black pb-1">Estimate Shipping</h4>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          name="country"
          defaultValue={cart.shippingAddress.country}
          placeholder="Country (e.g. US)"
          required
          className="w-full border-2 border-black p-2 text-xs focus:outline-none"
        />
        <input
          name="city"
          defaultValue={cart.shippingAddress.city}
          placeholder="City"
          className="w-full border-2 border-black p-2 text-xs focus:outline-none"
        />
        <input
          name="postcode"
          defaultValue={cart.shippingAddress.postcode}
          placeholder="Postcode"
          required
          className="w-full border-2 border-black p-2 text-xs focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-black text-white border-2 border-black py-2 text-xs font-black uppercase hover:bg-white hover:text-black transition-all"
        >
          Update Destination
        </button>
      </form>
    </div>
  );
}

// ── 4. Checkout Components ──────────────────────────────────────────────────

export const CheckoutFormContext = React.createContext<{
  billing: Record<string, string>;
  setBilling: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  shipping: Record<string, string>;
  setShipping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedGateway: string;
  setSelectedGateway: (id: string) => void;
} | null>(null);

export function WpCheckoutForm({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [billing, setBilling] = React.useState<Record<string, string>>({});
  const [shipping, setShipping] = React.useState<Record<string, string>>({});
  const [selectedGateway, setSelectedGateway] = React.useState("stripe");

  return (
    <CheckoutFormContext.Provider
      value={{
        billing,
        setBilling,
        shipping,
        setShipping,
        selectedGateway,
        setSelectedGateway
      }}
    >
      <div className={className}>{children}</div>
    </CheckoutFormContext.Provider>
  );
}

WpCheckoutForm.BillingFields = function BillingFields({ className }: { className?: string }) {
  const context = React.useContext(CheckoutFormContext);
  if (!context) return null;

  const handleChange = (name: string, val: string) => {
    context.setBilling((prev) => ({ ...prev, [name]: val }));
  };

  return (
    <div className={`space-y-4 font-mono ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">First Name</label>
          <input
            required
            onChange={(e) => handleChange("first_name", e.target.value)}
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">Last Name</label>
          <input
            required
            onChange={(e) => handleChange("last_name", e.target.value)}
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-zinc-500">Email Address</label>
        <input
          type="email"
          required
          onChange={(e) => handleChange("email", e.target.value)}
          className="w-full border-2 border-black p-2 text-xs focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-zinc-500">Street Address</label>
        <input
          required
          placeholder="House number and street name"
          onChange={(e) => handleChange("address_1", e.target.value)}
          className="w-full border-2 border-black p-2 text-xs focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">City</label>
          <input
            required
            onChange={(e) => handleChange("city", e.target.value)}
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">Postcode</label>
          <input
            required
            onChange={(e) => handleChange("postcode", e.target.value)}
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase text-zinc-500">Country</label>
        <input
          required
          defaultValue="US"
          onChange={(e) => handleChange("country", e.target.value)}
          className="w-full border-2 border-black p-2 text-xs focus:outline-none"
        />
      </div>
    </div>
  );
};

WpCheckoutForm.PaymentGateways = function WpPaymentGateways({ className }: { className?: string }) {
  const context = React.useContext(CheckoutFormContext);
  const { paymentGateways } = useWpCheckout();
  if (!context) return null;

  return (
    <div className={`space-y-4 font-mono ${className}`}>
      {paymentGateways.map((g) => {
        const isSelected = context.selectedGateway === g.id;
        return (
          <label
            key={g.id}
            onClick={() => context.setSelectedGateway(g.id)}
            className={`border-4 border-black p-4 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex gap-3 items-start select-none ${
              isSelected ? "outline outline-4 outline-black" : ""
            }`}
          >
            <div className={`w-4 h-4 border-2 border-black mt-1 flex-shrink-0 flex items-center justify-center`}>
              {isSelected && <div className="w-2 h-2 bg-black" />}
            </div>
            <div>
              <span className="font-black text-sm uppercase leading-tight">{g.title}</span>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold leading-relaxed">{g.description}</p>
              {g.id === "stripe" && isSelected && (
                <div className="mt-4 space-y-2 border-t-2 border-dashed border-zinc-200 pt-4 w-full">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Secure Card Fields</span>
                  <input
                    placeholder="CARD NUMBER"
                    className="w-full border-2 border-black p-2 text-xs focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="MM/YY"
                      className="border-2 border-black p-2 text-xs focus:outline-none"
                    />
                    <input
                      placeholder="CVC"
                      className="border-2 border-black p-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
};

WpCheckoutForm.SubmitButton = function SubmitButton({ className }: { className?: string }) {
  const context = React.useContext(CheckoutFormContext);
  const { processOrder, isSubmitting, error } = useWpCheckout();

  if (!context) return null;

  const handleOrder = async () => {
    const res = await processOrder(context.billing, context.shipping, context.selectedGateway);
    if (res && res.success && res.redirectUrl) {
      if (typeof window !== "undefined") {
        window.location.href = res.redirectUrl + `?order_id=${res.orderId}`;
      }
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="border-4 border-red-500 bg-red-50 text-red-700 p-4 font-mono font-bold text-xs uppercase">
          ❌ {error}
        </div>
      )}
      <button
        onClick={handleOrder}
        disabled={isSubmitting}
        className={`w-full text-center font-mono font-black py-4 uppercase border-4 border-black bg-black text-white hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 ${className}`}
      >
        {isSubmitting ? "Processing Order..." : "Place Order"}
      </button>
    </div>
  );
};

export function WpShippingSelector() {
  const { shippingMethods } = useWpCheckout();
  const { cart, setShippingMethod } = useWpCart();

  return (
    <div className="space-y-4 font-mono">
      {shippingMethods.map((m) => {
        const isSelected = cart.shippingMethod === m.id;
        return (
          <label
            key={m.id}
            onClick={() => setShippingMethod(m.id)}
            className={`border-4 border-black p-4 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex gap-3 items-start select-none ${
              isSelected ? "outline outline-4 outline-black" : ""
            }`}
          >
            <div className={`w-4 h-4 border-2 border-black mt-1 flex-shrink-0 flex items-center justify-center`}>
              {isSelected && <div className="w-2 h-2 bg-black" />}
            </div>
            <div className="flex-1 flex justify-between items-center">
              <div>
                <span className="font-black text-sm uppercase leading-tight">{m.title}</span>
                <p className="text-[10px] text-zinc-500 mt-1 font-semibold leading-relaxed">{m.description}</p>
              </div>
              <span className="font-black text-md">${m.cost.toFixed(2)}</span>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// ── 5. Customer Accounts & Authentication ───────────────────────────────────

export function WpLoginForm() {
  const { login, loading } = useWpCustomer();
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await login(data.get("email") as string, data.get("password") as string);
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    }
  };

  return (
    <div className="border-4 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono max-w-sm mx-auto">
      <h3 className="font-black text-2xl uppercase mb-6 border-b-4 border-black pb-2 flex items-center gap-2">
        <Lock size={20} /> Sign In
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="border-2 border-red-500 bg-red-50 text-red-600 p-2 text-xs uppercase font-bold">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">Email Address</label>
          <input
            type="email"
            name="email"
            required
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">Password</label>
          <input
            type="password"
            name="password"
            required
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-bold py-3 uppercase border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export function WpRegisterForm() {
  const { register, loading } = useWpCustomer();
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await register(
        data.get("username") as string,
        data.get("email") as string,
        data.get("password") as string
      );
    } catch (err: any) {
      setError(err.message || "Failed to register");
    }
  };

  return (
    <div className="border-4 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono max-w-sm mx-auto">
      <h3 className="font-black text-2xl uppercase mb-6 border-b-4 border-black pb-2 flex items-center gap-2">
        <User size={20} /> Register
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="border-2 border-red-500 bg-red-50 text-red-600 p-2 text-xs uppercase font-bold">
            {error}
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">Username</label>
          <input
            name="username"
            required
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">Email Address</label>
          <input
            type="email"
            name="email"
            required
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-500">Password</label>
          <input
            type="password"
            name="password"
            required
            className="w-full border-2 border-black p-2 text-xs focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-bold py-3 uppercase border-2 border-black hover:bg-white hover:text-black transition-all disabled:opacity-50"
        >
          {loading ? "Registering..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export function WpOrderHistory() {
  const { orders } = useWpCustomer();

  if (orders.length === 0) {
    return <div className="border-4 border-black p-4 font-mono text-center font-bold">NO ORDER HISTORY</div>;
  }

  return (
    <div className="border-4 border-black overflow-x-auto font-mono bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-black text-white text-xs uppercase">
            <th className="p-4 border-r-2 border-black">Order ID</th>
            <th className="p-4 border-r-2 border-black">Date</th>
            <th className="p-4 border-r-2 border-black">Status</th>
            <th className="p-4 border-r-2 border-black">Total</th>
            <th className="p-4">Downloads</th>
          </tr>
        </thead>
        <tbody className="text-xs font-bold divide-y divide-zinc-200">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-zinc-50">
              <td className="p-4 border-r-2 border-black font-black">#{o.id}</td>
              <td className="p-4 border-r-2 border-black">{o.date}</td>
              <td className="p-4 border-r-2 border-black">
                <span className="bg-emerald-200 border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                  {o.status}
                </span>
              </td>
              <td className="p-4 border-r-2 border-black font-black">{o.total}</td>
              <td className="p-4">
                {o.downloadableFiles && o.downloadableFiles.length > 0 ? (
                  <div className="space-y-1">
                    {o.downloadableFiles.map((file) => (
                      <a
                        key={file.name}
                        href={file.url}
                        className="inline-flex items-center gap-1 text-black underline hover:text-accent"
                      >
                        <Download size={12} /> {file.name}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-zinc-400 italic">None</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 6. Faceted Search & Filtering Components ────────────────────────────────

export function WpProductFilters() {
  const { activeFilters, setFilter, setPriceRange, setSortBy, resetFilters } = useWpProductFilters();
  const { products, loading } = useWpProducts();
  const categories = useWpProductCategories();
  const tags = useWpProductTags();

  // Dynamically extract all attributes from variable products in mock database
  const attributes = React.useMemo(() => {
    const map: Record<string, Set<string>> = {};
    products.forEach((p) => {
      if (p.attributes) {
        p.attributes.forEach((attr: any) => {
          if (!map[attr.name]) map[attr.name] = new Set();
          attr.options.forEach((opt: string) => map[attr.name].add(opt));
        });
      }
    });
    const result: Record<string, string[]> = {};
    Object.entries(map).forEach(([k, v]) => {
      result[k] = Array.from(v);
    });
    return result;
  }, [products]);

  const handleCheckboxChange = (type: string, val: string, checked: boolean) => {
    setFilter(type, val, checked);
  };

  const activeFiltersCount =
    activeFilters.categories.length +
    activeFilters.tags.length +
    Object.values(activeFilters.attributes).reduce((sum, list) => sum + list.length, 0) +
    (activeFilters.priceRange[0] > 0 || activeFilters.priceRange[1] < 100 ? 1 : 0);

  if (loading) return <div className="border-4 border-black p-4 font-mono text-center">LOADING FILTERS...</div>;

  return (
    <div className="border-4 border-black p-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono space-y-6 self-start">
      {/* Header and Reset */}
      <div className="flex justify-between items-center border-b-4 border-black pb-2">
        <span className="font-black text-lg uppercase flex items-center gap-2">
          <SlidersHorizontal size={18} /> Filters
        </span>
        {activeFiltersCount > 0 && (
          <button onClick={resetFilters} className="text-[10px] font-black uppercase underline hover:text-red-500">
            Reset
          </button>
        )}
      </div>

      {/* Sort Widget */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-zinc-500">Sort By</span>
        <select
          value={activeFilters.sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full border-2 border-black p-2 text-xs font-black uppercase bg-white focus:outline-none"
        >
          <option value="date">Default Sorting</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="title">Alphabetical</option>
        </select>
      </div>

      {/* Categories Widget */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase text-zinc-500">Categories</span>
          <div className="space-y-1">
            {categories.map((cat: any) => {
              const isChecked = activeFilters.categories.includes(cat.slug);
              return (
                <label key={cat.slug} className="flex items-center gap-2 text-xs font-bold uppercase cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange("category", cat.slug, e.target.checked)}
                    className="w-4 h-4 border-2 border-black rounded-none bg-white text-black focus:ring-0 focus:ring-offset-0"
                  />
                  {cat.name} ({cat.count || 0})
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Slider Range Widget */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-zinc-500">Price Range</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center border-2 border-black p-1 text-xs font-bold uppercase">
            <span className="text-zinc-400 mr-1">$</span>
            <input
              type="number"
              value={activeFilters.priceRange[0]}
              onChange={(e) => setPriceRange(parseFloat(e.target.value) || 0, activeFilters.priceRange[1])}
              className="w-full border-0 p-0 text-xs font-black uppercase focus:ring-0"
            />
          </div>
          <div className="flex items-center border-2 border-black p-1 text-xs font-bold uppercase">
            <span className="text-zinc-400 mr-1">$</span>
            <input
              type="number"
              value={activeFilters.priceRange[1]}
              onChange={(e) => setPriceRange(activeFilters.priceRange[0], parseFloat(e.target.value) || 100)}
              className="w-full border-0 p-0 text-xs font-black uppercase focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Attribute Widgets */}
      {Object.entries(attributes).map(([name, options]) => (
        <div key={name} className="space-y-2 border-t-2 border-zinc-100 pt-4">
          <span className="text-xs font-bold uppercase text-zinc-500">{name}</span>
          <div className="space-y-1">
            {options.map((opt) => {
              const isChecked = (activeFilters.attributes[name] || []).includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 text-xs font-bold uppercase cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(name, opt, e.target.checked)}
                    className="w-4 h-4 border-2 border-black rounded-none bg-white text-black focus:ring-0"
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Tags Widget */}
      {tags.length > 0 && (
        <div className="space-y-2 border-t-2 border-zinc-100 pt-4">
          <span className="text-xs font-bold uppercase text-zinc-500">Popular Tags</span>
          <div className="flex flex-wrap gap-2">
            {tags.map((t: any) => {
              const isChecked = activeFilters.tags.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  onClick={() => handleCheckboxChange("tag", t.slug, !isChecked)}
                  className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    isChecked ? "bg-black text-white translate-x-[1px] translate-y-[1px] shadow-none" : "bg-white text-black"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 7. Wishlist / Favorites Components ──────────────────────────────────────

export function WpWishlistButton({ productId }: { productId: number }) {
  const { isWishlisted, toggleWishlist } = useWpWishlist();
  const wish = isWishlisted(productId);

  return (
    <button
      onClick={() => toggleWishlist(productId)}
      className={`border-4 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 transition-all ${
        wish ? "text-red-500 fill-current" : "text-black"
      }`}
    >
      <Heart size={18} className={wish ? "fill-current" : ""} />
    </button>
  );
}

export function WpWishlistList() {
  const { wishlist, toggleWishlist } = useWpWishlist();
  const { products, loading } = useWpProducts();
  const wishItems = products.filter((p) => wishlist.includes(p.id));

  if (loading) return <div className="border-4 border-black p-4 font-mono text-center">LOADING WISHLIST...</div>;

  if (wishItems.length === 0) {
    return (
      <div className="border-4 border-black p-8 font-mono text-center font-bold bg-white uppercase">
        No items in your wishlist.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
      {wishItems.map((p) => (
        <div key={p.id} className="border-4 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
          <div className="aspect-square border-2 border-black overflow-hidden flex items-center justify-center bg-zinc-50 relative mb-4">
            <button
              onClick={() => toggleWishlist(p.id)}
              className="absolute top-2 right-2 border-2 border-black p-1 bg-white text-red-500 hover:bg-zinc-100"
            >
              <X size={14} />
            </button>
            <img src={p.featuredImage} alt={p.title} className="max-w-full max-h-full object-cover" />
          </div>
          <div>
            <h3 className="font-black text-lg uppercase truncate mb-1">{p.title}</h3>
            <span className="font-bold text-accent">${parseFloat(p.price || "0").toFixed(2)}</span>
          </div>
          <a
            href={`/product/${p.sku}`}
            className="mt-4 border-4 border-black bg-black text-white text-center font-bold py-2 uppercase hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
          >
            View Details <ArrowRight size={14} />
          </a>
        </div>
      ))}
    </div>
  );
}

// ── 8. Global Store Announcement Notices ────────────────────────────────────

export function WpStoreNotice() {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  return (
    <div className="bg-yellow-300 border-b-4 border-black font-mono px-4 py-3 flex justify-between items-center gap-4 relative z-50">
      <div className="flex items-center gap-2 text-xs font-black uppercase">
        <span className="w-2.5 h-2.5 border-2 border-black bg-black animate-pulse" />
        This is a mock WooCommerce sandbox workspace. Orders will not be processed or charged.
      </div>
      <button onClick={() => setVisible(false)} className="border-2 border-black p-1 bg-white hover:bg-zinc-100">
        <X size={12} />
      </button>
    </div>
  );
}


export interface WpProductLoopProps {
  category?: string;
  limit?: number;
  orderBy?: string;
  order?: "asc" | "desc";
  status?: string;
  children: React.ReactNode;
}

export function WpProductLoop({
  category,
  limit = 10,
  orderBy = "date",
  order = "desc",
  status = "publish",
  children
}: WpProductLoopProps) {
  if (!IS_DEV) {
    return (
      <>
        {/* @ts-ignore */}
        <forgewp-product-loop-start
          category={category}
          limit={limit}
          orderBy={orderBy}
          order={order}
          status={status}
        />
        {children}
        {/* @ts-ignore */}
        <forgewp-product-loop-end />
      </>
    );
  }

  const { products, loading } = useWpProducts();

  const filtered = React.useMemo(() => {
    let items = [...products];
    if (category) {
      items = items.filter((p) => {
        const cats = p._terms?.product_cat || [];
        return cats.some(
          (c) =>
            c.slug.toLowerCase() === category.toLowerCase() ||
            c.name.toLowerCase() === category.toLowerCase()
        );
      });
    }

    items.sort((a, b) => {
      let valA: any = (a as any)[orderBy] ?? "";
      let valB: any = (b as any)[orderBy] ?? "";
      if (orderBy === "date") {
        valA = a.id;
        valB = b.id;
      }
      if (order.toLowerCase() === "desc") {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    });

    return items.slice(0, limit);
  }, [products, category, limit, orderBy, order]);

  if (loading) {
    return (
      <div className="border-4 border-black p-4 font-mono text-center">
        LOADING PRODUCTS...
      </div>
    );
  }

  return (
    <>
      {filtered.map((prod) => {
        const postShape = {
          id: prod.id,
          title: prod.title,
          excerpt: prod.excerpt,
          content: prod.content,
          date: "",
          author: "Admin",
          featuredImage: prod.featuredImage,
          customFields: {
            price: prod.price,
            regular_price: prod.regular_price,
            on_sale: prod.on_sale,
            sku: prod.sku,
            stock_status: prod.stock_status,
          },
          __postType: "product",
        };
        return (
          <WpPostContext.Provider key={prod.id} value={postShape}>
            {children}
          </WpPostContext.Provider>
        );
      })}
    </>
  );
}

