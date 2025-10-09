import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import archiver from 'archiver';
import { Readable } from 'stream';

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
export const maxDuration = 300; // 5 minutes max

/**
 * POST /api/download/create-zip
 * Creates a ZIP file with photos from selected albums, preserving folder structure
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('smugmug_access_token')?.value;
    const accessTokenSecret = request.cookies.get('smugmug_access_token_secret')?.value;

    if (!accessToken || !accessTokenSecret) {
      return NextResponse.json(
        { error: 'Not authenticated with SmugMug' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { albumKeys, imageSize = 'Original' } = body;

    if (!Array.isArray(albumKeys) || albumKeys.length === 0) {
      return NextResponse.json(
        { error: 'albumKeys must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get user info to get folder structure
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
    const nickname = userData.Response.User.NickName;

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Compression level
    });

    // Create a ReadableStream from the archiver
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Pipe archive data to the writer
    archive.on('data', (chunk) => {
      writer.write(chunk);
    });

    archive.on('end', () => {
      writer.close();
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      writer.abort(err);
    });

    // Track statistics
    let totalImages = 0;
    let successfulDownloads = 0;
    let failedDownloads = 0;

    // Start building the ZIP in the background
    (async () => {
      try {
        console.log(`📦 Starting ZIP creation for ${albumKeys.length} albums...`);

        for (const albumKey of albumKeys) {
          // Get album info
          const albumResponse = await fetchWithAuth(
            `https://api.smugmug.com/api/v2/album/${albumKey}`,
            accessToken,
            accessTokenSecret
          );

          if (!albumResponse) {
            console.error(`❌ Failed to fetch album info for ${albumKey}`);
            continue;
          }

          const album = albumResponse.Response.Album;
          const albumName = sanitizeFilename(album.Name);

          // Get album path from Uris.Node
          let folderPath = '';
          if (album.Uris?.Node?.Uri) {
            const nodeResponse = await fetchWithAuth(
              `https://api.smugmug.com${album.Uris.Node.Uri}`,
              accessToken,
              accessTokenSecret
            );

            if (nodeResponse?.Response?.Node) {
              const urlPath = nodeResponse.Response.Node.UrlPath || '';
              folderPath = urlPath.replace(`/${nickname}/`, '').replace(/\//g, '/');
            }
          }

          // Get images from album
          const imagesResponse = await fetchWithAuth(
            `https://api.smugmug.com/api/v2/album/${albumKey}!images`,
            accessToken,
            accessTokenSecret
          );

          if (!imagesResponse?.Response?.AlbumImage) {
            console.error(`❌ Failed to fetch images for album ${albumName}`);
            continue;
          }

          const images = Array.isArray(imagesResponse.Response.AlbumImage)
            ? imagesResponse.Response.AlbumImage
            : [imagesResponse.Response.AlbumImage];

          console.log(`📸 Processing ${images.length} images from album "${albumName}"...`);
          totalImages += images.length;

          // Download and add each image to ZIP
          for (const image of images) {
            try {
              // Get image URL based on requested size
              let imageUrl: string | null = null;

              // Map requested size to SmugMug URL structure
              if (imageSize === 'Original') {
                // Try archived URI first (best for originals), then fall back to Original URL
                imageUrl = image.ArchivedUri || image.Uris?.OriginalImage?.Url || null;
              } else if (imageSize === 'Large') {
                imageUrl = image.Uris?.LargeImage?.Url || null;
              } else if (imageSize === 'Medium') {
                imageUrl = image.Uris?.MediumImage?.Url || null;
              } else if (imageSize === 'Small') {
                imageUrl = image.Uris?.SmallImage?.Url || null;
              } else if (imageSize === 'Thumb') {
                imageUrl = image.Uris?.ThumbImage?.Url || image.ThumbnailUrl || null;
              }

              // Final fallback: try largest available
              if (!imageUrl) {
                imageUrl = image.ArchivedUri ||
                          image.Uris?.OriginalImage?.Url ||
                          image.Uris?.LargeImage?.Url ||
                          image.Uris?.MediumImage?.Url ||
                          image.ThumbnailUrl ||
                          null;
              }

              if (!imageUrl) {
                failedDownloads++;
                console.error(`❌ No image URL found for ${image.FileName || image.ImageKey} (requested size: ${imageSize})`);
                console.error(`   Available URIs:`, JSON.stringify(image.Uris, null, 2));
                continue;
              }

              // Download the image
              const imageData = await fetch(imageUrl);
              if (!imageData.ok) {
                failedDownloads++;
                console.error(`❌ Failed to download image ${image.FileName || image.ImageKey} (HTTP ${imageData.status})`);
                continue;
              }

              const imageBuffer = Buffer.from(await imageData.arrayBuffer());

              // Determine file path in ZIP
              const filename = sanitizeFilename(image.FileName || `${image.ImageKey}.jpg`);
              const zipPath = folderPath
                ? `${folderPath}/${albumName}/${filename}`
                : `${albumName}/${filename}`;

              // Add to archive
              archive.append(imageBuffer, { name: zipPath });
              successfulDownloads++;

              // Log progress every 10 images
              if (successfulDownloads % 10 === 0) {
                console.log(`✅ Downloaded ${successfulDownloads}/${totalImages} images...`);
              }

              // Small delay to avoid overwhelming the server
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (err) {
              failedDownloads++;
              console.error(`❌ Error processing image ${image.FileName || image.ImageKey}:`, err instanceof Error ? err.message : err);
              // Continue with next image
            }
          }
        }

        // Log final summary
        console.log(`\n📊 ZIP Creation Summary:`);
        console.log(`   Total images found: ${totalImages}`);
        console.log(`   ✅ Successfully downloaded: ${successfulDownloads}`);
        console.log(`   ❌ Failed: ${failedDownloads}`);
        console.log(`   Success rate: ${totalImages > 0 ? ((successfulDownloads / totalImages) * 100).toFixed(1) : 0}%`);

        // Finalize the archive
        console.log(`📦 Finalizing ZIP archive...`);
        await archive.finalize();
        console.log(`✅ ZIP archive finalized!`);
      } catch (err) {
        console.error('💥 ZIP creation error:', err);
        archive.destroy();
        writer.abort(err);
      }
    })();

    // Return the stream as response
    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="SmugMug-Export-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error('Create ZIP error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create ZIP' },
      { status: 500 }
    );
  }
}

async function fetchWithAuth(url: string, accessToken: string, accessTokenSecret: string) {
  const requestData = {
    url,
    method: 'GET',
  };

  const authHeader = oauth.toHeader(
    oauth.authorize(requestData, {
      key: accessToken,
      secret: accessTokenSecret,
    })
  );

  const response = await fetch(requestData.url, {
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

function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters
  return filename
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
