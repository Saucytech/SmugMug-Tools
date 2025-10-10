import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { encryption } from '@/lib/encryption';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Custom nonce generator to ensure uniqueness
function generateNonce(): string {
  return crypto.randomBytes(32).toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 32);
}

const oauth = new OAuth({
  consumer: {
    key: process.env.SMUGMUG_API_KEY!,
    secret: process.env.SMUGMUG_API_SECRET!,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
  nonce_length: 32,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { albumKey: string } }
) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    // Get encrypted tokens from database
    const userId = (session.user as any).id;
    const tokenData = await db.getSmugMugTokens(userId);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'SmugMug account not connected. Please connect your SmugMug account.' },
        { status: 401 }
      );
    }

    // Decrypt tokens
    const accessToken = encryption.decrypt(tokenData.access_token_encrypted);
    const accessTokenSecret = encryption.decrypt(tokenData.token_secret_encrypted);

    const albumKey = params.albumKey;
    const imagesUrl = `https://api.smugmug.com/api/v2/album/${albumKey}!images`;

    const requestData = {
      url: imagesUrl,
      method: 'GET',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const response = await fetch(imagesUrl, {
      headers: {
        ...authHeader,
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json({
      images: data.Response.AlbumImage || [],
    });
  } catch (_error) {
    console.error('Error fetching images:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
