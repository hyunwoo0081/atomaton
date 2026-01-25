import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div 
      className={`
        bg-[rgba(255,255,255,0.05)] 
        border border-white/10 
        backdrop-blur-xl 
        shadow-2xl 
        rounded-[32px] 
        p-6 
        text-white
        ${className}
      `}
    >
      {title && <h3 className="text-xl font-bold leading-6 text-white mb-4">{title}</h3>}
      {children}
    </div>
  );
};
