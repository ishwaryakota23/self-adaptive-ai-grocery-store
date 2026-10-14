import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { AlertTriangle, ArrowLeft, CheckCircle2, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import { securityAgent } from '../services/securityAgent';
import { qrService } from '../services/qrService';
import type { GeneratedQRCode } from '../services/qrService';
import type { CheckoutVerificationResult } from '../types';
import { voiceService } from '../services/voiceService';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, currentCustomer } = useApp();
  const [sessionId] = useState(() => sessionService.getActiveSessionId());
  const [verification, setVerification] = useState<CheckoutVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [demoQr, setDemoQr] = useState<GeneratedQRCode | null>(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completionLock = useRef(false);
  const totals = db.calculateAuthoritativeCartTotal(sessionId);

  const verifyBasket = async () => {
    setVerifying(true);
    setError(null);
    try {
      const result = await securityAgent.verifyPhysicalCheckout(sessionId, currentCustomer?.customer_id);
      setVerification(result);
      if (result.passed && cart.length > 0) {
        const qr = await qrService.generateDemoPaymentQR(sessionId, totals.total);
        setDemoQr(qr);
      } else {
        setDemoQr(null);
      }
    } catch (cause: any) {
      setVerification(null);
      setDemoQr(null);
      setError(cause?.message || 'Basket verification could not be completed.');
    } finally {
      setVerifying(false);
    }
  };

  const resolveBasket = async (resolutionType: 'CORRECTED_CART' | 'RETURNED_ITEM') => {
    setVerifying(true);
    setError(null);
    try {
      if (resolutionType === 'CORRECTED_CART') {
        const milk = db.getProducts().find(product => product.name.toLowerCase().includes('milk'));
        if (!milk) throw new Error('Could not find the scanned product in the catalog.');
        db.addToCart(milk, 1, sessionId);
      }
      const result = await securityAgent.resolveCheckoutDiscrepancy({
        sessionId,
        resolutionType,
        resolutionNote: resolutionType === 'CORRECTED_CART'
          ? 'Customer corrected the digital cart to match the basket'
          : 'Customer returned the extra physical item to the shelf'
      });
      setVerification(result.verification);
      if (result.verification.passed && cart.length > 0) {
        setDemoQr(await qrService.generateDemoPaymentQR(sessionId, db.calculateAuthoritativeCartTotal(sessionId).total));
      } else {
        setDemoQr(null);
      }
    } catch (cause: any) {
      setError(cause?.message || 'Could not resolve the basket discrepancy.');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    void verifyBasket();
  }, [sessionId, cart.length]);

  const finishDemo = async () => {
    if (!verification?.passed || !demoQr || completionLock.current || completed) return;
    completionLock.current = true;
    setVerifying(true);
    try {
      if (!db.completeDemoShoppingSession(sessionId)) {
        setError('This shopping session is already complete or unavailable.');
        completionLock.current = false;
        return;
      }
      setCompleted(true);
      const voiceEnabled = currentCustomer ? db.getCustomerPreferences(currentCustomer.customer_id)?.voice_enabled !== false : true;
      if (voiceEnabled) {
        void voiceService.speak('Payment Confirmed. Thank you for shopping with GrocerAI! We look forward to seeing you again.', 'en', sessionId);
      }
      confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
    } catch (cause: any) {
      completionLock.current = false;
      setError(cause?.message || 'Could not complete the demo session.');
    } finally {
      setVerifying(false);
    }
  };

  const goBack = () => navigate('/customer/cart');

  if (completed) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="w-full max-w-xl text-center space-y-5">
          <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-400" />
          <h1 className="text-4xl font-black">Payment Successful</h1>
          <p className="text-xl font-semibold">Thank you for shopping with GrocerAI!</p>
          <p className="text-base text-slate-300">Please visit again.</p>
          <p className="text-xs text-slate-500">Demo only. No real payment was taken.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <button onClick={goBack} aria-label="Back to cart" className="rounded-xl border border-slate-800 bg-slate-900 p-2"><ArrowLeft className="h-4 w-4" /></button>
          <div><h1 className="text-2xl font-extrabold">Checkout</h1><p className="text-xs text-slate-400">Session: <span className="font-mono text-emerald-400">{sessionId}</span></p></div>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-bold">Review items ({cart.length})</h2><span className="text-sm text-slate-300">₹{totals.total.toFixed(2)}</span></div>
          {cart.length ? <div className="space-y-2">{cart.map(item => <div key={item.id} className="flex justify-between text-sm text-slate-300"><span>{item.quantity} × {item.product.name}</span><span>₹{(item.product.price * item.quantity).toFixed(2)}</span></div>)}</div> : <p className="text-sm text-slate-400">Your cart is empty.</p>}
          <p className="border-t border-slate-800 pt-3 text-xs text-slate-400">Subtotal ₹{totals.subtotal.toFixed(2)} · GST ₹{totals.tax.toFixed(2)}</p>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-emerald-400" /><div><h2 className="font-bold">Physical basket verification</h2><p className="text-xs text-slate-400">Verify the basket before the demo checkout QR is shown.</p></div></div>
            <button onClick={() => void verifyBasket()} disabled={verifying || !cart.length} className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} /> Verify</button>
          </div>
          {verification?.passed ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-sm text-emerald-300">Basket verification passed.</p> : <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200"><div><AlertTriangle className="mr-2 inline h-4 w-4" />{verification?.customerAlert?.message || 'Complete product verification at the kiosk before checkout.'}<button onClick={() => navigate('/customer/verify')} className="ml-2 underline">Open verification station</button></div>{verification?.hasDiscrepancy && <div className="flex flex-wrap gap-2"><button disabled={verifying} onClick={() => void resolveBasket('CORRECTED_CART')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Update digital cart</button><button disabled={verifying} onClick={() => void resolveBasket('RETURNED_ITEM')} className="rounded-lg border border-slate-600 px-3 py-2 text-xs disabled:opacity-50">Return item</button></div>}</div>}
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        </section>

        {verification?.passed && demoQr && (
          <section className="rounded-3xl border border-emerald-500/40 bg-slate-900 p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-emerald-300"><QrCode className="h-5 w-5" /><h2 className="text-lg font-bold">Demo Payment QR</h2></div>
            <img src={demoQr.dataUrl} alt="Scannable Demo Payment QR" className="mx-auto h-56 w-56 rounded-xl bg-white p-2" />
            <p className="text-sm text-slate-300">This is a simulated payment demonstration. No real money will be transferred.</p>
            <p className="text-xs text-slate-500">Demo confirmation does not create a paid order, sales record, or inventory movement.</p>
            <button onClick={() => void finishDemo()} disabled={verifying || completed} className="w-full rounded-xl bg-emerald-500 py-4 text-lg font-black text-slate-950 disabled:opacity-50">Done</button>
          </section>
        )}
      </div>
    </main>
  );
};
