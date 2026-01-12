import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      {title && <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">{title}</h3>}
      {children}
    </div>
  );
};
