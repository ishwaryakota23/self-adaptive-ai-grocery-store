import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  LanguageCode,
  InteractionMode,
  UserProfile,
  ShoppingMission,
  CartItem,
  NotificationItem,
  Product,
  InventoryItem,
  CheckoutQueue,
  AIRecommendation,
  ActionOutcome,
  CustomerRequest,
  OperationalAction,
  AisleTraffic,
  Customer,
  CustomerIdentityToken,
  ShoppingSession,
  EmployeeAccount
} from '../types';
import { db } from '../services/db';
import { voiceService } from '../services/voiceService';
import { sessionService } from '../services/sessionService';
import { customerIdentityService } from '../services/customerIdentityService';
import { employeeService } from '../services/employeeService';
import { securityAgent } from '../services/securityAgent';

interface AppContextType {
  // Auth & Roles
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  currentCustomer: Customer | undefined;
  activeShoppingSession: ShoppingSession | undefined;
  customerIdentityToken: CustomerIdentityToken | undefined;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;

  // Customer Identity & Kiosk Auth
  isGetStartedModalOpen: boolean;
  setIsGetStartedModalOpen: (open: boolean) => void;
  getStartedInitialRole: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER' | null;
  setGetStartedInitialRole: (role: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER' | null) => void;
  openEnterStore: (initialRole?: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER') => void;
  isCustomerAuthModalOpen: boolean;
  setIsCustomerAuthModalOpen: (open: boolean) => void;
  isSessionQRModalOpen: boolean;
  setIsSessionQRModalOpen: (open: boolean) => void;
  isCustomerIdentityQRModalOpen: boolean;
  setIsCustomerIdentityQRModalOpen: (open: boolean) => void;
  loginWithCustomerIdentityQR: (token: string) => Promise<{ success: boolean; error?: string }>;
  loginWithWhatsAppOTP: (phone: string, otp: string) => { success: boolean; error?: string };
  registerNewCustomer: (data: { email?: string; whatsapp_number?: string; name?: string; language?: LanguageCode; dietary_preferences?: string[] }) => Promise<{ success: boolean; customer?: Customer; session?: ShoppingSession; error?: string }>;
  startFreshSession: () => void;
  logoutCustomer: () => void;

  // Employee Identity & Operational Auth
  currentEmployee: EmployeeAccount | null;
  loginEmployee: (id: string, dob: string) => { success: boolean; employee?: EmployeeAccount; error?: string };
  loginEmployeeQR: (qrToken: string) => { success: boolean; employee?: EmployeeAccount; error?: string };
  logoutEmployee: () => void;

  // Shopping & Missions
  activeMission: ShoppingMission | undefined;
  updateMissionItemStatus: (missionId: string, itemId: string, status: 'found' | 'not_found' | 'in_progress' | 'pending') => void;
  activateMission: (missionId: string) => void;
  createCustomMission: (mission: ShoppingMission) => void;
  clearActiveMission: () => void;
  
  // Cart (Authoritative)
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (id: string, delta: number) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTax: number;
  cartTotal: number;
  cartItemCount: number;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  addNotification: (notif: Omit<NotificationItem, 'id'>) => NotificationItem;

  // Store Operations & AI Agents
  products: Product[];
  inventory: InventoryItem[];
  checkoutQueues: CheckoutQueue[];
  aiRecommendations: AIRecommendation[];
  actionOutcomes: ActionOutcome[];
  customerRequests: CustomerRequest[];
  operationalActions: OperationalAction[];
  aisleTraffic: AisleTraffic[];
  
  // Store Actions
  approveRecommendation: (recId: string) => void;
  dismissRecommendation: (recId: string) => void;
  restockProduct: (productId: string, quantity: number) => void;
  openCounter: (counterNumber: number) => void;
  resetDatabase: () => void;

  // Demo walkthrough state
  isDemoTourOpen: boolean;
  setIsDemoTourOpen: (open: boolean) => void;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('grocer_role') as UserRole) || 'CUSTOMER';
  });

  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem('grocer_language') as LanguageCode) || 'en';
  });

  const [interactionMode, setInteractionMode] = useState<InteractionMode>('voice');
  const [isDemoTourOpen, setIsDemoTourOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionService.getActiveSessionId());

  // Modal dialog states
  const [isGetStartedModalOpen, setIsGetStartedModalOpen] = useState(false);
  const [getStartedInitialRole, setGetStartedInitialRole] = useState<'CUSTOMER' | 'EMPLOYEE' | 'MANAGER' | null>(null);
  const [isCustomerAuthModalOpen, setIsCustomerAuthModalOpen] = useState(false);
  const [isSessionQRModalOpen, setIsSessionQRModalOpen] = useState(false);
  const [isCustomerIdentityQRModalOpen, setIsCustomerIdentityQRModalOpen] = useState(false);

  const openEnterStore = (initialRole?: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER') => {
    setGetStartedInitialRole(initialRole || null);
    setIsGetStartedModalOpen(true);
  };

  // Active Customer & Session State
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(() => {
    return localStorage.getItem('grocer_active_customer_id') || null;
  });

  // DB Sync state
  const [, setDbVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setDbVersion(v => v + 1);
    });
    return unsubscribe;
  }, []);

  // Active Employee State
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeAccount | null>(() => employeeService.getCurrentEmployee());

  useEffect(() => {
    const unsubEmployee = employeeService.subscribe((emp) => {
      setCurrentEmployee(emp);
    });
    return unsubEmployee;
  }, []);

  useEffect(() => {
    const unsubSession = sessionService.subscribe((s) => {
      setActiveSessionId(s.id);
    });
    return unsubSession;
  }, []);

  useEffect(() => {
    localStorage.setItem('grocer_role', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('grocer_language', language);
  }, [language]);

  useEffect(() => {
    if (currentCustomerId) {
      localStorage.setItem('grocer_active_customer_id', currentCustomerId);
    } else {
      localStorage.removeItem('grocer_active_customer_id');
    }
  }, [currentCustomerId]);

  const currentCustomer: Customer | undefined = currentCustomerId ? db.getCustomer(currentCustomerId) : undefined;
  const activeShoppingSession: ShoppingSession | undefined = activeSessionId
    ? (db.getShoppingSession(activeSessionId) || (currentCustomerId ? db.getActiveSessionForCustomer(currentCustomerId) : undefined))
    : undefined;

  // Get active identity token for customer
  const customerIdentityToken: CustomerIdentityToken | undefined = currentCustomerId
    ? (db as any).state?.customerIdentityTokens?.find(
        (t: CustomerIdentityToken) => t.customer_id === currentCustomerId && t.status === 'active'
      )
    : undefined;

  const currentUser: UserProfile = role === 'CUSTOMER' ? {
    id: activeSessionId || currentCustomerId || 'GUEST',
    name: currentCustomer?.name || 'Guest Shopper',
    role: 'CUSTOMER',
    language: currentCustomer?.language || language,
    email: currentCustomer ? `${currentCustomer.customer_id.toLowerCase()}@grocerai.customer` : 'guest@grocerai.store',
    avatar_url: (currentCustomer as any)?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    created_at: currentCustomer?.created_at || new Date().toISOString(),
    whatsapp_number: currentCustomer?.whatsapp_number
  } : {
    id: 'EMP-1042',
    name: 'Vikram Malhotra',
    role: 'STORE_MANAGER',
    language: language,
    email: 'store.manager@grocerai.internal',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    created_at: '2026-07-01T09:00:00Z'
  };

  const activeMission = (currentCustomerId || (activeSessionId && activeSessionId !== 'GUEST'))
    ? db.getActiveMission(currentCustomerId || activeSessionId)
    : undefined;
  
  // Authoritative cart calculations
  const authoritativeTotals = (currentCustomerId || (activeSessionId && activeSessionId !== 'GUEST'))
    ? db.calculateAuthoritativeCartTotal(currentUser.id)
    : { verifiedItems: [], subtotal: 0, tax: 0, total: 0, itemCount: 0 };
  const cart = authoritativeTotals.verifiedItems;
  const cartSubtotal = authoritativeTotals.subtotal;
  const cartTax = authoritativeTotals.tax;
  const cartTotal = authoritativeTotals.total;
  const cartItemCount = authoritativeTotals.itemCount;

  const notifications = db.getNotifications(currentUser.id);
  const products = db.getProducts();
  const inventory = db.getInventory();
  const checkoutQueues = db.getCheckoutQueues();
  const aiRecommendations = db.getAIRecommendations();
  const actionOutcomes = db.getActionOutcomes();
  const customerRequests = db.getCustomerRequests();
  const operationalActions = db.getOperationalActions();
  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const handleAddToCart = (product: Product, quantity = 1) => {
    db.addToCart(product, quantity, currentUser.id);
  };

  const handleUpdateCartItemQuantity = (id: string, delta: number) => {
    db.updateCartItemQuantity(id, delta, currentUser.id);
  };

  const handleRemoveCartItem = (id: string) => {
    db.removeCartItem(id, currentUser.id);
  };

  const handleClearCart = () => {
    db.clearCart(currentUser.id);
  };

  const handleUpdateMissionItemStatus = (missionId: string, itemId: string, status: 'found' | 'not_found' | 'in_progress' | 'pending') => {
    db.updateMissionItemStatus(missionId, itemId, status);
  };

  const handleMarkNotificationRead = (id: string) => {
    db.markNotificationRead(id);
  };

  const handleAddNotification = (notif: Omit<NotificationItem, 'id'>) => {
    return db.addNotification(notif);
  };

  const handleApproveRecommendation = (recId: string) => {
    db.approveRecommendation(recId);
  };

  const handleDismissRecommendation = (recId: string) => {
    db.dismissRecommendation(recId);
  };

  const handleRestockProduct = (productId: string, quantity: number) => {
    db.restockProduct(productId, quantity);
  };

  const handleOpenCounter = (counterNumber: number) => {
    db.updateCounterStatus(counterNumber, 'open');
  };

  const handleResetDatabase = () => {
    db.resetToDefaults();
  };

  // Customer Authentication methods
  const loginWithCustomerIdentityQR = async (token: string) => {
    const res = await customerIdentityService.loginWithCustomerIdentityQRAsync(token);
    if (res.success && res.customer && res.session) {
      setCurrentCustomerId(res.customer.customer_id);
      sessionService.setActiveSession(res.session.session_id);
      setActiveSessionId(res.session.session_id);
      if (res.customer.language) {
        setLanguage(res.customer.language as LanguageCode);
      }
      setIsCustomerAuthModalOpen(false);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const loginWithWhatsAppOTP = (phone: string, otp: string) => {
    const res = customerIdentityService.loginWithWhatsAppOTP(phone, otp);
    if (res.success && res.customer && res.session) {
      setCurrentCustomerId(res.customer.customer_id);
      sessionService.setActiveSession(res.session.session_id);
      setActiveSessionId(res.session.session_id);
      if (res.customer.language) {
        setLanguage(res.customer.language as LanguageCode);
      }
      setIsCustomerAuthModalOpen(false);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const registerNewCustomer = async (data: { email?: string; whatsapp_number?: string; name?: string; language?: LanguageCode; dietary_preferences?: string[] }) => {
    try {
      const res = await customerIdentityService.registerNewCustomer(data);
      setCurrentCustomerId(res.customer.customer_id);
      sessionService.setActiveSession(res.session.session_id);
      setActiveSessionId(res.session.session_id);
      if (res.customer.language) {
        setLanguage(res.customer.language as LanguageCode);
      }
      setIsCustomerAuthModalOpen(false);
      return { success: true, customer: res.customer, session: res.session };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to register customer' };
    }
  };

  const startFreshSession = () => {
    if (currentCustomer) {
      const { session } = db.createShoppingSession(currentCustomer.customer_id, 'KIOSK');
      sessionService.setActiveSession(session.session_id);
      setActiveSessionId(session.session_id);
    } else {
      const newSession = sessionService.createNewSession('LARGE_DISPLAY');
      setActiveSessionId(newSession.id);
    }
  };

  const handleActivateMission = (missionId: string) => {
    const targetId = currentCustomerId || activeSessionId || 'GUEST';
    db.activateMission(missionId, targetId);
    setDbVersion(v => v + 1);
  };

  const handleCreateCustomMission = (mission: ShoppingMission) => {
    db.createCustomMission(mission);
    setDbVersion(v => v + 1);
  };

  const handleClearActiveMission = () => {
    const targetId = currentCustomerId || activeSessionId;
    if (targetId) {
      db.clearActiveMission(targetId);
      setDbVersion(v => v + 1);
    }
  };

  const logoutCustomer = () => {
    sessionService.clearActiveSession();
    setActiveSessionId('');
    setCurrentCustomerId(null);
    localStorage.removeItem('grocer_active_customer_id');
    setDbVersion(v => v + 1);
  };

  const loginEmployee = (id: string, dob: string) => {
    const res = employeeService.login(id, dob);
    if (res.success && res.employee) {
      setCurrentEmployee(res.employee);
      setRole('EMPLOYEE');
    }
    return res;
  };

  const loginEmployeeQR = (qrToken: string) => {
    const check = employeeService.validateEmployeeQR(qrToken);
    if (!check.valid || !check.employee) {
      return { success: false, error: check.error || 'Invalid Employee QR code.' };
    }
    const att = employeeService.recordAttendance(check.employee.employee_id, 'KIOSK-MAIN-ENTRANCE-01', 'QR_SCAN');
    if (!att.success) {
      return { success: false, error: att.error || 'Failed to record attendance.' };
    }
    setCurrentEmployee(check.employee);
    setRole('EMPLOYEE');
    return { success: true, employee: check.employee };
  };

  const logoutEmployee = () => {
    employeeService.logout();
    setCurrentEmployee(null);
    setRole('CUSTOMER');
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        setCurrentUser: () => {},
        currentCustomer,
        activeShoppingSession,
        customerIdentityToken,
        language,
        setLanguage,
        interactionMode,
        setInteractionMode,

        isGetStartedModalOpen,
        setIsGetStartedModalOpen,
        getStartedInitialRole,
        setGetStartedInitialRole,
        openEnterStore,
        isCustomerAuthModalOpen,
        setIsCustomerAuthModalOpen,
        isSessionQRModalOpen,
        setIsSessionQRModalOpen,
        isCustomerIdentityQRModalOpen,
        setIsCustomerIdentityQRModalOpen,
        loginWithCustomerIdentityQR,
        loginWithWhatsAppOTP,
        registerNewCustomer,
        startFreshSession,
        logoutCustomer,

        currentEmployee,
        loginEmployee,
        loginEmployeeQR,
        logoutEmployee,

        activeMission,
        updateMissionItemStatus: handleUpdateMissionItemStatus,
        activateMission: handleActivateMission,
        createCustomMission: handleCreateCustomMission,
        clearActiveMission: handleClearActiveMission,
        cart,
        addToCart: handleAddToCart,
        updateCartItemQuantity: handleUpdateCartItemQuantity,
        removeCartItem: handleRemoveCartItem,
        clearCart: handleClearCart,
        cartSubtotal,
        cartTax,
        cartTotal,
        cartItemCount,
        notifications,
        unreadNotificationCount,
        markNotificationRead: handleMarkNotificationRead,
        addNotification: handleAddNotification,
        products,
        inventory,
        checkoutQueues,
        aiRecommendations,
        actionOutcomes,
        customerRequests,
        operationalActions,
        aisleTraffic: db.getAisleTraffic(),
        approveRecommendation: handleApproveRecommendation,
        dismissRecommendation: handleDismissRecommendation,
        restockProduct: handleRestockProduct,
        openCounter: handleOpenCounter,
        resetDatabase: handleResetDatabase,
        isDemoTourOpen,
        setIsDemoTourOpen,
        refreshData: () => setDbVersion(v => v + 1),
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
