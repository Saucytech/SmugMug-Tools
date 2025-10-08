import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { cookies } from 'next/headers';

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

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('smugmug_access_token')?.value;
  const accessTokenSecret = cookieStore.get('smugmug_access_token_secret')?.value;

  if (!accessToken || !accessTokenSecret) {
    return NextResponse.json(
      { error: 'Not authenticated with SmugMug' },
      { status: 401 }
    );
  }

  try {
    const { nodeId, type } = await request.json();

    if (!nodeId) {
      return NextResponse.json(
        { error: 'nodeId is required' },
        { status: 400 }
      );
    }

    console.log(`\n🗑️  Deleting ${type || 'node'}: ${nodeId}`);

    // Delete the node using SmugMug API
    const deleteUrl = `https://api.smugmug.com/api/v2/node/${nodeId}`;

    const requestData = {
      url: deleteUrl,
      method: 'DELETE' as const,
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        ...authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error(`❌ Failed to delete ${type || 'node'}:`, errorText);
      return NextResponse.json(
        { error: `Failed to delete ${type || 'node'}`, details: errorText },
        { status: deleteResponse.status }
      );
    }

    const result = await deleteResponse.json();
    console.log(`✅ Successfully deleted ${type || 'node'}: ${nodeId}`);

    return NextResponse.json({
      success: true,
      message: `${type || 'Node'} deleted successfully`,
      result,
    });

  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: 'Failed to delete node', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
