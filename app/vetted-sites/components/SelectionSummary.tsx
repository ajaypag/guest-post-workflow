'use client';

import React, { useState } from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { SelectedDomain } from '../hooks/useSelection';

interface SelectionSummaryProps {
  selectedCount: number;
  totalPrice: number;
  selectedDomains: SelectedDomain[];
  onClearSelection: () => void;
  onRemoveDomain: (domainId: string) => void;
  onCreateOrder?: () => void;
  onExport?: () => void;
  onAddToOrder?: () => void;
  userType: 'internal' | 'account' | 'publisher';
}

export default function SelectionSummary({
  selectedCount,
  totalPrice,
  selectedDomains,
  onClearSelection,
  onRemoveDomain,
  onCreateOrder,
  onExport,
  onAddToOrder,
  userType
}: SelectionSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-40">
      {/* Summary Bar */}
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          {/* Left: Selection Info */}
          <div className="flex items-center space-x-4">
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <div className="text-sm font-medium text-blue-900">
                {selectedCount} {selectedCount === 1 ? 'domain' : 'domains'} selected
              </div>
              <div className="text-lg font-semibold text-blue-600">
                ${totalPrice.toFixed(0)}
                {userType !== 'internal' && <span className="text-xs font-normal text-blue-500 ml-1">(retail)</span>}
              </div>
            </div>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-5 w-5" />
              ) : (
                <ChevronUpIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {onExport && (
              <button
                onClick={onExport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export
              </button>
            )}
            
            {onAddToOrder && (
              <button
                onClick={onAddToOrder}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Add to Order
              </button>
            )}
            
            {onCreateOrder && (
              <button
                onClick={onCreateOrder}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Order
              </button>
            )}
            
            <button
              onClick={onClearSelection}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all focus:outline-none"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Domain List */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white max-h-64 overflow-y-auto">
          <div className="px-4 py-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {selectedDomains.map((domain) => (
                <div
                  key={domain.id}
                  className="group flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {domain.domain}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${domain.price.toFixed(0)} • {domain.clientName}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveDomain(domain.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label={`Remove ${domain.domain}`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile-friendly indicator */}
      {!isExpanded && selectedCount > 0 && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-t-lg shadow-md">
            {selectedCount} selected
          </div>
        </div>
      )}
    </div>
  );
}