'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Calendar } from 'lucide-react';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';
import { format } from 'date-fns';
import Link from 'next/link';

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState<GuestPostWorkflow[]>([]);

  useEffect(() => {
    setWorkflows(storage.getAllWorkflows());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      storage.deleteWorkflow(id);
      setWorkflows(storage.getAllWorkflows());
    }
  };

  const getProgress = (workflow: GuestPostWorkflow) => {
    const completed = workflow.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / WORKFLOW_STEPS.length) * 100);
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Active Workflows</h2>
        <Link
          href="/workflow/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No workflows yet. Create your first guest post workflow!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium">{workflow.clientName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Target: {workflow.targetDomain}
                  </p>
                  <div className="flex items-center text-sm text-gray-500 mt-2">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created {format(new Date(workflow.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(workflow.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{getProgress(workflow)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${getProgress(workflow)}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/workflow/${workflow.id}`}
                  className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Continue
                </Link>
                <button
                  onClick={() => {
                    const data = storage.exportWorkflow(workflow.id);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `workflow-${workflow.clientName}-${workflow.id}.json`;
                    a.click();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}