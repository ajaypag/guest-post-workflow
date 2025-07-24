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

  const checkFormattingQaTablesExist = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-formatting-qa-tables');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Formatting QA tables (formatting_qa_sessions, formatting_qa_checks) exist');
        setMessageType('success');
      } else {
        setMessage(`ℹ️ ${data.message || 'Formatting QA tables do not exist'}`);
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking formatting QA tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runFormattingQaMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-formatting-qa', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Formatting QA tables migration completed successfully!');
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

  const runFormattingQaRollback = async () => {
    if (!confirm('Are you sure you want to remove the formatting QA tables? This will delete all AI QA sessions and results.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-formatting-qa', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Formatting QA tables rollback completed successfully!');
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

  const checkFormattingQaV2Status = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-formatting-qa-v2');
      const data = await response.json();
      
      if (data.success) {
        if (data.status.migration_needed) {
          setMessage(`ℹ️ Migration needed - Missing columns: ${data.status.columns_found.length === 0 ? 'cleaned_article, fixes_applied' : data.status.columns_found.join(', ')}`);
          setMessageType('info');
        } else {
          setMessage('✅ All formatting QA v2 columns exist (cleaned_article, fixes_applied)');
          setMessageType('success');
        }
      } else {
        setMessage(`❌ Error checking v2 status: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runFormattingQaV2Migration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-formatting-qa-v2', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Formatting QA v2 migration completed successfully!');
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

  const runFormattingQaV2Rollback = async () => {
    if (!confirm('Are you sure you want to remove the v2 columns? This will delete cleaned_article and fixes_applied data.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-formatting-qa-v2', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Formatting QA v2 rollback completed successfully!');
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

  // Outline Background Mode functions
  const checkOutlineBackgroundStatus = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-outline-background');
      const data = await response.json();
      
      if (data.columnsExist) {
        setMessage('✅ Background mode columns exist in outline_sessions table');
        setMessageType('success');
      } else {
        setMessage(`ℹ️ Background mode columns missing: ${data.missingColumns?.join(', ')}`);
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runOutlineBackgroundMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-outline-background', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Background mode columns added successfully!');
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

  const runOutlineBackgroundRollback = async () => {
    if (!confirm('Are you sure you want to remove the background mode columns?')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-outline-background', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Background mode columns removed successfully!');
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

  // Outline Sessions functions
  const checkOutlineSessionsStatus = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-outline-generation-health', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.database?.tableExists) {
        setMessage('✅ Outline sessions table exists and is properly configured');
        setMessageType('success');
      } else {
        setMessage('ℹ️ Outline sessions table does not exist');
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking table: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runOutlineSessionsMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-outline-sessions', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Outline sessions table created successfully!');
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

  const runOutlineSessionsRollback = async () => {
    if (!confirm('Are you sure you want to remove the outline_sessions table? This will delete all AI-generated outlines and session data.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-outline-sessions', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Outline sessions table removed successfully!');
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

  const checkArticleV2Status = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-article-v2');
      const data = await response.json();
      
      if (data.exists) {
        setMessage(`✅ V2 Agent Sessions table exists (${data.rowCount || 0} sessions)`);
        setMessageType('success');
      } else {
        setMessage('ℹ️ V2 Agent Sessions table does not exist');
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking V2 tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runArticleV2Migration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-article-v2', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ V2 Agent Sessions table created successfully! LLM orchestration is now enabled.');
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

  const runArticleV2Rollback = async () => {
    if (!confirm('Are you sure you want to remove the V2 tables? This will delete all V2 article generation sessions.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-article-v2?confirm=true', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ V2 Agent Sessions table removed successfully!');
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

  const checkSemanticAuditV2Status = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-semantic-audit-v2');
      const data = await response.json();
      
      if (data.exists) {
        setMessage(`✅ V2 Agent Sessions table exists (${data.sessionCount || 0} semantic audit sessions)`);
        setMessageType('success');
      } else {
        setMessage('ℹ️ V2 Agent Sessions table does not exist');
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking V2 tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runSemanticAuditV2Migration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-semantic-audit-v2', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ V2 Semantic Audit ready! Using shared v2_agent_sessions table.');
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

  const runSemanticAuditV2Rollback = async () => {
    if (!confirm('Are you sure you want to remove the V2 semantic audit sessions? This will only delete semantic audit sessions, not article V2 sessions.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-semantic-audit-v2', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ V2 Semantic Audit sessions removed successfully!');
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

  const checkLinkOrchestrationTableExists = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-link-orchestration-table');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Link orchestration table (link_orchestration_sessions) exists');
        setMessageType('success');
      } else {
        setMessage('ℹ️ Link orchestration table does not exist');
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking link orchestration table: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runLinkOrchestrationMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-link-orchestration', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Link orchestration table migration completed successfully!');
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

  const runLinkOrchestrationRollback = async () => {
    if (!confirm('Are you sure you want to remove the link orchestration table? This will delete all link orchestration sessions.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-link-orchestration', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Link orchestration table rollback completed successfully!');
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

  const checkBulkAnalysisImprovements = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-bulk-analysis-improvements');
      const data = await response.json();
      
      if (data.status.migration_needed) {
        setMessage(`ℹ️ Migration needed - Missing columns: ${data.status.missing_columns.join(', ')}`);
        setMessageType('info');
      } else {
        setMessage('✅ All bulk analysis improvement columns exist (has_workflow, workflow_id, workflow_created_at)');
        setMessageType('success');
      }
    } catch (error) {
      setMessage(`❌ Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runBulkAnalysisImprovementsMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-bulk-analysis-improvements', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Bulk analysis improvements migration completed successfully! Multi-tier qualification and workflow tracking enabled.');
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

  const runBulkAnalysisImprovementsRollback = async () => {
    if (!confirm('Are you sure you want to remove the bulk analysis improvements? This will remove workflow tracking columns and indexes.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-bulk-analysis-improvements-rollback', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Bulk analysis improvements rolled back successfully!');
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

          {/* Bulk URL Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk URL Management Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration enables the bulk URL management feature by making <code className="bg-gray-100 px-2 py-1 rounded">clientId</code> nullable 
              and adding columns for orphan URL support in the target_pages table.
            </p>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-800">Bulk URL Features:</h3>
                  <ul className="text-sm text-indigo-700 mt-2 space-y-1">
                    <li>• Paste URLs directly in site qualification workflow</li>
                    <li>• Smart client matching by domain</li>
                    <li>• Create new clients inline during workflow</li>
                    <li>• Temporary URLs for one-time campaigns (30-day expiration)</li>
                    <li>• No pre-population of client URLs required</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">
                ✨ For a dedicated migration interface with detailed status checks, visit the{' '}
                <a href="/admin/bulk-url-migration" className="underline font-semibold">
                  Bulk URL Migration Page
                </a>
              </p>
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
                  <li>• <button onClick={() => fetch('/api/admin/fix-polish-approach-column', { method: 'POST' }).then(r => r.json()).then(d => {alert(JSON.stringify(d, null, 2)); if(d.success) window.location.reload();})} className="text-red-600 hover:underline font-bold">🔧 FIX: Expand Column Sizes</button> - Fixes varchar(100) limit issue</li>
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

          {/* Formatting QA Tables Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Formatting QA Tables Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration creates the <code className="bg-gray-100 px-2 py-1 rounded">formatting_qa_sessions</code> and{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">formatting_qa_checks</code> tables required for the new 
              AI-powered formatting and quality assurance workflow in Step 7 (Formatting & QA).
            </p>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-800">Agentic Formatting QA Features:</h3>
                  <ul className="text-sm text-indigo-700 mt-2 space-y-1">
                    <li>• Automated validation of header hierarchy and formatting</li>
                    <li>• Checks paragraph spacing and line break consistency</li>
                    <li>• Verifies section completeness and structure</li>
                    <li>• Validates citation placement and UTM cleanup</li>
                    <li>• Provides detailed fix suggestions with confidence scores</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Formatting QA Tables Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Formatting QA Tables Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the formatting QA tables already exist in your database.
              </p>
              <button
                onClick={checkFormattingQaTablesExist}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Formatting QA Tables Status'}
              </button>
            </div>

            {/* Run Formatting QA Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Create Formatting QA Tables</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create the formatting_qa_sessions and formatting_qa_checks tables to enable AI-powered formatting checks.
              </p>
              <button
                onClick={runFormattingQaMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Create Formatting QA Tables'}
              </button>
            </div>

            {/* Formatting QA Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Formatting QA Tables (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the formatting QA tables and all stored QA sessions and results. This action cannot be undone.
              </p>
              <button
                onClick={runFormattingQaRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Formatting QA Tables'}
              </button>
            </div>
          </div>

          {/* Formatting QA v2 Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Formatting QA v2 Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration adds the missing <code className="bg-gray-100 px-2 py-1 rounded">cleaned_article</code> and{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">fixes_applied</code> columns to the existing{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">formatting_qa_sessions</code> table.
            </p>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-800">Enhanced Formatting QA Features:</h3>
                  <ul className="text-sm text-orange-700 mt-2 space-y-1">
                    <li>• <strong>cleaned_article:</strong> Stores the AI-fixed version of the article</li>
                    <li>• <strong>fixes_applied:</strong> Tracks which specific fixes were applied</li>
                    <li>• Enables the "Generate Cleaned Article" functionality</li>
                    <li>• Required for the enhanced formatting QA workflow</li>
                    <li>• Safe migration - only adds columns to existing table</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Formatting QA v2 Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Formatting QA v2 Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the enhanced formatting QA columns exist in your database.
              </p>
              <button
                onClick={checkFormattingQaV2Status}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check v2 Status'}
              </button>
            </div>

            {/* Run Formatting QA v2 Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Add Enhanced Columns (v2 Migration)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Add the cleaned_article and fixes_applied columns to enable enhanced formatting QA features.
              </p>
              <button
                onClick={runFormattingQaV2Migration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Add Enhanced Columns'}
              </button>
            </div>

            {/* Formatting QA v2 Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Enhanced Columns (v2 Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the cleaned_article and fixes_applied columns. This will delete all cleaned article data.
              </p>
              <button
                onClick={runFormattingQaV2Rollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Enhanced Columns'}
              </button>
            </div>
          </div>

          {/* Outline Generation Migration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Outline Generation Tables</h2>
            <p className="text-gray-600 mb-4">
              This migration creates the <code className="bg-gray-100 px-2 py-1 rounded">outline_sessions</code> table
              to support AI-powered outline generation with the 4-agent deep research pipeline.
            </p>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-purple-800">AI Outline Generation Features:</h3>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1">
                    <li>• <strong>4-Agent Pipeline:</strong> Triage → Clarifying → Instruction → Research</li>
                    <li>• <strong>Deep Research Model:</strong> Uses o3-deep-research for comprehensive outlines</li>
                    <li>• <strong>Clarification Support:</strong> Interactive Q&A for better results</li>
                    <li>• <strong>State Persistence:</strong> Resume sessions after clarification</li>
                    <li>• <strong>Version Control:</strong> Multiple outline versions per workflow</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Outline Sessions Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Outline Generation Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the outline_sessions table exists in your database.
              </p>
              <button
                onClick={checkOutlineSessionsStatus}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Table Status'}
              </button>
            </div>

            {/* Run Outline Sessions Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Create Outline Sessions Table</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create the outline_sessions table to enable AI-powered outline generation.
              </p>
              <button
                onClick={runOutlineSessionsMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Create Table'}
              </button>
            </div>

            {/* Outline Sessions Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Outline Sessions Table (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the outline_sessions table. This will delete all AI-generated outlines and session data.
              </p>
              <button
                onClick={runOutlineSessionsRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Table'}
              </button>
            </div>
          </div>

          {/* Outline Background Mode Migration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Outline Generation Background Mode</h2>
            <p className="text-gray-600 mb-4">
              This migration adds columns to support OpenAI background mode for long-running o3 deep research tasks.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">Background Mode Features:</h3>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• <strong>Async Processing:</strong> Handle 15+ minute research tasks without timeouts</li>
                    <li>• <strong>Response Polling:</strong> Check status of long-running operations</li>
                    <li>• <strong>Progress Tracking:</strong> Monitor polling attempts and last check time</li>
                    <li>• <strong>Reliability:</strong> Resume polling after disconnections</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Background Mode Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Background Mode Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the background mode columns exist in outline_sessions table.
              </p>
              <button
                onClick={checkOutlineBackgroundStatus}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Status'}
              </button>
            </div>

            {/* Run Background Mode Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Add Background Mode Columns</h3>
              <p className="text-gray-600 text-sm mb-3">
                Add background_response_id, polling_attempts, and last_polled_at columns.
              </p>
              <button
                onClick={runOutlineBackgroundMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Adding Columns...' : 'Add Columns'}
              </button>
            </div>

            {/* Background Mode Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Background Mode Columns (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the background mode columns from outline_sessions table.
              </p>
              <button
                onClick={runOutlineBackgroundRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove Columns'}
              </button>
            </div>
          </div>

          {/* Article V2 LLM Orchestration Migration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Article V2 - LLM Orchestration Tables</h2>
            <p className="text-gray-600 mb-4">
              This migration creates the <code className="bg-gray-100 px-2 py-1 rounded">v2_agent_sessions</code> table
              for the new V2 article generation system that uses true LLM orchestration.
            </p>
            
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-violet-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-violet-800">V2 LLM Orchestration Features:</h3>
                  <ul className="text-sm text-violet-700 mt-2 space-y-1">
                    <li>• <strong>True LLM Orchestration:</strong> Orchestrator agent manages writer agent</li>
                    <li>• <strong>Agent-as-Tool Pattern:</strong> Writer exposed as tool to orchestrator</li>
                    <li>• <strong>Natural Flow:</strong> Preserves ChatGPT.com conversational magic</li>
                    <li>• <strong>Minimal Structure:</strong> No rigid tools, just natural writing</li>
                    <li>• <strong>Vector Store Access:</strong> Same files as manual workflow</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check V2 Tables Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Article V2 Tables Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the v2_agent_sessions table exists in your database.
              </p>
              <button
                onClick={checkArticleV2Status}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check V2 Tables Status'}
              </button>
            </div>

            {/* Create V2 Tables */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Create Article V2 Tables</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create the v2_agent_sessions table to enable the new LLM orchestration article generation.
              </p>
              <button
                onClick={runArticleV2Migration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Creating Tables...' : 'Create V2 Tables'}
              </button>
            </div>

            {/* V2 Rollback */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Article V2 Tables (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the v2_agent_sessions table and all V2 generation data. This action cannot be undone.
              </p>
              <button
                onClick={runArticleV2Rollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Remove V2 Tables'}
              </button>
            </div>
          </div>

          {/* Semantic Audit V2 LLM Orchestration Migration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Semantic Audit V2 - LLM Orchestration</h2>
            <p className="text-gray-600 mb-4">
              This enables V2 semantic SEO audit using the same <code className="bg-gray-100 px-2 py-1 rounded">v2_agent_sessions</code> table
              as Article V2, but with <code className="bg-gray-100 px-2 py-1 rounded">step_id='content-audit'</code>.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">V2 Semantic Audit Features:</h3>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• <strong>Simple Flow:</strong> Direct audit without complex orchestration</li>
                    <li>• <strong>End Marker Pattern:</strong> Uses &lt;!-- END_OF_ARTICLE --&gt; for completion</li>
                    <li>• <strong>Natural Conversation:</strong> Follows ChatGPT.com tab experience</li>
                    <li>• <strong>Shared Infrastructure:</strong> Uses same v2_agent_sessions table</li>
                    <li>• <strong>Section-by-Section:</strong> Audits systematically with looping prompts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Semantic Audit V2 Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Semantic Audit V2 Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if V2 table exists and count semantic audit sessions.
              </p>
              <button
                onClick={checkSemanticAuditV2Status}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check V2 Audit Status'}
              </button>
            </div>

            {/* Enable Semantic Audit V2 */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Enable Semantic Audit V2</h3>
              <p className="text-gray-600 text-sm mb-3">
                Ensure v2_agent_sessions table exists for semantic audit V2 functionality.
              </p>
              <button
                onClick={runSemanticAuditV2Migration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Enabling...' : 'Enable V2 Audit'}
              </button>
            </div>

            {/* Remove Semantic Audit V2 Sessions */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Semantic Audit V2 Sessions</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove only semantic audit V2 sessions (step_id='content-audit'). Article V2 sessions remain.
              </p>
              <button
                onClick={runSemanticAuditV2Rollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Removing...' : 'Remove V2 Audit Sessions'}
              </button>
            </div>

            {/* Link to Diagnostics */}
            <div className="bg-purple-100 border border-purple-300 rounded-lg p-4">
              <p className="text-sm text-purple-800 font-medium">
                🔍 For detailed diagnostics and troubleshooting, visit the{' '}
                <a href="/admin/fix-semantic-audit-v2" className="underline font-semibold">
                  Semantic Audit V2 Diagnostics Page
                </a>
              </p>
            </div>
          </div>

          {/* Link Orchestration Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Link Orchestration Tables Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration creates the <code className="bg-gray-100 px-2 py-1 rounded">link_orchestration_sessions</code> table 
              required for the new AI-powered link orchestration feature in Step 8 (Link Building Hub).
            </p>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-purple-800">Link Orchestration Features:</h3>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1">
                    <li>• Multi-agent AI system for automated link building</li>
                    <li>• Completes all 7 link-building steps in one workflow</li>
                    <li>• Tracks progress through 3 phases of orchestration</li>
                    <li>• Stores article versions at each phase</li>
                    <li>• Generates images, link requests, and URL suggestions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Check Link Orchestration Table Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Link Orchestration Table Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the link orchestration table exists in the database.
              </p>
              <button
                onClick={checkLinkOrchestrationTableExists}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Table Status'}
              </button>
            </div>

            {/* Run Link Orchestration Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Create Link Orchestration Table</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create the link orchestration sessions table to enable the AI orchestration feature.
              </p>
              <button
                onClick={runLinkOrchestrationMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Creating Table...' : 'Create Table'}
              </button>
            </div>

            {/* Rollback Link Orchestration */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Link Orchestration Table (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the link orchestration table. This will delete all orchestration session data.
              </p>
              <button
                onClick={runLinkOrchestrationRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Removing Table...' : 'Remove Table'}
              </button>
            </div>
          </div>

          {/* Bulk Analysis Improvements Migration Section */}
          <div className="mt-12 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Analysis Improvements Migration</h2>
            <p className="text-gray-600 mb-4">
              This migration adds workflow tracking and performance improvements to the{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">bulk_analysis_domains</code> table. It enables multi-tier 
              qualification (high quality, average quality, disqualified) and tracks when workflows are created from qualified domains.
            </p>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-800">New Features Enabled:</h3>
                  <ul className="text-sm text-indigo-700 mt-2 space-y-1">
                    <li>• Multi-tier qualification (high quality vs average quality targets)</li>
                    <li>• Workflow tracking (has_workflow, workflow_id, workflow_created_at)</li>
                    <li>• Performance indexes for pagination and filtering</li>
                    <li>• Notes field for documenting qualification decisions</li>
                    <li>• Bulk operations support (export, bulk qualify, bulk delete)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {/* Check Bulk Analysis Improvements Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Migration Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the bulk analysis improvement columns and indexes exist.
              </p>
              <button
                onClick={checkBulkAnalysisImprovements}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Status'}
              </button>
            </div>

            {/* Run Bulk Analysis Improvements Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Run Migration</h3>
              <p className="text-gray-600 text-sm mb-3">
                Add workflow tracking columns and performance indexes to enable bulk analysis improvements.
              </p>
              <button
                onClick={runBulkAnalysisImprovementsMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Run Migration'}
              </button>
            </div>

            {/* Rollback Bulk Analysis Improvements */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Rollback Migration</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove workflow tracking columns and indexes. This will not affect existing bulk analysis data.
              </p>
              <button
                onClick={runBulkAnalysisImprovementsRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Rolling Back...' : 'Rollback Migration'}
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