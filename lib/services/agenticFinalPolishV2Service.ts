import { Runner } from '@openai/agents';
import { OpenAIProvider } from '@openai/agents-openai';
import { polisherAgentV2 } from '@/lib/agents/finalPolisherV2';
import { db } from '@/lib/db/connection';
import { workflows, v2AgentSessions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// Using delimiter-based parsing for consistency

// Helper function to sanitize strings for PostgreSQL
function sanitizeForPostgres(str: string): string {
  if (!str) return str;
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

// Store active SSE connections for real-time updates
const activeStreams = new Map<string, any>();

export function addSSEConnection(sessionId: string, res: any) {
  activeStreams.set(sessionId, res);
}

export function removeSSEConnection(sessionId: string) {
  activeStreams.delete(sessionId);
}

function sseUpdate(sessionId: string, payload: any) {
  const stream = activeStreams.get(sessionId);
  if (!stream) return;
  try {
    stream.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('SSE push failed:', error);
    activeStreams.delete(sessionId);
  }
}

// The three prompts that mirror the ChatGPT tab workflow
const KICKOFF_PROMPT = `Okay, here's my article.

{ARTICLE}

Review one of my project files for my brand guide and the Semantic SEO writing tips. I want you to review my article section by section, starting with the first section. Gauge how well it follows the brand guide and semantic seo tips.

Output your analysis in this EXACT format:

===STRENGTHS_START===
strength 1
strength 2
(more strengths if applicable)
===STRENGTHS_END===

===WEAKNESSES_START===
weakness 1
weakness 2
(more weaknesses if applicable)
===WEAKNESSES_END===

===UPDATED_SECTION_START===
Your polished version of the section here - ready to copy-paste
===UPDATED_SECTION_END===

Important:
- Use EXACTLY these delimiters, don't modify them
- Each strength/weakness should be on its own line
- The updatedSection should preserve markdown formatting (headings, lists, bold, italics, etc.)

Focus of this exercise:
- Your primary goal is to gauge how well each section follows the brand guide and semantic SEO documentation
- Make targeted tweaks to bring the writing closer to our ideal standards
- Preserve the original structure - do NOT restructure paragraphs into bullet lists or vice versa
- Maintain the narrative flow while improving adherence to our guidelines

Start with the first section.`;

const PROCEED_PROMPT = `Okay that is good. Now, proceed to the next section. Analyze how well it follows the brand guide and content writing and semantic SEO guide, then provide your refined version.

Output your analysis in this EXACT format:

===STRENGTHS_START===
strength 1
strength 2
(more strengths if applicable)
===STRENGTHS_END===

===WEAKNESSES_START===
weakness 1
weakness 2
(more weaknesses if applicable)
===WEAKNESSES_END===

===UPDATED_SECTION_START===
Your polished version of the section here
===UPDATED_SECTION_END===

Make sure your updated section avoids words from the "words to not use" document. Don't use em-dashes.

Remember: The focus is on polishing for brand alignment, not restructuring. If the original uses paragraphs, keep paragraphs. If it uses bullet points, keep bullet points. Your improvements should enhance the existing structure, not replace it.

Important:
- Use EXACTLY these delimiters, don't modify them
- Each strength/weakness should be on its own line
- The updatedSection should preserve markdown formatting (headings, lists, bold, italics, etc.)

After outputting your polish analysis for the current section, check if that section ends with the exact text <!-- END_OF_ARTICLE -->. If the section you just polished contains this marker, output ONLY: ===POLISH_COMPLETE===

Do not provide any additional text, suggestions, or explanations after the ===POLISH_COMPLETE=== marker. This should be your final output.`;

export class AgenticFinalPolishV2Service {
  private openaiProvider: OpenAIProvider;
  
  constructor() {
    this.openaiProvider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async startSession(workflowId: string): Promise<string> {
    try {
      // Get the SEO-optimized article from workflow
      const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
      if (!workflow[0]?.content) throw new Error('Workflow not found');
      
      const workflowData = workflow[0].content as any;
      const contentAuditStep = workflowData.steps?.find((s: any) => s.id === 'content-audit');
      const articleDraftStep = workflowData.steps?.find((s: any) => s.id === 'article-draft');
      
      // Get SEO-optimized article or fall back to original
      const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
      const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
      const fullArticle = seoOptimizedArticle || originalArticle;
      
      if (!fullArticle) {
        throw new Error('No article found to polish. Complete Step 5 (Semantic SEO) first.');
      }

      // Get the next version number for this workflow
      const maxVersionResult = await db.select({
        maxVersion: sql<number>`COALESCE(MAX(${v2AgentSessions.version}), 0)`.as('maxVersion')
      })
      .from(v2AgentSessions)
      .where(eq(v2AgentSessions.workflowId, workflowId));
      
      const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;
      const sessionId = uuidv4();
      const now = new Date();
      
      // Create session in database
      await db.insert(v2AgentSessions).values({
        id: sessionId,
        workflowId,
        version: nextVersion,
        stepId: 'final-polish-v2',
        status: 'initializing',
        outline: sanitizeForPostgres(fullArticle), // Store the article to polish
        totalSections: 0,
        completedSections: 0,
        sessionMetadata: {
          startedAt: now.toISOString(),
          version: nextVersion,
          model: 'o3-2025-04-16',
          usingSeoDraft: !!seoOptimizedArticle
        },
        startedAt: now,
        createdAt: now,
        updatedAt: now
      });

      console.log(`🎨 V2 Polish Session ${sessionId} created for workflow ${workflowId}, version ${nextVersion}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to start V2 polish session:', error);
      throw new Error('Failed to initialize V2 polish session');
    }
  }

  async performPolish(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      const fullArticle = session.outline; // Article stored in outline field
      if (!fullArticle) throw new Error('No article to polish in session');

      await this.updateSession(sessionId, { status: 'polishing' });
      sseUpdate(sessionId, { type: 'status', status: 'polishing', message: 'Starting brand alignment polish...' });
      
      // Add end marker to article to prevent infinite loops
      const END_MARKER = '<!-- END_OF_ARTICLE -->';
      const articleWithEndMarker = fullArticle + '\n\n' + END_MARKER;

      // Create a SINGLE conversation thread with the polisher
      const polisherRunner = new Runner({
        modelProvider: this.openaiProvider,
        tracingDisabled: true
      });

      // Initialize conversation history
      let conversationHistory: any[] = [
        { 
          role: 'user', 
          content: KICKOFF_PROMPT.replace('{ARTICLE}', articleWithEndMarker)
        }
      ];

      // Collect all polish content as structured data
      let polishedSections: Array<{
        strengths: string[];
        weaknesses: string[];
        updatedSection: string;
      }> = [];
      let sectionCount = 0;
      const maxSections = 40; // Safety limit to prevent infinite loops
      let continuePolishing = true; // Declare here before using in streaming

      // Phase 1: Send kickoff prompt
      console.log(`📝 Sending kickoff prompt for first section...`);
      sseUpdate(sessionId, { type: 'phase', phase: 'first_section', message: 'Analyzing first section for brand alignment...' });

      let kickoffResult = await polisherRunner.run(polisherAgentV2, conversationHistory, {
        stream: true,
        maxTurns: 1
      });

      let kickoffResponse = '';
      
      for await (const event of kickoffResult.toStream()) {
        if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
          kickoffResponse += event.data.delta || '';
          sseUpdate(sessionId, { type: 'text', content: event.data.delta });
          
          // Check for END_MARKER in stream
          if (event.data.delta && event.data.delta.includes(END_MARKER)) {
            console.log('🎯 END_MARKER detected in first section stream');
            continuePolishing = false;
          }
        }
      }

      await kickoffResult.finalOutput;
      conversationHistory = (kickoffResult as any).history;
      
      if (!conversationHistory || conversationHistory.length === 0) {
        throw new Error('No history returned from SDK');
      }

      // Extract and parse the delimiter response
      const firstSectionResponse = this.extractAssistantResponse(conversationHistory);
      const firstSectionData = this.parsePolishResponse(firstSectionResponse);
      
      // Log parsing method and confidence if available
      if (firstSectionData.method && firstSectionData.confidence !== undefined) {
        console.log(`📊 Parsing method: ${firstSectionData.method}, confidence: ${firstSectionData.confidence.toFixed(2)}`);
      }
      
      // FIRST: Process any parsed section content (even if it comes with completion marker)
      if (firstSectionData.parsed) {
        polishedSections.push(firstSectionData.parsed);
        console.log(`✅ First section polished`);
        sectionCount = 1;
        
        await this.updateSession(sessionId, { completedSections: sectionCount });
        sseUpdate(sessionId, { 
          type: 'section_completed', 
          sectionNumber: sectionCount, 
          content: firstSectionData.parsed,
          message: 'First section polished'
        });
      }
      
      // THEN: Check if we're already done (after processing any content)
      if (firstSectionData.status === 'complete') {
        console.log('✅ Article complete - ' + (sectionCount > 0 ? 'only one section to polish' : 'no sections to polish'));
        continuePolishing = false;
      } else if (!firstSectionData.parsed) {
        // Only throw if we didn't get section content AND it's not a completion marker
        throw new Error('Failed to parse first section response');
      }

      // Phase 2: Loop through remaining sections with single prompt pattern
      // continuePolishing already declared above
      
      while (continuePolishing && sectionCount < maxSections) {
        // Check if session has been cancelled
        const currentSession = await this.getSession(sessionId);
        if (currentSession?.status === 'cancelled') {
          console.log('🛑 Session cancelled by user');
          break;
        }
        
        // Deduplicate messages before each run to prevent duplicate ID errors
        // This handles both msg_* and rs_* (reasoning) items
        const seen = new Set<string>();
        const deduplicatedHistory: any[] = [];
        const duplicateIds: string[] = [];
        
        for (const message of conversationHistory) {
          // Skip null/undefined messages
          if (!message) {
            console.log(`⚠️ Skipping null/undefined message`);
            continue;
          }
          
          const id = (message as any).id;
          
          // If no ID, it's safe to include (likely a user message)
          if (!id) {
            deduplicatedHistory.push(message);
            continue;
          }
          
          // Skip if we've already seen this ID
          if (seen.has(id)) {
            duplicateIds.push(id);
            console.log(`⚠️ Filtering duplicate message with id: ${id}, role: ${message.role}`);
            continue;
          }
          
          seen.add(id);
          deduplicatedHistory.push(message);
        }
        
        conversationHistory = deduplicatedHistory;
        console.log(`📊 Deduplicated message count: ${conversationHistory.length}, removed ${duplicateIds.length} duplicates`);
        
        if (duplicateIds.length > 0) {
          console.log(`🔍 Duplicate IDs found: ${duplicateIds.join(', ')}`);
        }
        
        // Step 1: Proceed to next section
        console.log(`📝 Processing section ${sectionCount + 1}...`);
        sseUpdate(sessionId, { 
          type: 'phase', 
          phase: 'processing', 
          message: `Polishing section ${sectionCount + 1}...` 
        });

        conversationHistory.push({ role: 'user', content: PROCEED_PROMPT });

        let proceedResult = await polisherRunner.run(polisherAgentV2, conversationHistory, {
          stream: true,
          maxTurns: 1
        });

        let proceedResponse = '';
        for await (const event of proceedResult.toStream()) {
          if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
            proceedResponse += event.data.delta || '';
            sseUpdate(sessionId, { type: 'text', content: event.data.delta });
            
            // Check for END_MARKER in stream
            if (event.data.delta && event.data.delta.includes(END_MARKER)) {
              console.log('🎯 END_MARKER detected in proceed stream');
              continuePolishing = false;
            }
          }
        }

        await proceedResult.finalOutput;
        conversationHistory = (proceedResult as any).history;

        const sectionResponse = this.extractAssistantResponse(conversationHistory);
        const sectionData = this.parsePolishResponse(sectionResponse);
        
        // Log parsing method and confidence if available
        if (sectionData.method && sectionData.confidence !== undefined) {
          console.log(`📊 Parsing method: ${sectionData.method}, confidence: ${sectionData.confidence.toFixed(2)}`);
        }
        
        // FIRST: Process any parsed section content (including last section with completion marker)
        if (sectionData.parsed) {
          polishedSections.push(sectionData.parsed);
          sectionCount++;
          
          await this.updateSession(sessionId, { completedSections: sectionCount });
          sseUpdate(sessionId, { 
            type: 'section_completed', 
            sectionNumber: sectionCount, 
            content: sectionData.parsed,
            message: `Section ${sectionCount} polished`
          });
        } else if (!sectionData.status) {
          // Only log error if we didn't get section content AND it's not a completion marker
          console.error('Failed to parse section response:', sectionResponse);
          // Continue anyway to avoid getting stuck
          sectionCount++;
        }
        
        // THEN: Check if we've reached the end (after processing any content)
        if (sectionData.status === 'complete') {
          console.log(`✅ Polish complete - AI indicated no more sections after ${sectionCount} sections`);
          continuePolishing = false;
          break;
        }

        // Safety check for section limit
        if (sectionCount >= maxSections - 5) {
          console.log(`⚠️ Approaching section limit (${sectionCount}/${maxSections})`);
        }
        
        // Hard stop at max sections
        if (sectionCount >= maxSections) {
          console.log(`🛑 Maximum section limit reached (${sectionCount}/${maxSections})`);
          continuePolishing = false;
        }
      }

      // Assemble the final polished article from delimiter-parsed data
      console.log('🔍 Assembling polished article from structured data...');
      const finalPolishedArticle = polishedSections
        .map(section => section.updatedSection)
        .join('\n\n');
      
      const wordCount = finalPolishedArticle.split(/\s+/).filter(Boolean).length;
      console.log(`📊 Collected polish data for ${polishedSections.length} sections`);

      console.log(`✅ Polish completed: ${wordCount} words, ${sectionCount} sections`);

      // Save final polished article
      await this.savePolishedArticleToWorkflow(session.workflowId, finalPolishedArticle);
      
      await this.updateSession(sessionId, {
        status: 'completed',
        finalArticle: sanitizeForPostgres(finalPolishedArticle),
        totalWordCount: wordCount,
        totalSections: sectionCount,
        completedAt: new Date(),
        sessionMetadata: {
          ...(session.sessionMetadata as any),
          completedAt: new Date().toISOString(),
          polishedSections: polishedSections, // Store structured polish data
          totalSectionsPolished: polishedSections.length
        }
      });
      
      sseUpdate(sessionId, {
        type: 'completed',
        polishedSections: polishedSections, // Structured polish data
        finalPolishedArticle: finalPolishedArticle, // Clean article only
        wordCount: wordCount,
        totalSections: sectionCount,
        message: 'Polish completed successfully!'
      });

    } catch (error: any) {
      console.error('❌ V2 polish failed:', error);
      await this.updateSession(sessionId, {
        status: 'failed',
        errorMessage: error.message
      });
      sseUpdate(sessionId, { type: 'error', error: error.message });
      throw error;
    }
  }

  private extractAssistantResponse(conversationHistory: any[]): string {
    const assistantMessages = conversationHistory.filter((item: any) => 
      item.role === 'assistant' && item.type === 'message'
    );
    
    if (assistantMessages.length === 0) return '';
    
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    
    if (typeof lastAssistant.content === 'string') {
      return lastAssistant.content;
    } else if (Array.isArray(lastAssistant.content)) {
      return lastAssistant.content
        .filter((item: any) => item.type === 'text' || item.type === 'output_text')
        .map((item: any) => item.text || '')
        .join('');
    }
    
    return '';
  }

  private parsePolishResponse(response: string): {
    status?: 'complete';
    parsed?: {
      strengths: string[];
      weaknesses: string[];
      updatedSection: string;
    };
    confidence?: number;
    method?: 'exact' | 'fuzzy' | 'structure' | 'fallback';
  } {
    try {
      const result: any = {};
      
      // FIRST: Check for completion marker and strip everything after it
      const polishCompleteIndex = response.indexOf('===POLISH_COMPLETE===');
      if (polishCompleteIndex !== -1) {
        result.status = 'complete';
        console.log('🏁 Found POLISH_COMPLETE marker, stripping text after it');
        
        // Strip everything after the marker for parsing
        response = response.substring(0, polishCompleteIndex).trim();
        
        // If there's no content before the marker, just return complete status
        if (!response) {
          console.log('🏁 POLISH_COMPLETE marker found with no content to parse');
          return result;
        }
      }
      
      // Method 1: Try exact delimiter matching first (highest confidence)
      const exactResult = this.tryExactDelimiterParsing(response);
      if (exactResult.parsed) {
        return { ...exactResult, confidence: 1.0, method: 'exact', ...(result.status && { status: result.status }) };
      }
      
      // Method 2: Try fuzzy delimiter matching (medium-high confidence)
      const fuzzyResult = this.tryFuzzyDelimiterParsing(response);
      if (fuzzyResult.parsed && fuzzyResult.confidence > 0.7) {
        return { ...fuzzyResult, method: 'fuzzy', ...(result.status && { status: result.status }) };
      }
      
      // Method 3: Try structure-based parsing (medium confidence)
      const structureResult = this.tryStructureBasedParsing(response);
      if (structureResult.parsed && structureResult.confidence > 0.5) {
        return { ...structureResult, method: 'structure', ...(result.status && { status: result.status }) };
      }
      
      // Method 4: Fallback parsing (low confidence)
      const fallbackResult = this.tryFallbackParsing(response);
      if (fallbackResult.parsed) {
        console.log('⚠️ Using fallback parsing method');
        return { ...fallbackResult, method: 'fallback', ...(result.status && { status: result.status }) };
      }
      
      // Additional check for completion marker (in case it wasn't caught above)
      if (response.includes('POLISH_COMPLETE')) {
        result.status = 'complete';
        console.log('🏁 Found POLISH_COMPLETE marker variant');
      }
      
      return result;
    } catch (error) {
      console.error('Failed to parse polish response:', error);
      return {};
    }
  }
  
  private tryExactDelimiterParsing(response: string): any {
    // Original exact matching with flexible equals signs
    const strengthsMatch = response.match(/={1,3}STRENGTHS_START={0,3}\s*([\s\S]*?)\s*={1,3}STRENGTHS_END={0,3}/);
    const weaknessesMatch = response.match(/={1,3}WEAKNESSES_START={0,3}\s*([\s\S]*?)\s*={1,3}WEAKNESSES_END={0,3}/);
    const updatedMatch = response.match(/={1,3}UPDATED_SECTION_START={0,3}\s*([\s\S]*?)\s*={1,3}UPDATED_SECTION_END={0,3}/);
    
    if (strengthsMatch && weaknessesMatch && updatedMatch) {
      const strengths = this.parseListContent(strengthsMatch[1], 'strengths');
      const weaknesses = this.parseListContent(weaknessesMatch[1], 'weaknesses');
      const updatedSection = updatedMatch[1].trim();
      
      console.log(`✅ Exact delimiter parsing successful`);
      return {
        parsed: { strengths, weaknesses, updatedSection },
        confidence: 1.0
      };
    }
    
    return {};
  }
  
  private tryFuzzyDelimiterParsing(response: string): any {
    const lines = response.split('\n');
    const sections: any = {
      strengths: { start: -1, end: -1, content: [] },
      weaknesses: { start: -1, end: -1, content: [] },
      updated: { start: -1, end: -1, content: '' }
    };
    
    // Find fuzzy matches for delimiters
    lines.forEach((line, index) => {
      const normalized = line.toLowerCase().replace(/[^a-z]/g, '');
      
      // Fuzzy matching for section markers
      if (this.isSimilarTo(normalized, 'strengthsstart') || this.isSimilarTo(normalized, 'strengthstart')) {
        sections.strengths.start = index;
      } else if (this.isSimilarTo(normalized, 'strengthsend') || this.isSimilarTo(normalized, 'strengthend')) {
        sections.strengths.end = index;
      } else if (this.isSimilarTo(normalized, 'weaknessesstart') || this.isSimilarTo(normalized, 'weaknessstart')) {
        sections.weaknesses.start = index;
      } else if (this.isSimilarTo(normalized, 'weaknessesend') || this.isSimilarTo(normalized, 'weaknessend')) {
        sections.weaknesses.end = index;
      } else if (this.isSimilarTo(normalized, 'updatedsectionstart') || normalized.includes('updatedsection')) {
        sections.updated.start = index;
      } else if (this.isSimilarTo(normalized, 'updatedsectionend')) {
        sections.updated.end = index;
      }
    });
    
    // Extract content between markers
    let confidence = 0;
    const parsed: any = {};
    
    // Extract strengths
    if (sections.strengths.start >= 0 && sections.strengths.end > sections.strengths.start) {
      const content = lines.slice(sections.strengths.start + 1, sections.strengths.end);
      parsed.strengths = this.parseListContent(content.join('\n'), 'strengths');
      confidence += 0.33;
    }
    
    // Extract weaknesses
    if (sections.weaknesses.start >= 0 && sections.weaknesses.end > sections.weaknesses.start) {
      const content = lines.slice(sections.weaknesses.start + 1, sections.weaknesses.end);
      parsed.weaknesses = this.parseListContent(content.join('\n'), 'weaknesses');
      confidence += 0.33;
    }
    
    // Extract updated section
    if (sections.updated.start >= 0) {
      // If no end marker, take everything until next section or end
      const endIndex = sections.updated.end > 0 ? sections.updated.end : 
                       this.findNextSectionStart(lines, sections.updated.start);
      const content = lines.slice(sections.updated.start + 1, endIndex);
      parsed.updatedSection = content.join('\n').trim();
      confidence += 0.34;
    }
    
    if (confidence > 0.5) {
      console.log(`🔍 Fuzzy delimiter parsing with confidence ${confidence.toFixed(2)}`);
      return { parsed, confidence };
    }
    
    return {};
  }
  
  private tryStructureBasedParsing(response: string): any {
    // Split by lines that look like delimiters (3+ equals or similar)
    const chunks = response.split(/\n[=\-_]{3,}.*[=\-_]{0,}\n/);
    
    if (chunks.length < 3) {
      return {};
    }
    
    const parsed: any = {};
    let confidence = 0;
    
    // Analyze each chunk to determine what it contains
    chunks.forEach((chunk, index) => {
      const contentType = this.identifyContentType(chunk);
      
      if (contentType === 'strengths' && !parsed.strengths) {
        parsed.strengths = this.parseListContent(chunk, 'strengths');
        confidence += 0.3;
      } else if (contentType === 'weaknesses' && !parsed.weaknesses) {
        parsed.weaknesses = this.parseListContent(chunk, 'weaknesses');
        confidence += 0.3;
      } else if (contentType === 'updated' && !parsed.updatedSection) {
        parsed.updatedSection = chunk.trim();
        confidence += 0.4;
      }
    });
    
    if (confidence > 0.5) {
      console.log(`📊 Structure-based parsing with confidence ${confidence.toFixed(2)}`);
      return { parsed, confidence };
    }
    
    return {};
  }
  
  private tryFallbackParsing(response: string): any {
    // Last resort: assume order and split by empty lines or obvious transitions
    const sections = response.split(/\n\n+/);
    
    if (sections.length < 3) {
      return {};
    }
    
    // Take first non-empty sections
    const nonEmptySections = sections.filter(s => s.trim().length > 50);
    
    if (nonEmptySections.length >= 3) {
      const parsed = {
        strengths: this.parseListContent(nonEmptySections[0], 'strengths'),
        weaknesses: this.parseListContent(nonEmptySections[1], 'weaknesses'),
        updatedSection: nonEmptySections[2].trim()
      };
      
      // Validate that we got reasonable content
      if (parsed.strengths.length > 0 && parsed.weaknesses.length > 0 && 
          parsed.updatedSection.length > 100) {
        console.log(`🔧 Fallback parsing extracted content`);
        return { parsed, confidence: 0.3 };
      }
    }
    
    return {};
  }
  
  private isSimilarTo(str1: string, str2: string): boolean {
    // Simple similarity check - could be replaced with Levenshtein distance
    if (str1 === str2) return true;
    
    // Check if one contains the other
    if (str1.includes(str2) || str2.includes(str1)) return true;
    
    // Check if they're very close in length and share most characters
    if (Math.abs(str1.length - str2.length) <= 2) {
      const commonChars = str1.split('').filter(char => str2.includes(char)).length;
      return commonChars / Math.max(str1.length, str2.length) > 0.8;
    }
    
    return false;
  }
  
  private identifyContentType(text: string): 'strengths' | 'weaknesses' | 'updated' | 'unknown' {
    const trimmed = text.trim();
    
    // Check for markdown headers (likely updated section)
    if (trimmed.match(/^#{1,3}\s/m)) {
      return 'updated';
    }
    
    // Check line patterns
    const lines = trimmed.split('\n').filter(line => line.trim());
    if (lines.length === 0) return 'unknown';
    
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    
    // Short lines suggest lists (strengths/weaknesses)
    if (avgLineLength < 100 && lines.length >= 2) {
      // Look for positive vs negative language
      const content = trimmed.toLowerCase();
      const positiveWords = (content.match(/good|strong|effective|clear|well|excellent|solid/g) || []).length;
      const negativeWords = (content.match(/lacks?|missing|exceeds?|should|could|needs?|weak|poor/g) || []).length;
      
      if (positiveWords > negativeWords * 2) return 'strengths';
      if (negativeWords > positiveWords) return 'weaknesses';
    }
    
    // Longer content is likely the updated section
    if (trimmed.length > 500) return 'updated';
    
    return 'unknown';
  }
  
  private parseListContent(content: string, type: 'strengths' | 'weaknesses'): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Remove empty lines and template instructions
        if (!line || line.length < 3) return false;
        if (line.includes(`(more ${type}`)) return false;
        if (line.match(/^[=\-_]+$/)) return false; // Remove delimiter lines
        return true;
      });
  }
  
  private findNextSectionStart(lines: string[], currentIndex: number): number {
    // Find the next line that looks like a section delimiter
    for (let i = currentIndex + 1; i < lines.length; i++) {
      const normalized = lines[i].toLowerCase().replace(/[^a-z]/g, '');
      if (normalized.includes('start') || normalized.includes('end') || 
          lines[i].match(/^[=\-_]{3,}/)) {
        return i;
      }
    }
    return lines.length;
  }

  private async savePolishedArticleToWorkflow(workflowId: string, polishedArticle: string): Promise<void> {
    const workflow = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    if (workflow[0]?.content) {
      const workflowData = workflow[0].content as any;
      const polishStep = workflowData.steps?.find((step: any) => step.id === 'final-polish');
      
      if (polishStep) {
        polishStep.outputs = {
          ...polishStep.outputs,
          finalArticle: polishedArticle,
          polishProgress: '100',
          tab3Created: 'yes',
          agentV2Generated: true,
          generatedAt: new Date().toISOString()
        };

        await db.update(workflows)
          .set({
            content: workflowData,
            updatedAt: new Date()
          })
          .where(eq(workflows.id, workflowId));
      }
    }
  }

  private async getSession(sessionId: string) {
    const sessions = await db.select().from(v2AgentSessions).where(eq(v2AgentSessions.id, sessionId)).limit(1);
    return sessions[0] || null;
  }

  private async updateSession(sessionId: string, updates: Partial<any>) {
    await db.update(v2AgentSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(v2AgentSessions.id, sessionId));
  }

  async getSessionProgress(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    return {
      session,
      progress: {
        status: session.status,
        completedSections: session.completedSections || 0,
        totalSections: session.totalSections || 0,
        errorMessage: session.errorMessage
      }
    };
  }
  
  async cancelSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'cancelled',
      errorMessage: 'Cancelled by user'
    });
    
    // Send cancellation notice via SSE
    sseUpdate(sessionId, {
      type: 'cancelled',
      message: 'Polish operation cancelled by user'
    });
    
    // Clean up SSE connection
    removeSSEConnection(sessionId);
    
    console.log(`🛑 Polish session ${sessionId} cancelled by user`);
  }
}

export const agenticFinalPolishV2Service = new AgenticFinalPolishV2Service();