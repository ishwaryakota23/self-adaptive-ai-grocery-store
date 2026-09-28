import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import {
  Star,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, inventory, addToCart } = useApp();

  const [quantity, setQuantity] = useState(1);
  const [nutritionOpen, setNutritionOpen] = useState(true);
  const [addedToast, setAddedToast] = useState(false);

  const product = products.find(p => p.id === id) || products[0];
  const inv = inventory.find(i => i.product_id === product.id);
  const stockCount = inv ? inv.quantity : 0;
  const isStocked = stockCount > 0;

  const similarProducts = products.filter(p => p.id !== product.id && p.category_id === product.category_id).slice(0, 3);

  useEffect(() => {
    if (product) {
      db.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'PRODUCT_DETAIL_VIEW',
        customer_session_id: sessionService.getActiveSessionId(),
        product_id: product.id,
        product_name: product.name,
        store_id: 'BRANCH-104',
        source: 'LARGE_DISPLAY',
        metadata: { price: product.price, inStock: isStocked },
        timestamp: new Date().toISOString()
      });
    }
  }, [product?.id, isStocked]);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumbs & Back */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Link to="/customer/products" className="hover:text-emerald-400">Products</Link>
            <span>&gt;</span>
            <span className="text-slate-300">{product.category_name}</span>
            <span>&gt;</span>
            <span className="text-emerald-400 font-medium truncate max-w-[150px]">{product.name}</span>
          </div>

          <span className="text-slate-500 font-mono">SKU #{product.id.slice(0, 8)}</span>
        </div>

        {/* Main Product Card (Matching Screen 6) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left: Product Image */}
            <div className="relative group">
              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-4">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* In-Stock / Out-of-Stock Badge */}
              <div className="absolute top-4 left-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg ${
                    isStocked
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {isStocked ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>In Stock ({stockCount})</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Out of Stock</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Right: Info & Actions */}
            <div className="space-y-5">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                  {product.brand}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-md text-xs font-bold border border-amber-400/20">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{product.rating}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    ({product.reviews_count.toLocaleString()} customer reviews)
                  </span>
                </div>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-white">₹{product.price}</span>
                {product.original_price && (
                  <span className="text-base text-slate-500 line-through">
                    ₹{product.original_price}
                  </span>
                )}
                {product.discount_percentage && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {product.discount_percentage}% OFF
                  </span>
                )}
                <span className="text-xs text-slate-400 ml-auto">
                  Pack size: <strong className="text-slate-200">{product.weight_or_volume}</strong>
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {product.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Location in Store */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Physical Store Location:</span>
                  <strong className="text-white">{product.shelf_location}</strong>
                </div>
                <button
                  onClick={() => navigate(`/customer/map?product=${product.id}`)}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Locate →
                </button>
              </div>

              {/* Quantity Selector & Add to Cart (Matching Screen 6) */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 font-bold transition-colors"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!isStocked}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                    isStocked
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{addedToast ? 'Added to Cart!' : isStocked ? 'Add to Cart' : 'Out of Stock'}</span>
                </button>
              </div>

              {/* Secondary Actions (Screen 6) */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => navigate(`/customer/map?product=${product.id}`)}
                  className="py-2.5 px-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-400" />
                  <span>Find in Store</span>
                </button>

                <button
                  onClick={() => navigate(`/customer/availability/${product.id}`)}
                  className="py-2.5 px-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Availability</span>
                </button>

                <button
                  onClick={() => navigate(`/customer/assistant?product=${product.id}`)}
                  className="py-2.5 px-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ask AI</span>
                </button>
              </div>
            </div>
          </div>

          {/* Nutrition Facts Dropdown (Screen 6) */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <button
              onClick={() => setNutritionOpen(!nutritionOpen)}
              className="w-full flex items-center justify-between text-left py-2 font-bold text-sm text-slate-200 hover:text-white"
            >
              <span>Nutrition Facts & Ingredients</span>
              {nutritionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {nutritionOpen && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Serving Size</span>
                  <span className="font-semibold text-white">{product.nutrition.serving_size || '100g'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Energy</span>
                  <span className="font-semibold text-white">{product.nutrition.calories || 200} kcal</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Protein</span>
                  <span className="font-semibold text-emerald-400">{product.nutrition.protein || '10g'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Carbohydrates</span>
                  <span className="font-semibold text-white">{product.nutrition.carbs || '5g'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products Carousel / List (Matching Screen 6) */}
        {similarProducts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Similar Products</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {similarProducts.map((sim) => (
                <div
                  key={sim.id}
                  onClick={() => navigate(`/customer/products/${sim.id}`)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-1 shadow-md group"
                >
                  <img
                    src={sim.image_url}
                    alt={sim.name}
                    className="w-full h-32 object-cover rounded-xl mb-3"
                  />
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                    {sim.name}
                  </h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-white">₹{sim.price}</span>
                    <span className="text-[10px] text-slate-400">{sim.aisle}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
