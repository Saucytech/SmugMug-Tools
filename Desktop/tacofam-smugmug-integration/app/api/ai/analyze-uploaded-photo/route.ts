import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, metadata, galleryIndex } = await request.json();

    if (!imageBase64 || !galleryIndex || galleryIndex.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Build prompt for analyzing uploaded photo
    const prompt = `Analyze this uploaded photo and suggest the best matching gallery from the indexed galleries.

Photo metadata:
- Filename: ${metadata.filename || 'Unknown'}
- Date taken: ${metadata.date || 'Unknown'}
- Size: ${metadata.size ? (metadata.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}

Available galleries (with their AI-analyzed themes and characteristics):
${galleryIndex.map((gallery: any) => `
Gallery: "${gallery.name}"
- Themes: ${gallery.themes?.join(', ') || 'None'}
- Subjects: ${gallery.subjects?.join(', ') || 'None'}
- Photo Style: ${gallery.photoStyle || 'Not specified'}
- Date Range: ${gallery.dateRange || 'Not specified'}
- Location: ${gallery.location || 'Not specified'}
- Summary: ${gallery.summary || 'No summary'}
`).join('\n---\n')}

Based on the visual content, style, and characteristics of this uploaded photo, which gallery would be the BEST match?

Return a JSON object with:
- suggestedGallery: the exact gallery name that best matches
- confidence: a percentage (0-100) of how confident you are
- reasoning: a brief explanation of why this gallery is the best match
- visualAnalysis: what you see in the photo (subjects, style, setting, etc.)

Consider:
1. Visual style and quality
2. Subject matter and content
3. Setting and location
4. Photo type (portrait, landscape, event, etc.)
5. Overall theme and mood

Be conservative with confidence scores:
- 90-100%: Perfect match with clear visual and thematic alignment
- 70-89%: Good match with some uncertainty
- Below 70%: Weak match, may need manual review`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: metadata.type || 'image/jpeg',
                data: imageBase64.split(',')[1] || imageBase64, // Handle both with and without data URL prefix
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from the response
    let analysis;
    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: parse the text response
        analysis = {
          suggestedGallery: 'Unknown',
          confidence: 0,
          reasoning: 'Could not parse AI response',
          visualAnalysis: responseText,
        };
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      analysis = {
        suggestedGallery: 'Unknown',
        confidence: 0,
        reasoning: 'Error parsing AI response',
        visualAnalysis: responseText,
      };
    }

    return NextResponse.json({
      ...analysis,
      tokensUsed: message.usage?.input_tokens || 0 + message.usage?.output_tokens || 0,
    });

  } catch (error) {
    console.error('Error analyzing uploaded photo:', error);
    return NextResponse.json(
      { error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}