import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { requireSmugMugTokens } from '@/lib/smugmug-auth';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { albumKey: string } }
) {
  try {
    const { accessToken, accessTokenSecret } = await requireSmugMugTokens();

    const { albumUri, updates } = await request.json();

    if (!albumUri || !updates) {
      return NextResponse.json(
        { error: 'Missing albumUri or updates' },
        { status: 400 }
      );
    }

    const albumUrl = `https://api.smugmug.com${albumUri}`;

    const requestData = {
      url: albumUrl,
      method: 'PATCH',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const response = await fetch(albumUrl, {
      method: 'PATCH',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update album:', errorText);
      return NextResponse.json(
        { error: 'Failed to update album', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update album';
    const status = message === 'Unauthorized' ? 401 : message === 'SmugMug account not connected' ? 409 : 500;
    console.error('Error updating album:', error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
