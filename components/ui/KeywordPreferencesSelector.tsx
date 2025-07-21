'use client';

import React from 'react';
import { 
  KeywordPreferences, 
  PrimaryKeywordFocus, 
  KEYWORD_PREFERENCE_TEMPLATES,
  KEYWORD_DESCRIPTIONS
} from '@/types/keywordPreferences';
import { Info } from 'lucide-react';

interface TopicPreferencesSelectorProps {
  preferences?: KeywordPreferences;
  onChange: (preferences: KeywordPreferences) => void;
  compact?: boolean;
  isPreset?: boolean; // Whether these are preset preferences (client/workflow defaults)
}

export const KeywordPreferencesSelector = ({ 
  preferences, 
  onChange,
  compact = false,
  isPreset = false 
}: TopicPreferencesSelectorProps) => {
  // Initialize with default if none provided, but properly handle undefined
  const currentPrefs: KeywordPreferences = preferences !== undefined ? preferences : {
    primaryFocus: 'mixed',
    customInstructions: KEYWORD_PREFERENCE_TEMPLATES.mixed.customInstructions
  };

  const [isEditing, setIsEditing] = React.useState(false);

  const handlePrimaryFocusChange = (focus: PrimaryKeywordFocus) => {
    const template = KEYWORD_PREFERENCE_TEMPLATES[focus];
    const newPrefs = {
      ...currentPrefs,
      primaryFocus: focus,
      customInstructions: template.customInstructions || ''
    };
    onChange(newPrefs);
  };

  if (compact) {
    // If preferences are preset and we're not editing, show a cleaner view
    if (isPreset && preferences && !isEditing) {
      return (
        <div className="space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Current Focus: </span>
                <span className="text-gray-900">{KEYWORD_DESCRIPTIONS.primaryFocus[currentPrefs.primaryFocus]?.title}</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Change for this workflow
              </button>
            </div>
            <p className="text-xs text-gray-600">
              {KEYWORD_DESCRIPTIONS.primaryFocus[currentPrefs.primaryFocus]?.description}
            </p>
            {currentPrefs.customInstructions && currentPrefs.primaryFocus === 'custom' && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">Custom instructions:</p>
                <p className="text-xs text-gray-700 mt-1">{currentPrefs.customInstructions}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show the full editor if not preset or if editing
    return (
      <div className="space-y-3">
        {isEditing && (
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Override Topic Focus
            </label>
            <button
              onClick={() => {
                setIsEditing(false);
                // Reset to original preferences if canceling
                if (isPreset && preferences) {
                  onChange(preferences);
                }
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
        <div>
          {!isEditing && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Guest Post Topic Focus
            </label>
          )}
          <select
            value={currentPrefs.primaryFocus}
            onChange={(e) => handlePrimaryFocusChange(e.target.value as PrimaryKeywordFocus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(KEYWORD_DESCRIPTIONS.primaryFocus).map(([key, desc]) => (
              <option key={key} value={key}>
                {desc.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {KEYWORD_DESCRIPTIONS.primaryFocus[currentPrefs.primaryFocus]?.description}
          </p>
        </div>

        {currentPrefs.primaryFocus === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Instructions
            </label>
            <textarea
              value={currentPrefs.customInstructions || ''}
              onChange={(e) => onChange({ ...currentPrefs, customInstructions: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Describe your guest post topic preferences..."
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Focus Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Primary Guest Post Topic Focus
        </label>
        <div className="space-y-3">
          {Object.entries(KEYWORD_DESCRIPTIONS.primaryFocus).map(([key, desc]) => (
            <div key={key} className="relative">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="primaryFocus"
                  value={key}
                  checked={currentPrefs.primaryFocus === key}
                  onChange={(e) => handlePrimaryFocusChange(e.target.value as PrimaryKeywordFocus)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{desc.title}</div>
                  <div className="text-sm text-gray-600">{desc.description}</div>
                  <div className="text-xs text-gray-500 mt-1 font-mono">{desc.examples}</div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {currentPrefs.primaryFocus === 'custom' ? 'Custom Instructions' : 'Additional Instructions (Optional)'}
        </label>
        <textarea
          value={currentPrefs.customInstructions || ''}
          onChange={(e) => onChange({ ...currentPrefs, customInstructions: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={currentPrefs.primaryFocus === 'custom' 
            ? "Describe your keyword preferences in detail..."
            : "Additional keyword guidance that will be added to prompts..."
          }
        />
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <Info className="w-4 h-4 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-blue-800">Prompt Enhancement Preview</span>
        </div>
        <div className="text-sm text-blue-700 font-mono bg-white border border-blue-300 rounded p-2">
          {currentPrefs.primaryFocus === 'mixed' ? 
            'Note: I prefer mixed approach keywords. Use a balanced approach mixing educational and commercial keywords to capture users at different funnel stages.' :
            `Note: I prefer ${currentPrefs.primaryFocus.replace('-', ' ')} keywords. ${KEYWORD_PREFERENCE_TEMPLATES[currentPrefs.primaryFocus]?.customInstructions || ''}`
          }
          {currentPrefs.customInstructions && ` Additional instructions: ${currentPrefs.customInstructions}`}
        </div>
      </div>
    </div>
  );
};