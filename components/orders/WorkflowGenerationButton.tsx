'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Zap, AlertCircle, CheckCircle, User, X } from 'lucide-react';
import { AuthService } from '@/lib/auth';
import { userStorage } from '@/lib/userStorage';
import { User as UserType } from '@/types/user';

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
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [users, setUsers] = useState<UserType[]>([]);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const loadUsers = async () => {
      const currentSession = AuthService.getSession();
      setSession(currentSession);
      
      if (currentSession?.userType === 'internal' || currentSession?.role === 'admin') {
        const allUsers = await userStorage.getAllUsers();
        const internalUsers = allUsers.filter((u: any) => u.role === 'internal' || u.role === 'admin');
        setUsers(internalUsers);
        // Default to current user
        setSelectedAssignee(currentSession.userId);
      }
    };
    loadUsers();
  }, []);

  const handleGenerateClick = () => {
    // Show assignee modal for internal users, otherwise generate directly
    if ((session?.userType === 'internal' || session?.role === 'admin') && users.length > 0) {
      setShowAssigneeModal(true);
    } else {
      generateWorkflows();
    }
  };

  const generateWorkflows = async () => {
    setShowAssigneeModal(false);
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
          autoAssign: true,
          assignedUserId: selectedAssignee || session?.userId
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
        onClick={handleGenerateClick}
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

      {/* Assignee Selection Modal */}
      {showAssigneeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Assign Workflows To</h3>
              <button
                onClick={() => setShowAssigneeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select who should be assigned to work on the generated workflows:
            </p>
            
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {users.map(user => (
                <label
                  key={user.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="assignee"
                    value={user.id}
                    checked={selectedAssignee === user.id}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="mr-3"
                  />
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  {user.id === session?.userId && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">You</span>
                  )}
                </label>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAssigneeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={generateWorkflows}
                disabled={!selectedAssignee}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate & Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}