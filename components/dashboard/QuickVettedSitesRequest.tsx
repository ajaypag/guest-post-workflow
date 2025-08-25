'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Globe,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function QuickVettedSitesRequest() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [targetUrls, setTargetUrls] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [filters, setFilters] = useState({
    dr_min: '',
    dr_max: '',
    traffic_min: '',
    price_min: '',
    price_max: '',
  });

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

      // Transform filters
      const transformedFilters: any = {};
      if (filters.dr_min) transformedFilters.dr_min = parseInt(filters.dr_min);
      if (filters.dr_max) transformedFilters.dr_max = parseInt(filters.dr_max);
      if (filters.traffic_min) transformedFilters.traffic_min = parseInt(filters.traffic_min);
      if (filters.price_min) transformedFilters.price_min = parseInt(filters.price_min) * 100; // Convert to cents
      if (filters.price_max) transformedFilters.price_max = parseInt(filters.price_max) * 100; // Convert to cents

      const requestData = {
        target_urls: urls,
        filters: transformedFilters,
        notes: 'Request created from dashboard quick start'
      };

      const response = await fetch('/api/vetted-sites/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        setSuccess(true);
        // Redirect after a brief success message
        setTimeout(() => {
          router.push('/vetted-sites/requests');
        }, 2000);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Request Submitted Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            We're analyzing websites for your target URLs...
          </p>
          <div className="inline-flex items-center text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Redirecting to your requests...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-white/90 font-medium">Quick Start</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Get AI-Optimized Website Recommendations
        </h2>
        <p className="text-white/90">
          Enter your target URLs and we'll find vetted sites that will boost your visibility in ChatGPT, Claude, Perplexity, and AI search results
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Target URLs Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            <Globe className="inline h-4 w-4 mr-1 text-gray-500" />
            Your Target URLs
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Enter the pages you want to promote (one per line)
          </p>
          <Textarea
            value={targetUrls}
            onChange={(e) => setTargetUrls(e.target.value)}
            placeholder="https://yoursite.com/product"
            rows={4}
            className="font-mono text-sm"
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            These are the pages you want mentioned in guest posts and AI responses
          </p>
        </div>

        {/* Optional Preferences */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowPreferences(!showPreferences)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${
              showPreferences ? 'rotate-90' : ''
            }`} />
            Website Preferences (Optional)
          </button>

          {showPreferences && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Domain Rating */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Domain Rating (DR)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.dr_min}
                      onChange={(e) => setFilters(prev => ({ ...prev, dr_min: e.target.value }))}
                      className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                      min="0"
                      max="100"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.dr_max}
                      onChange={(e) => setFilters(prev => ({ ...prev, dr_max: e.target.value }))}
                      className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Traffic */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Min. Monthly Traffic
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 10000"
                    value={filters.traffic_min}
                    onChange={(e) => setFilters(prev => ({ ...prev, traffic_min: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                    min="0"
                  />
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Price Range ($)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.price_min}
                      onChange={(e) => setFilters(prev => ({ ...prev, price_min: e.target.value }))}
                      className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.price_max}
                      onChange={(e) => setFilters(prev => ({ ...prev, price_max: e.target.value }))}
                      className="w-1/2 px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Leave blank to see all available options. You can filter results later.
              </p>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">What happens next:</h4>
          <ol className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>We analyze your target URLs to understand your content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>Our AI finds websites already ranking for similar topics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>You receive personalized recommendations within 24 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">4.</span>
              <span>Choose which sites to order guest posts from</span>
            </li>
          </ol>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !targetUrls.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Submitting Request...
            </>
          ) : (
            <>
              Get Vetted Sites Recommendations
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>

        <p className="mt-4 text-xs text-center text-gray-500">
          No commitment required • Results in 24 hours • 100% tailored to your content
        </p>
      </form>
    </div>
  );
}