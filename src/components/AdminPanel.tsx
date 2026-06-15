import React, { useState, useEffect } from "react";
import { Product, Order, AdminTabType } from "../types.ts";
import { 
  KeyRound, RefreshCw, BarChart3, Database, ShoppingBag, 
  ToggleLeft, ToggleRight, Check, CheckCircle2, AlertTriangle, 
  X, Edit, Save, ArrowLeft, Clock, MapPin, Phone, User, LogOut 
} from "lucide-react";

interface AdminPanelProps {
  onBackToShop: () => void;
  products: Product[];
  onRefreshProducts: () => Promise<void>;
}

export default function AdminPanel({
  onBackToShop,
  products,
  onRefreshProducts
}: AdminPanelProps) {
  // Login States
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("gd_admin_logged") === "true";
  });
  const [loginError, setLoginError] = useState("");

  // Tabs / Content
  const [activeTab, setActiveTab] = useState<AdminTabType>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedText, setLastSyncedText] = useState("Never");

  // Inline editing of products
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  // Status Alerts
  const [adminNotification, setAdminNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load orders when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders();
      fetchLastSyncTime();
    }
  }, [isLoggedIn]);

  // Sync Timer Updater (updates relative "X minutes ago" tags every 30s)
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      fetchLastSyncTime();
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "gujarati123") {
      setIsLoggedIn(true);
      setLoginError("");
      localStorage.setItem("gd_admin_logged", "true");
    } else {
      setLoginError("Incorrect password! Try hardcoded password: gujarati123");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("gd_admin_logged");
  };

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (e) {
      console.error("Error loading orders:", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const fetchLastSyncTime = async () => {
    try {
      const response = await fetch("/api/last-sync");
      if (response.ok) {
        const { last_synced_at } = await response.json();
        calculateSyncDelay(last_synced_at);
      }
    } catch (e) {
      console.error("Error reading last sync timestamp:", e);
    }
  };

  const calculateSyncDelay = (timestamp: string | null) => {
    if (!timestamp) {
      setLastSyncedText("Never");
      return;
    }
    const diffMs = new Date().getTime() - new Date(timestamp).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      setLastSyncedText("Just now");
    } else if (diffMinutes === 1) {
      setLastSyncedText("1 minute ago");
    } else {
      setLastSyncedText(`${diffMinutes} minutes ago`);
    }
  };

  // Sync Products from Dollar ERP action
  const handleSyncFromERP = async () => {
    setIsSyncing(true);
    setAdminNotification(null);
    try {
      const response = await fetch("/api/sync-inventory", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Dollar ERP sync API call failed");
      }

      const result = await response.json();
      if (result.success) {
        setAdminNotification({
          type: "success",
          text: `Successfully synced ${result.count} items from Dollar ERP! Inventory stock levels updated.`
        });
        calculateSyncDelay(result.last_synced_at);
        await onRefreshProducts();
      } else {
        throw new Error("Unable to parse sync results");
      }
    } catch (err: any) {
      setAdminNotification({
        type: "error",
        text: err.message || "Error communicating with Dollar ERP service."
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setAdminNotification(null), 8500);
    }
  };

  // Toggle toggle product active state
  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const response = await fetch(`/api/products/${productId}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus })
      });

      if (response.ok) {
        await onRefreshProducts();
        showFeedback("Status updated successfully.");
      }
    } catch (e) {
      console.error(e);
      showFeedback("Error toggling product status.", "error");
    }
  };

  // Open Edit Product Modal / Controls
  const startEditing = (p: Product) => {
    setEditingProductId(p.id);
    setEditPrice(p.price);
    setEditDescription(p.description || "");
  };

  const saveProductEdits = async (productId: string) => {
    setIsUpdatingProduct(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: editPrice,
          description: editDescription
        })
      });

      if (response.ok) {
        setEditingProductId(null);
        await onRefreshProducts();
        showFeedback("Product details updated successfully!");
      } else {
        const errorMsg = await response.text();
        showFeedback(`Failed to update details: ${errorMsg}`, "error");
      }
    } catch (e) {
      showFeedback("Network error saving edits.", "error");
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  // Update order status pending → out-for-delivery → delivered
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_status: nextStatus })
      });

      if (response.ok) {
        await fetchOrders();
        showFeedback("Order delivery status updated and saved.");
      } else {
        showFeedback("Fail updating delivery status.", "error");
      }
    } catch (e) {
      showFeedback("Error reaching database.", "error");
    }
  };

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setAdminNotification({ type, text });
    setTimeout(() => setAdminNotification(null), 3000);
  };

  // ---- RENDER LOGIN PANEL ----
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 animate-fade-in text-stone-900">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-8 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 border border-amber-100">
            <KeyRound className="w-6 h-6" />
          </div>
          
          <h1 className="font-display font-bold text-2xl tracking-tight text-center">
            Gujarati Delights
          </h1>
          <p className="text-stone-500 text-xs text-center mt-1">
            Administrative Console Panel Management
          </p>

          <form id="admin-login-form" onSubmit={handleLogin} className="w-full mt-6 space-y-4">
            <div className="space-y-1.5 focus-within:text-amber-600">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Security Password
              </label>
              <input
                id="admin-password-input"
                type="password"
                required
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-stone-50 outline-none font-mono text-center text-sm"
              />
            </div>

            {loginError && (
              <div className="text-rose-600 text-xs font-medium text-center bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                {loginError}
              </div>
            )}

            <button
              id="admin-login-btn"
              type="submit"
              className="cursor-pointer w-full h-11 bg-[#1f2937] hover:bg-[#111827] text-white text-sm font-semibold rounded-xl tracking-wide transition duration-150"
            >
              Verify & Enter Console
            </button>
          </form>

          <button
            id="admin-back-shop-btn"
            onClick={onBackToShop}
            className="cursor-pointer text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline mt-6 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Customer Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in text-stone-900">
      {/* Admin Dashboard Header */}
      <div id="admin-header-row" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/60 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-[#1f2937] text-white font-mono font-bold text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider">
              Console
            </span>
            <button 
              id="admin-logout-btn"
              onClick={handleLogout}
              className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition cursor-pointer"
              title="Logout from console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-stone-900 mt-1.5">
            Gujarati Delights Merchant Portal
          </h1>
          <p className="text-stone-500 text-xs">
            Manage your local orders, toggle catalog visibility, and sync ERP entries.
          </p>
        </div>

        {/* Top Right Controls: ERP Manual Sync */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="bg-stone-100 px-4 py-2 rounded-xl flex items-center gap-2 border border-stone-200/50">
            <Clock className="w-4 h-4 text-stone-400" />
            <div className="text-left">
              <p className="text-[10px] text-stone-400 font-medium uppercase leading-none">Last ERP Sync</p>
              <p className="text-xs font-semibold text-stone-700 mt-0.5">{lastSyncedText}</p>
            </div>
          </div>

          <button
            id="sync-erp-btn"
            onClick={handleSyncFromERP}
            disabled={isSyncing}
            className="cursor-pointer inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-600 disabled:bg-amber-100 disabled:text-stone-400 text-white font-bold text-xs px-4.5 py-3 rounded-xl shadow-md shadow-amber-500/10 transition leading-none shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync from Dollar ERP"}
          </button>

          <button
            id="admin-close-panel-btn"
            onClick={onBackToShop}
            className="cursor-pointer inline-flex items-center bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs px-4 py-3 rounded-xl shadow-sm transition shrink-0"
          >
            Exit Console
          </button>
        </div>
      </div>

      {/* Persistent Toast Notifications for Actions */}
      {adminNotification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl max-w-sm flex gap-3 text-xs animate-slide-up border ${
          adminNotification.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {adminNotification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <div className="flex-1">
            <p className="mt-0.5 leading-relaxed font-medium">{adminNotification.text}</p>
          </div>
          <button 
            id="admin-feedback-close"
            onClick={() => setAdminNotification(null)} 
            className="text-stone-400 hover:text-stone-600 cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation tabs */}
      <div id="admin-navigation-tabs" className="flex border-b border-stone-200 mb-6">
        <button
          id="tab-orders-trigger"
          onClick={() => setActiveTab("orders")}
          className={`cursor-pointer px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "orders"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Orders Tab ({orders.length})
        </button>
        <button
          id="tab-products-trigger"
          onClick={() => setActiveTab("products")}
          className={`cursor-pointer px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "products"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Catalog Products ({products.length})
        </button>
      </div>

      {/* ---- TAB CONTENT: ORDERS ---- */}
      {activeTab === "orders" ? (
        <div id="orders-tab-container" className="space-y-6">
          {isLoadingOrders ? (
            <div className="py-12 flex justify-center items-center">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-250/60 p-12 text-center shadow-sm">
              <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-display font-semibold text-lg text-stone-700">No Orders Placed Yet</h3>
              <p className="text-stone-500 text-xs mt-1.5">When orders are entered and paid, they will register here instantly.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map(order => (
                <div
                  id={`admin-order-card-${order.id}`}
                  key={order.id}
                  className="bg-white rounded-2xl border border-stone-200/70 p-5 md:p-6 shadow-sm hover:shadow transition space-y-4"
                >
                  {/* Order header row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 text-sm md:text-base">
                          {order.order_number}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          order.payment_status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                            : order.payment_status === "failed"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          Payment: {order.payment_status}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400">
                        Placed on {new Date(order.created_at).toLocaleString("en-IN")}
                      </p>
                    </div>

                    {/* Status Dropdown control */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-stone-500 text-xs">Delivery Status:</span>
                      <select
                        id={`delivery-dropdown-${order.id}`}
                        value={order.order_status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="out-for-delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  </div>

                  {/* Delivery detail columns */}
                  <div className="grid md:grid-cols-3 gap-6 text-xs text-stone-700">
                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs text-stone-500 uppercase">
                        <User className="w-3.5 h-3.5 text-stone-400" /> Customer Details
                      </h4>
                      <p className="font-semibold text-stone-900">{order.customer_name}</p>
                      <p className="font-mono flex items-center gap-1 text-stone-600">
                        <Phone className="w-3 h-3 text-stone-400" /> {order.customer_phone}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-bold text-stone-900 flex items-center gap-1.5 text-xs text-stone-500 uppercase">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" /> Delivery Target
                      </h4>
                      <p className="leading-relaxed text-stone-600">{order.delivery_address}</p>
                      {order.order_notes ? (
                        <p className="bg-amber-50/50 border border-amber-100 text-amber-800 p-2 rounded-lg text-[11px] leading-snug">
                          <strong className="text-amber-900 block font-bold mb-0.5">Notes:</strong>
                          "{order.order_notes}"
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2 md:border-l md:border-stone-100 md:pl-6">
                      <h4 className="font-bold text-stone-900 text-xs text-stone-500 uppercase">
                        Price invoice
                      </h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-stone-500">
                          <span>Delivery Charge:</span>
                          <span>₹{order.delivery_charge}</span>
                        </div>
                        <div className="flex justify-between text-stone-900 font-bold text-sm">
                          <span>Total Paid:</span>
                          <span className="text-amber-600">₹{order.total_amount}</span>
                        </div>
                        {order.razorpay_payment_id ? (
                          <div className="text-[10px] text-stone-400 font-mono mt-2">
                            RP ID: {order.razorpay_payment_id}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Order items nested list */}
                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                    <h5 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Ordered items</h5>
                    <div className="divide-y divide-stone-100 space-y-1 pb-1">
                      {order.items?.map(it => (
                        <div key={it.id} className="pt-1.5 flex justify-between text-xs font-medium text-stone-700">
                          <span>{it.product_name} <strong className="text-stone-400">×{it.quantity}</strong></span>
                          <span className="font-mono text-stone-900">₹{it.unit_price * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ---- TAB CONTENT: PRODUCTS CATALOG ---- */
        <div id="products-tab-container">
          <div className="bg-white rounded-3xl border border-stone-200/60 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-50 text-stone-500 font-bold uppercase border-b border-stone-100 text-[10px] tracking-wider select-none">
                <tr>
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Sync Source</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">ERP Stock</th>
                  <th className="p-4">Catalog Visib.</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {products.map(product => {
                  const isEditing = editingProductId === product.id;
                  return (
                    <tr
                      id={`admin-product-row-${product.id}`}
                      key={product.id}
                      className="hover:bg-amber-50/10 transition"
                    >
                      {/* Name / Description */}
                      <td className="p-4 max-w-xs md:max-w-sm">
                        <p className="font-semibold text-stone-900 text-sm">{product.name}</p>
                        {isEditing ? (
                          <textarea
                            id={`edit-desc-input-${product.id}`}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            className="w-full mt-2 p-2 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500 text-xs text-stone-800"
                          />
                        ) : (
                          <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                            {product.description || "No customized description configured."}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="bg-stone-100 text-stone-800 text-[10px] px-2.5 py-1 rounded bg-stone-100 text-stone-700">
                          {product.category}
                        </span>
                      </td>

                      {/* Sync source ID */}
                      <td className="p-4 font-mono text-[10px] text-stone-400">
                        {product.erp_id || "Manual Item"}
                      </td>

                      {/* Price */}
                      <td className="p-4 font-semibold text-stone-900 text-sm">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-stone-500 text-xs">₹</span>
                            <input
                              id={`edit-price-input-${product.id}`}
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 p-1 border border-stone-300 rounded font-bold text-center text-xs outline-none"
                            />
                          </div>
                        ) : (
                          <span>₹{product.price}</span>
                        )}
                      </td>

                      {/* ERP Stock level */}
                      <td className="p-4">
                        <span className={`font-mono font-bold text-sm ${product.stock <= 0 ? "text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded" : "text-stone-700"}`}>
                          {product.stock}
                        </span>
                      </td>

                      {/* Catalog active toggle slider */}
                      <td className="p-4">
                        <button
                          id={`toggle-active-btn-${product.id}`}
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          className="cursor-pointer text-stone-400 hover:text-stone-600 transition p-1 rounded-lg"
                        >
                          {product.is_active ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[10px]">
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                              Active
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-stone-400 font-semibold text-[10px]">
                              <ToggleLeft className="w-6 h-6" />
                              Hidden
                            </div>
                          )}
                        </button>
                      </td>

                      {/* Action buttons slider */}
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`save-btn-${product.id}`}
                              onClick={() => saveProductEdits(product.id)}
                              disabled={isUpdatingProduct}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 rounded-lg transition overflow-hidden shrink-0 cursor-pointer"
                              title="Save Changes"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`cancel-btn-${product.id}`}
                              onClick={() => setEditingProductId(null)}
                              className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold p-1.5 rounded-lg transition overflow-hidden shrink-0 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`edit-btn-${product.id}`}
                            onClick={() => startEditing(product)}
                            className="bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 text-stone-500 hover:text-amber-600 font-semibold p-1.5 rounded-lg transition cursor-pointer"
                            title="Edit Details & Price"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
