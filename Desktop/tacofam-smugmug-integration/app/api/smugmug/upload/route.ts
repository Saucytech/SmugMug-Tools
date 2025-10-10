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

export async function POST(request: NextRequest) {
  try {
    const { accessToken, accessTokenSecret } = await requireSmugMugTokens();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const albumKey = formData.get('albumKey') as string;
    const fileName = formData.get('fileName') as string || file.name;
    const title = formData.get('title') as string;
    const caption = formData.get('caption') as string;
    const keywords = formData.get('keywords') as string;

    if (!file || !albumKey) {
      return NextResponse.json(
        { error: 'File and albumKey are required' },
        { status: 400 }
      );
    }

    // Step 1: Get upload endpoint for the album
    const uploadInfoUrl = `https://api.smugmug.com/api/v2/album/${albumKey}!uploadphotos`;
    const uploadInfoRequest = {
      url: uploadInfoUrl,
      method: 'GET',
    };

    const uploadInfoAuthHeader = oauth.toHeader(
      oauth.authorize(uploadInfoRequest, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const uploadInfoResponse = await fetch(uploadInfoUrl, {
      method: 'GET',
      headers: {
        ...uploadInfoAuthHeader,
        'Accept': 'application/json',
      },
    });

    if (!uploadInfoResponse.ok) {
      const errorData = await uploadInfoResponse.json();
      console.error('Failed to get upload info:', errorData);
      return NextResponse.json(
        { error: 'Failed to get upload endpoint' },
        { status: uploadInfoResponse.status }
      );
    }

    const uploadInfo = await uploadInfoResponse.json();
    const uploadUrl = uploadInfo.Response?.Album?.Uris?.UploadUri;

    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'No upload URL available for this album' },
        { status: 500 }
      );
    }

    // Step 2: Upload the image
    const imageBuffer = Buffer.from(await file.arrayBuffer());

    // Build upload headers
    const uploadHeaders: Record<string, string> = {
      'Content-Type': file.type,
      'X-Smug-AlbumKey': albumKey,
      'X-Smug-FileName': fileName,
      'X-Smug-ResponseType': 'JSON',
      'Content-Length': imageBuffer.length.toString(),
    };

    if (title) uploadHeaders['X-Smug-Title'] = title;
    if (caption) uploadHeaders['X-Smug-Caption'] = caption;
    if (keywords) uploadHeaders['X-Smug-Keywords'] = keywords;

    // Sign the upload request
    const uploadRequest = {
      url: uploadUrl,
      method: 'POST',
    };

    const uploadAuthHeader = oauth.toHeader(
      oauth.authorize(uploadRequest, {
        key: accessToken,
        secret: accessTokenSecret,
      })
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...uploadAuthHeader,
        ...uploadHeaders,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to upload image to SmugMug' },
        { status: uploadResponse.status }
      );
    }

    const uploadResult = await uploadResponse.json();

    return NextResponse.json({
      success: true,
      imageUri: uploadResult.Response?.Image?.ImageUri,
      imageKey: uploadResult.Response?.Image?.ImageKey,
      albumImageUri: uploadResult.Response?.Image?.AlbumImageUri,
      fileName: fileName,
    });

  } catch (error: any) {
    const message = error?.message ?? 'Failed to upload image';
    const status =
      message === 'Unauthorized'
        ? 401
        : message === 'SmugMug account not connected'
        ? 409
        : 500;
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
