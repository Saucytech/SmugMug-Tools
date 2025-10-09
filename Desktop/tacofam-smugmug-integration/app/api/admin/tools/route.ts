import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT - Update tool state (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is admin
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { toolId, status, disabledMessage } = body;

    // Validate input
    if (!toolId || !status) {
      return NextResponse.json(
        { error: 'toolId and status are required' },
        { status: 400 }
      );
    }

    if (!['on', 'disabled', 'off'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: on, disabled, off' },
        { status: 400 }
      );
    }

    // Update tool state
    await db.updateToolState(toolId, status, disabledMessage);

    return NextResponse.json({
      success: true,
      message: `Tool ${toolId} updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating tool state:', error);
    return NextResponse.json(
      { error: 'Failed to update tool state' },
      { status: 500 }
    );
  }
}
