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
  AisleTraffic
} from '../types';
import { db } from '../services/db';
import { voiceService } from '../services/voiceService';
import { sessionService } from '../services/sessionService';

interface AppContextType {
  // Auth & Roles
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;

  // Shopping & Missions
  activeMission: ShoppingMission | undefined;
  updateMissionItemStatus: (missionId: string, itemId: string, status: 'found' | 'not_found' | 'in_progress' | 'pending') => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (id: string, delta: number) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
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

  // DB Sync state
  const [, setDbVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setDbVersion(v => v + 1);
    });
    return unsubscribe;
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

  const currentUser: UserProfile = role === 'CUSTOMER' ? {
    id: activeSessionId,
    name: 'Ishwarya Kota',
    role: 'CUSTOMER',
    language: language,
    email: 'ishwaryakota@gmail.com',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    created_at: '2026-08-01T10:00:00Z'
  } : {
    id: 'EMP-1042',
    name: 'Vikram Malhotra',
    role: 'STORE_MANAGER',
    language: language,
    email: 'store.manager@grocerai.internal',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    created_at: '2026-07-01T09:00:00Z'
  };

  const activeMission = db.getActiveMission(currentUser.id);
  const cart = db.getCart(currentUser.id);
  const notifications = db.getNotifications(currentUser.id);
  const products = db.getProducts();
  const inventory = db.getInventory();
  const checkoutQueues = db.getCheckoutQueues();
  const aiRecommendations = db.getAIRecommendations();
  const actionOutcomes = db.getActionOutcomes();
  const customerRequests = db.getCustomerRequests();
  const operationalActions = db.getOperationalActions();

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
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

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        currentUser,
        setCurrentUser: () => {},
        language,
        setLanguage,
        interactionMode,
        setInteractionMode,
        activeMission,
        updateMissionItemStatus: handleUpdateMissionItemStatus,
        cart,
        addToCart: handleAddToCart,
        updateCartItemQuantity: handleUpdateCartItemQuantity,
        removeCartItem: handleRemoveCartItem,
        clearCart: handleClearCart,
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
