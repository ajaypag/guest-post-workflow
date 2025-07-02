import { NextResponse } from 'next/server';
import { UserService } from '@/lib/db/userService';

export async function POST() {
  try {
    console.log('🧪 Testing user creation...');
    
    // Try to create a test user
    const testUser = await UserService.createUser({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'test123',
      role: 'user',
      isActive: true
    });
    
    console.log('✅ User created successfully:', testUser);
    
    // Clean up the test user
    await UserService.deleteUser(testUser.id);
    console.log('🧹 Test user deleted');
    
    return NextResponse.json({
      success: true,
      message: 'User creation test passed',
      userId: testUser.id
    });
  } catch (error) {
    console.error('❌ User creation test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}