import React, { useState, useEffect } from "react";
import { Product } from "../types.ts";
import { getProductImage } from "./ProductCard.tsx";
import { ArrowLeft, ShoppingCart, Plus, Minus, CheckCircle, PackageOpen } from "lucide-react";

interface ProductDetailsViewProps {
  product: Product;
  allProducts: Product[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onSelectProduct: (product: Product) => void;
}

export default function ProductDetailsView({
  product,
  allProducts,
  onBack,
  onAddToCart,
  onSelectProduct
}: ProductDetailsViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Reset quantity when active product changes
  useEffect(() => {
    setQuantity(1);
    setIsAdded(false);
  }, [product]);

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (product.stock > 0) {
      onAddToCart(product, quantity);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const imageUrl = product.image_url || getProductImage(product.name, product.category);

  // Find 4 related products of same category, excluding active one
  const related = allProducts
    .filter(p => p.category === product.category && p.id !== product.id && p.is_active)
    .slice(0, 4);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      {/* Back button */}
      <button
        id="detail-back-btn"
        onClick={onBack}
        className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-amber-600 mb-6 bg-white px-3.5 py-2 rounded-xl shadow-sm border border-stone-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products
      </button>

      {/* Main Details Grid */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-200/60 p-6 md:p-8 grid md:grid-cols-2 gap-8 items-start">
        {/* Left column: Image */}
        <div className="aspect-square bg-amber-50 rounded-2xl overflow-hidden border border-stone-100">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Right column: Info */}
        <div className="space-y-6">
          <div>
            <span className="bg-amber-100/70 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {product.category}
            </span>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-stone-900 tracking-tight mt-2.5">
              {product.name}
            </h1>
            <p className="text-xl md:text-2xl font-display font-bold text-amber-600 mt-2">
              ₹{product.price}
            </p>
          </div>

          <div className="border-t border-b border-stone-100 py-4 space-y-2">
            <h3 className="font-display font-semibold text-stone-800 text-sm">Description</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {product.description || "Traditional recipe prepared under strict hygiene standards. Excellent accompaniment with main dishes or enjoyed as a quick daily snack."}
            </p>
          </div>

          {/* Stock Levels Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">Availability:</span>
            {product.stock > 0 ? (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                In Stock ({product.stock} units available)
              </span>
            ) : (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                Out of Stock
              </span>
            )}
          </div>

          {/* Controls: Qty Selector and Actions */}
          {product.stock > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-stone-500">Quantity</span>
                <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 p-1">
                  <button
                    id="qty-decrement-btn"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="p-1.5 rounded-lg hover:bg-white text-stone-500 disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-mono font-bold text-stone-800 min-w-8 text-center select-none">
                    {quantity}
                  </span>
                  <button
                    id="qty-increment-btn"
                    onClick={handleIncrement}
                    disabled={quantity >= product.stock}
                    className="p-1.5 rounded-lg hover:bg-white text-stone-500 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  id="add-to-cart-action-btn"
                  onClick={handleAddToCart}
                  className={`cursor-pointer flex-1 h-12 shadow-sm rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition duration-200 ${
                    isAdded
                      ? "bg-emerald-600 text-white shadow-emerald-600/10"
                      : "bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-amber-500/20"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <CheckCircle className="w-5 h-5 animate-scale-up" />
                      Added {quantity} unit{quantity > 1 ? "s" : ""}!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Shopping Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex gap-3 text-stone-500 text-xs">
              <PackageOpen className="w-5 h-5 text-stone-400 shrink-0" />
              <div>
                <p className="font-bold text-stone-700">Item Currently Unavailable</p>
                <p className="mt-0.5">Please check back later or sync with Dollar ERP inside the Admin terminal to retrieve updated stocks.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      {related.length > 0 && (
        <div id="related-products-section" className="mt-12 space-y-6">
          <h2 className="font-display font-bold text-xl text-stone-900 tracking-tight border-b border-stone-200/50 pb-2.5">
            Related items from <span className="text-amber-600">{product.category}</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map(p => {
              const relImage = p.image_url || getProductImage(p.name, p.category);
              return (
                <div
                  id={`related-card-${p.id}`}
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className="bg-white p-3 rounded-xl border border-stone-200/60 shadow-sm hover:shadow hover:-translate-y-0.5 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={relImage}
                      alt={p.name}
                      className="aspect-video w-full object-cover rounded-lg bg-amber-50"
                      referrerPolicy="no-referrer"
                    />
                    <h4 className="font-display font-medium text-stone-900 text-sm mt-3.5 truncate">
                      {p.name}
                    </h4>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-display font-bold text-stone-900 text-sm">₹{p.price}</span>
                    <button
                      id={`related-view-btn-${p.id}`}
                      className="text-xs text-amber-600 font-semibold hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
