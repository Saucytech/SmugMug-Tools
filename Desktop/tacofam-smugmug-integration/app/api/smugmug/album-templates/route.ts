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
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

export async function GET(request: NextRequest) {
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

    // First get authenticated user
    const userUrl = 'https://api.smugmug.com/api/v2!authuser';
    const userRequestData = { url: userUrl, method: 'GET' };
    const userAuthHeader = oauth.toHeader(
      oauth.authorize(userRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const userResponse = await fetch(userUrl, {
      headers: { ...userAuthHeader, Accept: 'application/json' },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Failed to fetch user:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch user', templates: [] },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    const albumTemplatesUri = userData.Response?.User?.Uris?.AlbumTemplates?.Uri;

    if (!albumTemplatesUri) {
      console.error('No album templates URI found in user response');
      return NextResponse.json({
        templates: [],
      });
    }

    // Now fetch album templates using the URI from user object
    const templatesUrl = `https://api.smugmug.com${albumTemplatesUri}`;
    const requestData = { url: templatesUrl, method: 'GET' };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const response = await fetch(templatesUrl, {
      headers: { ...authHeader, Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch album templates:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch album templates', templates: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      templates: data.Response?.AlbumTemplate || [],
    });
  } catch (_error) {
    console.error('Error fetching album templates:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch album templates', details: _error instanceof Error ? _error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
