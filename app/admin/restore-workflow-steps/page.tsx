'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RestoreWorkflowSteps() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      
      // Find workflows that have the link-orchestration step
      const affectedWorkflows = data.filter((workflow: any) => 
        workflow.content?.steps?.some((step: any) => step.id === 'link-orchestration')
      );
      
      setWorkflows(affectedWorkflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      setMessage('Error loading workflows');
    } finally {
      setLoading(false);
    }
  };

  const restoreWorkflow = async (workflowId: string) => {
    setRestoring(true);
    setMessage('Restoring original steps...');
    
    try {
      const response = await fetch(`/api/workflows/${workflowId}/restore-original-steps`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore');
      }
      
      setMessage('✅ Successfully restored all original steps!');
      
      // Refresh the list
      await fetchWorkflows();
      
      // Redirect to the workflow
      setTimeout(() => {
        router.push(`/workflow/${workflowId}`);
      }, 2000);
      
    } catch (error) {
      setMessage('❌ Error restoring workflow');
      console.error('Restore error:', error);
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Restore Original Workflow Steps</h1>
        
        {message && (
          <div className={`mb-6 p-4 rounded ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 
            message.includes('❌') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Affected Workflows</h2>
          
          {workflows.length === 0 ? (
            <p className="text-gray-600">No workflows found with the orchestration step.</p>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="border rounded p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{workflow.title}</h3>
                    <p className="text-sm text-gray-600">ID: {workflow.id}</p>
                  </div>
                  <button
                    onClick={() => restoreWorkflow(workflow.id)}
                    disabled={restoring}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {restoring ? 'Restoring...' : 'Restore Original Steps'}
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This will restore steps 8-14 (Internal Links, Client Mention, Client Link, Images, Link Requests, URL Suggestion) and keep the Link Orchestration step as an additional option.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}