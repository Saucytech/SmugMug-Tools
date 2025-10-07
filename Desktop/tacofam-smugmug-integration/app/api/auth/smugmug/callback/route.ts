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

const ACCESS_TOKEN_URL = 'https://secure.smugmug.com/services/oauth/1.0a/getAccessToken';

export async function GET(request: NextRequest) {
  try {
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

    // Store tokens in secure HTTP-only cookies
    const redirectResponse = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!));

    // Set access token in HTTP-only, secure cookie
    redirectResponse.cookies.set('smugmug_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Set token secret in HTTP-only, secure cookie
    redirectResponse.cookies.set('smugmug_access_token_secret', accessTokenSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Clear the temporary OAuth cookie
    redirectResponse.cookies.delete('oauth_token_secret');

    return redirectResponse;
  } catch (error) {
    console.error('SmugMug callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}
