'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface InlineAnchorEditorProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}

export default function InlineAnchorEditor({
  value = '',
  onSave,
  disabled = false,
  className = '',
  placeholder = 'Enter anchor text...',
  maxLength = 200
}: InlineAnchorEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    
    // Validate
    if (trimmedValue.length > maxLength) {
      setError(`Anchor text must be ${maxLength} characters or less`);
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save anchor text');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Click outside to cancel
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        // If there are unsaved changes, save them
        if (editValue.trim() !== value) {
          handleSave();
        } else {
          handleCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editValue, value]);

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSaving}
            maxLength={maxLength}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          {error && (
            <div className="absolute top-full left-0 mt-1 w-max max-w-xs p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 z-10">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={isSaving || editValue.trim().length > maxLength}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // Display mode
  const displayValue = value || placeholder;
  const isEmpty = !value;

  if (disabled) {
    return (
      <div className={`px-2 py-1 text-sm ${isEmpty ? 'text-gray-400 italic' : 'text-gray-900'} ${className}`}>
        {displayValue}
      </div>
    );
  }

  return (
    <div className={`group relative flex items-center ${className}`}>
      <div 
        className={`flex-1 min-w-0 px-2 py-1 text-sm cursor-pointer hover:bg-gray-50 rounded transition-colors ${
          isEmpty ? 'text-gray-400 italic' : 'text-gray-900'
        }`}
        onClick={handleStartEditing}
        title={value || 'Click to edit anchor text'}
      >
        <div className="pr-6 line-clamp-2">
          {displayValue}
        </div>
      </div>
      
      <button
        onClick={handleStartEditing}
        className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
        title="Edit anchor text"
      >
        <Edit2 className="h-3 w-3" />
      </button>
    </div>
  );
}