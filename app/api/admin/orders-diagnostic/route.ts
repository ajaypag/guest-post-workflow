import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return a monitoring script that can be injected
    const monitoringScript = `
      // Diagnostic monitoring script
      (function() {
        if (window.__DIAGNOSTIC_MODE__) return;
        window.__DIAGNOSTIC_MODE__ = true;
        
        const apiCalls = new Map();
        const logs = [];
        let renderCount = 0;
        
        // Monitor API calls
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const url = typeof args[0] === 'string' ? args[0] : args[0].url || args[0].toString();
          const timestamp = new Date().toISOString();
          
          // Track API call
          const count = apiCalls.get(url) || 0;
          apiCalls.set(url, count + 1);
          
          logs.push({
            timestamp,
            type: 'api-call',
            url,
            count: count + 1
          });
          
          console.log(\`[DIAGNOSTIC] API Call #\${count + 1} to: \${url}\`);
          
          // If called more than 5 times, it's likely an infinite loop
          if (count + 1 > 5) {
            console.error(\`[DIAGNOSTIC] POTENTIAL INFINITE LOOP DETECTED! \${url} called \${count + 1} times\`);
          }
          
          return originalFetch.apply(this, args);
        };
        
        // Monitor React renders
        let componentRenderCounts = new Map();
        
        // Hook into React DevTools if available
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
          
          hook.onCommitFiberRoot = function(id, root, priorityLevel) {
            renderCount++;
            console.log(\`[DIAGNOSTIC] React render #\${renderCount}\`);
            
            if (originalOnCommitFiberRoot) {
              originalOnCommitFiberRoot.apply(this, arguments);
            }
          };
        }
        
        // Report summary every 5 seconds
        setInterval(() => {
          console.group('[DIAGNOSTIC SUMMARY]');
          console.log('Total renders:', renderCount);
          console.log('API Calls:');
          apiCalls.forEach((count, url) => {
            console.log(\`  \${url}: \${count} calls\`);
          });
          console.groupEnd();
        }, 5000);
        
        // Expose diagnostic data globally
        window.__DIAGNOSTIC_DATA__ = {
          apiCalls,
          logs,
          renderCount: () => renderCount
        };
      })();
    `;

    return new NextResponse(monitoringScript, {
      headers: {
        'Content-Type': 'application/javascript',
      },
    });

  } catch (error: any) {
    console.error('Error in diagnostic endpoint:', error);
    return NextResponse.json({
      error: 'Failed to generate diagnostic script',
      details: error.message
    }, { status: 500 });
  }
}