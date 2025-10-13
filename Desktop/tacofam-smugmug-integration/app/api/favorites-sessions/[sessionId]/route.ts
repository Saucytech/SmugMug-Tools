import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

// GET /api/favorites-sessions/[sessionId] - Get single session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.query(
      `SELECT
        id, session_id, name, description, album_keys, theme,
        show_buy_button, logo_url, customer_favorites,
        created_at, expires_at, last_viewed_at
      FROM favorites_sessions
      WHERE session_id = $1 AND user_id = $2`,
      [params.sessionId, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update last_viewed_at timestamp
    await db.query(
      `UPDATE favorites_sessions SET last_viewed_at = CURRENT_TIMESTAMP WHERE session_id = $1`,
      [params.sessionId]
    );

    return NextResponse.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Error fetching favorites session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// PATCH /api/favorites-sessions/[sessionId] - Update session or add customer favorites
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    // Public route: Add customer favorites (no auth required)
    if (body.customerEmail && body.photoKeys) {
      const { customerEmail, photoKeys, customerName } = body;

      // Verify session exists (don't need to check user_id for public customer access)
      const sessionCheck = await db.query(
        `SELECT customer_favorites FROM favorites_sessions WHERE session_id = $1`,
        [params.sessionId]
      );

      if (sessionCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const currentFavorites = sessionCheck.rows[0].customer_favorites || {};
      currentFavorites[customerEmail] = {
        photoKeys,
        selectedAt: new Date().toISOString(),
        customerName: customerName || null
      };

      await db.query(
        `UPDATE favorites_sessions
        SET customer_favorites = $1, last_viewed_at = CURRENT_TIMESTAMP
        WHERE session_id = $2`,
        [JSON.stringify(currentFavorites), params.sessionId]
      );

      return NextResponse.json({ success: true });
    }

    // Protected route: Update session metadata (auth required)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, theme, showBuyButton, logoUrl, expiresAt } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (theme !== undefined) {
      updates.push(`theme = $${paramCount++}`);
      values.push(theme);
    }
    if (showBuyButton !== undefined) {
      updates.push(`show_buy_button = $${paramCount++}`);
      values.push(showBuyButton);
    }
    if (logoUrl !== undefined) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(logoUrl);
    }
    if (expiresAt !== undefined) {
      updates.push(`expires_at = $${paramCount++}`);
      values.push(expiresAt);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(params.sessionId, session.user.id);

    const result = await db.query(
      `UPDATE favorites_sessions
      SET ${updates.join(', ')}, last_viewed_at = CURRENT_TIMESTAMP
      WHERE session_id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Error updating favorites session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
