import * as React from 'react';
import type { CartLineItem, Product } from '@/types';
import { useWpCart } from '@forgewp/woocommerce';

type CartContextValue = {
  items: CartLineItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (
    product: Product,
    quantity?: number,
    variantLabel?: string,
  ) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  isLoading?: boolean;
};

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const wpCart = useWpCart();

  const value = React.useMemo<CartContextValue>(
    () => ({
      items: wpCart.items as CartLineItem[],
      isOpen: wpCart.isOpen,
      itemCount: wpCart.itemCount,
      subtotal: wpCart.subtotal,
      openCart: wpCart.openCart,
      closeCart: wpCart.closeCart,
      toggleCart: wpCart.toggleCart,
      addItem: (product: Product, quantity = 1, variantLabel?: string) => {
        wpCart.addItem(product, quantity, variantLabel);
      },
      removeItem: (lineId: string) => {
        wpCart.removeItem(lineId);
      },
      updateQuantity: (lineId: string, quantity: number) => {
        wpCart.updateQuantity(lineId, quantity);
      },
      clearCart: () => {
        wpCart.clearCart();
      },
      isLoading: wpCart.isLoading,
    }),
    [
      wpCart.items,
      wpCart.isOpen,
      wpCart.itemCount,
      wpCart.subtotal,
      wpCart.openCart,
      wpCart.closeCart,
      wpCart.toggleCart,
      wpCart.addItem,
      wpCart.removeItem,
      wpCart.updateQuantity,
      wpCart.clearCart,
      wpCart.isLoading,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  const wpCart = useWpCart();
  if (ctx) return ctx;

  return {
    items: wpCart.items as CartLineItem[],
    isOpen: wpCart.isOpen,
    itemCount: wpCart.itemCount,
    subtotal: wpCart.subtotal,
    openCart: wpCart.openCart,
    closeCart: wpCart.closeCart,
    toggleCart: wpCart.toggleCart,
    addItem: (product: Product, quantity = 1, variantLabel?: string) => {
      wpCart.addItem(product, quantity, variantLabel);
    },
    removeItem: (lineId: string) => {
      wpCart.removeItem(lineId);
    },
    updateQuantity: (lineId: string, quantity: number) => {
      wpCart.updateQuantity(lineId, quantity);
    },
    clearCart: () => {
      wpCart.clearCart();
    },
    isLoading: wpCart.isLoading,
  };
}
