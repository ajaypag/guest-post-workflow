'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PageOption {
  path: string;
  title: string;
  type: 'blog' | 'marketing';
}

interface EditRequest {
  id: string;
  pagePath: string;
  userRequest: string;
  aiAnalysis: string;
  suggestedChanges: string;
  currentContent: string;
  modifiedContent: string;
  status: 'analyzing' | 'ready' | 'approved' | 'applied';
  createdAt: string;
}

interface WebsiteEditsClientProps {
  session: any;
}

export default function WebsiteEditsClient({ session }: WebsiteEditsClientProps) {
  const [availablePages, setAvailablePages] = useState<PageOption[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [userRequest, setUserRequest] = useState<string>('');
  const [currentRequest, setCurrentRequest] = useState<EditRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load available pages on component mount
  useEffect(() => {
    fetchAvailablePages();
  }, []);

  const fetchAvailablePages = async () => {
    try {
      const response = await fetch('/api/internal/website-edits/pages');
      const data = await response.json();
      setAvailablePages(data.pages || []);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedPage || !userRequest.trim()) {
      alert('Please select a page and enter your request');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/internal/website-edits/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagePath: selectedPage,
          userRequest: userRequest.trim()
        })
      });

      const result = await response.json();
      if (response.ok) {
        setCurrentRequest(result.request);
        setUserRequest('');
      } else {
        alert(result.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Request failed:', error);
      alert('Failed to submit request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveChanges = async () => {
    if (!currentRequest) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/internal/website-edits/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: currentRequest.id
        })
      });

      const result = await response.json();
      if (response.ok) {
        setCurrentRequest({ ...currentRequest, status: 'applied' });
        alert('Changes applied successfully!');
      } else {
        alert(result.error || 'Failed to apply changes');
      }
    } catch (error) {
      console.error('Apply failed:', error);
      alert('Failed to apply changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectChanges = () => {
    setCurrentRequest(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Website Editor</h1>
        <p className="text-gray-600">Select a page, describe your desired changes, and let AI make suggestions.</p>
      </div>

      {/* Request Form */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">New Edit Request</h2>
        
        <div className="space-y-4">
          {/* Page Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Page to Edit
            </label>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Choose a page...</option>
              {availablePages.map((page) => (
                <option key={page.path} value={page.path}>
                  {page.title} ({page.type})
                </option>
              ))}
            </select>
          </div>

          {/* Request Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe Your Changes
            </label>
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              placeholder="e.g., Make the intro more compelling, add a stronger call-to-action, improve the conclusion..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleSubmitRequest}
            disabled={isLoading || !selectedPage || !userRequest.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'AI is analyzing...' : 'Submit Request to AI'}
          </Button>
        </div>
      </Card>

      {/* AI Response & Approval */}
      {currentRequest && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Suggestion</h2>
          
          <div className="space-y-6">
            {/* AI Analysis */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">AI Analysis:</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-gray-700">{currentRequest.aiAnalysis}</p>
              </div>
            </div>

            {/* Suggested Changes */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Suggested Changes:</h3>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-line">{currentRequest.suggestedChanges}</p>
              </div>
            </div>

            {/* Before/After Comparison */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Content Comparison:</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-red-700 mb-2">Before:</h4>
                  <div className="bg-red-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">{currentRequest.currentContent.substring(0, 500)}...</pre>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2">After:</h4>
                  <div className="bg-green-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">{currentRequest.modifiedContent.substring(0, 500)}...</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Actions */}
            {currentRequest.status === 'ready' && (
              <div className="flex space-x-4">
                <Button
                  onClick={handleApproveChanges}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Applying...' : 'Approve & Apply Changes'}
                </Button>
                <Button
                  onClick={handleRejectChanges}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Reject Changes
                </Button>
              </div>
            )}

            {currentRequest.status === 'applied' && (
              <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                <p className="text-green-700 font-medium">✅ Changes have been successfully applied to the page!</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}