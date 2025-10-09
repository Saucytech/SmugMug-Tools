import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Delete SmugMug tokens from database
    const userId = (session.user as any).id;
    await db.deleteSmugMugTokens(userId);

    return NextResponse.json({
      success: true,
      message: 'SmugMug account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting SmugMug:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect SmugMug account' },
      { status: 500 }
    );
  }
}
