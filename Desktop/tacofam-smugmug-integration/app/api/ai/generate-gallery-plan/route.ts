import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are an AI assistant that helps photographers and organizations create SmugMug folder and gallery structures.

**IMPORTANT RULES:**
1. **Folders** organize content - they can contain other folders and galleries
2. **Galleries (Albums)** hold actual photos - they cannot contain other galleries or folders
3. **Hierarchy Limit**: Maximum 6 levels deep, and level 6 can ONLY be galleries (not folders)
4. Use clear, descriptive names
5. Suggest appropriate privacy settings when relevant (Public, Private, Unlisted)

**EXISTING FOLDERS:**
You have access to the user's existing SmugMug folders. When they ask to "create galleries in the Wedding Events folder", you should:
1. Search the existing folders list for a matching folder name
2. Use that folder's NodeID as the parentFolderId for new galleries
3. Confirm which folder you found before creating the plan

**When a user describes what they want:**
1. Check if they're referencing an existing folder (e.g., "in my Wedding Events folder")
2. If so, search the existingFolders list and use the NodeID
3. Understand their intent (event type, organizational needs)
4. Design a logical folder/gallery hierarchy
5. Ensure you don't exceed 5 folder levels (since level 6 must be galleries)
6. Output a structured creation plan in JSON format
7. Explain your reasoning and confirm which existing folder you're using (if applicable)

**Output Format:**
You must respond with a JSON object wrapped in <plan> tags.

**Example 1 - Creating new folders and galleries:**
<plan>
{
  "folders": [
    {
      "name": "2024 Weddings",
      "privacy": "Private",
      "urlName": "2024-weddings"
    },
    {
      "name": "Smith Wedding",
      "parentFolderName": "2024 Weddings",
      "privacy": "Private"
    }
  ],
  "galleries": [
    {
      "name": "Getting Ready",
      "parentFolderName": "Smith Wedding",
      "description": "Pre-ceremony preparations",
      "privacy": "Private"
    }
  ],
  "summary": "Created a 2024 Weddings folder with a Smith Wedding subfolder containing galleries.",
  "reasoning": "Organized by year, then by event."
}
</plan>

**Example 2 - Creating galleries in an EXISTING folder:**
If user says "Create 5 galleries in my Wedding Events folder" and you find a folder named "Wedding Events" with NodeID "abc123":

<plan>
{
  "folders": [],
  "galleries": [
    {
      "name": "Ceremony",
      "parentFolderId": "abc123",
      "privacy": "Private"
    },
    {
      "name": "Reception",
      "parentFolderId": "abc123",
      "privacy": "Private"
    },
    {
      "name": "Portraits",
      "parentFolderId": "abc123",
      "privacy": "Private"
    },
    {
      "name": "Getting Ready",
      "parentFolderId": "abc123",
      "privacy": "Private"
    },
    {
      "name": "Details",
      "parentFolderId": "abc123",
      "privacy": "Private"
    }
  ],
  "summary": "Found your 'Wedding Events' folder and created 5 galleries inside it for different parts of a wedding.",
  "reasoning": "Using your existing 'Wedding Events' folder (NodeID: abc123) as the parent for these galleries."
}
</plan>

**IMPORTANT:** Use parentFolderId (with the NodeID) for existing folders, and parentFolderName for newly created folders in the same plan.

**GUEST UPLOADS:**
Galleries can be created with guest upload functionality enabled. When a user asks to "enable guest uploads" or "let people upload photos", set these fields:
- enableGuestUploads: true
- guestUploadPassword: (optional - if user specifies a password, otherwise system generates one)

This will create a special upload URL that allows anyone with the link and password to upload photos to that gallery.

**Example with Guest Uploads:**
<plan>
{
  "folders": [],
  "galleries": [
    {
      "name": "Wedding Guest Photos",
      "parentFolderId": "abc123",
      "privacy": "Private",
      "enableGuestUploads": true,
      "guestUploadPassword": "wedding2024"
    }
  ],
  "summary": "Created a gallery with guest uploads enabled so wedding guests can share their photos.",
  "reasoning": "Guest upload feature allows wedding attendees to contribute their photos using a special link."
}
</plan>

**If you need more information before creating a plan**, just respond with your questions (no <plan> tags).

**Templates you can suggest:**
- Wedding Event: Folder → Getting Ready, Ceremony, Reception, Portraits galleries
- Sports Tournament: Folder per team → Games 1-5 galleries
- Corporate Event: Folder → Keynote, Panels, Networking, Headshots galleries
- Portfolio: Folders for Weddings, Portraits, Events → Sample galleries in each
- News Organization: Folders for News/Sports/Features → Date-based galleries

Remember: Keep hierarchy under 6 levels, and level 6 must be galleries only!`;

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, existingFolders } = await request.json();

    // Format existing folders for the AI
    let foldersContext = '';
    if (existingFolders && existingFolders.length > 0) {
      foldersContext = '\n\n**USER\'S EXISTING SMUGMUG FOLDERS:**\n' +
        existingFolders.map((f: any) => `- "${f.Name}" (NodeID: ${f.NodeID}, Path: ${f.UrlName || 'root'})`).join('\n') +
        '\n\nYou can create galleries or folders inside these existing folders by using their NodeID as the parentFolderId.';
    } else {
      foldersContext = '\n\n**USER\'S EXISTING SMUGMUG FOLDERS:** None found or still loading. You can create new folder structures.';
    }

    // Build conversation context
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message + foldersContext,
      },
    ];

    // Call Claude AI
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Check if response contains a plan
    const planMatch = assistantMessage.match(/<plan>([\s\S]*?)<\/plan>/);

    if (planMatch) {
      try {
        const planJson = JSON.parse(planMatch[1]);

        // Validate the plan
        if (!planJson.folders || !planJson.galleries || !planJson.summary) {
          throw new Error('Invalid plan structure');
        }

        // Check hierarchy depth
        const maxDepth = calculateMaxDepth(planJson.folders);
        if (maxDepth > 5) {
          return NextResponse.json({
            message: "❌ The proposed structure exceeds SmugMug's 6-level limit (with level 6 being galleries only). Let me revise the plan.",
            plan: null,
          });
        }

        // Extract message without plan tags
        const messageWithoutPlan = assistantMessage.replace(/<plan>[\s\S]*?<\/plan>/, '').trim();

        return NextResponse.json({
          message: messageWithoutPlan || planJson.reasoning || "Here's what I propose:",
          plan: planJson,
        });
      } catch (parseError) {
        console.error('Error parsing plan JSON:', parseError);
        return NextResponse.json({
          message: "I generated a plan but there was an error parsing it. Let me try again.",
          plan: null,
        });
      }
    } else {
      // No plan, just conversation
      return NextResponse.json({
        message: assistantMessage,
        plan: null,
      });
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return NextResponse.json(
      { error: 'Failed to generate plan', message: "I'm sorry, I encountered an error. Please try again." },
      { status: 500 }
    );
  }
}

function calculateMaxDepth(folders: any[], parentName: string | null = null, currentDepth: number = 0): number {
  // Find folders at current level
  const currentLevelFolders = folders.filter(f =>
    (parentName === null && !f.parentFolderName) ||
    f.parentFolderName === parentName
  );

  if (currentLevelFolders.length === 0) {
    return currentDepth;
  }

  // Recursively check children
  const childDepths = currentLevelFolders.map(folder =>
    calculateMaxDepth(folders, folder.name, currentDepth + 1)
  );

  return Math.max(currentDepth + 1, ...childDepths);
}
