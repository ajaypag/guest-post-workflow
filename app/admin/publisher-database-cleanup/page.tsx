'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DatabaseStats {
  totalPublishers: number;
  cleanPublishers: number;
  corruptedPublishers: number;
  publishersWithOrphans: number;
  noDataPublishers: number;
}

interface CleanupResult {
  success: boolean;
  summary: {
    totalPublishersAnalyzed: number;
    publishersWithOrphans: number;
    totalOrphanedOfferingsFound: number;
    totalOfferingsDeleted: number;
    totalRelationshipsFixed: number;
    successfulOperations: number;
    failedOperations: number;
  };
}

export default function PublisherDatabaseCleanupPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkDatabaseStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/check-all-publishers');
      if (!response.ok) throw new Error('Failed to check database');
      const data = await response.json();
      setStats(data.summary);
    } catch (err: any) {
      setError(err.message);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const runCleanup = async (dryRun: boolean = true) => {
    setIsLoading(true);
    setError(null);
    setCleanupResult(null);
    
    try {
      // Step 1: Fix corrupted publishers (duplicate relationships)
      const fixCorruptedResponse = await fetch('/api/test/bulk-fix-corrupted-publishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, limit: 100 })
      });
      
      if (!fixCorruptedResponse.ok) throw new Error('Failed to fix corrupted publishers');
      const fixCorruptedResult = await fixCorruptedResponse.json();
      
      // Step 2: Delete orphaned offerings (no relationships)  
      const deleteOrphanedResponse = await fetch('/api/test/delete-orphaned-offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });
      
      if (!deleteOrphanedResponse.ok) throw new Error('Failed to delete orphaned offerings');
      const deleteOrphanedResult = await deleteOrphanedResponse.json();
      
      // Combine results
      setCleanupResult({
        success: true,
        summary: {
          totalPublishersAnalyzed: fixCorruptedResult.summary.totalPublishersAnalyzed,
          publishersWithOrphans: deleteOrphanedResult.summary.publishersWithOrphans,
          totalOrphanedOfferingsFound: deleteOrphanedResult.summary.totalOrphanedOfferingsFound,
          totalOfferingsDeleted: deleteOrphanedResult.summary.totalOfferingsDeleted,
          totalRelationshipsFixed: fixCorruptedResult.summary.totalRelationshipsFixed,
          successfulOperations: fixCorruptedResult.summary.successfulFixes + deleteOrphanedResult.summary.successfulDeletions,
          failedOperations: fixCorruptedResult.summary.failedFixes + deleteOrphanedResult.summary.failedDeletions
        }
      });
      
      // Refresh stats after cleanup
      if (!dryRun) {
        setTimeout(checkDatabaseStats, 1000);
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDatabaseStats();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'bg-green-100 text-green-800';
      case 'corrupted': return 'bg-red-100 text-red-800';
      case 'orphans': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Publisher Database Cleanup</h1>
        <p className="text-gray-600">
          Monitor and clean up publisher database corruption, orphaned offerings, and data integrity issues.
        </p>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Database Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>Current state of publisher data integrity</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && !stats ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading database statistics...</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalPublishers}</div>
                <div className="text-sm text-gray-600">Total Publishers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.cleanPublishers || 0}</div>
                <div className="text-sm text-gray-600">Clean</div>
                {stats.totalPublishers > 0 && (
                  <Badge className={getStatusColor('clean')}>
                    {((stats.cleanPublishers / stats.totalPublishers) * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.corruptedPublishers || 0}</div>
                <div className="text-sm text-gray-600">Corrupted</div>
                {stats.corruptedPublishers > 0 && stats.totalPublishers > 0 && (
                  <Badge className={getStatusColor('corrupted')}>
                    {((stats.corruptedPublishers / stats.totalPublishers) * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.publishersWithOrphans || 0}</div>
                <div className="text-sm text-gray-600">Has Orphans</div>
                {stats.publishersWithOrphans > 0 && stats.totalPublishers > 0 && (
                  <Badge className={getStatusColor('orphans')}>
                    {((stats.publishersWithOrphans / stats.totalPublishers) * 100).toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.noDataPublishers || 0}</div>
                <div className="text-sm text-gray-600">No Data</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Failed to load statistics</div>
          )}
          
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={checkDatabaseStats} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Database Cleanup Actions</CardTitle>
          <CardDescription>
            Fix corrupted publisher data and remove orphaned offerings. Always run dry run first!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => runCleanup(true)} 
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Run Dry Run Analysis
              </Button>
              
              <Button 
                onClick={() => runCleanup(false)} 
                disabled={isLoading || (stats ? stats.corruptedPublishers === 0 && stats.publishersWithOrphans === 0 : false)}
                variant="destructive"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Execute Cleanup (PRODUCTION)
              </Button>
            </div>
            
            {stats && stats.corruptedPublishers === 0 && stats.publishersWithOrphans === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Database is Clean</AlertTitle>
                <AlertDescription>
                  No corrupted publishers or orphaned offerings found. No cleanup needed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Results */}
      {cleanupResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {cleanupResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Cleanup Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {cleanupResult.summary.totalPublishersAnalyzed}
                </div>
                <div className="text-sm text-gray-600">Publishers Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {cleanupResult.summary.totalRelationshipsFixed}
                </div>
                <div className="text-sm text-gray-600">Relationships Fixed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {cleanupResult.summary.totalOfferingsDeleted}
                </div>
                <div className="text-sm text-gray-600">Offerings Deleted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {cleanupResult.summary.successfulOperations}
                </div>
                <div className="text-sm text-gray-600">Successful Operations</div>
              </div>
            </div>
            
            {cleanupResult.summary.failedOperations > 0 && (
              <Alert className="mt-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Some Operations Failed</AlertTitle>
                <AlertDescription>
                  {cleanupResult.summary.failedOperations} operations failed. Check logs for details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>What This Tool Does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <strong>Corrupted Publishers:</strong> Publishers with offerings that have multiple website relationships 
            (violates 1:1 constraint). This tool removes duplicate relationships, keeping only the first one.
          </div>
          <div>
            <strong>Orphaned Offerings:</strong> Offerings that have no website relationships at all. 
            This tool deletes these orphaned offerings since they're unusable.
          </div>
          <div>
            <strong>Safety:</strong> Always run dry run first to see what changes will be made. 
            Production cleanup is irreversible.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}