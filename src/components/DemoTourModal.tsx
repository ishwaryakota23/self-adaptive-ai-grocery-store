import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Bot,
  Store,
  Compass,
  MapPin,
  Bell,
  TrendingDown,
  CheckCircle2,
  RefreshCw,
  GitCommit,
  BrainCircuit,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DemoTourModal: React.FC = () => {
  const { isDemoTourOpen, setIsDemoTourOpen, setRole, approveRecommendation, restockProduct } = useApp();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isDemoTourOpen) return null;

  const steps = [
    {
      title: '1. Customer Asks For a Product',
      agent: 'Customer Agent',
      icon: Bot,
      route: '/customer/assistant?mode=voice',
      role: 'CUSTOMER' as const,
      description: 'Customer taps the voice mic or types: "I need paneer and ingredients for pasta night."',
      actionLabel: 'Go to Voice Assistant',
      details: 'The Customer Agent interprets natural language, recognizes the product intent, and checks real-time inventory.'
    },
    {
      title: '2. Agent Checks Real-Time Availability',
      agent: 'Customer Agent',
      icon: RefreshCw,
      route: '/customer/availability/prod-paneer',
      role: 'CUSTOMER' as const,
      description: 'System checks shelf inventory in Aisle 4. Notice that Paneer is currently 0 in stock (stockout).',
      actionLabel: 'View Availability Details',
      details: 'Shows shelf camera view, price trends, and live stock count synced with physical sensors.'
    },
    {
      title: '3. Shopping Mission Updates',
      agent: 'Customer Agent',
      icon: Compass,
      route: '/customer/mission',
      role: 'CUSTOMER' as const,
      description: 'The "Pasta Night Mission" automatically updates with item statuses, locations, and missing ingredients.',
      actionLabel: 'View Shopping Mission',
      details: 'Customer sees 4/6 items found with progress bar, aisle markers, and "Find in store" buttons.'
    },
    {
      title: '4. Customer Navigates to Product',
      agent: 'Customer Agent',
      icon: MapPin,
      route: '/customer/map?product=prod-paneer',
      role: 'CUSTOMER' as const,
      description: 'Interactive 2.5D store map plots the shortest route from entrance to Dairy Section, Aisle 4.',
      actionLabel: 'Open Store Navigation',
      details: 'Displays walking distance (~150m), estimated time (2 mins), and animated path beads.'
    },
    {
      title: '5. Agent Proactively Checks Found Status',
      agent: 'Customer Agent',
      icon: Bell,
      route: '/customer/notifications',
      role: 'CUSTOMER' as const,
      description: 'Proactive notification arrives: "Did you find the paneer? It\'s available in Dairy, Aisle 4."',
      actionLabel: 'View Proactive Notifications',
      details: 'Supports audio read-out, map deep link, and one-tap "Mark Found" confirmation.'
    },
    {
      title: '6. Product Stockout Detected',
      agent: 'Store & Customer Agent',
      icon: TrendingDown,
      route: '/store/inventory',
      role: 'STORE_MANAGER' as const,
      description: 'Customer requests out-of-stock Paneer. The system records an unmet demand event in the inventory log.',
      actionLabel: 'Inspect Store Inventory',
      details: 'Shelf sensors alert that stock is 0 packs with 28 pending customer requests.'
    },
    {
      title: '7. Agent Suggests Smart Alternative',
      agent: 'Customer Agent',
      icon: Sparkles,
      route: '/customer/products/prod-tofu',
      role: 'CUSTOMER' as const,
      description: 'Customer Agent recommends Silken Organic Tofu (Aisle 4) as a high-protein vegetarian substitute.',
      actionLabel: 'View Alternative Product',
      details: 'Adapts to customer dietary preferences (Vegetarian & High-Protein) learned from profile.'
    },
    {
      title: '8. Store Agent Detects Unmet Demand',
      agent: 'Store Agent',
      icon: TrendingDown,
      route: '/store/demand',
      role: 'STORE_MANAGER' as const,
      description: 'Store Agent flags Paneer as High Unmet Demand with 28 requests and 0 stock.',
      actionLabel: 'Open Unmet Demand Screen',
      details: 'Correlates customer voice/chat searches with physical inventory gaps.'
    },
    {
      title: '9. Store Agent Recommends Restocking',
      agent: 'Store Agent',
      icon: Bot,
      route: '/store/recommendations',
      role: 'STORE_MANAGER' as const,
      description: 'AI generates operational recommendation: "Restock 50 packs Paneer (Confidence: 94%, Impact: +45% sales)".',
      actionLabel: 'View AI Recommendations',
      details: 'Backed by historical evidence: "Paneer restocking previously increased sales by 38% on weekends."'
    },
    {
      title: '10. Manager Approves Operational Action',
      agent: 'Store Manager & Agent',
      icon: CheckCircle2,
      route: '/store/actions',
      role: 'STORE_MANAGER' as const,
      description: 'Store manager clicks "Approve". Action is dispatched to floor staff and autonomous replenishment robots.',
      actionLabel: 'Simulate Approval & Restock',
      details: 'Manager approves; store state automatically dispatches operational workflow.',
      onExecute: () => {
        approveRecommendation('rec-1');
        restockProduct('prod-paneer', 50);
      }
    },
    {
      title: '11. Store State Adapts Dynamically',
      agent: 'Store Agent',
      icon: RefreshCw,
      route: '/customer/availability/prod-paneer',
      role: 'CUSTOMER' as const,
      description: 'Paneer inventory immediately reflects 50 packs in stock! In-store displays and customer apps sync in real time.',
      actionLabel: 'Check Updated Stock',
      details: 'Inventory status flips from "out_of_stock" to "in_stock".'
    },
    {
      title: '12. Action Outcome Recorded in Memory',
      agent: 'Self-Adaptive Loop',
      icon: GitCommit,
      route: '/store/actions',
      role: 'STORE_MANAGER' as const,
      description: 'System re-observes: 42 packs sold, +26% sales surge, 0 missed queries. Outcome is saved to Hindsight.',
      actionLabel: 'View Closed-Loop Timeline',
      details: 'Completes the OBSERVE -> REMEMBER -> REASON -> ACT -> RE-OBSERVE -> LEARN cycle!'
    },
    {
      title: '13. Future Personalized Customer Experience',
      agent: 'Customer Agent',
      icon: BrainCircuit,
      route: '/customer/home',
      role: 'CUSTOMER' as const,
      description: 'Next visit: Customer is welcomed back with proactive pasta night lists and personalized brand affinity.',
      actionLabel: 'View Future Personalized Hub',
      details: 'Agent remembers customer preferences (Amul brand affinity, Italian cuisine) and provides instant smart suggestions.'
    }
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExecuteAndNavigate = () => {
    if (step.onExecute) {
      step.onExecute();
    }
    setRole(step.role);
    navigate(step.route);
    setIsDemoTourOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">GrocerAI 13-Step Guided Tour</h3>
              <p className="text-xs text-slate-400">Section 39 Self-Adaptive AI Verification</p>
            </div>
          </div>
          <button
            onClick={() => setIsDemoTourOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <step.icon className="w-3.5 h-3.5" />
              {step.agent}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">{step.title}</h2>

          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800">
            {step.description}
          </p>

          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 text-xs text-slate-300">
            <span className="font-semibold text-emerald-400">System Behavior: </span>
            {step.details}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                currentStep === 0
                  ? 'text-slate-600 bg-slate-900 cursor-not-allowed'
                  : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                currentStep === steps.length - 1
                  ? 'text-slate-600 bg-slate-900 cursor-not-allowed'
                  : 'text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExecuteAndNavigate}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>{step.actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
