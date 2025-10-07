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

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get('x-access-token');
    const accessTokenSecret = request.headers.get('x-access-token-secret');

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Missing authentication tokens' },
        { status: 401 }
      );
    }

    const { imageUri, albumKey } = await request.json();

    if (!imageUri || !albumKey) {
      return NextResponse.json(
        { error: 'imageUri and albumKey are required' },
        { status: 400 }
      );
    }

    // SmugMug API endpoint for collecting images (note: it's 'collectimages' plural)
    const requestData = {
      url: `https://api.smugmug.com/api/v2/album/${albumKey}!collectimages`,
      method: 'POST',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const response = await fetch(requestData.url, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ImageUris: [imageUri], // SmugMug expects an array of image URIs
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('SmugMug collect error:', data);
      return NextResponse.json(
        { error: data.Message || 'Failed to collect image' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error: any) {
    console.error('Error collecting image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to collect image' },
      { status: 500 }
    );
  }
}
