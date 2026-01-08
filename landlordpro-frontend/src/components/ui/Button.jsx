import React from 'react';

const Button = ({ children, variant = 'primary', className = '', disabled = false, ...props }) => {
  const baseStyles = 'w-full px-8 py-4 px-10 py-5 font-black uppercase text-[11px] tracking-widest italic rounded-[1.5rem] transition-all duration-300 focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xl relative overflow-hidden group/btn';

  const variants = {
    primary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/20 hover:shadow-teal-500/40 border-transparent',
    outline: 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-teal-500/50 hover:text-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/50',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-teal-500',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 hover:shadow-rose-500/40',
    google: 'bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-rose-500/30',
    facebook: 'bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-500/30',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
    </button>
  );
};

export default Button;