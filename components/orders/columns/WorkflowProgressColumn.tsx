'use client';

import { FileText, Clock, CheckCircle } from 'lucide-react';

interface WorkflowProgressColumnProps {
  order: any;
  isNewOrder: boolean;
  session: any;
  onOrderUpdate: (updates: any) => void;
  onNavigate?: (view: string) => void;
}

export default function WorkflowProgressColumn({
  order,
  isNewOrder,
  session,
  onOrderUpdate,
  onNavigate
}: WorkflowProgressColumnProps) {
  // This is a placeholder implementation
  // The full implementation would show workflow progress for content creation
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Content Progress</h2>
        <p className="text-sm text-gray-600 mt-1">
          Track the progress of your guest post content
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Workflow progress tracking will be implemented here
          </p>
          <p className="text-sm text-gray-400 mt-2">
            This will show the status of content creation and publication
          </p>
        </div>
      </div>
    </div>
  );
}