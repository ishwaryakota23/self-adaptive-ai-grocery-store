import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  QrCode,
  Wallet,
  Banknote,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Sparkles,
  AlertTriangle,
  FileText,
  Printer,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import { Order } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, cartTotal } = useApp();
  const [sessionId] = useState(() => sessionService.getActiveSessionId());
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Wallet' | 'Cash'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Requirement: Record Checkout Started Event on page entry
  useEffect(() => {
    db.recordCheckoutStarted(sessionId, 'LARGE_DISPLAY');
  }, [sessionId]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const handlePay = () => {
    setIsProcessing(true);
    setPaymentError(null);

    setTimeout(() => {
      // Execute confirmed transaction in DB (creates Order, records Payment, deducts Inventory, records Sales)
      const order = db.completeCheckout(paymentMethod, sessionId);

      // Create a store event for Store Agent telemetry
      db.getStoreEvents().unshift({
        id: `ev-${Date.now()}`,
        event_type: 'price_change',
        product_name: order.items[0]?.product_name,
        severity: 'low',
        message: `Order #${order.id} confirmed: ₹${order.total_amount} via ${paymentMethod}. Inventory movements recorded.`,
        created_at: new Date().toISOString()
      });

      setCompletedOrder(order);
      setIsProcessing(false);

      // Trigger celebratory confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 1200);
  };

  const handleSimulateFailure = () => {
    setIsProcessing(true);
    setPaymentError(null);

    setTimeout(() => {
      setIsProcessing(false);
      db.recordPaymentFailed(sessionId, paymentMethod, 'Bank server timeout (Simulation test)');
      setPaymentError(
        `Payment failed: Bank transaction declined via ${paymentMethod}. Your cart items and inventory remain untouched.`
      );
    }, 800);
  };

  const handleAbandonCheckout = () => {
    db.recordCheckoutAbandoned(sessionId, 'Customer cancelled from payment screen');
    navigate('/customer/cart');
  };

  // Render Receipt / Confirmation Screen
  if (completedOrder) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
          {/* Success Badge */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Payment Confirmed!</h2>
            <p className="text-xs text-slate-400">
              Inventory deducted • Sales recorded • Mission completed
            </p>
          </div>

          {/* Digital Receipt Card */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Order ID</span>
                <span className="font-mono font-bold text-sm text-emerald-400">{completedOrder.id}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Session</span>
                <span className="font-mono font-semibold text-slate-300">{completedOrder.customer_id}</span>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {completedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-300">
                  <span>
                    {item.quantity}x {item.product_name}
                  </span>
                  <span className="font-mono font-semibold text-white">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Subtotal</span>
                <span>₹{completedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>GST (5%)</span>
                <span>₹{completedOrder.tax}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-slate-800/80">
                <span>Total Paid</span>
                <span className="text-emerald-400 font-mono text-base">₹{completedOrder.total_amount}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px] pt-1">
                <span>Payment Method</span>
                <span className="font-semibold text-slate-300">{completedOrder.payment_method}</span>
              </div>
            </div>

            {/* Smart Exit QR Code */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-4 bg-slate-900/60 p-3 rounded-xl">
              <div className="w-14 h-14 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-slate-950" />
              </div>
              <div>
                <span className="font-bold text-xs text-white block">Exit Gate Pass</span>
                <span className="text-[11px] text-slate-400 leading-snug block">
                  Scan this pass at turnstile exit gates 1–4 to depart the store.
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/customer/home')}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer text-center"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => window.print()}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={() => navigate('/store/dashboard')}
              className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-blue-400 font-semibold rounded-2xl text-xs border border-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Manager HQ →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAbandonCheckout}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Return to Cart"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Self-Checkout & Payment</h1>
              <p className="text-xs text-slate-400">
                Session: <span className="font-mono text-emerald-400 font-semibold">{sessionId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleAbandonCheckout}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Abandon Checkout</span>
          </button>
        </div>

        {/* Payment Error Banner (if simulated or triggered) */}
        {paymentError && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Payment Did Not Complete</span>
              <span>{paymentError}</span>
              <p className="text-[11px] text-rose-300">
                You can retry with another payment method or continue shopping.
              </p>
            </div>
          </div>
        )}

        {/* Order Items Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-200">Review Items ({cart.length})</h3>
            <span className="text-[11px] text-slate-400">Inventory reserved pending payment</span>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Your cart is empty. Add products before checking out.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {cart.map((c) => (
                <div key={c.id} className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">
                    {c.quantity}x {c.product.name}
                  </span>
                  <span className="font-semibold text-white">
                    ₹{c.product.price * c.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
            <div>
              <span className="text-xs text-slate-400 block">Total Due (inc. 5% GST)</span>
              <span className="text-[11px] text-slate-500">
                Subtotal ₹{subtotal} + GST ₹{tax}
              </span>
            </div>
            <span className="text-2xl font-black text-emerald-400">₹{total}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-sm text-slate-200">Select Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* UPI */}
            <button
              onClick={() => setPaymentMethod('UPI')}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                paymentMethod === 'UPI'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <QrCode className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-xs block">UPI / QR</span>
                <span className="text-[10px] text-slate-400">GPay, PhonePe, Paytm</span>
              </div>
            </button>

            {/* Card */}
            <button
              onClick={() => setPaymentMethod('Card')}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                paymentMethod === 'Card'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-xs block">Credit / Debit Card</span>
                <span className="text-[10px] text-slate-400">Tap to pay / Chip</span>
              </div>
            </button>

            {/* Wallet */}
            <button
              onClick={() => setPaymentMethod('Wallet')}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                paymentMethod === 'Wallet'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Wallet className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-xs block">Store Wallet</span>
                <span className="text-[10px] text-slate-400">GrocerPay balance</span>
              </div>
            </button>

            {/* Cash */}
            <button
              onClick={() => setPaymentMethod('Cash')}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                paymentMethod === 'Cash'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Banknote className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-xs block">Cash at Counter</span>
                <span className="text-[10px] text-slate-400">Counters 1 - 4</span>
              </div>
            </button>
          </div>
        </div>

        {/* Action Controls: Confirm Pay & Test Failure & Abandon */}
        <div className="space-y-3">
          <button
            onClick={handlePay}
            disabled={isProcessing || cart.length === 0}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-base shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Processing Transaction...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Confirm & Pay ₹{total}</span>
              </>
            )}
          </button>

          {/* Test & Verification Options */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              onClick={handleSimulateFailure}
              disabled={isProcessing || cart.length === 0}
              className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Test Requirement: Verify that payment failure creates NO sale and NO inventory deduction"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate Payment Failure</span>
            </button>

            <button
              onClick={handleAbandonCheckout}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel & Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
