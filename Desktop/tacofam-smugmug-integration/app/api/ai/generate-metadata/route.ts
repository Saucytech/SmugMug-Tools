import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const SYSTEM_PROMPT = `Analyze photographs and generate professional metadata (titles, captions, keywords).

**METADATA GENERATION RULES:**

1. **Titles**:
   - Compelling and professional
   - Concise (3-8 words ideal)
   - Avoid generic phrases like "Beautiful Photo"

2. **Captions**:
   - Descriptive but succinct (1-2 sentences)
   - Focus on what the photo shows
   - Include mood, composition, and subject details

3. **Keywords**:
   - 8-12 relevant keywords
   - Semicolon-separated
   - Mix of specific and general terms
   - Include: subject, style, technique, colors, mood, use cases

**FOCUS AREAS:**
- Subject matter and composition
- Photography style and technique
- Colors, lighting, and atmosphere
- Mood and emotional impact
- Potential commercial/editorial use cases

**OUTPUT FORMAT:**
Return ONLY valid JSON with requested fields:
{
  "title": "Your Title Here",
  "caption": "Your caption here.",
  "keywords": "keyword1;keyword2;keyword3"
}`;

export async function GET(request: NextRequest) {
  // Return system prompt if requested
  const { searchParams } = new URL(request.url);
  if (searchParams.get('getSystemPrompt') === 'true') {
    return NextResponse.json({ systemPrompt: SYSTEM_PROMPT });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
    const {
      imageUrl,
      fileName,
      existingTitle,
      existingCaption,
      existingKeywords,
      generateTitle,
      generateCaption,
      generateKeywords,
      promptStyle
    } = body;

    // Use Claude AI with vision to analyze the image
    let metadata;

    if (process.env.ANTHROPIC_API_KEY) {
      metadata = await generateWithClaude(
        imageUrl,
        fileName,
        existingTitle,
        existingCaption,
        existingKeywords,
        generateTitle,
        generateCaption,
        generateKeywords,
        promptStyle
      );
    } else {
      // Fallback to filename-based generation if no API key
      console.warn('No ANTHROPIC_API_KEY found, using fallback metadata generation');
      metadata = generateFallbackMetadata(
        fileName,
        existingTitle,
        existingCaption,
        existingKeywords,
        generateTitle,
        generateCaption,
        generateKeywords
      );
    }

    return NextResponse.json(metadata);
  } catch (_error) {
    console.error('Error generating metadata:', _error);

    // Fallback to filename-based generation on error
    // Use already parsed body to avoid reading request twice
    if (body) {
      const metadata = generateFallbackMetadata(
        body.fileName,
        body.existingTitle,
        body.existingCaption,
        body.existingKeywords,
        body.generateTitle,
        body.generateCaption,
        body.generateKeywords
      );
      return NextResponse.json(metadata);
    }

    return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
  }
}

async function generateWithClaude(
  imageUrl: string,
  fileName: string,
  existingTitle?: string,
  existingCaption?: string,
  existingKeywords?: string,
  generateTitle?: boolean,
  generateCaption?: boolean,
  generateKeywords?: boolean,
  _promptStyle?: string
) {
  // Fetch the image and convert to base64
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');

  // Determine media type
  const mediaType = imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Build prompt based on which fields to generate
  const fieldsToGenerate = [];
  if (generateTitle) fieldsToGenerate.push(`1. A compelling, professional title`);
  if (generateCaption) fieldsToGenerate.push(`2. A descriptive caption (1-2 sentences)`);
  if (generateKeywords) fieldsToGenerate.push(`3. Relevant keywords (8-12 keywords, semicolon-separated)`);

  const prompt = `Analyze this photograph and generate professional metadata for it.

${existingTitle && !generateTitle ? `Current Title (DO NOT MODIFY): ${existingTitle}` : ''}
${existingCaption && !generateCaption ? `Current Caption (DO NOT MODIFY): ${existingCaption}` : ''}
${existingKeywords && !generateKeywords ? `Current Keywords (DO NOT MODIFY): ${existingKeywords}` : ''}

Please provide ONLY the following fields:
${fieldsToGenerate.join('\n')}

Focus on:
- What the photo shows (subject, composition, mood)
- Photography style and technique
- Colors, lighting, and atmosphere
- Potential use cases (commercial, editorial, etc.)

Return ONLY valid JSON with these exact fields:
{
  ${generateTitle ? '"title": "Your Title Here",' : ''}
  ${generateCaption ? '"caption": "Your caption here.",' : ''}
  ${generateKeywords ? '"keywords": "keyword1;keyword2;keyword3"' : ''}
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
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

  // Extract JSON from response
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Try to parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const generated = JSON.parse(jsonMatch[0]);

    // Return only generated fields + existing fields for non-generated ones
    return {
      title: generateTitle ? generated.title : existingTitle,
      caption: generateCaption ? generated.caption : existingCaption,
      keywords: generateKeywords ? generated.keywords : existingKeywords,
    };
  }

  // If no JSON found, use fallback
  throw new Error('Failed to parse Claude response');
}

function generateFallbackMetadata(
  fileName: string,
  existingTitle?: string,
  existingCaption?: string,
  existingKeywords?: string,
  generateTitle?: boolean,
  generateCaption?: boolean,
  generateKeywords?: boolean
) {
  // Extract meaningful info from filename
  const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const words = fileNameWithoutExt.split(/[-_\s]+/).filter((w: string) => w.length > 0);

  return {
    title: (generateTitle !== false) ? generateTitleFromFilename(words, existingTitle) : existingTitle,
    caption: (generateCaption !== false) ? generateCaptionFromFilename(words, fileName, existingCaption) : existingCaption,
    keywords: (generateKeywords !== false) ? generateKeywordsFromFilename(words, fileName, existingKeywords) : existingKeywords,
  };
}

function generateTitleFromFilename(words: string[], existingTitle?: string): string {
  if (existingTitle && existingTitle.trim()) {
    return existingTitle; // Keep existing if present
  }

  // Capitalize and join words to create a title
  const titleWords = words.map(word => {
    // Don't capitalize common small words unless they're first
    const smallWords = ['a', 'an', 'the', 'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up', 'and', 'as', 'but', 'or', 'nor'];
    if (smallWords.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  // Capitalize first word
  if (titleWords.length > 0) {
    titleWords[0] = titleWords[0].charAt(0).toUpperCase() + titleWords[0].slice(1);
  }

  return titleWords.join(' ') || 'Untitled Photo';
}

function generateCaptionFromFilename(words: string[], fileName: string, existingCaption?: string): string {
  if (existingCaption && existingCaption.trim()) {
    return existingCaption; // Keep existing if present
  }

  // Create a more descriptive caption
  const title = generateTitleFromFilename(words);

  // Add context based on filename patterns
  const patterns = {
    date: /(\d{4})[-_]?(\d{2})[-_]?(\d{2})/,
    time: /(\d{2})[-_]?(\d{2})[-_]?(\d{2})/,
    sequence: /(\d{4,})/,
  };

  let context = '';

  // Check for date pattern
  const dateMatch = fileName.match(patterns.date);
  if (dateMatch) {
    const [_, year, month, day] = dateMatch;
    context += ` Captured on ${month}/${day}/${year}.`;
  }

  // Check for sequence number
  const seqMatch = fileName.match(patterns.sequence);
  if (seqMatch && !dateMatch) {
    context += ` Image #${seqMatch[1]}.`;
  }

  // Detect photo type from keywords
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.includes('portrait')) {
    context += ' Portrait photography.';
  } else if (lowerFileName.includes('landscape')) {
    context += ' Landscape photography.';
  } else if (lowerFileName.includes('macro') || lowerFileName.includes('close')) {
    context += ' Macro photography.';
  } else if (lowerFileName.includes('event') || lowerFileName.includes('wedding')) {
    context += ' Event photography.';
  }

  return title + (context || ' Professional photography.');
}

function generateKeywordsFromFilename(words: string[], fileName: string, existingKeywords?: string): string {
  if (existingKeywords && existingKeywords.trim()) {
    return existingKeywords; // Keep existing if present
  }

  const keywords = new Set<string>();

  // Add words from filename
  words.forEach(word => {
    if (word.length > 2) {
      keywords.add(word.toLowerCase());
    }
  });

  // Add category-based keywords
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.includes('portrait')) {
    keywords.add('portrait');
    keywords.add('people');
    keywords.add('person');
  }

  if (lowerFileName.includes('landscape')) {
    keywords.add('landscape');
    keywords.add('nature');
    keywords.add('scenery');
  }

  if (lowerFileName.includes('sunset') || lowerFileName.includes('sunrise')) {
    keywords.add('sunset');
    keywords.add('sky');
    keywords.add('golden hour');
  }

  if (lowerFileName.includes('beach') || lowerFileName.includes('ocean') || lowerFileName.includes('sea')) {
    keywords.add('beach');
    keywords.add('ocean');
    keywords.add('water');
  }

  if (lowerFileName.includes('mountain') || lowerFileName.includes('hill')) {
    keywords.add('mountain');
    keywords.add('hiking');
    keywords.add('outdoor');
  }

  if (lowerFileName.includes('city') || lowerFileName.includes('urban')) {
    keywords.add('city');
    keywords.add('urban');
    keywords.add('architecture');
  }

  if (lowerFileName.includes('food')) {
    keywords.add('food');
    keywords.add('cuisine');
    keywords.add('dining');
  }

  if (lowerFileName.includes('macro') || lowerFileName.includes('close')) {
    keywords.add('macro');
    keywords.add('close-up');
    keywords.add('detail');
  }

  if (lowerFileName.includes('wedding')) {
    keywords.add('wedding');
    keywords.add('celebration');
    keywords.add('event');
  }

  if (lowerFileName.includes('sport') || lowerFileName.includes('action')) {
    keywords.add('sports');
    keywords.add('action');
    keywords.add('athletic');
  }

  // Always add generic photography keywords
  keywords.add('photography');
  keywords.add('photo');

  // Convert to array and join with semicolons (SmugMug format)
  return Array.from(keywords).slice(0, 15).join(';');
}
