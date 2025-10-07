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
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  },
});

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.headers.get('X-Access-Token');
    const accessTokenSecret = request.headers.get('X-Access-Token-Secret');

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { folderUri, galleryName, galleryUrlName } = body;

    console.log('create-gallery request body:', JSON.stringify(body, null, 2));

    if (!folderUri || !galleryName) {
      console.error('Missing required fields:', { folderUri, galleryName });
      return NextResponse.json(
        { error: 'folderUri and galleryName are required' },
        { status: 400 }
      );
    }

    // Create gallery in the specified folder
    const createGalleryUrl = `https://api.smugmug.com${folderUri}!children`;
    const createGalleryRequestData = {
      url: createGalleryUrl,
      method: 'POST',
    };

    const createGalleryAuthHeader = oauth.toHeader(
      oauth.authorize(createGalleryRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const createGalleryResponse = await fetch(createGalleryUrl, {
      method: 'POST',
      headers: {
        ...createGalleryAuthHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Type: 'Album',
        Name: galleryName,
        UrlName: galleryUrlName || galleryName.toLowerCase().replace(/\s+/g, '-'),
        Privacy: 'Unlisted', // Unlisted as requested
      }),
    });

    const createGalleryData = await createGalleryResponse.json();

    if (!createGalleryResponse.ok) {
      console.error('Failed to create gallery:', createGalleryData);
      return NextResponse.json(
        { error: createGalleryData.Message || 'Failed to create gallery' },
        { status: createGalleryResponse.status }
      );
    }

    const album = createGalleryData.Response.Album;

    return NextResponse.json({
      success: true,
      album,
    });

  } catch (error: any) {
    console.error('Error creating gallery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create gallery' },
      { status: 500 }
    );
  }
}
