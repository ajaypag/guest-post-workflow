'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface StatusToggleProps {
  included: boolean;
  onToggle: (included: boolean) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function StatusToggle({
  included,
  onToggle,
  disabled = false,
  className = ''
}: StatusToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    if (disabled || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await onToggle(!included);
    } catch (error) {
      console.error('Failed to update inclusion status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const buttonClass = included
    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:border-green-400 hover:shadow-md active:scale-95'
    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 hover:border-gray-400 hover:shadow-md active:scale-95';

  const Icon = included ? Check : X;
  const label = included ? 'Included' : 'Excluded';

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isUpdating}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border-2 rounded-md cursor-pointer
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
        ${buttonClass} ${className}
      `}
      title={`Click to ${included ? 'exclude' : 'include'} this item`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span className={isUpdating ? 'opacity-50' : ''}>{label}</span>
    </button>
  );
}