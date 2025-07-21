export default function DebugRoutePage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug Route</h1>
      <p>If you can see this, new routes ARE being deployed.</p>
      <p>Build time: {new Date().toISOString()}</p>
      <ul>
        <li><a href="/bulk-qualification">Go to Bulk Qualification</a></li>
        <li><a href="/bulk-test">Go to Bulk Test</a></li>
        <li><a href="/test-deployment">Go to Test Deployment</a></li>
      </ul>
    </div>
  );
}