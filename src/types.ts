export interface Product {
  id: string;
  erp_id: string | null;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image_url: string | null;
  is_active: boolean;
  last_synced_at: string | null;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  delivery_address: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  order_notes: string | null;
  total_amount: number;
  delivery_charge: number;
  payment_status: "pending" | "paid" | "failed";
  order_status: "pending" | "out-for-delivery" | "delivered";
  razorpay_payment_id: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type ViewType = "shop" | "product-details" | "cart" | "checkout" | "order-confirmed" | "admin";
export type AdminTabType = "orders" | "products";
export type CategoryFilterType = "All" | "Food" | "Sweets" | "Farsan" | "Snacks" | "Grocery";
