import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { images, galleryName, albumKey } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    // Extract metadata from images (titles, captions, keywords, dates)
    const metadataTexts = images.slice(0, 20).map((img: any) => {
      const parts = [];
      if (img.Title) parts.push(`Title: ${img.Title}`);
      if (img.Caption) parts.push(`Caption: ${img.Caption}`);
      if (img.Keywords) parts.push(`Keywords: ${img.Keywords}`);
      if (img.Date) parts.push(`Date: ${img.Date}`);
      if (img.FileName) parts.push(`Filename: ${img.FileName}`);
      return parts.join(' | ');
    }).filter(Boolean);

    const metadataBlock = metadataTexts.join('\n');

    // Use AI to analyze metadata instead of images
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Cheaper model for testing (~90% less cost than Sonnet)
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze the metadata from photos in a SmugMug gallery named "${galleryName}". Create a comprehensive index based on the following image metadata:

${metadataBlock}

**Your task**: Create an index entry describing this gallery's content, themes, and characteristics based on the metadata.

**Provide your response in this exact JSON format**:
{
  "themes": ["theme1", "theme2", "theme3"],
  "subjects": ["subject1", "subject2"],
  "dateRange": "estimated date range",
  "location": "location if identifiable or null",
  "photoStyle": "inferred style from metadata",
  "colorPalette": "inferred palette or N/A",
  "summary": "2-3 sentence description of gallery content"
}

Return ONLY the JSON object, no other text.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the AI response - handle markdown code blocks
    let analysis;
    try {
      // Remove markdown code block wrappers if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI analysis' },
        { status: 500 }
      );
    }

    // Extract sample image URLs - SmugMug provides URLs in Uris object
    const sampleImageUrls = images.slice(0, 5).map((img: any) => {
      // Try different URL sources in order of preference
      if (img.Uris?.ImageSizeDetails?.ImageSizeCustom) {
        return img.Uris.ImageSizeDetails.ImageSizeCustom;
      }
      if (img.Uris?.SmallUrl) {
        return img.Uris.SmallUrl;
      }
      if (img.Uris?.ThumbnailUrl) {
        return img.Uris.ThumbnailUrl;
      }
      if (img.ArchivedUri) {
        return img.ArchivedUri;
      }
      if (img.ThumbnailUrl) {
        return img.ThumbnailUrl;
      }
      return '';
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      analysis: {
        albumKey,
        galleryName,
        ...analysis,
        imageCount: images.length,
        sampledImageCount: Math.min(images.length, 20),
        lastIndexed: new Date().toISOString(),
        sampleImages: sampleImageUrls,
      },
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    });

  } catch (error: any) {
    console.error('Error analyzing gallery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze gallery' },
      { status: 500 }
    );
  }
}
