import React from "react";
import { CartItem } from "../types.ts";
import { getProductImage } from "./ProductCard.tsx";
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export default function CartView({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onContinueShopping
}: CartViewProps) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  
  const deliveryCharge = 30;
  const grandTotal = subtotal + deliveryCharge;
  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-2xl text-stone-950 tracking-tight">
          Your Cart is Empty
        </h2>
        <p className="text-stone-500 text-sm mt-2 leading-relaxed">
          Looks like you haven't added any delicious Gujarati delicacies to your basket yet!
        </p>
        <button
          id="cart-empty-back-btn"
          onClick={onContinueShopping}
          className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-amber-500/10 mt-6 transition duration-200"
        >
          Explore Food & Sweets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="font-display font-bold text-2xl text-stone-900 tracking-tight mb-6">
        Shopping Cart ({totalQty} item{totalQty > 1 ? "s" : ""})
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart items list - left 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map(item => {
            const prodImage = item.product.image_url || getProductImage(item.product.name, item.product.category);
            return (
              <div
                id={`cart-item-row-${item.product.id}`}
                key={item.product.id}
                className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm flex gap-4 items-center"
              >
                {/* Product thumbnail */}
                <img
                  src={prodImage}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-xl bg-amber-50 shrink-0 border border-stone-100"
                  referrerPolicy="no-referrer"
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-medium text-stone-900 text-sm md:text-base truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-xs text-stone-400 capitalize">{item.product.category}</p>
                  <strong className="text-xs text-stone-900 font-bold block mt-1">₹{item.product.price} each</strong>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row items-center gap-3">
                  {/* Qty controls */}
                  <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 p-0.5">
                    <button
                      id={`cart-dec-btn-${item.product.id}`}
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-1 rounded hover:bg-white text-stone-500 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-mono text-xs font-bold text-stone-800 min-w-6 text-center select-none">
                      {item.quantity}
                    </span>
                    <button
                      id={`cart-inc-btn-${item.product.id}`}
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 rounded hover:bg-white text-stone-500 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <span className="font-display font-bold text-stone-900 text-sm md:text-base min-w-16 text-right">
                      ₹{item.product.price * item.quantity}
                    </span>
                    <button
                      id={`cart-trash-btn-${item.product.id}`}
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-stone-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            id="cart-add-more-btn"
            onClick={onContinueShopping}
            className="text-sm font-semibold text-amber-600 hover:text-amber-700 mt-2 hover:underline cursor-pointer"
          >
            ← Add more items
          </button>
        </div>

        {/* Invoice Summary Card - right column */}
        <div className="h-fit">
          <div className="bg-white rounded-3xl border border-stone-200/60 shadow-sm p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-stone-900 tracking-tight pb-3 border-b border-stone-100">
              Billing Summary
            </h3>

            <div className="space-y-2.5">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Items Subtotal</span>
                <span className="font-medium text-stone-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600">
                <span>Flat Delivery Charge</span>
                <span className="font-medium text-stone-900">₹{deliveryCharge}</span>
              </div>
              <div className="bg-amber-50 text-amber-800 text-[10px] font-medium p-2.5 rounded-lg border border-amber-100/50">
                🚀 Delivering hot & fresh with our direct fleet!
              </div>

              <div className="border-t border-stone-100 my-4 pt-3.5 flex justify-between font-display font-bold text-stone-900 text-base">
                <span>Grand Total</span>
                <span className="text-lg text-amber-600">₹{grandTotal}</span>
              </div>
            </div>

            <button
              id="proceed-checkout-btn"
              onClick={onProceedToCheckout}
              className="cursor-pointer w-full h-12 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold rounded-xl shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 transition duration-200 mt-4"
            >
              Proceed to Delivery Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
