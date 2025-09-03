'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface CheckRowProps {
  label: string;
  status: 'passed' | 'failed' | 'pending' | 'error' | null;
  details?: string;
  isCritical?: boolean;
  onOverride?: () => void; // Function to call when override button is clicked
  isOverridden?: boolean; // Whether this check was manually overridden
}

export const CheckRow = ({ label, status, details, isCritical = false, onOverride, isOverridden = false }: CheckRowProps) => {
  const getIcon = () => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
    }
  };

  const getRowStyle = () => {
    if (isCritical) {
      switch (status) {
        case 'passed':
          return 'bg-green-50 border-green-200';
        case 'failed':
          return 'bg-red-50 border-red-200';
        case 'error':
          return 'bg-red-50 border-red-200';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    } else {
      return 'bg-white border-gray-200';
    }
  };

  const getTextStyle = () => {
    switch (status) {
      case 'passed':
        return 'text-green-800';
      case 'failed':
        return isCritical ? 'text-red-800' : 'text-red-600';
      case 'error':
        return 'text-red-800';
      case 'pending':
        return 'text-yellow-800';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'passed':
        return 'Passed';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'error':
        return 'Error';
      default:
        return 'Not checked';
    }
  };

  return (
    <div className={`flex items-start space-x-3 p-3 rounded-lg border ${getRowStyle()}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${getTextStyle()}`}>
            {label}
            {isCritical && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                Critical
              </span>
            )}
            {isOverridden && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                Overridden
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${getTextStyle()}`}>
              {getStatusText()}
            </span>
            {onOverride && status === 'failed' && isCritical && (
              <button
                onClick={onOverride}
                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                title="Override this check to mark it as passed"
              >
                Override
              </button>
            )}
          </div>
        </div>
        
        {details && (
          <p className="text-xs text-gray-600 mt-1">
            {details}
          </p>
        )}
      </div>
    </div>
  );
};