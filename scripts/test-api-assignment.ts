import fetch from 'node-fetch';

async function testApiAssignment() {
  const orderId = 'a3ca24b7-9a92-4c00-952e-bb71606af8b9';
  const clientId = 'cb6bfaa5-b9fd-44e1-9fb9-b7ff53d953ce'; // Correct client ID
  const projectId = 'f77dfdfb-0874-42e7-b07e-cd7fe642a2b8'; // Bulk analysis project
  
  console.log('\n=== TESTING API ASSIGNMENT ===\n');
  
  // First, get available domains and line items
  console.log('1. Fetching available domains and unassigned line items...');
  const getResponse = await fetch(`http://localhost:3000/api/orders/${orderId}/line-items/assign-domains?clientId=${clientId}&projectId=${projectId}`, {
    headers: {
      'Cookie': 'auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNjBhMDBmNy00ZDJmLTQ2ODktOWJmNC0xZDZhMGJmNGQzNzciLCJlbWFpbCI6ImFqYXkrYWRtaW5AbGlua2lvLmNvbSIsInVzZXJUeXBlIjoiaW50ZXJuYWwiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzc1NTY0NDksImV4cCI6MTczODE2MTI0OX0.5j8n6HDX5ey1ZCnM9YNhGJb5pXZXQiH5C7DHHvAB8pI'
    }
  });
  
  const data = await getResponse.json();
  console.log('  Available domains:', data.availableDomains?.length || 0);
  console.log('  Unassigned line items:', data.unassignedLineItems?.length || 0);
  
  if (!data.unassignedLineItems?.length || !data.availableDomains?.length) {
    console.log('\nNo items to assign!');
    return;
  }
  
  // Find tekedia.com in available domains
  const tekediaDomain = data.availableDomains.find((d: any) => d.domain === 'tekedia.com');
  if (!tekediaDomain) {
    console.log('\ntekedia.com not found in available domains');
    return;
  }
  
  console.log('\n2. Found tekedia.com in bulk analysis:');
  console.log('  Domain ID:', tekediaDomain.id);
  console.log('  Qualification Status:', tekediaDomain.qualificationStatus);
  
  const lineItem = data.unassignedLineItems[0];
  console.log('\n3. Will assign to line item:', lineItem.id);
  console.log('  Current estimated price:', lineItem.estimatedPrice ? `$${(lineItem.estimatedPrice/100).toFixed(2)}` : 'null');
  
  // Make the assignment
  console.log('\n4. Making assignment via API...');
  const assignResponse = await fetch(`http://localhost:3000/api/orders/${orderId}/line-items/assign-domains`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNjBhMDBmNy00ZDJmLTQ2ODktOWJmNC0xZDZhMGJmNGQzNzciLCJlbWFpbCI6ImFqYXkrYWRtaW5AbGlua2lvLmNvbSIsInVzZXJUeXBlIjoiaW50ZXJuYWwiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Mzc1NTY0NDksImV4cCI6MTczODE2MTI0OX0.5j8n6HDX5ey1ZCnM9YNhGJb5pXZXQiH5C7DHHvAB8pI'
    },
    body: JSON.stringify({
      assignments: [{
        lineItemId: lineItem.id,
        domainId: tekediaDomain.id
      }],
      projectId: tekediaDomain.projectId
    })
  });
  
  const result = await assignResponse.json();
  
  if (result.success) {
    console.log('\n✅ Assignment successful!');
    console.log('  Message:', result.message);
    console.log('  Batch ID:', result.batchId);
  } else {
    console.log('\n❌ Assignment failed:', result.error);
  }
  
  // Now check what was actually stored
  console.log('\n5. Checking what was stored in the database...');
  
  process.exit(0);
}

testApiAssignment().catch(console.error);