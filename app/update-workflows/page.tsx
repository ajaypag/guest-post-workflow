'use client';

import { useState } from 'react';
import { updateAllWorkflowsWithNewSteps } from '@/lib/update-workflows';
import { Check, RefreshCw } from 'lucide-react';

export default function UpdateWorkflows() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setError(null);
    setUpdateResult(null);

    try {
      const count = updateAllWorkflowsWithNewSteps();
      setUpdateResult(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Update Workflows</h1>
        
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Click below to update all existing workflows with the new Email Template step.
          </p>

          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Update Workflows
              </>
            )}
          </button>

          {updateResult !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ Updated {updateResult} workflow{updateResult !== 1 ? 's' : ''} successfully!
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">❌ Error: {error}</p>
            </div>
          )}

          <div className="pt-4">
            <a 
              href="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to Workflows
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}