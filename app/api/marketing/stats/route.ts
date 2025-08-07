import { NextResponse } from 'next/server';
import { getMarketingStats } from '@/lib/marketing-stats';

export async function GET() {
  const stats = await getMarketingStats();
  return NextResponse.json(stats);
}