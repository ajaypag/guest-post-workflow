'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { ExternalLink } from 'lucide-react';

interface ArticleDraftStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ArticleDraftStep = ({ step, workflow, onChange }: ArticleDraftStepProps) => {
  // Get the outline content from the Deep Research step
  const deepResearchStep = workflow.steps.find(s => s.id === 'deep-research');
  const outlineContent = deepResearchStep?.outputs?.outlineContent || '';
  
  // Build the complete prompt with outline content
  const planningPrompt = `Okay, I'm about to give you a lot of information. Here is a data dump of a deep research we did that's going to lead to an article that you will write for me. I don't want you to start writing. I want you to first just take everything in, analyze it, and start preparing.After that, you're going to start thinking about the outline and flushing it out. I'm not necessarily writing yet, but taking the outline and flushing it out - you're deciding what goes where, you're picking a 3 citations only  and planning where they go. Let's just say total initial planning so that the article can flow through. Determine a word count as well. An acceptable range is 1500-2500.

${outlineContent || '((((Complete Step 3: Deep Research first to get outline content))))'}`;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-2">Step 4: Draft the Article (o3 Advanced Reasoning)</h3>
        <p className="text-sm mb-2">Open a new chat in the OutreachLabs Guest Posts project:</p>
        <a href="https://chatgpt.com/g/g-p-685ece4776fc8191963c943f9aed9d36-outreachlabs-guest-posts/project?model=o3" 
           target="_blank" 
           className="text-blue-600 hover:underline inline-flex items-center font-medium">
          OutreachLabs Guest Posts Project (o3) <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <p className="text-sm mt-2 italic">Note: Must be logged into info@onlyoutreach.com</p>
      </div>

      <div className="bg-green-50 p-4 rounded-md">
        <h4 className="font-semibold mb-2">Prompt #1: Planning Phase</h4>
        {outlineContent ? (
          <div className="bg-white p-2 border border-green-300 rounded mb-2">
            <p className="text-sm text-green-800">✅ Research outline automatically included from Step 3</p>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-2">
            <p className="text-sm text-yellow-800">⚠️ Complete Step 3 (Deep Research) first to get outline content</p>
          </div>
        )}
        <p className="text-sm mb-2">Copy and paste this complete prompt:</p>
        <div className="bg-white p-3 rounded border border-green-200 text-xs font-mono overflow-x-auto relative">
          <div className="absolute top-2 right-2">
            <CopyButton 
              text={planningPrompt}
              label="Copy"
            />
          </div>
          <div className="pr-16">
            <p>Okay, I'm about to give you a lot of information. Here is a data dump of a deep research we did that's going to lead to an article that you will write for me. I don't want you to start writing. I want you to first just take everything in, analyze it, and start preparing.After that, you're going to start thinking about the outline and flushing it out. I'm not necessarily writing yet, but taking the outline and flushing it out - you're deciding what goes where, you're picking a 3 citations only  and planning where they go. Let's just say total initial planning so that the article can flow through. Determine a word count as well. An acceptable range is 1500-2500.</p>
            <div className="mt-2 p-2 bg-gray-50 border rounded max-h-32 overflow-y-auto">
              {outlineContent ? (
                <p className="whitespace-pre-wrap">{outlineContent}</p>
              ) : (
                <p className="text-gray-500 italic">((((Complete Step 3: Deep Research first to get outline content))))</p>
              )}
            </div>
          </div>
        </div>
      </div>

    <div>
      <label className="block text-sm font-medium mb-1">Planning Complete?</label>
      <select
        value={step.outputs.planningStatus || ''}
        onChange={(e) => onChange({ ...step.outputs, planningStatus: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="completed">Planning phase completed</option>
        <option value="in-progress">Still in planning</option>
      </select>
    </div>

    <div className="bg-green-50 p-4 rounded-md">
      <h4 className="font-semibold mb-2">Prompt #2: Title + Introduction</h4>
      <p className="text-sm mb-2">Reply with this EXACT text:</p>
      <div className="bg-white p-3 rounded border border-green-200 text-xs font-mono overflow-x-auto relative">
        <div className="absolute top-2 right-2">
          <CopyButton 
            text="Yes, remember we're going to be creating this article section by section. And the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. The backbone remains storytelling: each section sets context, explains, and transitions naturally, so the article reads more like a well-structured conversation than a slide deck of bullet points. Start with the title and introduction. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Avoid using Em-dashes. the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section."
            label="Copy"
          />
        </div>
        <p>Yes, remember we're going to be creating this article section by section. And the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. The backbone remains storytelling: each section sets context, explains, and transitions naturally, so the article reads more like a well-structured conversation than a slide deck of bullet points. Start with the title and introduction. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Avoid using Em-dashes. the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.</p>
      </div>
    </div>

    <div className="bg-yellow-50 p-3 rounded-md">
      <h4 className="font-semibold mb-2">📄 Create a Google Doc for Your Article</h4>
      <ol className="text-sm space-y-1 ml-4">
        <li>1. <a href="https://docs.new" target="_blank" className="text-blue-600 hover:underline">Click here to create a new Google Doc</a></li>
        <li>2. Click "Share" → Change to "Anyone with the link can view"</li>
        <li>3. Copy the URL and paste it below</li>
      </ol>
      <p className="text-sm mt-2 text-gray-600">
        <strong>Purpose:</strong> As GPT outputs each section of the article, you'll paste them into this Google Doc to build the complete article.
      </p>
    </div>

    <SavedField
      label="Google Doc URL"
      value={step.outputs.googleDocUrl || ''}
      placeholder="https://docs.google.com/document/d/... (make sure it's shareable)"
      onChange={(value) => onChange({ ...step.outputs, googleDocUrl: value })}
    />

    <div className="bg-green-50 p-4 rounded-md">
      <h4 className="font-semibold mb-2">Looping Prompt: For Every Subsequent Section</h4>
      <p className="text-sm mb-2">Reply with this UNCHANGED each time:</p>
      <div className="bg-white p-3 rounded border border-green-200 text-xs font-mono overflow-x-auto relative">
        <div className="absolute top-2 right-2">
          <CopyButton 
            text={'Proceed to the next section. Remember, the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. The backbone remains storytelling: each section sets context, explains, and transitions naturally, so the article reads more like a well-structured conversation than a slide deck of bullet points. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Also be sure to reference my original prompt that contains the article information that should feed your context. I\'ve already done the research and given it to you there - so that\'s what you need to reference each time. Avoid using Em-dashes. If it\'s the section that is the "meat" of the article, you must further break your output down into subsections and only output the first subsection so as not to over simplify each component. Note: defining what a subsection means is important. We\'re not doing sub-subsections, so if the section of the article is already apparently a subsection, then that entire section should be included in your output even if there are apparently sub-subsections within. Note 2: the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.'}
            label="Copy"
          />
        </div>
        <p>Proceed to the next section. Remember, the format should be primarily narrative, which means its piece is built on flowing prose--full sentences and connected paragraphs that guide the reader smoothly from one idea to the next. They should be short, punchy paragraphs--rarely more than 2-to-3 lines each--so the eye never hits an intimidating wall of text. Frequent line breaks to create natural breathing room and improve scannability.Lists can appear, but only sparingly and only when they truly clarify complex details or highlight a quick sequence the reader might otherwise struggle to absorb. The backbone remains storytelling: each section sets context, explains, and transitions naturally, so the article reads more like a well-structured conversation than a slide deck of bullet points. Be sure to consult the project documents on Writing Guidelines and Semantic SEO before each section to remind yourself of the best practices that we want to follow. Also be sure to reference my original prompt that contains the article information that should feed your context. I've already done the research and given it to you there - so that's what you need to reference each time. Avoid using Em-dashes. If it's the section that is the "meat" of the article, you must further break your output down into subsections and only output the first subsection so as not to over simplify each component. Note: defining what a subsection means is important. We're not doing sub-subsections, so if the section of the article is already apparently a subsection, then that entire section should be included in your output even if there are apparently sub-subsections within. Note 2: the section you create must follow that of the original outline provided. Remember to keep total word count of article in mind and how you decided to divy up the words per section so you can allocate appropriate word count for this section.</p>
      </div>
      <p className="text-sm mt-2 font-semibold">Repeat until o3 signals the article is complete</p>
    </div>

    <SavedField
      label="Word Count"
      value={step.outputs.wordCount || ''}
      placeholder="Final word count"
      onChange={(value) => onChange({ ...step.outputs, wordCount: value })}
    />

    <div>
      <label className="block text-sm font-medium mb-1">Draft Status</label>
      <select
        value={step.outputs.draftStatus || ''}
        onChange={(e) => onChange({ ...step.outputs, draftStatus: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="in-progress">Still drafting sections</option>
        <option value="completed">All sections complete</option>
      </select>
    </div>

    <SavedField
      label="Full Article Text"
      value={step.outputs.fullArticle || ''}
      placeholder="Paste the complete article text here from your Google Doc. This will be used in subsequent steps for auditing and optimization."
      onChange={(value) => onChange({ ...step.outputs, fullArticle: value })}
      isTextarea={true}
      height="h-64"
    />

    <SavedField
      label="Draft Notes"
      value={step.outputs.draftNotes || ''}
      placeholder="Any notes about the drafting process"
      onChange={(value) => onChange({ ...step.outputs, draftNotes: value })}
      isTextarea={true}
      height="h-24"
    />
  </div>
);
};