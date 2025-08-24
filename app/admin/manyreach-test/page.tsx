'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function ManyReachTestPage() {
  const [isPolling, setIsPolling] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const testPolling = async (campaignId?: string) => {
    setIsPolling(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`/api/admin/manyreach/poll${campaignId ? `?campaignId=${campaignId}` : ''}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to poll: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsPolling(false);
    }
  };

  const campaigns = [
    { id: '29497', name: 'Adzuna Marketing Campaign' },
    { id: '26503', name: 'Salary campaign' },
    { id: '24545', name: 'New Campaign (10)' },
    { id: '24205', name: 'LI for BB (adzuna)' },
    { id: '28329', name: 'Adzuna Healthcare Campaign' },
    { id: '26982', name: 'Adzuna Finance campaign' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">ManyReach Polling Test</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Polling</CardTitle>
          <CardDescription>
            Manually trigger ManyReach polling to fetch and process email replies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => testPolling()}
                disabled={isPolling}
                variant="default"
              >
                {isPolling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Polling All Campaigns...
                  </>
                ) : (
                  'Poll All Campaigns'
                )}
              </Button>
              
              {campaigns.map(campaign => (
                <Button
                  key={campaign.id}
                  onClick={() => testPolling(campaign.id)}
                  disabled={isPolling}
                  variant="outline"
                  size="sm"
                >
                  {campaign.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {result.campaignName || `Campaign ${result.campaignId}`}
                  </span>
                  {result.newRepliesProcessed > 0 && (
                    <span className="text-sm text-green-600 font-normal">
                      {result.newRepliesProcessed} new replies processed
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-500">Total Prospects:</span>{' '}
                    <span className="font-semibold">{result.totalProspects}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">With Replies:</span>{' '}
                    <span className="font-semibold">{result.repliedProspects}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">New Processed:</span>{' '}
                    <span className="font-semibold text-green-600">
                      {result.newRepliesProcessed}
                    </span>
                  </div>
                </div>

                {result.processedEmails && result.processedEmails.length > 0 && (
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <h4 className="text-sm font-semibold mb-2">Processed Emails:</h4>
                    <div className="space-y-1">
                      {result.processedEmails.map((email: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="font-mono">{email.email}</span>
                          <div className="flex items-center gap-2">
                            {email.status === 'success' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {email.status === 'error' && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {email.status === 'skipped' && (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="text-gray-600">{email.message}</span>
                            {email.publisherId && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Publisher #{email.publisherId}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertTitle>Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {result.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}