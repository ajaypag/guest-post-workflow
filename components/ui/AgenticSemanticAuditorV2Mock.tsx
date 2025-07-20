'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, AlertCircle, Bug, CheckCircle } from 'lucide-react';

interface AgenticSemanticAuditorV2MockProps {
  workflowId: string;
  originalArticle: string;
  researchOutline: string;
  existingAuditedArticle?: string;
  onComplete: (auditedArticle: string) => void;
}

export const AgenticSemanticAuditorV2Mock = ({ 
  workflowId, 
  originalArticle,
  researchOutline,
  existingAuditedArticle,
  onComplete 
}: AgenticSemanticAuditorV2MockProps) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [mockAuditedArticle, setMockAuditedArticle] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${isError ? '❌ ' : ''}${message}`]);
    console.log(`[MOCK SEMANTIC V2] ${message}`);
  };

  const simulateAudit = async () => {
    setIsAuditing(true);
    setProgress(0);
    setLogs([]);
    addLog('🧪 MOCK MODE: Starting simulated V2 semantic audit...');
    addLog(`Workflow ID: ${workflowId}`);
    addLog(`Original article length: ${originalArticle.length} characters`);
    addLog(`Research outline length: ${researchOutline.length} characters`);
    addLog(`Has existing audit: ${!!existingAuditedArticle}`);

    // Simulate progress
    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += 12.5;
      setProgress(currentProgress);
      
      if (currentProgress === 12.5) {
        addLog('🔍 Mock: Analyzing article structure...');
      } else if (currentProgress === 25) {
        addLog('📝 Mock: Auditing SEO keywords and density...');
      } else if (currentProgress === 37.5) {
        addLog('🎯 Mock: Checking semantic relevance...');
      } else if (currentProgress === 50) {
        addLog('📊 Mock: Analyzing content gaps...');
      } else if (currentProgress === 62.5) {
        addLog('✍️ Mock: Optimizing introduction section...');
      } else if (currentProgress === 75) {
        addLog('🔧 Mock: Enhancing body content...');
      } else if (currentProgress === 87.5) {
        addLog('🎯 Mock: Optimizing conclusion...');
      } else if (currentProgress >= 100) {
        // Complete the audit
        clearInterval(intervalRef.current!);
        
        const mockOptimizedContent = `# ${originalArticle.split('\n')[0] || 'Mock SEO-Optimized Article'}

## Introduction - OPTIMIZED FOR SEO
This is a MOCK semantically optimized version of your article, generated for testing the auto-save functionality in the Content Audit step.

**Audit Details:**
- **Generated at:** ${new Date().toISOString()}
- **Workflow ID:** ${workflowId}
- **Original article length:** ${originalArticle.length} characters
- **Research outline provided:** Yes (${researchOutline.length} characters)
- **Audit version:** V2 Mock

## Section 1: Enhanced Content Structure - SEO OPTIMIZED

### Key SEO Improvements Applied:
- **Keyword density optimization:** Improved target keyword distribution
- **Semantic keyword integration:** Added related terms and LSI keywords
- **Content gaps filled:** Enhanced topic coverage based on research outline
- **Readability improvements:** Better flow and structure

Original content preview:
${originalArticle.substring(0, 200)}...

**MOCK OPTIMIZATION:** This section has been enhanced with better keyword integration and semantic relevance.

## Section 2: Technical SEO Enhancements

### Headers and Structure:
- Improved H1, H2, H3 hierarchy
- Better semantic markup
- Enhanced meta descriptions (conceptually)

### Content Quality:
- Increased depth and authority
- Better answering of user intent
- Enhanced expertise, authoritativeness, trustworthiness (E-A-T)

## Section 3: Auto-Save Testing Content

This mock audit tests the same auto-save functionality that was fixed in the Article Draft step:

1. **Race Condition Fix:** The onComplete callback should trigger immediate auto-save
2. **Data Persistence:** The seoOptimizedArticle field should save correctly
3. **State Management:** No more reading empty state during auto-save

**Testing Instructions:**
- Watch console logs for auto-save triggers
- Check if "Auto-saved" notification appears
- Verify data persists when switching tabs
- Test navigation warnings work correctly

## Conclusion - FULLY OPTIMIZED

This mock semantic audit demonstrates:
- ✅ SEO keyword optimization
- ✅ Content structure improvements  
- ✅ Auto-save functionality testing
- ✅ Race condition prevention

**Mock Statistics:**
- Original word count: ~${originalArticle.split(/\s+/).length} words
- Optimized word count: ~400 words (mock)
- SEO improvements: 15+ optimizations applied
- Semantic enhancements: Topic coverage increased by 30%

---
*This is a MOCK semantic audit for testing auto-save functionality only. Real V2 audits provide genuine SEO optimization.*`;

        setMockAuditedArticle(mockOptimizedContent);
        addLog('✅ Mock semantic audit complete!');
        addLog(`📊 Mock audited article length: ${mockOptimizedContent.length} characters`);
        
        // Critical: Call onComplete to trigger the save flow
        addLog('🔄 Calling onComplete callback for auto-save test...');
        onComplete(mockOptimizedContent);
        
        setIsAuditing(false);
        addLog('✅ onComplete callback executed - auto-save should trigger now');
      }
    }, 600); // Update every 600ms
  };

  const stopAudit = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsAuditing(false);
    addLog('⏹️ Mock semantic audit stopped by user');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 space-y-6">
      {/* Header with warning */}
      <div className="bg-yellow-100 border border-yellow-500 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Bug className="w-5 h-5 text-yellow-700" />
          <h3 className="text-lg font-semibold text-yellow-900">Semantic Audit V2 Mock Test Mode</h3>
        </div>
        <p className="text-sm text-yellow-800 mt-1">
          This simulates the V2 semantic audit without making API calls. 
          Use this to test the auto-save race condition fix.
        </p>
      </div>

      {/* Requirements Check */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Pre-Requirements Check:</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center space-x-2">
            {originalArticle ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span className={originalArticle ? 'text-green-800' : 'text-red-800'}>
              Original Article: {originalArticle ? `${originalArticle.length} characters` : 'Missing - complete Article Draft step first'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {researchOutline ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-orange-600" />
            )}
            <span className={researchOutline ? 'text-green-800' : 'text-orange-800'}>
              Research Outline: {researchOutline ? `${researchOutline.length} characters` : 'Optional - provides better audit context'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>This will generate a mock SEO-optimized article and test auto-save.</p>
          <p className="font-semibold">Watch the console for auto-save diagnostics!</p>
        </div>
        
        {!isAuditing ? (
          <button
            onClick={simulateAudit}
            disabled={!originalArticle.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>Start Mock Audit</span>
          </button>
        ) : (
          <button
            onClick={stopAudit}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Stop Mock</span>
          </button>
        )}
      </div>

      {/* Progress */}
      {isAuditing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mock Audit Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Diagnostic Logs */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Diagnostic Logs</h4>
        <div className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg max-h-60 overflow-y-auto font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Start mock audit to see diagnostic information.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      {/* Mock Result Preview */}
      {mockAuditedArticle && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-gray-900">Mock SEO-Optimized Article Generated</h4>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap">{mockAuditedArticle.substring(0, 600)}...</pre>
          </div>
          <p className="text-xs text-gray-600">
            The full optimized article ({mockAuditedArticle.length} characters) should now be saved in the seoOptimizedArticle field.
            Try switching tabs or navigating away to test auto-save persistence.
          </p>
        </div>
      )}

      {/* Testing Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Auto-Save Testing Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Ensure you have an article from the Article Draft step</li>
          <li>Click "Start Mock Audit" to simulate the V2 semantic optimization</li>
          <li>Watch the console (F12) for auto-save diagnostic logs</li>
          <li>After completion, check if the optimized article appears in the result field</li>
          <li>Test navigation - you should NOT get false warnings</li>
          <li>Reload the page to verify the optimized article persists</li>
          <li>Check Network tab to confirm auto-save API calls are successful</li>
        </ol>
      </div>
    </div>
  );
};