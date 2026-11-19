export type CartLineItem = {
  id: string;
  productId: number;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  quantity: number;
  variantLabel?: string;
  maxQuantity?: number;
};

export type CartState = {
  items: CartLineItem[];
  isOpen: boolean;
};
