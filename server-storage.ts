import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Types matching the specified schema
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

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const DB_FILE = path.join(process.cwd(), "database.json");

// Default seed data
const SEED_PRODUCTS: Omit<Product, 'last_synced_at'>[] = [
  {
    id: "prod-dhokla",
    erp_id: "erp-dhokla-001",
    name: "Dhokla",
    category: "Food",
    price: 60,
    stock: 80,
    description: "Fluffy, yellow steamed savory cakes made from fermented rice and chickpea batter. Served with green chutney.",
    image_url: null,
    is_active: true
  },
  {
    id: "prod-khandvi",
    erp_id: "erp-khandvi-002",
    name: "Khandvi",
    category: "Snacks",
    price: 80,
    stock: 45,
    description: "Soft rolled sheets made of gram flour and yogurt, tempered with mustard seeds and grated coconut.",
    image_url: null,
    is_active: true
  },
  {
    id: "prod-fafda",
    erp_id: "erp-fafda-003",
    name: "Fafda",
    category: "Farsan",
    price: 50,
    stock: 12,
    description: "Crispy, crunchy fried chickpea flour strips seasoned with carom seeds. Best enjoyed with green peppers and Jalebi.",
    image_url: null,
    is_active: true
  },
  {
    id: "prod-jalebi",
    erp_id: "erp-jalebi-004",
    name: "Jalebi",
    category: "Sweets",
    price: 70,
    stock: 60,
    description: "Sweet, crunchy spiral-shaped orange fritters soaked in cardamom sugar syrup.",
    image_url: null,
    is_active: true
  },
  {
    id: "prod-gathiya",
    erp_id: "erp-gathiya-005",
    name: "Gathiya",
    category: "Farsan",
    price: 40,
    stock: 90,
    description: "Traditional crunchy tea-time snack made of seasoned chickpea flour dough.",
    image_url: null,
    is_active: true
  },
  {
    id: "prod-atta",
    erp_id: "erp-atta-006",
    name: "Atta 5kg",
    category: "Grocery",
    price: 280,
    stock: 30,
    description: "Premium quality 100% whole wheat stone-ground flour, perfect for making soft rotis and parathas.",
    image_url: null,
    is_active: true
  },
  {
    id: "prod-toor-dal",
    erp_id: "erp-toor-dal-007",
    name: "Toor Dal 1kg",
    category: "Grocery",
    price: 150,
    stock: 50,
    description: "High-protein unpolished split pigeon peas, a staple in every Gujarati kitchen for sweet-and-sour dal.",
    image_url: null,
    is_active: true
  },
  {
    id: "prod-groundnut-oil",
    erp_id: "erp-groundnut-oil-008",
    name: "Groundnut Oil 1L",
    category: "Grocery",
    price: 180,
    stock: 25,
    description: "Pure cold-pressed groundnut oil with high smoke point, ideal for frying farsan items.",
    image_url: null,
    is_active: true
  }
];

class StorageManager {
  private useSupabase = false;
  private supabaseClient: any = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey && !supabaseUrl.includes("YOUR_SUPABASE")) {
      console.log(`[Storage] Initializing Supabase client with ${supabaseUrl}`);
      try {
        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
        this.useSupabase = true;
      } catch (err) {
        console.error("[Storage] Failed to initialize Supabase client:", err);
      }
    } else {
      console.log("[Storage] Supabase keys absent or placeholder. Using local JSON store: database.json");
    }
    
    this.ensureLocalDbExists();
  }

  private ensureLocalDbExists() {
    if (!fs.existsSync(DB_FILE)) {
      const initialDb = {
        products: SEED_PRODUCTS.map(p => ({ ...p, last_synced_at: null })),
        orders: [] as Order[],
        order_items: [] as OrderItem[],
        last_synced_at: null as string | null
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      console.log("[Storage] Created local JSON database database.json");
    }
  }

  private getLocalData() {
    this.ensureLocalDbExists();
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("[Storage] Error reading database.json, resetting...", e);
      const initialDb = {
        products: SEED_PRODUCTS.map(p => ({ ...p, last_synced_at: null })),
        orders: [] as Order[],
        order_items: [] as OrderItem[],
        last_synced_at: null as string | null
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf-8");
      return initialDb;
    }
  }

  private saveLocalData(data: any) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  // ---- Products ----
  async getProducts(): Promise<Product[]> {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .select("*")
          .order("name", { ascending: true });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          console.log("[Storage/Supabase] Products table is empty, seeding tables...");
          const seeded = await this.seedSupabaseProducts();
          return seeded;
        }
        return data as Product[];
      } catch (err) {
        console.error("[Storage] Supabase getProducts failing, using local fallback", err);
      }
    }
    
    // Local fallback
    const db = this.getLocalData();
    return db.products;
  }

  private async seedSupabaseProducts(): Promise<Product[]> {
    try {
      const pData = SEED_PRODUCTS.map(p => ({
        id: p.id,
        erp_id: p.erp_id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        description: p.description,
        image_url: p.image_url,
        is_active: p.is_active,
        last_synced_at: null
      }));
      
      const { data, error } = await this.supabaseClient
        .from("products")
        .insert(pData)
        .select();
        
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("[Storage] Failed seeding Supabase products:", err);
      return SEED_PRODUCTS.map(p => ({ ...p, last_synced_at: null }));
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[Storage] Supabase updateProduct failing, using local fallback", err);
      }
    }

    // Local fallback
    const db = this.getLocalData();
    const idx = db.products.findIndex((p: Product) => p.id === id);
    if (idx !== -1) {
      db.products[idx] = { ...db.products[idx], ...updates };
      this.saveLocalData(db);
      return db.products[idx];
    }
    return null;
  }

  async syncProductsFromERP(erpProducts: any[]): Promise<{ count: number; last_synced_at: string }> {
    const timestamp = new Date().toISOString();
    
    if (this.useSupabase) {
      try {
        console.log("[Storage/Supabase] Syncing items from ERP...");
        let count = 0;
        
        for (const erp of erpProducts) {
          // Check if product exists by erp_id
          const { data: existing } = await this.supabaseClient
            .from("products")
            .select("id")
            .eq("erp_id", erp.id)
            .maybeSingle();
            
          if (existing) {
            await this.supabaseClient
              .from("products")
              .update({
                price: erp.price,
                stock: erp.stock,
                description: erp.description,
                image_url: erp.image || null,
                last_synced_at: timestamp
              })
              .eq("id", existing.id);
          } else {
            await this.supabaseClient
              .from("products")
              .insert({
                id: crypto.randomUUID(),
                erp_id: erp.id,
                name: erp.name,
                category: erp.category,
                price: erp.price,
                stock: erp.stock,
                description: erp.description,
                image_url: erp.image || null,
                is_active: true,
                last_synced_at: timestamp
              });
          }
          count++;
        }
        
        // Return details
        return { count, last_synced_at: timestamp };
      } catch (err) {
        console.error("[Storage] Supabase syncProductsFromERP failing, syncing locally", err);
      }
    }

    // Local fallback
    const db = this.getLocalData();
    let count = 0;
    
    for (const erp of erpProducts) {
      const matches = db.products.find((p: Product) => p.erp_id === erp.id);
      if (matches) {
        matches.price = erp.price;
        matches.stock = erp.stock;
        matches.description = erp.description;
        matches.image_url = erp.image || null;
        matches.last_synced_at = timestamp;
      } else {
        db.products.push({
          id: crypto.randomUUID(),
          erp_id: erp.id,
          name: erp.name,
          category: erp.category,
          price: erp.price,
          stock: erp.stock,
          description: erp.description,
          image_url: erp.image || null,
          is_active: true,
          last_synced_at: timestamp
        });
      }
      count++;
    }
    
    db.last_synced_at = timestamp;
    this.saveLocalData(db);
    return { count, last_synced_at: timestamp };
  }

  async getLastSyncedAt(): Promise<string | null> {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("products")
          .select("last_synced_at")
          .not("last_synced_at", "is", null)
          .order("last_synced_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data?.last_synced_at || null;
      } catch (e) {
        console.log("[Storage] Supabase getLastSyncedAt failing, checking local");
      }
    }
    const db = this.getLocalData();
    return db.last_synced_at || null;
  }

  // ---- Orders ----
  async getOrders(): Promise<Order[]> {
    if (this.useSupabase) {
      try {
        const { data: ords, error: ordErr } = await this.supabaseClient
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
          
        if (ordErr) throw ordErr;
        
        // Fetch order items for each order
        const fullOrders: Order[] = [];
        for (const o of ords || []) {
          const { data: items, error: itemErr } = await this.supabaseClient
            .from("order_items")
            .select("*")
            .eq("order_id", o.id);
          
          if (!itemErr) {
            o.items = items || [];
          }
          fullOrders.push(o);
        }
        return fullOrders;
      } catch (err) {
        console.error("[Storage] Supabase getOrders failing, using local fallback", err);
      }
    }

    // Local fallback
    const db = this.getLocalData();
    const ordersWithItems = db.orders.map((o: Order) => {
      const items = db.order_items.filter((item: OrderItem) => item.order_id === o.id);
      return { ...o, items };
    });
    // Sort Newest first
    return ordersWithItems.sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createOrder(params: {
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    order_notes: string | null;
    total_amount: number;
    delivery_charge: number;
    items: { product_id: string; product_name: string; quantity: number; unit_price: number }[];
  }): Promise<Order> {
    const orderId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Generate order number like GD-001
    let orderNum = "GD-001";
    
    if (this.useSupabase) {
      try {
        // Query last order to get next order number
        const { data: lastOrder } = await this.supabaseClient
          .from("orders")
          .select("order_number")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (lastOrder && lastOrder.order_number) {
          const match = lastOrder.order_number.match(/GD-(\d+)/);
          if (match) {
            const nextSeq = parseInt(match[1]) + 1;
            orderNum = `GD-${String(nextSeq).padStart(3, "0")}`;
          }
        }
        
        // Insert order
        const { data: dbOrder, error: orderErr } = await this.supabaseClient
          .from("orders")
          .insert({
            id: orderId,
            order_number: orderNum,
            customer_name: params.customer_name,
            customer_phone: params.customer_phone,
            delivery_address: params.delivery_address,
            order_notes: params.order_notes,
            total_amount: params.total_amount,
            delivery_charge: params.delivery_charge,
            payment_status: "pending",
            order_status: "pending",
            razorpay_payment_id: null,
            created_at: timestamp
          })
          .select()
          .single();
          
        if (orderErr) throw orderErr;
        
        // Insert items and adjust stock levels
        const itemsToInsert = params.items.map(item => ({
          id: crypto.randomUUID(),
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }));
        
        const { error: itemsErr } = await this.supabaseClient
          .from("order_items")
          .insert(itemsToInsert);
          
        if (itemsErr) throw itemsErr;
        
        // Deduct stocks
        for (const item of params.items) {
          const { data: prod } = await this.supabaseClient
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .maybeSingle();
            
          if (prod) {
            const newStock = Math.max(0, prod.stock - item.quantity);
            await this.supabaseClient
              .from("products")
              .update({ stock: newStock })
              .eq("id", item.product_id);
          }
        }
        
        return {
          ...dbOrder,
          items: itemsToInsert
        };
      } catch (err) {
        console.error("[Storage] Supabase createOrder failed, creating locally", err);
      }
    }

    // Local fallback
    const db = this.getLocalData();
    
    // Calculate sequence
    if (db.orders.length > 0) {
      // Find maximum sequence
      let maxSeq = 0;
      db.orders.forEach((o: Order) => {
        const match = o.order_number.match(/GD-(\d+)/);
        if (match) {
          const seq = parseInt(match[1]);
          if (seq > maxSeq) maxSeq = seq;
        }
      });
      orderNum = `GD-${String(maxSeq + 1).padStart(3, "0")}`;
    }
    
    const newOrder: Order = {
      id: orderId,
      order_number: orderNum,
      customer_name: params.customer_name,
      customer_phone: params.customer_phone,
      delivery_address: params.delivery_address,
      order_notes: params.order_notes,
      total_amount: params.total_amount,
      delivery_charge: params.delivery_charge,
      payment_status: "pending",
      order_status: "pending",
      razorpay_payment_id: null,
      created_at: timestamp
    };
    
    const orderItems: OrderItem[] = params.items.map(item => ({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));
    
    // Deduct stock levels in local DB
    params.items.forEach(item => {
      const p = db.products.find((prod: Product) => prod.id === item.product_id);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
      }
    });
    
    db.orders.push(newOrder);
    db.order_items.push(...orderItems);
    this.saveLocalData(db);
    
    return {
      ...newOrder,
      items: orderItems
    };
  }

  async updateOrderPayment(id: string, status: "paid" | "failed", razorpayPaymentId: string | null): Promise<Order | null> {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("orders")
          .update({
            payment_status: status,
            razorpay_payment_id: razorpayPaymentId
          })
          .eq("id", id)
          .select()
          .single();
          
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[Storage] Supabase updateOrderPayment failing, using local fallback", err);
      }
    }

    // Local fallback
    const db = this.getLocalData();
    const idx = db.orders.findIndex((o: Order) => o.id === id);
    if (idx !== -1) {
      db.orders[idx].payment_status = status;
      db.orders[idx].razorpay_payment_id = razorpayPaymentId;
      this.saveLocalData(db);
      return db.orders[idx];
    }
    return null;
  }

  async updateOrderStatus(id: string, status: "pending" | "out-for-delivery" | "delivered"): Promise<Order | null> {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabaseClient
          .from("orders")
          .update({
            order_status: status
          })
          .eq("id", id)
          .select()
          .single();
          
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("[Storage] Supabase updateOrderStatus failing, using local fallback", err);
      }
    }

    // Local fallback
    const db = this.getLocalData();
    const idx = db.orders.findIndex((o: Order) => o.id === id);
    if (idx !== -1) {
      db.orders[idx].order_status = status;
      this.saveLocalData(db);
      return db.orders[idx];
    }
    return null;
  }
}

export const storage = new StorageManager();
