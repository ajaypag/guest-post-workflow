'use client';

import React from 'react';
import { X, AlertTriangle, CheckCircle, FileText, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface UnusedItem {
  id: string;
  status: string;
  hasAssignedDomain: boolean;
  targetPageUrl?: string;
  clientName?: string;
}

interface InvoiceGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  totalRequested: number;
  totalAssigned: number;
  unusedCount: number;
  unusedItems: UnusedItem[];
  isProcessing?: boolean;
}

export default function InvoiceGenerationModal({
  isOpen,
  onClose,
  onProceed,
  totalRequested,
  totalAssigned,
  unusedCount,
  unusedItems,
  isProcessing = false
}: InvoiceGenerationModalProps) {
  if (!isOpen) return null;

  // Group unused items by issue type
  const noSiteAssigned = unusedItems.filter(item => !item.hasAssignedDomain);
  const pendingReview = unusedItems.filter(item => item.hasAssignedDomain && (item.status === 'pending' || item.status === 'draft'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Invoice Generation Notice</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Some line items need attention before invoicing
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isProcessing}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-2">Order Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Requested:</span>
                    <p className="font-semibold text-blue-900">{totalRequested} links</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Ready to invoice:</span>
                    <p className="font-semibold text-green-700">{totalAssigned} links</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Issues found:</span>
                    <p className="font-semibold text-orange-600">{unusedCount} links</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4">
            {/* No Site Assigned */}
            {noSiteAssigned.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">No Site Assigned ({noSiteAssigned.length})</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      These line items don't have domains assigned yet
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {noSiteAssigned.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm pl-7">
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700">
                        {item.targetPageUrl ? (
                          <>Target: {item.targetPageUrl}</>
                        ) : (
                          <>Placeholder line item</>
                        )}
                        {item.clientName && <span className="text-gray-500 ml-2">({item.clientName})</span>}
                      </span>
                    </div>
                  ))}
                  {noSiteAssigned.length > 5 && (
                    <div className="text-sm text-gray-500 pl-7">
                      ... and {noSiteAssigned.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Review */}
            {pendingReview.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Pending Review ({pendingReview.length})</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      These sites are assigned but not yet reviewed
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {pendingReview.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm pl-7">
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700">
                        {item.targetPageUrl || 'No target URL'}
                        {item.clientName && <span className="text-gray-500 ml-2">({item.clientName})</span>}
                      </span>
                    </div>
                  ))}
                  {pendingReview.length > 5 && (
                    <div className="text-sm text-gray-500 pl-7">
                      ... and {pendingReview.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Solution Box */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 mb-2">How we'll handle this</h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• We'll automatically cancel the {unusedCount} problematic line items</li>
                  <li>• Your invoice will be generated for {totalAssigned} approved sites only</li>
                  <li>• Cancelled items won't affect your billing</li>
                  <li>• You can add more sites later if needed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> This action helps ensure smooth payment processing. 
              Cancelled items are marked for your records and can be reviewed later if needed.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Invoice will include <strong className="text-gray-900">{totalAssigned} sites</strong>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Go Back & Review
              </button>
              <button
                onClick={onProceed}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Proceed with {totalAssigned} Sites
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}