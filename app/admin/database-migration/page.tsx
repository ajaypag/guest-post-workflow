'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, X, Play, RotateCcw } from 'lucide-react';

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

  const checkPolishTablesExist = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-polish-tables');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Polish tables (polish_sessions, polish_sections) exist');
        setMessageType('success');
      } else {
        setMessage(`ℹ️ ${data.message || 'Polish tables do not exist'}`);
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking polish tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runPolishMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-polish', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Polish tables migration completed successfully!');
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

  const runPolishRollback = async () => {
    if (!confirm('Are you sure you want to remove the polish tables? This will delete all AI polish sessions and results.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-polish', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Polish tables rollback completed successfully!');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Database Migration Manager</h1>
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

          {/* Polish Tables Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Polish Tables Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration creates the <code className="bg-gray-100 px-2 py-1 rounded">polish_sessions</code> and{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">polish_sections</code> tables required for the new 
              AI-powered final polish workflow in Step 6 (Final Polish).
            </p>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-purple-800">Agentic Final Polish Features:</h3>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1">
                    <li>• Enables automated final polish balancing brand engagement with semantic directness</li>
                    <li>• Stores polish sessions, section analysis, and engagement/clarity scores</li>
                    <li>• Tracks brand vs semantic conflicts and resolution approaches</li>
                    <li>• Required for the "🤖 Agentic Polish" tab in Final Polish step</li>
                    <li>• Safe migration - creates new tables without affecting existing data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Polish Tables Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Polish Tables Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the polish tables already exist in your database.
              </p>
              <button
                onClick={checkPolishTablesExist}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Polish Tables Status'}
              </button>
            </div>

            {/* Run Polish Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Create Polish Tables</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create the polish_sessions and polish_sections tables to enable AI-powered final polish.
              </p>
              <div className="bg-gray-50 border border-gray-300 rounded p-3 mb-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Troubleshooting Tools:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <a href="/api/admin/check-polish-tables-direct" target="_blank" className="text-blue-600 hover:underline">Check Tables Directly</a> - Detailed table and column info</li>
                  <li>• <button onClick={() => fetch('/api/admin/test-polish-insert-real', { method: 'POST' }).then(r => r.json()).then(d => alert(JSON.stringify(d, null, 2)))} className="text-blue-600 hover:underline">Test Database Insert</button> - Test if tables work correctly</li>
                  <li>• <button onClick={() => fetch('/api/admin/migrate-polish-drizzle', { method: 'POST' }).then(r => r.json()).then(d => {alert(JSON.stringify(d, null, 2)); if(d.success) window.location.reload();})} className="text-blue-600 hover:underline font-semibold">Alternative Migration (Drizzle)</button> - Try this if regular migration fails</li>
                </ul>
              </div>
              <button
                onClick={runPolishMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Create Polish Tables'}
              </button>
            </div>

            {/* Polish Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Polish Tables (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the polish tables and all stored polish sessions and results. This action cannot be undone.
              </p>
              <button
                onClick={runPolishRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Polish Tables'}
              </button>
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