export default function TestDeploymentPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Test Deployment Page</h1>
      <p>If you can see this, the deployment is working.</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  );
}