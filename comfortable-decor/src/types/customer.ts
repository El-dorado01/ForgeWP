import type { Address, Order } from './order';

export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  orders?: Order[];
};
