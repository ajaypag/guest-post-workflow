'use client';

import { useState } from 'react';

export default function CheckWorkflowSteps() {
  const [workflowId, setWorkflowId] = useState('');
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkWorkflow = async () => {
    if (!workflowId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}`);
      const data = await response.json();
      setWorkflowData(data);
    } catch (error) {
      console.error('Error fetching workflow:', error);
      setWorkflowData({ error: 'Failed to fetch workflow' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Check Workflow Steps</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              placeholder="Enter workflow ID"
              className="flex-1 px-4 py-2 border rounded"
            />
            <button
              onClick={checkWorkflow}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Workflow'}
            </button>
          </div>
          
          {workflowData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-3">Workflow Steps ({workflowData.steps?.length || 0} total)</h2>
                
                {workflowData.steps ? (
                  <div className="space-y-2">
                    {workflowData.steps.map((step: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded flex justify-between items-center">
                        <div>
                          <span className="font-mono text-sm text-gray-600">Step {index}:</span>
                          <span className="ml-2 font-semibold">{step.title}</span>
                          <span className="ml-2 text-sm text-gray-500">({step.id})</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          step.status === 'completed' ? 'bg-green-100 text-green-800' :
                          step.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-red-600">No steps found!</p>
                )}
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-2">What should be there (steps 8-14):</h3>
                <ul className="space-y-1 text-sm">
                  <li>Step 8: Internal Links</li>
                  <li>Step 9: Client Mention</li>
                  <li>Step 10: Client Link</li>
                  <li>Step 11: Create Images</li>
                  <li>Step 12: Internal Links to New Guest Post</li>
                  <li>Step 13: URL Suggestion</li>
                  <li>Step 14: Email Template</li>
                </ul>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-2">Raw Workflow Data:</h3>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                  {JSON.stringify(workflowData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}