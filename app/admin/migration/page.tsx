'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, AlertTriangle, CheckCircle, Clock, 
  Database, FileText, Settings, Activity, RefreshCw, Download, 
  Shield, AlertCircle, Info, ArrowRight, Server, Users, Package
} from 'lucide-react';

interface MigrationStatus {
  phase: 'pre-migration' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  currentStep: string;
  progress: number;
  ordersMigrated: number;
  totalOrders: number;
  lineItemsCreated: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
  backupCreated?: boolean;
  canRollback: boolean;
}

interface SystemStatus {
  database: 'healthy' | 'degraded' | 'offline';
  lineItemsEnabled: boolean;
  orderGroupsDisabled: boolean;
  activeOrders: number;
  pendingOrders: number;
  hybridOrders: number;
  lastMigration?: string;
}

const MIGRATION_STEPS = [
  { id: 1, name: 'Pre-flight Checks', description: 'Validate system state and dependencies' },
  { id: 2, name: 'Database Backup', description: 'Create full database backup for rollback' },
  { id: 3, name: 'Schema Updates', description: 'Apply database migrations and indexes' },
  { id: 4, name: 'Data Migration', description: 'Convert orderGroups to lineItems' },
  { id: 5, name: 'Bulk Analysis Fix', description: 'Update bulk analysis integration' },
  { id: 6, name: 'Feature Flag Update', description: 'Enable lineItems system globally' },
  { id: 7, name: 'Validation', description: 'Verify data integrity and functionality' },
  { id: 8, name: 'Cleanup', description: 'Archive old data and update indexes' }
];

export default function AdminMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    phase: 'pre-migration',
    currentStep: 'Ready to start',
    progress: 0,
    ordersMigrated: 0,
    totalOrders: 0,
    lineItemsCreated: 0,
    errors: [],
    canRollback: false
  });

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'healthy',
    lineItemsEnabled: true,
    orderGroupsDisabled: false,
    activeOrders: 0,
    pendingOrders: 0,
    hybridOrders: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // Load status on mount
  useEffect(() => {
    loadMigrationStatus();
    loadSystemStatus();
  }, []);

  const loadMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/migration/status');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
      }
    } catch (error) {
      console.error('Failed to load migration status:', error);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/migration/system-status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const executeMigrationStep = async (step: string) => {
    setIsLoading(true);
    setSelectedAction(step);
    
    try {
      const response = await fetch(`/api/admin/migration/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data.status);
        setLogs(prev => [...prev, `✅ ${step} completed successfully`]);
      } else {
        const error = await response.text();
        setLogs(prev => [...prev, `❌ ${step} failed: ${error}`]);
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `❌ ${step} error: ${error.message}`]);
    } finally {
      setIsLoading(false);
      setSelectedAction(null);
      setConfirmationText('');
      loadMigrationStatus();
      loadSystemStatus();
    }
  };

  const executeFullMigration = async () => {
    if (confirmationText !== 'MIGRATE NOW') {
      alert('Please type "MIGRATE NOW" to confirm');
      return;
    }
    
    setIsLoading(true);
    setLogs([]);
    
    try {
      const response = await fetch('/api/admin/migration/execute-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        // Poll for updates during migration
        const pollInterval = setInterval(async () => {
          await loadMigrationStatus();
          if (migrationStatus.phase === 'completed' || migrationStatus.phase === 'failed') {
            clearInterval(pollInterval);
            setIsLoading(false);
          }
        }, 2000);
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `❌ Migration failed: ${error.message}`]);
      setIsLoading(false);
    }
  };

  const rollbackMigration = async () => {
    if (confirmationText !== 'ROLLBACK NOW') {
      alert('Please type "ROLLBACK NOW" to confirm');
      return;
    }
    
    if (!migrationStatus.canRollback) {
      alert('Rollback is not available. Please check logs.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/migration/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await loadMigrationStatus();
        setLogs(prev => [...prev, '✅ Rollback completed successfully']);
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `❌ Rollback failed: ${error.message}`]);
    } finally {
      setIsLoading(false);
      setConfirmationText('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'offline': return <AlertCircle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'rolled-back': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LineItems Migration Control Panel
          </h1>
          <p className="text-gray-600">
            Migrate from orderGroups to lineItems system safely with full rollback capability
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Database Status</p>
                <div className="flex items-center mt-1">
                  {getStatusIcon(systemStatus.database)}
                  <span className="ml-2 text-lg font-semibold capitalize">
                    {systemStatus.database}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Migration Phase</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPhaseColor(migrationStatus.phase)}`}>
                  {migrationStatus.phase.replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Orders Migrated</p>
                <p className="text-lg font-semibold">
                  {migrationStatus.ordersMigrated} / {migrationStatus.totalOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Line Items Created</p>
                <p className="text-lg font-semibold">{migrationStatus.lineItemsCreated}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Migration Progress */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Migration Progress</h3>
              </div>
              <div className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{migrationStatus.currentStep}</span>
                    <span>{migrationStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        migrationStatus.phase === 'failed' ? 'bg-red-500' :
                        migrationStatus.phase === 'completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${migrationStatus.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Migration Steps */}
                <div className="space-y-4">
                  {MIGRATION_STEPS.map((step) => {
                    const isActive = migrationStatus.currentStep.includes(step.name);
                    const isCompleted = migrationStatus.progress > ((step.id - 1) * 100 / MIGRATION_STEPS.length);
                    
                    return (
                      <div key={step.id} className={`flex items-center p-3 rounded-lg border ${
                        isActive ? 'bg-blue-50 border-blue-200' :
                        isCompleted ? 'bg-green-50 border-green-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-blue-500 text-white' :
                          isCompleted ? 'bg-green-500 text-white' :
                          'bg-gray-300 text-gray-600'
                        }`}>
                          {isCompleted ? <CheckCircle className="h-5 w-5" /> : step.id}
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-900">{step.name}</p>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                        {isActive && (
                          <div className="ml-auto">
                            <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">System Status</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">LineItems System</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    systemStatus.lineItemsEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {systemStatus.lineItemsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">OrderGroups System</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    systemStatus.orderGroupsDisabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {systemStatus.orderGroupsDisabled ? 'Disabled' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Orders</span>
                  <span className="text-sm font-medium">{systemStatus.activeOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending Orders</span>
                  <span className="text-sm font-medium">{systemStatus.pendingOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Hybrid Orders</span>
                  <span className={`text-sm font-medium ${
                    systemStatus.hybridOrders > 0 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {systemStatus.hybridOrders}
                  </span>
                </div>
              </div>
            </div>

            {/* Migration Controls */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Migration Controls</h3>
              </div>
              <div className="p-6 space-y-4">
                {/* Pre-flight Check */}
                <button
                  onClick={() => executeMigrationStep('preflight-check')}
                  disabled={isLoading || migrationStatus.phase === 'in-progress'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Run Pre-flight Check
                </button>

                {/* Create Backup */}
                <button
                  onClick={() => executeMigrationStep('create-backup')}
                  disabled={isLoading || migrationStatus.phase === 'in-progress'}
                  className="w-full flex items-center justify-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Create Database Backup
                </button>

                {/* Full Migration */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder='Type "MIGRATE NOW" to confirm'
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={executeFullMigration}
                    disabled={isLoading || confirmationText !== 'MIGRATE NOW' || migrationStatus.phase === 'in-progress'}
                    className="w-full flex items-center justify-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute Full Migration
                  </button>
                </div>

                {/* Rollback */}
                {migrationStatus.canRollback && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <input
                      type="text"
                      placeholder='Type "ROLLBACK NOW" to confirm'
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button
                      onClick={rollbackMigration}
                      disabled={isLoading || confirmationText !== 'ROLLBACK NOW'}
                      className="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rollback Migration
                    </button>
                  </div>
                )}

                {/* Refresh Status */}
                <button
                  onClick={() => { loadMigrationStatus(); loadSystemStatus(); }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Migration Logs</h3>
              </div>
              <div className="p-6">
                <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-sm text-green-400 font-mono mb-1">
                      {new Date().toLocaleTimeString()} {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {migrationStatus.errors.length > 0 && (
          <div className="mt-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Migration Errors</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="space-y-1">
                      {migrationStatus.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Migration Information</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>This migration will convert all orderGroups to individual lineItems for better tracking and scalability.</p>
                  <ul className="mt-2 space-y-1">
                    <li>• All existing order data will be preserved</li>
                    <li>• Full database backup is created before migration</li>
                    <li>• Rollback is available within 24 hours of migration</li>
                    <li>• Frontend will continue to work during migration</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}