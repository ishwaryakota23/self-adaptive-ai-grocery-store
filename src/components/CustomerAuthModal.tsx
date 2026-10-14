import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  UserCheck,
  User,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { customerIdentityService } from '../services/customerIdentityService';
import { employeeService } from '../services/employeeService';
import { CameraQRScanner } from './CameraQRScanner';
import { LanguageCode } from '../types';

export const CustomerAuthModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isCustomerAuthModalOpen,
    setIsCustomerAuthModalOpen,
    loginWithCustomerIdentityQR,
    loginWithWhatsAppOTP,
    registerNewCustomer,
    loginEmployeeQR,
    startFreshSession
  } = useApp();

  const [activeTab, setActiveTab] = useState<'NEW' | 'RETURNING' | 'GUEST'>('RETURNING');

  // New Customer State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLang, setNewLang] = useState<LanguageCode>('en');
  const [otpStep, setOtpStep] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);

  // Returning Customer State
  const [returnMode, setReturnMode] = useState<'QR' | 'OTP'>('QR');
  const [qrInput, setQrInput] = useState('');
  const [returnIdentifier, setReturnIdentifier] = useState('');
  const [returnOtp, setReturnOtp] = useState('');
  const [returnOtpStep, setReturnOtpStep] = useState(false);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isCustomerAuthModalOpen) return null;

  const handleSendNewCustomerOTP = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    // Check if customer account already exists; route to Returning Customer
    const existingCustomer = db.getCustomerByEmail(cleanEmail);
    if (existingCustomer) {
      setActiveTab('RETURNING');
      setReturnIdentifier(cleanEmail);
      setReturnMode('OTP');
      setErrorMsg(`An account already exists for ${cleanEmail}. Switched to Returning Customer check-in.`);
      return;
    }

    setLoadingOtp(true);
    const res = await customerIdentityService.requestOTP(cleanEmail);
    setLoadingOtp(false);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }
    setOtpStep(true);
    setSuccessMsg(`Verification code dispatched to ${cleanEmail}. Please check your inbox.`);
  };

  const handleCompleteRegistration = async () => {
    setErrorMsg(null);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!enteredOtp || enteredOtp.length < 6) {
      setErrorMsg('Please enter the 6-digit code received in your email.');
      return;
    }

    setLoadingOtp(true);
    const otpVerify = await customerIdentityService.verifyOTP(cleanEmail, enteredOtp);
    setLoadingOtp(false);
    if (!otpVerify.valid) {
      setErrorMsg(otpVerify.error || 'Invalid OTP code');
      return;
    }

    let reg: Awaited<ReturnType<typeof registerNewCustomer>>;
    try {
      reg = await registerNewCustomer({
        email: cleanEmail,
        name: newName.trim() || 'Shopper',
        language: newLang
      });
    } catch (error: any) {
      const errMsg = error?.message || '';
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already has a customer')) {
        setActiveTab('RETURNING');
        setReturnIdentifier(cleanEmail);
        setReturnMode('OTP');
        setErrorMsg(`An account already exists for ${cleanEmail}. Switched to Returning Customer check-in.`);
        return;
      }
      setErrorMsg(errMsg || 'Registration could not be saved. Please try again.');
      return;
    }

    if (!reg.success) {
      if ((reg as any).code === 'CUSTOMER_ALREADY_EXISTS' || reg.error?.toLowerCase().includes('already')) {
        setActiveTab('RETURNING');
        setReturnIdentifier(cleanEmail);
        setReturnMode('OTP');
        setErrorMsg(`An account already exists for ${cleanEmail}. Switched to Returning Customer check-in.`);
        return;
      }
      setErrorMsg(reg.error || 'Registration failed');
      return;
    }

    setSuccessMsg('Registration verified! Customer Identity Pass sent to your email. Opening catalog...');
    setTimeout(() => {
      setIsCustomerAuthModalOpen(false);
      navigate('/customer/products');
    }, 500);
  };

  const handleReturnLoginQR = async (tokenToUse?: string): Promise<{ success: boolean; error?: string }> => {
    setErrorMsg(null);
    const tok = tokenToUse || qrInput.trim();
    if (!tok) {
      setErrorMsg('Please scan or select a Customer Identity QR token.');
      return { success: false, error: 'Please scan or select a Customer Identity QR token.' };
    }

    // Support Employee Attendance QR scanned at kiosk
    if (tok.startsWith('GROCERAI_EMP_V1:') || tok.includes('GROCERAI_EMPLOYEE') || tok.startsWith('EMP-')) {
      const empRes = employeeService.validateEmployeeQR(tok);
      if (empRes.valid && empRes.employee) {
        employeeService.recordAttendance({
          employee_id: empRes.employee.employee_id,
          location: 'KIOSK-MAIN-ENTRANCE-01',
          status: 'PRESENT'
        });
        loginEmployeeQR(tok);
        setSuccessMsg(`Attendance verified for ${empRes.employee.name} (${empRes.employee.employee_id}). Redirecting to Staff Dashboard...`);
        setTimeout(() => {
          setIsCustomerAuthModalOpen(false);
          navigate('/employee/dashboard');
        }, 1200);
        return { success: true };
      } else {
        setErrorMsg(empRes.error || 'Invalid Employee QR pass.');
        return { success: false, error: empRes.error || 'Invalid Employee QR pass.' };
      }
    }

    const res = await loginWithCustomerIdentityQR(tok);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid Customer Identity QR');
      return { success: false, error: res.error || 'Invalid Customer Identity QR' };
    }
    setTimeout(() => {
      setIsCustomerAuthModalOpen(false);
      navigate('/customer/products');
    }, 400);
    return { success: true };
  };

  const handleSendReturnOTP = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const cleanId = returnIdentifier.trim();
    if (!cleanId) {
      setErrorMsg('Please enter your registered email or phone.');
      return;
    }
    setLoadingOtp(true);
    const res = await customerIdentityService.requestOTP(cleanId);
    setLoadingOtp(false);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }
    setReturnOtpStep(true);
    setSuccessMsg(`Verification code dispatched to ${cleanId}. Please enter the 6-digit code below.`);
  };

  const handleCompleteReturnOTP = () => {
    setErrorMsg(null);
    const res = loginWithWhatsAppOTP(returnIdentifier.trim(), returnOtp);
    if (!res.success) {
      setErrorMsg(res.error || 'Login failed');
      return;
    }
    setIsCustomerAuthModalOpen(false);
    navigate('/customer/products');
  };

  const handleGuestEnter = () => {
    startFreshSession();
    setIsCustomerAuthModalOpen(false);
    navigate('/customer/products');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-white space-y-6">
        {/* Close Button */}
        <button
          onClick={() => setIsCustomerAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Store Kiosk Check-In</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Welcome to GrocerAI
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Identify yourself to load personalized preferences, dietary profile, and start your shopping session.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('RETURNING'); setErrorMsg(null); }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'RETURNING' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Returning</span>
          </button>
          <button
            onClick={() => { setActiveTab('NEW'); setErrorMsg(null); }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'NEW' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Customer</span>
          </button>
          <button
            onClick={() => { setActiveTab('GUEST'); setErrorMsg(null); }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'GUEST' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Guest</span>
          </button>
        </div>

        {/* Alerts / Feedback */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: RETURNING CUSTOMER */}
        {activeTab === 'RETURNING' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setReturnMode('QR')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  returnMode === 'QR' ? 'bg-slate-800 border-emerald-500 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                Scan Identity QR
              </button>
              <button
                onClick={() => setReturnMode('OTP')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                  returnMode === 'OTP' ? 'bg-slate-800 border-emerald-500 text-white' : 'border-slate-800 text-slate-400'
                }`}
              >
                WhatsApp OTP
              </button>
            </div>

            {returnMode === 'QR' ? (
              <div className="space-y-4">
                <CameraQRScanner
                  title="Scan Identity QR Code"
                  subtitle="Hold your phone with the email QR up to the kiosk camera"
                  onScanSuccess={handleReturnLoginQR}
                  onSwitchToNewCustomer={() => setActiveTab('NEW')}
                />

                {/* Demo Quick-Select Profiles & Manual Input */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 block font-semibold">Demo Profiles or Manual Token:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleReturnLoginQR('CID_SEC_ISHWARYA_1001_VERIFIED')}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 text-left transition-all group cursor-pointer"
                    >
                      <div className="font-bold text-xs text-white group-hover:text-emerald-400">Ishwarya Kota</div>
                      <div className="text-[10px] text-slate-400 font-mono">+91 98765 43210</div>
                      <div className="text-[9px] text-emerald-500/80 mt-0.5">Vegetarian • High Protein</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReturnLoginQR('CID_SEC_RAHUL_1002_VERIFIED')}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 text-left transition-all group cursor-pointer"
                    >
                      <div className="font-bold text-xs text-white group-hover:text-emerald-400">Rahul Sen</div>
                      <div className="text-[10px] text-slate-400 font-mono">+91 91234 56789</div>
                      <div className="text-[9px] text-emerald-500/80 mt-0.5">Dairy Lover • Organic</div>
                    </button>
                  </div>

                  <div className="pt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="Or paste CID_SEC_..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleReturnLoginQR()}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Registered Email or Phone:</label>
                  <input
                    type="text"
                    value={returnIdentifier}
                    onChange={(e) => setReturnIdentifier(e.target.value)}
                    placeholder="name@example.com or phone"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {!returnOtpStep ? (
                  <button
                    onClick={handleSendReturnOTP}
                    disabled={loadingOtp}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    {loadingOtp ? 'Sending Code...' : 'Send Verification OTP'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Enter 6-Digit Code:</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={returnOtp}
                        onChange={(e) => setReturnOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="123456"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-center font-mono text-base tracking-widest text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={handleCompleteReturnOTP}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                    >
                      Verify & Start Shopping
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NEW CUSTOMER */}
        {activeTab === 'NEW' && (
          <div className="space-y-3">
            {!otpStep ? (
              <>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Your Email Address (Required for Identity QR):</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Your permanent Customer Identity QR Pass will be emailed here.</p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Your Name (Optional):</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Your Name (Optional)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Preferred Language:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'en', label: 'English' },
                      { code: 'te', label: 'తెలుగు' },
                      { code: 'hi', label: 'हिन्दी' }
                    ].map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setNewLang(l.code as LanguageCode)}
                        className={`py-2 rounded-xl text-xs font-semibold border ${
                          newLang === l.code ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSendNewCustomerOTP}
                  disabled={loadingOtp}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer mt-2"
                >
                  {loadingOtp ? 'Sending Verification Code...' : 'Request Verification OTP'}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Verification Code Dispatched
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    A 6-digit verification code was dispatched to <strong className="text-white font-mono">{newEmail}</strong>. Please check your inbox (and spam/promotions folder) and enter it below.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Enter 6-Digit Verification Code:</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-center font-mono text-base tracking-widest text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleCompleteRegistration}
                  disabled={loadingOtp || enteredOtp.length < 6}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  {loadingOtp ? 'Verifying...' : 'Verify & Receive Customer Identity QR Pass'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GUEST SHOPPER */}
        {activeTab === 'GUEST' && (
          <div className="space-y-3 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              Shop anonymously without saving preferences or order history. You can link your WhatsApp anytime during checkout.
            </p>
            <button
              onClick={handleGuestEnter}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Continue as Guest</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        )}

        {/* Footer note: Empty Cart Guarantee */}
        <div className="border-t border-slate-800 pt-3 text-center">
          <p className="text-[10px] text-slate-500">
            🔒 Privacy Guarantee: Every in-store visit starts with a strictly empty cart.
          </p>
        </div>
      </div>
    </div>
  );
};
