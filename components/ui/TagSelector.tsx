import React from 'react';
import { Check } from 'lucide-react';

interface TagSelectorProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  label: string;
  className?: string;
}

export function TagSelector({
  availableTags,
  selectedTags,
  onChange,
  label,
  className = ""
}: TagSelectorProps) {
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected tags summary */}
      {selectedTags.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Selected {label}:</div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full"
              >
                <Check className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All available tags */}
      <div>
        <div className="text-sm font-medium text-gray-700 mb-3">
          Available {label} ({availableTags.length} options):
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center px-3 py-2 text-sm rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 mr-1" />}
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-3">
        Click tags to select/deselect • {selectedTags.length} selected of {availableTags.length} available
      </p>
    </div>
  );
}