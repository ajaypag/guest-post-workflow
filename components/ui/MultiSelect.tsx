import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplayItems?: number;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
  className = "",
  maxDisplayItems = 2
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 256; // max-h-64 = 16rem = 256px
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If there's not enough space below but more space above, position above
      const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setDropdownPosition({
        top: shouldPositionAbove 
          ? rect.top + window.scrollY - dropdownHeight - 4
          : rect.bottom + window.scrollY + 4,
        left: Math.max(8, rect.left + window.scrollX), // Ensure at least 8px from left edge
        width: Math.max(rect.width, 200) // Minimum width of 200px
      });
    }
    setIsOpen(!isOpen);
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(opt => opt.value));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }
    
    if (selectedValues.length === options.length) {
      return "All Statuses";
    }

    if (selectedValues.length <= maxDisplayItems) {
      return selectedValues
        .map(value => options.find(opt => opt.value === value)?.label)
        .join(', ');
    }

    const firstTwo = selectedValues
      .slice(0, maxDisplayItems)
      .map(value => options.find(opt => opt.value === value)?.label)
      .join(', ');
    
    return `${firstTwo} +${selectedValues.length - maxDisplayItems} more`;
  };

  const getStatusColor = (value: string): string => {
    switch (value) {
      case 'high_quality': return 'text-green-700 bg-green-50';
      case 'good_quality': return 'text-blue-700 bg-blue-50';
      case 'marginal_quality': return 'text-yellow-700 bg-yellow-50';
      case 'disqualified': return 'text-red-700 bg-red-50';
      case 'pending': return 'text-gray-700 bg-gray-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className={`relative ${className} ${isOpen ? 'z-[101]' : ''}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleDropdown}
        className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-left flex items-center justify-between min-w-[120px] lg:min-w-[140px]"
      >
        <span className="truncate text-gray-900">
          {getDisplayText()}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            minWidth: '200px'
          }}
          ref={dropdownRef}
        >
          {/* Select All Option */}
          <div 
            className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 flex items-center justify-between text-sm font-medium"
            onClick={handleSelectAll}
          >
            <span className="text-gray-900">
              {selectedValues.length === options.length ? 'Deselect All' : 'Select All'}
            </span>
            {selectedValues.length === options.length && (
              <Check className="h-4 w-4 text-indigo-600" />
            )}
          </div>

          {/* Individual Options */}
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <div
                key={option.value}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-sm"
                onClick={() => handleToggleOption(option.value)}
              >
                <span className={`flex items-center gap-2 ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(option.value).split(' ')[1]?.replace('bg-', 'bg-') || 'bg-gray-200'}`} />
                  {option.label}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 text-indigo-600" />
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}