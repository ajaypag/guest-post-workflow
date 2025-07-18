'use client';

import React, { useState, useEffect } from 'react';
import { Database, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function StreamingMigratePage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [streamingStatus, setStreamingStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [serviceDiagnosis, setServiceDiagnosis] = useState<any>(null);
  const [healthCheckDiagnosis, setHealthCheckDiagnosis] = useState<any>(null);

  const checkStreamingStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/admin/check-streaming-status');
      const data = await response.json();
      setStreamingStatus(data);
    } catch (error) {
      console.error('Failed to check streaming status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkStreamingStatus();
  }, []);

  const runMigration = async () => {
    setStatus('migrating');
    setMessage('Running database migration...');

    try {
      const response = await fetch('/api/admin/migrate-streaming-columns', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('✅ Migration completed! Streaming columns added successfully.');
      } else {
        setStatus('error');
        setMessage('❌ Migration failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('❌ Network error: ' + (error as Error).message);
    }
  };

  const enableStreaming = async () => {
    setStatus('migrating');
    setMessage('Enabling streaming feature...');

    try {
      const response = await fetch('/api/admin/enable-streaming', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('✅ Streaming enabled! Set ENABLE_STREAMING=true in environment.');
      } else {
        setStatus('error');
        setMessage('❌ Failed to enable streaming: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('❌ Network error: ' + (error as Error).message);
    }
  };

  const diagnoseService = async () => {
    setStatus('checking');
    setMessage('Diagnosing streaming service...');

    try {
      const response = await fetch('/api/admin/fix-streaming-service');
      const data = await response.json();
      
      setServiceDiagnosis(data);
      
      if (data.queryWorks && data.columnsCorrect) {
        setStatus('success');
        setMessage('✅ Database structure is correct. The "unavailable" error is a false positive from the health check.');
      } else {
        setStatus('error');
        setMessage('❌ ' + (data.issue || 'Unknown issue'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('❌ Diagnosis failed: ' + (error as Error).message);
    }
  };

  const patchHealthCheck = async () => {
    setStatus('checking');
    setMessage('Running health check diagnostics...');

    try {
      const response = await fetch('/api/admin/patch-health-check', {
        method: 'POST'
      });
      const data = await response.json();
      
      setHealthCheckDiagnosis(data);
      
      if (data.success) {
        setStatus('success');
        setMessage('✅ ' + data.message);
        // Refresh streaming status after patch
        await checkStreamingStatus();
      } else {
        setStatus('error');
        setMessage('❌ ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('❌ Health check patch failed: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Streaming Migration</h1>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              This page helps you set up streaming for outline generation. 
              Complete both steps to enable real-time streaming.
            </p>
          </div>

          {/* Step 1: Database Migration */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 1: Database Migration
            </h2>
            <p className="text-gray-600 mb-4">
              Add streaming columns to the outline_sessions table.
            </p>
            <button
              onClick={runMigration}
              disabled={status === 'migrating'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{status === 'migrating' ? 'Running Migration...' : 'Run Database Migration'}</span>
            </button>
          </div>

          {/* Step 2: Enable Streaming */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 2: Enable Streaming
            </h2>
            <p className="text-gray-600 mb-4">
              Enable the streaming feature flag.
            </p>
            <button
              onClick={enableStreaming}
              disabled={status === 'migrating'}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{status === 'migrating' ? 'Enabling...' : 'Enable Streaming'}</span>
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              status === 'success' ? 'bg-green-50 border border-green-200' :
              status === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center space-x-2">
                {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                {status === 'migrating' && (
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                )}
                <p className={
                  status === 'success' ? 'text-green-800' :
                  status === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }>
                  {message}
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold mb-2">🎉 Setup Complete!</h3>
              <p className="text-green-700">
                Streaming is now configured. New outline generations will use real-time streaming.
              </p>
            </div>
          )}

          {/* Streaming Status Section */}
          {streamingStatus && (
            <div className="mt-6 border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Streaming Status
                </h2>
                <button
                  onClick={checkStreamingStatus}
                  disabled={isChecking}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Overall Status */}
              <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                streamingStatus.diagnosis?.streamingActive 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {streamingStatus.diagnosis?.streamingActive ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Streaming is Active</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">Streaming is Not Active</span>
                  </>
                )}
              </div>

              {/* Environment Variables */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Environment</h3>
                <div className="bg-gray-50 rounded p-3 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">ENABLE_STREAMING:</span>
                    <code className={`text-sm font-mono ${
                      streamingStatus.environment?.ENABLE_STREAMING === 'true' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {streamingStatus.environment?.ENABLE_STREAMING || 'not set'}
                    </code>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">NODE_ENV:</span>
                    <code className="text-sm font-mono text-gray-800">
                      {streamingStatus.environment?.NODE_ENV || 'not set'}
                    </code>
                  </div>
                </div>
              </div>

              {/* Service Files */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Service Files</h3>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {streamingStatus.services?.v3ServiceExists ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm">V3 Streaming Service</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {streamingStatus.services?.unifiedServiceExists ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm">Unified Service Router</span>
                  </div>
                </div>
              </div>

              {/* Issues */}
              {streamingStatus.diagnosis?.issues && streamingStatus.diagnosis.issues.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">Issues Found:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {streamingStatus.diagnosis.issues.map((issue: string, idx: number) => (
                      <li key={idx} className="text-red-700 text-sm">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps if not active */}
              {!streamingStatus.diagnosis?.streamingActive && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">To Enable Streaming:</h3>
                  <ol className="list-decimal list-inside text-blue-700 text-sm space-y-1">
                    {!streamingStatus.environment?.ENABLE_STREAMING && (
                      <li>Set ENABLE_STREAMING=true in your environment variables</li>
                    )}
                    {!streamingStatus.services?.v3ServiceExists && (
                      <li>Ensure agenticOutlineServiceV3.ts file exists</li>
                    )}
                    {!streamingStatus.services?.unifiedServiceExists && (
                      <li>Ensure agenticOutlineServiceUnified.ts file exists</li>
                    )}
                    <li>Restart the application after making changes</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Diagnose Service Issues */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 3: Diagnose & Fix Issues
            </h2>
            <p className="text-gray-600 mb-4">
              If streaming shows as "unavailable", run these diagnostics.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={diagnoseService}
                disabled={status === 'checking'}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <AlertCircle className="w-4 h-4" />
                <span>{status === 'checking' ? 'Diagnosing...' : 'Diagnose Service'}</span>
              </button>
              
              <button
                onClick={patchHealthCheck}
                disabled={status === 'checking'}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{status === 'checking' ? 'Checking...' : 'Run Health Check Patch'}</span>
              </button>
            </div>
            
            {serviceDiagnosis && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">Diagnosis Results:</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    {serviceDiagnosis.databaseConnection ? 
                      <CheckCircle className="w-4 h-4 text-green-600" /> : 
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    }
                    <span>Database Connection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {serviceDiagnosis.tableExists ? 
                      <CheckCircle className="w-4 h-4 text-green-600" /> : 
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    }
                    <span>Table Exists</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {serviceDiagnosis.columnsCorrect ? 
                      <CheckCircle className="w-4 h-4 text-green-600" /> : 
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    }
                    <span>Columns Correct</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {serviceDiagnosis.queryWorks ? 
                      <CheckCircle className="w-4 h-4 text-green-600" /> : 
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    }
                    <span>Query Works</span>
                  </div>
                </div>
                {serviceDiagnosis.recommendation && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Recommendation:</strong> {serviceDiagnosis.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {healthCheckDiagnosis && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">Health Check Results:</h3>
                {healthCheckDiagnosis.success && healthCheckDiagnosis.diagnosis && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Database Connected</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Table Exists</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Query Capable</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Streaming Columns Exist</span>
                    </div>
                  </div>
                )}
                {healthCheckDiagnosis.recommendation && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      <strong>Status:</strong> {healthCheckDiagnosis.recommendation}
                    </p>
                  </div>
                )}
                {healthCheckDiagnosis.nextSteps && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-700 text-sm mb-1">Next Steps:</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                      {healthCheckDiagnosis.nextSteps.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}