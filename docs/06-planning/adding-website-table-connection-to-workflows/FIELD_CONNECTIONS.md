# Field Connections: `step.outputs.domain`

## Direct Users of the Field

**Steps that read `domainSelectionStep.outputs.domain`:**

1. **KeywordResearchStepClean** - Uses for guest post site analysis
2. **KeywordResearchStep** - Legacy version
3. **TopicGenerationImproved** - Shows guest post site context  
4. **TopicGenerationStep** - Shows guest post site context
5. **TopicGenerationStepClean** - Shows guest post site context
6. **LinkOrchestrationStep** - Uses for link orchestration
7. **UrlSuggestionStep** - Uses for URL suggestions
8. **EmailTemplateStep** - Uses for email template generation
9. **LinkRequestsStep** - Uses for link request context
10. **PublisherPreApprovalStep** - Uses for pre-approval context
11. **PublicationOutreachStep** - Uses for outreach context
12. **PublicationVerificationStep** - Uses for verification context
13. **InternalLinksStep** - Uses for internal link analysis

## Backend Services

**Services that reference the domain:**

1. **taskService.ts** - Extracts guestPostSite for task processing
2. **workflowGenerationService.ts** - Template generation for domain-selection step
3. **AI Services** - Multiple services likely use this for context

## UI Display

**Components that show the domain:**

1. **WorkflowList** - Shows domain in workflow list view
2. **DomainSelectionStepClean** - Input field and validation
3. **DomainSelectionStep** - Legacy component

## Templates & Config

**Configuration references:**

1. **workflow-templates-v2.ts** - Step definition and ordering
2. **Demo components** - ArticleGenerationDemo, InteractiveWorkflowDemo

## Impact: 13 Steps + Backend Services + UI Components

**Total connections found: 18 files reference this field**