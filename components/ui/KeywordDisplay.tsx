'use client';

import React, { useState } from 'react';
import { parseKeywordsFromStorage, formatKeywordsForStorage } from '@/lib/services/keywordGenerationService';
import { Tag, Edit, Eye, Check, X } from 'lucide-react';

interface KeywordDisplayProps {
  keywords?: string;
  className?: string;
  maxDisplay?: number;
  targetPageId?: string;
  onKeywordsUpdate?: (keywords: string[]) => void;
  canGenerate?: boolean;
  onGenerate?: () => void;
}

export const KeywordDisplay = ({ 
  keywords, 
  className = '',
  maxDisplay = 24,
  targetPageId,
  onKeywordsUpdate,
  canGenerate = false,
  onGenerate
}: KeywordDisplayProps) => {
  const [showAll, setShowAll] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  if (!keywords || keywords.trim() === '') {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-xs">
            <div className="italic">No keywords yet</div>
            {!canGenerate && (
              <div className="text-gray-500 mt-1 text-xs">
                Keywords will be added during order creation process
              </div>
            )}
          </div>
          {canGenerate && onGenerate && (
            <button
              onClick={onGenerate}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
            >
              Generate Keywords
            </button>
          )}
        </div>
      </div>
    );
  }

  const keywordArray = parseKeywordsFromStorage(keywords);
  
  if (keywordArray.length === 0) {
    return (
      <div className={`text-gray-400 text-xs italic ${className}`}>
        No keywords available
      </div>
    );
  }

  const displayKeywords = showAll ? keywordArray : keywordArray.slice(0, maxDisplay);
  const hasMore = keywordArray.length > maxDisplay;

  const startEdit = () => {
    setEditValue(formatKeywordsForStorage(keywordArray));
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!targetPageId || !onKeywordsUpdate) return;
    
    const newKeywords = parseKeywordsFromStorage(editValue);
    
    try {
      // Update keywords in database
      const response = await fetch(`/api/target-pages/${targetPageId}/keywords/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: formatKeywordsForStorage(newKeywords) })
      });

      if (response.ok) {
        onKeywordsUpdate(newKeywords);
        setIsEditing(false);
      } else {
        alert('Failed to update keywords');
      }
    } catch (error) {
      console.error('Error updating keywords:', error);
      alert('Error updating keywords');
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
              <Tag className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900 text-sm">Edit Keywords</span>
            </div>
            <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
              Separate with commas
            </div>
          </div>
          
          {/* Textarea with better styling */}
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2.5 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            rows={4}
            placeholder="ppc, pay per click, google ads, digital marketing, sem..."
          />
          
          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {editValue.split(',').filter(k => k.trim()).length} keywords
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
                Save Keywords
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
        {/* Keywords Display */}
        <div className="flex flex-wrap gap-1">
          {displayKeywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {keyword}
            </span>
          ))}
          {!showAll && hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="inline-block px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              +{keywordArray.length - maxDisplay} more
            </button>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {keywordArray.length} keywords
          </div>
          
          <div className="flex items-center space-x-3">
            {showAll && hasMore && (
              <button
                onClick={() => setShowAll(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Show less
              </button>
            )}
            
            {targetPageId && onKeywordsUpdate && (
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