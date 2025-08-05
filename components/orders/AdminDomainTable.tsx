'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Edit2, Save, X, RefreshCw, Loader2, AlertCircle, Database } from 'lucide-react';

interface AdminSubmission {
  id: string;
  orderGroupId: string;
  domainId: string;
  domain: {
    id: string;
    domain: string;
  } | null;
  selectionPool: 'primary' | 'alternative';
  poolRank?: number;
  targetPageUrl?: string;
  orderGroup: {
    id: string;
    clientId: string;
    client: {
      id: string;
      name: string;
    };
    targetPages?: Array<{
      url: string;
    }>;
  };
}

interface AdminDomainTableProps {
  orderId: string;
  onRefresh: () => void;
}

interface OrderGroup {
  id: string;
  client: { name: string };
  targetPages?: Array<{ url: string }>;
}

export default function AdminDomainTable({ orderId, onRefresh }: AdminDomainTableProps) {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, {
    targetUrl: string;
    orderGroupId: string;
    pool: 'primary' | 'alternative';
  }>>({});

  useEffect(() => {
    loadAdminData();
  }, [orderId]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}/admin-domains`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load admin data');
      }
      
      const data = await response.json();
      setSubmissions(data.submissions || []);
      setOrderGroups(data.orderGroups || []);
      setError(null);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (submissionId: string, submission: AdminSubmission) => {
    setEditingRows(prev => new Set([...prev, submissionId]));
    setEditValues(prev => ({
      ...prev,
      [submissionId]: {
        targetUrl: submission.targetPageUrl || '',
        orderGroupId: submission.orderGroupId,
        pool: submission.selectionPool
      }
    }));
  };

  const cancelEditing = (submissionId: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(submissionId);
      return newSet;
    });
    setEditValues(prev => {
      const newValues = { ...prev };
      delete newValues[submissionId];
      return newValues;
    });
  };

  const saveChanges = async (submissionId: string) => {
    const editValue = editValues[submissionId];
    if (!editValue) return;

    const originalSubmission = submissions.find(s => s.id === submissionId);
    if (!originalSubmission) return;

    // Check if anything actually changed
    const hasChanges = 
      editValue.targetUrl !== (originalSubmission.targetPageUrl || '') ||
      editValue.orderGroupId !== originalSubmission.orderGroupId ||
      editValue.pool !== originalSubmission.selectionPool;

    if (!hasChanges) {
      cancelEditing(submissionId);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/orders/${orderId}/admin-domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{
            submissionId,
            newTargetUrl: editValue.targetUrl || null,
            newOrderGroupId: editValue.orderGroupId,
            newPool: editValue.pool
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save changes');
      }

      const result = await response.json();
      if (!result.success || result.results[0]?.success !== true) {
        throw new Error(result.results[0]?.error || 'Failed to save changes');
      }

      // Refresh data and clear editing state
      await loadAdminData();
      cancelEditing(submissionId);
      onRefresh(); // Refresh parent component
      
    } catch (err) {
      console.error('Error saving changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleEditValueChange = (submissionId: string, field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }));
  };

  const getAllTargetUrls = () => {
    const urls = new Set<string>();
    orderGroups.forEach(group => {
      group.targetPages?.forEach(page => {
        urls.add(page.url);
      });
    });
    return Array.from(urls);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading domain assignments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadAdminData}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-1 inline" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Domain Assignment Management</h3>
        </div>
        <p className="text-gray-500">No domain assignments found for this order.</p>
      </div>
    );
  }

  const allTargetUrls = getAllTargetUrls();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Domain Assignment Management</h3>
          <span className="text-sm text-gray-500">({submissions.length} domains)</span>
        </div>
        <button
          onClick={loadAdminData}
          disabled={saving}
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 inline ${saving ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pool
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((submission) => {
              const isEditing = editingRows.has(submission.id);
              const editValue = editValues[submission.id];
              
              return (
                <tr key={submission.id} className={isEditing ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {submission.domain?.domain || 'Unknown Domain'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <select
                        value={editValue?.orderGroupId || submission.orderGroupId}
                        onChange={(e) => handleEditValueChange(submission.id, 'orderGroupId', e.target.value)}
                        className="text-sm border-gray-300 rounded w-full"
                      >
                        {orderGroups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.client.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-900">
                        {submission.orderGroup.client.name}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4">
                    {isEditing ? (
                      <select
                        value={editValue?.targetUrl || ''}
                        onChange={(e) => handleEditValueChange(submission.id, 'targetUrl', e.target.value)}
                        className="text-sm border-gray-300 rounded w-full max-w-xs"
                      >
                        <option value="">No target URL</option>
                        {allTargetUrls.map(url => (
                          <option key={url} value={url}>
                            {url.length > 50 ? url.substring(0, 50) + '...' : url}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-900 truncate max-w-xs block" title={submission.targetPageUrl}>
                        {submission.targetPageUrl || 'No target URL'}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <select
                        value={editValue?.pool || submission.selectionPool}
                        onChange={(e) => handleEditValueChange(submission.id, 'pool', e.target.value as 'primary' | 'alternative')}
                        className="text-sm border-gray-300 rounded"
                      >
                        <option value="primary">Primary</option>
                        <option value="alternative">Alternative</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        submission.selectionPool === 'primary' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {submission.selectionPool}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveChanges(submission.id)}
                            disabled={saving}
                            className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Save changes"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => cancelEditing(submission.id)}
                            disabled={saving}
                            className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditing(submission.id, submission)}
                          className="p-1 text-gray-600 hover:text-gray-800"
                          title="Edit assignment"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {editingRows.size > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            💡 <strong>Editing {editingRows.size} domain(s).</strong> Changes will reassign domains to different target URLs or pools and refresh the page automatically.
          </p>
        </div>
      )}
    </div>
  );
}