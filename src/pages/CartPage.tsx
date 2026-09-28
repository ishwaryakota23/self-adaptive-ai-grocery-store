import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateCartItemQuantity, removeCartItem, clearCart, cartTotal, cartItemCount } = useApp();

  const tax = Math.round(cartTotal * 0.05);
  const finalTotal = cartTotal + tax;

  if (cart.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white">Your Cart is Empty</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Pick items from the catalog or ask your AI assistant to add recipe ingredients.
        </p>
        <button
          onClick={() => navigate('/customer/products')}
          className="mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-all"
        >
          Explore Grocery Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header (Matching Screen 10) */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Your Cart
              <span className="text-sm font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {cartItemCount} items
              </span>
            </h1>
          </div>

          <button
            onClick={clearCart}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List (Matching Screen 10) */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-md"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/customer/products/${item.product_id}`}
                      className="text-sm font-bold text-white hover:text-emerald-400 transition-colors block truncate"
                    >
                      {item.product.name}
                    </Link>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {item.product.weight_or_volume} • {item.product.aisle}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 block mt-1">
                      ₹{item.product.price} each
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Total (Screen 10) */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                    <button
                      onClick={() => updateCartItemQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartItemQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-sm font-bold text-white w-14 text-right">
                    ₹{item.product.price * item.quantity}
                  </span>

                  <button
                    onClick={() => removeCartItem(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <button
                onClick={() => navigate('/customer/products')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1.5"
              >
                <span>+ Continue Shopping</span>
              </button>
            </div>
          </div>

          {/* Order Summary Box (Screen 10) */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-base text-white">Order Summary</h3>

              <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold text-white">₹{cartTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (5% GST)</span>
                  <span className="font-bold text-white">₹{tax}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Smart Member Discount</span>
                  <span className="font-bold">FREE</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                <span className="font-extrabold text-base text-white">Total</span>
                <span className="text-2xl font-black text-emerald-400">₹{finalTotal}</span>
              </div>

              {/* Proceed to Checkout Button (Screen 10) */}
              <button
                onClick={() => navigate('/customer/checkout')}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant Self-Checkout Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
