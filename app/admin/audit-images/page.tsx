'use client';

import { useState } from 'react';
import { AlertCircle, Search, Trash2, CheckCircle, Image } from 'lucide-react';

interface BrokenImage {
  file: string;
  line: number;
  url: string;
  type: string;
}

export default function AuditImagesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    brokenImagesCount: number;
    brokenImages: BrokenImage[];
    rawOutput: string;
  } | null>(null);
  const [error, setError] = useState<string>('');
  const [fixing, setFixing] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/admin/audit-images', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'your-admin-key'}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to run audit: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixBrokenImages = async () => {
    setFixing(true);
    setError('');

    try {
      const response = await fetch('/api/admin/audit-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_API_KEY || 'your-admin-key'}`,
        },
        body: JSON.stringify({ fix: true }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fix images: ${response.statusText}`);
      }

      const data = await response.json();
      alert('Broken images have been removed! Check the console output for details.');
      console.log(data.output);
      
      // Re-run audit to show updated results
      await runAudit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Image className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Marketing Images Audit</h1>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              This tool scans all marketing pages for broken image references and can automatically remove them.
              It checks local files in /public and external URLs.
            </p>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              onClick={runAudit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Scanning...' : 'Scan for Broken Images'}
            </button>

            {results && results.brokenImagesCount > 0 && (
              <button
                onClick={fixBrokenImages}
                disabled={fixing}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                {fixing ? 'Removing...' : `Remove ${results.brokenImagesCount} Broken Images`}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {results.brokenImagesCount === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-green-900 font-semibold">No broken images found!</p>
                      <p className="text-green-700 text-sm mt-1">
                        All image references in marketing pages are valid.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <p className="text-yellow-900">
                        Found <span className="font-bold">{results.brokenImagesCount}</span> broken image{results.brokenImagesCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Broken Images by File:</h2>
                    
                    {Object.entries(
                      results.brokenImages.reduce((acc, img) => {
                        if (!acc[img.file]) acc[img.file] = [];
                        acc[img.file].push(img);
                        return acc;
                      }, {} as Record<string, BrokenImage[]>)
                    ).map(([file, images]) => (
                      <div key={file} className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-mono text-sm font-semibold text-gray-900 mb-3">
                          {file}
                        </h3>
                        <div className="space-y-2">
                          {images.map((img, idx) => (
                            <div key={idx} className="bg-white border rounded p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm">
                                    <span className="text-gray-500">Line {img.line}:</span>{' '}
                                    <span className="font-mono text-red-600">{img.url}</span>
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Type: <span className="font-medium">{img.type}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        View Raw Output
                      </summary>
                      <pre className="mt-4 text-xs overflow-x-auto whitespace-pre-wrap">
                        {results.rawOutput}
                      </pre>
                    </details>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">CLI Commands:</h3>
            <div className="space-y-2">
              <code className="block text-xs bg-gray-100 p-2 rounded">
                npm run audit:images        # Check for broken images
              </code>
              <code className="block text-xs bg-gray-100 p-2 rounded">
                npm run audit:images:fix    # Remove broken images
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}