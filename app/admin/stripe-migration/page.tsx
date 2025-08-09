'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertCircle, Database, Loader2, Shield, CreditCard, Webhook } from 'lucide-react';

interface MigrationCheck {
  name: string;
  description: string;
  status: 'pending' | 'checking' | 'exists' | 'missing' | 'error';
  error?: string;
  icon: React.ReactNode;
}

export default function StripeMigrationPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<MigrationCheck[]>([
    {
      name: 'stripe_payment_intents',
      description: 'Core table for tracking Stripe Payment Intents',
      status: 'pending',
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      name: 'stripe_customers', 
      description: 'Stripe customer records linked to accounts',
      status: 'pending',
      icon: <Shield className="h-5 w-5" />
    },
    {
      name: 'stripe_webhooks',
      description: 'Webhook event processing and deduplication',
      status: 'pending',
      icon: <Webhook className="h-5 w-5" />
    }
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/admin/stripe-migration/check');
      if (!response.ok) throw new Error('Failed to check migration status');
      const data = await response.json();
      
      setChecks(prevChecks => prevChecks.map(check => {
        const tableExists = data.tables[check.name];
        return {
          ...check,
          status: tableExists ? 'exists' : 'missing'
        };
      }));
    } catch (error) {
      console.error('Error checking migration:', error);
      setChecks(prevChecks => prevChecks.map(check => ({
        ...check,
        status: 'error',
        error: 'Failed to check table status'
      })));
    } finally {
      setIsChecking(false);
    }
  };

  const applyMigration = async () => {
    setIsApplying(true);
    setMigrationResult(null);
    
    try {
      const response = await fetch('/api/admin/stripe-migration/apply', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }
      
      setMigrationResult(data);
      
      // Recheck status after migration
      await checkMigrationStatus();
    } catch (error) {
      console.error('Error applying migration:', error);
      setMigrationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const allTablesExist = checks.every(check => check.status === 'exists');
  const hasMissingTables = checks.some(check => check.status === 'missing');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stripe Database Migration</h1>
              <p className="text-gray-600">Manage database tables required for Stripe payment integration</p>
            </div>
          </div>

          {/* Migration Status */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Required Tables Status</h2>
            <div className="space-y-3">
              {checks.map((check) => (
                <div key={check.name} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {check.icon}
                      <div>
                        <h3 className="font-medium text-gray-900">{check.name}</h3>
                        <p className="text-sm text-gray-600">{check.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {check.status === 'checking' || check.status === 'pending' ? (
                        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                      ) : check.status === 'exists' ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">Exists</span>
                        </>
                      ) : check.status === 'missing' ? (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="text-sm text-red-600 font-medium">Missing</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          <span className="text-sm text-yellow-600 font-medium">Error</span>
                        </>
                      )}
                    </div>
                  </div>
                  {check.error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      {check.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Migration Result */}
          {migrationResult && (
            <div className={`mb-6 p-4 rounded-lg ${
              migrationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {migrationResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    migrationResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {migrationResult.success ? 'Migration Successful' : 'Migration Failed'}
                  </h3>
                  {migrationResult.message && (
                    <p className={`text-sm mt-1 ${
                      migrationResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {migrationResult.message}
                    </p>
                  )}
                  {migrationResult.error && (
                    <pre className="text-xs mt-2 p-2 bg-red-100 rounded overflow-x-auto">
                      {migrationResult.error}
                    </pre>
                  )}
                  {migrationResult.details && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-gray-700">Details:</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {Object.entries(migrationResult.details).map(([key, value]) => (
                          <li key={key}>
                            {key}: <span className="font-medium">{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-gray-600">
              {allTablesExist ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  All Stripe tables are properly configured
                </span>
              ) : hasMissingTables ? (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Some tables need to be created
                </span>
              ) : null}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={checkMigrationStatus}
                disabled={isChecking || isApplying}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="inline-block h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Refresh Status'
                )}
              </button>
              
              {hasMissingTables && (
                <button
                  onClick={applyMigration}
                  disabled={isApplying || isChecking}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="inline-block h-4 w-4 mr-2 animate-spin" />
                      Applying Migration...
                    </>
                  ) : (
                    'Apply Migration'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* SQL Preview */}
          {hasMissingTables && (
            <div className="mt-6 pt-6 border-t">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Migration SQL
                </summary>
                <pre className="mt-3 p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto">
{`-- Stripe Payment Integration Tables

CREATE TABLE IF NOT EXISTS "stripe_payment_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "payment_id" uuid REFERENCES "payments"("id"),
  "stripe_payment_intent_id" varchar(255) NOT NULL UNIQUE,
  "stripe_customer_id" varchar(255),
  "amount" integer NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'USD',
  "status" varchar(50) NOT NULL,
  "client_secret" text NOT NULL,
  "metadata" jsonb,
  "idempotency_key" varchar(255) UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "stripe_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "stripe_customer_id" varchar(255) NOT NULL UNIQUE,
  "email" varchar(255) NOT NULL,
  "name" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "stripe_webhooks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stripe_event_id" varchar(255) NOT NULL UNIQUE,
  "event_type" varchar(100) NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'pending',
  "event_data" jsonb NOT NULL,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);`}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}