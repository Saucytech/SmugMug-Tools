import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { requireSmugMugTokens } from '@/lib/smugmug-auth';

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

export async function GET(request: NextRequest) {
  try {
    const { accessToken, accessTokenSecret, userId } = await requireSmugMugTokens();

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
      }, generateNonce())
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
      }, generateNonce())
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch albums';
    const status = message === 'Unauthorized' ? 401 : message === 'SmugMug account not connected' ? 409 : 500;
    console.error('Error fetching albums:', error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
