'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';

interface MigrationStatus {
  totalPages: number;
  pagesWithoutNormalizedUrl: number;
  pagesProcessed: number;
  errors: string[];
  isRunning: boolean;
  isComplete: boolean;
}

export default function NormalizeUrlsMigrationPage() {
  const [status, setStatus] = useState<MigrationStatus>({
    totalPages: 0,
    pagesWithoutNormalizedUrl: 0,
    pagesProcessed: 0,
    errors: [],
    isRunning: false,
    isComplete: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  // Check migration status
  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/admin/normalize-urls-migration/status');
      const data = await response.json();
      setStatus(prev => ({
        ...prev,
        totalPages: data.totalPages,
        pagesWithoutNormalizedUrl: data.pagesWithoutNormalizedUrl,
        isComplete: data.pagesWithoutNormalizedUrl === 0,
      }));
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        errors: [...prev.errors, `Failed to check status: ${error}`],
      }));
    } finally {
      setIsChecking(false);
    }
  };

  // Run migration
  const runMigration = async () => {
    setStatus(prev => ({
      ...prev,
      isRunning: true,
      pagesProcessed: 0,
      errors: [],
    }));

    try {
      const response = await fetch('/api/admin/normalize-urls-migration/run', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.processed !== undefined) {
                  setStatus(prev => ({
                    ...prev,
                    pagesProcessed: data.processed,
                  }));
                }
                if (data.error) {
                  setStatus(prev => ({
                    ...prev,
                    errors: [...prev.errors, data.error],
                  }));
                }
                if (data.complete) {
                  setStatus(prev => ({
                    ...prev,
                    isComplete: true,
                    isRunning: false,
                  }));
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        errors: [...prev.errors, `Migration error: ${error}`],
      }));
    }

    // Refresh status after migration
    await checkStatus();
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const progress = status.pagesWithoutNormalizedUrl > 0
    ? (status.pagesProcessed / status.pagesWithoutNormalizedUrl) * 100
    : 0;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Normalized URL Migration</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Migration Status</CardTitle>
          <CardDescription>
            Add normalized URLs to target pages for better duplicate detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Target Pages</p>
              <p className="text-2xl font-bold">{status.totalPages}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pages Needing Migration</p>
              <p className="text-2xl font-bold text-orange-600">
                {status.pagesWithoutNormalizedUrl}
              </p>
            </div>
          </div>

          {status.isComplete && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                All target pages have normalized URLs. Migration is complete!
              </AlertDescription>
            </Alert>
          )}

          {status.pagesWithoutNormalizedUrl > 0 && !status.isRunning && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {status.pagesWithoutNormalizedUrl} target pages need normalized URLs.
                Run the migration to fix this.
              </AlertDescription>
            </Alert>
          )}

          {status.isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing pages...</span>
                <span>{status.pagesProcessed} / {status.pagesWithoutNormalizedUrl}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {status.errors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <p className="font-medium text-red-800 mb-2">Errors occurred:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {status.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={checkStatus}
              disabled={isChecking || status.isRunning}
              variant="outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              Check Status
            </Button>

            <Button
              onClick={runMigration}
              disabled={status.isRunning || status.pagesWithoutNormalizedUrl === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Database className="mr-2 h-4 w-4" />
              {status.isRunning ? 'Running Migration...' : 'Run Migration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What This Migration Does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This migration adds a <code className="bg-gray-100 px-1 py-0.5 rounded">normalizedUrl</code> column
            to all target pages for improved duplicate detection.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="font-medium text-gray-700">Normalization Rules:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Forces HTTPS protocol</li>
              <li>Removes www prefix</li>
              <li>Removes trailing slashes</li>
              <li>Preserves full path for matching</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-blue-700 mb-2">Example:</p>
            <code className="text-xs">
              http://www.example.com/services/ → example.com/services
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}