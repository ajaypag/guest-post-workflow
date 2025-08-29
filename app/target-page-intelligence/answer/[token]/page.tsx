'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader2, Send, ArrowRight, ExternalLink, Download } from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';

interface Gap {
  category: string;
  question: string;
  importance: 'high' | 'medium' | 'low';
}

interface QuestionData {
  client: {
    name: string;
    website: string;
  };
  targetPage: {
    url: string;
    title?: string;
  };
  gaps: Gap[];
  researchAnalysis: string;
  existingAnswers: any;
}

export default function TargetPageAnswerQuestionsPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [editedResearch, setEditedResearch] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isResearchExpanded, setIsResearchExpanded] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [token]);

  const loadQuestions = async () => {
    try {
      const response = await fetch(`/api/target-page-intelligence/questions/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 410) {
          // Questions already answered
          throw new Error(errorData.error || 'Questions have already been answered');
        } else {
          // Other errors (404, etc.)
          throw new Error('Questions not found or link expired');
        }
      }
      
      const data = await response.json();
      setQuestionData(data);
      
      // Initialize answers object
      const initialAnswers: { [key: number]: string } = {};
      data.gaps.forEach((_: any, index: number) => {
        initialAnswers[index] = '';
      });
      setAnswers(initialAnswers);
      
      // Initialize research analysis and additional info
      setEditedResearch(data.researchAnalysis || '');
      setAdditionalInfo(''); // Start empty for user input
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const exportToCSV = () => {
    if (!questionData) return;

    // Create CSV content
    const headers = ['Question Number', 'Category', 'Importance', 'Question', 'Your Answer'];
    const csvRows = [headers.join(',')];

    questionData.gaps.forEach((gap, index) => {
      const row = [
        (index + 1).toString(),
        `"${gap.category || 'General'}"`,
        gap.importance.toUpperCase(),
        `"${gap.question.replace(/"/g, '""')}"`, // Escape quotes in question
        '""' // Empty answer column for them to fill
      ];
      csvRows.push(row.join(','));
    });

    // Add additional info row
    csvRows.push('');
    csvRows.push('"Additional Information","","","Please provide any additional context or information:",""\n');

    const csvContent = csvRows.join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `target-page-questions-${questionData.client.name.replace(/\s+/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitAnswers = async () => {
    try {
      setSubmitting(true);
      setError('');

      // Validate that all questions are answered
      const unansweredQuestions = questionData!.gaps.filter((_, index) => !answers[index]?.trim());
      if (unansweredQuestions.length > 0) {
        throw new Error('Please answer all questions before submitting');
      }

      const response = await fetch(`/api/target-page-intelligence/submit-answers/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          answers,
          editedResearch: editedResearch.trim(),
          additionalInfo: additionalInfo.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit answers');
      }

      setSubmitted(true);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get full target page URL for display
  const getTargetPageUrl = () => {
    if (!questionData?.targetPage?.url) return '';
    return questionData.targetPage.url;
  };

  // Get domain name from target page URL for shorter display contexts
  const getTargetPageDomain = () => {
    if (!questionData?.targetPage?.url) return '';
    try {
      return new URL(questionData.targetPage.url).hostname.replace('www.', '');
    } catch {
      return questionData.targetPage.url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error && !questionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
        <LinkioHeader variant="default" />
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md mx-auto text-center p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Questions Not Found</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <p className="text-sm text-gray-500">
              The link may have expired or been used already. Please contact your account manager for assistance.
            </p>
          </div>
        </div>
        <MarketingFooter />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        <LinkioHeader variant="default" />
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md mx-auto text-center p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h1>
            <p className="text-gray-600 mb-6">
              Your answers have been submitted successfully. Our team will use this information to create highly targeted content for your <strong>{getTargetPageDomain()}</strong> page.
            </p>
            <p className="text-sm text-gray-500">
              You'll be notified when the target page brief is ready for review.
            </p>
          </div>
        </div>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <LinkioHeader variant="default" />
      
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Target Page Intelligence Questions</h1>
          <p className="text-lg text-gray-600 mb-2">
            Help us create the perfect content for your target page
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="text-center">
              <span className="text-sm font-medium text-blue-800 block mb-2">Target Page:</span>
              <a 
                href={questionData?.targetPage?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm font-medium flex items-center justify-center break-all"
              >
                {getTargetPageUrl()}
                <ExternalLink className="w-3 h-3 ml-2 flex-shrink-0" />
              </a>
            </div>
            <p className="text-xs text-blue-700 mt-2 text-center">
              For <span className="font-semibold">{questionData?.client.name}</span>
            </p>
          </div>
          <p className="text-sm text-gray-500">
            These questions help us understand your specific offering and ensure accurate representation in targeted content.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Progress</span>
            <span>
              {Object.values(answers).filter(a => a.trim()).length} of {questionData?.gaps.length || 0} answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${((Object.values(answers).filter(a => a.trim()).length) / (questionData?.gaps.length || 1)) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* AI Research Analysis - Editable */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Research Analysis</h3>
              <p className="text-sm text-gray-600 mb-4">
                Our AI research findings about your target page. Review and edit this analysis to ensure accuracy (questions are handled separately below):
              </p>
            </div>
            <button
              onClick={() => setIsResearchExpanded(!isResearchExpanded)}
              className="flex items-center px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              {isResearchExpanded ? (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Collapse
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Expand
                </>
              )}
            </button>
          </div>
          <textarea
            value={editedResearch}
            onChange={(e) => setEditedResearch(e.target.value)}
            placeholder="AI research analysis will appear here..."
            className={`w-full p-4 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 ${
              isResearchExpanded ? 'h-96' : 'min-h-48'
            }`}
            style={{ maxHeight: isResearchExpanded ? '500px' : '300px' }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Edit any inaccuracies or add missing information about your target page • Use the resize handle or expand button for better editing</span>
            <span>{editedResearch.length} characters</span>
          </div>
        </div>

        {/* Additional Target Page Information - Free-form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Target Page Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              What else should we know about this specific product/service? Add any important details about this target page:
            </p>
          </div>
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="e.g., Key features, benefits, pricing details, competitor differences, customer pain points this solves, success stories, technical specifications, etc."
            className="w-full min-h-32 p-4 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            style={{ maxHeight: '300px' }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>This information will help create more targeted and effective content for this specific page</span>
            <span>{additionalInfo.length} characters</span>
          </div>
        </div>

        {/* Questions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Answer the Questions</h2>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </button>
        </div>
        <div className="space-y-8">
          {questionData?.gaps.map((gap, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    gap.importance === 'high' ? 'bg-red-100 text-red-800' :
                    gap.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {gap.importance.toUpperCase()} PRIORITY
                  </span>
                  <span className="text-sm font-medium text-gray-600">{gap.category}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Question {index + 1}: {gap.question}
                </h3>
              </div>
              
              <textarea
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Please provide your answer here..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={2000}
              />
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {(answers[index] || '').length}/2,000 characters
                </span>
                {answers[index]?.trim() && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-12 text-center">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <button
            onClick={submitAnswers}
            disabled={submitting || Object.values(answers).some(a => !a.trim())}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            {submitting ? 'Submitting...' : 'Submit Answers'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            All questions must be answered to proceed
          </p>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}