import React, { useState, useEffect } from "react";
import { Product } from "../types.ts";
import { ShoppingCart, Flame, ShieldAlert, Heart, Share2, Star, Plus, Minus, CheckCircle2 } from "lucide-react";

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  cartQuantity?: number;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onUpdateQuantity?: (product: Product, quantity: number) => void;
  onClick: () => void;
}

export function getProductImage(name: string, category: string): string {
  const norm = name.toLowerCase();
  
  if (norm.includes("dhokla")) {
    return "https://images.unsplash.com/photo-1601050690597-df05694c0955?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("khandvi")) {
    return "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("fafda")) {
    return "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("jalebi")) {
    return "https://images.unsplash.com/photo-1589135306090-e55523b6b14d?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("gathiya")) {
    return "https://images.unsplash.com/photo-1601050690597-df05694c0955?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("atta")) {
    return "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("dal")) {
    return "https://images.unsplash.com/photo-1515942400420-2b98feb110bc?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("oil")) {
    return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400";
  }
  if (norm.includes("shrikhand")) {
    return "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&q=80&w=400";
  }

  // Fallbacks based on category
  if (category === "Food") return "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=400";
  if (category === "Sweets") return "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=400";
  if (category === "Farsan") return "https://images.unsplash.com/photo-1601050690597-df05694c0955?auto=format&fit=crop&q=80&w=400";
  if (category === "Snacks") return "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&q=80&w=400";
  if (category === "Grocery") return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";
  
  return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400";
}

export default function ProductCard({ product, cartQuantity = 0, onAddToCart, onUpdateQuantity, onClick }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;
  const [imgUrl, setImgUrl] = useState(product.image_url || getProductImage(product.name, product.category));
  
  // Local Wishlist State
  const [isWishlisted, setIsWishlisted] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem(`wishlist_${product.id}`);
    if (saved) setIsWishlisted(true);
  }, [product.id]);
  
  const toggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isWishlisted;
    setIsWishlisted(newState);
    if (newState) {
      localStorage.setItem(`wishlist_${product.id}`, "true");
    } else {
      localStorage.removeItem(`wishlist_${product.id}`);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Check out ${product.name} on Gujarati Delights! ₹${product.price}\nOrder here: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Mock data for Ratings and Discounts based on ID to be consistent
  const rating = (4 + (product.name.length % 10) / 10).toFixed(1); // 4.0 to 4.9
  const reviews = 50 + (product.name.length * 12);
  const isBestSeller = product.name.length % 3 === 0;

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => !isOutOfStock && onClick()}
      className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-stone-200/60 flex flex-col ${
        isOutOfStock ? "opacity-60 cursor-not-allowed select-none" : "cursor-pointer hover:-translate-y-1"
      }`}
    >
      {/* Product Image Section */}
      <div className="relative aspect-[4/3] w-full bg-amber-50 overflow-hidden">
        <img
          src={imgUrl}
          alt={product.name}
          onError={() => setImgUrl("https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400")}
          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        
        {/* Wishlist Button */}
        <button 
          onClick={toggleWishlist}
          className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm hover:bg-white transition-colors z-10"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : "text-stone-500"}`} />
        </button>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm border border-stone-200 shadow-sm hover:bg-white transition-colors z-10"
        >
          <Share2 className="w-4 h-4 text-stone-500" />
        </button>

        {/* Category tag & Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start z-10">
          <span className="bg-white/90 backdrop-blur-sm text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm border border-amber-100">
            {product.category}
          </span>
          {isBestSeller && (
             <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shadow-sm">
               Best Seller
             </span>
          )}
        </div>

        {/* Stock status overlay */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex items-center justify-center z-20">
            <span className="bg-stone-900/90 text-stone-100 font-display font-semibold tracking-wider text-xs px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-stone-800">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              OUT OF STOCK
            </span>
          </div>
        ) : isLowStock ? (
          <div className="absolute top-10 right-2">
            <span className="bg-orange-500/95 text-white font-semibold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
              <Flame className="w-3 h-3 text-amber-200 fill-amber-200" />
              ONLY {product.stock} LEFT!
            </span>
          </div>
        ) : null}
      </div>

      {/* Product Information */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-display font-medium text-stone-900 tracking-tight text-sm sm:text-base group-hover:text-amber-600 transition line-clamp-1">
              {product.name}
            </h4>
          </div>
          
          {/* Star Rating */}
          <div className="flex items-center gap-1 mt-1 mb-1">
             <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
             <span className="text-[11px] font-bold text-stone-700">{rating}</span>
             <span className="text-[10px] text-stone-400">({reviews} reviews)</span>
          </div>
          
          <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-2 h-7 sm:h-8 leading-relaxed">
            {product.description || "Freshly sourced high-quality item, perfect for everyday enjoyment."}
          </p>

          {/* Delivery Label */}
          <div className="mt-2 flex items-center gap-1">
            {isOutOfStock ? (
              <span className="text-[10px] font-medium text-rose-600 flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded">
                Currently Unavailable
              </span>
            ) : (
              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" />
                Delivered in 45 mins
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-1.5">
          <div className="flex flex-col">
            <span className="font-display font-bold text-base sm:text-lg text-stone-900 leading-none">
              ₹{product.price}
            </span>
          </div>

          {!isOutOfStock ? (
             cartQuantity > 0 ? (
               <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                 <button 
                   onClick={() => onUpdateQuantity && onUpdateQuantity(product, cartQuantity - 1)}
                   className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded shadow-sm text-stone-600 hover:text-amber-600 hover:border-amber-200 border border-stone-200 transition"
                 >
                   <Minus className="w-3 h-3" />
                 </button>
                 <span className="text-xs font-bold w-4 text-center">{cartQuantity}</span>
                 <button 
                   onClick={() => onUpdateQuantity && onUpdateQuantity(product, cartQuantity + 1)}
                   disabled={cartQuantity >= product.stock}
                   className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded shadow-sm text-stone-600 hover:text-amber-600 hover:border-amber-200 border border-stone-200 disabled:opacity-50 transition"
                 >
                   <Plus className="w-3 h-3" />
                 </button>
               </div>
             ) : (
                <button
                  id={`add-to-cart-btn-${product.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product, e);
                  }}
                  className="cursor-pointer h-8 sm:h-9 px-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-1 font-semibold text-xs transition duration-200 shrink-0 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-sm shadow-amber-500/20"
                >
                  <span>Add</span>
                </button>
             )
          ) : (
            <button disabled className="cursor-not-allowed h-8 sm:h-9 px-3 rounded-lg sm:rounded-xl flex items-center justify-center font-semibold text-xs shrink-0 bg-stone-100 text-stone-400 border border-stone-200">
               Out of Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
