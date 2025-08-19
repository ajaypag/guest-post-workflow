'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Database, AlertCircle } from 'lucide-react';

interface TableCheck {
  name: string;
  exists: boolean;
  description: string;
}

interface ColumnCheck {
  table: string;
  column: string;
  exists: boolean;
  description: string;
}

interface SchemaCheckResult {
  tables: TableCheck[];
  columns: ColumnCheck[];
  totalTables: number;
  missingTables: number;
  totalColumns: number;
  missingColumns: number;
  isHealthy: boolean;
}

export default function DatabaseSchemaCheckPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<SchemaCheckResult | null>(null);
  const [error, setError] = useState<string>('');

  const runSchemaCheck = async () => {
    setStatus('checking');
    setError('');
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/database-schema-check', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data.result);
        setStatus('success');
      } else {
        setError(data.error || 'Schema check failed');
        setStatus('error');
      }
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Clock className="h-5 w-5 animate-spin" />;
      case 'success':
        return result?.isHealthy ? 
          <CheckCircle className="h-5 w-5 text-green-500" /> : 
          <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Schema Health Check
          </CardTitle>
          <CardDescription>
            Verify shadow publisher system database requirements. This checks for missing tables and columns 
            that may be causing the "0 websites" issue with shadow publishers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Status Section */}
          <div className="flex items-center gap-4">
            <Button
              onClick={runSchemaCheck}
              disabled={status === 'checking'}
              className="flex items-center gap-2"
            >
              {getStatusIcon()}
              {status === 'checking' ? 'Checking Schema...' : 'Run Schema Check'}
            </Button>
            
            {result && (
              <div className={`flex items-center gap-2 text-sm font-medium ${
                result.isHealthy ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {result.isHealthy ? 
                  '✅ Schema is healthy' : 
                  `⚠️ ${result.missingTables + result.missingColumns} issues found`
                }
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Tables Check */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Required Tables</CardTitle>
                  <CardDescription>
                    {result.missingTables === 0 ? 
                      `All ${result.totalTables} required tables exist` :
                      `${result.missingTables} of ${result.totalTables} tables are missing`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.tables.map((table, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded border">
                      {table.exists ? 
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /> :
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      }
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-medium">{table.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{table.description}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Columns Check */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Required Columns</CardTitle>
                  <CardDescription>
                    {result.missingColumns === 0 ? 
                      `All ${result.totalColumns} required columns exist` :
                      `${result.missingColumns} of ${result.totalColumns} columns are missing`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.columns.map((column, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded border">
                      {column.exists ? 
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" /> :
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      }
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-medium">
                          {column.table}.{column.column}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{column.description}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary and Next Steps */}
          {result && !result.isHealthy && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Database Schema Issues Found</div>
                <div className="text-sm space-y-1">
                  <p>Missing database components are likely causing the "0 websites" issue with shadow publishers.</p>
                  <p>The shadow publisher system requires these tables and columns to link publishers to websites.</p>
                  <p><strong>Next step:</strong> Run the migration at <code>/admin/shadow-publisher-migration</code> to fix these issues.</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What This Check Does</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>This diagnostic checks for database components required by the shadow publisher system:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><code>shadow_publisher_websites</code> - Links publishers to extracted websites</li>
                <li><code>publisher_websites</code> columns - Permissions and metadata</li>
                <li><code>publisher_offerings</code> columns - Express delivery options</li>
                <li><code>email_processing_logs</code> columns - Email tracking data</li>
              </ul>
              <p>When these are missing, publishers get created but websites don't get linked, resulting in "0 total websites".</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}