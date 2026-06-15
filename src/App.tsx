import React, { useState, useEffect } from "react";
import { Product, CartItem, Order, ViewType, CategoryFilterType } from "./types.ts";
import ProductCard from "./components/ProductCard.tsx";
import ProductDetailsView from "./components/ProductDetailsView.tsx";
import CartView from "./components/CartView.tsx";
import CheckoutView from "./components/CheckoutView.tsx";
import AdminPanel from "./components/AdminPanel.tsx";
import { 
  ShoppingBag, Search, Sparkles, HelpCircle, 
  CheckCircle, Truck, RefreshCw, Smartphone, KeyRound, Heart
} from "lucide-react";

export default function App() {
  // Navigation
  const [activeView, setActiveView] = useState<ViewType>("shop");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<{ number: string; id: string } | null>(null);

  // Cart State (Persisted in localStorage in the browser!)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("gd_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Client Filter states
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Toast Alerts State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("gd_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  // Load products from our API on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsProductsLoading(true);
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        showToast("Failed to fetch fresh products from database.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error reading product database.", "error");
    } finally {
      setIsProductsLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Cart Utility functions
  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems(prevItems => {
      const idx = prevItems.findIndex(item => item.product.id === product.id);
      
      // Calculate available stock check
      const currentQtyInCart = idx !== -1 ? prevItems[idx].quantity : 0;
      const totalRequestedQty = currentQtyInCart + quantity;

      if (totalRequestedQty > product.stock) {
        showToast(`Cannot add items! Only ${product.stock} units are in stock.`, "error");
        return prevItems;
      }

      showToast(`Added ${quantity} unit${quantity > 1 ? "s" : ""} of ${product.name} to Cart.`, "success");

      if (idx !== -1) {
        // Exists already, increment qty
        const updated = [...prevItems];
        updated[idx] = {
          ...updated[idx],
          quantity: Math.min(product.stock, updated[idx].quantity + quantity)
        };
        return updated;
      } else {
        // Add as a new cart entry
        return [...prevItems, { product, quantity }];
      }
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    const item = cartItems.find(it => it.product.id === productId);
    if (!item) return;

    if (quantity > item.product.stock) {
      showToast(`Cannot exceed dynamic ERP stock level (${item.product.stock})!`, "error");
      return;
    }

    setCartItems(prev => 
      prev.map(it => it.product.id === productId ? { ...it, quantity: Math.max(1, quantity) } : it)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    const target = cartItems.find(it => it.product.id === productId);
    setCartItems(prev => prev.filter(it => it.product.id !== productId));
    if (target) {
      showToast(`Removed "${target.product.name}" from your basket.`, "info");
    }
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderConfirmed = (orderNumber: string, orderId: string) => {
    setLastConfirmedOrder({ number: orderNumber, id: orderId });
    setActiveView("order-confirmed");
    showToast(`Order placed successfully! ID: ${orderNumber}`, "success");
  };

  // Client Filters logic
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.is_active;
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col justify-between select-none">
      {/* Toast Alert overlay */}
      {toast && (
        <div id="toast-notification-banner" className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl shadow-xl border animate-slide-down text-xs font-semibold backdrop-blur-md transition-all duration-300 bg-white/95 text-stone-900 border-stone-200">
          <div className={`w-2.5 h-2.5 rounded-full ${
            toast.type === "success" ? "bg-emerald-500 animate-pulse" : toast.type === "error" ? "bg-rose-500" : "bg-blue-500"
          }`} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Primary Customer-facing Header & Navigation Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Tap Targets */}
          <div 
            id="brand-header-logo"
            onClick={() => {
              setActiveView("shop");
              setSelectedProduct(null);
            }}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-all">
              <Sparkles className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-lg md:text-xl tracking-tight text-stone-950 block leading-none">
                Gujarati Delights
              </span>
              <span className="text-[10px] md:text-xs font-medium text-amber-600 block mt-0.5">
                Fresh from our kitchen to your door
              </span>
            </div>
          </div>

          {/* Quick same-day Ahmedabad Delivery Tracker (Elderly helper feature) */}
          <div className="hidden md:flex items-center gap-2 bg-[#F59E0B]/10 text-amber-800 text-[11px] font-bold px-3 py-1.5 rounded-full border border-amber-500/20">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>Express Delivery within 2-3 hours!</span>
          </div>

          {/* Action buttons list */}
          <div className="flex items-center gap-3">
            
            {/* Merchant Console Entrance */}
            <button
              id="merchant-console-nav-btn"
              onClick={() => setActiveView("admin")}
              className={`cursor-pointer h-9 px-3.5 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition duration-150 ${
                activeView === "admin"
                  ? "bg-stone-900 border-stone-900 text-white"
                  : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Merchant Entrance</span>
            </button>

            {/* Shopping cart trigger */}
            <button
              id="cart-navigation-btn"
              onClick={() => {
                setActiveView("cart");
                setSelectedProduct(null);
              }}
              className={`cursor-pointer h-10 px-4 rounded-xl flex items-center gap-2 font-bold text-xs tracking-wide transition relative ${
                activeView === "cart"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                  : "bg-amber-100 hover:bg-amber-200/80 text-amber-900"
              }`}
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>Cart</span>
              
              {cartCount > 0 && (
                <span id="cart-indicators-count" className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-bold h-5 min-w-5 rounded-full flex items-center justify-center border-2 border-white px-1">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main body viewport */}
      <main className="flex-1 bg-stone-50/40 pb-16">
        
        {/* ---- ROUTER ACCORDING TO STATE ---- */}
        {activeView === "shop" && (
          <div id="shop-container" className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
            
            {/* Hero search block */}
            <div className="text-center max-w-xl mx-auto space-y-4 pt-4 pb-2">
              <h1 className="font-display font-extrabold text-3xl md:text-4xl text-stone-900 tracking-tight leading-tight">
                Traditional <span className="text-amber-500 underline decoration-amber-200 underline-offset-4">Ahmedabadi</span> Flavors
              </h1>
              <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
                Order fresh sweets, crunchy snacks, and general grocery items prepared with pure peanut oil and authentic recipes. Delivered direct to your family!
              </p>

              {/* Search input tab */}
              <div id="search-bar-input" className="relative max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 overflow-hidden flex items-center pr-3 py-0.5">
                <div className="pl-4 text-stone-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  id="product-search-input"
                  type="text"
                  placeholder="Search dhokla, fafda, sweets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 px-3 outline-none text-sm text-stone-850"
                />
                {searchQuery && (
                  <button
                    id="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    className="text-stone-400 hover:text-stone-600 text-xs font-bold font-mono p-1 select-none cursor-pointer"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            </div>

            {/* Premium Gujarati Foods Category Tabs */}
            <div id="category-filter-tabs" className="flex overflow-x-auto scrollbar-none pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center gap-2 border-b border-stone-200/50 snap-x snap-mandatory">
              {(["All", "Food", "Sweets", "Farsan", "Snacks", "Grocery"] as CategoryFilterType[]).map(cat => (
                <button
                  id={`cat-tab-${cat}`}
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition leading-none border shrink-0 snap-center ${
                    selectedCategory === cat
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/10"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid Renderer */}
            {isProductsLoading ? (
              <div className="py-20 flex flex-col justify-center items-center gap-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <span className="text-stone-400 text-xs font-medium">Delivering fresh products catalog...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200/60 p-16 text-center shadow-sm max-w-md mx-auto">
                <ShoppingBag className="w-12 h-12 text-stone-350 mx-auto mb-4" />
                <h3 className="font-display font-semibold text-lg text-stone-800">No delicatessen items match</h3>
                <p className="text-stone-500 text-xs mt-1.5">Retry search queries or adjust category tabs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAddToCart={(item) => handleAddToCart(item, 1)}
                    onClick={() => {
                      setSelectedProduct(p);
                      setActiveView("product-details");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === "product-details" && selectedProduct && (
          <ProductDetailsView
            product={selectedProduct}
            allProducts={products}
            onBack={() => {
              setActiveView("shop");
              setSelectedProduct(null);
            }}
            onAddToCart={handleAddToCart}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        )}

        {activeView === "cart" && (
          <CartView
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onProceedToCheckout={() => setActiveView("checkout")}
            onContinueShopping={() => setActiveView("shop")}
          />
        )}

        {activeView === "checkout" && (
          <CheckoutView
            cartItems={cartItems}
            onBackToCart={() => setActiveView("cart")}
            onClearCart={handleClearCart}
            onOrderConfirmed={handleOrderConfirmed}
          />
        )}

        {activeView === "order-confirmed" && lastConfirmedOrder && (
          <div id="order-confirmed-container" className="max-w-md mx-auto px-4 py-16 text-center animate-fade-in text-stone-900">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-8 animate-scale-up border border-emerald-100">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h1 className="font-display font-extrabold text-3xl tracking-tight leading-tight text-stone-950">
              Order Confirmed!
            </h1>
            <p className="text-stone-500 text-sm mt-2 leading-relaxed">
              Kem chho! Your transaction is authorized. We've notified our chefs, and delivery is on its way.
            </p>

            <div className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm mt-6 space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>Receipt Order Code</span>
                <strong className="font-mono text-stone-950 font-bold bg-stone-100 px-2.5 py-1 rounded text-sm">
                  {lastConfirmedOrder.number}
                </strong>
              </div>
              <div className="flex justify-between items-center border-t border-stone-100 pt-3 text-stone-600">
                <span>Estimated dispatch</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                  Within 2-3 hours
                </span>
              </div>
            </div>

            <button
              id="confirmed-continue-shopping"
              onClick={() => {
                setActiveView("shop");
                setLastConfirmedOrder(null);
              }}
              className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm w-full py-3.5 rounded-xl shadow-md shadow-amber-500/10 mt-6 transition duration-200"
            >
              Continue Shopping
            </button>
          </div>
        )}

        {activeView === "admin" && (
          <AdminPanel
            onBackToShop={() => {
              setActiveView("shop");
              setSelectedProduct(null);
            }}
            products={products}
            onRefreshProducts={fetchProducts}
          />
        )}
      </main>

      {/* Primary Footer */}
      <footer className="bg-white border-t border-stone-200/50 py-8 select-none text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Gujarati Delights Kitchens © 2026. Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>in Ahmedabad.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <button id="footer-shop-btn" onClick={() => setActiveView("shop")} className="hover:text-amber-600 transition cursor-pointer">Shop Products</button>
            <span>•</span>
            <button id="footer-cart-btn" onClick={() => setActiveView("cart")} className="hover:text-amber-600 transition cursor-pointer">Cart</button>
            <span>•</span>
            <button id="footer-admin-btn" onClick={() => setActiveView("admin")} className="hover:text-amber-600 transition cursor-pointer">Merchant Portal</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
