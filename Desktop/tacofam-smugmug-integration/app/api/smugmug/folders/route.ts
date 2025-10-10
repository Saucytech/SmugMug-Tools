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
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

export async function GET(request: NextRequest) {
  try {
    const { accessToken, accessTokenSecret } = await requireSmugMugTokens();

    // Get authenticated user info
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

    // Get folders structure
    const foldersUrl = `https://api.smugmug.com/api/v2/user/${nickname}!folders`;

    const requestData = {
      url: foldersUrl,
      method: 'GET',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const response = await fetch(foldersUrl, {
      headers: {
        ...authHeader,
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json({
      folders: data.Response.Folder || [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch folders';
    const status = message === 'Unauthorized' ? 401 : message === 'SmugMug account not connected' ? 409 : 500;
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
