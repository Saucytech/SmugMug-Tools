import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Uploaded photo analyzer for SmugMug gallery placement.

**YOUR ROLE:**
Analyze uploaded photos visually and match them to the best existing gallery based on content, style, and themes.

**ANALYSIS CRITERIA:**

1. **Visual Style** - Photography style, quality, composition
2. **Subject Matter** - What's in the photo (people, places, objects)
3. **Setting/Location** - Indoor/outdoor, specific locations
4. **Photo Type** - Portrait, landscape, event, product, etc.
5. **Theme/Mood** - Overall feeling and theme

**CONFIDENCE SCORING:**
- **90-100%**: Perfect match with clear visual and thematic alignment
- **70-89%**: Good match with some uncertainty
- **<70%**: Weak match, needs manual review

**OUTPUT FORMAT:**
Return ONLY a JSON object:
{
  "suggestedGallery": "exact gallery name",
  "confidence": 85,
  "reasoning": "brief explanation why this gallery matches",
  "visualAnalysis": "description of what you see in the photo"
}

Be conservative with confidence scores. Accuracy matters more than speed.`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('getSystemPrompt') === 'true') {
    return NextResponse.json({ systemPrompt: SYSTEM_PROMPT, model: MODEL });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, metadata, galleryIndex, customPrompt, model } = await request.json();

    if (!imageBase64 || !galleryIndex || galleryIndex.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use custom prompt if provided, otherwise use default SYSTEM_PROMPT
    const promptToUse = customPrompt || SYSTEM_PROMPT;

    // Build prompt for analyzing uploaded photo
    const prompt = `${promptToUse}

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

Provide your analysis in the exact JSON format specified above.`;

    const message = await anthropic.messages.create({
      model: model || MODEL,
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
    } catch (_parseError) {
      console.error('Error parsing AI response:', _parseError);
      analysis = {
        suggestedGallery: 'Unknown',
        confidence: 0,
        reasoning: 'Error parsing AI response',
        visualAnalysis: responseText,
      };
    }

    return NextResponse.json({
      ...analysis,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });

  } catch (_error) {
    console.error('Error analyzing uploaded photo:', _error);
    return NextResponse.json(
      { error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}