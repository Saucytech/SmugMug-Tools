import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { encryption } from '@/lib/encryption';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

export async function GET() {
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

    // Get authenticated user's info first
    const userUrl = 'https://api.smugmug.com/api/v2!authuser';
    
    const userRequestData = {
      url: userUrl,
      method: 'GET',
    };

    const userAuthHeader = oauth.toHeader(
      oauth.authorize(userRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const userResponse = await fetch(userUrl, {
      headers: {
        ...userAuthHeader,
        Accept: 'application/json',
      },
    });

    const userData = await userResponse.json();
    const nickname = userData.Response.User.NickName;

    // Now get ALL albums with pagination
    let allAlbums: any[] = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 100; // Max allowed by SmugMug

    while (hasMore) {
      const albumsUrl = `https://api.smugmug.com/api/v2/user/${nickname}!albums?start=${(page - 1) * pageSize + 1}&count=${pageSize}`;

      const requestData = {
        url: albumsUrl,
        method: 'GET',
      };

      const authHeader = oauth.toHeader(
        oauth.authorize(requestData, {
          key: accessToken,
          secret: accessTokenSecret,
        })
      );

      const response = await fetch(albumsUrl, {
        headers: {
          ...authHeader,
          Accept: 'application/json',
        },
      });

      const data = await response.json();
      const albums = data.Response.Album || [];

      allAlbums = allAlbums.concat(albums);

      // Check if there are more pages
      hasMore = albums.length === pageSize;
      page++;
    }

    return NextResponse.json({
      albums: allAlbums,
    });
  } catch (_error) {
    console.error('Error fetching albums:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch albums' },
      { status: 500 }
    );
  }
}
