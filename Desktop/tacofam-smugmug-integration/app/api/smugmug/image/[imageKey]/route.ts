import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Global request queue to prevent concurrent OAuth requests and nonce collisions
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 10000; // 10 seconds minimum between requests - SmugMug has aggressive nonce caching

async function waitForRequestSlot() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_GAP) {
    const waitTime = MIN_REQUEST_GAP - timeSinceLastRequest;
    console.log(`Waiting ${waitTime}ms for request slot...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

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
    const accessToken = request.cookies.get('smugmug_access_token')?.value;
    const accessTokenSecret = request.cookies.get('smugmug_access_token_secret')?.value;

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
  } catch (_error) {
    console.error('Error fetching image metadata:', _error);
    return NextResponse.json(
      { error: 'Failed to fetch image metadata' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { imageKey: string } }
) {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = request.cookies.get('smugmug_access_token')?.value;
      const accessTokenSecret = request.cookies.get('smugmug_access_token_secret')?.value;

      if (!accessToken || !accessTokenSecret) {
        return NextResponse.json(
          { error: 'Missing authentication tokens' },
          { status: 401 }
        );
      }

      const imageKey = params.imageKey;

      // Parse body only once on first attempt
      let body;
      if (attempt === 1) {
        body = await request.json();
      } else {
        // For retries, we need to get the body from the original request clone
        // This is a limitation - we'll need to pass it differently
        body = lastError?.body || {};
      }

      // Build update payload - only include non-empty fields
      const updatePayload: any = {};
      if (body.Title !== undefined && body.Title !== null) {
        updatePayload.Title = body.Title;
      }
      if (body.Caption !== undefined && body.Caption !== null) {
        updatePayload.Caption = body.Caption;
      }
      if (body.Keywords !== undefined && body.Keywords !== null) {
        updatePayload.Keywords = body.Keywords;
      }

      // Don't make request if nothing to update
      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ success: true, message: 'No changes to save' });
      }

      // Store for potential retry
      lastError = { body };

      // Wait for global request slot (ensures 5 second gap between ALL requests)
      await waitForRequestSlot();

    const url = `https://api.smugmug.com/api/v2/image/${imageKey}`;

    const requestData = {
      url,
      method: 'PATCH',
    };

    // Create completely fresh OAuth instance with extended nonce
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
      nonce_length: 96, // Very long nonce
    });

    // Generate auth with fresh instance (don't include body in OAuth signature for JSON PATCH)
    const authHeader = freshOAuth.toHeader(
      freshOAuth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

      console.log(`Updating image metadata (attempt ${attempt}/${maxRetries}):`, {
        imageKey,
        fields: Object.keys(updatePayload),
      });

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check if it's a nonce_used error and we can retry
        if (errorText.includes('nonce_used') && attempt < maxRetries) {
          console.warn(`Nonce collision on attempt ${attempt}, retrying...`);
          continue; // Retry with longer delay
        }

        console.error('==================== SMUGMUG PATCH ERROR ====================');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('URL:', url);
        console.error('Image Key:', imageKey);
        console.error('Attempt:', `${attempt}/${maxRetries}`);
        console.error('Request Body:', JSON.stringify(updatePayload));
        console.error('Response Body:', errorText);
        console.error('Auth Header:', Object.keys(authHeader));
        console.error('=============================================================');

        return NextResponse.json(
          {
            error: `SmugMug API error: ${response.statusText}`,
            details: errorText,
            status: response.status,
            attempt: attempt
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log(`Successfully updated image metadata (attempt ${attempt}):`, imageKey);
      return NextResponse.json({ success: true, data, attempt });

    } catch (_error) {
      console.error(`Error on attempt ${attempt}:`, _error);
      lastError = error;

      if (attempt === maxRetries) {
        return NextResponse.json(
          {
            error: 'Failed to update image metadata after retries',
            details: error instanceof Error ? error.message : 'Unknown error',
            attempts: maxRetries
          },
          { status: 500 }
        );
      }
      // Continue to next retry
    }
  }

  // If we get here, all retries failed
  return NextResponse.json(
    {
      error: 'Failed to update image metadata after all retries',
      details: lastError instanceof Error ? lastError.message : 'Unknown error',
      attempts: maxRetries
    },
    { status: 500 }
  );
}
