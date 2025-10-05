import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Simple mutex to prevent concurrent OAuth requests
let requestLock: Promise<void> | null = null;

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
  nonce_length: 42,
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
    // Try without _expand first to see if that's the issue
    const url = `https://api.smugmug.com/api/v2/image/${imageKey}`;

    const requestData = {
      url,
      method: 'GET',
    };

    // Create a fresh OAuth instance for each request to avoid nonce collisions
    const freshOAuth = new OAuth({
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
      nonce_length: 64,
    });

    const authHeader = freshOAuth.toHeader(
      freshOAuth.authorize(requestData, {
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
      console.error('SmugMug API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        headers: authHeader,
      });
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

export async function PUT(
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
    const body = await request.json();
    const { Title, Caption, Keywords } = body;

    const url = `https://api.smugmug.com/api/v2/image/${imageKey}`;

    const requestData = {
      url,
      method: 'PUT',
    };

    // Create fresh OAuth instance for PUT to avoid nonce reuse
    // Add random component to ensure unique nonce
    const freshOAuth = new OAuth({
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
      nonce_length: 64, // Increased from 42 for more uniqueness
    });

    const authHeader = freshOAuth.toHeader(
      freshOAuth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Title, Caption, Keywords }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('==================== SMUGMUG PUT ERROR ====================');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('URL:', url);
      console.error('Request Body:', JSON.stringify({ Title, Caption, Keywords }));
      console.error('Response Body:', errorText);
      console.error('=============================================================');

      throw new Error(`SmugMug API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating image metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update image metadata' },
      { status: 500 }
    );
  }
}
