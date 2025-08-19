'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Database } from 'lucide-react';

export default function WebhookSecurityMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [tableExists, setTableExists] = useState<boolean | null>(null);

  const checkTableStatus = async () => {
    setStatus('checking');
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/webhook-security-migration/check', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTableExists(result.exists);
        setMessage(result.message);
        setStatus('idle');
      } else {
        setMessage(result.error || 'Failed to check table status');
        setStatus('error');
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const runMigration = async () => {
    setStatus('running');
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/webhook-security-migration/run', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(result.message);
        setStatus('success');
        setTableExists(true);
      } else {
        setMessage(result.error || 'Migration failed');
        setStatus('error');
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
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

  const getTableStatusDisplay = () => {
    if (tableExists === null) return 'Unknown';
    return tableExists ? 'Exists ✅' : 'Missing ❌';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Webhook Security Migration
          </CardTitle>
          <CardDescription>
            Manage the webhook_security_logs table migration required for ManyReach webhook security logging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Table Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">webhook_security_logs</span>
                  <span className="text-sm">{getTableStatusDisplay()}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Migration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="text-sm capitalize">{status}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={checkTableStatus}
              disabled={status === 'checking' || status === 'running'}
              variant="outline"
            >
              {status === 'checking' ? 'Checking...' : 'Check Status'}
            </Button>
            
            <Button
              onClick={runMigration}
              disabled={status === 'running' || status === 'checking' || tableExists === true}
            >
              {status === 'running' ? 'Running Migration...' : 'Run Migration'}
            </Button>
          </div>

          {/* Message Display */}
          {message && (
            <Alert className={status === 'success' ? 'border-green-200 bg-green-50' : 
                              status === 'error' ? 'border-red-200 bg-red-50' : ''}>
              <AlertDescription className="whitespace-pre-wrap">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Migration Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Migration Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Purpose:</strong> Creates the webhook_security_logs table for tracking ManyReach webhook security checks</p>
              <p><strong>File:</strong> migrations/0058_webhook_security_logs.sql</p>
              <p><strong>What it creates:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>webhook_security_logs table with security tracking fields</li>
                <li>Indexes for efficient querying and rate limiting</li>
                <li>Support for IP validation, signature checking, and request logging</li>
              </ul>
            </CardContent>
          </Card>

          {/* Current Error Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-red-600">Current Issue</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>Your webhook logs show this error:</p>
              <code className="block bg-gray-100 p-2 mt-2 text-xs rounded">
                relation "webhook_security_logs" does not exist
              </code>
              <p className="mt-2">This migration will resolve the missing table error.</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}