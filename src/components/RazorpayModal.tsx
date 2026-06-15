import React from "react";
import { Landmark, CreditCard, ShieldCheck, AlertCircle } from "lucide-react";

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  onSuccess: (paymentId: string) => Promise<void>;
  onFailure: () => Promise<void>;
}

export default function RazorpayModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  customerName,
  customerPhone,
  onSuccess,
  onFailure
}: RazorpayModalProps) {
  if (!isOpen) return null;

  // Configuration key check
  const RAZORPAY_CONFIG = {
    keyId: "YOUR_RAZORPAY_KEY_ID_HERE"
  };

  const handleRealRazorpay = () => {
    // Check if real keys are specified and Razorpay is loaded in the global window object
    const isPlaceholder = RAZORPAY_CONFIG.keyId.includes("YOUR_RAZORPAY_KEY_ID_HERE") || !RAZORPAY_CONFIG.keyId;
    const isRazorpayAvailable = typeof (window as any).Razorpay !== "undefined";

    if (!isPlaceholder && isRazorpayAvailable) {
      try {
        const options = {
          key: RAZORPAY_CONFIG.keyId,
          amount: Math.round(totalAmount * 100), // in paise
          currency: "INR",
          name: "Gujarati Delights",
          description: `Payment for Order ${orderNumber}`,
          image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=128&auto=format&fit=crop",
          prefill: {
            name: customerName,
            contact: customerPhone
          },
          theme: {
            color: "#F59E0B"
          },
          handler: function (response: any) {
            onSuccess(response.razorpay_payment_id || "PAY_" + Math.random().toString(36).substring(4, 12).toUpperCase());
          },
          modal: {
            ondismiss: function () {
              onFailure();
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        onClose();
        return;
      } catch (e) {
        console.error("Real Razorpay instance failed, running simulator backdrop...", e);
      }
    }
  };

  // Run real Razorpay if possible on mount, but keep simulator ready
  React.useEffect(() => {
    const isPlaceholder = RAZORPAY_CONFIG.keyId.includes("YOUR_RAZORPAY_KEY_ID_HERE") || !RAZORPAY_CONFIG.keyId;
    if (!isPlaceholder && typeof (window as any).Razorpay !== "undefined") {
      handleRealRazorpay();
    }
  }, [isOpen]);

  const handleSimulatedSuccess = async () => {
    const mockPaymentId = "pay_mock_" + Math.random().toString(36).substring(2, 10).toUpperCase();
    await onSuccess(mockPaymentId);
    onClose();
  };

  const handleSimulatedFailure = async () => {
    await onFailure();
    onClose();
  };

  return (
    <div id="razorpay-simulation-backdrop" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div id="razorpay-simulation-card" className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-100 flex flex-col">
        {/* Razorpay Brand Header */}
        <div className="bg-[#0b132b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-lg select-none">
              R
            </div>
            <div>
              <h3 className="font-display font-semibold tracking-wide text-sm text-gray-300 uppercase">Razorpay Checkout</h3>
              <p className="text-xs text-blue-400 font-mono font-medium">Secured by Razorpay</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Amount</p>
            <p className="text-xl font-bold font-display text-amber-400">₹{totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Info Banner / Alert explaining the Simulator */}
        <div className="bg-amber-50 border-b border-amber-100 p-4 text-amber-800 text-xs flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <span className="font-bold">Iframe Preview Mode Enabled</span>
            <p className="mt-1 leading-relaxed text-amber-700">
              Your server credentials are clean and protected. To bypass sandboxed iframe CSP blocks, choose a payment outcome below:
            </p>
          </div>
        </div>

        {/* Details Panel */}
        <div className="p-5 flex-1 space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg space-y-2 border border-slate-100">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Order Number</span>
              <strong className="font-mono text-slate-900">{orderNumber}</strong>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Customer Name</span>
              <strong className="text-slate-900">{customerName}</strong>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Phone Contact</span>
              <strong className="text-slate-900">{customerPhone}</strong>
            </div>
            <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-xs text-slate-600">
              <span>Base Delivery Charge</span>
              <strong className="text-slate-900">₹30.00</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="razorpay-success-btn"
              onClick={handleSimulatedSuccess}
              className="flex flex-col items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition duration-200 group text-center cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-emerald-600 mb-2">
                <ShieldCheck className="w-6 h-6 animate-bounce" />
              </div>
              <span className="font-medium text-xs text-emerald-800">Authorize Payment</span>
              <span className="text-[10px] text-emerald-600 mt-1">Simulate Success</span>
            </button>

            <button
              id="razorpay-fail-btn"
              onClick={handleSimulatedFailure}
              className="flex flex-col items-center justify-center p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition duration-200 group text-center cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center text-rose-600 mb-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="font-medium text-xs text-rose-800">Decline Payment</span>
              <span className="text-[10px] text-rose-600 mt-1">Simulate Failure</span>
            </button>
          </div>

          <div className="text-center font-mono text-[9px] text-slate-400 flex justify-center items-center gap-1.5 pt-2">
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <span>MasterCard / Visa / UPI Payment Emulation Mode</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Merchant Account: Gujarati Delights</span>
          <button 
            id="razorpay-close-btn"
            onClick={onClose} 
            className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
