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

interface QuickVettedSitesRequestProps {
  onSuccess?: () => void;
  compact?: boolean;
  hideWhatYouReceive?: boolean;
}

export default function QuickVettedSitesRequest({ onSuccess, compact = false, hideWhatYouReceive = false }: QuickVettedSitesRequestProps) {
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
        // Handle success callback or redirect
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        } else {
          setTimeout(() => {
            router.push('/vetted-sites/requests');
          }, 2000);
        }
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
      <div className={`bg-white ${compact ? 'rounded-lg p-6' : 'rounded-xl shadow-lg p-8'}`}>
        <div className={`text-center ${compact ? 'py-4' : 'py-8'}`}>
          <div className={`mx-auto ${compact ? 'w-12 h-12' : 'w-16 h-16'} bg-green-100 rounded-full flex items-center justify-center mb-4`}>
            <CheckCircle className={`${compact ? 'h-6 w-6' : 'h-8 w-8'} text-green-600`} />
          </div>
          <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-2`}>
            Request Submitted Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            We're analyzing websites for your target URLs...
          </p>
          <div className="inline-flex items-center text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {onSuccess ? 'Updating dashboard...' : 'Redirecting to your requests...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Friendly intro - styled as info box (hidden in compact mode) */}
      {!compact && (
        <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            What is Linkio?
          </h2>
          <p className="text-blue-800 leading-relaxed">
            We help you get mentioned in ChatGPT, Claude, AI Overviews, and Google searches through strategic guest posts. Instead of picking random high-authority sites, we find websites that already rank for topics related to your business—boosting your AI visibility while improving your traditional search rankings.
          </p>
        </div>
      )}

      {/* Call to action */}
      {!compact && (
        <div className="mb-6">
          <p className="text-gray-900 font-medium text-lg">
            Want to see which sites match your keywords? Enter your target URLs below:
          </p>
        </div>
      )}

      {/* Form - Clean, dashboard-style */}
      <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'shadow-sm' : 'shadow-sm'}`}>
        <form onSubmit={handleSubmit} className={compact ? "p-6" : "p-8"}>
        {compact && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Request More Vetted Sites</h3>
            <p className="text-sm text-gray-600">Enter your target URLs to find relevant guest post opportunities</p>
          </div>
        )}
        
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
            placeholder="https://yoursite.com/product
https://yoursite.com/another-page"
            rows={4}
            className="font-mono text-sm border-gray-300 focus:border-gray-400 focus:ring-0 focus:ring-gray-400/20"
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


        {/* Submit Button - Clean and focused */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || !targetUrls.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                Get Vetted Sites & Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        
        <p className="mt-3 text-xs text-gray-500 text-center">
          Results in 24 hours • No commitment required
        </p>
      </form>
      </div>

      {/* What you'll get - moved outside with better spacing */}
      {!hideWhatYouReceive && (
        <div className="mt-12">
          <p className="text-base font-medium text-gray-900 mb-6 text-center">What you'll receive:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-base mb-2">Keyword Overlap Analysis</h3>
              <p className="text-sm text-gray-600 leading-relaxed">See which keywords each site ranks for vs. yours</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-base mb-2">Target Relevance Scores</h3>
              <p className="text-sm text-gray-600 leading-relaxed">AI analysis of why each site matches your content</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-base mb-2">Fair Pricing</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Wholesale cost + $79 admin fee (no markups)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}