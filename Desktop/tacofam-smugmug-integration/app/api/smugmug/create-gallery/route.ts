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
    const accessToken = request.cookies.get('smugmug_access_token')?.value;
    const accessTokenSecret = request.cookies.get('smugmug_access_token_secret')?.value;

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

    // SmugMug requires UrlName to start with a capital letter
    const baseUrlName = galleryUrlName || galleryName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
    const capitalizedUrlName = baseUrlName.charAt(0).toUpperCase() + baseUrlName.slice(1);

    const requestBody = {
      Type: 'Album',
      Name: galleryName,
      UrlName: capitalizedUrlName,
      Privacy: 'Unlisted', // Unlisted as requested
    };

    console.log('Sending request to:', createGalleryUrl);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const createGalleryResponse = await fetch(createGalleryUrl, {
      method: 'POST',
      headers: {
        ...createGalleryAuthHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const createGalleryData = await createGalleryResponse.json();

    if (!createGalleryResponse.ok) {
      console.error('Failed to create gallery:', createGalleryData);

      // Log available parameters if present for debugging
      if (createGalleryData.Options?.Parameters?.POST) {
        console.error('Available POST parameters:', JSON.stringify(createGalleryData.Options.Parameters.POST, null, 2));
      }

      return NextResponse.json(
        { error: createGalleryData.Message || 'Failed to create gallery', details: createGalleryData },
        { status: createGalleryResponse.status }
      );
    }

    // When creating via !children endpoint, SmugMug returns a Node, not Album
    const createdNode = createGalleryData.Response?.Node;

    if (!createdNode || !createdNode.Uri) {
      console.error('No node returned in response:', createGalleryData);
      return NextResponse.json(
        { error: 'Failed to create gallery - no node returned' },
        { status: 500 }
      );
    }

    console.log(`Gallery node created: ${galleryName} (URI: ${createdNode.Uri}, NodeID: ${createdNode.NodeID})`);

    // Wait a moment for SmugMug to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch the node to get the Album details
    const nodeUrl = `https://api.smugmug.com${createdNode.Uri}`;
    const nodeRequestData = { url: nodeUrl, method: 'GET' };
    const nodeAuthHeader = oauth.toHeader(
      oauth.authorize(nodeRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const nodeResponse = await fetch(nodeUrl, {
      headers: { ...nodeAuthHeader, Accept: 'application/json' },
    });

    if (!nodeResponse.ok) {
      console.error('Failed to fetch created node details');
      return NextResponse.json(
        { error: 'Gallery created but could not fetch details' },
        { status: 500 }
      );
    }

    const nodeData = await nodeResponse.json();
    const albumUri = nodeData.Response.Node?.Uris?.Album?.Uri;

    if (!albumUri) {
      console.error('No album URI found in node:', nodeData);
      return NextResponse.json(
        { error: 'Gallery created but no album URI found' },
        { status: 500 }
      );
    }

    // Now fetch the actual Album details
    const albumUrl = `https://api.smugmug.com${albumUri}`;
    const albumRequestData = { url: albumUrl, method: 'GET' };
    const albumAuthHeader = oauth.toHeader(
      oauth.authorize(albumRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const albumResponse = await fetch(albumUrl, {
      headers: { ...albumAuthHeader, Accept: 'application/json' },
    });

    if (!albumResponse.ok) {
      console.error('Failed to fetch album details');
      return NextResponse.json(
        { error: 'Gallery created but could not fetch album details' },
        { status: 500 }
      );
    }

    const albumData = await albumResponse.json();
    const album = albumData.Response.Album;

    console.log(`✓ Gallery verified: "${galleryName}" (AlbumKey: ${album.AlbumKey}, WebUri: ${album.WebUri})`);

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
