import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Boxes,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { managerService } from '../services/managerService';
import { StoreAgentResponse, StructuredRecommendation } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: Array<{ tool_name: string; success: boolean }>;
  recommendations?: StructuredRecommendation[];
  suggestedActions?: Array<{ label: string; action: string; recommendationId?: string; payload?: any }>;
  timestamp: string;
}

export const StoreAgentChat: React.FC = () => {
  const { refreshData, approveRecommendation } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello Manager. I am your Store Intelligence Agent. I continuously observe inventory levels, sales velocity, unfulfilled customer demand, and checkout queues across Branch #104. How can I assist your operations today?",
      suggestedActions: [
        { label: "Which products are low on stock?", action: "query_low_stock" },
        { label: "Which products are out of stock?", action: "query_stockouts" },
        { label: "Show unfulfilled demand", action: "query_unmet_demand" },
        { label: "What is today's sales summary?", action: "query_sales" },
        { label: "Generate restock recommendations", action: "generate_recs" }
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const manager = managerService.getCurrentManager();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/store-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          managerId: manager?.employee_id || 'EMP-1042',
          history
        })
      });

      const data: StoreAgentResponse = await response.json();

      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: data.message || "I've analyzed the operational store data.",
        tools: data.toolExecutions?.map(t => ({ tool_name: t.tool_name, success: t.success })),
        recommendations: data.recommendations,
        suggestedActions: data.suggestedActions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
      refreshData();
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Store Agent error: ${err?.message || 'Unable to communicate with store intelligence service.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = async (action: { label: string; action: string; recommendationId?: string; payload?: any }) => {
    if (action.action === 'approve_recommendation' && action.recommendationId) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/store-agent/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            recommendationId: action.recommendationId,
            managerName: manager?.name || 'Store Manager'
          })
        });
        const data = await res.json();
        if (data.success) {
          setActionNotice(`Approved recommendation: ${action.label}`);
          refreshData();
          setMessages(prev => [
            ...prev,
            {
              id: `act-${Date.now()}`,
              role: 'assistant',
              content: `Action executed: ${data.result?.description || 'Operational action dispatched.'} Store state and inventory movement have been recorded in the store ledger.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } catch (e: any) {
        setActionNotice(`Action failed: ${e.message}`);
      } finally {
        setIsLoading(false);
        setTimeout(() => setActionNotice(null), 4000);
      }
      return;
    }

    if (action.action.startsWith('query_') || action.action === 'generate_recs') {
      handleSendMessage(action.label);
      return;
    }

    // Generic query trigger
    handleSendMessage(action.label);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Store Intelligence Agent</h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                GROQ LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Branch #104 Autonomous Supervisory Co-Pilot</p>
          </div>
        </div>

        {manager && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{manager.name} ({manager.employee_id})</span>
          </div>
        )}
      </div>

      {actionNotice && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] space-y-2.5 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white font-medium rounded-tr-sm ml-auto shadow-md'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm shadow-sm'
                }`}
              >
                <p className="whitespace-pre-line">{m.content}</p>

                {/* Tool Executions Pills */}
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Tools Executed:</span>
                    {m.tools.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-900 border border-emerald-500/30 text-emerald-400 font-mono px-2 py-0.5 rounded-md flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {t.tool_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons if provided */}
              {m.suggestedActions && m.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {m.suggestedActions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => handleExecuteAction(act)}
                      disabled={isLoading}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-medium transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{act.label}</span>
                      <ChevronRight className="w-3 h-3 text-emerald-400" />
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-500 block px-1">{m.timestamp}</span>
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-sm text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Analyzing store telemetry & executing backend tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Store Agent: 'Which products are low on stock?', 'Show unfulfilled demand'..."
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-md shadow-emerald-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
