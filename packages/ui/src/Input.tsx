import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col mb-4 w-full">
      {label && <label className="mb-2 text-sm font-medium text-white/80">{label}</label>}
      <input
        className={`
          px-4 py-3 
          bg-white/5 
          border border-white/10 
          rounded-xl 
          text-white 
          placeholder-white/30 
          focus:outline-none 
          focus:ring-2 
          focus:ring-[#8A3FFC] 
          focus:border-transparent 
          transition-all 
          duration-200
          ${className}
        `}
        {...props}
      />
    </div>
  );
};
