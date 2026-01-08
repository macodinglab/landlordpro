// ============================================
// components/Card.jsx
// ============================================
import React from 'react';

const Card = ({ children, className = '', hover = true, ...props }) => {
  return (
    <div
      className={`
        bg-white dark:bg-slate-900/40 
        backdrop-blur-sm
        border border-slate-100 dark:border-gray-700/50 
        rounded-[1.5rem] 
        shadow-sm
        transition-all duration-300 
        ${hover ? 'hover:border-gray-600/50 hover:shadow-md' : ''} 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;