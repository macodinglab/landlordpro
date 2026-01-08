import React from 'react';

const Input = React.forwardRef(({ label, type = 'text', className = '', error = '', icon: Icon, ...props }, ref) => {
  return (
    <div className={`space-y-3 group/input ${className}`}>
      {label && (
        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] italic ml-1 group-focus-within/input:text-teal-500 transition-colors">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/input:text-teal-500 transition-colors pointer-events-none">
            <Icon size={20} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full ${Icon ? 'pl-16' : 'px-6'} py-5 rounded-[1.5rem] 
            bg-slate-50 dark:bg-gray-800/50 
            border-2 border-transparent
            text-gray-950 dark:text-white font-bold italic tracking-tight
            placeholder-gray-300 dark:placeholder-gray-700
            transition-all duration-300 outline-hidden
            ${error
              ? 'border-rose-500/50 bg-rose-50/30 dark:bg-rose-950/20'
              : 'focus:border-teal-500/50 focus:bg-white dark:focus:bg-gray-800/80 focus:shadow-[0_0_30px_-10px_rgba(20,184,166,0.3)] hover:bg-slate-100 dark:hover:bg-gray-800/60 shadow-inner'
            } 
          `}
          {...props}
        />
        {error && (
          <div className="absolute top-1/2 -translate-y-1/2 right-6 pointer-events-none animate-fade-in">
            <span className="text-[9px] font-black text-rose-500 uppercase italic tracking-widest bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800">Error Isolated</span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-rose-500 italic uppercase tracking-wider ml-1 animate-slide-up">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;