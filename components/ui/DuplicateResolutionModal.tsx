'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, ArrowRight, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { DuplicateResolutionChoice, DuplicateResolution } from '@/lib/db/bulkAnalysisService';

interface DuplicateInfo extends Omit<DuplicateResolutionChoice, 'resolution'> {
  qualificationStatus: string;
  hasWorkflow?: boolean;
  checkedAt?: Date;
  checkedBy?: string;
  action?: DuplicateResolution;
}

interface DuplicateResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateInfo[];
  targetProjectName: string;
  onResolve: (resolutions: DuplicateResolutionChoice[]) => Promise<void>;
  loading?: boolean;
}

export default function DuplicateResolutionModal({
  isOpen,
  onClose,
  duplicates: initialDuplicates,
  targetProjectName,
  onResolve,
  loading = false
}: DuplicateResolutionModalProps) {
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>(initialDuplicates);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateInfo | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    setDuplicates(initialDuplicates.map(d => ({ ...d, action: d.action || 'skip' })));
    if (initialDuplicates.length > 0 && !selectedDuplicate) {
      setSelectedDuplicate(initialDuplicates[0]);
    }
  }, [initialDuplicates]);

  const updateDuplicateAction = (domain: string, action: DuplicateResolution) => {
    setDuplicates(prev => prev.map(d => 
      d.domain === domain ? { ...d, action } : d
    ));
    if (selectedDuplicate?.domain === domain) {
      setSelectedDuplicate(prev => prev ? { ...prev, action } : null);
    }
  };

  const handleBulkAction = (action: DuplicateResolution) => {
    setDuplicates(prev => prev.map(d => ({ ...d, action })));
  };

  const handleResolve = async () => {
    const resolutions: DuplicateResolutionChoice[] = duplicates
      .filter(d => d.action)
      .map(d => ({
        domain: d.domain,
        existingDomainId: d.existingDomainId,
        existingProjectId: d.existingProjectId,
        existingProjectName: d.existingProjectName,
        resolution: d.action!
      }));

    setResolving(true);
    try {
      await onResolve(resolutions);
      onClose();
    } catch (error) {
      console.error('Error resolving duplicates:', error);
    } finally {
      setResolving(false);
    }
  };

  const hasUnresolvedActions = duplicates.some(d => !d.action);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Resolve Duplicate Domains
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {duplicates.length} domain{duplicates.length !== 1 ? 's' : ''} already exist in other projects
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Three Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Column 1: Duplicate List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Duplicate Domains</h3>
              <p className="text-sm text-gray-600">Select domains to configure</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {duplicates.map((duplicate) => (
                <DomainListItem 
                  key={duplicate.domain}
                  duplicate={duplicate}
                  isSelected={selectedDuplicate?.domain === duplicate.domain}
                  onClick={() => setSelectedDuplicate(duplicate)}
                />
              ))}
            </div>
          </div>

          {/* Column 2: Action Selection */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Choose Action</h3>
              <p className="text-sm text-gray-600">How should this duplicate be handled?</p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {selectedDuplicate && (
                <ActionSelector 
                  duplicate={selectedDuplicate}
                  onActionChange={(action) => updateDuplicateAction(selectedDuplicate.domain, action)}
                />
              )}
            </div>
          </div>

          {/* Column 3: Preview & Details */}
          <div className="w-1/3 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Preview Changes</h3>
              <p className="text-sm text-gray-600">Review what will happen</p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <PreviewPanel duplicates={duplicates} targetProject={targetProjectName} />
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <BulkActions 
            duplicates={duplicates}
            onBulkAction={handleBulkAction}
            onResolve={handleResolve}
            onClose={onClose}
            loading={resolving || loading}
            hasUnresolvedActions={hasUnresolvedActions}
          />
        </div>
      </div>
    </div>
  );
}

// Sub-components
function DomainListItem({ duplicate, isSelected, onClick }: {
  duplicate: DuplicateInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors: Record<string, string> = {
    'high_quality': 'bg-green-100 text-green-800',
    'good_quality': 'bg-blue-100 text-blue-800',
    'marginal_quality': 'bg-yellow-100 text-yellow-800',
    'disqualified': 'bg-red-100 text-red-800',
    'pending': 'bg-gray-100 text-gray-800'
  };

  const actionIcons: Record<DuplicateResolution, React.ReactElement> = {
    'keep_both': <Copy className="w-4 h-4 text-blue-600" />,
    'move_to_new': <ArrowRight className="w-4 h-4 text-green-600" />,
    'skip': <X className="w-4 h-4 text-gray-600" />,
    'update_original': <RefreshCw className="w-4 h-4 text-purple-600" />
  };

  return (
    <div 
      className={`p-4 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-sm text-gray-900 truncate pr-2">
          {duplicate.domain}
        </div>
        {duplicate.action && actionIcons[duplicate.action]}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[duplicate.qualificationStatus] || statusColors.pending
          }`}>
            {duplicate.qualificationStatus.replace('_', ' ')}
          </span>
          {duplicate.hasWorkflow && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Has Workflow
            </span>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          Current: {duplicate.existingProjectName}
        </div>
        
        {duplicate.checkedAt && (
          <div className="text-xs text-gray-500">
            Checked: {new Date(duplicate.checkedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionSelector({ duplicate, onActionChange }: {
  duplicate: DuplicateInfo;
  onActionChange: (action: DuplicateResolution) => void;
}) {
  const actions: Array<{
    value: DuplicateResolution;
    label: string;
    description: string;
    icon: React.ReactElement;
    color: 'blue' | 'green' | 'gray' | 'purple';
  }> = [
    {
      value: 'keep_both',
      label: 'Keep in Both Projects',
      description: 'Domain will exist in both projects independently',
      icon: <Copy className="w-5 h-5" />,
      color: 'blue'
    },
    {
      value: 'move_to_new',
      label: 'Move to New Project',
      description: 'Remove from original project and add to new one',
      icon: <ArrowRight className="w-5 h-5" />,
      color: 'green'
    },
    {
      value: 'skip',
      label: 'Skip This Domain',
      description: 'Keep in original project only, don\'t add to new one',
      icon: <X className="w-5 h-5" />,
      color: 'gray'
    },
    {
      value: 'update_original',
      label: 'Update Original Entry',
      description: 'Keep in original project but update with new analysis',
      icon: <RefreshCw className="w-5 h-5" />,
      color: 'purple'
    }
  ];

  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    gray: 'border-gray-200 bg-gray-50 text-gray-900',
    purple: 'border-purple-200 bg-purple-50 text-purple-900'
  };

  return (
    <div className="space-y-3">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-yellow-800 text-sm">
              {duplicate.domain}
            </div>
            <div className="text-yellow-700 text-xs mt-1">
              Currently in "{duplicate.existingProjectName}" as {duplicate.qualificationStatus.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {actions.map((action) => (
        <label
          key={action.value}
          className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            duplicate.action === action.value
              ? colorClasses[action.color]
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name={`action-${duplicate.domain}`}
            value={action.value}
            checked={duplicate.action === action.value}
            onChange={(e) => onActionChange(e.target.value as DuplicateResolution)}
            className="sr-only"
          />
          
          <div className={`flex-shrink-0 ${
            duplicate.action === action.value ? 'text-current' : 'text-gray-400'
          }`}>
            {action.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{action.label}</div>
            <div className="text-xs text-gray-600 mt-1">{action.description}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

function PreviewPanel({ duplicates, targetProject }: {
  duplicates: DuplicateInfo[];
  targetProject: string;
}) {
  const actionCounts = duplicates.reduce((acc, d) => {
    const action = d.action || 'skip';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {} as Record<DuplicateResolution, number>);

  const actionLabels: Record<DuplicateResolution, string> = {
    'keep_both': 'Keep in Both',
    'move_to_new': 'Move to New',
    'skip': 'Skip',
    'update_original': 'Update Original'
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Summary of Changes</h4>
        <div className="space-y-2 text-sm">
          {Object.entries(actionCounts).map(([action, count]) => (
            <div key={action} className="flex justify-between">
              <span className="text-blue-800">{actionLabels[action as DuplicateResolution]}:</span>
              <span className="font-medium text-blue-900">{count} domain{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">Will be Added to "{targetProject}"</h4>
        <div className="text-sm text-green-800">
          {duplicates.filter(d => d.action === 'keep_both' || d.action === 'move_to_new').length} domains
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Will Remain Unchanged</h4>
        <div className="text-sm text-gray-700">
          {duplicates.filter(d => d.action === 'skip').length} domains
        </div>
      </div>

      {duplicates.filter(d => d.action === 'update_original').length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-2">Will Be Updated in Original Project</h4>
          <div className="text-sm text-purple-800">
            {duplicates.filter(d => d.action === 'update_original').length} domains
          </div>
        </div>
      )}
    </div>
  );
}

function BulkActions({ 
  duplicates, 
  onBulkAction, 
  onResolve, 
  onClose, 
  loading,
  hasUnresolvedActions 
}: {
  duplicates: DuplicateInfo[];
  onBulkAction: (action: DuplicateResolution) => void;
  onResolve: () => void;
  onClose: () => void;
  loading?: boolean;
  hasUnresolvedActions: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          Bulk Actions:
        </div>
        <select 
          className="text-sm border border-gray-300 rounded-md px-3 py-1"
          onChange={(e) => e.target.value && onBulkAction(e.target.value as DuplicateResolution)}
          value=""
        >
          <option value="">Choose bulk action...</option>
          <option value="keep_both">Keep All in Both Projects</option>
          <option value="move_to_new">Move All to New Project</option>
          <option value="skip">Skip All Duplicates</option>
          <option value="update_original">Update All Original Entries</option>
        </select>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          onClick={onResolve}
          disabled={hasUnresolvedActions || loading}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Resolve {duplicates.length} Duplicate{duplicates.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}