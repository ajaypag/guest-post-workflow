'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Eye, Play } from 'lucide-react';

interface DomainPreview {
  id: string;
  originalDomain: string;
  normalizedDomain: string;
}

interface ConflictInfo {
  normalizedDomain: string;
  conflictingUnnormalized: string;
  existingNormalized: string;
  unnormalizedId: string;
  normalizedId: string;
}

interface NormalizationStats {
  total: number;
  needsNormalization: number;
  conflicts: number;
  normalized: number;
  errors: number;
}

export default function DomainNormalizationPage() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<DomainPreview[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [stats, setStats] = useState<NormalizationStats | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'initial' | 'preview' | 'normalizing' | 'complete'>('initial');

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/domain-normalization/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate preview: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setPreview(data.preview);
      setConflicts(data.conflicts);
      setStats(data.stats);
      setStep('preview');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleNormalize = async () => {
    if (conflicts.length > 0) {
      setError('Cannot proceed with normalization - conflicts must be resolved first!');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('normalizing');
    setResults([]);
    
    try {
      const response = await fetch('/api/admin/domain-normalization/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Normalization failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setResults(data.results);
      setStats(data.stats);
      setStep('complete');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Normalization failed');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('initial');
    setPreview([]);
    setConflicts([]);
    setStats(null);
    setResults([]);
    setError(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Domain Normalization</h1>
        <p className="text-gray-600">
          Normalize website domains to fix ManyReach duplicate detection issues.
          This will remove www prefixes, protocols, and trailing slashes.
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {step === 'initial' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Step 1: Preview Normalization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              First, let's see what domains need normalization and check for potential conflicts.
            </p>
            <Button 
              onClick={handlePreview} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing domains...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Generate Preview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && stats && (
        <div className="space-y-6">
          {/* Stats Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Normalization Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Websites</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.needsNormalization}</div>
                  <div className="text-sm text-gray-600">Need Normalization</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${stats.conflicts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.conflicts}
                  </div>
                  <div className="text-sm text-gray-600">Conflicts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.total - stats.needsNormalization}</div>
                  <div className="text-sm text-gray-600">Already Normalized</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  ⚠️ Conflicts Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-4">
                  The following domains would create duplicates. You must manually resolve these before proceeding:
                </p>
                <div className="space-y-2">
                  {conflicts.map((conflict, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-red-200">
                      <div className="font-medium text-red-800">
                        "{conflict.conflictingUnnormalized}" → "{conflict.normalizedDomain}"
                      </div>
                      <div className="text-sm text-red-600">
                        But "{conflict.existingNormalized}" already exists
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Conflicting ID: {conflict.unnormalizedId} | Existing ID: {conflict.normalizedId}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Normalization Preview ({preview.length} domains)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {preview.slice(0, 50).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="font-mono text-gray-600">{item.originalDomain}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-mono text-blue-600">{item.normalizedDomain}</span>
                    </div>
                  ))}
                  {preview.length > 50 && (
                    <div className="text-center text-gray-500 text-sm py-2">
                      ... and {preview.length - 50} more domains
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={handleNormalize}
              disabled={loading || conflicts.length > 0}
              className="flex items-center gap-2"
              variant={conflicts.length > 0 ? "secondary" : "default"}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Normalizing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute Normalization
                </>
              )}
            </Button>
            <Button onClick={resetForm} variant="outline">
              Cancel
            </Button>
          </div>

          {conflicts.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Normalization is blocked due to conflicts. Please manually resolve the duplicate domains above, 
                then run the preview again.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {step === 'normalizing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Normalizing Domains...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Please wait while domains are being normalized...</p>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && stats && (
        <div className="space-y-6">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Normalization Complete!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.normalized}</div>
                  <div className="text-sm text-gray-600">Successfully Normalized</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${stats.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.errors}
                  </div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Websites</div>
                </div>
              </div>
              
              <div className="bg-green-100 p-3 rounded">
                <p className="text-green-800">
                  ✅ Domain normalization is complete! ManyReach duplicate detection should now work correctly.
                  Domains like "www.example.com" will now properly match existing "example.com" records.
                </p>
              </div>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Normalization Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto bg-gray-50 p-3 rounded font-mono text-sm space-y-1">
                  {results.map((result, idx) => (
                    <div key={idx} className="text-gray-700">{result}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={resetForm} className="w-full">
            Run Another Normalization
          </Button>
        </div>
      )}
    </div>
  );
}