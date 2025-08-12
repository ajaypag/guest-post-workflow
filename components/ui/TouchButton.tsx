'use client';

import React from 'react';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses = {
  // Ensure minimum 44px touch target height on all sizes
  sm: 'px-3 py-2.5 text-sm min-h-[44px]', // 44px minimum height
  md: 'px-4 py-3 text-sm min-h-[44px]',   // 48px typical height
  lg: 'px-6 py-3.5 text-base min-h-[44px]' // 52px typical height
};

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300',
  ghost: 'text-gray-700 hover:bg-gray-100 disabled:text-gray-400'
};

export default function TouchButton({
  size = 'md',
  variant = 'primary',
  fullWidth = false,
  icon,
  children,
  className = '',
  disabled = false,
  ...props
}: TouchButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium rounded-md transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        touch-manipulation
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// Export a link variant that looks like a button but uses an anchor tag
export function TouchLink({
  href,
  size = 'md',
  variant = 'primary',
  fullWidth = false,
  icon,
  children,
  className = '',
  ...props
}: {
  href: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <a
      href={href}
      className={`
        inline-flex items-center justify-center font-medium rounded-md transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        touch-manipulation
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      {children}
    </a>
  );
}