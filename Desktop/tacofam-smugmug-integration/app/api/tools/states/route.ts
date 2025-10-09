import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET all tool states (public - used on homepage)
export async function GET(request: NextRequest) {
  try {
    const toolStates = await db.getAllToolStates();

    return NextResponse.json({
      tools: toolStates,
    });
  } catch (error) {
    console.error('Error fetching tool states:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool states' },
      { status: 500 }
    );
  }
}
