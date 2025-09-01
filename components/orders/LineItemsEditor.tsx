'use client';

import { useState, useEffect, useCallback } from 'react';
// Using native HTML elements for simplicity
import { Trash2, Plus, Save, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
// Simple toast notification
const useToast = () => ({
  toast: ({ title, description, variant }: any) => {
    if (variant === 'destructive') {
      console.error(`${title}: ${description}`);
      alert(`Error: ${description}`);
    } else {
      console.log(`${title}: ${description}`);
      alert(`${title}: ${description}`);
    }
  }
});

interface LineItem {
  id?: string;
  clientId: string;
  targetPageUrl?: string;
  anchorText?: string;
  estimatedPrice?: number;
  status: string;
  metadata?: any;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}

interface Client {
  id: string;
  name: string;
  website?: string;
}

interface LineItemsEditorProps {
  orderId: string;
  initialLineItems: LineItem[];
  clients: Client[];
  onSave?: () => void;
  editable?: boolean;
}

export function LineItemsEditor({ 
  orderId, 
  initialLineItems, 
  clients, 
  onSave,
  editable = true 
}: LineItemsEditorProps) {
  const { toast } = useToast();
  const [originalItems, setOriginalItems] = useState<LineItem[]>([]);
  const [currentItems, setCurrentItems] = useState<LineItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize items on mount
  useEffect(() => {
    const items = initialLineItems.map(item => ({ ...item }));
    setOriginalItems(items);
    setCurrentItems(items);
  }, [initialLineItems]);

  // Track changes
  useEffect(() => {
    const hasAnyChanges = currentItems.some(item => 
      item._isNew || item._isModified || item._isDeleted
    );
    setHasChanges(hasAnyChanges);
  }, [currentItems]);

  // Add new line item
  const addLineItem = () => {
    const newItem: LineItem = {
      clientId: clients[0]?.id || '',
      targetPageUrl: '',
      anchorText: '',
      estimatedPrice: 19900, // Default $199
      status: 'draft',
      _isNew: true
    };
    setCurrentItems([...currentItems, newItem]);
  };

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...currentItems];
    const item = updated[index];
    
    // Update the field
    (item as any)[field] = value;
    
    // Mark as modified if it's not a new item
    if (!item._isNew && item.id) {
      // Check if actually modified from original
      const original = originalItems.find(o => o.id === item.id);
      if (original) {
        const isModified = JSON.stringify({
          clientId: item.clientId,
          targetPageUrl: item.targetPageUrl,
          anchorText: item.anchorText,
          estimatedPrice: item.estimatedPrice
        }) !== JSON.stringify({
          clientId: original.clientId,
          targetPageUrl: original.targetPageUrl,
          anchorText: original.anchorText,
          estimatedPrice: original.estimatedPrice
        });
        item._isModified = isModified;
      }
    }
    
    setCurrentItems(updated);
  };

  // Mark item for deletion
  const deleteLineItem = (index: number) => {
    const updated = [...currentItems];
    const item = updated[index];
    
    if (item._isNew) {
      // If it's new and not saved, just remove it
      updated.splice(index, 1);
    } else {
      // Mark existing item as deleted
      item._isDeleted = true;
    }
    
    setCurrentItems(updated);
  };

  // Restore deleted item
  const restoreLineItem = (index: number) => {
    const updated = [...currentItems];
    updated[index]._isDeleted = false;
    setCurrentItems(updated);
  };

  // Save changes using differential updates
  const saveChanges = async () => {
    setIsSaving(true);
    
    try {
      // Separate items by operation type
      const newItems = currentItems.filter(item => item._isNew && !item._isDeleted);
      const modifiedItems = currentItems.filter(item => item._isModified && !item._isNew && !item._isDeleted);
      const deletedItems = currentItems.filter(item => item._isDeleted && item.id);
      
      const operations = [];
      
      // Add new items
      if (newItems.length > 0) {
        operations.push(
          fetch(`/api/orders/${orderId}/line-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              items: newItems.map(item => ({
                clientId: item.clientId,
                targetPageUrl: item.targetPageUrl,
                anchorText: item.anchorText,
                estimatedPrice: item.estimatedPrice,
                status: item.status,
                metadata: item.metadata
              })),
              reason: 'Added new line items'
            })
          })
        );
      }
      
      // Update modified items
      if (modifiedItems.length > 0) {
        operations.push(
          fetch(`/api/orders/${orderId}/line-items`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              updates: modifiedItems.map(item => ({
                id: item.id,
                clientId: item.clientId,
                targetPageUrl: item.targetPageUrl,
                anchorText: item.anchorText,
                estimatedPrice: item.estimatedPrice,
                status: item.status
              })),
              reason: 'Updated line item details'
            })
          })
        );
      }
      
      // Delete removed items
      for (const item of deletedItems) {
        if (item.id) {
          operations.push(
            fetch(`/api/orders/${orderId}/line-items/${item.id}`, {
              method: 'DELETE',
              credentials: 'include'
            })
          );
        }
      }
      
      // Execute all operations
      const results = await Promise.all(operations);
      
      // Check for errors
      const errors = [];
      for (const result of results) {
        if (!result.ok) {
          const error = await result.json();
          errors.push(error.error || 'Operation failed');
        }
      }
      
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      
      // Success - reset state
      toast({
        title: 'Changes saved',
        description: `Successfully updated ${newItems.length + modifiedItems.length + deletedItems.length} line items`,
      });
      
      // Reload the items to get fresh data
      const response = await fetch(`/api/orders/${orderId}/line-items`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const freshItems = data.lineItems || [];
        setOriginalItems(freshItems);
        setCurrentItems(freshItems);
      }
      
      onSave?.();
      
    } catch (error: any) {
      console.error('Error saving line items:', error);
      toast({
        title: 'Error saving changes',
        description: error.message || 'Failed to save line item changes',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate summary
  const activeitems = currentItems.filter(item => !item._isDeleted);
  const totalValue = activeitems.reduce((sum, item) => 
    sum + (item.estimatedPrice || 0), 0
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Line Items</h3>
          <p className="text-sm text-muted-foreground">
            {activeitems.length} items • Total: {formatCurrency(totalValue)}
          </p>
        </div>
        {editable && (
          <div className="flex gap-2">
            <button 
              onClick={addLineItem}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            {hasChanges && (
              <button 
                onClick={saveChanges}
                disabled={isSaving}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 text-sm"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Unsaved changes</p>
            <p className="text-xs mt-1">
              {currentItems.filter(i => i._isNew && !i._isDeleted).length} new, 
              {' '}{currentItems.filter(i => i._isModified && !i._isDeleted).length} modified, 
              {' '}{currentItems.filter(i => i._isDeleted).length} deleted
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {currentItems.map((item, index) => (
          <div 
            key={item.id || `new-${index}`}
            className={`
              border rounded-lg p-3 space-y-2
              ${item._isDeleted ? 'opacity-50 bg-red-50' : ''}
              ${item._isNew ? 'bg-green-50 border-green-200' : ''}
              ${item._isModified && !item._isNew ? 'bg-blue-50 border-blue-200' : ''}
            `}
          >
            <div className="flex gap-2">
              <select
                value={item.clientId}
                onChange={(e) => updateLineItem(index, 'clientId', e.target.value)}
                disabled={!editable || item._isDeleted}
                className="w-[200px] px-2 py-1 border border-gray-300 rounded-md"
              >
                <option value="">Select client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              
              <input
                type="text"
                placeholder="Target URL"
                value={item.targetPageUrl || ''}
                onChange={(e) => updateLineItem(index, 'targetPageUrl', e.target.value)}
                disabled={!editable || item._isDeleted}
                className="flex-1 px-2 py-1 border border-gray-300 rounded-md"
              />
              
              <input
                type="text"
                placeholder="Anchor text"
                value={item.anchorText || ''}
                onChange={(e) => updateLineItem(index, 'anchorText', e.target.value)}
                disabled={!editable || item._isDeleted}
                className="w-[200px] px-2 py-1 border border-gray-300 rounded-md"
              />
              
              <input
                type="number"
                placeholder="Price"
                value={(item.estimatedPrice || 0) / 100}
                onChange={(e) => updateLineItem(index, 'estimatedPrice', Math.round(parseFloat(e.target.value) * 100))}
                disabled={!editable || item._isDeleted}
                className="w-[100px] px-2 py-1 border border-gray-300 rounded-md"
              />
              
              {editable && (
                <button
                  className={`px-2 py-1 rounded-md ${item._isDeleted ? 'border border-gray-300' : 'hover:bg-gray-100'}`}
                  onClick={() => item._isDeleted ? restoreLineItem(index) : deleteLineItem(index)}
                >
                  {item._isDeleted ? 'Restore' : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>
            
            {item._isNew && (
              <p className="text-xs text-green-600">New item (unsaved)</p>
            )}
            {item._isModified && !item._isNew && (
              <p className="text-xs text-blue-600">Modified (unsaved)</p>
            )}
            {item._isDeleted && (
              <p className="text-xs text-red-600">Will be deleted on save</p>
            )}
          </div>
        ))}
      </div>

      {currentItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No line items yet. Click "Add Item" to get started.
        </div>
      )}
    </div>
  );
}