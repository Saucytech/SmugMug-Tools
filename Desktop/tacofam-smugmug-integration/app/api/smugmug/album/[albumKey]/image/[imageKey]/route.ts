import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

// Global request queue to prevent concurrent OAuth requests and nonce collisions
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 10000; // 10 seconds minimum between requests

async function waitForRequestSlot() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_GAP) {
    const waitTime = MIN_REQUEST_GAP - timeSinceLastRequest;
    console.log(`⏳ Waiting ${waitTime}ms for request slot...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { albumKey: string; imageKey: string } }
) {
  const maxRetries = 3;
  let lastError: any = null;

  // Parse body once before the retry loop
  const requestBody = await request.json();

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

      const { albumKey, imageKey } = params;

      // Use the stored request body for all attempts
      const body = requestBody;

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

      // Wait for global request slot
      await waitForRequestSlot();

      // Use AlbumImage endpoint with versioned image key (e.g., MLB2MBL-0)
      // This prevents redirects and OAuth nonce issues
      const url = `https://api.smugmug.com/api/v2/album/${albumKey}/image/${imageKey}`;

      const requestData = {
        url,
        method: 'PATCH',
      };

      // Create fresh OAuth instance for each request
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
        nonce_length: 96,
      });

      const authHeader = freshOAuth.toHeader(
        freshOAuth.authorize(requestData, {
          key: accessToken,
          secret: accessTokenSecret,
        })
      );

      console.log(`📝 Updating AlbumImage metadata (attempt ${attempt}/${maxRetries}):`, {
        albumKey,
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
          console.warn(`⚠️ Nonce collision on attempt ${attempt}, retrying...`);
          continue;
        }

        console.error('==================== SMUGMUG ALBUMIMAGE PATCH ERROR ====================');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('URL:', url);
        console.error('Album Key:', albumKey);
        console.error('Image Key:', imageKey);
        console.error('Attempt:', `${attempt}/${maxRetries}`);
        console.error('Request Body:', JSON.stringify(updatePayload));
        console.error('Response Body:', errorText);
        console.error('=========================================================================');

        return NextResponse.json(
          {
            error: `SmugMug API error: ${response.statusText}`,
            details: errorText,
            status: response.status,
            attempt: attempt,
            endpoint: 'AlbumImage'
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log(`✅ Successfully updated AlbumImage metadata (attempt ${attempt}):`, {
        albumKey,
        imageKey
      });
      return NextResponse.json({
        success: true,
        data,
        attempt,
        endpoint: 'AlbumImage'
      });

    } catch (error) {
      console.error(`❌ Error on attempt ${attempt}:`, error);
      lastError = error;

      if (attempt === maxRetries) {
        return NextResponse.json(
          {
            error: 'Failed to update AlbumImage metadata after retries',
            details: error instanceof Error ? error.message : 'Unknown error',
            attempts: maxRetries,
            endpoint: 'AlbumImage'
          },
          { status: 500 }
        );
      }
    }
  }

  // If we get here, all retries failed
  return NextResponse.json(
    {
      error: 'Failed to update AlbumImage metadata after all retries',
      details: lastError instanceof Error ? lastError.message : 'Unknown error',
      attempts: maxRetries,
      endpoint: 'AlbumImage'
    },
    { status: 500 }
  );
}
