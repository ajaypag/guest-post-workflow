'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminHeader from '@/components/AdminHeader';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Mail,
  Users,
  FileText,
  ArrowRight,
  RefreshCw,
  Download,
  AlertCircle,
  Info
} from 'lucide-react';

interface MigrationStats {
  totalWebsites: number;
  websitesWithPublisher: number;
  websitesWithoutPublisher: number;
  uniquePublishers: number;
  shadowPublishersCreated: number;
  offeringsCreated: number;
  relationshipsCreated: number;
  invitationsSent: number;
  claimedAccounts: number;
  migrationProgress: number;
  errors: number;
  warnings: number;
  info: number;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  affectedCount?: number;
  suggestion?: string;
}

interface ValidationReport {
  timestamp: Date;
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ValidationIssue[];
  readyForMigration: boolean;
}

interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  tasks: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    message?: string;
  }>;
}

export default function PublisherMigrationDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MigrationStats>({
    totalWebsites: 0,
    websitesWithPublisher: 0,
    websitesWithoutPublisher: 0,
    uniquePublishers: 0,
    shadowPublishersCreated: 0,
    offeringsCreated: 0,
    relationshipsCreated: 0,
    invitationsSent: 0,
    claimedAccounts: 0,
    migrationProgress: 0,
    errors: 0,
    warnings: 0,
    info: 0
  });
  
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('preparation');
  const [isRunningValidation, setIsRunningValidation] = useState(false);
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  
  const [phases, setPhases] = useState<MigrationPhase[]>([
    {
      id: 'preparation',
      name: 'Data Preparation',
      description: 'Validate and prepare data for migration',
      status: 'pending',
      progress: 0,
      tasks: [
        { name: 'Run data validation', status: 'pending' },
        { name: 'Check prerequisites', status: 'pending' },
        { name: 'Clean data issues', status: 'pending' }
      ]
    },
    {
      id: 'shadow-publishers',
      name: 'Create Shadow Publishers',
      description: 'Create shadow publisher accounts from website data',
      status: 'pending',
      progress: 0,
      tasks: [
        { name: 'Extract unique publishers', status: 'pending' },
        { name: 'Create shadow accounts', status: 'pending' },
        { name: 'Generate invitation tokens', status: 'pending' }
      ]
    },
    {
      id: 'offerings',
      name: 'Generate Offerings',
      description: 'Create draft offerings from pricing data',
      status: 'pending',
      progress: 0,
      tasks: [
        { name: 'Create draft offerings', status: 'pending' },
        { name: 'Set default terms', status: 'pending' },
        { name: 'Link to websites', status: 'pending' }
      ]
    },
    {
      id: 'invitations',
      name: 'Send Invitations',
      description: 'Email publishers to claim accounts',
      status: 'pending',
      progress: 0,
      tasks: [
        { name: 'Prepare email lists', status: 'pending' },
        { name: 'Send invitation emails', status: 'pending' },
        { name: 'Track responses', status: 'pending' }
      ]
    },
    {
      id: 'activation',
      name: 'Publisher Activation',
      description: 'Process publisher claims and activate accounts',
      status: 'pending',
      progress: 0,
      tasks: [
        { name: 'Process claims', status: 'pending' },
        { name: 'Activate offerings', status: 'pending' },
        { name: 'Update relationships', status: 'pending' }
      ]
    },
    {
      id: 'completion',
      name: 'Migration Completion',
      description: 'Finalize migration and cleanup',
      status: 'pending',
      progress: 0,
      tasks: [
        { name: 'Update order system', status: 'pending' },
        { name: 'Archive legacy data', status: 'pending' },
        { name: 'Generate final report', status: 'pending' }
      ]
    }
  ]);

  // Load initial data
  useEffect(() => {
    loadMigrationStats();
  }, []);

  const loadMigrationStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/publisher-migration/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load migration stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDataValidation = async () => {
    try {
      setIsRunningValidation(true);
      const response = await fetch('/api/admin/publisher-migration/validate', {
        method: 'POST'
      });
      
      if (response.ok) {
        const report = await response.json();
        setValidationReport(report);
        
        // Update phase status
        setPhases(prev => prev.map(phase => 
          phase.id === 'preparation' 
            ? { 
                ...phase, 
                status: report.readyForMigration ? 'completed' : 'error',
                progress: 100,
                tasks: phase.tasks.map(task => ({
                  ...task,
                  status: task.name === 'Run data validation' ? 'completed' : task.status
                }))
              }
            : phase
        ));
      }
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsRunningValidation(false);
    }
  };

  const startMigration = async (dryRun = false) => {
    try {
      setIsRunningMigration(true);
      const response = await fetch('/api/admin/publisher-migration/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Update stats with migration results
        setStats(prev => ({
          ...prev,
          shadowPublishersCreated: result.shadowPublishersCreated,
          offeringsCreated: result.offeringsCreated,
          relationshipsCreated: result.relationshipsCreated,
          migrationProgress: 50
        }));
        
        // Update phases
        setCurrentPhase('shadow-publishers');
      }
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setIsRunningMigration(false);
    }
  };

  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [invitationResult, setInvitationResult] = useState<{
    sent: number;
    failed: number;
    errors?: string[];
    totalEligible?: number;
  } | null>(null);

  const sendInvitations = async () => {
    if (!confirm('Are you ready to send invitations to shadow publishers? Start with a test batch of 5?')) {
      return;
    }
    
    setIsSendingInvitations(true);
    setInvitationResult(null);
    
    try {
      // First, let's test with just 5 publishers
      const testResponse = await fetch('/api/admin/publisher-migration/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5 }) // Test with 5 first
      });
      
      if (testResponse.ok) {
        const result = await testResponse.json();
        setInvitationResult(result);
        setStats(prev => ({
          ...prev,
          invitationsSent: prev.invitationsSent + result.sent,
          migrationProgress: 75
        }));
        
        // Show results
        const message = result.totalEligible && result.totalEligible > result.sent
          ? `Batch sent! (${result.totalEligible - result.sent} more eligible publishers remain)\n✅ Sent: ${result.sent}\n❌ Failed: ${result.failed}`
          : `All invitations sent!\n✅ Sent: ${result.sent}\n❌ Failed: ${result.failed}`;
        
        alert(message + (result.errors && result.errors.length > 0 ? '\n\nErrors:\n' + result.errors.slice(0, 3).join('\n') : ''));
      } else {
        const error = await testResponse.json();
        alert(`Failed to send invitations: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send invitations:', error);
      alert(`Error sending invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSendingInvitations(false);
    }
  };

  const generateReport = async () => {
    try {
      const response = await fetch('/api/admin/publisher-migration/report');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `migration-report-${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <AdminHeader />
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading migration data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <AdminHeader />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Publisher Migration</h1>
          <p className="text-gray-600 mt-1">
            Migrate from legacy websites/contacts to modern publisher system
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={validationReport?.readyForMigration ? 'success' : 'destructive'}>
            {validationReport?.readyForMigration ? 'Ready' : 'Not Ready'}
          </Badge>
          <Button onClick={loadMigrationStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Migration Progress
          </CardTitle>
          <CardDescription>
            Overall progress of the publisher migration process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{stats.migrationProgress}%</span>
              </div>
              <Progress value={stats.migrationProgress} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalWebsites}</div>
                <div className="text-sm text-gray-600">Total Websites</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.uniquePublishers}</div>
                <div className="text-sm text-gray-600">Unique Publishers</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.shadowPublishersCreated}</div>
                <div className="text-sm text-gray-600">Shadow Publishers</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.invitationsSent}</div>
                <div className="text-sm text-gray-600">Invitations Sent</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">{stats.claimedAccounts}</div>
                <div className="text-sm text-gray-600">Claimed Accounts</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="phases" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="phases">Migration Phases</TabsTrigger>
          <TabsTrigger value="validation">Data Validation</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Migration Phases */}
        <TabsContent value="phases" className="space-y-4">
          <div className="grid gap-4">
            {phases.map((phase, index) => (
              <Card key={phase.id} className={currentPhase === phase.id ? 'ring-2 ring-blue-500' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{phase.name}</h3>
                        <p className="text-sm text-gray-600">{phase.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(phase.status)}
                      <Badge variant={phase.status === 'completed' ? 'success' : 'secondary'}>
                        {phase.status}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {phase.progress > 0 && (
                    <Progress value={phase.progress} className="mb-4" />
                  )}
                  <div className="space-y-2">
                    {phase.tasks.map((task, taskIndex) => (
                      <div key={taskIndex} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(task.status)}
                          <span>{task.name}</span>
                        </div>
                        {task.message && (
                          <span className="text-gray-500 text-xs">{task.message}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Data Validation */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Data Validation Report
                </div>
                <Button 
                  onClick={runDataValidation} 
                  disabled={isRunningValidation}
                  variant="outline"
                  size="sm"
                >
                  {isRunningValidation ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Run Validation
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{validationReport.errors}</div>
                      <div className="text-sm text-gray-600">Errors</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{validationReport.warnings}</div>
                      <div className="text-sm text-gray-600">Warnings</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{validationReport.info}</div>
                      <div className="text-sm text-gray-600">Info</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {validationReport.issues.slice(0, 10).map((issue, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          issue.type === 'error' ? 'border-red-500 bg-red-50' :
                          issue.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                          'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getIssueIcon(issue.type)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{issue.category}</span>
                              {issue.affectedCount && (
                                <Badge variant="outline" size="sm">
                                  {issue.affectedCount} affected
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{issue.message}</p>
                            {issue.suggestion && (
                              <p className="text-xs text-green-600 mt-2">💡 {issue.suggestion}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {validationReport.issues.length > 10 && (
                    <p className="text-sm text-gray-500 text-center">
                      ... and {validationReport.issues.length - 10} more issues
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No validation report available. Run validation to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Migration Actions
                </CardTitle>
                <CardDescription>
                  Execute migration steps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => startMigration(true)} 
                  disabled={isRunningMigration || !validationReport?.readyForMigration}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Dry Run Migration
                </Button>
                
                <Button 
                  onClick={() => startMigration(false)} 
                  disabled={isRunningMigration || !validationReport?.readyForMigration}
                  className="w-full"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Start Live Migration
                </Button>
                
                <Button 
                  onClick={sendInvitations}
                  disabled={stats.shadowPublishersCreated === 0 || isSendingInvitations}
                  variant="outline"
                  className="w-full"
                >
                  {isSendingInvitations ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending Invitations...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Test Invitations (5 Publishers)
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => {
                    if (confirm('Send invitations to the next 50 publishers?')) {
                      setIsSendingInvitations(true);
                      fetch('/api/admin/publisher-migration/invitations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ batchSize: 50 })
                      })
                      .then(res => res.json())
                      .then(result => {
                        setInvitationResult(result);
                        setStats(prev => ({
                          ...prev,
                          invitationsSent: prev.invitationsSent + result.sent
                        }));
                        alert(`Sent ${result.sent} invitations${result.totalEligible ? ` (${result.totalEligible} total eligible)` : ''}`);
                      })
                      .finally(() => setIsSendingInvitations(false));
                    }
                  }}
                  disabled={stats.shadowPublishersCreated === 0 || isSendingInvitations}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Batch (50 Publishers)
                </Button>
                
                {invitationResult && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="text-green-600">✅ Sent: {invitationResult.sent}</div>
                    <div className="text-red-600">❌ Failed: {invitationResult.failed}</div>
                    {invitationResult.totalEligible && invitationResult.totalEligible > invitationResult.sent && (
                      <div className="text-blue-600 mt-1">
                        📊 {invitationResult.totalEligible - invitationResult.sent} more publishers eligible
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Reports & Exports
                </CardTitle>
                <CardDescription>
                  Generate reports and export data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={generateReport}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Migration Report
                </Button>
                
                <Button 
                  onClick={() => window.open('/admin/shadow-publishers')}
                  variant="outline"
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Review Shadow Publishers
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Migration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Websites Migrated:</span>
                    <span className="font-medium">{stats.websitesWithPublisher}/{stats.totalWebsites}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Publishers Created:</span>
                    <span className="font-medium">{stats.shadowPublishersCreated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Offerings Generated:</span>
                    <span className="font-medium">{stats.offeringsCreated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Accounts Claimed:</span>
                    <span className="font-medium">{stats.claimedAccounts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Quality</CardTitle>
              </CardHeader>
              <CardContent>
                {validationReport && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Ready for Migration:</span>
                      <Badge variant={validationReport.readyForMigration ? 'success' : 'destructive'}>
                        {validationReport.readyForMigration ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Critical Errors:</span>
                      <span className="font-medium text-red-600">{validationReport.errors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Warnings:</span>
                      <span className="font-medium text-yellow-600">{validationReport.warnings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Issues:</span>
                      <span className="font-medium">{validationReport.totalIssues}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Database Status:</span>
                    <Badge variant="success">Connected</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Email Service:</span>
                    <Badge variant="success">Operational</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Updated:</span>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Alerts */}
      {validationReport && !validationReport.readyForMigration && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Migration Blocked</AlertTitle>
          <AlertDescription>
            {validationReport.errors} critical errors must be resolved before migration can proceed.
            Run data validation to see detailed issues.
          </AlertDescription>
        </Alert>
      )}

      {isRunningMigration && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Migration in Progress</AlertTitle>
          <AlertDescription>
            Migration is currently running. This may take several minutes to complete.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}