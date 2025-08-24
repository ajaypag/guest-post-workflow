'use client';

export default function TestRoute() {
  console.log('🔍 TestRoute - Component is rendering!');
  
  return (
    <div className="min-h-screen bg-green-100 p-8">
      <h1 className="text-4xl font-bold text-green-800">TEST ROUTE WORKS!</h1>
      <p className="text-xl text-green-600 mt-4">This proves Next.js routing is working</p>
      <div className="mt-8 p-4 bg-white rounded shadow">
        <h2 className="text-2xl font-bold">Debug Info</h2>
        <p>Route: /test-route</p>
        <p>File: app/test-route/page.tsx</p>
        <p>Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}