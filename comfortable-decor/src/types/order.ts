export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type OrderLineItem = {
  id: string;
  productId: number;
  name: string;
  image: string;
  quantity: number;
  price: number;
  variantLabel?: string;
};

export type Address = {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

export type Order = {
  id: string;
  number: string;
  date: string;
  status: OrderStatus;
  items: OrderLineItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
};
