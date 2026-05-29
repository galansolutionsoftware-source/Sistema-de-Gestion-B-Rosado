import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', action }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {(title || action) && (
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);
