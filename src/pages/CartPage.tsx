import React, { useState } from 'react';
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
  ShoppingBag,
  Camera,
  QrCode,
  MapPin,
  ExternalLink,
  CheckCircle2,
  X,
  Clock,
  Users
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import { sessionSyncService } from '../services/sessionSyncService';
import { fetchDetectedLanOrigin } from '../services/sessionHandoffService';
import { qrService } from '../services/qrService';
import { ProductCameraIdentifier } from '../components/ProductCameraIdentifier';
import { CheckoutQueue } from '../types';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateCartItemQuantity, removeCartItem, clearCart, cartTotal, cartItemCount, currentCustomer, customerIdentityToken } = useApp();
  const sessionId = sessionService.getActiveSessionId();

  const [productCameraOpen, setProductCameraOpen] = useState(false);
  const [proceedToKioskModalOpen, setProceedToKioskModalOpen] = useState(false);
  const [optimalKiosk, setOptimalKiosk] = useState<CheckoutQueue | null>(null);
  const [sessionQrUrl, setSessionQrUrl] = useState<string | null>(null);
  const [sessionQrError, setSessionQrError] = useState<string | null>(null);
  const [kioskHandoffUrl, setKioskHandoffUrl] = useState<string | null>(null);

  const tax = Math.round(cartTotal * 0.05);
  const finalTotal = cartTotal + tax;

  const handleStartProceedToCheckout = async () => {
    // 1. Determine optimal verification kiosk
    const kiosk = db.getOptimalVerificationKiosk();
    setOptimalKiosk(kiosk);

    // 2. Update session lifecycle to CHECKOUT_REQUESTED
    sessionService.setLifecycleStatus(
      'CHECKOUT_REQUESTED',
      kiosk.kiosk_id || `KIOSK-0${kiosk.counter_number}`
    );

    // 3. Generate Session Handoff QR for Kiosk Identification
    try {
      setSessionQrUrl(null);
      setSessionQrError(null);
      setKioskHandoffUrl(null);
      const custId = currentCustomer?.customer_id;
      const identityToken = customerIdentityToken?.secure_token || (custId ? db.getActiveCustomerIdentityToken(custId)?.secure_token : undefined);
      if (!custId || !identityToken) throw new Error('Sign in with a verified customer pass before generating a kiosk QR.');
      const handoffGen = await sessionSyncService.createHandoff({
        sessionId,
        customerId: custId,
        identityToken,
        cart: db.getCart(sessionId),
        clientOrigin: await fetchDetectedLanOrigin()
      });
      if (!handoffGen.handoff?.secure_token || !handoffGen.kioskUrl) throw new Error('The server did not return a secure kiosk pass. Check session-sync configuration and retry.');
      setKioskHandoffUrl(handoffGen.kioskUrl);
      const qr = await qrService.generateSessionQR({ ...handoffGen.handoff, qr_payload: handoffGen.kioskUrl });
      setSessionQrUrl(qr.dataUrl);
    } catch (e) {
      console.warn('Failed to generate session QR:', e);
      setSessionQrError((e as Error)?.message || 'Secure session QR generation failed. Please retry.');
    }

    // 4. Open modal directing customer to verification kiosk
    setProceedToKioskModalOpen(true);
  };

  const handleGoToKioskTerminal = () => {
    if (!kioskHandoffUrl) {
      setSessionQrError('The secure kiosk pass is not ready. Retry session QR generation before continuing.');
      return;
    }
    setProceedToKioskModalOpen(false);
    sessionService.setLifecycleStatus('WAITING_FOR_KIOSK');
    const kioskUrl = new URL(kioskHandoffUrl);
    navigate(`/customer/verify${kioskUrl.search}`);
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white">Your Cart is Empty</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">
          Pick items from the catalog or use your camera to identify products in the aisle.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/customer/products')}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-all"
          >
            Explore Grocery Catalog
          </button>
          <button
            onClick={() => setProductCameraOpen(true)}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold rounded-2xl text-sm transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Identify Product</span>
          </button>
        </div>

        <ProductCameraIdentifier
          isOpen={productCameraOpen}
          onClose={() => setProductCameraOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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

          <div className="flex items-center gap-2">
            {/* Assistive Camera Feature Button */}
            <button
              onClick={() => setProductCameraOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Identify Product</span>
            </button>

            <button
              onClick={clearCart}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors ml-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
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

                {/* Quantity Controls & Total */}
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

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => navigate('/customer/products')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1.5"
              >
                <span>+ Continue Shopping</span>
              </button>

              <button
                onClick={() => setProductCameraOpen(true)}
                className="text-xs text-slate-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Verify item in hand</span>
              </button>
            </div>
          </div>

          {/* Order Summary Box */}
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

              {/* Proceed to Checkout Button */}
              <button
                onClick={handleStartProceedToCheckout}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* In-Store Verification Station Button */}
              <button
                onClick={() => navigate('/customer/verify')}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>In-Store Verification Station & Pay</span>
              </button>

              <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Physical Verification Gated at Station</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assistive Product Camera Identifier Modal */}
      <ProductCameraIdentifier
        isOpen={productCameraOpen}
        onClose={() => setProductCameraOpen(false)}
      />

      {/* Proceed to Nearest Verification Kiosk Modal */}
      {proceedToKioskModalOpen && optimalKiosk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-6">
            <button
              onClick={() => setProceedToKioskModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" />
                <span>Verification Station Routing</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Please proceed to the nearest available verification kiosk
              </h2>
              <p className="text-xs text-slate-400">
                Your active shopping session is ready for physical basket verification.
              </p>
            </div>

            {/* Recommended Kiosk Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                    Recommended Station
                  </span>
                  <h3 className="text-lg font-extrabold text-white">
                    {optimalKiosk.kiosk_name || `Verification Kiosk ${optimalKiosk.counter_number}`}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase border border-emerald-500/30">
                  {optimalKiosk.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>~{optimalKiosk.estimated_wait_mins} min wait</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{optimalKiosk.customer_count} waiting</span>
                </div>
              </div>
            </div>

            {/* Shopping Session QR Code for Kiosk Scanner */}
            <div className="space-y-2 text-center">
              <span className="text-[11px] font-mono text-slate-400">
                Scan your Shopping Session Pass at the Kiosk:
              </span>
              <div className="p-3 bg-white rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-lg">
                {sessionQrUrl ? (
                  <img
                    src={sessionQrUrl}
                    alt="Shopping Session QR Pass"
                    className="w-full h-full object-contain"
                  />
                ) : sessionQrError ? (
                  <span role="alert" className="px-3 text-center text-xs text-rose-700">{sessionQrError}</span>
                ) : (
                  <QrCode className="w-10 h-10 text-slate-400 animate-pulse" />
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Session ID: <strong className="text-emerald-400">{sessionId}</strong>
              </p>
            </div>

            {/* Next Steps Explanation */}
            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <p className="font-semibold text-slate-300">What happens next?</p>
              <p>1. Present this QR at the kiosk optical scanner.</p>
              <p>2. Kiosk CV compares your digital cart with your physical basket.</p>
              <p>3. Once verification passes, a clearly labeled demo checkout QR will display on the kiosk.</p>
            </div>

            {/* Navigation & Kiosk Actions */}
            <div className="space-y-2">
              <button
                onClick={handleGoToKioskTerminal}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Arrived at Kiosk / Open Kiosk Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setProceedToKioskModalOpen(false);
                  navigate('/customer/map');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Route on Store Map</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
