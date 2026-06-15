import React, { useState, useEffect } from "react";
import { CartItem, Order, Customer } from "../types.ts";
import RazorpayModal from "./RazorpayModal.tsx";
import { ArrowLeft, Wallet, ShieldCheck, ShoppingCart, Loader2, AlertTriangle, AlertCircle, Sparkles, UserCheck } from "lucide-react";

interface CheckoutViewProps {
  cartItems: CartItem[];
  onBackToCart: () => void;
  onOrderConfirmed: (orderNumber: string, orderId: string) => void;
  onClearCart: () => void;
  currentUser: Customer | null;
  onPromptLogin: () => void;
}

export default function CheckoutView({
  cartItems,
  onBackToCart,
  onOrderConfirmed,
  onClearCart,
  currentUser,
  onPromptLogin
}: CheckoutViewProps) {
  // Form fields
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [address, setAddress] = useState(currentUser?.delivery_address || "");
  const [notes, setNotes] = useState("");

  // Sync form when currentUser changes (e.g. login)
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone);
      setAddress(currentUser.delivery_address || "");
    }
  }, [currentUser]);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderNum, setActiveOrderNum] = useState<string | null>(null);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryCharge = 30;
  const grandTotal = subtotal + deliveryCharge;

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      return;
    }

    setIsLoading(true);
    setPaymentError(null);

    try {
      // Map cart items to the server shape
      const itemsPayload = cartItems.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          delivery_address: address,
          order_notes: notes || null,
          total_amount: grandTotal,
          delivery_charge: deliveryCharge,
          items: itemsPayload
        })
      });

      if (!response.ok) {
        throw new Error("Failed to initialize database order");
      }

      const createdOrder: Order = await response.json();
      setActiveOrderId(createdOrder.id);
      setActiveOrderNum(createdOrder.order_number);
      setIsRazorpayOpen(true);

    } catch (err: any) {
      console.error("[Checkout] Error creating checkout order:", err);
      setPaymentError(err.message || "An issue occurred initializing your order. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!activeOrderId) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/orders/${activeOrderId}/payment-success`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentId
        })
      });

      if (!response.ok) {
        throw new Error("Server failed to log payment success");
      }

      onClearCart();
      setIsRazorpayOpen(false);
      onOrderConfirmed(activeOrderNum || "GD-SUCCESS", activeOrderId);

    } catch (err: any) {
      console.error("[Checkout] Error processing payment success callback:", err);
      setPaymentError("Payment authorized, but server failed to update order level. Please contact support.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentFailure = async () => {
    if (!activeOrderId) return;
    setIsLoading(true);
    setIsRazorpayOpen(false);

    try {
      await fetch(`/api/orders/${activeOrderId}/payment-failed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      setPaymentError("Your payment was declined or cancelled. Please verify your payment details and hit 'Retry Pay Now'.");
    } catch (err: any) {
      console.error("[Checkout] Error logging payment failure:", err);
      setPaymentError("Payment session closed by user.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      {/* Back to Cart button */}
      <button
        id="checkout-back-btn"
        onClick={onBackToCart}
        className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-amber-600 mb-6 bg-white px-3.5 py-2 rounded-xl shadow-sm border border-stone-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Shopping Cart
      </button>

      <div className="grid md:grid-cols-5 gap-8 items-start">
        {/* Form panel - 3 columns */}
        <div className="md:col-span-3 bg-white rounded-3xl border border-stone-200/60 shadow-sm p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="font-display font-bold text-2xl text-stone-900 tracking-tight">
              Delivery Information
            </h1>
            <p className="text-stone-500 text-xs">
              We deliver local orders on the same day within Ahmedabad. Keep your phone active!
            </p>
          </div>

          {currentUser ? (
            <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs text-amber-900 select-none animate-fade-in">
              <UserCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span>Namaste, <strong>{currentUser.name}</strong>!</span>
                <p className="text-[10px] text-amber-800/80 mt-0.5">We have automatically loaded your saved delivery details.</p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-200/30 px-4 py-3 rounded-2xl flex items-center justify-between gap-4 text-xs text-stone-600 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                <span>Save time next time! Log in to auto-fill your delivery details.</span>
              </div>
              <button
                type="button"
                onClick={onPromptLogin}
                className="cursor-pointer text-amber-600 hover:text-amber-700 font-extrabold shrink-0 text-xs transition active:scale-95"
              >
                Log In
              </button>
            </div>
          )}

          {/* Form Action */}
          <form id="checkout-form" onSubmit={handleSubmitCheckout} className="space-y-4">
            <div className="space-y-1.5 focus-within:text-amber-600">
              <label className="text-xs font-bold text-stone-700 block uppercase tracking-wider">
                Full Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="checkout-name-input"
                type="text"
                required
                placeholder="Ramesh Bhai Shah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-stone-50/50 outline-none transition text-sm text-stone-900"
              />
            </div>

            <div className="space-y-1.5 focus-within:text-amber-600">
              <label className="text-xs font-bold text-stone-700 block uppercase tracking-wider">
                Contact Phone <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                id="checkout-phone-input"
                type="tel"
                required
                placeholder="98765 43210 (10 digit local phone)"
                pattern="^[0-9\s-+]{10,15}$"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-4.5 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-stone-50/50 outline-none transition text-sm font-mono text-stone-900"
              />
            </div>

            <div className="space-y-1.5 focus-within:text-amber-600">
              <label className="text-xs font-bold text-stone-700 block uppercase tracking-wider">
                Delivery Address <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                id="checkout-address-textarea"
                required
                placeholder="Plot 12, Gandhi Nagar, Near Iscon Temple, Ahmedabad, Gujarat"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-stone-50/50 outline-none transition text-sm text-stone-900"
              />
            </div>

            <div className="space-y-1.5 focus-within:text-amber-600">
              <label className="text-xs font-bold text-stone-700 block uppercase tracking-wider">
                Order Notes / Preferences (Optional)
              </label>
              <textarea
                id="checkout-notes-textarea"
                placeholder="Deliver after 4 PM, please pack extra sweet chutney if possible!"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-stone-50/50 outline-none transition text-sm text-stone-900"
              />
            </div>

            {paymentError && (
              <div className="bg-rose-50 text-rose-800 p-4 border border-rose-100 rounded-xl flex gap-3 text-xs animate-fade-in">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <span className="font-bold">Payment Transaction Failed</span>
                  <p className="mt-0.5">{paymentError}</p>
                </div>
              </div>
            )}

            <button
              id="pay-now-submit-btn"
              disabled={isLoading}
              type="submit"
              className="cursor-pointer w-full h-12 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-100 disabled:text-stone-400 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 transition duration-200 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  Securing Order Transaction...
                </>
              ) : activeOrderId ? (
                <>
                  <Wallet className="w-5 h-5" />
                  Retry Pay Now (₹{grandTotal})
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Pay Now with Razorpay (₹{grandTotal})
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order review - 2 columns */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200/60 shadow-sm p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-stone-900 tracking-tight pb-3 border-b border-stone-100">
              Order Items
            </h3>

            <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto pr-1">
              {cartItems.map(item => (
                <div key={item.product.id} className="py-2.5 flex justify-between items-center text-xs text-stone-700">
                  <div className="truncate pr-4 flex-1">
                    <span className="font-bold text-stone-900">{item.quantity}x</span> {item.product.name}
                  </div>
                  <strong className="font-mono text-stone-950 font-semibold shrink-0">
                    ₹{item.product.price * item.quantity}
                  </strong>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-stone-600">
                <span>Items Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-600">
                <span>Direct Delivery Charge</span>
                <span>₹{deliveryCharge}</span>
              </div>
              <div className="border-t border-stone-100 mt-3 pt-3 flex justify-between font-display font-bold text-stone-950 text-sm">
                <span>Payable Amount</span>
                <span className="text-amber-600 font-bold">₹{grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200/40 p-4 rounded-xl flex gap-2.5 text-xs text-amber-800">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
            <p>Your payment details are processed under PCI-DSS standards via Razorpay Payment Gateway integration.</p>
          </div>
        </div>
      </div>

      {/* Razorpay Trigger */}
      {isRazorpayOpen && activeOrderId && activeOrderNum && (
        <RazorpayModal
          isOpen={isRazorpayOpen}
          orderId={activeOrderId}
          orderNumber={activeOrderNum}
          totalAmount={grandTotal}
          customerName={name}
          customerPhone={phone}
          onClose={() => setIsRazorpayOpen(false)}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}
    </div>
  );
}
