import { DOLLAR_ERP_CONFIG } from "./dollarErpConfig.js";

// Mock implementation of the Dollar ERP system to ensure the app works beautifully
// in the preview environment if no external servers are configured.
const MOCK_ERP_PRODUCTS = [
  {
    id: "erp-dhokla-001",
    name: "Dhokla",
    category: "Food",
    price: 60,
    stock: 95, // Sync updates stock to 95
    description: "Fluffy, yellow steamed savory cakes made from fermented rice and chickpea batter. Served with green chutney.",
    image: null
  },
  {
    id: "erp-khandvi-002",
    name: "Khandvi",
    category: "Snacks",
    price: 85, // Sync updates price to 85
    stock: 45,
    description: "Soft rolled sheets made of gram flour and yogurt, tempered with mustard seeds and grated coconut.",
    image: null
  },
  {
    id: "erp-fafda-003",
    name: "Fafda",
    category: "Farsan",
    price: 50,
    stock: 15, // Sync updates stock to 15
    description: "Crispy, crunchy fried chickpea flour strips seasoned with carom seeds. Best enjoyed with green peppers and Jalebi.",
    image: null
  },
  {
    id: "erp-jalebi-004",
    name: "Jalebi",
    category: "Sweets",
    price: 70,
    stock: 65, // Sync updates stock to 65
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
    price: 290, // Sync updates price to 290
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
    price: 185, // Sync updates price to 185
    stock: 25,
    description: "Pure cold-pressed groundnut oil with high smoke point, ideal for frying farsan items.",
    image: null
  },
  {
    id: "erp-shrikhand-009",
    name: "Mango Shrikhand",
    category: "Sweets",
    price: 120, // Brand new item added on sync!
    stock: 40,
    description: "Rich, creamy hung yogurt dessert flavored with real mango pulp, saffron, and cardamom sprinkles.",
    image: null
  }
];

export const dollarErpService = {
  /**
   * Fetches all products and stock levels from Dollar ERP.
   * Gracefully falls back to mock ERP data if URLs are placeholders.
   */
  async fetchInventory() {
    const isPlaceholder = 
      !DOLLAR_ERP_CONFIG.baseUrl || 
      DOLLAR_ERP_CONFIG.baseUrl.includes("DOLLAR_ERP_BASE_URL_HERE");

    if (isPlaceholder) {
      console.log("[DollarERP Service] Using local high-fidelity ERP mock data (since baseUrl is placeholder)");
      return MOCK_ERP_PRODUCTS.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        description: p.description,
        image: p.image
      }));
    }

    try {
      const url = `${DOLLAR_ERP_CONFIG.baseUrl}${DOLLAR_ERP_CONFIG.endpoints.inventory}`;
      console.log(`[DollarERP Service] Fetching from real ERP API: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/center-json",
          "Authorization": `Bearer ${DOLLAR_ERP_CONFIG.apiKey}`,
          "x-api-key": DOLLAR_ERP_CONFIG.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Dollar ERP responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Map the response format to standard format
      // If the response is already in some format, let's map it.
      // We'll support standard array response or wrapped inventory array.
      const items = Array.isArray(data) ? data : (data.products || data.inventory || []);
      
      return items.map(item => ({
        id: String(item.id || item.erp_id || item.product_id || ""),
        name: String(item.name || item.title || "Unnamed Product"),
        category: String(item.category || "General"),
        price: Number(item.price || 0),
        stock: Number(item.stock !== undefined ? item.stock : (item.quantity || 0)),
        description: String(item.description || ""),
        image: item.image || item.image_url || null
      }));

    } catch (error) {
      console.error("[DollarERP Service] Error fetching real inventory, falling back to mock:", error);
      // Fallback so the app doesn't break
      return MOCK_ERP_PRODUCTS.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        description: p.description,
        image: p.image
      }));
    }
  }
};
