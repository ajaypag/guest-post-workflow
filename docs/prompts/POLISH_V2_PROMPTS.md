# Polish V2 Prompts Overview

The Polish V2 feature uses a two-prompt loop pattern to balance brand voice with semantic clarity. Here are the exact prompts used:

## 1. Kickoff Prompt (First Section)

```
Okay, here's my article.

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

Start with the first section.
```

## 2. Proceed Prompt (Subsequent Sections)

```
Okay that is good. Now, proceed to the next section. Analyze how well it follows the brand guide and content writing and semantic SEO guide, then provide your refined version.

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

After outputting your polish analysis for the current section, check if that section ends with the exact text <!-- END_OF_ARTICLE -->. If the section you just polished contains this marker, output exactly: ===POLISH_COMPLETE===
```

## Key Features

1. **Structured Output**: Uses delimiter-based parsing for reliable extraction of strengths, weaknesses, and polished content

2. **Section-by-Section Processing**: Processes one section at a time, maintaining context throughout the conversation

3. **Brand Guide Alignment**: Primary focus on aligning with brand guide while maintaining semantic SEO principles

4. **Structure Preservation**: Explicitly instructed NOT to restructure content (e.g., converting paragraphs to bullet points)

5. **Automatic Completion Detection**: Uses an END_OF_ARTICLE marker to detect when all sections have been processed

6. **Streaming Support**: Real-time updates as each section is processed

## Technical Implementation

- Uses OpenAI Agents SDK with o3 model
- Single conversation thread maintained throughout
- Maximum of 40 sections to prevent infinite loops
- Session-based with version tracking
- SSE (Server-Sent Events) for real-time progress updates