import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

interface AgentAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
  isListening?: boolean;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  size = 'md',
  isSpeaking = false,
  isListening = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-lg',
  };

  return (
    <div className="relative inline-block select-none">
      <div
        className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 relative group transition-all`}
      >
        <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center overflow-hidden relative">
          {/* Avatar representation */}
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80"
            alt="GrocerAI Assistant"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
        </div>
      </div>

      {/* Online / Active Indicator */}
      <span
        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
          isListening
            ? 'bg-amber-400 animate-ping'
            : isSpeaking
            ? 'bg-emerald-400 animate-bounce'
            : 'bg-emerald-500'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-white" />
      </span>
    </div>
  );
};
