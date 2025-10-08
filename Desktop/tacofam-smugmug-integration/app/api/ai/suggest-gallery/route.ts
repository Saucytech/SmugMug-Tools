import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-3-5-haiku-20241022';

const SYSTEM_PROMPT = `Photo-to-gallery matcher for SmugMug photo organization.

**YOUR ROLE:**
Analyze photo metadata to determine which existing gallery it best belongs in.

**MATCHING CRITERIA:**

1. **Themes** - Match photo themes with gallery themes
2. **Subjects** - Match subjects (people, places, objects)
3. **Date/Time** - Match date ranges when available
4. **Location** - Match geographic locations
5. **Content** - Overall content alignment with gallery summary

**CONFIDENCE SCORING:**
- **90-100**: Perfect match - auto-approve safe
- **70-89**: Good match - needs review
- **<70**: Poor match - skip

**OUTPUT FORMAT:**
Return ONLY a JSON object:
{
  "suggestedGallery": "exact gallery name",
  "confidence": 85,
  "reasoning": "brief explanation why this gallery is the best match"
}

Be accurate and thorough in matching. Explain your reasoning clearly.`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('getSystemPrompt') === 'true') {
    return NextResponse.json({ systemPrompt: SYSTEM_PROMPT, model: MODEL });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const { metadata, galleryIndex, customPrompt, model } = await request.json();

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

    // Use custom prompt if provided, otherwise use default SYSTEM_PROMPT
    const promptToUse = customPrompt || SYSTEM_PROMPT;

    const message = await anthropic.messages.create({
      model: model || MODEL, // Cheaper model for testing (~90% less cost than Sonnet)
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `${promptToUse}

**Photo Metadata:**
${metadataText}

**Available Galleries:**
${galleryContext}

Provide your analysis in the exact JSON format specified above. Return ONLY the JSON object, no other text.`,
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
    } catch (_parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...suggestion,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });

  } catch (error: any) {
    console.error('Error suggesting gallery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest gallery' },
      { status: 500 }
    );
  }
}
