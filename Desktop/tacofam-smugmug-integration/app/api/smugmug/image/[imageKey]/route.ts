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
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: { imageKey: string } }
) {
  try {
    const accessToken = request.headers.get('X-Access-Token');
    const accessTokenSecret = request.headers.get('X-Access-Token-Secret');

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Missing authentication tokens' },
        { status: 401 }
      );
    }

    const imageKey = params.imageKey;
    const url = `https://api.smugmug.com/api/v2/image/${imageKey}!metadata`;

    const requestData = {
      url,
      method: 'GET',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SmugMug API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching image metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image metadata' },
      { status: 500 }
    );
  }
}
