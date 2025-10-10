import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { requireSmugMugTokens } from '@/lib/smugmug-auth';

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

interface FolderNode {
  name: string;
  parentFolderName?: string;
  parentFolderId?: string;
  urlName?: string;
  privacy?: 'Public' | 'Private' | 'Unlisted';
}

interface GalleryNode {
  name: string;
  parentFolderName?: string;
  parentFolderId?: string;
  urlName?: string;
  description?: string;
  keywords?: string[];
  privacy?: 'Public' | 'Private' | 'Unlisted';
  albumTemplateUri?: string;
  enableGuestUploads?: boolean;
  guestUploadPassword?: string;
}

interface CreationPlan {
  folders: FolderNode[];
  galleries: GalleryNode[];
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, accessTokenSecret } = await requireSmugMugTokens();

    const { plan }: { plan: CreationPlan } = await request.json();

    // Get authenticated user's root folder
    const userUrl = 'https://api.smugmug.com/api/v2!authuser';
    const userRequestData = { url: userUrl, method: 'GET' };
    const userAuthHeader = oauth.toHeader(
      oauth.authorize(userRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const userResponse = await fetch(userUrl, {
      headers: { ...userAuthHeader, Accept: 'application/json' },
    });

    const userData = await userResponse.json();
    const userNode = userData.Response.User.Uris.Node.Uri;
    const userNickname = userData.Response.User.NickName;

    // Track created folders by name for parent reference
    const folderMap = new Map<string, string>(); // name -> nodeUri (e.g., /api/v2/node/abc123)
    const errors: string[] = [];
    const uploadUrls: { galleryName: string; uploadUrl: string }[] = [];

    // Step 1: Create folders (in order of hierarchy) and VERIFY each one
    const sortedFolders = sortFoldersByHierarchy(plan.folders);

    for (const folder of sortedFolders) {
      // Use parentFolderId (existing folder's NodeID) if provided, otherwise look up parentFolderName
      let parentNodeUri = folder.parentFolderId
        ? folder.parentFolderId
        : folder.parentFolderName
        ? folderMap.get(folder.parentFolderName)
        : userNode;

      // Convert NodeID to URI format if needed (e.g., "abc123" -> "/api/v2/node/abc123")
      if (parentNodeUri && !parentNodeUri.startsWith('/api/v2/node/')) {
        parentNodeUri = `/api/v2/node/${parentNodeUri}`;
      }

      if (!parentNodeUri && (folder.parentFolderName || folder.parentFolderId)) {
        const errorMsg = `Parent folder "${folder.parentFolderName || folder.parentFolderId}" not found for "${folder.name}"`;
        console.error(errorMsg);
        errors.push(errorMsg);
        continue;
      }

      console.log(`\n📁 Creating folder: "${folder.name}" in parent: ${parentNodeUri || 'root'}`);

      const createdFolderUri = await createFolder(
        folder,
        parentNodeUri || userNode,
        accessToken,
        accessTokenSecret
      );

      if (createdFolderUri) {
        folderMap.set(folder.name, createdFolderUri);
        console.log(`✅ Folder "${folder.name}" created and verified!\n`);
      } else {
        const errorMsg = `Failed to create folder "${folder.name}"`;
        console.error(`❌ ${errorMsg}\n`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n📊 Folder creation summary: ${folderMap.size} folders created\n`);

    // Step 2: Create galleries ONLY if parent folders exist
    let galleriesCreated = 0;

    for (const gallery of plan.galleries) {
      // Use parentFolderId (existing folder's NodeID) if provided, otherwise look up parentFolderName
      let parentNodeUri = gallery.parentFolderId
        ? gallery.parentFolderId
        : gallery.parentFolderName
        ? folderMap.get(gallery.parentFolderName)
        : userNode;

      // Convert NodeID to URI format if needed (e.g., "abc123" -> "/api/v2/node/abc123")
      if (parentNodeUri && !parentNodeUri.startsWith('/api/v2/node/')) {
        parentNodeUri = `/api/v2/node/${parentNodeUri}`;
      }

      if (!parentNodeUri && (gallery.parentFolderName || gallery.parentFolderId)) {
        const errorMsg = `Cannot create gallery "${gallery.name}" - parent folder "${gallery.parentFolderName || gallery.parentFolderId}" not found`;
        console.error(errorMsg);
        errors.push(errorMsg);
        continue;
      }

      const parentFolderDisplay = gallery.parentFolderId
        ? `existing folder (${gallery.parentFolderId})`
        : gallery.parentFolderName || 'root';

      console.log(`\n📷 Creating gallery: "${gallery.name}" in folder: "${parentFolderDisplay}"`);

      const result = await createGallery(
        gallery,
        parentNodeUri || userNode,
        accessToken,
        accessTokenSecret,
        userNickname
      );

      if (result.success) {
        galleriesCreated++;
        console.log(`✅ Gallery "${gallery.name}" created and verified!\n`);
        if (result.uploadUrl) {
          uploadUrls.push({ galleryName: gallery.name, uploadUrl: result.uploadUrl });
          console.log(`🔗 Guest upload URL: ${result.uploadUrl}\n`);
        }
      } else {
        const errorMsg = `Failed to create gallery "${gallery.name}"`;
        console.error(`❌ ${errorMsg}\n`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n📊 Final summary: ${folderMap.size} folders, ${galleriesCreated} galleries created\n`);

    return NextResponse.json({
      success: errors.length === 0,
      foldersCreated: folderMap.size,
      galleriesCreated,
      uploadUrls: uploadUrls.length > 0 ? uploadUrls : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create structure';
    const status = message === 'Unauthorized' ? 401 : message === 'SmugMug account not connected' ? 409 : 500;
    console.error('Error creating structure:', error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}

// Sort folders so parents are created before children
function sortFoldersByHierarchy(folders: FolderNode[]): FolderNode[] {
  const sorted: FolderNode[] = [];
  const remaining = [...folders];

  // Add root-level folders first
  const rootFolders = remaining.filter(f => !f.parentFolderName);
  sorted.push(...rootFolders);
  remaining.splice(0, remaining.length, ...remaining.filter(f => f.parentFolderName));

  // Iteratively add children whose parents have been added
  while (remaining.length > 0) {
    const beforeLength = remaining.length;

    const canAdd = remaining.filter(folder =>
      sorted.some(s => s.name === folder.parentFolderName)
    );

    sorted.push(...canAdd);
    remaining.splice(0, remaining.length, ...remaining.filter(f =>
      !canAdd.includes(f)
    ));

    // Prevent infinite loop
    if (remaining.length === beforeLength) {
      console.error('Cannot resolve folder hierarchy for:', remaining);
      break;
    }
  }

  return sorted;
}

async function createFolder(
  folder: FolderNode,
  parentNodeId: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<string | null> {
  try {
    const folderUrl = `https://api.smugmug.com${parentNodeId}!children`;

    const requestData = {
      url: folderUrl,
      method: 'POST',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    // SmugMug requires UrlName to start with a capital letter
    const baseUrlName = folder.urlName || folder.name.replace(/\s+/g, '-');
    const capitalizedUrlName = baseUrlName.charAt(0).toUpperCase() + baseUrlName.slice(1);

    const payload = {
      Type: 'Folder',
      Name: folder.name,
      UrlName: capitalizedUrlName,
      Privacy: folder.privacy || 'Private',
    };

    console.log(`  → Sending folder creation request...`);
    console.log(`  → URL: ${folderUrl}`);
    console.log(`  → Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(folderUrl, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`  → Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ✗ Failed to create folder "${folder.name}"`);
      console.error(`  ✗ Status: ${response.status} ${response.statusText}`);
      console.error(`  ✗ SmugMug error response:`, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`  → Response data:`, JSON.stringify(data, null, 2));

    const createdFolderNodeUri = data.Response?.Node?.Uri;

    if (!createdFolderNodeUri) {
      console.error(`  ✗ No node URI returned for "${folder.name}"`);
      return null;
    }

    console.log(`  → Folder created, URI: ${createdFolderNodeUri}`);
    console.log(`  → Waiting 2 seconds for SmugMug to process...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // VERIFICATION: Fetch the folder back to confirm it exists
    console.log(`  → Verifying folder exists...`);
    const verifyUrl = `https://api.smugmug.com${createdFolderNodeUri}`;
    const verifyRequestData = { url: verifyUrl, method: 'GET' };
    const verifyAuthHeader = oauth.toHeader(
      oauth.authorize(verifyRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const verifyResponse = await fetch(verifyUrl, {
      headers: { ...verifyAuthHeader, Accept: 'application/json' },
    });

    if (!verifyResponse.ok) {
      console.error(`  ✗ Verification failed: Folder "${folder.name}" not found after creation`);
      return null;
    }

    const verifyData = await verifyResponse.json();
    const verifiedNodeUri = verifyData.Response.Node.Uri;

    console.log(`  ✓ Folder verified: "${folder.name}" (URI: ${verifiedNodeUri})`);
    return verifiedNodeUri;
  } catch (error) {
    console.error(`  ✗ Error creating folder "${folder.name}":`, error);
    return null;
  }
}

async function createGallery(
  gallery: GalleryNode,
  parentNodeId: string,
  accessToken: string,
  accessTokenSecret: string,
  userNickname: string
): Promise<{ success: boolean; uploadUrl?: string }> {
  try {
    // Ensure parentNodeId is properly formatted as a URI path
    const parentNodeUri = parentNodeId.startsWith('/api/v2/node/')
      ? parentNodeId
      : `/api/v2/node/${parentNodeId}`;
    const galleryUrl = `https://api.smugmug.com${parentNodeUri}!children`;

    const requestData = {
      url: galleryUrl,
      method: 'POST',
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    // SmugMug requires UrlName to start with a capital letter
    const baseUrlName = gallery.urlName || gallery.name.replace(/\s+/g, '-');
    const capitalizedUrlName = baseUrlName.charAt(0).toUpperCase() + baseUrlName.slice(1);

    const payload: any = {
      Type: 'Album',
      Name: gallery.name,
      UrlName: capitalizedUrlName,
      Privacy: gallery.privacy || 'Private',
      Description: gallery.description || '',
      Keywords: gallery.keywords ? gallery.keywords.join(', ') : '',
    };

    // Add AlbumTemplateUri if provided
    if (gallery.albumTemplateUri) {
      payload.AlbumTemplateUri = gallery.albumTemplateUri;
    }

    console.log(`  → Sending gallery creation request...`);
    console.log(`  → URL: ${galleryUrl}`);
    console.log(`  → Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(galleryUrl, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`  → Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`  ✗ Failed to create gallery "${gallery.name}"`);
      console.error(`  ✗ Status: ${response.status} ${response.statusText}`);
      console.error(`  ✗ SmugMug error response:`, errorText);
      return { success: false };
    }

    const data = await response.json();
    console.log(`  → Response data:`, JSON.stringify(data, null, 2));

    // When creating via !children endpoint, SmugMug returns a Node, not Album
    const createdNodeUri = data.Response?.Node?.Uri;
    const createdNodeId = data.Response?.Node?.NodeID;

    if (!createdNodeUri || !createdNodeId) {
      console.error(`  ✗ No node data returned for "${gallery.name}"`);
      return { success: false };
    }

    console.log(`  → Gallery created, NodeID: ${createdNodeId}`);
    console.log(`  → Waiting 2 seconds for SmugMug to process...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // VERIFICATION: Fetch the gallery back to confirm it exists
    console.log(`  → Verifying gallery exists...`);
    const verifyUrl = `https://api.smugmug.com${createdNodeUri}`;
    const verifyRequestData = { url: verifyUrl, method: 'GET' };
    const verifyAuthHeader = oauth.toHeader(
      oauth.authorize(verifyRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const verifyResponse = await fetch(verifyUrl, {
      headers: { ...verifyAuthHeader, Accept: 'application/json' },
    });

    if (!verifyResponse.ok) {
      console.error(`  ✗ Verification failed: Gallery "${gallery.name}" not found after creation`);
      return { success: false };
    }

    const verifyData = await verifyResponse.json();
    const verifiedNodeId = verifyData.Response.Node?.NodeID;
    const albumUri = verifyData.Response.Node?.Uris?.Album?.Uri;

    console.log(`  ✓ Gallery verified: "${gallery.name}" (NodeID: ${verifiedNodeId})`);

    // Step 3: If guest uploads enabled, PATCH the album to set UploadKey and GuestPassword
    let uploadUrl: string | undefined;

    if (gallery.enableGuestUploads && albumUri) {
      console.log(`  → Enabling guest uploads for "${gallery.name}"...`);

      // Generate a random upload key
      const uploadKey = crypto.randomBytes(16).toString('hex');
      const guestPassword = gallery.guestUploadPassword || crypto.randomBytes(8).toString('hex');

      const albumUrl = `https://api.smugmug.com${albumUri}`;
      const patchRequestData = { url: albumUrl, method: 'PATCH' };
      const patchAuthHeader = oauth.toHeader(
        oauth.authorize(patchRequestData, {
          key: accessToken,
          secret: accessTokenSecret,
        })
      );

      const patchResponse = await fetch(albumUrl, {
        method: 'PATCH',
        headers: {
          ...patchAuthHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          UploadKey: uploadKey,
          SecurityType: 'Password',
          Password: guestPassword,
        }),
      });

      if (!patchResponse.ok) {
        const errorText = await patchResponse.text();
        console.error(`  ✗ Failed to enable guest uploads:`, errorText);
      } else {
        const patchData = await patchResponse.json();
        const albumKey = patchData.Response?.Album?.AlbumKey;

        if (albumKey) {
          uploadUrl = `https://${userNickname}.smugmug.com/upload/${albumKey}/${uploadKey}/`;
          console.log(`  ✓ Guest uploads enabled! Password: ${guestPassword}`);
        }
      }
    }

    return { success: true, uploadUrl };
  } catch (error) {
    console.error(`  ✗ Error creating gallery "${gallery.name}":`, error);
    return { success: false };
  }
}
