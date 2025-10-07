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
    const accessToken = request.headers.get('x-access-token');
    const accessTokenSecret = request.headers.get('x-access-token-secret');

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Missing authentication tokens' },
        { status: 401 }
      );
    }

    const { imageUri, sourceAlbumKey, destinationAlbumKey } = await request.json();

    if (!imageUri || !sourceAlbumKey || !destinationAlbumKey) {
      return NextResponse.json(
        { error: 'imageUri, sourceAlbumKey, and destinationAlbumKey are required' },
        { status: 400 }
      );
    }

    // Step 1: Collect image to destination album
    const collectUrl = `https://api.smugmug.com/api/v2/album/${destinationAlbumKey}!collectimage`;
    const collectRequest = {
      url: collectUrl,
      method: 'POST',
    };

    const collectAuthHeader = oauth.toHeader(
      oauth.authorize(collectRequest, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const collectResponse = await fetch(collectUrl, {
      method: 'POST',
      headers: {
        ...collectAuthHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ImageUri: imageUri,
      }),
    });

    if (!collectResponse.ok) {
      const errorData = await collectResponse.json();
      console.error('Failed to collect image:', errorData);
      return NextResponse.json(
        { error: 'Failed to add image to destination album' },
        { status: collectResponse.status }
      );
    }

    const collectData = await collectResponse.json();

    // Step 2: Delete image from source album
    // First, we need to get the AlbumImage URI for the source album
    // The imageUri is /api/v2/image/{imageKey}
    // We need /api/v2/album/{sourceAlbumKey}/image/{imageKey}

    const imageKey = imageUri.split('/').pop();
    const deleteUrl = `https://api.smugmug.com/api/v2/album/${sourceAlbumKey}/image/${imageKey}`;

    const deleteRequest = {
      url: deleteUrl,
      method: 'DELETE',
    };

    const deleteAuthHeader = oauth.toHeader(
      oauth.authorize(deleteRequest, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        ...deleteAuthHeader,
        'Accept': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      console.error('Failed to delete from source:', errorData);
      // Image was collected but not removed from source - still a partial success
      return NextResponse.json(
        {
          success: true,
          warning: 'Image added to destination but could not be removed from source',
          collected: collectData
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Image successfully moved',
      collected: collectData
    });

  } catch (error: any) {
    console.error('Error moving image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to move image' },
      { status: 500 }
    );
  }
}
