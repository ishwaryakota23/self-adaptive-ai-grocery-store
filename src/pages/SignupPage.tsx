import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowRight, User, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setRole } = useApp();
  const [name, setName] = useState('New Shopper');
  const [email, setEmail] = useState('');
  const [role, setLocalRole] = useState<'CUSTOMER' | 'STORE_MANAGER'>('CUSTOMER');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setRole(role);
    if (role === 'STORE_MANAGER') {
      navigate('/store/dashboard');
    } else {
      navigate('/customer/home');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white">Create GrocerAI Account</h2>
          <p className="text-xs text-slate-400">Join the smart grocery network</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalRole('CUSTOMER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  role === 'CUSTOMER' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setLocalRole('STORE_MANAGER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  role === 'STORE_MANAGER' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Store Manager
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="text-emerald-400 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
