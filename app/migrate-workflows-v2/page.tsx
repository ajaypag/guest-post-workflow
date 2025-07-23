'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle, AlertCircle, Database } from 'lucide-react';
import { isLegacyWorkflow, migrateWorkflowToV2 } from '@/lib/workflow-templates-v2';
import { GuestPostWorkflow } from '@/types/workflow';

export default function MigrateWorkflowsV2() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    legacy: number;
    migrated: number;
    errors: string[];
    details: Array<{
      id: string;
      title: string;
      status: 'migrated' | 'already-v2' | 'error';
      message?: string;
    }>;
  } | null>(null);

  const runMigration = async () => {
    setLoading(true);
    setResults(null);

    try {
      // Fetch all workflows
      const response = await fetch('/api/workflows');
      if (!response.ok) throw new Error('Failed to fetch workflows');
      
      const { workflows } = await response.json();
      
      const migrationResults = {
        total: workflows.length,
        legacy: 0,
        migrated: 0,
        errors: [] as string[],
        details: [] as any[]
      };

      // Process each workflow
      for (const workflow of workflows) {
        try {
          if (isLegacyWorkflow(workflow.steps)) {
            migrationResults.legacy++;
            
            // Migrate the workflow
            const migratedSteps = migrateWorkflowToV2(workflow.steps);
            
            // Update the workflow
            const updateResponse = await fetch(`/api/workflows/${workflow.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...workflow,
                steps: migratedSteps,
                metadata: {
                  ...workflow.metadata,
                  migratedToV2: new Date().toISOString()
                }
              })
            });

            if (updateResponse.ok) {
              migrationResults.migrated++;
              migrationResults.details.push({
                id: workflow.id,
                title: `${workflow.clientName} - ${workflow.targetDomain || 'Draft'}`,
                status: 'migrated',
                message: 'Successfully migrated to V2 with link orchestration'
              });
            } else {
              throw new Error(`Failed to update workflow: ${updateResponse.statusText}`);
            }
          } else {
            migrationResults.details.push({
              id: workflow.id,
              title: `${workflow.clientName} - ${workflow.targetDomain || 'Draft'}`,
              status: 'already-v2',
              message: 'Already using V2 format'
            });
          }
        } catch (error: any) {
          migrationResults.errors.push(`Workflow ${workflow.id}: ${error.message}`);
          migrationResults.details.push({
            id: workflow.id,
            title: `${workflow.clientName} - ${workflow.targetDomain || 'Draft'}`,
            status: 'error',
            message: error.message
          });
        }
      }

      setResults(migrationResults);
    } catch (error: any) {
      setResults({
        total: 0,
        legacy: 0,
        migrated: 0,
        errors: [`Migration failed: ${error.message}`],
        details: []
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Workflow Migration to V2
          </h1>
          <p className="text-gray-600 mt-1">
            Migrate existing workflows to use the new unified Link Orchestration step
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">What this migration does:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-blue-700">
                  <li>Combines steps 8-14 into a single "Link Building & Optimization" step</li>
                  <li>Preserves all existing data from completed steps</li>
                  <li>Reduces workflow from 16 to 10 total steps</li>
                  <li>Enables parallel AI agent processing for faster completion</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Migration Diagram */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Migration Overview:</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Old Steps (8-14):</h4>
                <ul className="space-y-1">
                  <li>• Internal Links</li>
                  <li>• External Links</li>
                  <li>• Client Mention</li>
                  <li>• Client Link</li>
                  <li>• Images</li>
                  <li>• Link Requests</li>
                  <li>• URL Suggestion</li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">New Step (8):</h4>
                <div className="bg-blue-100 p-3 rounded">
                  <p className="font-medium">Link Building & Optimization</p>
                  <p className="text-xs mt-1">All 7 tasks handled by AI orchestration</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!results && (
            <button 
              onClick={runMigration} 
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Migrating Workflows...' : 'Start Migration'}
            </button>
          )}

          {/* Results */}
          {results && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">{results.total}</div>
                  <p className="text-sm text-gray-600">Total Workflows</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.legacy}</div>
                  <p className="text-sm text-gray-600">Legacy Format</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.migrated}</div>
                  <p className="text-sm text-gray-600">Successfully Migrated</p>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="border border-gray-200 rounded-lg">
                <div className="p-4 border-b">
                  <h3 className="font-medium">Migration Details</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.details.map((detail, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                        {detail.status === 'migrated' && <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />}
                        {detail.status === 'already-v2' && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded flex-shrink-0">V2</span>
                        )}
                        {detail.status === 'error' && <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{detail.title}</p>
                          <p className="text-xs text-gray-600">{detail.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Errors */}
              {results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800 mb-2">Errors encountered:</p>
                  <ul className="space-y-1">
                    {results.errors.map((error, i) => (
                      <li key={i} className="text-sm text-red-700">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {results.migrated > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="ml-3 text-sm text-green-800">
                      Successfully migrated {results.migrated} workflow{results.migrated !== 1 ? 's' : ''} to V2 format!
                    </p>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setResults(null)}
                className="w-full py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50"
              >
                Run Another Migration
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}