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

    // Get authenticated user info
    const userUrl = 'https://api.smugmug.com/api/v2!authuser';
    const userRequestData = {
      url: userUrl,
      method: 'GET',
    };

    const userAuthHeader = oauth.toHeader(
      oauth.authorize(userRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const userResponse = await fetch(userUrl, {
      headers: {
        ...userAuthHeader,
        Accept: 'application/json',
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.Response?.User) {
      console.error('Failed to fetch user:', userData);
      return NextResponse.json(
        { error: 'Failed to fetch user info' },
        { status: userResponse.status || 500 }
      );
    }

    const user = userData.Response.User;
    const userUri = user.Uris.Node.Uri;

    // Get children of user node to check for existing "Guest Upload Projects" folder
    const childrenUrl = `https://api.smugmug.com${userUri}!children`;
    const childrenRequestData = {
      url: childrenUrl,
      method: 'GET',
    };

    const childrenAuthHeader = oauth.toHeader(
      oauth.authorize(childrenRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const childrenResponse = await fetch(childrenUrl, {
      headers: {
        ...childrenAuthHeader,
        Accept: 'application/json',
      },
    });

    const childrenData = await childrenResponse.json();

    if (!childrenResponse.ok) {
      console.error('Failed to fetch user children:', childrenData);
      return NextResponse.json(
        { error: childrenData.Message || 'Failed to fetch folders' },
        { status: childrenResponse.status }
      );
    }

    // Check if Guest Upload Projects folder already exists
    const folders = childrenData.Response?.Folder || [];
    const existingFolder = folders.find(
      (folder: any) => folder.Name === 'Guest Upload Projects'
    );

    if (existingFolder) {
      return NextResponse.json({
        folder: existingFolder,
        created: false,
      });
    }

    // Create the folder if it doesn't exist
    const createFolderUrl = `https://api.smugmug.com${userUri}!children`;
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
        Name: 'Guest Upload Projects',
        UrlName: 'Guest-Upload-Projects',
        Privacy: 'Unlisted', // Unlisted folder as requested
      }),
    });

    const createFolderData = await createFolderResponse.json();

    if (!createFolderResponse.ok) {
      // Check if it's a 409 conflict (folder already exists)
      if (createFolderResponse.status === 409 && createFolderData.Conflicts) {
        // Extract the existing folder from conflicts
        const conflictKey = Object.keys(createFolderData.Conflicts)[0];
        const existingNode = createFolderData.Conflicts[conflictKey].Node;
        return NextResponse.json({
          folder: existingNode,
          created: false,
        });
      }

      console.error('Failed to create folder:', JSON.stringify(createFolderData, null, 2));
      return NextResponse.json(
        { error: createFolderData.Message || 'Failed to create Guest Upload Projects folder' },
        { status: createFolderResponse.status }
      );
    }

    return NextResponse.json({
      folder: createFolderData.Response.Folder,
      created: true,
    });

  } catch (error: any) {
    console.error('Error managing guest upload folder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to manage folder' },
      { status: 500 }
    );
  }
}
