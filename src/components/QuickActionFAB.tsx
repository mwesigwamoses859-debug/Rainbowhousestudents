import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  UserPlus, 
  GraduationCap, 
  CreditCard, 
  Zap, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface QuickActionFABProps {
  onAddStudent: () => void;
  onRegisterMark: () => void;
  onGenerateIdCard: () => void;
}

export default function QuickActionFAB({
  onAddStudent,
  onRegisterMark,
  onGenerateIdCard
}: QuickActionFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close FAB menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (actionFn: () => void) => {
    setIsOpen(false);
    actionFn();
  };

  return (
    <div ref={fabRef} className="fixed bottom-20 md:bottom-8 right-6 z-50 no-print">
      {/* Speed dial action options menu */}
      {isOpen && (
        <div className="flex flex-col items-end space-y-3 mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Quick Header Label */}
          <div className="bg-slate-900/90 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur-md uppercase tracking-wider flex items-center gap-1.5 border border-slate-700/50">
            <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
            <span>Quick Action Hub</span>
          </div>

          {/* 1. Add Student */}
          <button
            onClick={() => handleAction(onAddStudent)}
            className="group flex items-center gap-3 bg-white hover:bg-indigo-600 text-slate-800 hover:text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 hover:border-indigo-600 transition-all duration-200 cursor-pointer transform hover:-translate-x-1"
          >
            <div className="text-right">
              <div className="text-xs font-black tracking-tight group-hover:text-white text-slate-900">
                Add Student
              </div>
              <div className="text-[10px] text-slate-400 group-hover:text-indigo-100 font-medium">
                Register pupil profile
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 group-hover:bg-white/20 text-indigo-600 group-hover:text-white rounded-xl flex items-center justify-center shrink-0 transition-colors">
              <UserPlus className="h-5 w-5" />
            </div>
          </button>

          {/* 2. Register Mark */}
          <button
            onClick={() => handleAction(onRegisterMark)}
            className="group flex items-center gap-3 bg-white hover:bg-emerald-600 text-slate-800 hover:text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 hover:border-emerald-600 transition-all duration-200 cursor-pointer transform hover:-translate-x-1"
          >
            <div className="text-right">
              <div className="text-xs font-black tracking-tight group-hover:text-white text-slate-900">
                Register Mark
              </div>
              <div className="text-[10px] text-slate-400 group-hover:text-emerald-100 font-medium">
                Enter BOT / MOT / EOT
              </div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 group-hover:bg-white/20 text-emerald-600 group-hover:text-white rounded-xl flex items-center justify-center shrink-0 transition-colors">
              <GraduationCap className="h-5 w-5" />
            </div>
          </button>

          {/* 3. Generate ID Card */}
          <button
            onClick={() => handleAction(onGenerateIdCard)}
            className="group flex items-center gap-3 bg-white hover:bg-amber-500 text-slate-800 hover:text-slate-950 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 hover:border-amber-500 transition-all duration-200 cursor-pointer transform hover:-translate-x-1"
          >
            <div className="text-right">
              <div className="text-xs font-black tracking-tight group-hover:text-slate-950 text-slate-900">
                Generate ID Card
              </div>
              <div className="text-[10px] text-slate-400 group-hover:text-slate-800 font-medium">
                Print pupil IDs & certificates
              </div>
            </div>
            <div className="h-10 w-10 bg-amber-50 group-hover:bg-slate-950/20 text-amber-600 group-hover:text-slate-950 rounded-xl flex items-center justify-center shrink-0 transition-colors">
              <CreditCard className="h-5 w-5" />
            </div>
          </button>
        </div>
      )}

      {/* Primary Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative group flex items-center justify-center h-14 w-14 rounded-full shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95 ${
          isOpen 
            ? 'bg-slate-900 text-white rotate-45 ring-4 ring-slate-400/30' 
            : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-amber-500 text-white hover:shadow-indigo-500/30 ring-4 ring-indigo-500/20'
        }`}
        title="Quick Actions"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <Zap className="h-6 w-6 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white"></span>
            </span>
          </>
        )}
      </button>
    </div>
  );
}
