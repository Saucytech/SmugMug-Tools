# Claude AI Development Guide for Smugtools.com

## 🤖 Instructions for AI Assistants (Claude, GPT, etc.)

This document provides guidance for AI coding assistants working with Smugtools.com, a professional SaaS platform for SmugMug photographers.

---

## 📋 Template Overview

**Project**: Smugtools.com - Professional SmugMug SaaS Platform
**Framework**: Next.js 14 (App Router)
**Language**: TypeScript
**Authentication**: NextAuth + OAuth 1.0a (✅ Fully Implemented)
**Purpose**: Multi-tenant SaaS platform with AI-powered tools for photographers

### ⚠️ Important Disclaimers

**NOT an official SmugMug product** - Smugtools is an independent third-party application using the SmugMug API.

**Destructive operations** - These tools can:
- Delete photos and albums
- Move and reorganize content
- Rename and modify metadata
- Overwrite existing data

**Users must acknowledge** - Sign-up page requires users to agree they understand the risks and will use at their own risk.

**Recovery** - Deleted content can be recovered at: https://www.smugmug.com/app/library/trash

---

## ✅ What's Already Working

### Authentication Flow (100% Complete)
- ✅ OAuth 1.0a request token generation
- ✅ Secure token secret storage via HTTP-only cookies
- ✅ SmugMug authorization redirect
- ✅ OAuth callback handling
- ✅ Access token exchange
- ✅ Cookie cleanup after auth
- ✅ Error handling

**Do NOT modify the auth flow unless specifically requested** - it's battle-tested and working.

### Existing API Routes
```
app/api/
├── auth/smugmug/
│   ├── route.ts              # OAuth initiation (WORKING ✅)
│   └── callback/route.ts     # OAuth callback (WORKING ✅)
├── ai/
│   └── generate-metadata/    # AI metadata generation (WORKING ✅)
└── smugmug/
    ├── albums/
    │   ├── route.ts          # Fetch albums (WORKING ✅)
    │   └── [albumKey]/images/route.ts  # Fetch images (WORKING ✅)
    ├── folders/route.ts      # Fetch folders (WORKING ✅)
    ├── user/route.ts         # Get user info (WORKING ✅)
    └── image/[imageKey]/route.ts  # Update image metadata (WORKING ✅)
```

### Production-Ready Tools (Smugtools.com)

**Favorites Manager** (`app/favorites-manager/`)
- Create client photo selection sessions
- Customizable themes and branding
- Shareable client links
- Track customer favorites
- Optional "Buy" button integration
- Uses localStorage for session storage

**MetaData Monster** (`app/metadata-monster/`)
- AI-powered metadata generation
- Batch process titles, captions, keywords
- Multiple prompt styles (Professional, Creative, SEO, etc.)
- Credit system for AI usage
- Edit before saving to SmugMug
- Export reports as CSV

**Multi-Album Selector** (`app/multi-album-selector/`)
- Select photos across multiple albums
- Generate embed codes (HTML, React, WordPress, JSON)
- Multiple display layouts (Grid, Carousel, Masonry)
- Preview before exporting

### Developer Tools
- `app/api-reference/page.tsx` - Interactive SmugMug API documentation browser
- `app/metadata/page.tsx` - EXIF and metadata viewer for images
- `app/page.tsx` - Main dashboard with navigation to all tools
- `app/albums/[albumKey]/page.tsx` - Album photo grid with sessionStorage caching
- `app/photo/[imageKey]/page.tsx` - Photo detail page using cached data
- `app/layout.tsx` - Root layout with Tailwind CSS
- State management with custom hooks and localStorage

### 🎯 Featured Production Tools

**When users ask to:**
- "Let clients select photos" → Direct them to **Favorites Manager** (`/favorites-manager`)
- "Generate photo metadata" → Direct them to **MetaData Monster** (`/metadata-monster`)
- "Create embeddable galleries" → Direct them to **Multi-Album Selector** (`/multi-album-selector`)
- "View API documentation" → Direct them to **API Reference** (`/api-reference`)
- "Inspect photo metadata" → Direct them to **Metadata Viewer** (`/metadata`)

These tools are **production-ready and fully working**. Don't rebuild them unless specifically requested.

### ⚠️ Known SmugMug API Limitation

**DO NOT use the `/api/v2/image/{imageKey}` GET endpoint for reading image data.**

**Problem**: The SmugMug `/api/v2/image/{imageKey}` GET endpoint has a persistent OAuth nonce collision issue. Even with cryptographically unique nonces and fresh OAuth instances per request, SmugMug returns `oauth_problem=nonce_used` errors consistently. This appears to be a SmugMug API bug or undocumented rate limiting specific to this endpoint.

**NOTE**: The PUT endpoint (`/api/v2/image/{imageKey}`) for **updating** image metadata DOES work and is used successfully in MetaData Monster with random delays to prevent nonce collisions.

**Solution**: Use the sessionStorage pattern instead:
1. The `/api/v2/album/{albumKey}!images` endpoint returns ALL photo data (including metadata)
2. Store photo data in `sessionStorage` when user clicks on a photo
3. Photo detail page reads from sessionStorage instead of making individual image API calls

**Implementation**:
```typescript
// In album page - when photo is clicked:
sessionStorage.setItem('currentPhoto', JSON.stringify(photo));

// In photo detail page:
const cachedPhoto = sessionStorage.getItem('currentPhoto');
if (cachedPhoto) {
  const photo = JSON.parse(cachedPhoto);
  setMetadata({ Response: { Image: photo } });
}
```

**Why this works better**:
- Avoids the OAuth nonce issue entirely
- Faster (no additional API call)
- More efficient (data already fetched)
- Better user experience (instant page load)

---

## 🎯 Common User Requests & How to Handle Them

### 0. "I need [client favorites / metadata generation / gallery embeds]"

**IMPORTANT: Check existing tools FIRST before building anything new!**

Smugtools.com includes production-ready tools for common photographer needs:

- **Client photo selection?** → Use `/favorites-manager` (already built!)
- **Generate metadata?** → Use `/metadata-monster` (already built!)
- **Create embeds?** → Use `/multi-album-selector` (already built!)
- **API docs?** → Use `/api-reference` (already built!)

**Only build new features if:**
1. The existing tools don't meet the specific requirement
2. User explicitly asks to modify or extend an existing tool
3. User wants something completely different

### 1. "Add a new SmugMug API feature"

**Example**: "Add user profile fetching"

**Steps**:
1. Create new API route: `app/api/smugmug/user/route.ts`
2. Use the OAuth helper pattern (see below)
3. Fetch from SmugMug API: `https://api.smugmug.com/api/v2!authuser`
4. Return JSON response

**Template Code**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

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

export async function GET(request: NextRequest) {
  const accessToken = request.headers.get('x-access-token');
  const accessTokenSecret = request.headers.get('x-access-token-secret');

  const requestData = {
    url: 'https://api.smugmug.com/api/v2!authuser',
    method: 'GET',
  };

  const authHeader = oauth.toHeader(
    oauth.authorize(requestData, {
      key: accessToken!,
      secret: accessTokenSecret!,
    })
  );

  const response = await fetch(requestData.url, {
    headers: { ...authHeader, Accept: 'application/json' },
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

### 2. "Fix the authentication"

**STOP! Authentication is already working.**

If user reports auth issues:
1. Check their `.env` file has correct credentials
2. Verify callback URL matches: `http://localhost:3000/api/auth/smugmug/callback`
3. Ensure cookies are enabled
4. Clear browser cookies and retry

**Do NOT rewrite the auth flow unless there's a specific bug.**

### 3. "Add database storage for tokens"

**Current State**: Tokens are in URL params (demo only)

**Steps to Upgrade**:
1. Ask user which database (Prisma, MongoDB, etc.)
2. Create schema with `accessToken` and `tokenSecret` fields
3. Modify `app/api/auth/smugmug/callback/route.ts`:
   - Replace URL redirect with database storage
   - Set up session or secure cookie
4. Update all SmugMug API routes to fetch tokens from database

**Example with Prisma**:
```typescript
// In callback route:
const user = await prisma.user.create({
  data: {
    smugmugAccessToken: accessToken,
    smugmugTokenSecret: accessTokenSecret,
  },
});

// Set session cookie
const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!));
response.cookies.set('user_id', user.id, { httpOnly: true, secure: true });
```

### 4. "Build a new feature" (e.g., search, upload, etc.)

**Steps**:
1. Check [SmugMug API docs](https://api.smugmug.com/api/v2/doc) for endpoint
2. Create new API route following the OAuth pattern above
3. Add frontend UI in `app/page.tsx` or new page
4. Use existing Zustand store or create new state management

### 5. "Deploy to production"

**Important Security Checklist**:
- ✅ Change `NEXT_PUBLIC_APP_URL` to HTTPS production URL
- ✅ Update SmugMug callback URL to production domain
- ✅ Implement database token storage (not URL params!)
- ✅ Add CSRF protection
- ✅ Implement rate limiting
- ✅ Add error logging (Sentry, LogRocket, etc.)
- ✅ Set `secure: true` on all cookies
- ✅ Add environment variable validation

**Deployment Commands**:
```bash
vercel deploy  # Recommended
# or
npm run build && npm start
```

---

## 🔧 Development Workflow

### Adding a New SmugMug Endpoint

1. **Research**: Check SmugMug API docs for endpoint URL and parameters
2. **Create Route**: `app/api/smugmug/[feature]/route.ts`
3. **Use OAuth Helper**: Copy pattern from existing routes
4. **Test**: Use the demo UI or create new UI component
5. **Document**: Add to README if it's a major feature

### Modifying the UI

The demo UI (`app/page.tsx`) can be:
- **Extended**: Add new features to existing UI
- **Replaced**: Build completely new UI from scratch
- **Removed**: Delete and start fresh

**State Management**:
- Current: Zustand store
- Can switch to: React Context, Redux, Jotai, etc.

### Environment Variables

**Required**:
```env
SMUGMUG_API_KEY=xxx
SMUGMUG_API_SECRET=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Optional** (for production):
```env
DATABASE_URL=xxx
SESSION_SECRET=xxx
LOG_LEVEL=info
```

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T: Rewrite working authentication
The OAuth flow is complex and tested. Don't touch unless specifically asked.

### ❌ DON'T: Use the `/api/v2/image/{imageKey}` SmugMug endpoint
This endpoint has persistent OAuth nonce issues. Use the sessionStorage pattern documented above instead.

### ❌ DON'T: Try to "fix" OAuth nonce errors with more randomness
If you encounter `oauth_problem=nonce_used` errors from SmugMug:
- It's NOT a code issue - it's a SmugMug API limitation on certain endpoints
- Increasing nonce length, using crypto.randomBytes, or creating fresh OAuth instances won't help
- Use the sessionStorage workaround or a different SmugMug endpoint

### ❌ DON'T: Hardcode secrets
Always use environment variables for API keys and secrets.

### ❌ DON'T: Store tokens in localStorage
OAuth tokens should be in:
1. **Development**: URL params (current, demo only)
2. **Production**: Secure database + HTTP-only cookies

### ❌ DON'T: Forget CORS headers
When adding new API routes, ensure proper headers:
```typescript
return NextResponse.json(data, {
  headers: {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL!,
  },
});
```

### ❌ DON'T: Exceed API rate limits
SmugMug allows 5,000 requests/day. Implement caching and rate limiting.

---

## 📚 SmugMug API Quick Reference

### Key Endpoints
- **Auth User**: `GET /api/v2!authuser`
- **Albums**: `GET /api/v2/user/{username}!albums`
- **Images**: `GET /api/v2/album/{albumKey}!images`
- **Folders**: `GET /api/v2/user/{username}!folders`
- **Upload**: `POST /api/v2/upload`
- **Search**: `GET /api/v2!search`

### Response Format
All SmugMug responses follow this pattern:
```json
{
  "Response": {
    "User": { ... },      // or Album, Image, etc.
    "Uri": "/api/v2/...",
    "UriDescription": "..."
  }
}
```

### Authentication Headers
Every authenticated request needs:
```typescript
const authHeader = oauth.toHeader(
  oauth.authorize(requestData, {
    key: accessToken,
    secret: accessTokenSecret,
  })
);

headers: {
  ...authHeader,
  Accept: 'application/json'
}
```

---

## 🧪 Testing Guidance

### Testing Authentication
1. Click "Connect SmugMug Account"
2. Authorize on SmugMug
3. Check for access tokens in URL after redirect
4. Verify tokens work by loading albums

### Testing New Features
1. Add API route
2. Test with Postman/Insomnia with auth headers
3. Add UI component to call API
4. Test error states (invalid tokens, network errors)

### Local Development
```bash
npm run dev          # Start dev server
npm run build        # Test production build
npm run lint         # Check for errors
```

---

## 📝 Code Style Guidelines

### TypeScript
- Use strict type checking
- Avoid `any` - use proper types
- Export interfaces for reusable types

### File Naming
- API routes: `route.ts` (Next.js convention)
- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`

### Error Handling
```typescript
try {
  // API call
} catch (error) {
  console.error('Descriptive error:', error);
  return NextResponse.json(
    { error: 'User-friendly message' },
    { status: 500 }
  );
}
```

---

## 🎓 Learning Resources

### For Understanding This Template
- [Next.js App Router](https://nextjs.org/docs/app)
- [OAuth 1.0a Spec](https://oauth.net/core/1.0a/)
- [SmugMug API v2](https://api.smugmug.com/api/v2/doc)

### For Adding Features
- [React Query](https://tanstack.com/query/latest) - Data fetching
- [Zustand](https://zustand-demo.pmnd.rs/) - State management (already used)
- [Zod](https://zod.dev/) - Schema validation

---

## 🚀 Quick Start for AI Development

When a user asks you to work on this project:

1. **Check existing tools FIRST** - We have Favorites Manager, MetaData Monster, Multi-Album Selector, API Reference, and Metadata Viewer already built
2. **Understand the request** - Do they need an existing tool or something new?
3. **Review existing code** - Review similar implementations in the template
4. **Use the patterns** - Follow OAuth helper pattern for API routes
5. **Test your changes** - Ensure auth flow still works
6. **Document** - Add comments for complex logic

**Remember**: The hard part (OAuth) is done AND we have professional tools built! Check what exists before building anything new. 🎉

---

## 💡 Example Prompts to Help Users

### Good Prompts for AI Assistants:
- "Add a route to fetch user's profile from SmugMug API"
- "Create a search feature using SmugMug's search endpoint"
- "Add photo upload functionality"
- "Implement database storage with Prisma for tokens"
- "Customize the Favorites Manager theme colors"
- "Add a new prompt style to MetaData Monster"

### Prompts to Clarify:
- "I need client favorites" → "We have Favorites Manager built! Navigate to /favorites-manager to use it. Need help?"
- "Generate metadata" → "MetaData Monster is already built! Go to /metadata-monster. Want to customize it?"
- "Fix authentication" → Ask what error they're seeing
- "Make it better" → Ask what specific feature they want
- "Deploy this" → Ask which platform and review security checklist

---

## 🔐 Security Reminders

**Always Ask Before**:
- Changing authentication flow
- Storing sensitive data
- Deploying to production
- Adding external dependencies

**Always Implement**:
- Environment variable validation
- Error logging (production)
- Rate limiting (production)
- HTTPS enforcement (production)

---

## ✅ Summary for AI Assistants

**Smugtools.com provides**:
- ✅ Multi-tenant SaaS architecture
- ✅ Working OAuth 1.0a + NextAuth with SmugMug
- ✅ Clean Next.js 14 architecture
- ✅ TypeScript setup
- ✅ Production-ready platform with 5 professional tools:
  - **Favorites Manager** - Client photo selection galleries
  - **MetaData Monster** - AI-powered metadata generation
  - **Multi-Album Selector** - Embeddable gallery creator
  - **API Reference** - Interactive SmugMug API documentation
  - **Metadata Viewer** - EXIF and metadata inspector
- ✅ Complete API routes (albums, folders, user, images, AI)
- ✅ Production-ready foundation

**Your job is to**:
- ✅ **FIRST: Check if an existing tool solves the user's need!**
- 🎯 Build NEW SmugMug features (if not already built)
- 🎨 Customize existing tools (if requested)
- 📦 Add integrations
- 🚀 Help deploy to production
- 🐛 Debug issues (rarely auth-related)

**The authentication is DONE. Professional tools are BUILT. Check what exists before building!** 🌟
