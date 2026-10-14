import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  UserPlus,
  QrCode,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Mail,
  User,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Monitor,
  BadgeCheck,
  Calendar,
  Building2,
  Download,
  Fingerprint,
  ShieldAlert,
  Clock,
  Barcode,
  Building,
  Car
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db } from '../services/db';
import { managerService } from '../services/managerService';
import { customerIdentityService } from '../services/customerIdentityService';
import { employeeService } from '../services/employeeService';
import { qrService } from '../services/qrService';
import { CameraQRScanner } from './CameraQRScanner';
import { EmployeeAccount, EmployeeAttendanceRecord } from '../types';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER' | null;
}

type ModalView =
  | 'ROLE_SELECTION'
  | 'CUSTOMER_OPTIONS'
  | 'EMPLOYEE_OPTIONS'
  | 'MANAGER_OPTIONS'
  | 'NEW_CUSTOMER_EMAIL'
  | 'NEW_CUSTOMER_OTP'
  | 'RETURNING_CUSTOMER_SCANNER'
  | 'NEW_EMPLOYEE_REGISTER'
  | 'NEW_EMPLOYEE_SUCCESS'
  | 'EXISTING_EMPLOYEE_SCANNER'
  | 'EMPLOYEE_ATTENDANCE_SUCCESS';

export const GetStartedModal: React.FC<GetStartedModalProps> = ({ isOpen, onClose, initialRole }) => {
  const navigate = useNavigate();
  const {
    setRole,
    registerNewCustomer,
    loginWithCustomerIdentityQR,
    loginEmployeeQR
  } = useApp();

  const [view, setView] = useState<ModalView>('ROLE_SELECTION');

  // Customer Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | null>(null);

  // Employee Registration Form State
  const [empName, setEmpName] = useState('');
  const [empDob, setEmpDob] = useState('');
  const [empRole, setEmpRole] = useState('Exit Verification Officer');
  const [empDept, setEmpDept] = useState('Operations');
  const [empEmail, setEmpEmail] = useState('');
  const [registeredEmployee, setRegisteredEmployee] = useState<EmployeeAccount | null>(null);
  const [employeeQrDataUrl, setEmployeeQrDataUrl] = useState<string | null>(null);

  // Employee Attendance Feedback State
  const [attendanceSuccess, setAttendanceSuccess] = useState<EmployeeAttendanceRecord | null>(null);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialRole === 'CUSTOMER') {
        setView('CUSTOMER_OPTIONS');
      } else if (initialRole === 'EMPLOYEE') {
        setView('EMPLOYEE_OPTIONS');
      } else if (initialRole === 'MANAGER') {
        setView('MANAGER_OPTIONS');
      } else {
        setView('ROLE_SELECTION');
      }
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // PRIMARY ROLE SELECTIONS (Requirement 1)
  // --------------------------------------------------------------------------
  const handleSelectCustomer = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setView('CUSTOMER_OPTIONS');
  };

  const handleSelectEmployee = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setView('EMPLOYEE_OPTIONS');
  };

  const handleSelectManager = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setView('MANAGER_OPTIONS');
  };

  // --------------------------------------------------------------------------
  // CUSTOMER FLOW (Requirement 2)
  // --------------------------------------------------------------------------
  const handleRequestCustomerOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    // Check if customer already exists; route to Returning Customer
    const existingCust = db.getCustomerByEmail(cleanEmail);
    if (existingCust) {
      setView('RETURNING_CUSTOMER_SCANNER');
      setErrorMsg(`An account already exists for ${cleanEmail}. Please scan your Customer Identity QR.`);
      return;
    }

    setLoading(true);
    try {
      const res = await customerIdentityService.requestOTP(cleanEmail);
      setLoading(false);
      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }
      setOtpHint(null);
      setSuccessMsg(`OTP sent to ${cleanEmail}. Please check your email inbox.`);
      setView('NEW_CUSTOMER_OTP');
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || 'Failed to request OTP');
    }
  };

  const handleVerifyCustomerOTPAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    const verifyRes = await customerIdentityService.verifyOTP(cleanEmail, cleanOtp);
    if (!verifyRes.valid) {
      setLoading(false);
      setErrorMsg(verifyRes.error || 'Invalid OTP code.');
      return;
    }

    let regRes: Awaited<ReturnType<typeof registerNewCustomer>>;
    try {
      regRes = await registerNewCustomer({
        email: cleanEmail,
        name: name.trim() || 'Shopper',
        language: 'en'
      });
    } catch (err: any) {
      setLoading(false);
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('already has a customer')) {
        setView('RETURNING_CUSTOMER_SCANNER');
        setErrorMsg(`An account already exists for ${cleanEmail}. Please scan your Customer Identity QR.`);
        return;
      }
      setErrorMsg(errMsg || 'Registration could not be saved.');
      return;
    }

    setLoading(false);
    if (!regRes.success) {
      if ((regRes as any).code === 'CUSTOMER_ALREADY_EXISTS' || regRes.error?.toLowerCase().includes('already')) {
        setView('RETURNING_CUSTOMER_SCANNER');
        setErrorMsg(regRes.error || `An account already exists for ${cleanEmail}. Please scan your Customer Identity QR.`);
        return;
      }
      setErrorMsg(regRes.error || 'Registration failed.');
      return;
    }

    setRole('CUSTOMER');
    onClose();
    navigate('/customer/products');
  };

  const handleScanReturningCustomerSuccess = async (scannedToken: string) => {
    const res = await loginWithCustomerIdentityQR(scannedToken);
    if (res.success) {
      setRole('CUSTOMER');
      setTimeout(() => {
        onClose();
        navigate('/customer/products');
      }, 700);
      return { success: true };
    }
    return { success: false, error: res.error || 'QR could not be verified.' };
  };

  // --------------------------------------------------------------------------
  // EMPLOYEE REGISTRATION FLOW (Requirement 3)
  // --------------------------------------------------------------------------
  const handleRegisterEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    setLoading(true);
    try {
      const res = employeeService.registerEmployee({
        name: empName,
        dob: empDob,
        role: empRole,
        department: empDept,
        email: empEmail || undefined
      });

      if (!res.success || !res.employee) {
        setLoading(false);
        setErrorMsg(res.error || 'Registration failed.');
        return;
      }

      setRegisteredEmployee(res.employee);

      // Generate real visual QR code
      const qrRes = await qrService.generateEmployeeQR(res.employee);
      setEmployeeQrDataUrl(qrRes.dataUrl);

      setLoading(false);
      setView('NEW_EMPLOYEE_SUCCESS');
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || 'Error creating employee identity record.');
    }
  };

  // --------------------------------------------------------------------------
  // EXISTING EMPLOYEE ATTENDANCE SCANNER FLOW (Requirement 4)
  // --------------------------------------------------------------------------
  const handleScanExistingEmployeeSuccess = (scannedToken: string) => {
    try {
      const check = employeeService.validateEmployeeQR(scannedToken);
      if (!check.valid || !check.employee) {
        return { success: false, error: check.error || 'Invalid Employee QR code.' };
      }

      // Record attendance
      const att = employeeService.recordAttendance(
        check.employee.employee_id,
        'KIOSK-MAIN-ENTRANCE-01',
        'QR_SCAN'
      );

      if (!att.success || !att.record) {
        return { success: false, error: att.error || 'Failed to record attendance.' };
      }

      setAttendanceSuccess(att.record);
      setRole('EMPLOYEE');

      setTimeout(() => {
        setView('EMPLOYEE_ATTENDANCE_SUCCESS');
      }, 400);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Verification error' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ================================================================= */}
        {/* VIEW 1: PRIMARY ENTRY ROLE SELECTION (Customer / Employee / Manager) */}
        {/* ================================================================= */}
        {view === 'ROLE_SELECTION' && (
          <div className="space-y-6">
            <div className="text-center space-y-2 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Select Your Entry Role</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Welcome to Grocer<span className="text-emerald-400">AI</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                Choose your primary role to access dedicated shopping, security response, or store management workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 pt-2">
              {/* Role 1: Customer */}
              <button
                onClick={handleSelectCustomer}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all group text-left cursor-pointer shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                        🛒 Customer
                      </h3>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                        Shopper Experience
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Explore catalog, smart cart, Groq assistant, and seamless checkout
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Role 2: Employee */}
              <button
                onClick={handleSelectEmployee}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all group text-left cursor-pointer shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-cyan-400 transition-colors">
                        🛡️ Employee
                      </h3>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase">
                        Operational Console
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Attendance check-in, exit station verification & security response
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Role 3: Manager */}
              <button
                onClick={handleSelectManager}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 transition-all group text-left cursor-pointer shadow-lg hover:shadow-blue-500/10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:bg-blue-500 group-hover:text-slate-950 transition-all">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors">
                        👨‍💼 Manager
                      </h3>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30 uppercase">
                        Store HQ
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Store Agent, executive oversight, staffing analytics & ROI Engine
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2A: CUSTOMER OPTIONS (New Customer / Returning Customer / Verification) */}
        {/* ================================================================= */}
        {view === 'CUSTOMER_OPTIONS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('ROLE_SELECTION')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Role Selection</span>
              </button>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Customer Flow
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">
                How would you like to shop?
              </h2>
              <p className="text-xs text-slate-400">
                Create a fresh identity, resume with QR pass, or return to station for cart verification & checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <button
                onClick={() => setView('NEW_CUSTOMER_EMAIL')}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-emerald-400">
                      New Customer
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Create permanent Customer ID & start fresh shopping cart
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-all" />
              </button>

              <button
                onClick={() => setView('RETURNING_CUSTOMER_SCANNER')}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-all">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-cyan-400">
                      Returning Customer
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Scan Customer QR, load Hindsight memory & start new session
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-all" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  navigate('/customer/verify');
                }}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-all">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-amber-400">
                        In-Store Cart Verification & Pay
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold uppercase">
                        Return to Station
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Scan Session QR • Real-time barcode & SKU verification • Simulated checkout
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2B: EMPLOYEE OPTIONS (New Employee / Existing Employee) */}
        {/* ================================================================= */}
        {view === 'EMPLOYEE_OPTIONS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('ROLE_SELECTION')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Role Selection</span>
              </button>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Employee Operations
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">
                Employee Onboarding & Access
              </h2>
              <p className="text-xs text-slate-400">
                Register as a new store employee or scan your Employee QR pass for kiosk attendance.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {/* Option: New Employee */}
              <button
                onClick={() => setView('NEW_EMPLOYEE_REGISTER')}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-all">
                    <BadgeCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-cyan-400">
                      New Employee Registration
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Onboard employee, generate unique Employee ID & Employee QR pass
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-all" />
              </button>

              {/* Option: Existing Employee Attendance */}
              <button
                onClick={() => setView('EXISTING_EMPLOYEE_SCANNER')}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-emerald-400">
                      Existing Employee Check-in
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Scan Employee QR to record attendance & enter Employee Console
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-all" />
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => { onClose(); navigate('/employee/login'); }}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <span>Or login with Employee ID & DOB on mobile dashboard →</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2C: MANAGER OPTIONS (Desktop HQ vs Mobile On-The-Go) */}
        {/* ================================================================= */}
        {view === 'MANAGER_OPTIONS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('ROLE_SELECTION')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Role Selection</span>
              </button>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Manager Executive Portal
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">
                Select Management Mode
              </h2>
              <p className="text-xs text-slate-400">
                Access full in-store operations dashboard or open the handheld mobile companion for on-the-go monitoring.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {/* Option 1: Desktop Store Operations HQ */}
              <button
                onClick={() => {
                  onClose();
                  if (managerService.isAuthenticated()) {
                    setRole('STORE_MANAGER');
                    navigate('/store/dashboard');
                  } else {
                    navigate('/manager/login');
                  }
                }}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 transition-all text-left cursor-pointer group shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-all">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-blue-400">
                      🏢 Store Operations HQ (Desktop)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Executive Command Center, CCTV surveillance, inventory restock, ROI engine & staff roster
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-all" />
              </button>

              {/* Option 2: Manager Mobile Companion (In Traffic / On-The-Go) */}
              <button
                onClick={() => {
                  const result = managerService.loginOnTheGo();
                  if (!result.success) {
                    onClose();
                    navigate('/manager/login');
                    return;
                  }
                  setRole('STORE_MANAGER');
                  onClose();
                  navigate('/manager/mobile');
                }}
                className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition-all text-left cursor-pointer group shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-all">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-cyan-400">
                        🚗 Manager Mobile Companion (On-The-Go)
                      </h3>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                        +91 9618633599
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Handheld remote manager console • Auto-telephony emergency voice calling enabled when in traffic
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-all" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: NEW EMPLOYEE REGISTRATION FORM (Requirement 3) */}
        {/* ================================================================= */}
        {view === 'NEW_EMPLOYEE_REGISTER' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('EMPLOYEE_OPTIONS')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Employee Options</span>
              </button>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Digital Registration
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">
                Register Store Employee
              </h2>
              <p className="text-xs text-slate-400">
                Enter employee profile details. An application-generated Employee ID (EMP-XXXX) and unique Employee QR pass will be issued immediately.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Aditi Varma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date of Birth <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      required
                      value={empDob}
                      onChange={(e) => setEmpDob(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Department <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <select
                      value={empDept}
                      onChange={(e) => setEmpDept(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Operations">Operations</option>
                      <option value="Security & Loss Prevention">Security & Loss Prevention</option>
                      <option value="Inventory">Inventory</option>
                      <option value="Customer Service">Customer Service</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Role / Designation <span className="text-rose-400">*</span>
                </label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Exit Verification Officer">Exit Verification Officer</option>
                  <option value="Security Responder">Security Responder</option>
                  <option value="Floor Associate">Floor Associate</option>
                  <option value="Inventory Specialist">Inventory Specialist</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Work Email <span className="text-slate-500">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="e.g. aditi.varma@grocerai.internal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50 mt-2"
              >
                {loading ? 'Issuing Credentials...' : 'Complete Registration & Issue Employee QR'}
              </button>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 4: NEW EMPLOYEE REGISTRATION SUCCESS (Requirement 3) */}
        {/* ================================================================= */}
        {view === 'NEW_EMPLOYEE_SUCCESS' && registeredEmployee && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">
                Employee Registered
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Official employee credentials issued. Use this pass for kiosk identification and attendance.
              </p>
            </div>

            {/* Employee ID Badge */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs text-slate-400">Employee ID:</span>
                <span className="font-mono text-base font-extrabold text-cyan-400 bg-cyan-950/80 px-3 py-1 rounded-lg border border-cyan-500/30">
                  {registeredEmployee.employee_id}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Name:</span>
                <span className="font-bold text-white">{registeredEmployee.name}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Designation:</span>
                <span className="text-slate-300">{registeredEmployee.role}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Department:</span>
                <span className="text-slate-300">{registeredEmployee.department}</span>
              </div>
            </div>

            {/* Generated QR Pass */}
            {employeeQrDataUrl && (
              <div className="inline-block p-4 rounded-2xl bg-white border-4 border-cyan-500 shadow-xl">
                <img
                  src={employeeQrDataUrl}
                  alt="Employee QR Pass"
                  className="w-44 h-44 object-contain mx-auto"
                />
                <p className="text-[10px] text-slate-900 font-mono font-bold mt-2 uppercase tracking-wider">
                  {registeredEmployee.employee_id} · GROCERAI PASS
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  employeeService.recordAttendance(registeredEmployee.employee_id, 'KIOSK-MAIN-ENTRANCE-01', 'QR_SCAN');
                  setRole('EMPLOYEE');
                  onClose();
                  navigate('/employee/dashboard');
                }}
                className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <span>Record Attendance & Enter Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `${registeredEmployee.employee_id}_QR_Pass.png`;
                  link.href = employeeQrDataUrl || '';
                  link.click();
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Save QR Pass</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 5: EXISTING EMPLOYEE QR SCANNER (Requirement 4) */}
        {/* ================================================================= */}
        {view === 'EXISTING_EMPLOYEE_SCANNER' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('EMPLOYEE_OPTIONS')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Employee Options</span>
              </button>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Kiosk Scanner
              </span>
            </div>

            <CameraQRScanner
              title="Scan Employee QR Code"
              subtitle="Hold your Employee QR pass in front of the kiosk camera to verify identity & log attendance"
              onScanSuccess={handleScanExistingEmployeeSuccess}
              onSwitchToNewCustomer={() => setView('NEW_EMPLOYEE_REGISTER')}
            />

            {/* Quick Demo Pre-Seeded Employee Test Buttons */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Quick Test: Tap a seeded employee QR pass:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleScanExistingEmployeeSuccess('GROCERAI_EMP_V1:EMP-1045:sec_tok_991823')}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-white">EMP-1045</div>
                  <div className="text-[10px] text-slate-400">Ramesh Patel (Security)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleScanExistingEmployeeSuccess('GROCERAI_EMP_V1:EMP-1046:sec_tok_882914')}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-white">EMP-1046</div>
                  <div className="text-[10px] text-slate-400">Ananya Rao (Exit Officer)</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 6: ATTENDANCE RECORDED CONFIRMATION (Requirement 4) */}
        {/* ================================================================= */}
        {view === 'EMPLOYEE_ATTENDANCE_SUCCESS' && attendanceSuccess && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <BadgeCheck className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">
                Attendance Recorded
              </h2>
              <p className="text-xs text-slate-400">
                Identity verified. Active shift logged in authoritative store ledger.
              </p>
            </div>

            {/* Attendance Details Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs text-slate-400">Employee ID:</span>
                <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">
                  {attendanceSuccess.employee_id}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Name:</span>
                <span className="font-bold text-white">{attendanceSuccess.employee_name}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Time:</span>
                <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {attendanceSuccess.time_display}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {attendanceSuccess.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Station / Location:</span>
                <span className="text-slate-300 font-mono text-[11px]">{attendanceSuccess.location}</span>
              </div>
            </div>

            {/* Manager Notification Confirmation Badge */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white">Store Manager Notified</div>
                <div className="text-[11px] text-slate-300">
                  Official attendance record dispatched in real-time to Store Manager Console & Store Agent roster.
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                navigate('/employee/dashboard');
              }}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <span>Open Employee Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 7: NEW CUSTOMER EMAIL (Requirement 2) */}
        {/* ================================================================= */}
        {view === 'NEW_CUSTOMER_EMAIL' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('CUSTOMER_OPTIONS')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                New Shopper
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">Enter Your Email</h2>
              <p className="text-xs text-slate-400">
                We will send you a one-time code to create your Customer ID.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestCustomerOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ishwarya Kota"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? 'Sending code...' : 'Continue to Verification'}
              </button>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 8: NEW CUSTOMER OTP VERIFY (Requirement 2) */}
        {/* ================================================================= */}
        {view === 'NEW_CUSTOMER_OTP' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('NEW_CUSTOMER_EMAIL')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Change Email</span>
              </button>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Verify OTP
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">Enter 6-Digit Code</h2>
              <p className="text-xs text-slate-400">
                Code sent to <span className="text-white font-medium">{email}</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>We dispatched your secure 6-digit OTP code. Please check your inbox.</span>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCustomerOTPAndRegister} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? 'Creating Customer Identity...' : 'Start Shopping'}
              </button>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 9: RETURNING CUSTOMER SCANNER (Requirement 2) */}
        {/* ================================================================= */}
        {view === 'RETURNING_CUSTOMER_SCANNER' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button
                onClick={() => setView('CUSTOMER_OPTIONS')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Customer Options</span>
              </button>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Returning Shopper
              </span>
            </div>

            <CameraQRScanner
              title="Scan Customer Identity QR"
              subtitle="Scan your Customer Identity QR received via email to load your preferences and start a new shopping cart"
              onScanSuccess={handleScanReturningCustomerSuccess}
              onSwitchToNewCustomer={() => setView('NEW_CUSTOMER_EMAIL')}
            />
          </div>
        )}
      </div>
    </div>
  );
};
