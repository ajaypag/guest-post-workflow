import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

interface JwtPayload {
  userId: string;
  userType: 'internal' | 'account' | 'publisher';
  email?: string;
  exp?: number;
  iat?: number;
}

export async function getJwtPayload(request: NextRequest): Promise<JwtPayload | null> {
  try {
    // Get token from cookie or header
    const cookieToken = request.cookies.get('auth-token')?.value || 
                       request.cookies.get('auth-token-account')?.value ||
                       request.cookies.get('auth-token-publisher')?.value;
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const token = cookieToken || headerToken;
    
    if (!token) {
      return null;
    }
    
    // Verify the token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return payload as unknown as JwtPayload;
    
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}