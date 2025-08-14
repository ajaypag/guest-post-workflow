'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Play, 
  RotateCcw,
  Search,
  Database,
  Shield,
  Zap,
  ChevronRight,
  Globe,
  Copy,
  Trash2,
  Merge,
  Eye,
  Download,
  Upload
} from 'lucide-react';

interface MigrationStatus {
  hasNormalizedColumn: boolean;
  hasNormalizationFunction: boolean;
  hasTriggers: boolean;
  hasIndexes: boolean;
  totalWebsites: number;
  normalizedCount: number;
  duplicateGroups: number;
  duplicateWebsites: number;
  migrationComplete: boolean;
  lastMigrationDate: string | null;
}

interface DuplicateGroup {
  normalizedDomain: string;
  duplicateCount: number;
  websiteIds: string[];
  originalDomains: string[];
  firstCreated: string;
  lastCreated: string;
}

export default function DomainMigrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'duplicates' | 'test' | 'rollback'>('status');
  const [testDomain, setTestDomain] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/domain-migration/status');
      const data = await response.json();
      
      if (data.success) {
        setMigrationStatus(data.status);
        if (data.duplicates) {
          setDuplicates(data.duplicates);
        }
      } else {
        addLog(`Error: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Failed to check migration status: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    setExecutionLog(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  const runMigration = async () => {
    if (!confirm('This will normalize all domains in the database. Continue?')) return;
    
    setExecuting(true);
    setExecutionLog([]);
    addLog('Starting domain normalization migration...');

    try {
      const response = await fetch('/api/admin/domain-migration/execute', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        addLog('Migration executed successfully!', 'success');
        addLog(`Normalized ${data.normalizedCount} domains`);
        
        if (data.duplicateGroups > 0) {
          addLog(`Found ${data.duplicateGroups} groups of duplicates (${data.duplicateWebsites} total websites)`, 'error');
          addLog('Please review and handle duplicates in the Duplicates tab');
        } else {
          addLog('No duplicates found - migration complete!', 'success');
        }
        
        await checkMigrationStatus();
      } else {
        addLog(`Migration failed: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Migration error: ${error}`, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const mergeDuplicates = async (normalizedDomain: string) => {
    if (!confirm(`Merge all duplicates for ${normalizedDomain}? This will keep the best record and update all references.`)) return;
    
    setExecuting(true);
    addLog(`Merging duplicates for ${normalizedDomain}...`);

    try {
      const response = await fetch('/api/admin/domain-migration/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ normalizedDomain }),
      });
      const data = await response.json();

      if (data.success) {
        addLog(`Successfully merged ${data.mergedCount} duplicates`, 'success');
        addLog(`Keeper website ID: ${data.keeperId}`);
        await checkMigrationStatus();
      } else {
        addLog(`Merge failed: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Merge error: ${error}`, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const mergeAllDuplicates = async () => {
    if (!confirm(`This will automatically merge ALL ${duplicates.length} groups of duplicates. Are you sure?`)) return;
    
    setExecuting(true);
    addLog('Starting bulk merge of all duplicates...');
    
    let successCount = 0;
    let errorCount = 0;

    for (const group of duplicates) {
      try {
        const response = await fetch('/api/admin/domain-migration/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ normalizedDomain: group.normalizedDomain }),
        });
        const data = await response.json();

        if (data.success) {
          successCount++;
          addLog(`✅ Merged ${group.normalizedDomain} (${data.mergedCount} duplicates)`, 'success');
        } else {
          errorCount++;
          addLog(`❌ Failed to merge ${group.normalizedDomain}: ${data.error}`, 'error');
        }
      } catch (error) {
        errorCount++;
        addLog(`❌ Error merging ${group.normalizedDomain}: ${error}`, 'error');
      }
    }

    addLog(`Bulk merge complete: ${successCount} successful, ${errorCount} failed`, successCount > 0 ? 'success' : 'error');
    await checkMigrationStatus();
    setExecuting(false);
  };

  const testNormalization = async () => {
    if (!testDomain) {
      alert('Please enter a domain to test');
      return;
    }

    try {
      const response = await fetch('/api/admin/domain-migration/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: testDomain }),
      });
      const data = await response.json();

      if (data.success) {
        setTestResult(data.result);
      } else {
        setTestResult({ error: data.error });
      }
    } catch (error) {
      setTestResult({ error: `Test failed: ${error}` });
    }
  };

  const rollbackMigration = async () => {
    if (!confirm('⚠️ WARNING: This will remove all normalization. Are you absolutely sure?')) return;
    if (!confirm('This action cannot be easily undone. Please confirm again.')) return;
    
    setExecuting(true);
    addLog('Starting rollback...');

    try {
      const response = await fetch('/api/admin/domain-migration/rollback', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        addLog('Rollback completed successfully', 'success');
        addLog('Domain normalization has been removed');
        await checkMigrationStatus();
      } else {
        addLog(`Rollback failed: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Rollback error: ${error}`, 'error');
    } finally {
      setExecuting(false);
    }
  };

  const exportDuplicates = () => {
    const csv = [
      'Normalized Domain,Duplicate Count,Original Domains,First Created,Last Created',
      ...duplicates.map(d => 
        `"${d.normalizedDomain}","${d.duplicateCount}","${d.originalDomains.join(', ')}","${d.firstCreated}","${d.lastCreated}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domain-duplicates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking migration status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Domain Normalization Migration</h1>
                <p className="text-gray-600 mt-1">Manage domain normalization and handle duplicates</p>
              </div>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'status', label: 'Status', icon: Database },
                { id: 'duplicates', label: 'Duplicates', icon: Copy },
                { id: 'test', label: 'Test', icon: Search },
                { id: 'rollback', label: 'Rollback', icon: RotateCcw },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                  {tab.id === 'duplicates' && duplicates.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                      {duplicates.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Status Tab */}
            {activeTab === 'status' && migrationStatus && (
              <div className="space-y-6">
                {/* Migration Components Status */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Migration Components</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Normalized Column', status: migrationStatus.hasNormalizedColumn },
                      { label: 'Normalization Function', status: migrationStatus.hasNormalizationFunction },
                      { label: 'Auto-Triggers', status: migrationStatus.hasTriggers },
                      { label: 'Indexes', status: migrationStatus.hasIndexes },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          {item.status ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistics */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Database Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total Websites</p>
                      <p className="text-2xl font-bold text-gray-900">{migrationStatus.totalWebsites}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Normalized</p>
                      <p className="text-2xl font-bold text-gray-900">{migrationStatus.normalizedCount}</p>
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(migrationStatus.normalizedCount / migrationStatus.totalWebsites) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Duplicate Groups</p>
                      <p className="text-2xl font-bold text-red-600">{migrationStatus.duplicateGroups}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Duplicate Websites</p>
                      <p className="text-2xl font-bold text-red-600">{migrationStatus.duplicateWebsites}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {!migrationStatus.migrationComplete ? (
                      <button
                        onClick={runMigration}
                        disabled={executing}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Run Migration
                      </button>
                    ) : (
                      <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Migration Complete
                      </div>
                    )}
                    
                    <button
                      onClick={checkMigrationStatus}
                      disabled={executing}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </button>
                  </div>

                  {migrationStatus.lastMigrationDate && (
                    <p className="text-sm text-gray-500">
                      Last migration: {new Date(migrationStatus.lastMigrationDate).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Duplicates Tab */}
            {activeTab === 'duplicates' && (
              <div className="space-y-6">
                {duplicates.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Found {duplicates.length} groups of duplicate domains
                      </h3>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={exportDuplicates}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </button>
                        <button
                          onClick={mergeAllDuplicates}
                          disabled={executing}
                          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <Merge className="h-4 w-4 mr-2" />
                          Merge All Duplicates
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Normalized Domain
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Original Domains
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {duplicates.map((group) => (
                            <tr key={group.normalizedDomain}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-gray-900">{group.normalizedDomain}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                                  {group.duplicateCount} duplicates
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">
                                  {group.originalDomains.slice(0, 3).join(', ')}
                                  {group.originalDomains.length > 3 && ` +${group.originalDomains.length - 3} more`}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => mergeDuplicates(group.normalizedDomain)}
                                    disabled={executing}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                                  >
                                    Merge
                                  </button>
                                  <Link
                                    href={`/admin/websites?search=${group.normalizedDomain}`}
                                    className="text-gray-600 hover:text-gray-700 text-sm"
                                  >
                                    View
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No Duplicates Found</h3>
                    <p className="text-gray-600 mt-1">All domains are unique after normalization</p>
                  </div>
                )}
              </div>
            )}

            {/* Test Tab */}
            {activeTab === 'test' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Test Domain Normalization</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter a domain to see how it will be normalized
                  </p>
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={testDomain}
                      onChange={(e) => setTestDomain(e.target.value)}
                      placeholder="e.g., https://www.example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={testNormalization}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Test Normalization
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    {testResult.error ? (
                      <div className="text-red-600">
                        <XCircle className="h-5 w-5 inline mr-2" />
                        {testResult.error}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Original Input</p>
                            <p className="font-mono text-gray-900">{testResult.original}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Normalized Domain</p>
                            <p className="font-mono text-green-600 font-bold">{testResult.normalized}</p>
                          </div>
                        </div>
                        
                        {testResult.existingWebsite && (
                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-2">Existing Website Found:</p>
                            <div className="bg-white rounded p-3">
                              <p className="font-medium">{testResult.existingWebsite.domain}</p>
                              <p className="text-sm text-gray-600">
                                DR: {testResult.existingWebsite.domainRating} | 
                                ID: {testResult.existingWebsite.id}
                              </p>
                            </div>
                          </div>
                        )}

                        {testResult.duplicates && testResult.duplicates.length > 0 && (
                          <div className="pt-4 border-t border-gray-200">
                            <p className="text-sm text-red-600 mb-2">
                              ⚠️ Found {testResult.duplicates.length} duplicates with same normalized domain:
                            </p>
                            <ul className="space-y-1">
                              {testResult.duplicates.map((dup: any) => (
                                <li key={dup.id} className="text-sm text-gray-600">
                                  • {dup.domain} (ID: {dup.id})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Rollback Tab */}
            {activeTab === 'rollback' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-yellow-900">Warning: Rollback Domain Normalization</h3>
                      <p className="text-yellow-700 mt-2">
                        This action will remove all domain normalization from the database:
                      </p>
                      <ul className="list-disc list-inside text-yellow-700 mt-2 space-y-1">
                        <li>Remove normalized_domain columns</li>
                        <li>Drop normalization functions and triggers</li>
                        <li>Remove indexes on normalized domains</li>
                        <li>Restore original domain matching logic</li>
                      </ul>
                      <p className="text-yellow-700 mt-3 font-medium">
                        This should only be used if the migration causes critical issues.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={rollbackMigration}
                  disabled={executing || !migrationStatus?.migrationComplete}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Rollback Migration
                </button>

                {!migrationStatus?.migrationComplete && (
                  <p className="text-sm text-gray-500">
                    Rollback is only available after migration has been completed.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Execution Log */}
        {executionLog.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Execution Log</h3>
              <button
                onClick={() => setExecutionLog([])}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Log
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {executionLog.join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}