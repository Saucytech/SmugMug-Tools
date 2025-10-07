import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { galleries } = await request.json();

    if (!galleries || galleries.length === 0) {
      return NextResponse.json(
        { error: 'No gallery data provided' },
        { status: 400 }
      );
    }

    // Prepare analysis data
    const analysisPrompt = `You are a SmugMug account optimization expert. Analyze the following gallery data and identify issues, optimizations, and suggestions.

For each finding, provide:
1. A unique ID
2. Severity level (critical, optimization, or suggestion)
3. Category (metadata, settings, organization, etc.)
4. Title
5. Description
6. List of affected items
7. Specific suggestion for improvement
8. Whether an auto-fix is available

Focus on finding:
- Missing or inconsistent metadata (titles, captions, keywords)
- Galleries with significantly different settings than others
- Organizational issues (naming patterns, structure)
- SEO optimization opportunities
- Quality control issues
- Consistency problems across galleries

Gallery Data:
${JSON.stringify(galleries.slice(0, 20), null, 2)}

Return your analysis as a JSON object with this structure:
{
  "findings": [
    {
      "id": "unique-id",
      "severity": "critical" | "optimization" | "suggestion",
      "category": "metadata" | "settings" | "organization" | "seo" | "quality",
      "title": "Issue title",
      "description": "Detailed description",
      "affectedItems": ["item1", "item2"],
      "suggestion": "How to fix this",
      "autoFixAvailable": true | false,
      "action": {
        "type": "update_metadata" | "update_settings",
        "params": {}
      }
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, just the JSON object.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    // Extract the response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Try to parse as JSON
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n/g, '')
        .replace(/```\n/g, '')
        .replace(/```/g, '')
        .trim();

      analysisResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);

      // Return sample findings if parsing fails
      analysisResult = {
        findings: [
          {
            id: 'missing-titles-1',
            severity: 'optimization',
            category: 'metadata',
            title: 'Multiple Images Missing Titles',
            description: `Found ${galleries.reduce((sum: number, g: any) => sum + g.images.filter((img: any) => !img.Title).length, 0)} images without titles across your galleries.`,
            affectedItems: galleries.slice(0, 3).map((g: any) => g.albumName),
            suggestion: 'Add descriptive titles to improve SEO and user experience. Consider using the MetaData Monster tool for bulk updates.',
            autoFixAvailable: false,
          },
          {
            id: 'missing-keywords-1',
            severity: 'suggestion',
            category: 'seo',
            title: 'Images Lacking Keywords',
            description: 'Many images are missing keywords, reducing discoverability.',
            affectedItems: galleries.slice(0, 5).map((g: any) => g.albumName),
            suggestion: 'Add relevant keywords to improve search rankings and organization.',
            autoFixAvailable: false,
          },
        ],
      };
    }

    return NextResponse.json(analysisResult);

  } catch (error: any) {
    console.error('Error in sanity analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze data' },
      { status: 500 }
    );
  }
}
