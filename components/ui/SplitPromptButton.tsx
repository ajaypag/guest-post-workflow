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
          className="flex-1 text-left px-3 py-2 text-sm bg-white border border-gray-300 rounded-l hover:bg-gray-50 disabled:opacity-50"
        >
          {children}
        </button>
        
        {/* Dropdown toggle */}
        <button
          onClick={handleDropdownToggle}
          disabled={disabled}
          className="px-2 py-2 text-sm bg-white border-l-0 border-t border-r border-b border-gray-300 rounded-r hover:bg-gray-50 disabled:opacity-50"
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