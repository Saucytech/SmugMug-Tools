import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `AI-powered photo culling assistant for professional photographers.

**ANALYSIS CRITERIA:**

1. **TECHNICAL QUALITY (40% weight):**
   - Sharpness/Blur: Is the main subject in focus?
   - Exposure: Under/Over/Correctly exposed?
   - Noise/Grain: Excessive or acceptable?
   - Motion blur: Any unwanted motion blur?

2. **COMPOSITION (30% weight):**
   - Horizon: Straight or tilted?
   - Framing: Well-composed or cropping issues?
   - Rule of thirds: Applied effectively?
   - Leading lines, symmetry, balance

3. **SUBJECT QUALITY (30% weight):**
   - Eyes: Open and sharp? (for portraits)
   - Expression: Natural or awkward?
   - Positioning: Everyone visible and well-placed?
   - Interaction: Genuine moments or staged/stiff?

4. **KEY MOMENTS DETECTION:**
   - Critical moments (first kiss, ring exchange, etc.)
   - Portfolio-worthy shots
   - Story-telling impact

**SCORING:**
- Quality Score: 1-10 (be strict but fair)
- Keep Recommendation: keep / reject / review
- Portfolio Worthy: true / false
- Confidence: 0-100

**ASSESSMENT PHILOSOPHY:**
Only mark as "keep" if the photo truly adds value to the collection. Be professional and objective.`;

export async function GET(request: NextRequest) {
  // Return system prompt if requested
  const { searchParams } = new URL(request.url);
  if (searchParams.get('getSystemPrompt') === 'true') {
    return NextResponse.json({ systemPrompt: SYSTEM_PROMPT, model: MODEL });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// Types for analysis results
interface PhotoQualityAnalysis {
  imageUrl: string;
  qualityScore: number; // 1-10
  technicalIssues: {
    blur: boolean;
    exposure: 'underexposed' | 'overexposed' | 'good';
    noise: boolean;
    focus: 'sharp' | 'soft' | 'blurry';
  };
  compositionIssues: {
    horizon: 'straight' | 'tilted';
    framing: 'good' | 'tight' | 'loose' | 'cropped';
    ruleOfThirds: boolean;
  };
  subjectIssues: {
    eyesClosed: boolean;
    awkwardExpression: boolean;
    partiallyVisible: boolean;
    backTurned: boolean;
  };
  overallAssessment: string;
  keepRecommendation: 'keep' | 'reject' | 'review';
  isPortfolioWorthy: boolean;
  keyMoment: string | null; // e.g., "first kiss", "ring exchange", etc.
  similarityHash?: string; // For grouping similar shots
  confidence: number; // 0-100
  tokensUsed?: { input: number; output: number }; // Token usage for this analysis
}

interface BatchAnalysisRequest {
  images: Array<{
    url: string;
    id: string;
    name?: string;
  }>;
  albumContext?: string; // e.g., "wedding", "portrait session", etc.
  autoRejectThreshold?: number; // Quality score below this = auto-reject
  detectKeyMoments?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { images, albumContext = '', autoRejectThreshold = 3, detectKeyMoments = true, model }: BatchAnalysisRequest & { model?: string } = await request.json();

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Process images in batches to avoid overwhelming the API
    const batchSize = 5;
    const results: PhotoQualityAnalysis[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchPromises = batch.map(async (image) => {
        try {
          const analysis = await analyzePhoto(image.url, image.id, albumContext, detectKeyMoments, model);
          return analysis;
        } catch (_error) {
          console.error(`Error analyzing photo ${image.id}:`, _error);
          return createErrorAnalysis(image.url, image.id);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Sum up token usage from batch
      batchResults.forEach(result => {
        if (result.tokensUsed) {
          totalInputTokens += result.tokensUsed.input;
          totalOutputTokens += result.tokensUsed.output;
        }
      });

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < images.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Group similar photos
    const groupedResults = groupSimilarPhotos(results);

    // Calculate statistics
    const statistics = calculateStatistics(results, autoRejectThreshold);

    return NextResponse.json({
      success: true,
      analyses: groupedResults,
      statistics,
      totalProcessed: results.length,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
      },
    });

  } catch (_error) {
    console.error('Error in photo quality analysis:', _error);
    return NextResponse.json(
      { error: 'Failed to analyze photos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function analyzePhoto(
  imageUrl: string,
  imageId: string,
  albumContext: string,
  detectKeyMoments: boolean,
  model?: string
): Promise<PhotoQualityAnalysis> {
  const prompt = `Analyze this photograph for culling purposes. Provide a detailed quality assessment.

${albumContext ? `Album Context: ${albumContext}` : ''}

Evaluate the following aspects:

1. TECHNICAL QUALITY (40% weight):
   - Sharpness/Blur: Is the main subject in focus?
   - Exposure: Under/Over/Correctly exposed?
   - Noise/Grain: Excessive or acceptable?
   - Motion blur: Any unwanted motion blur?

2. COMPOSITION (30% weight):
   - Horizon: Straight or tilted?
   - Framing: Well-composed or issues with cropping?
   - Rule of thirds: Applied effectively?
   - Leading lines, symmetry, balance?

3. SUBJECT QUALITY (30% weight):
   - Eyes: Open and sharp? (if people are present)
   - Expression: Natural or awkward?
   - Positioning: Everyone visible and well-placed?
   - Interaction: Genuine moments or staged/stiff?

${detectKeyMoments ? `4. KEY MOMENTS:
   - Is this a critical moment? (first kiss, ring exchange, cake cutting, first look, etc.)
   - Is this portfolio-worthy?
   - Does this tell an important story?` : ''}

Provide your response in this EXACT JSON format:
{
  "qualityScore": [1-10 overall score],
  "technicalIssues": {
    "blur": [true/false],
    "exposure": ["underexposed"/"overexposed"/"good"],
    "noise": [true/false],
    "focus": ["sharp"/"soft"/"blurry"]
  },
  "compositionIssues": {
    "horizon": ["straight"/"tilted"],
    "framing": ["good"/"tight"/"loose"/"cropped"],
    "ruleOfThirds": [true/false]
  },
  "subjectIssues": {
    "eyesClosed": [true/false],
    "awkwardExpression": [true/false],
    "partiallyVisible": [true/false],
    "backTurned": [true/false]
  },
  "overallAssessment": "[Brief explanation of decision]",
  "keepRecommendation": ["keep"/"reject"/"review"],
  "isPortfolioWorthy": [true/false],
  "keyMoment": [null or "description of moment"],
  "visualSummary": "[One sentence describing what's in the photo]",
  "confidence": [0-100 confidence in assessment]
}

Be strict but fair. Only mark as "keep" if the photo truly adds value to the collection.`;

  try {
    const response = await anthropic.messages.create({
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
                media_type: 'image/jpeg',
                data: await fetchImageAsBase64(imageUrl),
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

    const content = response.content[0];
    if (content.type === 'text') {
      // Extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);

        // Generate a simple similarity hash based on visual content
        const similarityHash = generateSimilarityHash(analysis.visualSummary || '');

        return {
          imageUrl,
          ...analysis,
          similarityHash,
          tokensUsed: {
            input: response.usage.input_tokens,
            output: response.usage.output_tokens,
          },
        };
      }
    }

    throw new Error('Invalid response format from AI');
  } catch (_error) {
    console.error('Error analyzing photo:', _error);
    throw error;
  }
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (_error) {
    console.error('Error fetching image:', _error);
    throw new Error('Failed to fetch image');
  }
}

function generateSimilarityHash(visualSummary: string): string {
  // Simple hash based on key visual elements
  // In production, you'd use perceptual hashing or feature extraction
  const words = visualSummary.toLowerCase().split(/\s+/);
  const keyElements = words.filter(word =>
    word.length > 3 && !['with', 'from', 'this', 'that', 'have'].includes(word)
  ).sort();

  return keyElements.slice(0, 5).join('-');
}

function groupSimilarPhotos(analyses: PhotoQualityAnalysis[]): PhotoQualityAnalysis[] {
  // Group photos with similar hashes and mark the best one in each group
  const groups = new Map<string, PhotoQualityAnalysis[]>();

  analyses.forEach(analysis => {
    const hash = analysis.similarityHash || 'unique-' + Math.random();
    if (!groups.has(hash)) {
      groups.set(hash, []);
    }
    groups.get(hash)!.push(analysis);
  });

  // For each group, mark the best photo
  const result: PhotoQualityAnalysis[] = [];
  groups.forEach((group, hash) => {
    if (group.length > 1) {
      // Sort by quality score descending
      group.sort((a, b) => b.qualityScore - a.qualityScore);

      // Mark the best one in the group
      group.forEach((photo, index) => {
        result.push({
          ...photo,
          similarityHash: hash,
          isBestInGroup: index === 0,
          groupSize: group.length,
          groupRank: index + 1,
        } as PhotoQualityAnalysis & { isBestInGroup?: boolean; groupSize?: number; groupRank?: number });
      });
    } else {
      result.push(...group);
    }
  });

  return result;
}

function calculateStatistics(analyses: PhotoQualityAnalysis[], autoRejectThreshold: number) {
  const total = analyses.length;
  const keeps = analyses.filter(a => a.keepRecommendation === 'keep').length;
  const rejects = analyses.filter(a => a.keepRecommendation === 'reject').length;
  const reviews = analyses.filter(a => a.keepRecommendation === 'review').length;
  const portfolioWorthy = analyses.filter(a => a.isPortfolioWorthy).length;
  const keyMoments = analyses.filter(a => a.keyMoment !== null).length;

  const technicalIssuesCount = analyses.filter(a =>
    a.technicalIssues.blur ||
    a.technicalIssues.exposure !== 'good' ||
    a.technicalIssues.noise ||
    a.technicalIssues.focus === 'blurry'
  ).length;

  const avgQuality = analyses.reduce((sum, a) => sum + a.qualityScore, 0) / total;
  const belowThreshold = analyses.filter(a => a.qualityScore < autoRejectThreshold).length;

  // Estimate time saved (assuming 3-5 seconds per photo manual culling)
  const estimatedTimeSavedMinutes = Math.round((total * 4) / 60);

  return {
    total,
    keeps,
    rejects,
    reviews,
    keepRatio: Math.round((keeps / total) * 100),
    portfolioWorthy,
    keyMoments,
    technicalIssuesCount,
    avgQualityScore: avgQuality.toFixed(1),
    belowThreshold,
    estimatedTimeSavedMinutes,
    qualityDistribution: {
      excellent: analyses.filter(a => a.qualityScore >= 9).length,
      good: analyses.filter(a => a.qualityScore >= 7 && a.qualityScore < 9).length,
      average: analyses.filter(a => a.qualityScore >= 5 && a.qualityScore < 7).length,
      poor: analyses.filter(a => a.qualityScore < 5).length,
    }
  };
}

function createErrorAnalysis(imageUrl: string, _imageId: string): PhotoQualityAnalysis {
  return {
    imageUrl,
    qualityScore: 5,
    technicalIssues: {
      blur: false,
      exposure: 'good',
      noise: false,
      focus: 'sharp',
    },
    compositionIssues: {
      horizon: 'straight',
      framing: 'good',
      ruleOfThirds: false,
    },
    subjectIssues: {
      eyesClosed: false,
      awkwardExpression: false,
      partiallyVisible: false,
      backTurned: false,
    },
    overallAssessment: 'Error analyzing photo - marked for manual review',
    keepRecommendation: 'review',
    isPortfolioWorthy: false,
    keyMoment: null,
    confidence: 0,
  };
}