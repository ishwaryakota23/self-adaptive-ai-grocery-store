import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { DemoTourModal } from './components/DemoTourModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerIdentityQRModal } from './components/CustomerIdentityQRModal';
import { WhatsAppSimulationDrawer } from './components/WhatsAppSimulationDrawer';
import { GetStartedModal } from './components/GetStartedModal';
import { JarvisEmergencyPhoneCallModal } from './components/JarvisEmergencyPhoneCallModal';
import { useApp } from './context/AppContext';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { InteractionModePage } from './pages/InteractionModePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { CustomerMobileDashboard } from './pages/CustomerMobileDashboard';
import { KioskPage } from './pages/KioskPage';
import { ManagerLoginPage } from './pages/ManagerLoginPage';
import { ManagerMobileDashboard } from './pages/ManagerMobileDashboard';
import { EmployeeLoginPage } from './pages/EmployeeLoginPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';

// Customer Pages
import { CustomerHomePage } from './pages/CustomerHomePage';
import { CustomerAssistantPage } from './pages/CustomerAssistantPage';
import { CustomerMissionPage } from './pages/CustomerMissionPage';
import { ProductDiscoveryPage } from './pages/ProductDiscoveryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { RealtimeAvailabilityPage } from './pages/RealtimeAvailabilityPage';
import { StoreMapPage } from './pages/StoreMapPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CustomerPreferencesPage } from './pages/CustomerPreferencesPage';
import { CustomerMemoryPage } from './pages/CustomerMemoryPage';

// Store Agent Pages
import { StoreDashboardPage } from './pages/StoreDashboardPage';
import { StoreInventoryPage } from './pages/StoreInventoryPage';
import { CustomerRequestsPage } from './pages/CustomerRequestsPage';
import { UnmetDemandPage } from './pages/UnmetDemandPage';
import { SalesAnalyticsPage } from './pages/SalesAnalyticsPage';
import { AisleTrafficPage } from './pages/AisleTrafficPage';
import { CheckoutQueuesPage } from './pages/CheckoutQueuesPage';
import { AIRecommendationsPage } from './pages/AIRecommendationsPage';
import { StoreActionsPage } from './pages/StoreActionsPage';
import { StoreMemoryPage } from './pages/StoreMemoryPage';

// Auth Guard
import { managerService } from './services/managerService';
import { employeeService } from './services/employeeService';

const ManagerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!managerService.isAuthenticated()) {
    return <Navigate to="/manager/login" replace />;
  }
  return <>{children}</>;
};

const EmployeeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!employeeService.isAuthenticated()) {
    return <Navigate to="/employee/login" replace />;
  }
  return <>{children}</>;
};

const GlobalModalsContainer: React.FC<{
  supabaseModalOpen: boolean;
  setSupabaseModalOpen: (o: boolean) => void;
}> = ({ supabaseModalOpen, setSupabaseModalOpen }) => {
  const { isGetStartedModalOpen, setIsGetStartedModalOpen, getStartedInitialRole } = useApp();

  return (
    <>
      {/* Interactive Guided Tour Modal (Section 39) */}
      <DemoTourModal />

      {/* Supabase DB Connection Modal */}
      <SupabaseConfigModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
      />

      {/* Kiosk Customer Identification & WhatsApp Modal */}
      <CustomerAuthModal />

      {/* Permanent Customer Identity QR Modal */}
      <CustomerIdentityQRModal />

      {/* Global Enter Store / Onboarding Portal Modal */}
      <GetStartedModal
        isOpen={isGetStartedModalOpen}
        onClose={() => setIsGetStartedModalOpen(false)}
        initialRole={getStartedInitialRole}
      />

      {/* Emergency Automated Phone Call Modal between JARVIS and Manager */}
      <JarvisEmergencyPhoneCallModal />
    </>
  );
};

export const App: React.FC = () => {
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
          {/* Universal Sticky Navbar */}
          <Navbar onOpenSupabaseModal={() => setSupabaseModalOpen(true)} />

          {/* Global Modals Portal Container */}
          <GlobalModalsContainer
            supabaseModalOpen={supabaseModalOpen}
            setSupabaseModalOpen={setSupabaseModalOpen}
          />

          {/* Route Outlet */}
          <div className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/interaction" element={<InteractionModePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Dedicated Mobile Companion for In-Aisle Guidance */}
              <Route path="/mobile" element={<CustomerMobileDashboard />} />

              {/* Dedicated Physical Store Kiosk Terminal */}
              <Route path="/kiosk" element={<KioskPage />} />

              {/* Dedicated Store Manager Login (Employee ID + DOB or Phone) */}
              <Route path="/manager/login" element={<ManagerLoginPage />} />

              {/* Dedicated Store Manager On-The-Go Mobile Portal */}
              <Route
                path="/manager/mobile"
                element={
                  <ManagerGuard>
                    <ManagerMobileDashboard />
                  </ManagerGuard>
                }
              />

              {/* Dedicated Employee Mobile Login & Operational Console */}
              <Route path="/employee/login" element={<EmployeeLoginPage />} />
              <Route
                path="/employee/dashboard"
                element={
                  <EmployeeGuard>
                    <EmployeeDashboardPage />
                  </EmployeeGuard>
                }
              />

              {/* Customer Routes */}
              <Route path="/customer/home" element={<CustomerHomePage />} />
              <Route path="/customer/assistant" element={<CustomerAssistantPage />} />
              <Route path="/customer/mission" element={<CustomerMissionPage />} />
              <Route path="/customer/products" element={<ProductDiscoveryPage />} />
              <Route path="/customer/products/:id" element={<ProductDetailPage />} />
              <Route path="/customer/availability/:id" element={<RealtimeAvailabilityPage />} />
              <Route path="/customer/map" element={<StoreMapPage />} />
              <Route path="/customer/notifications" element={<NotificationsPage />} />
              <Route path="/customer/cart" element={<CartPage />} />
              <Route path="/customer/checkout" element={<CheckoutPage />} />
              <Route path="/customer/verify" element={<KioskPage isCustomerEmbedded={true} />} />
              <Route path="/customer/preferences" element={<CustomerPreferencesPage />} />
              <Route path="/customer/memory" element={<CustomerMemoryPage />} />

              {/* Store Agent Routes (Protected by ManagerGuard) */}
              <Route
                path="/store/dashboard"
                element={
                  <ManagerGuard>
                    <StoreDashboardPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/inventory"
                element={
                  <ManagerGuard>
                    <StoreInventoryPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/requests"
                element={
                  <ManagerGuard>
                    <CustomerRequestsPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/demand"
                element={
                  <ManagerGuard>
                    <UnmetDemandPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/sales"
                element={
                  <ManagerGuard>
                    <SalesAnalyticsPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/traffic"
                element={
                  <ManagerGuard>
                    <AisleTrafficPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/queues"
                element={
                  <ManagerGuard>
                    <CheckoutQueuesPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/recommendations"
                element={
                  <ManagerGuard>
                    <AIRecommendationsPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/actions"
                element={
                  <ManagerGuard>
                    <StoreActionsPage />
                  </ManagerGuard>
                }
              />
              <Route
                path="/store/memory"
                element={
                  <ManagerGuard>
                    <StoreMemoryPage />
                  </ManagerGuard>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
