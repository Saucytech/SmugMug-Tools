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

export async function GET(request: NextRequest) {
  const logContext = {
    requestId: crypto.randomUUID(),
    path: '/api/smugmug/user',
  };

  try {
    const { accessToken, accessTokenSecret, userId } = await requireSmugMugTokens();
    console.info('SmugMug verify: tokens loaded', { ...logContext, userId });

    const url = 'https://api.smugmug.com/api/v2!authuser';

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
      const errorText = await response.text();
      console.error('SmugMug API error', {
        ...logContext,
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`SmugMug API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Return the user object
    return NextResponse.json({
      user: data.Response?.User || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status =
      message === 'Unauthorized'
        ? 401
        : message === 'SmugMug account not connected'
        ? 409
        : 500;

    console.error('Error verifying SmugMug connection', {
      ...logContext,
      error,
    });
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
