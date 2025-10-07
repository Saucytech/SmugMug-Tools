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
    const { parentFolderUri, folderName, folderUrlName } = body;

    console.log('create-folder request body:', JSON.stringify(body, null, 2));

    if (!parentFolderUri || !folderName) {
      console.error('Missing required fields:', { parentFolderUri, folderName });
      return NextResponse.json(
        { error: 'parentFolderUri and folderName are required' },
        { status: 400 }
      );
    }

    // Create folder in the specified parent folder
    const createFolderUrl = `https://api.smugmug.com${parentFolderUri}!children`;
    const createFolderRequestData = {
      url: createFolderUrl,
      method: 'POST',
    };

    const createFolderAuthHeader = oauth.toHeader(
      oauth.authorize(createFolderRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const createFolderResponse = await fetch(createFolderUrl, {
      method: 'POST',
      headers: {
        ...createFolderAuthHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Type: 'Folder',
        Name: folderName,
        UrlName: folderUrlName || folderName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
        Privacy: 'Unlisted',
      }),
    });

    const createFolderData = await createFolderResponse.json();

    if (!createFolderResponse.ok) {
      // Check if folder might already exist (400 often means duplicate)
      if (createFolderResponse.status === 400) {
        console.log(`Folder "${folderName}" might already exist, checking...`);

        // Try to get the existing folder
        const getChildrenUrl = `https://api.smugmug.com${parentFolderUri}!children`;
        const getChildrenRequestData = {
          url: getChildrenUrl,
          method: 'GET',
        };

        const getChildrenAuthHeader = oauth.toHeader(
          oauth.authorize(getChildrenRequestData, {
            key: accessToken,
            secret: accessTokenSecret,
          })
        );

        const childrenResponse = await fetch(getChildrenUrl, {
          headers: {
            ...getChildrenAuthHeader,
            Accept: 'application/json',
          },
        });

        if (childrenResponse.ok) {
          const childrenData = await childrenResponse.json();
          const folders = childrenData.Response?.Folder || [];
          const existingFolder = folders.find((f: any) => f.Name === folderName);

          if (existingFolder) {
            console.log(`Found existing folder: ${folderName}`);
            return NextResponse.json({
              success: true,
              folder: existingFolder,
              existing: true,
            });
          }
        }
      }

      console.error('Failed to create folder:', createFolderData);
      console.error('Request was:', {
        url: createFolderUrl,
        body: {
          Type: 'Folder',
          Name: folderName,
          UrlName: folderUrlName || folderName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
          Privacy: 'Unlisted',
        }
      });

      // Log available parameters if present
      if (createFolderData.Options?.Parameters?.POST) {
        console.error('Available POST parameters:', JSON.stringify(createFolderData.Options.Parameters.POST, null, 2));
      }

      return NextResponse.json(
        { error: createFolderData.Message || 'Failed to create folder', details: createFolderData },
        { status: createFolderResponse.status }
      );
    }

    const folder = createFolderData.Response.Node || createFolderData.Response.Folder;

    return NextResponse.json({
      success: true,
      folder,
    });

  } catch (error: any) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
      { status: 500 }
    );
  }
}