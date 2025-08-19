'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Database, AlertCircle } from 'lucide-react';

export default function SenderEmailMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const runMigration = async () => {
    setStatus('running');
    setError('');
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/sender-email-migration', {
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
            Add sender_email Column Migration
          </CardTitle>
          <CardDescription>
            Add missing sender_email column to email_processing_logs table for ManyReach webhook tracking.
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

          {/* Migration Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What This Migration Does</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>Adds the <code>sender_email</code> column to the <code>email_processing_logs</code> table.</p>
              <p>This column stores the email address of senders for better tracking in ManyReach webhook processing.</p>
              <p><strong>Migration file:</strong> <code>migrations/0061_add_sender_email_column.sql</code></p>
              <p><strong>Safe to run:</strong> Uses IF NOT EXISTS check to avoid conflicts if column already exists.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}