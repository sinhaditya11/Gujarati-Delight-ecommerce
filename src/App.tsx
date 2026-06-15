import React, { useState, useEffect } from "react";
import { Product, CartItem, Order, ViewType, CategoryFilterType, Customer } from "./types.ts";
import ProductCard from "./components/ProductCard.tsx";
import ProductDetailsView from "./components/ProductDetailsView.tsx";
import CartView from "./components/CartView.tsx";
import CheckoutView from "./components/CheckoutView.tsx";
import AdminPanel from "./components/AdminPanel.tsx";
import CustomerAuthModal from "./components/CustomerAuthModal.tsx";
import { 
  ShoppingBag, Search, Sparkles, HelpCircle, 
  CheckCircle, Truck, RefreshCw, Smartphone, KeyRound, Heart, User
} from "lucide-react";

export default function App() {
  // Navigation
  const [activeView, setActiveView] = useState<ViewType>("shop");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Customer Account Session State
  const [currentUser, setCurrentUser] = useState<Customer | null>(() => {
    try {
      const stored = localStorage.getItem("gd_current_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<{ number: string; id: string } | null>(null);

  // Sync user changes to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("gd_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("gd_current_user");
    }
  }, [currentUser]);

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
  const [sortBy, setSortBy] = useState("Recommended");
  const [dietary, setDietary] = useState("All");
  const [collectionType, setCollectionType] = useState("All");

  // Location State
  const [pincodeStr, setPincodeStr] = useState("380015");
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState(pincodeStr);

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
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }

    const item = cartItems.find(it => it.product.id === productId);
    if (!item) return;

    if (quantity > item.product.stock) {
      showToast(`Cannot exceed dynamic ERP stock level (${item.product.stock})!`, "error");
      return;
    }

    setCartItems(prev => 
      prev.map(it => it.product.id === productId ? { ...it, quantity } : it)
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
    
    // Quick mock for dietary and collection filters
    const matchesDietary = dietary === "All" ? true :
                           dietary === "Jain" ? !p.name.toLowerCase().includes("garlic") && !p.name.toLowerCase().includes("onion") && !p.name.toLowerCase().includes("potato") : 
                           dietary === "Vegan" ? !p.name.toLowerCase().includes("ghee") && !p.name.toLowerCase().includes("milk") && !p.name.toLowerCase().includes("paneer") && !p.category.includes("Sweets") : true;

    const matchesCollection = collectionType === "All" ? true :
                              collectionType === "Best Sellers" ? (p.name.length % 3 === 0) :
                              collectionType === "New Arrivals" ? (p.name.length % 2 === 0) : true;

    return matchesCategory && matchesSearch && matchesDietary && matchesCollection && p.is_active;
  }).sort((a, b) => {
    if (sortBy === "Price Low to High") return a.price - b.price;
    if (sortBy === "Price High to Low") return b.price - a.price;
    if (sortBy === "Rating") {
      const aRating = (4 + (a.name.length % 10) / 10);
      const bRating = (4 + (b.name.length % 10) / 10);
      return bRating - aRating;
    }
    return 0; // Recommended (leave as-is or sort by ID)
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
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-[1.25rem] bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 animate-playful shrink-0 border border-white/20">
               <div className="absolute inset-1 rounded-3xl border border-white/40 border-dashed" />
               <Sparkles className="w-5 h-5 text-white drop-shadow-sm" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-display font-black text-lg md:text-xl tracking-tighter uppercase leading-none bg-gradient-to-r from-stone-900 to-stone-600 text-transparent bg-clip-text -mb-0.5">
                Gujarati 
              </span>
              <span className="font-display font-black text-lg md:text-xl tracking-tighter uppercase leading-none bg-gradient-to-r from-amber-600 to-orange-500 text-transparent bg-clip-text mt-0.5">
                Delights
              </span>
            </div>
          </div>

          {/* Quick same-day Ahmedabad Delivery Tracker (Elderly helper feature) */}
          <div className="hidden md:flex items-center gap-2 bg-[#F59E0B]/10 text-amber-800 text-[11px] font-bold px-3 py-1.5 rounded-full border border-amber-500/20">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>Express Delivery within 2-3 hours!</span>
          </div>

          {/* Action buttons list */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            
            {/* Customer Account Trigger Button */}
            <button
              id="customer-account-nav-btn"
              onClick={() => setIsAuthModalOpen(true)}
              className={`cursor-pointer h-9 px-2.5 sm:px-3.5 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition duration-150 ${
                currentUser
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-800"
                  : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
              }`}
            >
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden xs:inline">
                {currentUser ? `Kem chho, ${currentUser.name.split(" ")[0]}!` : "My Account"}
              </span>
              <span className="xs:hidden">
                {currentUser ? currentUser.name.split(" ")[0] : "Profile"}
              </span>
            </button>

            {/* Merchant Console Entrance */}
            <button
              id="merchant-console-nav-btn"
              onClick={() => setActiveView("admin")}
              className={`cursor-pointer h-9 px-2 sm:px-3 text-stone-500 hover:text-stone-800 hover:bg-stone-100/50 rounded-xl flex items-center justify-center transition duration-150`}
              title="Merchant Entrance"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Shopping cart trigger */}
            <button
              id="cart-navigation-btn"
              onClick={() => {
                setActiveView("cart");
                setSelectedProduct(null);
              }}
              className={`cursor-pointer h-10 md:h-11 pl-4 pr-1.5 md:pr-2 rounded-full flex items-center gap-2 md:gap-3 font-bold text-xs md:text-sm tracking-wide transition-all relative overflow-hidden group shrink-0 ${
                activeView === "cart"
                  ? "bg-stone-900 text-white shadow-xl shadow-stone-900/20 ring-4 ring-stone-900/10"
                  : "bg-white text-stone-800 shadow-sm hover:shadow-md border border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="flex items-center gap-1.5 md:gap-2 z-10">
                 <span className="uppercase tracking-widest text-[9px] md:text-[10px] mt-0.5 hidden lg:inline">Basket</span>
                 <div className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full transition-colors ${activeView === "cart" ? "bg-stone-800 text-amber-400" : "bg-amber-100 group-hover:bg-amber-200 text-amber-700"}`}>
                   <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" />
                 </div>
              </div>
              
              {cartCount > 0 && (
                <div className="absolute top-0 right-0 transform z-20 pointer-events-none">
                  <div className="relative">
                    <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-50"></div>
                    <span id="cart-indicators-count" className="relative bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[9px] md:text-[10px] font-black h-4.5 min-w-4.5 md:h-5 md:min-w-5 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.5)] px-1 border border-white">
                      {cartCount}
                    </span>
                  </div>
                </div>
              )}
              {activeView !== "cart" && (
                 <div className="absolute inset-0 bg-gradient-to-r from-amber-50/0 via-amber-100/40 to-amber-50/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main body viewport */}
      <main className="flex-1 bg-stone-50/40 pb-16">
        
        {/* Delivery Location Bar */}
        <div className="bg-amber-100 border-b border-amber-200 py-2 px-4 sticky top-[65px] z-30 shadow-sm cursor-pointer hover:bg-amber-100/80 transition-colors" onClick={() => setIsPincodeModalOpen(true)}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📍</span>
              <span className="text-xs font-bold text-amber-900">
                Deliver to: {pincodeStr}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
              Change
            </span>
          </div>
        </div>

        {/* ---- ROUTER ACCORDING TO STATE ---- */}
        {activeView === "shop" && (
          <div id="shop-container" className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
            
            {/* Hero search block */}
            <div className="text-center max-w-xl mx-auto space-y-6 pt-2 pb-2">
              <div className="relative inline-block px-8 py-2">
                <div className="absolute -top-1 -left-2 text-2xl animate-float-delayed drop-shadow-sm">✨</div>
                <div className="absolute -bottom-3 -right-2 text-3xl animate-float drop-shadow-sm">🌶️</div>
                <div className="absolute top-4 -right-6 text-xl animate-float drop-shadow-sm" style={{ animationDelay: '1s' }}>🥨</div>
                
                <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-tight bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 text-transparent bg-clip-text drop-shadow-sm pb-1">
                  Gujarati Delights
                </h1>
              </div>
              
              <p className="text-sm sm:text-base text-rose-950/70 max-w-md mx-auto leading-relaxed font-medium px-4">
                Experience the warmth of home in every bite. Handcrafted sweets, savory snacks, and premium groceries, prepared with love and time-honored traditions.
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
            <div className="space-y-4">
              <div id="category-filter-tabs" className="flex overflow-x-auto scrollbar-none pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-nowrap lg:flex-wrap sm:justify-start lg:justify-center gap-2 border-b border-stone-200/50 snap-x snap-mandatory">
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

              {/* Advanced Filter Row */}
              <div className="flex overflow-x-auto scrollbar-none pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-nowrap lg:flex-wrap sm:justify-start lg:justify-center gap-3 text-xs snap-x">
                <div className="flex flex-shrink-0 items-center gap-1.5 snap-start">
                  <span className="font-semibold text-stone-500 hidden sm:inline mr-1">Sort:</span>
                  {(["Recommended", "Price Low to High", "Price High to Low", "Rating"]).map(type => (
                    <button 
                      key={type} 
                      onClick={() => setSortBy(type)} 
                      className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${sortBy === type ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                      {type === "Price Low to High" ? "Price: Low-High" : type === "Price High to Low" ? "Price: High-Low" : type}
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-shrink-0 items-center gap-1.5 border-l border-stone-200 pl-3 snap-start relative">
                  {(["All", "Jain", "Vegan"]).map(type => (
                    <button 
                      key={type} 
                      onClick={() => setDietary(type)} 
                      className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${dietary === type ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                      {type === "All" ? "Any Diet" : type}
                    </button>
                  ))}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1.5 border-l border-stone-200 pl-3 snap-start">
                  {(["All", "Best Sellers", "New Arrivals"]).map(type => (
                    <button 
                      key={type} 
                      onClick={() => setCollectionType(type)} 
                      className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${collectionType === type ? 'bg-orange-50 border-orange-300 text-orange-800 shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                    >
                      {type === "All" ? "All Types" : type}
                    </button>
                  ))}
                </div>
              </div>
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
                <p className="text-stone-500 text-xs mt-1.5">Retry search queries or adjust filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    cartQuantity={cartItems.find(item => item.product.id === p.id)?.quantity || 0}
                    onAddToCart={(item) => handleAddToCart(item, 1)}
                    onUpdateQuantity={(item, qty) => handleUpdateCartQuantity(item.id, qty)}
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
            currentUser={currentUser}
            onPromptLogin={() => setIsAuthModalOpen(true)}
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

      {/* Customer authentication modal overlay */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={(customer) => setCurrentUser(customer)}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Pincode Modal */}
      {isPincodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up border border-stone-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <h3 className="font-display font-semibold text-lg text-stone-900">Delivery Location</h3>
              <button 
                onClick={() => setIsPincodeModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-stone-500 font-medium">Enter your pincode to check if we deliver to your area.</p>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={6}
                  value={pincodeInput}
                  onChange={e => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-11 px-3 border border-stone-200 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none text-center font-mono font-bold tracking-widest text-lg"
                  placeholder="000000"
                />
              </div>

              {pincodeInput.length === 6 && (
                <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${['380', '382'].some(prefix => pincodeInput.startsWith(prefix)) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {['380', '382'].some(prefix => pincodeInput.startsWith(prefix)) ? (
                    <>✅ Delivery available in your area!</>
                  ) : (
                    <>❌ Currently not delivering here.</>
                  )}
                </div>
              )}

              <button 
                onClick={() => {
                  if (pincodeInput.length === 6) {
                    setPincodeStr(pincodeInput);
                    setIsPincodeModalOpen(false);
                    showToast("Delivery location updated", "success");
                  } else {
                    showToast("Please enter a valid 6-digit pincode", "error");
                  }
                }}
                disabled={pincodeInput.length !== 6}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold h-11 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
