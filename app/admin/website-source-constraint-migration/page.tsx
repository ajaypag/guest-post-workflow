'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Database, AlertCircle } from 'lucide-react';

export default function WebsiteSourceConstraintMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const runMigration = async () => {
    setStatus('running');
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/website-source-constraint-migration', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        setStatus('success');
      } else {
        setError(data.error || 'Migration failed');
        setStatus('error');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Clock className="h-5 w-5 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Website Source Constraint Migration
          </CardTitle>
          <CardDescription>
            Fix the check_website_source constraint to allow 'manyreach' as a valid source.
            This resolves the "0 websites" issue with shadow publishers from ManyReach webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Status Section */}
          <div className="flex items-center gap-4">
            <Button
              onClick={runMigration}
              disabled={status === 'running'}
              className="flex items-center gap-2"
            >
              {getStatusIcon()}
              {status === 'running' ? 'Running Migration...' : 'Run Migration'}
            </Button>
            
            {status === 'success' && (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                ✅ Migration completed successfully
              </div>
            )}
          </div>

          {/* Success Message */}
          {message && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Issue Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-red-600">🚨 Critical Issue: Shadow Publishers Show 0 Websites</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p><strong>Problem:</strong> ManyReach webhook creates shadow publishers successfully, but they always show "0 websites" in the admin interface.</p>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p><strong>Root Cause:</strong> The <code>check_website_source</code> constraint on the <code>websites</code> table does not allow <code>'manyreach'</code> as a valid source value.</p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p><strong>Impact:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Website creation fails with constraint violation error</li>
                  <li>Publishers are created but no websites get linked</li>
                  <li>Admin interface shows "0 websites" for all shadow publishers</li>
                  <li>ManyReach integration appears broken</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Migration Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What This Migration Does</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>This migration updates the database constraint to fix the shadow publisher website creation issue:</p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Drops the existing <code>check_website_source</code> constraint</li>
                <li>Creates a new constraint that includes <code>'manyreach'</code> as a valid source</li>
                <li>Allows ManyReach webhooks to successfully create websites</li>
                <li>Enables proper linking between shadow publishers and their websites</li>
              </ol>
              
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p><strong>Current allowed values:</strong> airtable, publisher, internal, api, migration, manual</p>
                <p><strong>After migration:</strong> airtable, publisher, internal, api, migration, manual, <span className="font-semibold text-green-600">manyreach</span></p>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                <p><strong>Migration file:</strong> <code>migrations/0062_fix_website_source_constraint.sql</code></p>
                <p><strong>Safe to run:</strong> Uses IF EXISTS checks to prevent errors if already applied</p>
              </div>
            </CardContent>
          </Card>

          {/* Expected Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expected Results After Migration</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <ul className="list-disc list-inside space-y-1">
                <li>✅ ManyReach webhooks will successfully create websites with source='manyreach'</li>
                <li>✅ Shadow publishers will be properly linked to their websites</li>
                <li>✅ Admin interface will show correct website counts (1+) instead of "0 websites"</li>
                <li>✅ Shadow publisher system will function as designed</li>
                <li>✅ Future ManyReach webhook responses will process correctly</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}