'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, Globe, Target, FileText, Image, Link as LinkIcon, User, Zap } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { GuestPostWorkflow } from '@/types/workflow';
import { storage } from '@/lib/storage';
import { format } from 'date-fns';

export default function WorkflowOverview() {
  const params = useParams();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<GuestPostWorkflow | null>(null);

  useEffect(() => {
    const data = storage.getWorkflow(params.id as string);
    if (data) {
      setWorkflow(data);
    } else {
      router.push('/');
    }
  }, [params.id, router]);

  if (!workflow) {
    return <div>Loading...</div>;
  }

  // Helper function to get step data
  const getStepData = (stepId: string) => workflow.steps.find(s => s.id === stepId)?.outputs || {};

  // Calculate progress
  const getProgress = () => {
    const completed = workflow.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / workflow.steps.length) * 100);
  };

  const domainData = getStepData('domain-selection');
  const keywordData = getStepData('keyword-research');
  const topicData = getStepData('topic-generation');
  const researchData = getStepData('deep-research');
  const draftData = getStepData('article-draft');
  const auditData = getStepData('content-audit');
  const polishData = getStepData('final-polish');
  const formattingData = getStepData('formatting-qa');
  const internalLinksData = getStepData('internal-links');
  const externalLinksData = getStepData('external-links');
  const clientMentionData = getStepData('client-mention');
  const clientLinkData = getStepData('client-link');
  const imagesData = getStepData('images');
  const linkRequestsData = getStepData('link-requests');
  const urlSuggestionData = getStepData('url-suggestion');

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/workflow/${workflow.id}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Workflow
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                All Workflows
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                {getProgress()}% Complete
              </div>
              <button
                onClick={() => {
                  const data = storage.exportWorkflow(workflow.id);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `workflow-overview-${workflow.clientName}-${workflow.id}.json`;
                  a.click();
                }}
                className="px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Export Overview
              </button>
            </div>
          </div>

          {/* Header Summary */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{workflow.clientName}</h1>
                <p className="text-blue-100">Campaign Overview & Summary</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-100">Created</div>
                <div className="font-semibold">{format(new Date(workflow.createdAt), 'MMM d, yyyy')}</div>
                {workflow.createdBy && (
                  <div className="text-sm text-blue-200">by {workflow.createdBy}</div>
                )}
                <div className="text-sm text-blue-100 mt-2">Last Updated</div>
                <div className="font-semibold">{format(new Date(workflow.updatedAt), 'MMM d, h:mm a')}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center mb-2">
                  <Globe className="w-5 h-5 mr-2" />
                  <span className="text-blue-100 text-sm font-medium">Target Site</span>
                </div>
                <p className="font-semibold text-lg truncate">
                  {domainData.domain || 'Not selected'}
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center mb-2">
                  <Target className="w-5 h-5 mr-2" />
                  <span className="text-blue-100 text-sm font-medium">Keyword</span>
                </div>
                <p className="font-semibold text-lg truncate">
                  {topicData.finalKeyword || 'Not determined'}
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center mb-2">
                  <FileText className="w-5 h-5 mr-2" />
                  <span className="text-blue-100 text-sm font-medium">Article Title</span>
                </div>
                <p className="font-semibold leading-tight">
                  {topicData.postTitle || 'Not created'}
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center mb-2">
                  <Zap className="w-5 h-5 mr-2" />
                  <span className="text-blue-100 text-sm font-medium">Status</span>
                </div>
                <p className="font-semibold text-lg">
                  {getProgress() === 100 ? 'Complete' : 'In Progress'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Content & Research */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  Content Overview
                </h2>
                
                <div className="space-y-4">
                  {topicData.primaryKeyword && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Primary Keyword</label>
                      <p className="text-gray-900">{topicData.primaryKeyword}</p>
                    </div>
                  )}
                  
                  {topicData.keywordVolume && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Search Volume</label>
                      <p className="text-gray-900">{topicData.keywordVolume} monthly searches</p>
                    </div>
                  )}
                  
                  {researchData.outlineContent && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Research Outline</label>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{researchData.outlineContent.substring(0, 200)}...</p>
                      </div>
                    </div>
                  )}
                  
                  {imagesData.totalImages && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Images</label>
                      <p className="text-gray-900">{imagesData.totalImages} images used</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Article Content */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Final Article</h2>
                
                {polishData.finalArticle ? (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{polishData.finalArticle.substring(0, 500)}...</p>
                  </div>
                ) : auditData.seoOptimizedArticle ? (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{auditData.seoOptimizedArticle.substring(0, 500)}...</p>
                  </div>
                ) : draftData.fullArticle ? (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{draftData.fullArticle.substring(0, 500)}...</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Article not yet created</p>
                )}
              </div>
            </div>

            {/* Links & Technical */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2 text-green-500" />
                  Links & URLs
                </h2>
                
                <div className="space-y-4">
                  {topicData.clientTargetUrl && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Client Target URL</label>
                      <p className="text-gray-900 break-all">{topicData.clientTargetUrl}</p>
                    </div>
                  )}
                  
                  {topicData.desiredAnchorText && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Desired Anchor Text</label>
                      <p className="text-gray-900">"{topicData.desiredAnchorText}"</p>
                    </div>
                  )}
                  
                  {urlSuggestionData.suggestedUrl && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Suggested URL</label>
                      <p className="text-gray-900 break-all">{urlSuggestionData.suggestedUrl}</p>
                    </div>
                  )}
                  
                  {draftData.googleDocUrl && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Google Doc</label>
                      <a 
                        href={draftData.googleDocUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 flex items-center"
                      >
                        View Document <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Google Doc & Status */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Document & Status</h2>
                
                {draftData.googleDocUrl && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <label className="text-sm font-medium text-blue-800 block mb-2">Google Document</label>
                    <a 
                      href={draftData.googleDocUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center font-medium"
                    >
                      Open Article Document <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Client Link</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      clientLinkData.clientLinkAdded === 'yes' 
                        ? 'bg-green-100 text-green-800' 
                        : clientLinkData.clientLinkAdded 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {clientLinkData.clientLinkAdded === 'yes' ? 'Added' : 
                       clientLinkData.clientLinkAdded ? 'Modified' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Client Mention</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      clientMentionData.clientMentionAdded === 'yes' 
                        ? 'bg-green-100 text-green-800' 
                        : clientMentionData.clientMentionAdded 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {clientMentionData.clientMentionAdded === 'yes' ? 'Added' : 
                       clientMentionData.clientMentionAdded ? 'Modified' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">QA & Formatting</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      formattingData.qaStatus === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : formattingData.qaStatus 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {formattingData.qaStatus || 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Link Requests</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      linkRequestsData.linkRequestStatus === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : linkRequestsData.linkRequestStatus 
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {linkRequestsData.linkRequestStatus || 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Images</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      imagesData.totalImages 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {imagesData.totalImages ? `${imagesData.totalImages} Added` : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">URL Suggestion</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      urlSuggestionData.suggestedUrl 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {urlSuggestionData.suggestedUrl ? 'Complete' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}