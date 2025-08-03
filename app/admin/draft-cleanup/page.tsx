'use client';

import { useState, useEffect } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { Trash2, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

interface DraftOrder {
  id: string;
  accountEmail: string;
  accountName: string;
  totalRetail: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  daysSinceUpdate: number;
}

export default function DraftCleanupPage() {
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/draft-cleanup');
      if (response.ok) {
        const data = await response.json();
        setDrafts(data.drafts);
        setMessage({ 
          type: 'info', 
          text: `Found ${data.drafts.length} draft orders` 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to load draft orders' });
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
      setMessage({ type: 'error', text: 'Error loading draft orders' });
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (orderId: string) => {
    try {
      setDeleting(orderId);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== orderId));
        setSelectedDrafts(prev => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
        setMessage({ type: 'success', text: 'Draft order deleted successfully' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete draft' });
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      setMessage({ type: 'error', text: 'Error deleting draft order' });
    } finally {
      setDeleting(null);
    }
  };

  const deleteSelected = async () => {
    if (selectedDrafts.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedDrafts.size} draft orders? This cannot be undone.`)) {
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const orderId of selectedDrafts) {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    // Reload drafts
    await loadDrafts();
    setSelectedDrafts(new Set());

    if (errorCount === 0) {
      setMessage({ 
        type: 'success', 
        text: `Successfully deleted ${successCount} draft orders` 
      });
    } else {
      setMessage({ 
        type: 'error', 
        text: `Deleted ${successCount} drafts, ${errorCount} failed` 
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedDrafts.size === drafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(drafts.map(d => d.id)));
    }
  };

  const toggleSelect = (orderId: string) => {
    const newSet = new Set(selectedDrafts);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedDrafts(newSet);
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Draft Order Cleanup</h1>
            <p className="text-gray-600 mt-2">
              Manage and clean up old draft orders that were never completed.
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'error' ? 'bg-red-50 text-red-800' :
              message.type === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {message.type === 'error' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5" /> :
               <AlertCircle className="h-5 w-5 mt-0.5" />}
              <div>{message.text}</div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {selectedDrafts.size === drafts.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedDrafts.size > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedDrafts.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {selectedDrafts.size > 0 && (
                  <button
                    onClick={deleteSelected}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </button>
                )}
                <button
                  onClick={loadDrafts}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Draft Orders Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading draft orders...</p>
              </div>
            ) : drafts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Draft Orders</h3>
                <p className="text-gray-600">All draft orders have been cleaned up!</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDrafts.size === drafts.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {drafts.map((draft) => (
                    <tr key={draft.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDrafts.has(draft.id)}
                          onChange={() => toggleSelect(draft.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {draft.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{draft.accountName}</div>
                        <div className="text-xs text-gray-500">{draft.accountEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ${(draft.totalRetail / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(draft.updatedAt).toLocaleDateString()}
                        </div>
                        <div className={`text-xs ${
                          draft.daysSinceUpdate > 30 ? 'text-red-600' : 
                          draft.daysSinceUpdate > 7 ? 'text-yellow-600' : 
                          'text-gray-500'
                        }`}>
                          {draft.daysSinceUpdate} days ago
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => deleteDraft(draft.id)}
                          disabled={deleting === draft.id}
                          className="text-red-600 hover:text-red-800"
                        >
                          {deleting === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}