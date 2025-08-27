'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface ActionColumnToggleProps {
  // Inclusion status
  included: boolean;
  onToggle: (included: boolean) => Promise<void>;
  
  // State information
  status?: string;
  state?: string;
  
  // Permissions and styling
  canChangeStatus?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function ActionColumnToggle({
  included,
  onToggle,
  status = 'draft',
  state,
  canChangeStatus = true,
  disabled = false,
  className = ''
}: ActionColumnToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    if (disabled || isUpdating || !canChangeStatus) return;
    
    setIsUpdating(true);
    try {
      await onToggle(!included);
    } catch (error) {
      console.error('Failed to update inclusion status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Format status display
  const getStatusLabel = () => {
    switch (status) {
      case 'active': return 'Active';
      case 'draft': return 'Draft';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
    }
  };

  // Format state comment 
  const getStateComment = () => {
    if (state) return state;
    if (status === 'draft') return 'Ready';
    if (status === 'active') return 'In Progress';
    if (status === 'pending') return 'Awaiting';
    return '';
  };

  const toggleButtonClass = included
    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 hover:border-green-400 hover:shadow-md active:scale-95'
    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200 hover:border-gray-400 hover:shadow-md active:scale-95';

  const Icon = included ? Check : X;
  const toggleLabel = included ? 'Included' : 'Excluded';

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Toggle Button */}
      {canChangeStatus ? (
        <button
          onClick={handleToggle}
          disabled={disabled || isUpdating}
          className={`
            inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border-2 rounded-md cursor-pointer
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
            ${toggleButtonClass} w-full justify-center
          `}
          title={`Click to ${included ? 'exclude' : 'include'} this item`}
        >
          <Icon className="h-3 w-3 flex-shrink-0" />
          <span className={isUpdating ? 'opacity-50' : ''}>{toggleLabel}</span>
        </button>
      ) : (
        <div className={`
          inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md w-full justify-center
          ${toggleButtonClass}
        `}>
          <Icon className="h-3 w-3 flex-shrink-0" />
          <span>{toggleLabel}</span>
        </div>
      )}

      {/* Status Description */}
      <div className="text-xs text-center">
        <div className={`inline-flex px-1 py-0.5 rounded ${
          status === 'active' ? 'bg-green-100 text-green-700' :
          status === 'draft' ? 'bg-gray-100 text-gray-700' :
          status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          status === 'cancelled' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {getStatusLabel()}
        </div>
      </div>

      {/* State Comment */}
      {getStateComment() && (
        <div className="text-xs text-gray-500 text-center truncate">
          {getStateComment()}
        </div>
      )}
    </div>
  );
}