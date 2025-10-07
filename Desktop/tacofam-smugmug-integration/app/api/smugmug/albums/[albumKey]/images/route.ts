import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

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
    const accessToken = request.cookies.get('smugmug_access_token')?.value;
    const accessTokenSecret = request.cookies.get('smugmug_access_token_secret')?.value;

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

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
      }, generateNonce())
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
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
