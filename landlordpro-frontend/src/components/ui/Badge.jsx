// components/Badge.jsx
import React from 'react';

const Badge = ({ className = '', text, ...props }) => {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-widest border border-current shadow-sm ${className}`}
      {...props}
    >
      {text}
    </span>
  );
};

export default Badge;