import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { responseData } = await request.json();
    
    if (!responseData) {
      return NextResponse.json({
        error: 'No response data provided'
      }, { status: 400 });
    }

    // Analyze the structure
    const analysis = {
      dataType: typeof responseData,
      isArray: Array.isArray(responseData),
      arrayLength: Array.isArray(responseData) ? responseData.length : null,
      structure: {} as any,
      textLocations: [] as string[],
      extractedTexts: [] as any[],
      recommendedParser: '',
      parsingSteps: [] as string[]
    };

    if (Array.isArray(responseData)) {
      // Analyze array structure
      analysis.structure.hasAssistantMessage = false;
      analysis.structure.assistantMessageIndex = -1;
      
      responseData.forEach((item, index) => {
        if (item.role === 'assistant') {
          analysis.structure.hasAssistantMessage = true;
          analysis.structure.assistantMessageIndex = index;
          
          // Analyze assistant message content
          if (item.content) {
            analysis.structure.contentType = typeof item.content;
            analysis.structure.contentIsArray = Array.isArray(item.content);
            
            if (Array.isArray(item.content)) {
              analysis.structure.contentArrayLength = item.content.length;
              analysis.structure.contentItems = [];
              
              item.content.forEach((contentItem: any, contentIndex: number) => {
                const itemInfo = {
                  index: contentIndex,
                  type: contentItem.type || 'unknown',
                  hasText: !!contentItem.text,
                  textLength: contentItem.text ? contentItem.text.length : 0,
                  textPreview: contentItem.text ? contentItem.text.substring(0, 100) + '...' : null
                };
                
                analysis.structure.contentItems.push(itemInfo);
                
                // Track text locations
                if (contentItem.text) {
                  const location = `responseData[${index}].content[${contentIndex}].text`;
                  analysis.textLocations.push(location);
                  analysis.extractedTexts.push({
                    location,
                    type: contentItem.type,
                    textLength: contentItem.text.length,
                    preview: contentItem.text.substring(0, 200) + '...'
                  });
                }
              });
            } else if (typeof item.content === 'string') {
              analysis.textLocations.push(`responseData[${index}].content`);
              analysis.extractedTexts.push({
                location: `responseData[${index}].content`,
                type: 'string',
                textLength: item.content.length,
                preview: item.content.substring(0, 200) + '...'
              });
            }
          }
        }
        
        // Also check for other text locations
        if (item.type === 'text' && item.text) {
          analysis.textLocations.push(`responseData[${index}].text`);
        }
      });
    } else if (typeof responseData === 'object') {
      // Analyze object structure
      analysis.structure.keys = Object.keys(responseData);
      
      // Look for common text properties
      const textProps = ['text', 'content', 'output', 'output_text', 'message', 'response'];
      textProps.forEach(prop => {
        if (responseData[prop]) {
          analysis.textLocations.push(`responseData.${prop}`);
          analysis.extractedTexts.push({
            location: `responseData.${prop}`,
            type: typeof responseData[prop],
            textLength: typeof responseData[prop] === 'string' ? responseData[prop].length : JSON.stringify(responseData[prop]).length,
            preview: typeof responseData[prop] === 'string' 
              ? responseData[prop].substring(0, 200) + '...'
              : JSON.stringify(responseData[prop]).substring(0, 200) + '...'
          });
        }
      });
    } else if (typeof responseData === 'string') {
      analysis.textLocations.push('responseData');
      analysis.extractedTexts.push({
        location: 'responseData',
        type: 'string',
        textLength: responseData.length,
        preview: responseData.substring(0, 200) + '...'
      });
    }

    // Determine recommended parser
    if (analysis.structure.hasAssistantMessage && analysis.structure.contentIsArray) {
      analysis.recommendedParser = 'array_assistant_content';
      analysis.parsingSteps = [
        '1. Find the assistant message in the array',
        '2. Access the content array within the assistant message',
        '3. Filter content items for type !== "reasoning" and type !== "web_search_call"',
        '4. Extract text from the remaining items',
        '5. The last text item usually contains the complete outline'
      ];
    } else if (analysis.isArray) {
      analysis.recommendedParser = 'array_simple';
      analysis.parsingSteps = [
        '1. Look for items with role === "assistant"',
        '2. Extract content property',
        '3. Use the content as the outline'
      ];
    } else if (analysis.dataType === 'string') {
      analysis.recommendedParser = 'direct_string';
      analysis.parsingSteps = [
        '1. Use the response directly as the outline'
      ];
    } else {
      analysis.recommendedParser = 'object_properties';
      analysis.parsingSteps = [
        '1. Check for text/content/output properties',
        '2. Use the first available property',
        '3. If none found, stringify the entire object'
      ];
    }

    // Generate sample parsing code
    let sampleCode = '';
    if (analysis.recommendedParser === 'array_assistant_content') {
      sampleCode = `// Parse o3-deep-research response
const assistantMsg = response.find(msg => msg.role === 'assistant');
if (assistantMsg && Array.isArray(assistantMsg.content)) {
  const textItems = assistantMsg.content
    .filter(item => 
      typeof item === 'string' || 
      (item.type !== 'reasoning' && item.type !== 'web_search_call')
    )
    .map(item => typeof item === 'string' ? item : item.text || '')
    .filter(text => text.length > 0);
  
  // Use the last text item (usually complete outline)
  const outline = textItems[textItems.length - 1] || '';
}`;
    }

    return NextResponse.json({
      success: true,
      analysis,
      sampleCode,
      summary: {
        totalTextLocations: analysis.textLocations.length,
        likelyOutlineLocation: analysis.textLocations[analysis.textLocations.length - 1] || 'Not found',
        recommendedParser: analysis.recommendedParser
      }
    });

  } catch (error: any) {
    console.error('Error analyzing response:', error);
    return NextResponse.json({
      error: 'Failed to analyze response',
      details: error.message
    }, { status: 500 });
  }
}