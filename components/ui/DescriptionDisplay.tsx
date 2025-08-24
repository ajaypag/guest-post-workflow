'use client';

import React, { useState } from 'react';
import { FileText, Edit, Check, X } from 'lucide-react';

interface DescriptionDisplayProps {
  description?: string;
  className?: string;
  targetPageId?: string;
  onDescriptionUpdate?: (description: string) => void;
  canGenerate?: boolean;
  onGenerate?: () => void;
}

export const DescriptionDisplay = ({ 
  description, 
  className = '',
  targetPageId,
  onDescriptionUpdate,
  canGenerate = false,
  onGenerate
}: DescriptionDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  if (!description || description.trim() === '') {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-xs">
            <div className="italic">No description yet</div>
            {!canGenerate && (
              <div className="text-gray-500 mt-1 text-xs">
                Descriptions will be added during order creation process
              </div>
            )}
          </div>
          {canGenerate && onGenerate && (
            <button
              onClick={onGenerate}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
            >
              Generate Description
            </button>
          )}
        </div>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900 text-sm">Edit Description</span>
            </div>
            <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
              URL landing page description
            </div>
          </div>
          
          {/* Textarea with better styling */}
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2.5 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            rows={4}
            placeholder="Describe what this page is about, its purpose, and target audience..."
          />
          
          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {editValue.length} characters
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={cancelEdit}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 text-sm rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
              >
                <X className="w-3 h-3 mr-1.5" />
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
              >
                <Check className="w-3 h-3 mr-1.5" />
                Save Description
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="space-y-3">
        {/* Description Content */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-gray-700 leading-relaxed">
              {description}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {description.length} characters
          </div>
          
          <div className="flex items-center space-x-3">
            {targetPageId && onDescriptionUpdate && (
              <button
                onClick={startEdit}
                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </button>
            )}
            
            {canGenerate && onGenerate && (
              <button
                onClick={onGenerate}
                className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800"
              >
                Regenerate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};