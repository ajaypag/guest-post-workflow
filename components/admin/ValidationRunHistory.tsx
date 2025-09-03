'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle2, XCircle, PlayCircle, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ValidationRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  totalWorkspaces: number;
  workspacesProcessed: number;
  totalCampaigns: number;
  campaignsProcessed: number;
  totalNewReplies: number;
  uniqueCampaigns: number;
  duplicateCampaigns: number;
  processingTimeSeconds?: number;
  triggerType: string;
  errorMessage?: string;
  runSummary?: any;
  campaignValidationsCount: number;
  totalRealRepliesFound: number;
  totalProspectsChecked: number;
}

interface ValidationStats {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  runningRuns: number;
  averageProcessingTime: number;
  totalRepliesFound: number;
  lastRunAt?: string;
}

interface ValidationHistory {
  runs: ValidationRun[];
  stats: ValidationStats;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return <PlayCircle className="h-4 w-4 text-blue-500" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  const variant = status === 'completed' ? 'default' : 
                  status === 'failed' ? 'destructive' : 
                  status === 'running' ? 'secondary' : 'outline';
  
  return (
    <Badge variant={variant} className="capitalize">
      {getStatusIcon(status)}
      <span className="ml-1">{status}</span>
    </Badge>
  );
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return 'N/A';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

export default function ValidationRunHistory() {
  const [history, setHistory] = useState<ValidationHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<ValidationRun | null>(null);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/manyreach/validation-history');
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching validation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRunDetails = async (runId: string) => {
    try {
      setLoadingDetails(true);
      const response = await fetch('/api/admin/manyreach/validation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });
      if (!response.ok) throw new Error('Failed to fetch run details');
      const data = await response.json();
      setRunDetails(data);
    } catch (error) {
      console.error('Error fetching run details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading validation history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Failed to load validation history
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.stats.totalRuns}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.stats.totalRuns > 0 
                ? Math.round((history.stats.completedRuns / history.stats.totalRuns) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {history.stats.completedRuns} of {history.stats.totalRuns} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(Math.round(history.stats.averageProcessingTime || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Average duration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Replies Found</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.stats.totalRepliesFound}</div>
            <p className="text-xs text-muted-foreground">
              All successful runs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Run History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Validation Run History</CardTitle>
            <CardDescription>
              Recent validation runs with detailed metrics
            </CardDescription>
          </div>
          <Button onClick={fetchHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.runs.map((run) => (
              <Card key={run.id} className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => {
                      setSelectedRun(run);
                      fetchRunDetails(run.id);
                    }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(run.status)}
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Workspaces:</span>
                          <span className="ml-1 font-medium">
                            {run.workspacesProcessed}/{run.totalWorkspaces}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Campaigns:</span>
                          <span className="ml-1 font-medium">
                            {run.campaignsProcessed}/{run.totalCampaigns}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Real Replies:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {run.totalRealRepliesFound}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="ml-1 font-medium">
                            {formatDuration(run.processingTimeSeconds)}
                          </span>
                        </div>
                      </div>

                      {run.errorMessage && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {run.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {history.runs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No validation runs found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Run Details Modal/Panel */}
      {selectedRun && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Run Details - {selectedRun.id}
              <Button variant="outline" size="sm" onClick={() => setSelectedRun(null)}>
                Close
              </Button>
            </CardTitle>
            <CardDescription>
              Started {formatDistanceToNow(new Date(selectedRun.startedAt), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading run details...
              </div>
            ) : runDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div>{getStatusBadge(runDetails.run.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Processing Time</div>
                    <div className="font-medium">{formatDuration(runDetails.run.processingTimeSeconds)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Trigger Type</div>
                    <div className="font-medium capitalize">{runDetails.run.triggerType}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-2">Campaign Validations ({runDetails.campaigns?.length || 0})</div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {runDetails.campaigns?.map((campaign: any) => (
                      <div key={campaign.id} className="border rounded p-2 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{campaign.campaignName}</div>
                            <div className="text-muted-foreground">{campaign.workspaceName}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-600 font-medium">
                              {campaign.realRepliesFound} real replies
                            </div>
                            <div className="text-muted-foreground">
                              {campaign.prospectsChecked} checked
                            </div>
                          </div>
                        </div>
                        {campaign.isDuplicate && (
                          <Badge variant="outline" className="mt-1">
                            Duplicate
                          </Badge>
                        )}
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        No campaign details available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load run details
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}