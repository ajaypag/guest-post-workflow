'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface WorkflowData {
  id: string;
  title: string;
  stepCount: number;
  hasOrchestrationStep: boolean;
  steps: any[];
  dataPreview: {
    [key: string]: any;
  };
}

export default function WorkflowRecovery() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowDetails, setWorkflowDetails] = useState<any>(null);
  const [recovering, setRecovering] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/workflow-recovery/scan');
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      setMessage('Error loading workflows');
    } finally {
      setLoading(false);
    }
  };

  const checkWorkflowDetails = async (workflowId: string) => {
    setSelectedWorkflow(workflowId);
    setMessage('');
    
    try {
      const response = await fetch(`/api/admin/workflow-recovery/check/${workflowId}`);
      const data = await response.json();
      setWorkflowDetails(data);
    } catch (error) {
      console.error('Error checking workflow:', error);
      setMessage('Error loading workflow details');
    }
  };

  const recoverWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to recover this workflow? This will restore the original step structure and attempt to recover any lost data.')) {
      return;
    }

    setRecovering(true);
    setMessage('Recovering workflow data...');
    
    try {
      const response = await fetch(`/api/admin/workflow-recovery/restore/${workflowId}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Recovery failed');
      }
      
      setMessage(`✅ ${data.message}`);
      
      // Refresh data
      await fetchWorkflows();
      await checkWorkflowDetails(workflowId);
      
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Recovery failed'}`);
    } finally {
      setRecovering(false);
    }
  };

  if (loading) return <div className="p-8">Loading workflows...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Workflow Data Recovery Tool</h1>
        
        {message && (
          <div className={`mb-6 p-4 rounded ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 
            message.includes('❌') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workflow List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Workflows</h2>
            
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div 
                  key={workflow.id}
                  className={`border rounded p-4 cursor-pointer transition-all ${
                    selectedWorkflow === workflow.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => checkWorkflowDetails(workflow.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{workflow.title}</h3>
                      <p className="text-sm text-gray-600">ID: {workflow.id}</p>
                      <p className="text-sm text-gray-600">Steps: {workflow.stepCount}</p>
                    </div>
                    <div className="text-right">
                      {workflow.hasOrchestrationStep && (
                        <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Has Orchestration
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Workflow Details</h2>
            
            {!selectedWorkflow ? (
              <p className="text-gray-500">Select a workflow to view details</p>
            ) : workflowDetails ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Current Steps:</h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {workflowDetails.steps.map((step: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>
                          {index}. {step.title} ({step.id})
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          step.hasData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {step.hasData ? 'Has Data' : 'Empty'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {workflowDetails.dataLost && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">
                      ⚠️ Potential Data Loss Detected
                    </p>
                    <p className="text-sm text-yellow-700">
                      This workflow appears to have been migrated and may have lost data from steps 8-14.
                    </p>
                  </div>
                )}

                {workflowDetails.recoveryPossible && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800 font-semibold mb-2">
                      🔄 Recovery Options Available
                    </p>
                    <ul className="text-sm text-blue-700 list-disc list-inside">
                      {workflowDetails.recoveryOptions.map((option: string, index: number) => (
                        <li key={index}>{option}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => recoverWorkflow(selectedWorkflow)}
                  disabled={recovering || !workflowDetails.recoveryPossible}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recovering ? 'Recovering...' : 'Recover Workflow'}
                </button>

                <div className="mt-4 pt-4 border-t">
                  <details className="text-sm">
                    <summary className="cursor-pointer font-semibold">View Raw Data</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                      {JSON.stringify(workflowDetails, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading...</p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recovery Information</h2>
          <div className="prose text-sm text-gray-700">
            <p>This tool helps recover workflow data that may have been affected by the orchestration migration.</p>
            <ul>
              <li>✅ <strong>Green workflows</strong>: Have all original steps and data intact</li>
              <li>⚠️ <strong>Yellow workflows</strong>: Have been migrated and may need recovery</li>
              <li>🔄 <strong>Recovery</strong>: Will attempt to restore original step structure and recover any preserved data</li>
            </ul>
            <p className="mt-4">
              <strong>Note:</strong> Recovery works best if the workflow hasn't been modified since migration. 
              Some data may not be recoverable if it wasn't preserved during the migration process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}