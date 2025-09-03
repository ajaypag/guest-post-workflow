'use client';

import { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';

interface PublisherActionsProps {
  relationshipId: string;
  publisherId: string;
  publisherName: string;
  websiteId: string;
}

export default function PublisherActions({ 
  relationshipId, 
  publisherId, 
  publisherName, 
  websiteId 
}: PublisherActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = () => {
    // Navigate to edit relationship page
    window.location.href = `/internal/relationships/${relationshipId}/edit?websiteId=${websiteId}&publisherId=${publisherId}`;
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove ${publisherName || 'this publisher'} from this website?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/internal/relationships/${relationshipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove publisher relationship');
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error removing publisher:', error);
      alert('Failed to remove publisher. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={handleEdit}
        disabled={isLoading}
        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <Edit className="w-3 h-3 mr-1" />
        Edit
      </button>
      <button 
        onClick={handleRemove}
        disabled={isLoading}
        className="inline-flex items-center px-2.5 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
      >
        <Trash2 className="w-3 h-3 mr-1" />
        {isLoading ? 'Removing...' : 'Remove'}
      </button>
    </div>
  );
}