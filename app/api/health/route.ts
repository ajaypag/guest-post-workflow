export async function GET() {
  const now = new Date().toISOString();
  
  return Response.json({
    status: 'ok',
    version: 'main-branch-v4',
    deployedAt: now,
    message: 'THIS IS THE NEW VERSION',
    branch: 'main',
    environment: process.env.NODE_ENV || 'development',
    timestamp: now
  });
}