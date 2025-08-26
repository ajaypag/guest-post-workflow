// Quick debug script to test the task filtering
async function testTaskFiltering() {
  try {
    const response = await fetch('http://localhost:3000/api/internal/tasks?assignedTo=97aca16f-8b81-44ad-a532-a6e3fa96cbfc&type=workflow&status=pending,in_progress,blocked&showLineItems=false&page=1&limit=50', {
      headers: {
        'Cookie': 'auth-session=4a0ffc26-f09a-4850-88a4-02a6db7ede62' // The session ID from logs
      }
    });
    
    const data = await response.json();
    console.log('Response for workflow filter:');
    console.log('Task count:', data.tasks?.length || 0);
    console.log('Stats:', JSON.stringify(data.stats, null, 2));
    console.log('Tasks types:', data.tasks?.map(t => t.type) || []);
  } catch (error) {
    console.error('Error:', error);
  }
}

testTaskFiltering();