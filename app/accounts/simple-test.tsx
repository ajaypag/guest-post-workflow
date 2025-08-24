'use client';

// Simple test component to see if the route works
export default function SimpleAccountsTest() {
  console.log('🔍 SimpleAccountsTest - Component is rendering!');
  
  return (
    <div className="min-h-screen bg-red-100 p-8">
      <h1 className="text-4xl font-bold text-red-800">SIMPLE ACCOUNTS TEST PAGE</h1>
      <p className="text-xl text-red-600 mt-4">This is a test to see if /accounts route works</p>
      <div className="mt-8 p-4 bg-white rounded shadow">
        <h2 className="text-2xl font-bold">Debug Info</h2>
        <p>Route: /accounts</p>
        <p>File: app/accounts/simple-test.tsx</p>
        <p>Time: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}