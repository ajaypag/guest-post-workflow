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

  // Always show the selection summary to make functionality discoverable

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-40">
      {/* Summary Bar */}
      <div className="px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Top: Selection Info */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="bg-blue-50 px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex-1 sm:flex-initial">
              <div className="text-xs sm:text-sm font-medium text-blue-900">
                {selectedCount === 0 ? 'Select domains to create orders' : `${selectedCount} ${selectedCount === 1 ? 'domain' : 'domains'} selected`}
              </div>
              <div className="text-base sm:text-lg font-semibold text-blue-600">
                {selectedCount === 0 ? 'Start by selecting checkboxes' : `$${totalPrice.toFixed(0)}`}
                {userType !== 'internal' && selectedCount > 0 && <span className="text-xs font-normal text-blue-500 ml-1">(retail)</span>}
              </div>
            </div>
            
            {/* Expand/Collapse Button - only show when domains are selected */}
            {selectedCount > 0 && (
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
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Primary actions - always visible */}
            {onCreateOrder && (
              <button
                onClick={onCreateOrder}
                disabled={selectedCount === 0}
                className={`px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  selectedCount === 0 
                    ? 'text-gray-400 bg-gray-200 cursor-not-allowed' 
                    : 'text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md focus:ring-blue-500'
                }`}
              >
                Create
              </button>
            )}
            
            {onAddToOrder && (
              <button
                onClick={onAddToOrder}
                disabled={selectedCount === 0}
                className={`px-2 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  selectedCount === 0 
                    ? 'text-gray-400 bg-gray-200 cursor-not-allowed' 
                    : 'text-white bg-green-600 hover:bg-green-700 hover:shadow-md focus:ring-green-500'
                }`}
              >
                Add
              </button>
            )}
            
            {/* Secondary actions - only when selected */}
            {onExport && selectedCount > 0 && (
              <button
                onClick={onExport}
                className="hidden sm:flex px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Export
              </button>
            )}
            
            {selectedCount > 0 && (
              <button
                onClick={onClearSelection}
                className="px-2 py-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all focus:outline-none"
              >
                ×
              </button>
            )}
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