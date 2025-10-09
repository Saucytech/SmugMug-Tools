import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { encryption } from '@/lib/encryption';
import db from '@/lib/db';

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

const ACCESS_TOKEN_URL = 'https://secure.smugmug.com/services/oauth/1.0a/getAccessToken';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated with NextAuth
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=not_logged_in', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    if (!oauthToken || !oauthVerifier) {
      throw new Error('Missing OAuth parameters');
    }

    // Retrieve request token secret from cookie
    const requestTokenSecret = request.cookies.get('oauth_token_secret')?.value;

    if (!requestTokenSecret) {
      throw new Error('Missing OAuth token secret');
    }

    // Step 2: Exchange request token for access token
    const requestData = {
      url: ACCESS_TOKEN_URL,
      method: 'GET',
      data: {
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier,
      },
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: oauthToken,
        secret: requestTokenSecret,
      })
    );

    const response = await fetch(
      `${ACCESS_TOKEN_URL}?oauth_token=${oauthToken}&oauth_verifier=${oauthVerifier}`,
      {
        method: 'GET',
        headers: {
          ...authHeader,
        },
      }
    );

    const data = await response.text();
    const params = new URLSearchParams(data);
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');

    if (!accessToken || !accessTokenSecret) {
      throw new Error('Failed to get access token');
    }

    // Get SmugMug user info to store nickname and domain
    const userInfoRequest = {
      url: 'https://api.smugmug.com/api/v2!authuser',
      method: 'GET',
    };

    const userInfoAuthHeader = oauth.toHeader(
      oauth.authorize(userInfoRequest, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const userInfoResponse = await fetch(userInfoRequest.url, {
      headers: {
        ...userInfoAuthHeader,
        Accept: 'application/json',
      },
    });

    let smugmugNickname = null;
    let smugmugDomain = null;

    if (userInfoResponse.ok) {
      const userData = await userInfoResponse.json();
      smugmugNickname = userData.Response?.User?.NickName || null;
      smugmugDomain = userData.Response?.User?.Domain || null;
    }

    // Encrypt tokens before storing in database
    const encryptedAccessToken = encryption.encrypt(accessToken);
    const encryptedTokenSecret = encryption.encrypt(accessTokenSecret);

    // Store encrypted tokens in database
    const userId = (session.user as any).id;

    await db.query(
      `INSERT INTO smugmug_tokens (user_id, access_token_encrypted, token_secret_encrypted, smugmug_nickname, smugmug_domain, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         access_token_encrypted = $2,
         token_secret_encrypted = $3,
         smugmug_nickname = $4,
         smugmug_domain = $5,
         updated_at = NOW()`,
      [userId, encryptedAccessToken, encryptedTokenSecret, smugmugNickname, smugmugDomain]
    );

    // Redirect back to homepage
    const redirectResponse = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!));

    // Clear the temporary OAuth cookie
    redirectResponse.cookies.delete('oauth_token_secret');

    return redirectResponse;
  } catch (_error) {
    console.error('SmugMug callback error:', _error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}
