import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { encryption } from '@/lib/encryption';
import { db } from '@/lib/db';

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

export const dynamic = 'force-dynamic';

interface FolderNode {
  name: string;
  path: string;
  nodeId?: string;
  urlPath?: string;
  albums: Array<{
    albumKey: string;
    name: string;
    imageCount: number;
  }>;
  subfolders: FolderNode[];
  totalImages: number;
}

/**
 * GET /api/smugmug/folder-tree
 * Fetches the complete folder hierarchy with albums and image counts
 */
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    // Get encrypted tokens from database
    const userId = (session.user as any).id;
    const tokenData = await db.getSmugMugTokens(userId);

    if (!tokenData) {
      return NextResponse.json(
        { error: 'SmugMug account not connected. Please connect your SmugMug account.' },
        { status: 401 }
      );
    }

    // Decrypt tokens
    const accessToken = encryption.decrypt(tokenData.access_token_encrypted);
    const accessTokenSecret = encryption.decrypt(tokenData.token_secret_encrypted);

    // First, get the authenticated user to get their nickname
    const userRequestData = {
      url: 'https://api.smugmug.com/api/v2!authuser',
      method: 'GET',
    };

    const userAuthHeader = oauth.toHeader(
      oauth.authorize(userRequestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const userResponse = await fetch(userRequestData.url, {
      headers: {
        ...userAuthHeader,
        Accept: 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user information');
    }

    const userData = await userResponse.json();
    const user = userData.Response.User;
    const nickname = user.NickName;

    // Get the user's root node URI
    if (!user.Uris?.Node?.Uri) {
      throw new Error('User does not have a root node URI');
    }

    const rootNodeUrl = `https://api.smugmug.com${user.Uris.Node.Uri}`;

    const folderTree = await fetchNodeRecursive(
      rootNodeUrl,
      accessToken,
      accessTokenSecret,
      nickname // Root folder name
    );

    return NextResponse.json({ folderTree });
  } catch (error) {
    console.error('Folder tree error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch folder tree' },
      { status: 500 }
    );
  }
}

async function fetchNodeRecursive(
  nodeUrl: string,
  accessToken: string,
  accessTokenSecret: string,
  nodeName: string,
  parentPath: string = ''
): Promise<FolderNode> {
  // Fetch node data
  const nodeData = await fetchWithAuth(nodeUrl, accessToken, accessTokenSecret);

  if (!nodeData?.Response?.Node) {
    console.error(`Failed to fetch node: ${nodeUrl}`);
    return {
      name: nodeName,
      path: parentPath ? `${parentPath}/${nodeName}` : nodeName,
      albums: [],
      subfolders: [],
      totalImages: 0,
    };
  }

  const node = nodeData.Response.Node;
  const currentPath = parentPath ? `${parentPath}/${nodeName}` : nodeName;

  const albums: Array<{ albumKey: string; name: string; imageCount: number }> = [];
  const subfolders: FolderNode[] = [];
  let totalImages = 0;

  // Fetch child nodes
  if (node.Uris?.ChildNodes?.Uri) {
    const childNodesData = await fetchWithAuth(node.Uris.ChildNodes.Uri, accessToken, accessTokenSecret);

    if (childNodesData?.Response?.Node) {
      const nodeList = Array.isArray(childNodesData.Response.Node)
        ? childNodesData.Response.Node
        : [childNodesData.Response.Node];

      for (const childNode of nodeList) {
        if (childNode.Type === 'Album') {
          // This is an album - fetch its details to get the AlbumKey and image count
          if (childNode.Uris?.Album?.Uri) {
            const albumData = await fetchWithAuth(childNode.Uris.Album.Uri, accessToken, accessTokenSecret);

            if (albumData?.Response?.Album) {
              const album = albumData.Response.Album;
              const imageCount = album.ImageCount || 0;
              albums.push({
                albumKey: album.AlbumKey,
                name: childNode.Name,
                imageCount,
              });
              totalImages += imageCount;
            }
          }
        } else if (childNode.Type === 'Folder') {
          // This is a subfolder - recursively fetch its contents
          const subfolderNode = await fetchNodeRecursive(
            childNode.Uri,
            accessToken,
            accessTokenSecret,
            childNode.Name,
            currentPath
          );
          subfolders.push(subfolderNode);
          totalImages += subfolderNode.totalImages;
        }
        // Skip other node types (Page, etc.)
      }
    }
  }

  return {
    name: nodeName,
    path: currentPath,
    nodeId: node.NodeID,
    urlPath: node.UrlPath,
    albums,
    subfolders,
    totalImages,
  };
}

async function fetchWithAuth(url: string, accessToken: string, accessTokenSecret: string) {
  // Ensure URL is absolute
  const fullUrl = url.startsWith('http') ? url : `https://api.smugmug.com${url}`;

  const requestData = {
    url: fullUrl,
    method: 'GET' as const,
  };

  const authHeader = oauth.toHeader(
    oauth.authorize(requestData, {
      key: accessToken,
      secret: accessTokenSecret,
    })
  );

  const response = await fetch(fullUrl, {
    headers: {
      ...authHeader,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
