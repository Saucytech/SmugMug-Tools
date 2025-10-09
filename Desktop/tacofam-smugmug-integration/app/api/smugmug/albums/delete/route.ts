import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

const oauth = new OAuth({
  consumer: {
    key: process.env.SMUGMUG_API_KEY!,
    secret: process.env.SMUGMUG_API_SECRET!,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/smugmug/albums/delete
 * Deletes multiple albums from SmugMug
 *
 * Request body:
 * {
 *   albumKeys: string[]  // Array of album keys to delete
 * }
 *
 * Response:
 * {
 *   success: true,
 *   deleted: number,
 *   failed: number,
 *   results: Array<{ albumKey: string, success: boolean, error?: string }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get OAuth tokens from cookies
    const accessToken = request.cookies.get('smugmug_access_token')?.value;
    const accessTokenSecret = request.cookies.get('smugmug_access_token_secret')?.value;

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Not authenticated with SmugMug' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { albumKeys } = body;

    if (!Array.isArray(albumKeys) || albumKeys.length === 0) {
      return NextResponse.json(
        { error: 'albumKeys must be a non-empty array' },
        { status: 400 }
      );
    }

    // Delete each album
    const results: Array<{ albumKey: string; success: boolean; error?: string }> = [];
    let deletedCount = 0;
    let failedCount = 0;

    for (const albumKey of albumKeys) {
      try {
        const requestData = {
          url: `https://api.smugmug.com/api/v2/album/${albumKey}`,
          method: 'DELETE',
        };

        const authHeader = oauth.toHeader(
          oauth.authorize(requestData, {
            key: accessToken,
            secret: accessTokenSecret,
          })
        );

        const response = await fetch(requestData.url, {
          method: 'DELETE',
          headers: {
            ...authHeader,
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          results.push({ albumKey, success: true });
          deletedCount++;
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          results.push({
            albumKey,
            success: false,
            error: errorData.message || `HTTP ${response.status}`,
          });
          failedCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({
          albumKey,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('Delete albums error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete albums' },
      { status: 500 }
    );
  }
}
