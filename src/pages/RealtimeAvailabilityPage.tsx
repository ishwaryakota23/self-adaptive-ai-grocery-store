import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  CheckCircle,
  AlertCircle,
  MapPin,
  Clock,
  Camera,
  Sparkles,
  ArrowLeft,
  ShoppingBag,
  Navigation,
  Bot
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const RealtimeAvailabilityPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, inventory, addToCart } = useApp();

  const product = products.find(p => p.id === id) || products[0];
  const inv = inventory.find(i => i.product_id === product.id);
  const stock = inv ? inv.quantity : 0;
  const inStock = stock > 0;

  useEffect(() => {
    if (product) {
      db.addEvent({
        event_id: `evt-${Date.now()}`,
        event_type: 'AVAILABILITY_CHECK',
        customer_session_id: sessionService.getActiveSessionId(),
        product_id: product.id,
        product_name: product.name,
        store_id: 'BRANCH-104',
        source: 'LARGE_DISPLAY',
        metadata: { inStock, stockCount: stock },
        timestamp: new Date().toISOString()
      });
    }
  }, [product?.id, inStock, stock]);

  // Realistic price trend data matching Screen 7
  const priceTrendData = [
    { month: 'Jun', price: 90 },
    { month: 'Jul', price: 120 },
    { month: 'Aug', price: 95 },
    { month: 'Sep', price: product.price },
  ];

  const alternatives = products.filter(p => p.id !== product.id && (p.category_id === product.category_id || p.id === 'prod-tofu'));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400">
            Real-time Sensor & Shelf Telemetry
          </span>
        </div>

        {/* Main Availability Card (Matching Screen 7) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Store Availability
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {product.name}
              </h1>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Updated 2 mins ago via Smart Shelf Weight Sensor
              </p>
            </div>

            {/* In-Stock / Out-of-Stock Badge (Screen 7) */}
            <span
              className={`px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg ${
                inStock
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {inStock ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>In Stock</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Out of Stock</span>
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            {/* Left: Stock Count & Location */}
            <div className="space-y-6">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Available Units on Shelf</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black text-white">{stock}</span>
                  <span className="text-sm text-slate-400 font-semibold">packs available</span>
                </div>
                <div className="mt-3 w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      stock > 15 ? 'bg-emerald-500' : stock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, (stock / (inv?.max_capacity || 50)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Location in Store (Screen 7) */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-300">Location in Store</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {product.shelf_location}
                </p>
                <button
                  onClick={() => navigate(`/customer/map?product=${product.id}`)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Directions</span>
                </button>
              </div>

              {/* Ask Agent */}
              <button
                onClick={() => navigate(`/customer/assistant?product=${product.id}`)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Bot className="w-4 h-4 text-emerald-400" />
                <span>Ask AI Agent About This Item</span>
              </button>
            </div>

            {/* Right: Live Shelf Camera Preview & Price Trend (Screen 7) */}
            <div className="space-y-6">
              {/* Shelf Camera view */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    Live Shelf Vision Camera
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    CAM-04B
                  </span>
                </div>
                <div className="relative h-44 w-full">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80"
                    alt="Aisle shelf camera"
                    className="w-full h-full object-cover filter contrast-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3 text-[11px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                    Aisle 4 • Shelf B2 Chilled
                  </div>
                </div>
              </div>

              {/* Price Trend Chart (Screen 7) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 block mb-2">
                  Price Trend (Last 4 Months)
                </span>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ fill: '#10b981', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative Products (Screen 7) */}
        {!inStock && (
          <div className="space-y-3 bg-amber-950/20 border border-amber-500/30 p-6 rounded-3xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Item Unavailable — Recommended Substitutions
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              The AI assistant found high-protein vegetarian alternatives currently stocked in the store:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  onClick={() => navigate(`/customer/products/${alt.id}`)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer flex items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img src={alt.image_url} alt={alt.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{alt.name}</h4>
                      <p className="text-xs text-emerald-400 font-semibold">₹{alt.price}</p>
                      <span className="text-[10px] text-slate-400">{alt.aisle}</span>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
