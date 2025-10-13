import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// GET /api/favorites-sessions - Get all sessions for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT
        id, session_id, name, description, album_keys, theme,
        show_buy_button, logo_url, customer_favorites,
        created_at, expires_at, last_viewed_at
      FROM favorites_sessions
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json({ sessions: result.rows });
  } catch (error) {
    console.error('Error fetching favorites sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/favorites-sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sessionId,
      name,
      description,
      albumKeys,
      theme,
      showBuyButton,
      logoUrl,
      expiresAt
    } = body;

    if (!sessionId || !name || !albumKeys || !Array.isArray(albumKeys) || albumKeys.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, name, albumKeys' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO favorites_sessions
        (user_id, session_id, name, description, album_keys, theme, show_buy_button, logo_url, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id, session_id, name, description, album_keys, theme,
        show_buy_button, logo_url, customer_favorites,
        created_at, expires_at, last_viewed_at`,
      [
        session.user.id,
        sessionId,
        name,
        description || null,
        albumKeys,
        theme || 'purple',
        showBuyButton || false,
        logoUrl || null,
        expiresAt || null
      ]
    );

    return NextResponse.json({ session: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating favorites session:', error);

    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ error: 'Session ID already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// DELETE /api/favorites-sessions?sessionId=xxx - Delete session
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    // Verify ownership before deleting
    const result = await query(
      `DELETE FROM favorites_sessions
      WHERE session_id = $1 AND user_id = $2
      RETURNING session_id`,
      [sessionId, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, sessionId: result.rows[0].session_id });
  } catch (error) {
    console.error('Error deleting favorites session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
