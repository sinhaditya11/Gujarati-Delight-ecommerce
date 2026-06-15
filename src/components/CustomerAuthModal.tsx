import React, { useState, useEffect } from "react";
import { Customer, Order } from "../types.ts";
import { 
  User, Phone, MapPin, Mail, LogOut, CheckCircle, 
  Lock, Eye, EyeOff, ClipboardList, ShieldAlert, X, Edit3, Loader2, Save
} from "lucide-react";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Customer | null;
  onLogin: (user: Customer) => void;
  onLogout: () => void;
}

export default function CustomerAuthModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout
}: CustomerAuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "profile">("login");
  
  // Registration States
  const [regPhone, setRegPhone] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAddress, setRegAddress] = useState("");
  
  // Login States
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  
  // Misc UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Orders history
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setActiveTab("profile");
      setEditName(currentUser.name);
      setEditEmail(currentUser.email || "");
      setEditAddress(currentUser.delivery_address || "");
      fetchCustomerOrders(currentUser.phone);
    } else {
      setActiveTab("login");
    }
  }, [currentUser, isOpen]);

  const fetchCustomerOrders = async (phone: string) => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data: Order[] = await res.json();
        const filtered = data.filter(o => o.customer_phone.replace(/\s+/g, "") === phone.replace(/\s+/g, ""));
        setCustomerOrders(filtered);
      }
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!loginPhone.trim() || !loginPassword) {
      setErrorMessage("Please fill all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/customers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone.trim(), password: loginPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login credentials matched incorrectly.");
      }

      onLogin(data);
      setSuccessMessage("Swagatam! Logged in successfully.");
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);

    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!regPhone.trim() || !regName.trim() || !regPassword) {
      setErrorMessage("Please complete all mandatory fields.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/customers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: regPhone.trim(),
          name: regName.trim(),
          email: regEmail.trim() || null,
          password: regPassword,
          delivery_address: regAddress.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Signup configuration issue.");
      }

      onLogin(data);
      setSuccessMessage("Abhinandan! Account created and logged in.");
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.message || "Could not register details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/customers/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail || null,
          delivery_address: editAddress
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync changes.");
      }

      onLogin(data);
      setIsEditing(false);
      setSuccessMessage("Profile saved successfully");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-stone-200">
        
        {/* Header header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 select-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-stone-900 leading-none">
                {currentUser ? "My Profile" : "Customer Portal"}
              </h2>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {currentUser ? "Manage deliveries & history" : "Login to order instantly"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {!currentUser && (
          <div className="flex border-b border-stone-100 bg-stone-50/50 p-1">
            <button
              onClick={() => { setActiveTab("login"); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "login" 
                  ? "bg-white text-amber-600 shadow-sm border border-stone-200/50" 
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setActiveTab("register"); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "register" 
                  ? "bg-white text-amber-600 shadow-sm border border-stone-200/50" 
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Message Banner overlay */}
        {errorMessage && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-100 rounded-xl p-3 text-red-800 flex gap-2.5 text-xs animate-fade-in shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-800 flex gap-2.5 text-xs animate-fade-in shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* View viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* LOGIN VIEW */}
          {activeTab === "login" && !currentUser && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Phone number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer w-full h-10 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mt-6 transition duration-150"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                Log In
              </button>
            </form>
          )}

          {/* REGISTER VIEW */}
          {activeTab === "register" && !currentUser && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Full name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ramesh Bhai Shah"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Phone number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono outline-none bg-stone-50/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Email (Optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                    <input
                      type="email"
                      placeholder="ramesh@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Create security password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Default Delivery Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <textarea
                    placeholder="Flat/House No, Apartment Name, Landmark, Ahmedabad, Gujarat"
                    value={regAddress}
                    rows={2}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full p-4 pl-10 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20 text-stone-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="cursor-pointer w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mt-4 transition duration-150"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                Sign Up & Log In
              </button>
            </form>
          )}

          {/* PROFILE DETAILS VIEW */}
          {currentUser && (
            <div className="space-y-4">
              {/* Account summary details */}
              <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-semibold">Verification Badge</span>
                  <span className="bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                    Premium Member
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-stone-700">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span>Name: <strong>{currentUser.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>Phone: <strong className="font-mono">{currentUser.phone}</strong></span>
                  </div>
                  {currentUser.email && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>Email: <strong>{currentUser.email}</strong></span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5" />
                    <div>
                      <span className="block text-stone-400 font-medium">Default Delivery Address:</span>
                      <p className="mt-0.5 leading-relaxed font-semibold text-stone-800">{currentUser.delivery_address || "No address registered."}</p>
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 mt-1 text-[11px]"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Location/Details
                  </button>
                )}
              </div>

              {/* Edit Details panel inside Profile view */}
              {isEditing && (
                <form onSubmit={handleUpdateProfile} className="border border-stone-200/80 p-3.5 rounded-2xl space-y-3 shadow-inner bg-stone-50/20">
                  <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1 pb-1 border-b border-stone-100">
                    <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Update Details
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Name</label>
                    <input
                      type="text"
                      className="w-full h-8.5 px-3 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-amber-500"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      className="w-full h-8.5 px-3 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-amber-500"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Delivery Address</label>
                    <textarea
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-amber-500"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="cursor-pointer h-7.5 px-3 text-stone-500 border border-stone-200 hover:bg-stone-100 text-[10px] rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="cursor-pointer h-7.5 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 text-white text-[10px] rounded-lg font-bold flex items-center gap-1 shadow shadow-amber-500/15"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* Order history block */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-750 flex items-center gap-1.5 tracking-tight border-b border-stone-105 pb-1">
                  <ClipboardList className="w-4 h-4 text-stone-500" />
                  <span>My Delivery Orders ({customerOrders.length})</span>
                </h3>

                {isLoadingOrders ? (
                  <div className="py-8 flex justify-center text-xs text-stone-400 gap-1.5 items-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Loading your food orders...</span>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-stone-400 text-xs py-4 text-center">No orders registered with this phone number yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {customerOrders.map(order => (
                      <div key={order.id} className="p-3 border border-stone-150 rounded-xl bg-stone-50/50 space-y-2 text-[11px]">
                        <div className="flex justify-between items-center bg-stone-100/50 p-1.5 rounded-lg">
                          <span className="font-bold text-stone-850 font-mono">{order.order_number}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                            order.payment_status === "paid" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {order.payment_status}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-500 font-medium">
                          <span>Total Amount Paid:</span>
                          <strong className="text-stone-900">₹{order.total_amount}</strong>
                        </div>
                        <div className="flex justify-between text-stone-500 font-medium">
                          <span>Delivery Status:</span>
                          <span className={`font-semibold capitalize ${
                            order.order_status === "delivered" 
                              ? "text-emerald-600" 
                              : order.order_status === "out-for-delivery" 
                              ? "text-blue-600" 
                              : "text-amber-600"
                          }`}>
                            {order.order_status.replace("-", " ")}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {new Date(order.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={() => {
                  onLogout();
                  setSuccessMessage("Logged out successfully");
                  setTimeout(() => {
                    setSuccessMessage(null);
                    onClose();
                  }, 1200);
                }}
                className="cursor-pointer w-full h-10 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out / Log Out
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
