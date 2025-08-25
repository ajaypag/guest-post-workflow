'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface EditVettedSitesRequestFormProps {
  request: {
    id: string;
    targetUrls: string[];
    filters?: any;
    notes?: string;
  };
}

export default function EditVettedSitesRequestForm({ request }: EditVettedSitesRequestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [targetUrls, setTargetUrls] = useState(
    Array.isArray(request.targetUrls) ? request.targetUrls.join('\n') : ''
  );
  const [notes, setNotes] = useState(request.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetUrls.trim()) {
      setError('Please enter at least one target URL');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Parse URLs
      const urls = targetUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      // Validate URLs
      for (const url of urls) {
        try {
          new URL(url);
        } catch {
          throw new Error(`Invalid URL: ${url}`);
        }
      }

      const response = await fetch(`/api/vetted-sites/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          target_urls: urls,
          notes: notes.trim() || undefined
        })
      });

      if (response.ok) {
        router.push(`/vetted-sites/requests/${request.id}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Target URLs */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Your Target URLs
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Enter the pages you want to promote (one per line)
          </p>
          <Textarea
            value={targetUrls}
            onChange={(e) => setTargetUrls(e.target.value)}
            placeholder="https://yoursite.com/product&#10;https://yoursite.com/another-page"
            rows={6}
            className="font-mono text-sm border-gray-300 focus:border-gray-400 focus:ring-0 focus:ring-gray-400/20"
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            These are the pages you want mentioned in guest posts and AI responses
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Additional Notes (Optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific requirements or context about your request..."
            rows={3}
            className="text-sm border-gray-300 focus:border-gray-400 focus:ring-0 focus:ring-gray-400/20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={loading || !targetUrls.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                Update Request
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/vetted-sites/requests/${request.id}`)}
            className="px-6"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>

        <p className="mt-3 text-xs text-gray-500 text-center">
          Your request will be reviewed within 24 hours after updating
        </p>
      </form>
    </div>
  );
}