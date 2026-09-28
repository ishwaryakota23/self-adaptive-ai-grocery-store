import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, User, Store, ArrowRight, ShieldCheck, Sparkles, Key } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole } = useApp();
  const [email, setEmail] = useState('customer@grocerai.internal');
  const [password, setPassword] = useState('••••••••');
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'STORE_MANAGER'>('CUSTOMER');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setRole(selectedRole);
    if (selectedRole === 'STORE_MANAGER') {
      navigate('/store/dashboard');
    } else {
      navigate('/customer/home');
    }
  };

  const handleQuickDemoCustomer = () => {
    setRole('CUSTOMER');
    navigate('/customer/home');
  };

  const handleQuickDemoManager = () => {
    setRole('STORE_MANAGER');
    navigate('/store/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white">Sign In to GrocerAI</h2>
          <p className="text-xs text-slate-400">
            Select your role to access personalized shopping or physical store operations
          </p>
        </div>

        {/* Demo One-Click Role Access */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
            One-Click Instant Demo Access:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleQuickDemoCustomer}
              className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 flex flex-col items-center text-center transition-all cursor-pointer group"
            >
              <User className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white">Customer</span>
              <span className="text-[10px] text-slate-500">Ishwarya Kota</span>
            </button>

            <button
              onClick={handleQuickDemoManager}
              className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 flex flex-col items-center text-center transition-all cursor-pointer group"
            >
              <Store className="w-5 h-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-white">Store Manager</span>
              <span className="text-[10px] text-slate-500">Vikram M. (HQ)</span>
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase font-bold">Or Email Login</span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('CUSTOMER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  selectedRole === 'CUSTOMER'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('STORE_MANAGER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  selectedRole === 'STORE_MANAGER'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Store Manager
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-400 font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};
