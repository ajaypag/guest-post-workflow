import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Read the orders/new page source
    const filePath = path.join(process.cwd(), 'app/orders/new/page.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    // Analyze useEffect hooks
    const useEffectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*{[\s\S]*?}\s*,\s*\[([\s\S]*?)\]\s*\)/g;
    const matches = [...content.matchAll(useEffectRegex)];
    
    const useEffects = matches.map((match, index) => {
      const fullMatch = match[0];
      const dependencies = match[1].trim();
      const startLine = content.substring(0, match.index).split('\n').length;
      
      // Extract the function body
      const bodyMatch = fullMatch.match(/=>\s*{([\s\S]*?)}\s*,\s*\[/);
      const body = bodyMatch ? bodyMatch[1].trim() : '';
      
      // Check for API calls
      const hasApiCalls = body.includes('fetch(') || body.includes('load');
      
      return {
        index,
        startLine,
        dependencies: dependencies.split(',').map(d => d.trim()).filter(Boolean),
        hasApiCalls,
        bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : '')
      };
    });

    // Analyze useCallback hooks
    const useCallbackRegex = /const\s+(\w+)\s*=\s*useCallback\s*\(\s*[\s\S]*?\s*,\s*\[([\s\S]*?)\]\s*\)/g;
    const callbackMatches = [...content.matchAll(useCallbackRegex)];
    
    const useCallbacks = callbackMatches.map((match) => {
      const functionName = match[1];
      const dependencies = match[2].trim();
      const startLine = content.substring(0, match.index).split('\n').length;
      
      return {
        functionName,
        startLine,
        dependencies: dependencies.split(',').map(d => d.trim()).filter(Boolean)
      };
    });

    // Look for potential circular dependencies
    const potentialIssues: string[] = [];
    
    // Check if any useEffect depends on functions that are recreated
    useEffects.forEach((effect, index) => {
      effect.dependencies.forEach(dep => {
        const callback = useCallbacks.find(cb => cb.functionName === dep);
        if (callback && callback.dependencies.length > 0) {
          potentialIssues.push(
            `useEffect at line ${effect.startLine} depends on '${dep}' which has dependencies: [${callback.dependencies.join(', ')}]. This could cause infinite re-renders.`
          );
        }
      });
      
      // Check for duplicate API calls
      if (effect.hasApiCalls && effect.dependencies.length > 2) {
        potentialIssues.push(
          `useEffect at line ${effect.startLine} makes API calls and has ${effect.dependencies.length} dependencies. Consider reducing dependencies to prevent repeated API calls.`
        );
      }
    });

    // Find all API endpoints being called
    const apiCallRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const apiEndpoints = [...content.matchAll(apiCallRegex)].map(match => match[1]);
    const uniqueEndpoints = [...new Set(apiEndpoints)];

    return NextResponse.json({
      analysis: {
        useEffects: useEffects.length,
        useCallbacks: useCallbacks.length,
        apiEndpoints: uniqueEndpoints,
        potentialIssues
      },
      details: {
        useEffects,
        useCallbacks
      }
    });

  } catch (error: any) {
    console.error('Error analyzing orders/new:', error);
    return NextResponse.json({
      error: 'Failed to analyze page',
      details: error.message
    }, { status: 500 });
  }
}