import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Bell,
  Sparkles,
  MapPin,
  Compass,
  Store,
  User,
  Globe,
  Database,
  Menu,
  X,
  BrainCircuit,
  MessageSquare,
  Smartphone,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LanguageCode } from '../types';
import { QRSessionModal } from './QRSessionModal';
import { managerService } from '../services/managerService';
import { sessionService } from '../services/sessionService';

interface NavbarProps {
  onOpenSupabaseModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSupabaseModal }) => {
  const {
    role,
    setRole,
    language,
    setLanguage,
    cartItemCount,
    unreadNotificationCount,
    setIsDemoTourOpen,
    activeMission
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionService.getActiveSessionId());
  const [currentManager, setCurrentManager] = useState(managerService.getCurrentManager());

  useEffect(() => {
    const unsubSession = sessionService.subscribe((s) => {
      setActiveSessionId(s.id);
    });
    const unsubManager = managerService.subscribe((m) => {
      setCurrentManager(m);
    });
    return () => {
      unsubSession();
      unsubManager();
    };
  }, []);

  const languages: { code: LanguageCode; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'hi', label: 'हिन्दी' },
  ];

  const handleManagerLogout = () => {
    managerService.logout();
    setRole('CUSTOMER');
    navigate('/');
  };

  const isStore = location.pathname.startsWith('/store');

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white transition-all shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
                    Grocer<span className="text-emerald-400">AI</span>
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                    Self-Adaptive Store
                  </span>
                </div>
              </Link>

              {/* Navigation links for Customer */}
              {role === 'CUSTOMER' && (
                <nav className="hidden md:flex items-center space-x-1">
                  <Link
                    to="/customer/home"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/customer/home'
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/customer/assistant"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/customer/assistant'
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    AI Assistant
                  </Link>
                  <Link
                    to="/customer/mission"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/customer/mission'
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Mission
                    {activeMission && (
                      <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                        {activeMission.items.filter((i) => i.status === 'found').length}/
                        {activeMission.items.length}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/customer/products"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/customer/products')
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Products
                  </Link>
                  <Link
                    to="/customer/map"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/customer/map'
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Store Map
                  </Link>
                  <Link
                    to="/customer/memory"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/customer/memory'
                        ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <BrainCircuit className="w-4 h-4 text-emerald-400" />
                    Memory
                  </Link>
                </nav>
              )}

              {/* Navigation links for Store Manager */}
              {role === 'STORE_MANAGER' && (
                <nav className="hidden md:flex items-center space-x-1">
                  <Link
                    to="/store/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/store/dashboard'
                        ? 'bg-blue-500/20 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Overview
                  </Link>
                  <Link
                    to="/store/inventory"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/store/inventory'
                        ? 'bg-blue-500/20 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Inventory
                  </Link>
                  <Link
                    to="/store/demand"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/store/demand'
                        ? 'bg-blue-500/20 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Unmet Demand
                  </Link>
                  <Link
                    to="/store/recommendations"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/store/recommendations'
                        ? 'bg-blue-500/20 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    AI Recommendations
                  </Link>
                  <Link
                    to="/store/actions"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                      location.pathname === '/store/actions'
                        ? 'bg-blue-500/20 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Self-Adaptive Loop
                  </Link>
                </nav>
              )}
            </div>

            {/* Right Action Icons & Controls */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* QR Mobile Companion Button (Prominent for Customers) */}
              {role === 'CUSTOMER' && (
                <button
                  onClick={() => setQrModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all cursor-pointer animate-pulse-subtle"
                  title="Scan QR to continue shopping mission on your mobile"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Continue on Mobile</span>
                  <span className="sm:hidden">Mobile</span>
                </button>
              )}

              {/* Demo Walkthrough Trigger */}
              <button
                onClick={() => setIsDemoTourOpen(true)}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all cursor-pointer border border-slate-700/80"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>13-Step AI Tour</span>
              </button>

              {/* Language Selector */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-colors">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{languages.find((l) => l.code === language)?.label || 'English'}</span>
                </button>
                <div className="absolute right-0 mt-1 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 py-1">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                        language === l.code
                          ? 'text-emerald-400 font-semibold bg-slate-800'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{l.label}</span>
                      {language === l.code && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications Bell (Customer view) */}
              {role === 'CUSTOMER' && (
                <Link
                  to="/customer/notifications"
                  className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  title="Proactive Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotificationCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart Icon (Customer view) */}
              {role === 'CUSTOMER' && (
                <Link
                  to="/customer/cart"
                  className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                  title="Cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Supabase Status / Config Modal Trigger */}
              {onOpenSupabaseModal && (
                <button
                  onClick={onOpenSupabaseModal}
                  title="Database / Supabase Settings"
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                </button>
              )}

              {/* Manager Controls: Login Link (Customer) OR Manager Badge + Logout (Manager) */}
              {role === 'CUSTOMER' ? (
                <Link
                  to="/manager/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  title="Staff Portal for Store Managers"
                >
                  <Store className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Manager Login</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 bg-blue-950/60 border border-blue-500/30 px-2.5 py-1 rounded-xl text-xs text-blue-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold">
                      {currentManager ? currentManager.employee_id : 'Manager'}
                    </span>
                  </div>
                  <button
                    onClick={handleManagerLogout}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-medium transition-colors border border-slate-700"
                    title="Sign Out of Operations HQ"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-2 pb-4 space-y-1">
            {role === 'CUSTOMER' ? (
              <>
                <Link
                  to="/customer/home"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Home
                </Link>
                <Link
                  to="/customer/assistant"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  AI Assistant
                </Link>
                <Link
                  to="/customer/mission"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Shopping Mission
                </Link>
                <Link
                  to="/customer/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Products
                </Link>
                <Link
                  to="/customer/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Store Map
                </Link>
                <Link
                  to="/customer/memory"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Memory & Insights
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setQrModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-emerald-400 bg-slate-800/80 flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Continue on Mobile
                </button>
                <Link
                  to="/manager/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-400 hover:bg-slate-800"
                >
                  Store Manager Portal →
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/store/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Store Dashboard
                </Link>
                <Link
                  to="/store/inventory"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Inventory
                </Link>
                <Link
                  to="/store/demand"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Unmet Demand
                </Link>
                <Link
                  to="/store/recommendations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  AI Recommendations
                </Link>
                <Link
                  to="/store/actions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Self-Adaptive Actions
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleManagerLogout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout to Customer Store
                </button>
              </>
            )}
            <button
              onClick={() => {
                setIsDemoTourOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-emerald-400 bg-slate-800/80 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              13-Step AI Demonstration
            </button>
          </div>
        )}
      </header>

      {/* QR Code Session Modal */}
      <QRSessionModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} />
    </>
  );
};
