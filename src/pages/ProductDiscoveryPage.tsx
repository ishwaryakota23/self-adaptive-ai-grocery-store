import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import {
  Search,
  SlidersHorizontal,
  ShoppingBag,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProductDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, inventory, addToCart } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [organicOnly, setOrganicOnly] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        db.addEvent({
          event_id: `evt-${Date.now()}`,
          event_type: 'PRODUCT_SEARCH',
          customer_session_id: sessionService.getActiveSessionId(),
          store_id: 'BRANCH-104',
          source: 'LARGE_DISPLAY',
          metadata: { query: searchQuery.trim(), category: selectedCategory },
          timestamp: new Date().toISOString()
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, selectedCategory]);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'cat-1', name: 'Dairy' },
    { id: 'cat-2', name: 'Fruits & Veg' },
    { id: 'cat-3', name: 'Bakery' },
    { id: 'cat-4', name: 'Grains & Pasta' },
    { id: 'cat-7', name: 'Staples & Oils' },
  ];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.aisle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesOrganic = !organicOnly || p.is_organic;
    return matchesSearch && matchesCategory && matchesOrganic;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Supermarket Aisles & Products
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Browse physical store inventory with live shelf sensors & AI stock counters
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands, aisles..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setOrganicOnly(!organicOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                organicOnly
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Organic</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === c.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const inv = inventory.find(i => i.product_id === product.id);
            const stock = inv ? inv.quantity : 0;
            const inStock = stock > 0;

            return (
              <div
                key={product.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-1 flex flex-col justify-between group"
              >
                <div
                  onClick={() => navigate(`/customer/products/${product.id}`)}
                  className="cursor-pointer p-4 pb-2"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 mb-3 flex items-center justify-center">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Stock status indicator */}
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        inStock ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {inStock ? `${stock} left` : 'Out of stock'}
                    </span>

                    <span className="absolute bottom-2 right-2 text-[10px] bg-slate-900/90 text-emerald-400 font-semibold px-2 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {product.aisle}
                    </span>
                  </div>

                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {product.brand}
                  </span>
                  <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {product.description}
                  </p>
                </div>

                {/* Price & Actions Row */}
                <div className="p-4 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-base font-black text-white">₹{product.price}</span>
                    {product.original_price && (
                      <span className="text-xs text-slate-500 line-through ml-1.5">
                        ₹{product.original_price}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/customer/availability/${product.id}`)}
                      className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800/80 rounded-xl transition-colors"
                      title="Check shelf availability & camera"
                    >
                      <Clock className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => addToCart(product, 1)}
                      disabled={!inStock}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        inStock
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{inStock ? 'Add' : 'Empty'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
