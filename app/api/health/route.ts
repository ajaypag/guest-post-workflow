export async function GET() {
  const now = new Date().toISOString();
  
  return Response.json({
    status: 'ok',
    version: 'main-branch-v5',
    deployedAt: now,
    message: 'THIS IS THE NEW VERSION - V5 WITH CACHE BUST',
    branch: 'main',
    environment: process.env.NODE_ENV || 'development',
    timestamp: now,
    buildId: process.env.BUILD_ID || 'unknown'
  });
}