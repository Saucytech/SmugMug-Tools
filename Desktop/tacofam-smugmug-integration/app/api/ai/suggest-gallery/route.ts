import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { metadata, galleryIndex } = await request.json();

    if (!metadata || !galleryIndex || galleryIndex.length === 0) {
      return NextResponse.json(
        { error: 'Metadata and gallery index required' },
        { status: 400 }
      );
    }

    // Build gallery context for AI
    const galleryContext = galleryIndex.map((g: any) => {
      return `Gallery: "${g.name}"
- Themes: ${g.themes?.join(', ') || 'N/A'}
- Subjects: ${g.subjects?.join(', ') || 'N/A'}
- Date Range: ${g.dateRange || 'N/A'}
- Location: ${g.location || 'N/A'}
- Summary: ${g.summary || 'N/A'}`;
    }).join('\n\n');

    const metadataText = Object.entries(metadata)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Cheaper model for testing (~90% less cost than Sonnet)
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are analyzing a photo to determine which gallery it belongs in.

**Photo Metadata:**
${metadataText}

**Available Galleries:**
${galleryContext}

**Your task**: Determine which gallery this photo best fits into. Return a confidence score (0-100) and reasoning.

**Provide your response in this exact JSON format**:
{
  "suggestedGallery": "exact gallery name",
  "confidence": 85,
  "reasoning": "brief explanation why this gallery is the best match"
}

Guidelines:
- Match based on themes, subjects, dates, and location
- Confidence 90-100: Perfect match (auto-approve)
- Confidence 70-89: Good match but needs review
- Confidence <70: Poor match (skip)

Return ONLY the JSON object, no other text.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the AI response
    let suggestion;
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      suggestion = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...suggestion,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    });

  } catch (error: any) {
    console.error('Error suggesting gallery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest gallery' },
      { status: 500 }
    );
  }
}
