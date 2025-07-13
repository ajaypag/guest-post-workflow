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
}

export const KeywordDisplay = ({ 
  keywords, 
  className = '',
  maxDisplay = 5,
  targetPageId,
  onKeywordsUpdate
}: KeywordDisplayProps) => {
  const [showAll, setShowAll] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  if (!keywords || keywords.trim() === '') {
    return (
      <div className={`text-gray-400 text-xs italic ${className}`}>
        No keywords generated
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
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs">
            <Tag className="w-3 h-3 text-gray-400" />
            <span className="font-medium">Edit Keywords:</span>
          </div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 resize-none"
            rows={3}
            placeholder="Enter comma-separated keywords..."
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
        <Tag className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex flex-wrap gap-1">
            {displayKeywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
              >
                {keyword}
              </span>
            ))}
            {!showAll && hasMore && (
              <button
                onClick={() => setShowAll(true)}
                className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full hover:bg-gray-200"
              >
                +{keywordArray.length - maxDisplay} more
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <div className="text-xs text-gray-500">
              Total: {keywordArray.length} keywords
            </div>
            
            <div className="flex items-center space-x-1">
              {showAll && hasMore && (
                <button
                  onClick={() => setShowAll(false)}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Show Less
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};