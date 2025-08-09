'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, 
  Package, User, Link, DollarSign, Clock, CheckCircle, 
  XCircle, AlertCircle, Target, Globe, History, Copy,
  ArrowUpDown, Filter, MoreVertical, RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface LineItem {
  id: string;
  orderId: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
    website?: string;
  };
  targetPageUrl?: string;
  targetPageId?: string;
  anchorText?: string;
  status: string;
  clientReviewStatus?: string;
  assignedDomainId?: string;
  assignedDomain?: string;
  assignedAt?: string;
  estimatedPrice?: number;
  approvedPrice?: number;
  wholesalePrice?: number;
  serviceFee?: number;
  finalPrice?: number;
  clientReviewedAt?: string;
  clientReviewNotes?: string;
  deliveredAt?: string;
  publishedUrl?: string;
  addedAt: string;
  addedBy?: string;
  modifiedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  displayOrder: number;
  metadata?: any;
  changes?: LineItemChange[];
}

interface LineItemChange {
  id: string;
  changeType: string;
  previousValue?: any;
  newValue?: any;
  changedAt: string;
  changedBy?: string;
  changeReason?: string;
}

interface LineItemsTableProps {
  orderId: string;
  lineItems: LineItem[];
  userType: 'internal' | 'account';
  canEdit?: boolean;
  canAddItems?: boolean;
  canDeleteItems?: boolean;
  canAssignDomains?: boolean;
  canApproveItems?: boolean;
  onRefresh?: () => void;
  onAddItems?: (items: Partial<LineItem>[]) => Promise<void>;
  onUpdateItems?: (updates: Array<{ id: string; [key: string]: any }>) => Promise<void>;
  onDeleteItems?: (itemIds: string[], reason?: string) => Promise<void>;
}

export default function LineItemsTable({
  orderId,
  lineItems = [],
  userType,
  canEdit = false,
  canAddItems = false,
  canDeleteItems = false,
  canAssignDomains = false,
  canApproveItems = false,
  onRefresh,
  onAddItems,
  onUpdateItems,
  onDeleteItems
}: LineItemsTableProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItems, setNewItems] = useState<Partial<LineItem>[]>([]);
  const [groupByClient, setGroupByClient] = useState(true);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Group items by client
  const groupedItems = React.useMemo(() => {
    if (!groupByClient) return { 'All Items': lineItems };
    
    const groups: Record<string, LineItem[]> = {};
    lineItems.forEach(item => {
      const clientName = item.client?.name || 'Unknown Client';
      if (!groups[clientName]) groups[clientName] = [];
      groups[clientName].push(item);
    });
    return groups;
  }, [lineItems, groupByClient]);

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending_selection: 'bg-yellow-100 text-yellow-700',
      selected: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      in_progress: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-200 text-green-800',
      completed: 'bg-green-300 text-green-900',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-orange-100 text-orange-700',
      disputed: 'bg-red-200 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Handle edit
  const startEdit = (item: LineItem) => {
    setEditingItem(item.id);
    setEditData({
      targetPageUrl: item.targetPageUrl,
      anchorText: item.anchorText,
      assignedDomain: item.assignedDomain
    });
  };

  const saveEdit = async () => {
    if (!editingItem || !onUpdateItems) return;
    
    setLoading(true);
    try {
      await onUpdateItems([{
        id: editingItem,
        ...editData
      }]);
      setEditingItem(null);
      setEditData({});
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditData({});
  };

  // Handle bulk actions
  const handleBulkStatusChange = async (status: string) => {
    if (!onUpdateItems || selectedItems.size === 0) return;
    
    setLoading(true);
    try {
      const updates = Array.from(selectedItems).map(id => ({
        id,
        status
      }));
      await onUpdateItems(updates);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!onDeleteItems || selectedItems.size === 0) return;
    
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    
    setLoading(true);
    try {
      await onDeleteItems(Array.from(selectedItems), reason);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Failed to delete items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new items
  const addNewItemForm = () => {
    const clientId = lineItems[0]?.clientId || '';
    setNewItems([...newItems, {
      clientId,
      status: 'draft',
      targetPageUrl: '',
      anchorText: ''
    }]);
  };

  const saveNewItems = async () => {
    if (!onAddItems || newItems.length === 0) return;
    
    setLoading(true);
    try {
      await onAddItems(newItems);
      setNewItems([]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add items:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Order Line Items</h3>
            <span className="px-2 py-1 bg-gray-100 text-sm rounded">
              {lineItems.length} items
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupByClient(!groupByClient)}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              {groupByClient ? 'Ungroup' : 'Group by Client'}
            </button>
            
            {canAddItems && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Items
              </button>
            )}
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded">
            <span className="text-sm font-medium">
              {selectedItems.size} selected
            </span>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => handleBulkStatusChange('approved')}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleBulkStatusChange('cancelled')}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cancel
              </button>
              {canDeleteItems && (
                <button
                  onClick={handleBulkDelete}
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add New Items Form */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium mb-3">Add New Line Items</h4>
          {newItems.map((item, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <select
                value={item.clientId}
                onChange={(e) => {
                  const updated = [...newItems];
                  updated[index].clientId = e.target.value;
                  setNewItems(updated);
                }}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="">Select Client</option>
                {Object.keys(groupedItems).map(clientName => {
                  const clientId = lineItems.find(i => i.client?.name === clientName)?.clientId;
                  return clientId ? (
                    <option key={clientId} value={clientId}>{clientName}</option>
                  ) : null;
                })}
              </select>
              
              <input
                type="text"
                placeholder="Target Page URL"
                value={item.targetPageUrl || ''}
                onChange={(e) => {
                  const updated = [...newItems];
                  updated[index].targetPageUrl = e.target.value;
                  setNewItems(updated);
                }}
                className="flex-1 px-2 py-1 border rounded text-sm"
              />
              
              <input
                type="text"
                placeholder="Anchor Text"
                value={item.anchorText || ''}
                onChange={(e) => {
                  const updated = [...newItems];
                  updated[index].anchorText = e.target.value;
                  setNewItems(updated);
                }}
                className="flex-1 px-2 py-1 border rounded text-sm"
              />
              
              <button
                onClick={() => {
                  const updated = newItems.filter((_, i) => i !== index);
                  setNewItems(updated);
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={addNewItemForm}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Add Another
            </button>
            <button
              onClick={saveNewItems}
              disabled={loading || newItems.length === 0}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save All
            </button>
            <button
              onClick={() => {
                setNewItems([]);
                setShowAddForm(false);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Line Items Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {Object.entries(groupedItems).map(([clientName, items]) => (
          <div key={clientName} className="border-b last:border-b-0">
            {groupByClient && (
              <div className="px-4 py-2 bg-gray-50 font-medium text-sm">
                {clientName} ({items.length} items)
              </div>
            )}
            
            <table className="w-full">
              <thead className="text-xs text-gray-600 border-b">
                <tr>
                  <th className="text-left p-3">
                    <input
                      type="checkbox"
                      checked={items.every(i => selectedItems.has(i.id))}
                      onChange={(e) => {
                        const newSelected = new Set(selectedItems);
                        items.forEach(item => {
                          if (e.target.checked) {
                            newSelected.add(item.id);
                          } else {
                            newSelected.delete(item.id);
                          }
                        });
                        setSelectedItems(newSelected);
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Domain</th>
                  <th className="text-left p-3">Target Page</th>
                  <th className="text-left p-3">Anchor Text</th>
                  <th className="text-left p-3">Price</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <React.Fragment key={item.id}>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedItems);
                            if (e.target.checked) {
                              newSelected.add(item.id);
                            } else {
                              newSelected.delete(item.id);
                            }
                            setSelectedItems(newSelected);
                          }}
                          className="rounded"
                        />
                      </td>
                      
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(item.status)}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                        {item.clientReviewStatus && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({item.clientReviewStatus})
                          </span>
                        )}
                      </td>
                      
                      <td className="p-3">
                        {editingItem === item.id ? (
                          <input
                            type="text"
                            value={editData.assignedDomain || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              assignedDomain: e.target.value
                            })}
                            className="px-2 py-1 border rounded text-sm w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <Globe className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {item.assignedDomain || <span className="text-gray-400">Not assigned</span>}
                            </span>
                          </div>
                        )}
                      </td>
                      
                      <td className="p-3">
                        {editingItem === item.id ? (
                          <input
                            type="text"
                            value={editData.targetPageUrl || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              targetPageUrl: e.target.value
                            })}
                            className="px-2 py-1 border rounded text-sm w-full"
                          />
                        ) : (
                          <span className="text-sm">
                            {item.targetPageUrl || <span className="text-gray-400">-</span>}
                          </span>
                        )}
                      </td>
                      
                      <td className="p-3">
                        {editingItem === item.id ? (
                          <input
                            type="text"
                            value={editData.anchorText || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              anchorText: e.target.value
                            })}
                            className="px-2 py-1 border rounded text-sm w-full"
                          />
                        ) : (
                          <span className="text-sm">
                            {item.anchorText || <span className="text-gray-400">-</span>}
                          </span>
                        )}
                      </td>
                      
                      <td className="p-3">
                        <span className="text-sm font-medium">
                          {item.approvedPrice ? (
                            <span className="text-green-600">
                              {formatCurrency(item.approvedPrice)}
                            </span>
                          ) : item.estimatedPrice ? (
                            <span className="text-gray-600">
                              ~{formatCurrency(item.estimatedPrice)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </span>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {editingItem === item.id ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {canEdit && (
                                <button
                                  onClick={() => startEdit(item)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setExpandedItems(
                                  expandedItems.has(item.id) 
                                    ? new Set([...expandedItems].filter(id => id !== item.id))
                                    : new Set([...expandedItems, item.id])
                                )}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {expandedItems.has(item.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              {item.changes && item.changes.length > 0 && (
                                <button
                                  onClick={() => setShowHistory(
                                    showHistory === item.id ? null : item.id
                                  )}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <History className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {expandedItems.has(item.id) && (
                      <tr>
                        <td colSpan={7} className="p-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Added:</strong> {new Date(item.addedAt).toLocaleDateString()}
                            </div>
                            {item.modifiedAt && (
                              <div>
                                <strong>Modified:</strong> {new Date(item.modifiedAt).toLocaleDateString()}
                              </div>
                            )}
                            {item.deliveredAt && (
                              <div>
                                <strong>Delivered:</strong> {new Date(item.deliveredAt).toLocaleDateString()}
                              </div>
                            )}
                            {item.publishedUrl && (
                              <div>
                                <strong>Published:</strong> <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{item.publishedUrl}</a>
                              </div>
                            )}
                            {item.clientReviewNotes && (
                              <div className="col-span-2">
                                <strong>Review Notes:</strong> {item.clientReviewNotes}
                              </div>
                            )}
                            {item.cancellationReason && (
                              <div className="col-span-2 text-red-600">
                                <strong>Cancellation:</strong> {item.cancellationReason}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {/* Change History */}
                    {showHistory === item.id && item.changes && (
                      <tr>
                        <td colSpan={7} className="p-4 bg-blue-50">
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm">Change History</h5>
                            {item.changes.map(change => (
                              <div key={change.id} className="text-xs text-gray-600">
                                <span className="font-medium">{change.changeType}:</span>{' '}
                                {change.changeReason || 'No reason provided'} -{' '}
                                {new Date(change.changedAt).toLocaleString()}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}