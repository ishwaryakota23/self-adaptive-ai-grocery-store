import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';

export const StoreInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, inventory, restockProduct } = useApp();
  const [search, setSearch] = useState('');
  const [restockedToast, setRestockedToast] = useState<string | null>(null);

  const handleRestock = (productId: string, productName: string, qty = 50) => {
    restockProduct(productId, qty);
    setRestockedToast(`Restocked ${qty} units of ${productName}!`);
    setTimeout(() => setRestockedToast(null), 2500);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.aisle.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Store Inventory & Stock Levels</h1>
            <p className="text-xs text-slate-400 mt-1">Smart shelf weight scales & autonomous reorder tracking</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {restockedToast && (
          <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{restockedToast}</span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4">Stock Status</th>
                  <th className="py-4 px-4">Units Available</th>
                  <th className="py-4 px-4">Reorder Level</th>
                  <th className="py-4 px-6 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((prod) => {
                  const inv = inventory.find(i => i.product_id === prod.id);
                  const stock = inv ? inv.quantity : 0;
                  const threshold = inv ? inv.reorder_threshold : 10;
                  const isOut = stock === 0;
                  const isLow = stock > 0 && stock <= threshold;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img src={prod.image_url} alt={prod.name} className="w-10 h-10 rounded-xl object-cover" />
                          <div>
                            <span className="font-bold text-white block">{prod.name}</span>
                            <span className="text-[11px] text-slate-400">{prod.brand} • ₹{prod.price}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {prod.shelf_location}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          isOut ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30' : isLow ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-white text-base">
                        {stock}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-400">
                        {threshold}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleRestock(prod.id, prod.name, 50)}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+50 Restock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
