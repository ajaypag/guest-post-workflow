'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Link2, Type, Plus, X } from 'lucide-react';

interface TargetPage {
  url: string;
  anchorText?: string;
  pageId?: string;
  requestedLinks?: number;
}

interface TargetPageSelectorProps {
  value?: {
    targetPageUrl?: string;
    anchorText?: string;
  };
  onChange: (value: { targetPageUrl: string; anchorText: string }) => void;
  availableTargetPages: TargetPage[];
  groupName?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function TargetPageSelector({
  value,
  onChange,
  availableTargetPages,
  groupName,
  allowCustom = true,
  disabled = false,
  className = ''
}: TargetPageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customAnchor, setCustomAnchor] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<TargetPage | null>(null);

  // Initialize selected target from value
  useEffect(() => {
    if (value?.targetPageUrl) {
      const found = availableTargetPages.find(tp => tp.url === value.targetPageUrl);
      if (found) {
        setSelectedTarget(found);
      } else if (value.targetPageUrl) {
        // Custom value
        setSelectedTarget({
          url: value.targetPageUrl,
          anchorText: value.anchorText
        });
      }
    }
  }, [value, availableTargetPages]);

  const handleSelectTarget = (target: TargetPage) => {
    setSelectedTarget(target);
    onChange({
      targetPageUrl: target.url,
      anchorText: target.anchorText || ''
    });
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCustomSubmit = () => {
    if (customUrl) {
      const customTarget: TargetPage = {
        url: customUrl,
        anchorText: customAnchor
      };
      handleSelectTarget(customTarget);
      setCustomUrl('');
      setCustomAnchor('');
    }
  };

  const handleClear = () => {
    setSelectedTarget(null);
    onChange({
      targetPageUrl: '',
      anchorText: ''
    });
  };

  // Group target pages by base URL for better organization
  const groupedTargets = availableTargetPages.reduce((acc, target) => {
    try {
      const url = new URL(target.url);
      const baseUrl = url.hostname;
      if (!acc[baseUrl]) {
        acc[baseUrl] = [];
      }
      acc[baseUrl].push(target);
    } catch {
      // Invalid URL, put in "other" category
      if (!acc['other']) {
        acc['other'] = [];
      }
      acc['other'].push(target);
    }
    return acc;
  }, {} as Record<string, TargetPage[]>);

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        {/* Selected Target Display */}
        {selectedTarget ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Target Page</p>
                    <p className="text-sm text-blue-700 break-all">{selectedTarget.url}</p>
                  </div>
                </div>
                {selectedTarget.anchorText && (
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Anchor Text</p>
                      <p className="text-sm text-blue-700">"{selectedTarget.anchorText}"</p>
                    </div>
                  </div>
                )}
              </div>
              {!disabled && (
                <button
                  onClick={handleClear}
                  className="p-1 hover:bg-blue-100 rounded text-blue-600"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">No target page selected</div>
        )}

        {/* Selector Button */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
          >
            <span className="text-sm text-gray-700">
              {selectedTarget ? 'Change target page' : 'Select target page'}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-3">
              <h3 className="text-sm font-medium text-gray-900">
                Available Target Pages {groupName && `for ${groupName}`}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {availableTargetPages.length} target page{availableTargetPages.length !== 1 ? 's' : ''} defined
              </p>
            </div>

            {/* Predefined Target Pages */}
            {Object.entries(groupedTargets).map(([domain, targets]) => (
              <div key={domain} className="border-b border-gray-100">
                <div className="px-3 py-2 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                    {domain === 'other' ? 'Other Pages' : domain}
                  </p>
                </div>
                {targets.map((target, idx) => (
                  <button
                    key={`${domain}-${idx}`}
                    onClick={() => handleSelectTarget(target)}
                    className="w-full px-3 py-3 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-900 break-all">
                          {(() => {
                            try {
                              const url = new URL(target.url);
                              return url.pathname === '/' ? 'Homepage' : url.pathname;
                            } catch {
                              return target.url;
                            }
                          })()}
                        </span>
                        {target.requestedLinks && (
                          <span className="text-xs text-gray-500">
                            ({target.requestedLinks} link{target.requestedLinks !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      {target.anchorText && (
                        <div className="flex items-center gap-2 ml-5">
                          <Type className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-600">"{target.anchorText}"</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 ml-5 break-all">
                        {target.url}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}

            {/* Custom Entry Option */}
            {allowCustom && (
              <div className="border-t border-gray-200">
                {!showCustom ? (
                  <button
                    onClick={() => setShowCustom(true)}
                    className="w-full px-3 py-3 hover:bg-gray-50 text-left flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Add custom target page</span>
                  </button>
                ) : (
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Target Page URL
                      </label>
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://example.com/page"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Anchor Text (optional)
                      </label>
                      <input
                        type="text"
                        value={customAnchor}
                        onChange={(e) => setCustomAnchor(e.target.value)}
                        placeholder="Link text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCustomSubmit}
                        disabled={!customUrl}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowCustom(false);
                          setCustomUrl('');
                          setCustomAnchor('');
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}