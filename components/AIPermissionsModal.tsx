'use client';

import { useState } from 'react';
import { X, Wand2, Sparkles, FileText, AlertCircle } from 'lucide-react';

interface AIPermissionsModalProps {
  account: {
    id: string;
    email: string;
    contactName: string;
    companyName: string;
    canUseAiKeywords?: boolean;
    canUseAiDescriptions?: boolean;
    canUseAiContentGeneration?: boolean;
  };
  onClose: () => void;
  onUpdate: () => void;
}

export default function AIPermissionsModal({ account, onClose, onUpdate }: AIPermissionsModalProps) {
  const [permissions, setPermissions] = useState({
    canUseAiKeywords: account.canUseAiKeywords || false,
    canUseAiDescriptions: account.canUseAiDescriptions || false,
    canUseAiContentGeneration: account.canUseAiContentGeneration || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/accounts/${account.id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(permissions)
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update permissions');
      }
    } catch (err) {
      setError('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            AI Permissions
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900">{account.companyName}</h4>
            <p className="text-sm text-gray-500">{account.contactName} - {account.email}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="ai-keywords"
                checked={permissions.canUseAiKeywords}
                onChange={(e) => setPermissions({
                  ...permissions,
                  canUseAiKeywords: e.target.checked
                })}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ai-keywords" className="ml-3">
                <div className="flex items-center">
                  <Wand2 className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="font-medium text-gray-900">AI Keyword Generation</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Allow generating keywords using AI for target pages
                </p>
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="ai-descriptions"
                checked={permissions.canUseAiDescriptions}
                onChange={(e) => setPermissions({
                  ...permissions,
                  canUseAiDescriptions: e.target.checked
                })}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ai-descriptions" className="ml-3">
                <div className="flex items-center">
                  <Sparkles className="w-4 h-4 text-purple-500 mr-2" />
                  <span className="font-medium text-gray-900">AI Description Generation</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Allow generating meta descriptions using AI
                </p>
              </label>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="ai-content"
                checked={permissions.canUseAiContentGeneration}
                onChange={(e) => setPermissions({
                  ...permissions,
                  canUseAiContentGeneration: e.target.checked
                })}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ai-content" className="ml-3">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-green-500 mr-2" />
                  <span className="font-medium text-gray-900">AI Content Generation</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Allow generating full content using AI (future feature)
                </p>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}