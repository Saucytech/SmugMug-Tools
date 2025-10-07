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

export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const accessToken = request.headers.get('x-access-token');
    const accessTokenSecret = request.headers.get('x-access-token-secret');

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Missing authentication tokens' },
        { status: 401 }
      );
    }

    const { nodeId } = params;

    // Build folder path by traversing up the tree
    const path: string[] = [];
    let currentNodeId = nodeId;

    while (currentNodeId) {
      const nodeUrl = `https://api.smugmug.com/api/v2/node/${currentNodeId}`;
      const requestData = {
        url: nodeUrl,
        method: 'GET',
      };

      const authHeader = oauth.toHeader(
        oauth.authorize(requestData, {
          key: accessToken,
          secret: accessTokenSecret,
        })
      );

      const response = await fetch(nodeUrl, {
        method: 'GET',
        headers: {
          ...authHeader,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch node ${currentNodeId}`);
        break;
      }

      const data = await response.json();
      const node = data.Response?.Node;

      if (!node) break;

      // Add node name to path (prepend to build path from child to root)
      path.unshift(node.Name);

      // Move to parent
      const parentNodeId = node.Uris?.ParentNode?.Uri?.split('/').pop();

      // Stop if no parent or if we've reached the root
      if (!parentNodeId || parentNodeId === currentNodeId) {
        break;
      }

      currentNodeId = parentNodeId;
    }

    // If path is empty or only has one element, add "Root"
    if (path.length === 0) {
      path.push('Root');
    } else if (path.length > 0 && path[0] !== 'Root') {
      path.unshift('Root');
    }

    return NextResponse.json({
      success: true,
      path: path,
      fullPath: path.join(' → '),
    });

  } catch (error: any) {
    console.error('Error getting folder path:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get folder path' },
      { status: 500 }
    );
  }
}
