import React from 'react';
import { X, Shield, Activity } from 'lucide-react';

const Modal = ({ title, children, onClose, onSubmit, className = '' }) => {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop with extreme blur and technical overlay */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xl animate-fade-in"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_70%)] opacity-50"></div>
      </div>

      {/* Modal Container */}
      <div
        className={`relative w-full ${className} bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10 overflow-hidden animate-zoom-in group/modal`}
      >
        {/* Technical Header Stripe */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-violet-600 via-indigo-500 to-violet-600 opacity-50"></div>

        {/* Modal Header */}
        <div className="relative px-8 md:px-12 pt-10 pb-6 flex justify-between items-start border-b border-gray-100 dark:border-white/5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-black text-violet-500 uppercase tracking-[0.3em] italic">
              <Activity size={12} className="animate-pulse" /> Command Console
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-950 dark:text-white tracking-tighter uppercase italic leading-none">{title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 text-gray-400 rounded-2xl transition-all duration-300 hover:rotate-90 active:scale-95 shadow-sm group/close"
          >
            <X size={20} className="group-hover/close:scale-110" />
          </button>
        </div>

        {/* Modal Content - Scrollable with custom scrollbar */}
        <div className="relative px-8 md:px-12 py-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Modal Footer */}
        <div className="relative px-8 md:px-12 py-8 flex flex-col sm:flex-row justify-end gap-4 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
          <button
            onClick={onClose}
            className="px-10 py-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 italic"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="group/save relative px-12 py-5 bg-violet-600 hover:bg-violet-700 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-violet-500/20 transition-all hover:scale-105 active:scale-95 overflow-hidden italic"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Shield size={16} className="group-hover/save:rotate-12 transition-transform" />
              Save
            </span>
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/save:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
