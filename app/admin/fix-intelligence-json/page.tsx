'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Shield, Wrench, FileText, AlertTriangle } from 'lucide-react';

interface IntelligenceRecord {
  id: string;
  targetPageId: string;
  briefStatus: string;
  researchStatus: string;
  researchOutput: any;
  needsFixing?: boolean;
  gapCount?: number;
  sourceCount?: number;
}

interface FixResult {
  success: boolean;
  message: string;
  recordId: string;
  gapsExtracted?: number;
  sourcesExtracted?: number;
}

export default function FixIntelligenceJsonPage() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [records, setRecords] = useState<IntelligenceRecord[]>([]);
  const [problemRecords, setProblemRecords] = useState<IntelligenceRecord[]>([]);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Scan for problematic records
  const scanRecords = async () => {
    setScanning(true);
    setFixResults([]);
    try {
      const response = await fetch('/api/admin/intelligence-json/scan');
      const data = await response.json();
      
      if (data.success) {
        setRecords(data.records);
        setProblemRecords(data.problemRecords);
        
        // Auto-select all problem records
        const problemIds = new Set<string>(data.problemRecords.map((r: IntelligenceRecord) => r.id));
        setSelectedRecords(problemIds);
      }
    } catch (error) {
      console.error('Error scanning records:', error);
    } finally {
      setScanning(false);
    }
  };

  // Fix selected records
  const fixSelectedRecords = async () => {
    if (selectedRecords.size === 0) {
      alert('Please select records to fix');
      return;
    }

    setLoading(true);
    setFixResults([]);
    
    const results: FixResult[] = [];
    
    for (const recordId of Array.from(selectedRecords)) {
      try {
        const response = await fetch('/api/admin/intelligence-json/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId })
        });
        
        const result = await response.json();
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          message: `Error: ${error}`,
          recordId
        });
      }
    }
    
    setFixResults(results);
    setLoading(false);
    
    // Rescan to show updated state
    await scanRecords();
  };

  // Toggle record selection
  const toggleSelection = (recordId: string) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(recordId)) {
      newSelection.delete(recordId);
    } else {
      newSelection.add(recordId);
    }
    setSelectedRecords(newSelection);
  };

  // Select all problem records
  const selectAll = () => {
    const problemIds = new Set(problemRecords.map(r => r.id));
    setSelectedRecords(problemIds);
  };

  useEffect(() => {
    scanRecords();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Intelligence JSON Fix Tool</h1>
                <p className="text-gray-600">Fix malformed JSON in target page intelligence records</p>
              </div>
            </div>
            <button
              onClick={scanRecords}
              disabled={scanning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Scanning...' : 'Rescan'}</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{records.length}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Need Fixing</p>
                <p className="text-2xl font-bold text-amber-600">{problemRecords.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-blue-600">{selectedRecords.size}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Fix Results */}
        {fixResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Fix Results</h2>
            <div className="space-y-2">
              {fixResults.map((result, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm">{result.message}</span>
                    {result.gapsExtracted !== undefined && (
                      <span className="text-xs bg-white px-2 py-1 rounded">
                        {result.gapsExtracted} gaps, {result.sourcesExtracted} sources extracted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problem Records Table */}
        {problemRecords.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Records Needing Fix ({problemRecords.length})</h2>
              <div className="space-x-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedRecords(new Set())}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear Selection
                </button>
                <button
                  onClick={fixSelectedRecords}
                  disabled={loading || selectedRecords.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 inline-flex"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Fix Selected ({selectedRecords.size})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Record ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Page
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Gaps
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {problemRecords.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRecords.has(record.id)}
                          onChange={() => toggleSelection(record.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {record.id.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {record.targetPageId.substring(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {record.researchStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.gapCount || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                          Double-encoded JSON
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setShowDetails(showDetails === record.id ? null : record.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {showDetails === record.id ? 'Hide' : 'View'} Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Records Look Good!</h3>
            <p className="text-gray-600">No malformed JSON found in intelligence records.</p>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-lg">Fixing records...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}