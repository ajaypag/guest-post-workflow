'use client';

import React, { useState } from 'react';
import { ChevronDown, Edit } from 'lucide-react';

interface SplitPromptButtonProps {
  onSend: () => void;
  onEdit: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SplitPromptButton = ({ 
  onSend, 
  onEdit, 
  disabled = false, 
  children,
  className = ''
}: SplitPromptButtonProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSend = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSend();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(false);
    onEdit();
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex">
        {/* Main button */}
        <button
          onClick={handleSend}
          disabled={disabled}
          className="flex-1 text-left px-4 py-3 text-sm bg-blue-600 text-white border border-blue-600 rounded-l hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
        >
          {children}
        </button>
        
        {/* Dropdown toggle */}
        <button
          onClick={handleDropdownToggle}
          disabled={disabled}
          className="px-3 py-3 text-sm bg-blue-600 text-white border-l border-blue-700 border-t border-r border-b border-blue-600 rounded-r hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-40">
            <button
              onClick={handleEdit}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 rounded-lg"
            >
              <Edit className="w-3 h-3" />
              Edit First
            </button>
          </div>
        </>
      )}
    </div>
  );
};