import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Monitor,
  MapPin,
  QrCode,
  UserPlus,
  ArrowLeft,
  Smartphone,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Store,
  KeyRound,
  Mail,
  User,
  AlertCircle,
  Fingerprint,
  Camera,
  Scan,
  AlertTriangle,
  Lock,
  Unlock,
  Video,
  CreditCard,
  Check,
  Clock,
  Users,
  Barcode,
  PackageCheck,
  PackageX,
  FileText,
  CheckCheck,
  HelpCircle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { sessionService } from '../services/sessionService';
import { customerIdentityService } from '../services/customerIdentityService';
import { sessionSyncService } from '../services/sessionSyncService';
import { fetchDetectedLanOrigin } from '../services/sessionHandoffService';
import { employeeService } from '../services/employeeService';
import { qrService } from '../services/qrService';
import type { GeneratedQRCode } from '../services/qrService';
import { securityAgent } from '../services/securityAgent';
import {
  skuVerificationService,
  VerifiedItemProgress,
  KioskScanResult
} from '../services/skuVerificationService';
import { CameraQRScanner } from '../components/CameraQRScanner';
import { ProductBarcodeScanner } from '../components/ProductBarcodeScanner';
import { kioskService } from '../services/kioskService';
import { voiceService } from '../services/voiceService';
import { KioskJarvisActivationOrb } from '../components/KioskJarvisActivationOrb';
import {
  RemoteKioskStatus,
  Product,
  CartItem,
  Customer,
  ShoppingSession,
  CheckoutVerificationResult,
  ItemVerificationScanRecord,
  BarcodeResolutionResult
} from '../types';

type KioskScreen =
  | 'WELCOME'
  | 'SCAN_RETURNING'
  | 'SCAN_SESSION_FOR_CHECKOUT'
  | 'NEW_REGISTER_EMAIL'
  | 'NEW_REGISTER_OTP'
  | 'ACTIVE_SHOPPING'
  | 'VERIFICATION_STATION';

interface KioskPageProps {
  initialScreen?: KioskScreen;
  isCustomerEmbedded?: boolean;
}

export const KioskPage: React.FC<KioskPageProps> = ({ initialScreen, isCustomerEmbedded }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setRole, loginEmployeeQR, currentCustomer } = useApp();

  const isCustomerVerifyRoute = Boolean(isCustomerEmbedded || location.pathname === '/customer/verify');

  // Physical Kiosk Identity & Multi-Terminal Synchronization (COMPUTER 1, 2, 3)
  const [kioskId, setKioskId] = useState<string>(() => kioskService.resolveKioskId());
  const [remoteKioskStatus, setRemoteKioskStatus] = useState<RemoteKioskStatus>(() => {
    const id = kioskService.resolveKioskId();
    return id === 'KIOSK_03' ? 'STANDBY' : 'ACTIVE';
  });
  const [activationAnnouncement, setActivationAnnouncement] = useState<string>('Kiosk 3 is active. You can use it.');

  // Kiosk-specific active state (isolated to the physical terminal)
  const [screen, setScreen] = useState<KioskScreen>(() => {
    if (initialScreen) return initialScreen;
    if (isCustomerVerifyRoute) return 'VERIFICATION_STATION';
    return 'WELCOME';
  });
  const [kioskCustomer, setKioskCustomer] = useState<Customer | null>(() => currentCustomer || null);
  const [kioskSession, setKioskSession] = useState<ShoppingSession | null>(null);
  const [employeeAttendanceNotice, setEmployeeAttendanceNotice] = useState<string | null>(null);
  const [kioskCart, setKioskCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Prime browser audio on touch/click so speech synthesis speaks reliably
  const handlePrimeAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  };

  // Multi-Terminal Kiosk State Synchronization Listener
  useEffect(() => {
    const currentId = kioskService.resolveKioskId();
    setKioskId(currentId);

    const unsub = kioskService.subscribeKiosk(currentId, (state, isInitial) => {
      if (currentId === 'KIOSK_03') {
        if (state.status === 'ACTIVE') {
          // If transitioning from STANDBY or received fresh manager activation command
          if (remoteKioskStatus === 'STANDBY' || (!isInitial && state.activationEvent)) {
            setActivationAnnouncement(state.activationEvent?.message || 'Kiosk 3 is active. You can use it.');
            setRemoteKioskStatus('ACTIVATING');
          } else {
            setRemoteKioskStatus('ACTIVE');
          }
        } else if (state.status === 'STANDBY') {
          setRemoteKioskStatus('STANDBY');
          setScreen('WELCOME');
        }
      } else {
        setRemoteKioskStatus('ACTIVE');
      }
    });

    return unsub;
  }, []);

  // New Customer Form State on Kiosk
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpHint, setRegOtpHint] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Continue on Mobile Handoff Modal State
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffToken, setHandoffToken] = useState<string | null>(null);
  const [handoffQrUrl, setHandoffQrUrl] = useState<string | null>(null);
  const [handoffMobileUrl, setHandoffMobileUrl] = useState<string | null>(null);
  const [handoffSuccessNotice, setHandoffSuccessNotice] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [sharedCartRevision, setSharedCartRevision] = useState<number | null>(null);
  const sharedCartRevisionRef = useRef<number | null>(null);
  const handoffRouteRef = useRef<string>('');

  // --------------------------------------------------------------------------
  // VERIFICATION STATION / PHYSICAL CHECKOUT STATE
  // --------------------------------------------------------------------------
  const [verifiedSessionId, setVerifiedSessionId] = useState<string | null>(null);
  const [manualSessionInput, setManualSessionInput] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<CheckoutVerificationResult | null>(null);
  const [isVerifyingPhysical, setIsVerifyingPhysical] = useState<boolean>(false);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [demoPaymentQr, setDemoPaymentQr] = useState<GeneratedQRCode | null>(null);
  const demoCompletionLock = useRef(false);
  const [verificationScenario, setVerificationScenario] = useState<
    | 'SCENARIO_1_MATCH'
    | 'SCENARIO_2_PACK_SIZE_MISMATCH'
    | 'SCENARIO_3_MULTI_QTY'
    | 'SCENARIO_4_PARTIAL'
    | 'SCENARIO_5_UNREADABLE'
    | 'SCENARIO_6_VERBAL_CLAIM'
    | 'MATCH'
    | 'DISCREPANCY_EXTRA'
    | 'DISCREPANCY_SHORTAGE'
    | 'DISCREPANCY_UNAUTHORIZED'
  >('SCENARIO_1_MATCH');
  const [resolutionNotice, setResolutionNotice] = useState<string | null>(null);

  // Authoritative Packaged SKU / Barcode Verification State
  const [skuProgressItems, setSkuProgressItems] = useState<VerifiedItemProgress[]>([]);
  const [skuScanHistory, setSkuScanHistory] = useState<ItemVerificationScanRecord[]>([]);
  const [lastScanResult, setLastScanResult] = useState<KioskScanResult | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');
  const [verbalClaimNotice, setVerbalClaimNotice] = useState<string | null>(null);

  // Load catalog products
  const products = db.getProducts();
  const categories = ['All', 'Produce', 'Bakery', 'Dairy', 'Pantry'];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => {
        const cat = p.category_name || (p as any).category || '';
        return cat.toLowerCase() === selectedCategory.toLowerCase();
      });

  // Prefetch reachable local LAN IP for physical mobile QR scanning
  useEffect(() => {
    void fetchDetectedLanOrigin();
  }, []);

  // Check URL params or route for direct session verification routing (e.g. from customer Proceed to Checkout)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const handoff = params.get('handoff');
    const sid = params.get('session_id') || params.get('session') || (isCustomerVerifyRoute ? sessionService.getActiveSessionId() : null);
    const act = params.get('action');

    if (handoff && act === 'verify' && handoffRouteRef.current !== handoff) {
      handoffRouteRef.current = handoff;
      void sessionSyncService.load(handoff).then(shared => {
        if (!shared.customer) throw new Error('Customer profile could not be loaded.');
        db.importRemoteShoppingSession(shared.session as any, shared.customer);
        db.replaceCartFromServer(shared.session.session_id, shared.cart.items);
        setHandoffToken(shared.syncToken || handoff);
        sharedCartRevisionRef.current = shared.cart.revision;
        setSharedCartRevision(shared.cart.revision);
        setKioskCustomer(shared.customer);
        setKioskSession(shared.session as any);
        return handleIdentifySessionForVerification(shared.session.session_id);
      }).catch(error => {
        setHandoffError(error?.message || 'Session pass could not be resolved.');
      });
      return;
    }

    if (sid && (act === 'verify' || isCustomerVerifyRoute || sid.startsWith('USER') || sid.startsWith('SESS'))) {
      handleIdentifySessionForVerification(sid);
    }
  }, [location.search, isCustomerVerifyRoute]);

  // Subscribe to DB cart updates while a session is active
  useEffect(() => {
    const activeId = verifiedSessionId || kioskSession?.session_id;
    if (!activeId) return;

    const updateCart = () => {
      setKioskCart(db.getCart(activeId));
    };
    updateCart();
    const unsub = db.subscribe(updateCart);
    return unsub;
  }, [verifiedSessionId, kioskSession]);

  // Poll the shared backend revision while this kiosk session is paired with mobile.
  useEffect(() => {
    if (!handoffToken || !kioskSession || kioskSession.status !== 'active') return;
    let cancelled = false;
    const pullSharedCart = async () => {
      try {
        const identityToken = kioskCustomer?.customer_id ? db.getActiveCustomerIdentityToken(kioskCustomer.customer_id)?.secure_token : undefined;
        const shared = identityToken && kioskCustomer
          ? await sessionSyncService.loadOwned(kioskSession.session_id, kioskCustomer.customer_id, identityToken)
          : await sessionSyncService.load(handoffToken);
        if (cancelled || shared.session.session_id !== kioskSession.session_id) return;
        if (sharedCartRevisionRef.current === shared.cart.revision) return;
        const items = db.replaceCartFromServer(kioskSession.session_id, shared.cart.items);
        setKioskCart(items);
        sharedCartRevisionRef.current = shared.cart.revision;
        setSharedCartRevision(shared.cart.revision);
      } catch (error: any) {
        if (!cancelled) setHandoffError(error?.message || 'Shared cart refresh failed.');
      }
    };
    void pullSharedCart();
    const timer = window.setInterval(() => void pullSharedCart(), 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [handoffToken, kioskSession?.session_id, kioskSession?.status, kioskCustomer?.customer_id]);

  // --------------------------------------------------------------------------
  // QR SCANNER: RETURNING CUSTOMER, EMPLOYEE, OR SESSION QR
  // --------------------------------------------------------------------------
  const handleScanReturningSuccess = (token: string) => {
    try {
      // 1. Employee pass
      if (token.startsWith('GROCERAI_EMP_V1:') || token.includes('EMP-')) {
        const empRes = employeeService.validateEmployeeQR(token);
        if (empRes.valid && empRes.employee) {
          const nowStr = new Date().toTimeString().slice(0, 5);
          const att = employeeService.recordAttendance({
            employee_id: empRes.employee.employee_id,
            location: 'KIOSK-MAIN-ENTRANCE-01',
            status: 'PRESENT'
          });
          loginEmployeeQR(token);
          const notice = `Attendance recorded. Employee: ${empRes.employee.employee_id} (${empRes.employee.name}), Time: ${att.timestamp || nowStr}, Status: PRESENT`;
          setEmployeeAttendanceNotice(notice);
          setTimeout(() => {
            navigate('/employee/dashboard');
          }, 1800);
          return { success: true };
        } else {
          return { success: false, error: empRes.error || 'Employee verification failed. Invalid pass.' };
        }
      }

      // 2. Shopping Session pass for checkout
      const qrClass = qrService.decodeAndClassifyQR(token);
      if (qrClass.type === 'SESSION_HANDOFF' || token.startsWith('GROCERAI_SESS_V1:')) {
        const sid = qrClass.sessionId || token.split(':')[1];
        if (sid) {
          handleIdentifySessionForVerification(sid);
          return { success: true };
        }
      }

      // 3. Customer Identity QR
      const res = customerIdentityService.loginWithCustomerIdentityQR(token);
      if (res.success && res.customer && res.session) {
        setKioskCustomer(res.customer);
        setKioskSession(res.session);
        setKioskCart([]);
        setScreen('ACTIVE_SHOPPING');
        return { success: true };
      }
      return { success: false, error: res.error || 'QR could not be verified.' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'QR could not be verified.' };
    }
  };

  // --------------------------------------------------------------------------
  // VERIFICATION STATION FLOW: LOAD SESSION & REAL ITEM-BY-ITEM VERIFICATION
  // --------------------------------------------------------------------------
  const handleIdentifySessionForVerification = async (sessionIdToVerify: string) => {
    if (!sessionIdToVerify || !sessionIdToVerify.trim()) return;
    const cleanId = sessionIdToVerify.trim();

    setVerifiedSessionId(cleanId);
    sessionService.setActiveSession(cleanId);
    sessionService.setLifecycleStatus('KIOSK_IDENTIFIED', 'KIOSK-02', cleanId);

    const sess = db.getShoppingSession(cleanId);
    if (sess) {
      setKioskSession(sess);
      const cust = db.getCustomer(sess.customer_id);
      if (cust) setKioskCustomer(cust);
    }

    // Load the customer's actual cart items
    const items = db.getCart(cleanId);
    setKioskCart(items);
    setScreen('VERIFICATION_STATION');
    setDemoCompleted(false);
    setVerbalClaimNotice(null);
    setLastScanResult(null);

    // Initialize authoritative SKU verification service with REAL cart items
    const progress = skuVerificationService.initializeSession(cleanId);
    setSkuProgressItems([...progress]);
    setSkuScanHistory([...skuVerificationService.getSessionScanHistory(cleanId)]);

    // Check if cart is already fully verified
    const custId = sess?.customer_id || kioskCustomer?.customer_id || 'CUST-1001';
    if (items.length > 0 && skuVerificationService.isPaymentAllowed(cleanId)) {
      await markCheckoutVerificationPassed(cleanId);
    }
  };

  const markCheckoutVerificationPassed = async (targetSessionId: string) => {
    sessionService.setLifecycleStatus('VERIFICATION_PASSED', 'KIOSK-02', targetSessionId);
  };

  // Central Barcode Scan Pipeline (invoked by camera, barcode input, or cart chips)
  const handleScanBarcode = async (barcodeToScan: string) => {
    if (!verifiedSessionId || !barcodeToScan.trim()) return;
    const cleanBarcode = barcodeToScan.trim();
    setIsVerifyingPhysical(true);
    setVerbalClaimNotice(null);
    setResolutionNotice(null);

    try {
      const scanRes = skuVerificationService.verifyPhysicalBarcodeScan(verifiedSessionId, cleanBarcode);
      setLastScanResult(scanRes);
      setSkuProgressItems([...scanRes.items]);
      setSkuScanHistory([...skuVerificationService.getSessionScanHistory(verifiedSessionId)]);
      setManualBarcodeInput('');

      const custId = kioskCustomer?.customer_id || 'CUST-1001';

      if (scanRes.success && !scanRes.mismatch) {
        setResolutionNotice(`âœ… Barcode Scanned: ${scanRes.scannedProduct?.name || cleanBarcode} matched against cart SKU.`);

        // Synchronize Security Agent checkout observation
        const verifiedItems = scanRes.items
          .filter(i => i.verified_quantity > 0)
          .map(i => ({
            product_id: i.product_id,
            product_name: i.product_name,
            observed_quantity: i.verified_quantity,
            confidence: 0.99
          }));
        securityAgent.setPhysicalCheckoutObservation(verifiedSessionId, verifiedItems);
        const secRes = await securityAgent.verifyPhysicalCheckout(verifiedSessionId, custId);
        setVerificationResult(secRes);

        // Check if ALL cart items are now 100% verified
        if (skuVerificationService.isPaymentAllowed(verifiedSessionId)) {
          await markCheckoutVerificationPassed(verifiedSessionId);
        }
      } else if (scanRes.mismatch) {
        setResolutionNotice(`âš ï¸ Verification Alert: ${scanRes.alertMessage || 'Item mismatch detected.'}`);
        sessionService.setLifecycleStatus('MISMATCH_DETECTED', 'KIOSK-02', verifiedSessionId);
      }
    } catch (e) {
      console.error('Barcode verification error:', e);
    } finally {
      setIsVerifyingPhysical(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const verified = Boolean(verifiedSessionId && kioskCart.length > 0 && skuVerificationService.isPaymentAllowed(verifiedSessionId));
    if (!verified || !verifiedSessionId) {
      setDemoPaymentQr(null);
      return;
    }
    setDemoPaymentQr(null);
    void qrService.generateDemoPaymentQR(verifiedSessionId, total).then(qr => {
      if (!cancelled) setDemoPaymentQr(qr);
    }).catch(error => {
      console.error('Could not generate demo payment QR:', error);
      if (!cancelled) setResolutionNotice('Demo QR could not be generated. Please retry verification.');
    });
    return () => { cancelled = true; };
  }, [verifiedSessionId, skuProgressItems, kioskCart]);

  const handleScanBarcodeManual = handleScanBarcode;

  // Benign Customer Correction & Employee Override Handling
  const handleResolveDiscrepancyAndReverify = async (
    action: 'RE_SCAN' | 'ADD_ITEM_TO_CART' | 'RETURN_ITEM_TO_SHELF' | 'EMPLOYEE_OVERRIDE' | 'SWITCH_TO_SCANNED_SKU'
  ) => {
    if (!verifiedSessionId) return;
    setIsVerifyingPhysical(true);

    try {
      const custId = kioskCustomer?.customer_id || 'CUST-1001';

      if (action === 'RE_SCAN') {
        skuVerificationService.resetForRescan(verifiedSessionId);
        setLastScanResult(null);
        setVerbalClaimNotice(null);
        setSkuProgressItems([...skuVerificationService.getSessionProgress(verifiedSessionId)]);
        setResolutionNotice('Ready to re-scan. Please present the correct product barcode.');
      } else if (action === 'SWITCH_TO_SCANNED_SKU' && lastScanResult?.scannedProduct) {
        const prod = lastScanResult.scannedProduct;
        db.clearCart(verifiedSessionId);
        db.addToCart(prod, 1, verifiedSessionId);
        setKioskCart(db.getCart(verifiedSessionId));
        skuVerificationService.initializeSession(verifiedSessionId);
        const scanRes = skuVerificationService.verifyPhysicalBarcodeScan(verifiedSessionId, prod.barcode || '');
        setLastScanResult(scanRes);
        setSkuProgressItems([...scanRes.items]);
        setSkuScanHistory([...skuVerificationService.getSessionScanHistory(verifiedSessionId)]);
        if (skuVerificationService.isPaymentAllowed(verifiedSessionId)) {
          await markCheckoutVerificationPassed(verifiedSessionId);
        }
        setResolutionNotice(`Cart updated to ${prod.name} (${prod.pack_size || prod.weight_or_volume}). Verified!`);
      } else if (action === 'ADD_ITEM_TO_CART') {
        if (lastScanResult?.scannedProduct) {
          db.addToCart(lastScanResult.scannedProduct, 1, verifiedSessionId);
          setKioskCart(db.getCart(verifiedSessionId));
          skuVerificationService.initializeSession(verifiedSessionId);
        }
        await securityAgent.resolveCheckoutDiscrepancy({
          sessionId: verifiedSessionId,
          resolutionType: 'CORRECTED_CART',
          resolutionNote: 'Customer confirmed and added unbilled basket item to digital cart'
        });
        setResolutionNotice('Cart updated with missing item. Please scan remaining items.');
      } else if (action === 'RETURN_ITEM_TO_SHELF') {
        await securityAgent.resolveCheckoutDiscrepancy({
          sessionId: verifiedSessionId,
          resolutionType: 'RETURNED_ITEM',
          resolutionNote: 'Customer returned unpurchased physical item to shelf'
        });
        skuVerificationService.resetForRescan(verifiedSessionId);
        setLastScanResult(null);
        setVerbalClaimNotice(null);
        setSkuProgressItems([...skuVerificationService.getSessionProgress(verifiedSessionId)]);
        setResolutionNotice('Physical item returned to shelf. Please continue checkout.');
      } else if (action === 'EMPLOYEE_OVERRIDE') {
        await securityAgent.resolveCheckoutDiscrepancy({
          sessionId: verifiedSessionId,
          resolutionType: 'STAFF_VERIFIED',
          resolutionNote: 'Exit Verification Officer physically verified benign customer basket'
        });
        skuVerificationService.resetForRescan(verifiedSessionId);
        // Force complete remaining verification
        const items = skuVerificationService.getSessionProgress(verifiedSessionId);
        items.forEach(i => {
          i.verified_quantity = i.expected_quantity;
          i.remaining_quantity = 0;
          i.status = 'VERIFIED';
        });
        setSkuProgressItems([...items]);
        setLastScanResult(null);
        setVerbalClaimNotice(null);
        await markCheckoutVerificationPassed(verifiedSessionId);
        setResolutionNotice('Exit Verification Officer verified benign resolution. Payment unlocked!');
      }

      setTimeout(() => setResolutionNotice(null), 4000);
    } catch (e) {
      console.error('Error resolving discrepancy:', e);
    } finally {
      setIsVerifyingPhysical(false);
    }
  };

  // Demo completion is deliberately separate from payment, orders, and sales.
  const handleCompleteKioskDemo = async () => {
    if (!verifiedSessionId || !demoPaymentQr || demoCompletionLock.current || demoCompleted) return;
    demoCompletionLock.current = true;
    setPaymentProcessing(true);

    try {
      if (!db.completeDemoShoppingSession(verifiedSessionId)) return;
      setDemoCompleted(true);
      const customerId = kioskCustomer?.customer_id || db.getShoppingSession(verifiedSessionId)?.customer_id;
      const voiceEnabled = customerId ? db.getCustomerPreferences(customerId)?.voice_enabled !== false : true;
      if (voiceEnabled) {
        void voiceService.speak('Payment Confirmed. Thank you for shopping with GrocerAI! We look forward to seeing you again.', 'en', verifiedSessionId);
      }
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (e: any) {
      console.error('Failed to complete demo shopping session:', e);
      demoCompletionLock.current = false;
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleResetKioskForNextCustomer = () => {
    setScreen('WELCOME');
    setVerifiedSessionId(null);
    setVerificationResult(null);
    setDemoCompleted(false);
    setDemoPaymentQr(null);
    demoCompletionLock.current = false;
    setKioskCustomer(null);
    setKioskSession(null);
    setKioskCart([]);
    setSkuProgressItems([]);
    setSkuScanHistory([]);
    setLastScanResult(null);
    setVerbalClaimNotice(null);
    sessionService.clearActiveSession();
  };

  // --------------------------------------------------------------------------
  // NEW CUSTOMER HANDLERS ON KIOSK
  // --------------------------------------------------------------------------
  const handleRequestKioskOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setRegError('Please enter a valid email address.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await customerIdentityService.requestOTP(cleanEmail);
      setRegLoading(false);
      if (!res.success) {
        setRegError(res.message);
        return;
      }
      setRegOtp('');
      setScreen('NEW_REGISTER_OTP');
    } catch (err: any) {
      setRegLoading(false);
      setRegError(err?.message || 'Failed to dispatch verification OTP');
    }
  };

  const handleVerifyKioskOTPAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanOtp = regOtp.trim();

    if (cleanOtp.length < 6) {
      setRegError('Please enter 6-digit OTP code.');
      return;
    }

    setRegLoading(true);
    const verifyRes = await customerIdentityService.verifyOTP(cleanEmail, cleanOtp);
    if (!verifyRes.valid) {
      setRegLoading(false);
      setRegError(verifyRes.error || 'Invalid OTP code.');
      return;
    }

    let reg: Awaited<ReturnType<typeof customerIdentityService.registerNewCustomer>>;
    try {
      reg = await customerIdentityService.registerNewCustomer({
        email: cleanEmail,
        name: regName.trim() || 'Shopper',
        language: 'en'
      });
    } catch (err: any) {
      setRegLoading(false);
      setRegError(err?.message || 'Registration could not be saved.');
      return;
    }

    setRegLoading(false);
    if (reg.customer && reg.session) {
      setKioskCustomer(reg.customer);
      setKioskSession(reg.session);
      setKioskCart([]);
      setScreen('ACTIVE_SHOPPING');
    } else {
      setRegError('Registration failed.');
    }
  };

  const syncKioskCart = async (sessionId: string) => {
    if (!handoffToken || sharedCartRevisionRef.current === null) return;
    try {
      const identityToken = kioskCustomer?.customer_id ? db.getActiveCustomerIdentityToken(kioskCustomer.customer_id)?.secure_token : undefined;
      const result: any = identityToken && kioskCustomer
        ? await sessionSyncService.saveOwnedCart(sessionId, kioskCustomer.customer_id, identityToken, sharedCartRevisionRef.current, db.getCart(sessionId))
        : await sessionSyncService.saveCart(handoffToken, sharedCartRevisionRef.current, db.getCart(sessionId));
      if (!result.success && result.conflict && result.cart) {
        const latest = db.replaceCartFromServer(sessionId, result.cart.items);
        setKioskCart(latest);
        sharedCartRevisionRef.current = result.cart.revision;
        setSharedCartRevision(result.cart.revision);
        setHandoffError('Another device changed the cart. The latest shared cart has been loaded; please retry your change.');
        return;
      }
      sharedCartRevisionRef.current = result.cart.revision;
      setSharedCartRevision(result.cart.revision);
      setHandoffError(null);
    } catch (error: any) {
      setHandoffError(error?.message || 'Could not save the shared cart.');
    }
  };

  const handleAddToCart = async (product: Product) => {
    let sid = kioskSession?.session_id;
    if (!sid) {
      if (kioskCustomer) {
        const { session } = db.createShoppingSession(kioskCustomer.customer_id, 'KIOSK');
        setKioskSession(session);
        sid = session.session_id;
      } else {
        const { session } = db.createShoppingSession('CUST-1001', 'KIOSK');
        const customer = db.getCustomer('CUST-1001') || null;
        setKioskSession(session);
        setKioskCustomer(customer);
        sid = session.session_id;
      }
    }
    try {
      db.addToCart(product, 1, sid);
      setKioskCart([...db.getCart(sid)]);
      await syncKioskCart(sid);
    } catch (err: any) {
      console.warn('Failed to add to cart:', err);
    }
  };

  const handleUpdateQuantity = async (cartItemId: string, delta: number) => {
    const sid = kioskSession?.session_id;
    if (!sid) return;
    try {
      db.updateCartItemQuantity(cartItemId, delta, sid);
      setKioskCart([...db.getCart(sid)]);
      await syncKioskCart(sid);
    } catch (err: any) {
      console.warn('Failed to update cart quantity:', err);
    }
  };

  const handleEndKioskSession = () => {
    if (kioskSession) {
      db.completeShoppingSession(kioskSession.session_id);
    }
    setKioskCustomer(null);
    setKioskSession(null);
    setKioskCart([]);
    setScreen('WELCOME');
  };

  const handleStartContinueOnMobile = async () => {
    if (!kioskSession || !kioskCustomer) return;
    setHandoffError(null);
    try {
      const identityToken = db.getActiveCustomerIdentityToken(kioskCustomer.customer_id)?.secure_token;
      if (!identityToken) throw new Error('Verified customer identity token is unavailable. Sign in again before switching devices.');
      const generated = await sessionSyncService.createHandoff({
        sessionId: kioskSession.session_id,
        customerId: kioskCustomer.customer_id,
        identityToken,
        cart: db.getCart(kioskSession.session_id),
        clientOrigin: await fetchDetectedLanOrigin()
      });
      if (!generated.handoff?.secure_token || !generated.mobileUrl) {
        throw new Error('The server did not return a secure session pass. Check Supabase session-sync configuration and retry.');
      }
      const qrUrl = new URL(generated.mobileUrl);
      if (qrUrl.searchParams.get('session_token') !== generated.handoff.secure_token ||
          (qrUrl.searchParams.get('session_id') && qrUrl.searchParams.get('session_id') !== kioskSession.session_id)) {
        throw new Error('The session QR URL does not match the active session. Please retry.');
      }
      db.replaceCartFromServer(kioskSession.session_id, generated.cart.items);
      setKioskCart(db.getCart(kioskSession.session_id));
      sharedCartRevisionRef.current = generated.cart.revision;
      setSharedCartRevision(generated.cart.revision);
      setHandoffToken(generated.handoff.secure_token);
      setHandoffMobileUrl(generated.mobileUrl);
      setHandoffOpen(true);

      qrService.generateSessionQR({ ...generated.handoff, qr_payload: qrUrl.toString() })
        .then(res => {
          setHandoffQrUrl(res.dataUrl);
        })
        .catch(err => {
          console.warn('Failed to generate session QR:', err);
        });
    } catch (err) {
      console.error('Error starting mobile handoff:', err);
      setHandoffError((err as any)?.message || 'Could not create a shared session QR. Check Supabase and the session migration.');
    }
  };

  const handleSimulateMobileScan = () => {
    if (!handoffMobileUrl) return;
    window.open(handoffMobileUrl, '_blank');
  };

  const authCartCalc = db.calculateAuthoritativeCartTotal(verifiedSessionId || kioskSession?.session_id || 'DEFAULT');
  const subtotal = authCartCalc.subtotal;
  const gst = authCartCalc.tax;
  const total = authCartCalc.total;

  // -------------------------------------------------------------------------
  // 1. DORMANT / STANDBY SCREEN FOR KIOSK 3 (UNTIL MANAGER VOICE ACTIVATION)
  // -------------------------------------------------------------------------
  if (kioskId === 'KIOSK_03' && remoteKioskStatus === 'STANDBY') {
    return (
      <div
        onClick={handlePrimeAudio}
        className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none cursor-pointer"
        title="Terminal in Standby â€¢ Click anywhere to prime voice audio"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header HUD */}
        <header className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-500 pb-6 border-b border-slate-900">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 animate-pulse shadow-sm shadow-amber-400/50" />
            <span className="tracking-wider uppercase text-slate-400 font-bold">TERMINAL STANDBY MODE</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Branch #104</span>
            <span>â€¢</span>
            <span className="text-cyan-400/80">Bus Connected</span>
          </div>
        </header>

        {/* Center Minimal Standby Screen per Requirement 2 */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center space-y-6 my-auto max-w-md mx-auto">
          <div className="w-24 h-24 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-slate-400 shadow-2xl">
            <Monitor className="w-12 h-12 stroke-[1.25] text-slate-500" />
          </div>

          <div className="space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-mono font-bold tracking-widest uppercase">
              KIOSK 03
            </span>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
              Standby
            </h1>
            <p className="text-slate-400 text-sm sm:text-base font-light">
              Waiting for activation...
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-2 text-xs font-mono text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Listening for Manager Spoken Authorization</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Terminal will activate automatically when the Store Manager requests activation by voice.
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 pt-6 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-600">
          <span>GrocerAI Multi-Terminal Network</span>
          <span>Verification Kiosk #03</span>
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. ACTIVATING SCREEN: VOICE ANNOUNCEMENT (SECTION 8)
  // -------------------------------------------------------------------------
  if (remoteKioskStatus === 'ACTIVATING') {
    return (
      <KioskJarvisActivationOrb
        kioskNumber={3}
        message={activationAnnouncement}
        onComplete={() => {
          setRemoteKioskStatus('ACTIVE');
          setScreen('WELCOME');
        }}
      />
    );
  }

  const kioskNum = kioskId.replace('KIOSK_', '');
  const kioskBadgeText =
    screen === 'VERIFICATION_STATION'
      ? `Checkout Verification Station #${kioskNum}`
      : `Self-Service Terminal #${kioskNum}`;

  if (demoCompleted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-5">
        <CheckCircle2 className="h-20 w-20 text-emerald-400" />
        <h1 className="text-4xl font-black">Payment Successful</h1>
        <p className="text-xl font-semibold">Thank you for shopping with GrocerAI!</p>
        <p className="text-base text-slate-300">Please visit again.</p>
        <p className="text-xs text-slate-500">Demo only. No real payment was taken.</p>
        <button
          onClick={handleResetKioskForNextCustomer}
          className="mt-3 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition-colors hover:bg-emerald-400"
        >
          Start New Shopping Session
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between p-4 sm:p-8">
      {/* ===================================================================== */}
      {/* KIOSK HEADER â€” LARGE PHYSICAL TERMINAL BRANDING */}
      {/* ===================================================================== */}
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Monitor className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                {kioskBadgeText}
              </span>
              <span className="text-xs text-slate-500">Live â€¢ Branch #104</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Grocer<span className="text-emerald-400">AI</span> In-Store Kiosk
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {screen === 'VERIFICATION_STATION' && (
            <button
              onClick={handleResetKioskForNextCustomer}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Kiosk</span>
            </button>
          )}

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Kiosk Mode</span>
          </Link>
        </div>
      </header>

      {/* Global Success / Handoff Banner Notification */}
      {handoffSuccessNotice && (
        <div className="my-4 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-center text-sm font-semibold flex items-center justify-center gap-2 animate-bounce-subtle">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{handoffSuccessNotice}</span>
        </div>
      )}

      {resolutionNotice && (
        <div className="my-3 p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-center text-xs font-semibold flex items-center justify-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{resolutionNotice}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SCREEN 1: KIOSK AVAILABLE / WELCOME SCREEN */}
      {/* ===================================================================== */}
      {screen === 'WELCOME' && (
        <main className="flex-1 flex flex-col items-center justify-center py-10 px-4 max-w-5xl mx-auto w-full text-center space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>Smart Store Entry & Verification Hub</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Welcome to GrocerAI In-Store Terminal
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto font-light">
              Start shopping on this kiosk, scan your customer pass, or verify an active mobile shopping session.
            </p>
          </div>

          {/* 3 Primary Touch Options: Returning, New, and Checkout Verification */}
          <div className="w-full max-w-3xl space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              {/* RETURNING CUSTOMER BUTTON */}
              <button
                onClick={() => setScreen('SCAN_RETURNING')}
                className="p-6 rounded-3xl bg-slate-900/90 hover:bg-slate-800/90 border-2 border-slate-800 hover:border-emerald-500/60 shadow-xl transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group hover:scale-[1.02]"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                    RETURNING CUSTOMER
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Scan Customer Identity QR
                  </p>
                </div>
              </button>

              {/* NEW CUSTOMER BUTTON */}
              <button
                onClick={() => setScreen('NEW_REGISTER_EMAIL')}
                className="p-6 rounded-3xl bg-slate-900/90 hover:bg-slate-800/90 border-2 border-slate-800 hover:border-cyan-500/60 shadow-xl transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group hover:scale-[1.02]"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                  <UserPlus className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors">
                    NEW CUSTOMER
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Register in 30 seconds
                  </p>
                </div>
              </button>

              {/* CHECKOUT VERIFICATION STATION BUTTON (NEW PRIMARY FEATURE) */}
              <button
                onClick={() => setScreen('SCAN_SESSION_FOR_CHECKOUT')}
                className="p-6 rounded-3xl bg-emerald-950/40 hover:bg-emerald-900/40 border-2 border-emerald-500/50 hover:border-emerald-400 shadow-xl shadow-emerald-500/10 transition-all flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group hover:scale-[1.02]"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-slate-950 transition-all">
                  <Scan className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-300 group-hover:text-white transition-colors">
                    VERIFY & CHECKOUT
                  </h3>
                  <p className="text-xs text-emerald-400/90 mt-1 font-medium">
                    Scan mobile session pass & pay
                  </p>
                </div>
              </button>
            </div>

            {/* Quick manual session test bar */}
            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Simulate mobile session arriving at kiosk:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter Session ID e.g. USER00001"
                  value={manualSessionInput}
                  onChange={(e) => setManualSessionInput(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleIdentifySessionForVerification(manualSessionInput || sessionService.getActiveSessionId() || 'USER00001')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Verify Session
                </button>
              </div>
            </div>

            {/* Operational Login Links */}
            <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/employee/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 hover:text-white text-xs font-semibold transition-all shadow-md group hover:border-amber-400/50"
              >
                <Fingerprint className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Employee Attendance & Console â†’</span>
              </Link>
              <Link
                to="/manager/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold transition-all shadow-md group hover:border-blue-400/50"
              >
                <Store className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Manager Login â†’</span>
              </Link>
            </div>
          </div>
        </main>
      )}

      {/* ===================================================================== */}
      {/* SCREEN 2: SCAN RETURNING CUSTOMER OR EMPLOYEE PASS */}
      {/* ===================================================================== */}
      {screen === 'SCAN_RETURNING' && (
        <main className="flex-1 flex flex-col items-center justify-center py-6 px-4 max-w-2xl mx-auto w-full">
          <CameraQRScanner
            title="Scan Customer Identity QR"
            subtitle="Hold your permanent Customer QR or Employee Pass in front of the kiosk camera"
            onScanSuccess={handleScanReturningSuccess}
            onSwitchToNewCustomer={() => setScreen('NEW_REGISTER_EMAIL')}
            onClose={() => setScreen('WELCOME')}
            isKioskMode={true}
          />
        </main>
      )}

      {/* ===================================================================== */}
      {/* SCREEN 2B: SCAN SESSION QR FOR CHECKOUT VERIFICATION */}
      {/* ===================================================================== */}
      {screen === 'SCAN_SESSION_FOR_CHECKOUT' && (
        <main className="flex-1 flex flex-col items-center justify-center py-6 px-4 max-w-2xl mx-auto w-full">
          <CameraQRScanner
            title="Scan Mobile Shopping Session Pass"
            subtitle="Point your phone's Shopping Session QR towards the kiosk optical scanner to load your cart"
            onScanSuccess={(token) => {
              const decoded = qrService.decodeAndClassifyQR(token);
              const sid = decoded.sessionId || (token.includes(':') ? token.split(':')[1] : token);
              if (sid) {
                handleIdentifySessionForVerification(sid);
                return { success: true };
              }
              return { success: false, error: 'Could not resolve shopping session pass.' };
            }}
            onSwitchToNewCustomer={() => setScreen('NEW_REGISTER_EMAIL')}
            onClose={() => setScreen('WELCOME')}
            isKioskMode={true}
          />
        </main>
      )}

      {/* SCREEN 3: NEW CUSTOMER REGISTRATION */}
      {screen === 'NEW_REGISTER_EMAIL' && (
        <main className="flex-1 flex flex-col items-center justify-center py-8 px-4 max-w-lg mx-auto w-full">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                New Customer Registration
              </h2>
              <p className="text-xs text-slate-400">
                Enter your email address to receive your permanent Customer Identity QR.
              </p>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRequestKioskOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScreen('WELCOME')}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {regLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* SCREEN 3b: NEW CUSTOMER OTP */}
      {screen === 'NEW_REGISTER_OTP' && (
        <main className="flex-1 flex flex-col items-center justify-center py-8 px-4 max-w-lg mx-auto w-full">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Enter Verification OTP
              </h2>
              <p className="text-xs text-slate-400">
                Dispatched to <span className="text-emerald-400 font-mono">{regEmail}</span>
              </p>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                OTP Dispatched to Email
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                A 6-digit verification code was dispatched to <strong className="text-white font-mono">{regEmail}</strong>. Please check your email inbox and enter the code below.
              </p>
            </div>

            <form onSubmit={handleVerifyKioskOTPAndRegister} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScreen('NEW_REGISTER_EMAIL')}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={regLoading || regOtp.length < 6}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {regLoading ? 'Verifying...' : 'Verify & Start Shopping'}
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* ===================================================================== */}
      {/* SCREEN 4: ACTIVE KIOSK SHOPPING TERMINAL */}
      {/* ===================================================================== */}
      {screen === 'ACTIVE_SHOPPING' && kioskCustomer && kioskSession && (
        <main className="flex-1 flex flex-col gap-6 py-4 w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">{kioskCustomer.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {kioskCustomer.customer_id}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Active Session: <span className="font-mono text-emerald-400">{kioskSession.session_id}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleStartContinueOnMobile}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer group"
              >
                <Smartphone className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                <span>CONTINUE ON MOBILE</span>
              </button>

              <button
                onClick={handleEndKioskSession}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:border-rose-500/40 border border-slate-700 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                End Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            <div className="lg:col-span-8 flex flex-col space-y-4">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <Link
                  to="/customer/map"
                  target="_blank"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-emerald-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 shrink-0 transition-colors shadow-sm ml-auto"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Digital Store Map</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 overflow-y-auto max-h-[520px] pr-1">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-3 transition-all shadow-md group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">
                          {prod.category_name || (prod as any).category || 'Item'}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          â‚¹{prod.price}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white mt-1 group-hover:text-emerald-300 transition-colors">
                        {prod.name}
                      </h4>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300/90 font-medium truncate">{prod.aisle}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(prod)}
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">Live Kiosk Cart</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {kioskCart.reduce((sum, i) => sum + i.quantity, 0)} items
                  </span>
                </div>

                <div className="space-y-2 mt-3 max-h-72 overflow-y-auto pr-1">
                  {kioskCart.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10 font-light">
                      Cart is currently empty. Tap products on the left to add items.
                    </p>
                  ) : (
                    kioskCart.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {item.product?.name || item.product_id}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            â‚¹{item.product?.price} Ã— {item.quantity} = â‚¹{(item.product?.price || 0) * item.quantity}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold px-1.5 text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>â‚¹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (5%):</span>
                    <span>â‚¹{gst}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-white pt-1 border-t border-slate-800/60">
                    <span>Total Amount:</span>
                    <span className="text-emerald-400">â‚¹{total}</span>
                  </div>
                </div>

                <button
                  onClick={handleStartContinueOnMobile}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Smartphone className="w-4 h-4 text-slate-950" />
                  <span>CONTINUE ON MOBILE (HANDOFF)</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ===================================================================== */}
      {/* SCREEN 5: CHECKOUT VERIFICATION STATION (CRITICAL PRODUCT FLOW) */}
      {/* ===================================================================== */}
      {screen === 'VERIFICATION_STATION' && (
        !verifiedSessionId ? (
          <main className="flex-1 flex flex-col items-center justify-center py-6 px-4 max-w-2xl mx-auto w-full space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>In-Store Kiosk Verification Station</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Scan Mobile Shopping Session Pass
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                Hold your phone's Shopping Session QR code towards the optical scanner to load your cart for physical SKU verification.
              </p>
            </div>

            <CameraQRScanner
              title="Optical Session Pass Scanner"
              subtitle="Align your phone's Shopping Session QR within the frame"
              onScanSuccess={async (token) => {
                const handoffToken = sessionSyncService.extractToken(token);
                if (handoffToken.length >= 40) {
                  try {
                    const shared = await sessionSyncService.load(handoffToken);
                    if (!shared.customer) return { success: false, error: 'Customer profile could not be loaded from the shared session.' };
                    db.importRemoteShoppingSession(shared.session as any, shared.customer);
                    const items = db.replaceCartFromServer(shared.session.session_id, shared.cart.items);
                    setKioskCustomer(shared.customer);
                    setKioskSession(shared.session as any);
                    setKioskCart(items);
                    setHandoffToken(handoffToken);
                    sharedCartRevisionRef.current = shared.cart.revision;
                    setSharedCartRevision(shared.cart.revision);
                    await handleIdentifySessionForVerification(shared.session.session_id);
                    return { success: true };
                  } catch (error: any) {
                    return { success: false, error: error?.message || 'Shared session pass could not be resolved.' };
                  }
                }
                const decoded = qrService.decodeAndClassifyQR(token);
                const sid = decoded.sessionId || (token.includes(':') ? token.split(':')[1] : token);
                if (sid) {
                  handleIdentifySessionForVerification(sid);
                  return { success: true };
                }
                return { success: false, error: 'Session QR could not be decoded.' };
              }}
              onSwitchToNewCustomer={() => navigate('/')}
              onClose={() => navigate('/customer/products')}
              isKioskMode={true}
            />

            {/* Quick-load active session from current customer browser */}
            {sessionService.getActiveSessionId() && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 w-full flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-xs font-bold text-white block">Active Shopping Session Detected</span>
                  <span className="text-[11px] font-mono text-emerald-400 block">{sessionService.getActiveSessionId()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleIdentifySessionForVerification(sessionService.getActiveSessionId()!)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Load Cart & Verify
                </button>
              </div>
            )}
          </main>
        ) : (
          <main className="flex-1 flex flex-col gap-6 py-4 w-full">
            {/* Top Session Ribbon */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
              {isCustomerVerifyRoute ? (
                <button
                  type="button"
                  onClick={() => navigate('/customer/products')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Back to Store Products"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Store</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setScreen('WELCOME');
                    setVerifiedSessionId(null);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Back to Welcome Screen"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">
                    {kioskCustomer?.name || 'Customer Active Session'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/30">
                    Session: {verifiedSessionId}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Verification Station â€¢ Authoritative Packaged SKU & Barcode Identity Engine
                </p>
              </div>
            </div>

            {/* Real-time Verification Status Counter & Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold ${skuVerificationService.isPaymentAllowed(verifiedSessionId!) ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {skuVerificationService.isPaymentAllowed(verifiedSessionId!)
                    ? '100% SKU MATCH âœ“'
                    : `${skuProgressItems.filter(i => i.remaining_quantity === 0).length} of ${skuProgressItems.length} SKUs Verified`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerifiedSessionId(null);
                  setScreen('SCAN_SESSION_FOR_CHECKOUT');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Switch Session Pass
              </button>
            </div>
          </div>

          {/* Resolution Notification Toast */}
          {resolutionNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resolutionNotice}</span>
            </div>
          )}

          {/* If completed order exists: render completed receipt */}
          {demoCompleted ? (
            <div className="min-h-[55vh] flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
              <CheckCircle2 className="w-20 h-20 text-emerald-400" />
              <h2 className="text-4xl font-black text-white">Payment Successful</h2>
              <p className="text-xl font-semibold text-slate-100">Thank you for shopping with GrocerAI!</p>
              <p className="text-base text-slate-300">Please visit again.</p>
              <p className="text-xs text-slate-500">Demo only. No real payment was taken.</p>
              <button
                onClick={handleResetKioskForNextCustomer}
                className="mt-3 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition-colors hover:bg-emerald-400"
              >
                Start New Shopping Session
              </button>
            </div>
          ) : (
            /* Split Panes: Left = Barcode Presentation & SKU Checklist, Right = Payment Gate */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
              {/* Left Column (7 cols): Barcode Scanner & SKU Item-by-Item Status */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                {/* Section A: Live Camera Barcode Scanner */}
                <ProductBarcodeScanner
                  onScan={handleScanBarcode}
                  isActive={!demoCompleted}
                  title="Optical Camera Barcode & SKU Scanner"
                  subtitle="Hold packaged item barcode steadily in front of the camera"
                />

                {/* Section B: Manual Barcode Input & Cart Item Presentation Chips */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Barcode className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-sm text-white">Manual & Cart Barcode Presenter</h3>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">
                      Laser Scanner & Optical Sensor Active
                    </span>
                  </div>

                  {/* Manual Barcode Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Type barcode or scan with handheld scanner gun..."
                        value={manualBarcodeInput}
                        onChange={e => setManualBarcodeInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleScanBarcode(manualBarcodeInput);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScanBarcode(manualBarcodeInput)}
                      disabled={isVerifyingPhysical || !manualBarcodeInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <Scan className="w-3.5 h-3.5 text-slate-950" />
                      <span>Verify Barcode</span>
                    </button>
                  </div>

                  {/* Products in This Active Session's Cart (Dynamic Optical Simulation Chips) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                        Products in This Session's Cart:
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {kioskCart.length} Unique Cart Items
                      </span>
                    </div>

                    {kioskCart.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {kioskCart.map((cartIt, idx) => {
                          const prod = cartIt.product || db.getProductById(cartIt.product_id);
                          const pItem = skuProgressItems.find(i => i.product_id === cartIt.product_id);
                          const isDone = pItem ? pItem.remaining_quantity === 0 : false;
                          const verifiedQty = pItem ? pItem.verified_quantity : 0;
                          const expectedQty = pItem ? pItem.expected_quantity : cartIt.quantity;

                          return (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                                isDone
                                  ? 'bg-emerald-950/20 border-emerald-500/40'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {prod?.image_url && (
                                  <img
                                    src={prod.image_url}
                                    alt={prod.name}
                                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-800"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-white truncate">{prod?.name || cartIt.product_id}</p>
                                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                    <span>Barcode: <strong className="text-emerald-300">{prod?.barcode || 'N/A'}</strong></span>
                                    <span>â€¢</span>
                                    <span className={isDone ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                      {verifiedQty}/{expectedQty}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleScanBarcode(prod?.barcode || '')}
                                disabled={isVerifyingPhysical}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                                  isDone
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                                }`}
                                title={`Simulate scanning barcode for ${prod?.name}`}
                              >
                                <Scan className="w-3 h-3" />
                                <span>{isDone ? 'Verified âœ“' : 'Scan'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                        Your cart is empty. Add products from the store or scan an item barcode below to begin.
                      </div>
                    )}
                  </div>

                  {/* Discrepancy Testing Tools */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      Test Discrepancy Scenarios:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleScanBarcode('8901262010012')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-mono text-[10px] cursor-pointer"
                      title="Test scanning Cheese 100g when customer intended 200g (Pack size mismatch)"
                    >
                      Pack Size Mismatch (100g vs 200g)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScanBarcode('8906007280014')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[10px] cursor-pointer"
                      title="Test scanning Sunflower Oil when not in cart (Unbilled item)"
                    >
                      Unbilled Item (Oil 1L)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScanBarcode('UNREADABLE')}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-rose-950/40 border border-rose-500/30 text-rose-300 font-mono text-[10px] cursor-pointer"
                      title="Simulate unreadable/damaged barcode"
                    >
                      Damaged Barcode
                    </button>
                  </div>
                </div>

                {/* Section B: Pre-Packaged SKU Checklist (Item-by-Item Status) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-sm text-white">Digital Cart vs Authoritative Physical SKUs</h3>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">
                      {skuProgressItems.filter(i => i.remaining_quantity === 0).length}/{skuProgressItems.length} Cart SKUs Verified
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    GrocerAI Packaged Model: Every product is a pre-packaged, fixed-size SKU. Physical barcode identity (<code className="text-emerald-300">EAN-13 â†’ SKU</code>) is the sole authoritative proof of pack size and price.
                  </p>

                  {/* Checklist items */}
                  <div className="space-y-2.5 pt-1">
                    {skuProgressItems.length > 0 ? (
                      skuProgressItems.map((item, idx) => {
                        const isFullyVerified = item.remaining_quantity === 0;
                        const isPartial = item.verified_quantity > 0 && !isFullyVerified;
                        const isMismatch = item.status === 'MISMATCH';

                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isFullyVerified
                                ? 'bg-slate-950 border-emerald-500/40'
                                : isMismatch
                                ? 'bg-amber-950/25 border-amber-500/50'
                                : isPartial
                                ? 'bg-amber-950/15 border-amber-500/30'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-white text-xs">{item.product_name}</h4>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                    SKU: <strong className="text-emerald-400">{item.sku_id}</strong>
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                    Pack Size: <strong className="text-white">{item.pack_size}</strong>
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                    Barcode: {item.barcode}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                                  <span>
                                    Expected: <strong className="text-white font-mono">{item.expected_quantity}</strong>
                                  </span>
                                  <span>
                                    Verified: <strong className="text-emerald-400 font-mono">{item.verified_quantity}</strong>
                                  </span>
                                  <span>
                                    Remaining:{' '}
                                    <strong
                                      className={`font-mono ${
                                        item.remaining_quantity > 0 ? 'text-amber-400' : 'text-slate-400'
                                      }`}
                                    >
                                      {item.remaining_quantity}
                                    </strong>
                                  </span>
                                  <span>
                                    Unit Price: <strong className="text-white">â‚¹{item.unit_price}</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                  isFullyVerified
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : isMismatch
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : isPartial
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {isFullyVerified
                                  ? 'VERIFIED 100% âœ“'
                                  : isMismatch
                                  ? 'MISMATCH âš ï¸'
                                  : isPartial
                                  ? `PARTIAL (${item.verified_quantity}/${item.expected_quantity})`
                                  : 'PENDING SCAN'}
                              </span>
                            </div>

                            {/* Discrepancy Note banner if pack size differs */}
                            {item.discrepancy_note && (
                              <div className="mt-2.5 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px]">
                                {item.discrepancy_note}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        No cart items loaded for verification.
                      </p>
                    )}
                  </div>
                </div>



                {/* Section D: Recent Barcode Scans Audit Log */}
                {skuScanHistory.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-bold text-xs text-white">Physical Barcode Scan Audit Log</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {skuScanHistory.length} Scans Logged
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {skuScanHistory.slice().reverse().map((rec, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-mono"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-400 block">{rec.timestamp} â€¢ Barcode: <strong className="text-white">{rec.scanned_barcode}</strong></span>
                            <span className="text-slate-300 block truncate">{rec.message}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              rec.match
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {rec.match ? 'MATCH âœ“' : 'MISMATCH âœ•'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Verification Gate & Payment QR */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                {/* Scenario 6 Policy Alert: Verbal Claim Override Attempt */}
                {verbalClaimNotice && (
                  <div className="bg-purple-950/40 border border-purple-500/50 rounded-3xl p-5 shadow-2xl space-y-3 animate-fade-in text-xs">
                    <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider text-[11px]">
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <span>Verbal Claim Policy Triggered</span>
                    </div>
                    <pre className="text-purple-200 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                      {verbalClaimNotice}
                    </pre>
                  </div>
                )}

                {/* Gate: Demo QR unlocks only after every cart SKU is verified. */}
                {kioskCart.length > 0 && skuVerificationService.isPaymentAllowed(verifiedSessionId!) ? (
                  <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in">
                    <div className="text-center space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All Packaged SKUs Verified</span>
                      </div>
                      <h3 className="text-xl font-black text-white">
                        Demo Payment
                      </h3>
                      <p className="text-xs text-slate-400">
                        Simulated checkout only. No real payment provider is connected and no money will be transferred.
                      </p>
                    </div>

                    <div className="text-center space-y-1">
                      <span className="text-2xl font-black text-white block">
                        â‚¹{total}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Subtotal: â‚¹{subtotal} â€¢ GST: â‚¹{gst}
                      </span>
                    </div>

                    <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-lg" aria-label="Demo Payment QR code">
                      {demoPaymentQr ? (
                        <img src={demoPaymentQr.dataUrl} alt="Scannable Demo Payment QR" className="h-48 w-48" />
                      ) : (
                        <div className="h-48 w-48 flex items-center justify-center text-center text-xs text-slate-600">Preparing demo QR…</div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">Demo Payment QR · Scanning this code does not initiate a payment.</p>

                    <button
                      type="button"
                      onClick={handleCompleteKioskDemo}
                      disabled={paymentProcessing || !demoPaymentQr}
                      className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>{paymentProcessing ? 'Completing demo…' : 'Done'}</span>
                    </button>

                    <p className="text-[10px] text-slate-500 text-center font-light">
                      Demo only: no paid transaction, sales record, or inventory movement is created.
                    </p>
                  </div>
                ) : (
                  /* Mismatch Warning & Benign Resolution Panel */
                  <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in">
                    <div className="text-center space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Barcode Verification Required</span>
                      </div>
                      <h3 className="text-lg font-black text-white">
                        {lastScanResult?.mismatchType === 'PACK_SIZE_MISMATCH'
                          ? 'Pack Size Mismatch Detected'
                          : lastScanResult?.mismatchType === 'BARCODE_UNREADABLE'
                          ? 'Barcode Unreadable'
                          : 'Payment Locked Pending Verification'}
                      </h3>
                      <div className="text-xs text-amber-300/90 leading-relaxed font-medium bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl text-left whitespace-pre-wrap">
                        {lastScanResult?.alertMessage ||
                          skuVerificationService.getUnresolvedDiscrepancy(verifiedSessionId!) ||
                          `Please present all cart items to the barcode scanner. Remaining items: ${
                            skuProgressItems.filter(i => i.remaining_quantity > 0).map(i => `${i.product_name} (${i.remaining_quantity})`).join(', ') || 'None'
                          }`}
                      </div>
                    </div>

                    {/* Demo checkout remains locked until every item is verified. */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">Demo checkout locked</span>
                        <span className="text-[11px] text-slate-500">
                          Scan and verify each cart item before the Demo Payment QR becomes available.
                        </span>
                      </div>
                    </div>

                    {/* Employee Alert status */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                      <div className="flex items-center justify-between text-slate-300 font-semibold">
                        <span>Employee Console Notified:</span>
                        <span className="text-emerald-400 font-mono">Exit-Officer-01</span>
                      </div>
                      <p className="text-slate-500">
                        Non-accusatory event dispatched. Customer can self-correct or request assistance.
                      </p>
                    </div>

                    {/* Benign Customer Correction Actions (Sections 14, 15, 16) */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Select Non-Accusatory Resolution:
                      </span>

                      {/* Re-Scan Action */}
                      <button
                        type="button"
                        onClick={() => handleResolveDiscrepancyAndReverify('RE_SCAN')}
                        className="w-full py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Re-Scan Product Barcode</span>
                      </button>

                      {/* If scanned item is a different pack size: offer switching cart to scanned SKU */}
                      {lastScanResult?.mismatchType === 'PACK_SIZE_MISMATCH' && lastScanResult.scannedProduct && (
                        <button
                          type="button"
                          onClick={() => handleResolveDiscrepancyAndReverify('SWITCH_TO_SCANNED_SKU')}
                          className="w-full py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-sky-400" />
                          <span>Update Cart to Scanned Pack Size ({lastScanResult.scannedProduct.pack_size}) & Unlock</span>
                        </button>
                      )}

                      {/* Return item to shelf */}
                      <button
                        type="button"
                        onClick={() => handleResolveDiscrepancyAndReverify('RETURN_ITEM_TO_SHELF')}
                        className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5 text-slate-400" />
                        <span>Return Scanned Item to Shelf & Re-Verify</span>
                      </button>

                      {/* Request staff verification */}
                      <button
                        type="button"
                        onClick={() => handleResolveDiscrepancyAndReverify('EMPLOYEE_OVERRIDE')}
                        className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
                        <span>Request Staff Assistance / Employee Override</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )
    )}

      {/* ===================================================================== */}
      {/* MODAL: CONTINUE ON MOBILE / SESSION QR HANDOFF */}
      {/* ===================================================================== */}
      {handoffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white text-center space-y-6">
            <button
              onClick={() => setHandoffOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Single-Use Session Pass</span>
              </div>
              <h2 className="text-2xl font-black text-white">
                Continue on Mobile
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Scan with your phone camera to seamlessly transfer this active session.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl w-56 h-56 mx-auto flex items-center justify-center shadow-xl">
              {handoffQrUrl ? (
                <img
                  src={handoffQrUrl}
                  alt="Shopping Session QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
              )}
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>Session ID: <span className="font-mono text-emerald-400">{kioskSession?.session_id}</span></p>
              <p>Cart: <span className="text-white">{kioskCart.reduce((count, item) => count + item.quantity, 0)} items</span> · Total: <span className="text-white">₹{db.calculateAuthoritativeCartTotal(kioskSession?.session_id || '').total}</span></p>
              {sharedCartRevision !== null && <p>Shared cart revision: <span className="font-mono text-cyan-300">{sharedCartRevision}</span> · refreshes about every 2.5 seconds</p>}
              {handoffMobileUrl && (
                <div className="pt-1 text-left">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Reachable Mobile URL:</span>
                  <div className="text-[10px] font-mono text-emerald-300 bg-slate-950/80 px-2 py-1.5 rounded-lg border border-slate-800 break-all select-all">
                    {handoffMobileUrl}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                Scan this QR on your phone to continue with the same shopping session. You can also close this window and keep shopping on the kiosk.
              </p>
            </div>

            {handoffError && <p role="alert" className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl p-3">{handoffError}</p>}

            <button
              onClick={handleSimulateMobileScan}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Simulate Mobile Scan (Open Phone Companion)</span>
            </button>
          </div>
        </div>
      )}

      {/* Employee Attendance Confirmation Overlay */}
      {employeeAttendanceNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl shadow-emerald-500/20">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide">Attendance Verified</h3>
            <p className="text-xs sm:text-sm text-emerald-300 font-mono bg-slate-950/80 p-4 rounded-xl border border-slate-800 break-words leading-relaxed">
              {employeeAttendanceNotice}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Routing directly to Employee Security Console...</span>
            </div>
          </div>
        </div>
      )}

      {/* Kiosk Footer */}
      <footer className="pt-4 border-t border-slate-900 text-center text-xs text-slate-500">
        GrocerAI Self-Adaptive Retail System â€¢ Verification Kiosk #{kioskNum} â€¢ Offline-First Resilient Architecture
      </footer>
    </div>
  );
};
