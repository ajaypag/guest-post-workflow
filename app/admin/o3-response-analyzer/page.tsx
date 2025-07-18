'use client';

import React, { useState } from 'react';
import { FileText, Play, Code, AlertCircle, CheckCircle, Copy } from 'lucide-react';

export default function O3ResponseAnalyzerPage() {
  const [inputData, setInputData] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const sampleData = `[{"id":"rs_68798cedb4a8819b9395a9086b50fb3b03f9f114a443b8a7","type":"reasoning","summary":[]},{"id":"ws_68798cf4dc84819b9e3e445d72afa87103f9f114a443b8a7","type":"web_search_call","status":"completed","action":{"type":"search","query":"link building public relations agency"}},{"id":"rs_68798cf6a054819b853afe13f0d52e8003f9f114a443b8a7","type":"reasoning","summary":[]},{"id":"ws_68798cfb3d78819ba8a","type":"web_search_call","status":"completed"},"Your Strategy Guide for 2025" – Fortis Media** (Guide by an SEO agency on combining public relations techniques with link building, including recommended tactics)  \\n5. **"Digital PR Link Building 101: Boosting Your SEO Strategy" – Editorial.link** (Comprehensive 2025 guide on PR-focused link building, with survey data showing digital PR's effectiveness as a link tactic)"}],"role":"assistant"}]`;

  const analyzeResponse = async () => {
    if (!inputData.trim()) {
      setError('Please paste the response data first');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(inputData);
      } catch (e) {
        // If not JSON, treat as string
        parsedData = inputData;
      }

      const response = await fetch('/api/admin/analyze-o3-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseData: parsedData })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze response');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (analysis?.sampleCode) {
      navigator.clipboard.writeText(analysis.sampleCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">o3-deep-research Response Analyzer</h1>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              Analyze o3-deep-research responses to understand their structure and determine the best parsing approach.
            </p>
          </div>

          {/* Input Section */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Response Data
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste the o3-deep-research response output
                </label>
                <textarea
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  placeholder="Paste the complete response here..."
                  className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setInputData(sampleData)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Use sample data
                </button>
                <button
                  onClick={() => {
                    setInputData('');
                    setAnalysis(null);
                    setError('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              </div>

              <button
                onClick={analyzeResponse}
                disabled={loading || !inputData.trim()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>{loading ? 'Analyzing...' : 'Analyze Response'}</span>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Summary */}
              <div className="border rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Analysis Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded p-4">
                    <div className="text-sm text-gray-600">Data Type</div>
                    <div className="font-medium text-lg">{analysis.analysis.dataType}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-4">
                    <div className="text-sm text-gray-600">Recommended Parser</div>
                    <div className="font-medium text-lg">{analysis.analysis.recommendedParser}</div>
                  </div>
                  <div className="bg-gray-50 rounded p-4">
                    <div className="text-sm text-gray-600">Text Locations Found</div>
                    <div className="font-medium text-lg">{analysis.summary.totalTextLocations}</div>
                  </div>
                </div>
                
                {analysis.summary.likelyOutlineLocation && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-green-800 font-medium">Likely outline location:</p>
                        <code className="text-green-700 text-sm font-mono">
                          {analysis.summary.likelyOutlineLocation}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Structure Details */}
              {analysis.analysis.structure && Object.keys(analysis.analysis.structure).length > 0 && (
                <div className="border rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Structure Details
                  </h2>
                  <div className="bg-gray-50 rounded p-4">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(analysis.analysis.structure, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Text Locations */}
              {analysis.analysis.extractedTexts && analysis.analysis.extractedTexts.length > 0 && (
                <div className="border rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Found Text Content
                  </h2>
                  <div className="space-y-4">
                    {analysis.analysis.extractedTexts.map((text: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded p-4">
                        <div className="flex items-start justify-between mb-2">
                          <code className="text-sm font-mono text-blue-600">{text.location}</code>
                          <span className="text-sm text-gray-500">{text.textLength} chars</span>
                        </div>
                        <div className="text-sm text-gray-700 italic">
                          {text.preview}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsing Steps */}
              {analysis.analysis.parsingSteps && analysis.analysis.parsingSteps.length > 0 && (
                <div className="border rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Recommended Parsing Steps
                  </h2>
                  <ol className="space-y-2">
                    {analysis.analysis.parsingSteps.map((step: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 font-medium">{index + 1}.</span>
                        <span className="text-gray-700">{step.replace(/^\d+\.\s*/, '')}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Sample Code */}
              {analysis.sampleCode && (
                <div className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Sample Parsing Code
                    </h2>
                    <button
                      onClick={copyCode}
                      className="flex items-center space-x-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto">
                    <pre className="text-sm">
                      <code>{analysis.sampleCode}</code>
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}