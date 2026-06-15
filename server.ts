import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { storage } from "./server-storage.ts";
import { dollarErpService } from "./dollarErpService.js";
import { sendTelegramNotification } from "./notifications.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parser
  app.use(express.json());

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. Products API
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (err: any) {
      console.error("[API] Error in GET /api/products:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products/:id/toggle-active", async (req, res) => {
    try {
      const { is_active } = req.body;
      const updated = await storage.updateProduct(req.params.id, { is_active: !!is_active });
      if (!updated) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(updated);
    } catch (err: any) {
      console.error("[API] Error in POST /api/products/:id/toggle-active:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { price, description } = req.body;
      const updated = await storage.updateProduct(req.params.id, {
        price: Number(price),
        description: String(description || "")
      });
      if (!updated) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(updated);
    } catch (err: any) {
      console.error("[API] Error in PUT /api/products/:id:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Sync Inventory
  app.post("/api/sync-inventory", async (req, res) => {
    try {
      console.log("[API] Starting inventory sync from Dollar ERP...");
      const erpProducts = await dollarErpService.fetchInventory();
      const result = await storage.syncProductsFromERP(erpProducts);
      res.json({
        success: true,
        count: result.count,
        last_synced_at: result.last_synced_at
      });
    } catch (err: any) {
      console.error("[API] Error in POST /api/sync-inventory:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/last-sync", async (req, res) => {
    try {
      const last_synced_at = await storage.getLastSyncedAt();
      res.json({ last_synced_at });
    } catch (err: any) {
      console.error("[API] Error in GET /api/last-sync:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Mock Dollar ERP API Endpoint
  app.get("/api/dollar-erp/inventory", (req, res) => {
    res.json([
      {
        id: "erp-dhokla-001",
        name: "Dhokla",
        category: "Food",
        price: 60,
        stock: 95,
        description: "Fluffy, yellow steamed savory cakes made from fermented rice and chickpea batter. Served with green chutney.",
        image: null
      },
      {
        id: "erp-khandvi-002",
        name: "Khandvi",
        category: "Snacks",
        price: 85,
        stock: 45,
        description: "Soft rolled sheets made of gram flour and yogurt, tempered with mustard seeds and grated coconut.",
        image: null
      },
      {
        id: "erp-fafda-003",
        name: "Fafda",
        category: "Farsan",
        price: 50,
        stock: 15,
        description: "Crispy, crunchy fried chickpea flour strips seasoned with carom seeds. Best enjoyed with green peppers and Jalebi.",
        image: null
      },
      {
        id: "erp-jalebi-004",
        name: "Jalebi",
        category: "Sweets",
        price: 70,
        stock: 65,
        description: "Sweet, crunchy spiral-shaped orange fritters soaked in cardamom sugar syrup.",
        image: null
      },
      {
        id: "erp-gathiya-005",
        name: "Gathiya",
        category: "Farsan",
        price: 40,
        stock: 90,
        description: "Traditional crunchy tea-time snack made of seasoned chickpea flour dough.",
        image: null
      },
      {
        id: "erp-atta-006",
        name: "Atta 5kg",
        category: "Grocery",
        price: 290,
        stock: 30,
        description: "Premium quality 100% whole wheat stone-ground flour, perfect for making soft rotis and parathas.",
        image: null
      },
      {
        id: "erp-toor-dal-007",
        name: "Toor Dal 1kg",
        category: "Grocery",
        price: 150,
        stock: 50,
        description: "High-protein unpolished split pigeon peas, a staple in every Gujarati kitchen for sweet-and-sour dal.",
        image: null
      },
      {
        id: "erp-groundnut-oil-008",
        name: "Groundnut Oil 1L",
        category: "Grocery",
        price: 185,
        stock: 25,
        description: "Pure cold-pressed groundnut oil with high smoke point, ideal for frying farsan items.",
        image: null
      },
      {
        id: "erp-shrikhand-009",
        name: "Mango Shrikhand",
        category: "Sweets",
        price: 120,
        stock: 40,
        description: "Rich, creamy hung yogurt dessert flavored with real mango pulp, saffron, and cardamom sprinkles.",
        image: null
      }
    ]);
  });

  // 5. Orders API
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (err: any) {
      console.error("[API] Error in GET /api/orders:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { customer_name, customer_phone, delivery_address, order_notes, total_amount, delivery_charge, items } = req.body;
      
      if (!customer_name || !customer_phone || !delivery_address || !items || !items.length) {
        return res.status(400).json({ error: "Missing required fields for order checkout" });
      }

      const order = await storage.createOrder({
        customer_name,
        customer_phone,
        delivery_address,
        order_notes: order_notes || null,
        total_amount: Number(total_amount),
        delivery_charge: Number(delivery_charge ?? 30),
        items
      });

      res.json(order);
    } catch (err: any) {
      console.error("[API] Error in POST /api/orders:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders/:id/payment-success", async (req, res) => {
    try {
      const { razorpay_payment_id } = req.body;
      const order = await storage.updateOrderPayment(req.params.id, "paid", razorpay_payment_id || "PAY-MOCK-" + Math.floor(Math.random() * 900000 + 100000));
      
      if (order) {
        // Send Telegram Notification on payment success
        const items = order.items || [];
        const itemsListStr = items.map(it => `${it.product_name} x${it.quantity}`).join(", ");
        
        const message = `🛍️ New Order — ${order.order_number}\nCustomer: ${order.customer_name}\nPhone: ${order.customer_phone}\nItems: ${itemsListStr}\nTotal: ₹${order.total_amount}\nAddress: ${order.delivery_address}`;
        
        await sendTelegramNotification(message);
      }
      
      res.json({ success: true, order });
    } catch (err: any) {
      console.error("[API] Error in POST /api/orders/:id/payment-success:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders/:id/payment-failed", async (req, res) => {
    try {
      const order = await storage.updateOrderPayment(req.params.id, "failed", null);
      
      if (order) {
        // Send Telegram failure Notification
        const message = `❌ Payment Failed — ${order.order_number}\nCustomer: ${order.customer_name}\nPhone: ${order.customer_phone}\nAmount: ₹${order.total_amount}`;
        
        await sendTelegramNotification(message);
      }
      
      res.json({ success: true, order });
    } catch (err: any) {
      console.error("[API] Error in POST /api/orders/:id/payment-failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders/:id/update-status", async (req, res) => {
    try {
      const { order_status } = req.body;
      if (!["pending", "out-for-delivery", "delivered"].includes(order_status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      const order = await storage.updateOrderStatus(req.params.id, order_status);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (err: any) {
      console.error("[API] Error in POST /api/orders/:id/update-status:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Customers API
  app.get("/api/customers/check-phone", async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone) return res.status(400).json({ error: "Phone number required" });
      
      const rawPhone = String(phone);
      const cleanTarget = rawPhone.replace(/\D/g, "").slice(-10);
      
      let customer = await storage.getCustomerByPhone(rawPhone);
      if (!customer && cleanTarget) {
        customer = await storage.getCustomerByPhone(cleanTarget);
      }
      
      res.json({ exists: !!customer, phone: cleanTarget });
    } catch (err: any) {
      console.error("[API] Error in GET /api/customers/check-phone:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/customers/otp-login", async (req, res) => {
    try {
      const { phone, name, email, delivery_address } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Missing phone number" });
      }

      const rawPhone = String(phone);
      const cleanNum = rawPhone.replace(/\D/g, "").slice(-10);
      
      let customer = await storage.getCustomerByPhone(rawPhone);
      if (!customer && cleanNum) {
        customer = await storage.getCustomerByPhone(cleanNum);
      }

      if (customer) {
        // Customer exists, log them in directly
        const { password: _, ...safeCustomer } = customer as any;
        return res.json(safeCustomer);
      }

      // If customer doesn't exist, they must register by providing a name
      if (!name) {
        return res.status(444).json({ exists: false, error: "Registration details required for new number" });
      }

      // Create new customer
      const newCustomer = await storage.createCustomer({
        phone: cleanNum || rawPhone,
        name,
        email: email || null,
        delivery_address: delivery_address || ""
      });

      const { password: _, ...safeCustomer } = newCustomer as any;
      return res.json(safeCustomer);
    } catch (err: any) {
      console.error("[API] Error in POST /api/customers/otp-login:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/customers/register", async (req, res) => {
    try {
      const { phone, name, email, password, delivery_address } = req.body;
      if (!phone || !name || !password) {
        return res.status(400).json({ error: "Missing phone, name or password" });
      }

      // Check if phone already registered
      const existing = await storage.getCustomerByPhone(phone);
      if (existing) {
        return res.status(400).json({ error: "Phone number is already registered" });
      }

      const customer = await storage.createCustomer({
        phone,
        name,
        email: email || null,
        password,
        delivery_address: delivery_address || ""
      });

      // return customer without password
      const { password: _, ...safeCustomer } = customer as any;
      res.json(safeCustomer);
    } catch (err: any) {
      console.error("[API] Error in POST /api/customers/register:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/customers/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ error: "Missing phone or password" });
      }

      const customer = await storage.getCustomerByPhone(phone);
      if (!customer) {
        return res.status(401).json({ error: "No customer profile found with this phone number" });
      }

      if (customer.password !== password) {
        return res.status(401).json({ error: "Incorrect password. Please try again." });
      }

      const { password: _, ...safeCustomer } = customer as any;
      res.json(safeCustomer);
    } catch (err: any) {
      console.error("[API] Error in POST /api/customers/login:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const { password: _, ...safeCustomer } = customer as any;
      res.json(safeCustomer);
    } catch (err: any) {
      console.error("[API] Error in GET /api/customers/:id:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const { name, email, password, delivery_address } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (password !== undefined) updates.password = password;
      if (delivery_address !== undefined) updates.delivery_address = delivery_address;

      const customer = await storage.updateCustomer(req.params.id, updates);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const { password: _, ...safeCustomer } = customer as any;
      res.json(safeCustomer);
    } catch (err: any) {
      console.error("[API] Error in PUT /api/customers/:id:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development / production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT}`);
  });
}

startServer();
