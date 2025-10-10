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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SmugMug folders API error:', response.status, errorText);
      return NextResponse.json({
        folders: [],
        error: `SmugMug API returned ${response.status}`,
      });
    }

    const data = await response.json();

    // Check if the response has the expected structure
    if (!data.Response) {
      console.error('Unexpected SmugMug response structure:', data);
      return NextResponse.json({
        folders: [],
        error: 'Unexpected response format from SmugMug',
      });
    }

    // SmugMug returns folders in data.Response.Folder (note: singular "Folder" not "Folders")
    const folders = data.Response.Folder || [];

    console.log(`Loaded ${folders.length} folders for user ${nickname}`);

    return NextResponse.json({
      folders: folders,
    });
  } catch (_error) {
    console.error('Error fetching folders:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}
