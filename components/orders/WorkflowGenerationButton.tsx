'use client';

import React, { useState } from 'react';
import { Loader2, Zap, AlertCircle, CheckCircle } from 'lucide-react';

interface WorkflowGenerationResult {
  success: boolean;
  workflowsCreated: number;
  orderItemsCreated: number;
  errors: string[];
}

interface WorkflowGenerationButtonProps {
  order?: { id: string };
  orderId?: string;
  orderGroupId?: string;
  isPaid?: boolean;
  skipPaymentCheck?: boolean;
  onComplete?: (result: WorkflowGenerationResult) => void;
  onSuccess?: () => void;
  className?: string;
}

export default function WorkflowGenerationButton({
  order,
  orderId: orderIdProp,
  orderGroupId,
  isPaid = false,
  skipPaymentCheck = false,
  onComplete,
  onSuccess,
  className = ''
}: WorkflowGenerationButtonProps) {
  const orderId = order?.id || orderIdProp;
  
  if (!orderId) {
    throw new Error('Either order or orderId must be provided');
  }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateWorkflows = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = orderGroupId 
        ? `/api/orders/${orderId}/groups/${orderGroupId}/generate-workflows`
        : `/api/orders/${orderId}/generate-workflows`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skipPaymentCheck: skipPaymentCheck || false,
          autoAssign: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workflows');
      }

      setResult(data);
      if (onComplete) {
        onComplete(data);
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error generating workflows:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show result for 5 seconds after generation
  if (result && !loading) {
    setTimeout(() => setResult(null), 5000);
  }

  return (
    <div className="relative">
      <button
        onClick={generateWorkflows}
        disabled={loading || (!isPaid && !skipPaymentCheck)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 
          ${!isPaid && !skipPaymentCheck ? 'bg-gray-400' : 'bg-purple-600'} text-white rounded-lg
          ${!isPaid && !skipPaymentCheck ? '' : 'hover:bg-purple-700'} transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={!isPaid && !skipPaymentCheck ? 'Order must be paid before generating workflows' : ''}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Workflows...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            {!isPaid && !skipPaymentCheck ? 'Awaiting Payment' : 'Generate Workflows'}
          </>
        )}
      </button>

      {/* Result notification */}
      {result && (
        <div className={`
          absolute top-full mt-2 left-0 right-0 p-3 rounded-lg shadow-lg
          ${result.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}
          min-w-[300px] z-50
        `}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${result.success ? 'text-green-800' : 'text-yellow-800'}`}>
                {result.success ? 'Workflows generated successfully!' : 'Completed with warnings'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Created {result.workflowsCreated} workflow{result.workflowsCreated !== 1 ? 's' : ''} and{' '}
                {result.orderItemsCreated} order item{result.orderItemsCreated !== 1 ? 's' : ''}
              </p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-800">Issues:</p>
                  <ul className="text-sm text-yellow-700 mt-1 space-y-0.5">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-xs">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg min-w-[300px] z-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}