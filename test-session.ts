import { AuthServiceServer } from './lib/auth-server';

async function testSession() {
  try {
    // This simulates what happens in the API route
    const session = await AuthServiceServer.getSession();
    
    console.log('Session object:', JSON.stringify(session, null, 2));
    console.log('\nSession properties:');
    console.log('- userType:', session?.userType);
    console.log('- clientIds:', session?.clientIds);
    console.log('- id:', session?.id);
    console.log('- name:', session?.name);
    console.log('- email:', session?.email);
    
    process.exit(0);
  } catch (error) {
    console.error('Error getting session:', error);
    process.exit(1);
  }
}

testSession();