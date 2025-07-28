import React from 'react';

interface MessageDisplayProps {
  message: string | null;
  bulkAnalysisRunning: boolean;
  bulkProgress: { current: number; total: number };
  masterQualificationRunning: boolean;
  masterQualificationProgress: { current: number; total: number };
  completedJobId: string | null;
  onViewResults?: () => void;
}

export function MessageDisplay({
  message,
  bulkAnalysisRunning,
  bulkProgress,
  masterQualificationRunning,
  masterQualificationProgress,
  completedJobId,
  onViewResults
}: MessageDisplayProps) {
  if (!message) return null;

  return (
    <div className={`mt-3 p-3 rounded-lg ${
      message.startsWith('❌') ? 'bg-red-50 border border-red-200 text-red-800' :
      message.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' :
      message.startsWith('⏳') || message.startsWith('🔄') || message.startsWith('🚀') ? 'bg-blue-50 border border-blue-200 text-blue-800' :
      'bg-gray-50 border border-gray-200 text-gray-800'
    }`}>
      <p className="text-sm">{message}</p>
      
      {/* Progress Bar for Bulk Analysis */}
      {bulkAnalysisRunning && bulkProgress.total > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{bulkProgress.current} / {bulkProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Progress Bar for Master Qualification */}
      {masterQualificationRunning && masterQualificationProgress.total > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Master Qualification Progress</span>
            <span>{masterQualificationProgress.current} / {masterQualificationProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(masterQualificationProgress.current / masterQualificationProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* View Results Button */}
      {completedJobId && message.includes('Analysis complete') && onViewResults && (
        <button
          onClick={onViewResults}
          className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View Results →
        </button>
      )}
    </div>
  );
}