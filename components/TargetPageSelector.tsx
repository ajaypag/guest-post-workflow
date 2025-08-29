'use client';

import React, { useState, useEffect } from 'react';
import { clientStorage } from '@/lib/userStorage';

interface TargetPageSelectorProps {
  label: string;
  clientId?: string;
  targetPageId?: string;
  onChange: (targetPageId: string, targetPageUrl: string) => void;
  placeholder?: string;
}

export const TargetPageSelector = ({ 
  label, 
  clientId,
  targetPageId,
  onChange, 
  placeholder = "Select a target page for this workflow"
}: TargetPageSelectorProps) => {
  const [targetPages, setTargetPages] = useState<Array<{ id: string; url: string; title?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState(targetPageId || '');

  useEffect(() => {
    const loadTargetPages = async () => {
      if (!clientId) return;
      
      setLoading(true);
      try {
        const client = await clientStorage.getClient(clientId);
        if (client?.targetPages) {
          setTargetPages(client.targetPages);
        }
      } catch (error) {
        console.error('Failed to load target pages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTargetPages();
  }, [clientId]);

  const handleChange = (pageId: string) => {
    setSelectedPageId(pageId);
    const selectedPage = targetPages.find(p => p.id === pageId);
    if (selectedPage) {
      onChange(pageId, selectedPage.url);
    }
  };

  const getSaveStatus = () => {
    if (loading) {
      return <span className="text-sm text-gray-500">Loading target pages...</span>;
    }
    if (selectedPageId) {
      return <span className="text-sm font-medium text-green-700">✅ Selected</span>;
    }
    return <span className="text-sm text-gray-500">Select target page...</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium">{label}</label>
        {getSaveStatus()}
      </div>
      <select
        value={selectedPageId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading || targetPages.length === 0}
        className={`w-full px-3 py-2 border rounded-md ${
          selectedPageId ? 'bg-green-50 border-green-200' : ''
        } ${loading || targetPages.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <option value="">{placeholder}</option>
        {targetPages.map((page) => (
          <option key={page.id} value={page.id}>
            {page.title || page.url}
          </option>
        ))}
      </select>
      
      {!loading && targetPages.length === 0 && clientId && (
        <p className="mt-1 text-sm text-amber-600">
          No target pages found. Please add target pages in the client settings.
        </p>
      )}
      
      {selectedPageId && (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
          <p className="text-xs text-blue-800">
            Selected URL: {targetPages.find(p => p.id === selectedPageId)?.url}
          </p>
        </div>
      )}
    </div>
  );
};