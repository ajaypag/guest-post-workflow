'use client';

import React, { useState } from 'react';
import { Shield, AlertCircle, CheckCircle, XCircle, Loader2, Bug, Wrench } from 'lucide-react';

interface DiagnosticData {
  timestamp: string;
  databaseInfo: {
    tableExists: boolean;
    columnInfo: Record<string, any>;
    sampleData: any[];
  };
  nullByteAnalysis: {
    affectedSessions: any[];
    affectedSections: any[];
    totalAffectedRecords: number;
    sampleProblematicData: any[];
  };
  characterAnalysis: {
    controlCharacters: any[];
    unicodeIssues: any[];
  };
  recommendations: string[];
  testResults: {
    canInsertCleanData: boolean;
    canUpdateWithNullBytes: boolean;
    postgresError: string | null;
  };
}

export default function FixPolishPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    setFixResult(null);
    
    try {
      const response = await fetch('/api/admin/diagnose-polish-null-bytes');
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Diagnostics failed');
        return;
      }
      
      setDiagnostics(data.diagnostics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixNullBytes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/diagnose-polish-null-bytes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix-null-bytes' })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Fix operation failed');
        return;
      }
      
      setFixResult(data);
      // Re-run diagnostics to show updated state
      await runDiagnostics();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ success }: { success: boolean }) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Bug className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Polish Step Null Byte Diagnostics</h1>
              <p className="text-gray-600">Diagnose and fix PostgreSQL null byte issues in polish data</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            <span>Run Diagnostics</span>
          </button>
          
          {diagnostics && diagnostics.nullByteAnalysis && diagnostics.nullByteAnalysis.totalAffectedRecords > 0 && (
            <button
              onClick={fixNullBytes}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              <span>Fix Null Bytes</span>
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fix Result */}
        {fixResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900">Fix Applied Successfully</h3>
                <p className="text-green-700">{fixResult.message}</p>
                <div className="mt-2 text-sm text-green-600">
                  <p>Fixed records:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Sessions: {fixResult.fixedRecords?.sessions || 0}</li>
                    <li>Section originals: {fixResult.fixedRecords?.sectionsOriginal || 0}</li>
                    <li>Section polished: {fixResult.fixedRecords?.sectionsPolished || 0}</li>
                    <li><strong>Total: {fixResult.fixedRecords?.total || 0}</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostics Results */}
        {diagnostics && (
          <div className="space-y-6">
            {/* Database Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <StatusIcon success={diagnostics.databaseInfo.tableExists} />
                <span>Database Status</span>
              </h3>
              <div className="space-y-2 text-sm">
                <p>Tables exist: {diagnostics.databaseInfo.tableExists ? 'Yes' : 'No'}</p>
                {diagnostics.databaseInfo.columnInfo.polish_metadata && (
                  <p>polish_metadata type: {diagnostics.databaseInfo.columnInfo.polish_metadata.type}</p>
                )}
              </div>
            </div>

            {/* Null Byte Analysis */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <StatusIcon success={diagnostics.nullByteAnalysis.totalAffectedRecords === 0} />
                <span>Null Byte Analysis</span>
              </h3>
              <div className="space-y-2 text-sm">
                <p>Affected sessions: {diagnostics.nullByteAnalysis.affectedSessions.length}</p>
                <p>Affected sections: {diagnostics.nullByteAnalysis.affectedSections.length}</p>
                <p className="font-medium">Total affected records: {diagnostics.nullByteAnalysis.totalAffectedRecords}</p>
                
                {diagnostics.nullByteAnalysis.affectedSessions.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium mb-2">Affected Sessions:</h4>
                    <div className="space-y-2">
                      {diagnostics.nullByteAnalysis.affectedSessions.slice(0, 3).map((session, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-gray-200">
                          <p className="text-xs">Session: {session.sessionId}</p>
                          <p className="text-xs">Workflow: {session.workflowId}</p>
                          <p className="text-xs text-red-600">Null byte at position: {session.nullBytePosition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diagnostics.nullByteAnalysis.sampleProblematicData.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium mb-2">Sample Problematic Data:</h4>
                    {diagnostics.nullByteAnalysis.sampleProblematicData.map((sample, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs font-mono">Before null: ...{sample.contextBefore}</p>
                        <p className="text-xs font-mono text-red-600">[NULL BYTE HERE]</p>
                        <p className="text-xs font-mono">After null: {sample.contextAfter}...</p>
                        <p className="text-xs mt-1">Character codes: {sample.characterCodes.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Control Characters */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Control Character Analysis</h3>
              <div className="space-y-2 text-sm">
                {diagnostics.characterAnalysis.controlCharacters.map((item, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border border-gray-200">
                    <p className="text-xs">Session: {item.sessionId}</p>
                    <p className="text-xs">Control characters found: {item.controlCharCount}</p>
                    {item.controlCharCount > 0 && (
                      <p className="text-xs font-mono mt-1">Sample: {item.cleanedSample}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Test Results</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <StatusIcon success={diagnostics.testResults.canInsertCleanData} />
                  <span>Can insert clean data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIcon success={!diagnostics.testResults.canUpdateWithNullBytes} />
                  <span>Null bytes are blocked (expected behavior)</span>
                </div>
                {diagnostics.testResults.postgresError && (
                  <p className="text-xs text-red-600 mt-2">Error: {diagnostics.testResults.postgresError}</p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Recommendations</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                {diagnostics.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-gray-500 text-right">
              Diagnostics run at: {new Date(diagnostics.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}