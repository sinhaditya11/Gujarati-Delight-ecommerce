import React from "react";
import { Product } from "../types.ts";
import { ShoppingCart, Flame, ShieldAlert } from "lucide-react";

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
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

export default function ProductCard({ product, onAddToCart, onClick }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;
  const imageUrl = product.image_url || getProductImage(product.name, product.category);

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => !isOutOfStock && onClick()}
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-stone-200/60 flex flex-col ${
        isOutOfStock ? "opacity-60 cursor-not-allowed select-none" : "cursor-pointer hover:-translate-y-1"
      }`}
    >
      {/* Product Image Section */}
      <div className="relative aspect-video w-full bg-amber-50 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        
        {/* Category tag */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm border border-amber-100">
          {product.category}
        </span>

        {/* Stock status overlay */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-stone-900/90 text-stone-100 font-display font-semibold tracking-wider text-xs px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-stone-800">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              OUT OF STOCK
            </span>
          </div>
        ) : isLowStock ? (
          <div className="absolute top-3 right-3">
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
          <h4 className="font-display font-medium text-stone-900 tracking-tight text-sm sm:text-base group-hover:text-amber-600 transition truncate">
            {product.name}
          </h4>
          <p className="text-[11px] sm:text-xs text-stone-500 mt-1 line-clamp-2 h-7 sm:h-8 leading-relaxed">
            {product.description || "Freshly sourced high-quality item, perfect for everyday enjoyment."}
          </p>
        </div>

        <div className="mt-3 sm:mt-4 flex items-center justify-between gap-1.5">
          <div className="flex flex-col">
            <span className="text-[10px] text-stone-400">Price</span>
            <span className="font-display font-bold text-base sm:text-lg text-stone-900 leading-none">
              ₹{product.price}
            </span>
          </div>

          <button
            id={`add-to-cart-btn-${product.id}`}
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, e);
            }}
            className={`cursor-pointer h-8 sm:h-10 px-2 sm:px-4 rounded-lg sm:rounded-xl flex items-center justify-center gap-1 font-semibold text-[10px] sm:text-xs transition duration-200 shrink-0 ${
              isOutOfStock
                ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-sm shadow-amber-500/20"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Add to Cart</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
