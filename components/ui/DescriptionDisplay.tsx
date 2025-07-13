'use client';

import React, { useState } from 'react';
import { FileText, Edit, Check, X } from 'lucide-react';

interface DescriptionDisplayProps {
  description?: string;
  className?: string;
  targetPageId?: string;
  onDescriptionUpdate?: (description: string) => void;
}

export const DescriptionDisplay = ({ 
  description, 
  className = '',
  targetPageId,
  onDescriptionUpdate
}: DescriptionDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  if (!description || description.trim() === '') {
    return (
      <div className={`text-gray-400 text-xs italic ${className}`}>
        No description generated
      </div>
    );
  }

  const startEdit = () => {
    setEditValue(description);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!targetPageId || !onDescriptionUpdate) return;
    
    try {
      // Update description in database
      const response = await fetch(`/api/target-pages/${targetPageId}/description/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editValue })
      });

      if (response.ok) {
        onDescriptionUpdate(editValue);
        setIsEditing(false);
      } else {
        alert('Failed to update description');
      }
    } catch (error) {
      console.error('Error updating description:', error);
      alert('Error updating description');
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  if (isEditing) {
    return (
      <div className={`${className}`}>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs">
            <FileText className="w-3 h-3 text-gray-400" />
            <span className="font-medium">Edit Description:</span>
          </div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
            placeholder="Enter URL description..."
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={saveEdit}
              className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="inline-flex items-center px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-start space-x-1">
        <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-700 leading-relaxed">
            {description}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <div className="text-xs text-gray-500">
              {description.length} characters
            </div>
            
            {targetPageId && onDescriptionUpdate && (
              <button
                onClick={startEdit}
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};