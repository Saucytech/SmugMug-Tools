import { NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// SmugMug OAuth 1.0 configuration
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

const REQUEST_TOKEN_URL = 'https://secure.smugmug.com/services/oauth/1.0a/getRequestToken';
const AUTHORIZE_URL = 'https://secure.smugmug.com/services/oauth/1.0a/authorize';

export async function GET(_request: Request) {
  try {
    // Verify environment variables are present
    if (!process.env.SMUGMUG_API_KEY || !process.env.SMUGMUG_API_SECRET) {
      console.error('Missing SmugMug API credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API credentials' },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('Missing NEXT_PUBLIC_APP_URL');
      return NextResponse.json(
        { error: 'Server configuration error: Missing app URL' },
        { status: 500 }
      );
    }

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/smugmug/callback`;
    console.log('OAuth callback URL:', callbackUrl);

    // Step 1: Get request token
    const requestData = {
      url: REQUEST_TOKEN_URL,
      method: 'GET',
      data: {
        oauth_callback: callbackUrl,
      },
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    const tokenResponse = await fetch(`${REQUEST_TOKEN_URL}?oauth_callback=${encodeURIComponent(callbackUrl)}`, {
      method: 'GET',
      headers: {
        ...authHeader,
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('SmugMug token request failed:', tokenResponse.status, errorText);
      throw new Error(`SmugMug API error: ${tokenResponse.status} - ${errorText}`);
    }

    const data = await tokenResponse.text();
    const params = new URLSearchParams(data);
    const requestToken = params.get('oauth_token');
    const requestTokenSecret = params.get('oauth_token_secret');

    if (!requestToken || !requestTokenSecret) {
      console.error('Invalid token response:', data);
      throw new Error('Failed to get request token from SmugMug');
    }

    // Store request token secret in cookie for callback
    const authorizeUrl = `${AUTHORIZE_URL}?oauth_token=${requestToken}&Access=Full&Permissions=Modify`;

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set('oauth_token_secret', requestTokenSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SmugMug OAuth error:', errorMessage, error);
    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
