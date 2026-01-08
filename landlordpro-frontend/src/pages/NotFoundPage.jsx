import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components';
import { AlertTriangle, ChevronLeft, Home, Zap } from 'lucide-react';
import useCurrentUser from '../hooks/useCurrentUser';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isManager } = useCurrentUser();

  const homePath = isAdmin ? '/admin/dashboard' : isManager ? '/manager' : '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden px-4 text-center">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="relative z-10 max-w-2xl px-6">
        {/* Error Code */}
        <div className="relative inline-block mb-12">
          <h1 className="text-[12rem] md:text-[16rem] font-black text-white/5 leading-none tracking-tighter uppercase italic select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center translate-y-4">
            <div className="p-6 bg-gradient-to-tr from-teal-600 to-indigo-600 rounded-[2.5rem] shadow-2xl shadow-teal-500/20 rotate-12 animate-bounce-slow">
              <Zap size={64} className="text-white fill-white/20" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="text-teal-500 text-[10px] font-black uppercase tracking-[0.4em] italic">
              Anomaly Detected // Node Not Found
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tight leading-tight">
              Sector <span className="text-teal-500">Uncharted</span>
            </h2>
          </div>

          <p className="text-slate-500 text-sm md:text-base font-bold italic max-w-lg mx-auto leading-relaxed">
            The coordinates you've provided do not match any authorized nodes in our infrastructure. Return to secure territory immediately.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              className="px-10 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl py-4 font-black uppercase tracking-widest text-[10px] italic transition-all active:scale-95"
              onClick={() => navigate(-1)}
            >
              <div className="flex items-center gap-3">
                <ChevronLeft size={16} />
                <span>Reverse Sector</span>
              </div>
            </Button>
            <Button
              className="px-10 bg-teal-600 hover:bg-teal-500 text-white rounded-xl py-4 font-black uppercase tracking-widest text-[10px] italic transition-all active:scale-95 shadow-2xl"
              onClick={() => navigate(homePath)}
            >
              <div className="flex items-center gap-3">
                <Home size={16} />
                <span>Command Center</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Technical Footer */}
        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
            Trace ID: ERR_404_NODE_VOID // Shield Protocol Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
