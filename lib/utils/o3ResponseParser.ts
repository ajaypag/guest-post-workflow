/**
 * Standardized O3 response extraction utility
 * Handles the complex response structure from O3 model
 */

export function extractO3Output(result: any): any {
  // Save for debugging if needed
  const debugFile = `/tmp/o3_response_${Date.now()}.json`;
  try {
    require('fs').writeFileSync(debugFile, JSON.stringify(result, null, 2));
    console.log(`📊 O3 response saved to: ${debugFile}`);
  } catch (e) {
    // Ignore file write errors
  }

  let output: any = null;

  // PRIORITY 1: Check state._currentStep.output (most reliable)
  if (result?.state?._currentStep?.output) {
    const stepOutput = result.state._currentStep.output;
    if (typeof stepOutput === 'string') {
      try {
        output = JSON.parse(stepOutput);
        console.log(`✅ Parsed O3 response from result.state._currentStep.output`);
        if (output?.domain) return output;
      } catch (e) {
        console.error(`Failed to parse _currentStep.output as JSON`);
      }
    } else if (typeof stepOutput === 'object' && stepOutput?.domain) {
      console.log(`✅ Got O3 response from _currentStep.output object`);
      return stepOutput;
    }
  }

  // PRIORITY 2: Check state.currentStep.output (alternative naming)
  if (!output && result?.state?.currentStep?.output) {
    const stepOutput = result.state.currentStep.output;
    if (typeof stepOutput === 'string') {
      try {
        output = JSON.parse(stepOutput);
        console.log(`✅ Parsed O3 response from result.state.currentStep.output`);
        if (output?.domain) return output;
      } catch (e) {
        console.error(`Failed to parse currentStep.output as JSON`);
      }
    } else if (typeof stepOutput === 'object' && stepOutput?.domain) {
      console.log(`✅ Got O3 response from currentStep.output object`);
      return stepOutput;
    }
  }

  // PRIORITY 3: Check direct output (if it's an object with domain)
  if (!output && result?.output) {
    if (typeof result.output === 'string') {
      try {
        output = JSON.parse(result.output);
        console.log(`✅ Parsed O3 response from result.output string`);
        if (output?.domain) return output;
      } catch (e) {
        console.error(`Failed to parse result.output as JSON`);
      }
    } else if (typeof result.output === 'object' && !Array.isArray(result.output)) {
      if (Object.keys(result.output).length > 0 && result.output.domain) {
        console.log(`✅ Got O3 response from result.output object`);
        return result.output;
      }
    }
  }

  // PRIORITY 4: Check modelResponses (fallback for complex structures)
  const modelResponses = result?.state?._modelResponses || result?.state?.modelResponses;
  if (!output && modelResponses?.length > 0) {
    const modelResponse = modelResponses[0];
    
    if (modelResponse?.output) {
      if (typeof modelResponse.output === 'string') {
        try {
          output = JSON.parse(modelResponse.output);
          console.log(`✅ Parsed O3 response from modelResponse.output string`);
          if (output?.domain) return output;
        } catch (e) {
          console.error(`Failed to parse modelResponse.output as JSON`);
        }
      } else if (typeof modelResponse.output === 'object' && modelResponse.output.domain) {
        console.log(`✅ Got O3 response from modelResponse.output object`);
        return modelResponse.output;
      }
    }

    // Also check output_text field
    if (!output && modelResponse?.output_text) {
      try {
        output = JSON.parse(modelResponse.output_text);
        console.log(`✅ Parsed O3 response from modelResponse.output_text`);
        if (output?.domain) return output;
      } catch (e) {
        console.error(`Failed to parse modelResponse.output_text as JSON`);
      }
    }
  }

  // Handle array format (if output is an array, check first element)
  if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0];
    if (firstItem && typeof firstItem === 'object' && firstItem.domain) {
      console.log(`✅ Found valid analysis in first array item`);
      return firstItem;
    }
  }

  // If we still don't have output, throw error
  if (!output || !output.domain) {
    console.error(`❌ Could not extract valid O3 output. Check ${debugFile} for full response`);
    throw new Error(`Failed to extract O3 response - no valid output with domain property found`);
  }

  return output;
}

/**
 * Validate O3 analysis output
 */
export function validateO3Analysis(analysis: any, domain: string): boolean {
  if (!analysis) {
    console.error(`❌ No analysis data for ${domain}`);
    return false;
  }

  if (!analysis.domain) {
    console.error(`❌ Analysis missing domain property for ${domain}`);
    return false;
  }

  if (!analysis.niches || !Array.isArray(analysis.niches) || analysis.niches.length === 0) {
    console.error(`❌ Analysis missing or empty niches array for ${domain}`);
    return false;
  }

  if (!analysis.categories || !Array.isArray(analysis.categories) || analysis.categories.length === 0) {
    console.error(`❌ Analysis missing or empty categories array for ${domain}`);
    return false;
  }

  if (!analysis.websiteTypes || !Array.isArray(analysis.websiteTypes) || analysis.websiteTypes.length === 0) {
    console.error(`❌ Analysis missing or empty websiteTypes array for ${domain}`);
    return false;
  }

  return true;
}