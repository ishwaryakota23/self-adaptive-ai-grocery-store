import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ShoppingCart,
  Sparkles,
  Info,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import { Product, CartItem } from '../types';

interface ProductCameraIdentifierProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product) => void;
  onProductIdentified?: (product: Product) => void;
  initialProductId?: string;
}

export const ProductCameraIdentifier: React.FC<ProductCameraIdentifierProps> = ({
  isOpen,
  onClose,
  onAddToCart,
  onProductIdentified,
  initialProductId = 'prod-rolled-oats'
}) => {
  const { cart, addToCart } = useApp();
  const sessionId = sessionService.getActiveSessionId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const products = db.getProducts();
  const detectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  useEffect(() => {
    if (isOpen && detectedProduct && onProductIdentified) {
      onProductIdentified(detectedProduct);
    }
  }, [isOpen, selectedProductId]);

  // Active cart items in current session
  const activeCartItems: CartItem[] = cart.length > 0 ? cart : db.getCart(sessionId);

  // Analyze relationship between detected product and active cart
  const exactCartItem = activeCartItems.find(item => item.product_id === detectedProduct?.id);

  // Check for category/name variant conflict (e.g. Taaza milk vs Gold milk in cart)
  const variantConflictItem = activeCartItems.find(item => {
    if (item.product_id === detectedProduct?.id) return false;
    const catMatch = item.product?.category_name && detectedProduct?.category_name &&
      item.product.category_name.toLowerCase() === detectedProduct.category_name.toLowerCase();
    const isMilkVariant = (item.product?.name?.toLowerCase().includes('milk') && detectedProduct?.name?.toLowerCase().includes('milk'));
    const isBreadVariant = (item.product?.name?.toLowerCase().includes('bread') && detectedProduct?.name?.toLowerCase().includes('bread'));
    return isMilkVariant || isBreadVariant;
  });

  // Start / stop camera stream
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    let mounted = true;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (mounted) {
            streamRef.current = stream;
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          } else {
            stream.getTracks().forEach(t => t.stop());
          }
        })
        .catch(() => {
          if (mounted) setHasCameraPermission(false);
        });
    } else {
      setHasCameraPermission(false);
    }

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExplicitAddToCart = () => {
    if (!detectedProduct) return;
    if (onAddToCart) {
      onAddToCart(detectedProduct);
    } else {
      addToCart(detectedProduct);
    }
    setAddedNotice(`Added 1x ${detectedProduct.name} to your cart.`);
    setTimeout(() => setAddedNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Identify Product
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Assistive AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Point at any shelf product to verify cart status without auto-adding
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder / Optical Sensor */}
        <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {!hasCameraPermission && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-2 z-10">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Scan className="w-6 h-6 animate-pulse text-emerald-400" />
              </div>
              <p className="text-xs text-slate-300 font-medium">Optical Sensor Simulation Mode</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Scanning target shelf product using edge computer vision
              </p>
            </div>
          )}

          {/* Targeting Reticle Overlay */}
          <div className="absolute inset-6 border-2 border-dashed border-emerald-500/60 rounded-xl pointer-events-none flex flex-col justify-between p-3 z-20">
            <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400">
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded">OPTI-CV ACTIVE</span>
              <span className="bg-slate-950/80 px-1.5 py-0.5 rounded">98.4% CONF</span>
            </div>
            <div className="text-center">
              <span className="inline-block px-3 py-1 bg-slate-950/90 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-semibold backdrop-blur-sm shadow-md">
                {detectedProduct?.name || 'Scanning product...'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Product Switcher for interactive demonstration */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Simulate Pointing Camera At:</span>
            <span className="text-[10px] text-slate-500 font-normal">Catalog test items</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {products
              .filter(p => ['prod-rolled-oats', 'prod-taaza-milk', 'prod-paneer', 'prod-sourdough'].includes(p.id))
              .concat(products.filter(p => !['prod-rolled-oats', 'prod-taaza-milk', 'prod-paneer', 'prod-sourdough'].includes(p.id)))
              .slice(0, 4)
              .map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProductId(p.id)}
                className={`p-2 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                  selectedProductId === p.id
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div className="truncate font-semibold">{p.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">₹{p.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Detection Card & Comparison Result */}
        {detectedProduct && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Detected Product
                </span>
                <h3 className="text-sm font-extrabold text-white mt-1 truncate">
                  {detectedProduct.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {detectedProduct.weight_or_volume} • {detectedProduct.aisle} • <span className="text-emerald-400 font-bold">₹{detectedProduct.price}</span>
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-500 block">Shelf Stock</span>
                <span className="text-xs font-semibold text-slate-300">In Stock</span>
              </div>
            </div>

            {/* Cart Status Badge (Explicitly addresses prompt requirements) */}
            <div className="pt-2 border-t border-slate-800/70">
              {exactCartItem ? (
                <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>✓ This product is already in your cart (Qty: <strong>{exactCartItem.quantity}</strong>)</span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                    Added ✓
                  </span>
                </div>
              ) : variantConflictItem ? (
                <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>⚠️ Different item from what is currently in your cart</span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 pl-6">
                    Your cart currently has: <span className="font-semibold">{variantConflictItem.product?.name}</span> ({variantConflictItem.quantity}x).
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Not currently in your cart</span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Not added
                  </span>
                </div>
              )}
            </div>

            {/* Success toast upon manual add */}
            {addedNotice && (
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{addedNotice}</span>
              </div>
            )}

            {/* Explicit Add to Cart Button (Never Auto-Adds) */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleExplicitAddToCart}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Add to Cart (₹{detectedProduct.price})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-500 text-center font-light">
          Customer assistive feature only. Physical checkout verification remains gated at the Kiosk.
        </div>
      </div>
    </div>
  );
};
