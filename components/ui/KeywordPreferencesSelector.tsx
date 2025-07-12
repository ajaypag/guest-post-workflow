'use client';

import React from 'react';
import { 
  KeywordPreferences, 
  PrimaryKeywordFocus, 
  KEYWORD_PREFERENCE_TEMPLATES,
  KEYWORD_DESCRIPTIONS
} from '@/types/keywordPreferences';
import { Info } from 'lucide-react';

interface KeywordPreferencesSelectorProps {
  preferences?: KeywordPreferences;
  onChange: (preferences: KeywordPreferences) => void;
  compact?: boolean;
}

export const KeywordPreferencesSelector = ({ 
  preferences, 
  onChange,
  compact = false 
}: KeywordPreferencesSelectorProps) => {
  // Initialize with default if none provided
  const currentPrefs: KeywordPreferences = preferences || {
    primaryFocus: 'mixed',
    customInstructions: KEYWORD_PREFERENCE_TEMPLATES.mixed.customInstructions
  };

  const handlePrimaryFocusChange = (focus: PrimaryKeywordFocus) => {
    const template = KEYWORD_PREFERENCE_TEMPLATES[focus];
    onChange({
      ...currentPrefs,
      primaryFocus: focus,
      customInstructions: template.customInstructions || ''
    });
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keyword Focus
          </label>
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
              placeholder="Describe your keyword preferences..."
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
          Primary Keyword Focus
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