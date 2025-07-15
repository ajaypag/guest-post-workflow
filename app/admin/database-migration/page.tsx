'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, X, Play, RotateCcw, Sparkles, Bug, Wrench } from 'lucide-react';

export default function DatabaseMigrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const runMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Keywords column added successfully! Target pages now support keyword storage.');
        setMessageType('success');
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runRollback = async () => {
    if (!confirm('Are you sure you want to remove the keywords column? This will delete any stored keywords.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Keywords column removed successfully! Rolled back to previous database state.');
        setMessageType('success');
      } else {
        setMessage(`❌ Rollback failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const checkColumnExists = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-keywords-column');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Keywords column exists in target_pages table');
        setMessageType('success');
      } else {
        setMessage('ℹ️ Keywords column does not exist in target_pages table');
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking column: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const checkDescriptionColumnExists = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-description-column');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Description column exists in target_pages table');
        setMessageType('success');
      } else {
        setMessage('ℹ️ Description column does not exist in target_pages table');
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking description column: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runDescriptionMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-description', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Description column migration completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runDescriptionRollback = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-description', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Description column rollback completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Rollback failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const checkAgenticTablesExist = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-agentic-tables');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Agentic workflow tables (article_sections, agent_sessions) exist');
        setMessageType('success');
      } else {
        setMessage(`ℹ️ ${data.message || 'Agentic workflow tables do not exist'}`);
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking agentic tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runAgenticMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-agentic', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Agentic workflow tables migration completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runAgenticRollback = async () => {
    if (!confirm('Are you sure you want to remove the agentic workflow tables? This will delete all AI-generated articles and session data.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-agentic', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Agentic workflow tables rollback completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Rollback failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const checkVersioningExists = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-agentic-versioning');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Version columns exist in agentic workflow tables');
        setMessageType('success');
      } else {
        setMessage(`ℹ️ ${data.message || 'Version columns do not exist'}`);
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking version columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runVersioningMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-agentic-versioning', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Version columns added successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runVersioningRollback = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-agentic-versioning', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Version columns rollback completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Rollback failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const checkSemanticAuditTablesExist = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-semantic-audit-tables');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Semantic audit tables (audit_sessions, audit_sections) exist');
        setMessageType('success');
      } else {
        setMessage(`ℹ️ ${data.message || 'Semantic audit tables do not exist'}`);
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking semantic audit tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runSemanticAuditMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-semantic-audit', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Semantic audit tables migration completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runSemanticAuditRollback = async () => {
    if (!confirm('Are you sure you want to remove the semantic audit tables? This will delete all AI audit sessions and results.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-semantic-audit', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Semantic audit tables rollback completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Rollback failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const checkFinalPolishTablesExist = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // First check if semantic audit tables exist (prerequisite)
      const semanticResponse = await fetch('/api/admin/check-semantic-audit-tables');
      const semanticData = await semanticResponse.json();
      
      if (!semanticData.exists) {
        setMessage('⚠️ Final polish requires semantic audit tables first. Please run "Create Semantic Audit Tables" migration first.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }
      
      // Now check final polish status
      const response = await fetch('/api/admin/migrate-final-polish', {
        method: 'GET'
      });
      const data = await response.json();
      
      if (data.success && data.details?.newFeatures) {
        setMessage('✅ Final polish support is already enabled in audit tables');
        setMessageType('success');
      } else {
        setMessage('ℹ️ Final polish support columns do not exist yet (semantic audit tables found)');
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking final polish status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runFinalPolishMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // Auto-check and create semantic audit tables if needed
      const semanticResponse = await fetch('/api/admin/check-semantic-audit-tables');
      const semanticData = await semanticResponse.json();
      
      if (!semanticData.exists) {
        setMessage('🔄 Creating semantic audit tables first (required for final polish)...');
        
        const createSemanticResponse = await fetch('/api/admin/migrate-semantic-audit', {
          method: 'POST'
        });
        const createSemanticData = await createSemanticResponse.json();
        
        if (!createSemanticData.success) {
          setMessage(`❌ Failed to create prerequisite semantic audit tables: ${createSemanticData.error}`);
          setMessageType('error');
          setIsLoading(false);
          return;
        }
      }
      
      // Now run final polish migration
      const response = await fetch('/api/admin/migrate-final-polish', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Final polish migration completed successfully! (Auto-created semantic audit tables if needed)');
        setMessageType('success');
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runFinalPolishRollback = async () => {
    if (!confirm('Are you sure you want to remove final polish support? This will delete brand compliance columns and polish workflow data.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-final-polish', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Final polish support rollback completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Rollback failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  // One-click complete setup for final polish
  const runCompleteSetup = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // Step 1: Setup core database if needed
      setMessage('🔄 Step 1/3: Setting up core database tables...');
      const setupResponse = await fetch('/api/setup-db', {
        method: 'POST'
      });
      const setupData = await setupResponse.json();
      
      if (!setupResponse.ok) {
        setMessage(`❌ Core database setup failed: ${setupData.error || 'Unknown error'}`);
        setMessageType('error');
        setIsLoading(false);
        return;
      }
      
      // Step 2: Create semantic audit tables
      setMessage('🔄 Step 2/3: Creating semantic audit tables...');
      const semanticResponse = await fetch('/api/admin/migrate-semantic-audit', {
        method: 'POST'
      });
      const semanticData = await semanticResponse.json();
      
      if (!semanticData.success) {
        setMessage(`❌ Failed to create semantic audit tables: ${semanticData.error}`);
        setMessageType('error');
        setIsLoading(false);
        return;
      }
      
      // Step 3: Enable final polish support
      setMessage('🔄 Step 3/3: Enabling final polish support...');
      const polishResponse = await fetch('/api/admin/migrate-final-polish', {
        method: 'POST'
      });
      const polishData = await polishResponse.json();
      
      if (polishData.success) {
        setMessage('🎉 Complete setup successful! Your database is ready for the Final Polish workflow.');
        setMessageType('success');
      } else {
        setMessage(`❌ Final polish setup failed: ${polishData.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const testTableInsert = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/debug/test-insert', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Test insert successful! Table schema is correct and working properly.');
        setMessageType('success');
      } else {
        setMessage(`❌ Test insert failed: ${data.error}\n\nThis means the table schema doesn't match what the application expects. Try the "Fix Missing Columns" button below.`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error testing insert: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const addMissingColumns = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/add-final-polish-columns', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Missing columns added successfully! Final polish should now work properly. Try testing again.');
        setMessageType('success');
      } else {
        setMessage(`❌ Failed to add columns: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error adding columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Database Migration Manager</h1>
          </div>

          {/* ONE-CLICK SETUP SECTION */}
          <div className="mb-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2" />
                  🎯 CLICK HERE TO ENABLE FINAL POLISH
                </h2>
                <p className="text-purple-100 mb-4">
                  One button does everything: Creates all required database tables for the Final Polish AI workflow.
                </p>
                <p className="text-xs text-purple-200">
                  This will run 3 steps automatically: Core DB → Semantic Audit Tables → Final Polish Support
                </p>
              </div>
              <button
                onClick={runCompleteSetup}
                disabled={isLoading}
                className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 min-w-[200px] justify-center"
              >
                <Sparkles className="w-5 h-5" />
                <span>{isLoading ? 'Setting Up...' : 'Complete Setup'}</span>
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Keywords Column Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration adds a <code className="bg-gray-100 px-2 py-1 rounded">keywords</code> column to the target_pages table 
              to support AI-generated keyword storage for each target URL.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800">Important Notes:</h3>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>• This migration is safe - it only adds a new optional column</li>
                    <li>• Your existing target pages data will not be affected</li>
                    <li>• The rollback will remove the column and any stored keywords</li>
                    <li>• Always test in staging before production if possible</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Check Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Current Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the keywords column already exists in your database.
              </p>
              <button
                onClick={checkColumnExists}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Column Status'}
              </button>
            </div>

            {/* Run Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Add Keywords Column</h3>
              <p className="text-gray-600 text-sm mb-3">
                Safely add the keywords column to enable AI keyword generation features.
              </p>
              <button
                onClick={runMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Add Keywords Column'}
              </button>
            </div>

            {/* Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Keywords Column (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the keywords column and all stored keyword data. This action cannot be undone.
              </p>
              <button
                onClick={runRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Keywords Column'}
              </button>
            </div>
          </div>

          {/* Description Column Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description Column Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration adds a <code className="bg-gray-100 px-2 py-1 rounded">description</code> column to the target_pages table 
              to support AI-generated URL descriptions for site qualification workflow steps.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">Description Column Features:</h3>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Stores AI-generated descriptions of target URL content</li>
                    <li>• Used for site qualification and preparation workflow steps</li>
                    <li>• Safe migration - only adds new optional column</li>
                    <li>• Can be rolled back if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Description Column Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Description Column Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the description column already exists in your database.
              </p>
              <button
                onClick={checkDescriptionColumnExists}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Description Column Status'}
              </button>
            </div>

            {/* Run Description Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Add Description Column</h3>
              <p className="text-gray-600 text-sm mb-3">
                Safely add the description column to enable AI description generation features.
              </p>
              <button
                onClick={runDescriptionMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Add Description Column'}
              </button>
            </div>

            {/* Description Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Description Column (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the description column and all stored description data. This action cannot be undone.
              </p>
              <button
                onClick={runDescriptionRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Description Column'}
              </button>
            </div>
          </div>

          {/* Agentic Workflow Tables Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agentic Workflow Tables Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration creates the <code className="bg-gray-100 px-2 py-1 rounded">article_sections</code> and{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">agent_sessions</code> tables required for AI-powered 
              automatic article generation using OpenAI Agents SDK.
            </p>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-purple-800">Agentic Workflow Features:</h3>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1">
                    <li>• Enables fully automated article generation in Article Draft step</li>
                    <li>• Stores article sections and generation progress in real-time</li>
                    <li>• Tracks AI agent sessions and conversation context</li>
                    <li>• Required for the "🤖 AI Agent (Auto)" tab functionality</li>
                    <li>• Safe migration - creates new tables without affecting existing data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Agentic Tables Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Agentic Tables Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the agentic workflow tables already exist in your database.
              </p>
              <button
                onClick={checkAgenticTablesExist}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Agentic Tables Status'}
              </button>
            </div>

            {/* Run Agentic Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Create Agentic Workflow Tables</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create the article_sections and agent_sessions tables to enable AI-powered article generation.
              </p>
              <button
                onClick={runAgenticMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Create Agentic Tables'}
              </button>
            </div>

            {/* Agentic Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Agentic Workflow Tables (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the agentic workflow tables and all stored AI-generated articles and sessions. This action cannot be undone.
              </p>
              <button
                onClick={runAgenticRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Agentic Tables'}
              </button>
            </div>
          </div>

          {/* Agentic Versioning Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agentic Versioning Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration adds <code className="bg-gray-100 px-2 py-1 rounded">version</code> columns to the{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">article_sections</code> and{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">agent_sessions</code> tables. This enables proper versioning 
              so each agentic run creates a new version instead of accumulating sections.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800">Important Notes:</h3>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    <li>• This requires the agentic workflow tables to exist first</li>
                    <li>• Existing data will be preserved with version = 1</li>
                    <li>• Future runs will increment version numbers automatically</li>
                    <li>• Fixes the article accumulation issue on multiple runs</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Check Versioning Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Versioning Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if version columns exist in the agentic workflow tables.
              </p>
              <button
                onClick={checkVersioningExists}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Versioning Status'}
              </button>
            </div>

            {/* Run Versioning Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Add Version Columns</h3>
              <p className="text-gray-600 text-sm mb-3">
                Add version columns to enable proper agentic workflow versioning.
              </p>
              <button
                onClick={runVersioningMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Add Version Columns'}
              </button>
            </div>

            {/* Rollback Versioning */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Version Columns (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove version columns. This will lose version tracking but preserve existing data.
              </p>
              <button
                onClick={runVersioningRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Version Columns'}
              </button>
            </div>
          </div>

          {/* Semantic Audit Tables Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Semantic Audit Tables Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration creates the <code className="bg-gray-100 px-2 py-1 rounded">audit_sessions</code> and{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">audit_sections</code> tables required for the new 
              AI-powered semantic SEO audit workflow in Step 6 (Content Audit).
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-green-800">Semantic Audit Features:</h3>
                  <ul className="text-sm text-green-700 mt-2 space-y-1">
                    <li>• Enables automated section-by-section semantic SEO auditing</li>
                    <li>• Stores audit sessions, progress, and optimized content</li>
                    <li>• Tracks citation usage and editing patterns for variety</li>
                    <li>• Required for the "🤖 AI Agent (Auto)" tab in Content Audit step</li>
                    <li>• Safe migration - creates new tables without affecting existing data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Semantic Audit Tables Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Semantic Audit Tables Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the semantic audit tables already exist in your database.
              </p>
              <button
                onClick={checkSemanticAuditTablesExist}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Semantic Audit Tables Status'}
              </button>
            </div>

            {/* Run Semantic Audit Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Create Semantic Audit Tables</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create the audit_sessions and audit_sections tables to enable AI-powered semantic SEO auditing.
              </p>
              <button
                onClick={runSemanticAuditMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Create Semantic Audit Tables'}
              </button>
            </div>

            {/* Semantic Audit Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Semantic Audit Tables (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the semantic audit tables and all stored audit sessions and results. This action cannot be undone.
              </p>
              <button
                onClick={runSemanticAuditRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Semantic Audit Tables'}
              </button>
            </div>
          </div>

          {/* Final Polish Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Final Polish Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration extends the existing audit tables to support final polish workflows. It adds 
              brand alignment columns and two-prompt workflow tracking to enable AI-powered brand compliance 
              polishing in Step 7 (Final Polish).
            </p>

            {/* Dependency Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">⚡ AUTOMATIC DEPENDENCY HANDLING</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    <strong>Don't worry about order!</strong> The "Enable Final Polish Support" button will automatically create semantic audit tables first if needed.
                    Just click the button and everything will be handled for you.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-purple-800">Final Polish Features:</h3>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1">
                    <li>• Extends existing audit tables for brand alignment workflows</li>
                    <li>• Enables two-prompt workflow: proceed → cleanup for each section</li>
                    <li>• Tracks brand compliance scores and editing patterns</li>
                    <li>• Required for the "🤖 AI Agent" tab in Final Polish step</li>
                    <li>• Safe migration - extends existing tables without data loss</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Final Polish Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Final Polish Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if final polish support columns already exist in the audit tables.
              </p>
              <button
                onClick={checkFinalPolishTablesExist}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Final Polish Status'}
              </button>
            </div>

            {/* Run Final Polish Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Enable Final Polish Support</h3>
              <p className="text-gray-600 text-sm mb-3">
                Extend audit tables to support brand alignment and two-prompt workflows for AI-powered final polish.
              </p>
              <button
                onClick={runFinalPolishMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Enable Final Polish Support'}
              </button>
            </div>

            {/* Final Polish Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Final Polish Support (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove final polish support columns and all brand compliance data. This action cannot be undone.
              </p>
              <button
                onClick={runFinalPolishRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Final Polish Support'}
              </button>
            </div>
            
            {/* Debug Section */}
            <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
                <Bug className="w-5 h-5 mr-2" />
                Debug Final Polish Issues
              </h3>
              <p className="text-orange-700 text-sm mb-4">
                If the final polish workflow is showing column errors, use these diagnostic tools to identify and fix the problem.
              </p>
              
              <div className="space-y-3">
                {/* Test Insert */}
                <div className="border border-orange-200 rounded-lg p-4 bg-white">
                  <h4 className="font-medium text-gray-900 mb-2">1. Test Table Schema</h4>
                  <p className="text-gray-600 text-sm mb-3">
                    Test if the current table structure matches what the application expects.
                  </p>
                  <button
                    onClick={testTableInsert}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    {isLoading ? 'Testing...' : 'Test Table Schema'}
                  </button>
                </div>
                
                {/* Fix Missing Columns */}
                <div className="border border-orange-200 rounded-lg p-4 bg-white">
                  <h4 className="font-medium text-gray-900 mb-2">2. Fix Missing Columns</h4>
                  <p className="text-gray-600 text-sm mb-3">
                    Add any missing final polish columns to existing tables without dropping data.
                  </p>
                  <button
                    onClick={addMissingColumns}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    {isLoading ? 'Adding Columns...' : 'Fix Missing Columns'}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 bg-orange-100 border border-orange-200 rounded p-3">
                <p className="text-orange-800 text-sm">
                  <strong>Usage:</strong> First click "Test Table Schema" to see if there are issues. If it fails, click "Fix Missing Columns" to resolve them.
                </p>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg border ${
              messageType === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : messageType === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-start space-x-3">
                {messageType === 'success' && <CheckCircle className="w-5 h-5 mt-0.5" />}
                {messageType === 'error' && <X className="w-5 h-5 mt-0.5" />}
                {messageType === 'info' && <Database className="w-5 h-5 mt-0.5" />}
                <p className="text-sm whitespace-pre-wrap">{message}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <a
              href="/admin/users"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Admin Panel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}