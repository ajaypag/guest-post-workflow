'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { ExternalLink } from 'lucide-react';

interface ClientLinkStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ClientLinkStep = ({ step, workflow, onChange }: ClientLinkStepProps) => (
  <div className="space-y-4">
    <div className="bg-blue-50 p-4 rounded-md">
      <h3 className="font-semibold mb-2">Step 11: Client Link Placement</h3>
      <p className="text-sm mb-2">
        Place a link to the client inside the article. Follow the instructions: paste the article and the URL you want to add.
      </p>
      <a href="https://chatgpt.com/g/g-685c44e260908191973c469465ed7d4b-insert-client-s-link-into-your-guest-post" 
         target="_blank" 
         className="text-blue-600 hover:underline inline-flex items-center font-medium">
        Insert Client's Link GPT <ExternalLink className="w-3 h-3 ml-1" />
      </a>
    </div>

    <SavedField
      label="Client URL to Link"
      value={step.outputs.clientUrl || workflow.clientUrl}
      placeholder={workflow.clientUrl}
      onChange={(value) => onChange({ ...step.outputs, clientUrl: value })}
    />
    <p className="text-xs text-gray-500 -mt-3">Default: {workflow.clientUrl}</p>

    <SavedField
      label="Desired Anchor Text"
      value={step.outputs.anchorText || ''}
      placeholder="Anchor text for the link"
      onChange={(value) => onChange({ ...step.outputs, anchorText: value })}
    />

    <SavedField
      label="Initial GPT Suggestion"
      value={step.outputs.initialSuggestion || ''}
      placeholder="Paste the initial suggestion from GPT"
      onChange={(value) => onChange({ ...step.outputs, initialSuggestion: value })}
      isTextarea={true}
      height="h-24"
    />

    <div className="bg-yellow-50 p-4 rounded-md">
      <h4 className="font-semibold mb-2">Follow-up Prompt #1</h4>
      <p className="text-sm mb-2">Ask this prompt after the initial suggestion:</p>
      <div className="bg-white p-3 rounded border border-yellow-200 text-xs font-mono overflow-x-auto relative">
        <div className="absolute top-2 right-2">
          <CopyButton 
            text="again, a link insert should not feel random or out of left field or feel like theres no reason why its being linked to. a good link is one that instantly looks like it belongs. as in, the article is saying something, and the way the link is introduced is a natural extension of wahts being said. this is deeper than just looking for the word in the article. context is key. if you cannot find existing context, then you need to think about a) what type of leadin would make sense when generating a link to the target url, and b) what lead in can you add to the existing article to make it work."
            label="Copy"
          />
        </div>
        <p>again, a link insert should not feel random or out of left field or feel like theres no reason why its being linked to. a good link is one that instantly looks like it belongs. as in, the article is saying something, and the way the link is introduced is a natural extension of wahts being said. this is deeper than just looking for the word in the article. context is key. if you cannot find existing context, then you need to think about a) what type of leadin would make sense when generating a link to the target url, and b) what lead in can you add to the existing article to make it work.</p>
      </div>
    </div>

    <SavedField
      label="Second GPT Response"
      value={step.outputs.secondResponse || ''}
      placeholder="Paste GPT's response to first follow-up"
      onChange={(value) => onChange({ ...step.outputs, secondResponse: value })}
      isTextarea={true}
      height="h-24"
    />

    <div className="bg-yellow-50 p-4 rounded-md">
      <h4 className="font-semibold mb-2">Follow-up Prompt #2</h4>
      <p className="text-sm mb-2">Ask this final prompt:</p>
      <div className="bg-white p-3 rounded border border-yellow-200 text-xs font-mono overflow-x-auto relative">
        <div className="absolute top-2 right-2">
          <CopyButton 
            text={'what makes more sense to do it is take something from the article that is being linkeded to, reference it in the guest post and then link back to the article as the source using the anchor text. with those constraints, you may actually manage to do something actually useful and natural. note, if the anchor text doesnt match the same intent of the client url page title, its probably not viable. you are also allowed to create a while new paragraph if you aren\'t finding anything perfectly viable or add a new sentence at the beginning of a section or paragraph. do not settle for average. WHAT YOU MUST ABSOLUTELY NOT DO IS JUST ACT LIKE A "THROW IN SENTENCE IS OKAY". IF YOU ARE GOING TO CREATE A SENTENCE, THEN YOU WILL LIKELY NEED TO MODIFY THE SURROUNDED SENTENCES OR ENTIRE PARAGRAPH TO ACTUALLY JUSTIFY IT. YOU ARE TO THINK LIKE A WRITER. JUST ADDING RANDOM SENTENCES IS NOT WRITING - ITS BEING LAZY. IF YOU ARE ADDING A SENTENCE YOU ARE NOT FUCKING ALLOWED TO NOT EDIT OTHER THINGS WITHIN THE OUTPUT YOU PROVIDE. do not use em-dashes. IN YOUR EDIT, DO NOT DO SOMETHING LAME LIKE AS X EXPLAINS... THAT IS NOT WRITING. ANCHOR TEXT AS SOURCE IS A NATURAL WAY OF WRITING AND DOES NOT REQUIRE ADDITIONAL LEADIN LIKE SAYING AS PER XYZ, ESPECIALLY WHEN ITS A NOT A DATA POINT OR STUDY.'}
            label="Copy"
          />
        </div>
        <p>what makes more sense to do it is take something from the article that is being linkeded to, reference it in the guest post and then link back to the article as the source using the anchor text. with those constraints, you may actually manage to do something actually useful and natural. note, if the anchor text doesnt match the same intent of the client url page title, its probably not viable. you are also allowed to create a while new paragraph if you aren't finding anything perfectly viable or add a new sentence at the beginning of a section or paragraph. do not settle for average. WHAT YOU MUST ABSOLUTELY NOT DO IS JUST ACT LIKE A "THROW IN SENTENCE IS OKAY". IF YOU ARE GOING TO CREATE A SENTENCE, THEN YOU WILL LIKELY NEED TO MODIFY THE SURROUNDED SENTENCES OR ENTIRE PARAGRAPH TO ACTUALLY JUSTIFY IT. YOU ARE TO THINK LIKE A WRITER. JUST ADDING RANDOM SENTENCES IS NOT WRITING - ITS BEING LAZY. IF YOU ARE ADDING A SENTENCE YOU ARE NOT FUCKING ALLOWED TO NOT EDIT OTHER THINGS WITHIN THE OUTPUT YOU PROVIDE. do not use em-dashes. IN YOUR EDIT, DO NOT DO SOMETHING LAME LIKE AS X EXPLAINS... THAT IS NOT WRITING. ANCHOR TEXT AS SOURCE IS A NATURAL WAY OF WRITING AND DOES NOT REQUIRE ADDITIONAL LEADIN LIKE SAYING AS PER XYZ, ESPECIALLY WHEN ITS A NOT A DATA POINT OR STUDY.</p>
      </div>
    </div>

    <SavedField
      label="Final GPT Suggestion"
      value={step.outputs.finalSuggestion || ''}
      placeholder="Paste the final, refined suggestion"
      onChange={(value) => onChange({ ...step.outputs, finalSuggestion: value })}
      isTextarea={true}
      height="h-32"
    />

    <div>
      <label className="block text-sm font-medium mb-1">Client Link Added?</label>
      <select
        value={step.outputs.clientLinkAdded || ''}
        onChange={(e) => onChange({ ...step.outputs, clientLinkAdded: e.target.value })}
        className="w-full px-3 py-2 border rounded-md"
      >
        <option value="">Select status...</option>
        <option value="yes">Client link added to article</option>
        <option value="modified">Modified suggestion before adding</option>
        <option value="no">No viable placement found</option>
      </select>
    </div>

    <div className="bg-red-50 p-3 rounded-md">
      <p className="text-sm font-semibold text-red-700">
        Important: Remove any other links in the same sentence/paragraph where you place the client link
      </p>
    </div>
  </div>
);