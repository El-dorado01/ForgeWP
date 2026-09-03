import type { ReactNode } from 'react';
import { WpAuthProvider } from '@forgewp/auth';
import { WpHead, PresetsStyle } from '@forgewp/react';
import { CartProvider } from '@/context/cart-context';
import { WishlistProvider } from '@/context/wishlist-context';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="forgewp-root">
      <PresetsStyle />
      <WpHead
        description="Premium furniture, lighting, and home décor — Comfortable Decor."
        keywords="furniture, lighting, home decor, eco-friendly, WooCommerce"
        ogType="website"
        twitterCard="summary_large_image"
      />
      <WpAuthProvider>
        <CartProvider>
          <WishlistProvider>
            {children}
          </WishlistProvider>
        </CartProvider>
      </WpAuthProvider>
    </div>
  );
}
