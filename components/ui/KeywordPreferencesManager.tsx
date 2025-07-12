'use client';

import React, { useState } from 'react';
import { 
  KeywordPreferences, 
  PrimaryKeywordFocus, 
  KEYWORD_PREFERENCE_TEMPLATES,
  KEYWORD_DESCRIPTIONS,
  KeywordLength,
  SearcherIntent,
  BrandAssociation,
  LocationFocus,
  ResearchRole,
  FunnelStage,
  SpecialFormat
} from '@/types/keywordPreferences';
import { ChevronDown, ChevronRight, Info, Target, Plus, X } from 'lucide-react';

interface KeywordPreferencesManagerProps {
  preferences?: KeywordPreferences;
  onChange: (preferences: KeywordPreferences) => void;
  targetUrls?: string[];
  showUrlSpecific?: boolean;
  compact?: boolean;
}

export const KeywordPreferencesManager = ({ 
  preferences, 
  onChange, 
  targetUrls = [], 
  showUrlSpecific = true,
  compact = false 
}: KeywordPreferencesManagerProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showUrlConfig, setShowUrlConfig] = useState(false);
  const [newUrlMapping, setNewUrlMapping] = useState('');

  // Initialize with default if none provided
  const currentPrefs: KeywordPreferences = preferences || {
    primaryFocus: 'mixed',
    detailed: KEYWORD_PREFERENCE_TEMPLATES.mixed.detailed!,
    urlSpecificPreferences: {}
  };

  const handlePrimaryFocusChange = (focus: PrimaryKeywordFocus) => {
    const template = KEYWORD_PREFERENCE_TEMPLATES[focus];
    onChange({
      ...currentPrefs,
      primaryFocus: focus,
      detailed: { ...currentPrefs.detailed, ...template.detailed },
      customInstructions: template.customInstructions
    });
  };

  const handleDetailedChange = (field: keyof KeywordPreferences['detailed'], value: any) => {
    onChange({
      ...currentPrefs,
      detailed: {
        ...currentPrefs.detailed,
        [field]: value
      }
    });
  };

  const addUrlMapping = () => {
    if (!newUrlMapping.trim()) return;
    
    onChange({
      ...currentPrefs,
      urlSpecificPreferences: {
        ...currentPrefs.urlSpecificPreferences,
        [newUrlMapping]: {
          primaryFocus: 'mixed',
          reason: ''
        }
      }
    });
    setNewUrlMapping('');
  };

  const removeUrlMapping = (url: string) => {
    const updated = { ...currentPrefs.urlSpecificPreferences };
    delete updated[url];
    onChange({
      ...currentPrefs,
      urlSpecificPreferences: updated
    });
  };

  const updateUrlMapping = (url: string, updates: Partial<NonNullable<KeywordPreferences['urlSpecificPreferences']>[string]>) => {
    const existing = currentPrefs.urlSpecificPreferences?.[url] || { primaryFocus: 'mixed' as const };
    onChange({
      ...currentPrefs,
      urlSpecificPreferences: {
        ...currentPrefs.urlSpecificPreferences,
        [url]: {
          ...existing,
          ...updates
        }
      }
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

        {currentPrefs.customInstructions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Instructions
            </label>
            <textarea
              value={currentPrefs.customInstructions}
              onChange={(e) => onChange({ ...currentPrefs, customInstructions: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Additional keyword guidance..."
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
          Custom Instructions
        </label>
        <textarea
          value={currentPrefs.customInstructions || ''}
          onChange={(e) => onChange({ ...currentPrefs, customInstructions: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Additional keyword guidance that will be added to prompts..."
        />
      </div>

      {/* Advanced Configuration */}
      {currentPrefs.primaryFocus === 'custom' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-gray-700 mb-3"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
            Advanced Configuration
          </button>

          {showAdvanced && (
            <div className="space-y-4 mt-3">
              {/* Length */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Keyword Length</label>
                <div className="flex flex-wrap gap-2">
                  {(['head', 'mid-tail', 'long-tail'] as KeywordLength[]).map((length) => (
                    <label key={length} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={currentPrefs.detailed.length.includes(length)}
                        onChange={(e) => {
                          const current = currentPrefs.detailed.length;
                          const updated = e.target.checked 
                            ? [...current, length]
                            : current.filter(l => l !== length);
                          handleDetailedChange('length', updated);
                        }}
                        className="mr-2"
                      />
                      {KEYWORD_DESCRIPTIONS.length[length]?.title}
                    </label>
                  ))}
                </div>
              </div>

              {/* Intent */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Search Intent</label>
                <div className="flex flex-wrap gap-2">
                  {(['informational', 'navigational', 'commercial-investigation', 'transactional'] as SearcherIntent[]).map((intent) => (
                    <label key={intent} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={currentPrefs.detailed.intent.includes(intent)}
                        onChange={(e) => {
                          const current = currentPrefs.detailed.intent;
                          const updated = e.target.checked 
                            ? [...current, intent]
                            : current.filter(i => i !== intent);
                          handleDetailedChange('intent', updated);
                        }}
                        className="mr-2"
                      />
                      {KEYWORD_DESCRIPTIONS.intent[intent]?.title}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL-Specific Preferences */}
      {showUrlSpecific && targetUrls.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <button
            onClick={() => setShowUrlConfig(!showUrlConfig)}
            className="flex items-center text-sm font-medium text-purple-800 mb-3"
          >
            <Target className="w-4 h-4 mr-2" />
            {showUrlConfig ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
            URL-Specific Preferences ({Object.keys(currentPrefs.urlSpecificPreferences || {}).length})
          </button>

          {showUrlConfig && (
            <div className="space-y-4">
              {/* Existing URL mappings */}
              {Object.entries(currentPrefs.urlSpecificPreferences || {}).map(([url, config]) => (
                <div key={url} className="bg-white border border-purple-300 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-xs text-purple-800 truncate flex-1 mr-2">
                      {url}
                    </div>
                    <button
                      onClick={() => removeUrlMapping(url)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <select
                        value={config.primaryFocus}
                        onChange={(e) => updateUrlMapping(url, { primaryFocus: e.target.value as PrimaryKeywordFocus })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {Object.entries(KEYWORD_DESCRIPTIONS.primaryFocus).map(([key, desc]) => (
                          <option key={key} value={key}>{desc.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={config.reason || ''}
                        onChange={(e) => updateUrlMapping(url, { reason: e.target.value })}
                        placeholder="Reason for this preference"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add new URL mapping */}
              <div className="flex space-x-2">
                <select
                  value={newUrlMapping}
                  onChange={(e) => setNewUrlMapping(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select URL to configure...</option>
                  {targetUrls
                    .filter(url => !currentPrefs.urlSpecificPreferences?.[url])
                    .map(url => (
                      <option key={url} value={url}>{url}</option>
                    ))}
                </select>
                <button
                  onClick={addUrlMapping}
                  disabled={!newUrlMapping}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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