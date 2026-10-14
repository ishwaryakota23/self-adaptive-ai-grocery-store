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
  ShieldCheck,
  Monitor,
  Fingerprint,
  QrCode
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LanguageCode } from '../types';
import { QRSessionModal } from './QRSessionModal';
import { ManagerAppInstallModal } from './ManagerAppInstallModal';
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
    activeMission,
    currentCustomer,
    currentEmployee,
    logoutEmployee,
    setIsCustomerAuthModalOpen,
    setIsCustomerIdentityQRModalOpen,
    isSessionQRModalOpen,
    setIsSessionQRModalOpen,
    logoutCustomer,
    openEnterStore
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionService.getActiveSessionId());
  const [currentManager, setCurrentManager] = useState(managerService.getCurrentManager());
  const [isManagerInstallModalOpen, setIsManagerInstallModalOpen] = useState(false);

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

  if (location.pathname === '/kiosk') {
    return null;
  }

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

              {/* Navigation links for Customer (Strictly inside /customer/* dashboard) */}
              {location.pathname.startsWith('/customer') && (
                <nav className="flex items-center space-x-1 sm:space-x-2">
                  <Link
                    to="/customer/products"
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                      location.pathname === '/customer/products' || location.pathname === '/customer/home'
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/customer/assistant"
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/customer/assistant'
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>AI Assistant</span>
                  </Link>
                  <Link
                    to="/customer/cart"
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/customer/cart'
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span>Cart</span>
                    {cartItemCount > 0 && (
                      <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/customer/map"
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/customer/map'
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Store Map</span>
                  </Link>
                  <button
                    onClick={() => setIsSessionQRModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    title="Switch to Mobile Shopping Companion (Scan QR)"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="whitespace-nowrap">Switch to Mobile</span>
                  </button>
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

              {/* Navigation links for Employee */}
              {role === 'EMPLOYEE' && (
                <nav className="hidden md:flex items-center space-x-1">
                  <Link
                    to="/employee/dashboard"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      location.pathname === '/employee/dashboard'
                        ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Security Console
                  </Link>
                </nav>
              )}
            </div>

            {/* Right Action Icons & Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Customer Identity Badge & Actions (Customer routes only) */}
              {location.pathname.startsWith('/customer') && (
                <>
                  {currentCustomer ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsCustomerIdentityQRModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-emerald-500/40 transition-all cursor-pointer"
                        title="View Customer Identity QR"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-white">{currentCustomer.name}</span>
                      </button>

                      <button
                        onClick={logoutCustomer}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                        title="Sign Out / Reset Customer Session"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCustomerAuthModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                      title="Check-In or Scan Customer QR"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Check-In</span>
                    </button>
                  )}
                </>
              )}

              {/* Language Selector (Universal across all pages) */}
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

              {/* Landing Page Action: Staff Links & Prominent Enter Store */}
              {location.pathname === '/' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEnterStore('EMPLOYEE')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Staff Portal for Exit Verification & Security"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Employee</span>
                  </button>
                  <button
                    onClick={() => openEnterStore('MANAGER')}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Staff Portal for Store Managers"
                  >
                    <Store className="w-3.5 h-3.5 text-blue-400" />
                    <span>Manager</span>
                  </button>
                  <button
                    onClick={() => openEnterStore()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs sm:text-sm uppercase tracking-wide shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-slate-950" />
                    <span>ENTER STORE</span>
                  </button>
                </div>
              )}

              {/* Supabase Status / Config Modal Trigger (Staff only) */}
              {!location.pathname.startsWith('/customer') && location.pathname !== '/' && onOpenSupabaseModal && (
                <button
                  onClick={onOpenSupabaseModal}
                  title="Database / Supabase Settings"
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                </button>
              )}

              {/* Role-Specific Controls: Employee */}
              {role === 'EMPLOYEE' && location.pathname.startsWith('/employee') && (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-xl text-xs text-cyan-300">
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold">
                      {currentEmployee ? `${currentEmployee.employee_id} (${currentEmployee.name})` : 'Employee'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logoutEmployee();
                      navigate('/');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
                    title="Sign Out of Employee Console"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}

              {/* Role-Specific Controls: Manager */}
              {role === 'STORE_MANAGER' && location.pathname.startsWith('/store') && (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 bg-blue-950/60 border border-blue-500/30 px-2.5 py-1 rounded-xl text-xs text-blue-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold">
                      {currentManager ? currentManager.employee_id : 'Manager'}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsManagerInstallModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-semibold transition-colors border border-emerald-500/30 cursor-pointer"
                    title="Install Mobile App on Phone (Scan QR Code)"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Install App</span>
                  </button>
                  <button
                    onClick={handleManagerLogout}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
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
            {location.pathname.startsWith('/customer') ? (
              <>
                <Link
                  to="/customer/products"
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
                  to="/customer/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Cart ({cartItemCount})
                </Link>
                <Link
                  to="/customer/map"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  Store Map
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsSessionQRModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-bold text-emerald-400 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Switch to Mobile</span>
                </button>
                {currentCustomer ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logoutCustomer();
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-slate-800"
                  >
                    Sign Out ({currentCustomer.name})
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsCustomerAuthModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-emerald-400 hover:bg-slate-800"
                  >
                    Check-In / Identify Customer
                  </button>
                )}
              </>
            ) : location.pathname === '/' ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openEnterStore();
                  }}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-bold text-emerald-400 hover:bg-slate-800"
                >
                  Enter Store
                </button>
                <Link
                  to="/employee/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-cyan-400 hover:bg-slate-800"
                >
                  Employee Portal
                </Link>
                <Link
                  to="/manager/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-400 hover:bg-slate-800"
                >
                  Manager Portal
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
      <QRSessionModal isOpen={isSessionQRModalOpen} onClose={() => setIsSessionQRModalOpen(false)} />

      {/* Manager App Install Modal */}
      <ManagerAppInstallModal isOpen={isManagerInstallModalOpen} onClose={() => setIsManagerInstallModalOpen(false)} />
    </>
  );
};
