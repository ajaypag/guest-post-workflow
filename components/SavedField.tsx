'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SavedFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  isTextarea?: boolean;
  height?: string;
  helpText?: string;
}

export const SavedField = ({ 
  label, 
  value, 
  placeholder, 
  onChange, 
  isTextarea = false, 
  height = "h-32",
  helpText
}: SavedFieldProps) => {
  const [currentValue, setCurrentValue] = useState(value || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'typing' | 'saving'>('saved');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update currentValue when value prop changes
  useEffect(() => {
    setCurrentValue(value || '');
    if (value) {
      setSaveStatus('saved');
    }
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setCurrentValue(newValue);
    setSaveStatus('typing');

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to auto-save after user stops typing
    timeoutRef.current = setTimeout(() => {
      if (newValue !== value) {
        setSaveStatus('saving');
        onChange(newValue);
      }
    }, 1000); // Auto-save after 1 second of no typing
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getStatusIndicator = () => {
    switch (saveStatus) {
      case 'saved':
        return currentValue ? (
          <span className="text-sm font-medium text-green-700">✅ Saved</span>
        ) : (
          <span className="text-sm text-gray-500">Start typing...</span>
        );
      case 'typing':
        return <span className="text-sm text-blue-600">✏️ Typing...</span>;
      case 'saving':
        return <span className="text-sm text-orange-600">💾 Saving...</span>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium">{label}</label>
        {getStatusIndicator()}
      </div>
      {isTextarea ? (
        <textarea
          value={currentValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${height} ${
            saveStatus === 'saved' && currentValue ? 'bg-green-50 border-green-200' : ''
          }`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={currentValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${
            saveStatus === 'saved' && currentValue ? 'bg-green-50 border-green-200' : ''
          }`}
          placeholder={placeholder}
        />
      )}
      {helpText && (
        <p className="mt-1 text-xs text-gray-600">{helpText}</p>
      )}
    </div>
  );
};