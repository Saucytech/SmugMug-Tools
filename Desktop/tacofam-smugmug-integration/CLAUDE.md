# Claude AI Development Guide for Smugtools

## 🤖 Instructions for AI Assistants (Claude, GPT, etc.)

This document provides guidance for AI coding assistants working with Smugtools, a professional multi-tenant SaaS platform for SmugMug photographers.

---

## 📋 Project Overview

**Project**: Smugtools - Multi-Tenant SmugMug SaaS Platform
**Framework**: Next.js 14 (App Router)
**Language**: TypeScript
**Database**: Neon PostgreSQL (serverless)
**Authentication**: NextAuth.js + SmugMug OAuth 1.0a (✅ Fully Implemented)
**AI Provider**: Anthropic Claude API
**Payments**: Stripe (coin-based system)
**Purpose**: Production SaaS with 8 professional tools for photographers

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

### Authentication System (100% Complete)
- ✅ NextAuth.js with database sessions (Neon PostgreSQL)
- ✅ User registration and login (`/auth/signup`, `/auth/signin`)
- ✅ SmugMug OAuth 1.0a integration
- ✅ Encrypted token storage (AES-256-CBC)
- ✅ Role-based access (admin/user)
- ✅ HTTP-only, SameSite cookies
- ✅ CSRF protection
- ✅ Optional Stack Auth integration

**Do NOT modify the auth flow unless specifically requested** - it's production-tested and working.

### Database Schema (Neon PostgreSQL)
- ✅ users (email, password_hash, role, coin_balance)
- ✅ smugmug_tokens (encrypted access tokens per user)
- ✅ tool_states (admin control over tool availability)
- ✅ coin_transactions (purchases, usage, bonuses, refunds)
- ✅ ai_operations (tracking all AI requests and costs)
- ✅ accounts/sessions/verification_tokens (NextAuth tables)
- ✅ stripe_customers (payment integration)
- ✅ uploaded_images (guest upload tracking)

### Existing API Routes (35+ endpoints)
```
app/api/
├── auth/
│   ├── [...nextauth]/route.ts       # NextAuth handlers ✅
│   ├── signup/route.ts              # User registration ✅
│   ├── logout/route.ts              # Logout handler ✅
│   └── smugmug/
│       ├── route.ts                 # OAuth initiation ✅
│       └── callback/route.ts        # OAuth callback ✅
├── ai/
│   └── generate-metadata/route.ts   # AI metadata generation ✅
├── admin/
│   └── tools/route.ts               # Tool state management (admin only) ✅
├── tools/
│   └── states/route.ts              # Public tool states API ✅
├── download/
│   └── route.ts                     # Bulk download handler ✅
└── smugmug/
    ├── albums/
    │   ├── route.ts                 # Fetch albums ✅
    │   ├── [albumKey]/images/route.ts # Fetch album images ✅
    │   └── delete/route.ts          # Delete albums ✅
    ├── folders/route.ts             # Fetch folders ✅
    ├── folder-tree/route.ts         # Folder hierarchy ✅
    ├── user/route.ts                # Get user info ✅
    ├── image/[imageKey]/route.ts    # Update image metadata ✅
    ├── create-folder/route.ts       # Create folder ✅
    ├── create-gallery/route.ts      # Create gallery/album ✅
    ├── create-structure/route.ts    # Bulk structure creation ✅
    ├── delete-node/route.ts         # Delete folder/gallery ✅
    ├── guest-upload-folder/route.ts # Guest upload setup ✅
    ├── upload/route.ts              # Photo upload ✅
    ├── move-image/route.ts          # Move photo between albums ✅
    ├── collect-image/route.ts       # Add image to album ✅
    └── album-templates/route.ts     # Gallery templates ✅
```

### Production-Ready Tools (8 Professional Tools)

**1. Embed & Sell** (`app/favorites/` - formerly Multi-Album Selector)
- Select photos across multiple albums
- Generate embed codes (HTML, React, WordPress, JSON)
- Multiple display layouts (Grid, Carousel, Masonry)
- Buy button integration
- Preview before exporting

**2. Favorites Selector** (`app/favorites-manager/`)
- 7 customizable color themes
- Logo branding upload (PNG/JPG/SVG)
- Shareable client links
- Track customer favorites (name, email)
- Optional "Buy" button integration
- localStorage for session storage

**3. MetaData Monster** (`app/metadata-monster/`)
- AI-powered metadata generation (1 coin per photo)
- 2 modes: Normal & Seek & Capture
- 5 prompt styles (Professional, Creative, SEO, Minimal, Descriptive)
- Batch process titles, captions, keywords
- Edit before saving to SmugMug
- Export reports as CSV

**4. AI Gallery Creator** (`app/ai-gallery-creator/`)
- AI chat for automatic folder structure creation
- 5 pre-built templates (Wedding, Sports, Real Estate, Portrait, Corporate)
- Manual folder/gallery creation tools
- Destruction Mode for cleanup
- Template save/load system
- Guest upload link generation

**5. Photo Organizer** (`app/photo-organizer/`)
- AI auto-sorting into correct albums
- Confidence scoring for suggestions
- Smart indexing for fast searches
- Bulk organization
- Preview before applying

**6. Guest Upload Manager** (`app/guest-upload-manager/`)
- Project-based organization
- People library (reusable templates)
- Drag-and-drop people management
- Unique upload URL per person
- Batch "Execute Pending" for bulk creation
- Upload tracking

**7. Folder Downloader** (`app/downloader/`)
- 3 download strategies (Single ZIP, Album-based, Auto-split)
- 5 image size options (Original, X3Large, X2Large, XLarge, Large)
- Folder tree navigation with checkboxes
- Preserve original folder hierarchy
- Delete albums option

**8. Sanity Checker** (`app/sanity-checker/`)
- AI-powered deep analysis using cached gallery data
- Severity categorization (Critical, Optimization, General)
- Terminal-style log output
- Clickable links to affected galleries
- Auto-fix available for some issues

### Supporting Pages
- `app/page.tsx` - Main dashboard with tool state management
- `app/admin/page.tsx` - Admin dashboard (analytics, user management, tool control)
- `app/ai-dashboard/page.tsx` - AI usage tracking and analytics
- `app/auth/signin/page.tsx` - Login page
- `app/auth/signup/page.tsx` - Registration page
- `app/pricing/page.tsx` - Coin packages and Stripe checkout
- `app/api-reference/page.tsx` - Interactive SmugMug API documentation

### 🎯 Tool Routing Guide

**When users ask to:**
- "Create embeddable galleries" → **Embed & Sell** (`/favorites`)
- "Let clients select photos" → **Favorites Selector** (`/favorites-manager`)
- "Generate photo metadata" → **MetaData Monster** (`/metadata-monster`)
- "Organize folder structure" → **AI Gallery Creator** (`/ai-gallery-creator`)
- "Sort photos with AI" → **Photo Organizer** (`/photo-organizer`)
- "Share upload links" → **Guest Upload Manager** (`/guest-upload-manager`)
- "Download photos" → **Folder Downloader** (`/downloader`)
- "Analyze account" → **Sanity Checker** (`/sanity-checker`)
- "View API docs" → **API Reference** (`/api-reference`)
- "Track AI usage" → **AI Dashboard** (`/ai-dashboard`)
- "Manage platform" → **Admin Dashboard** (`/admin`)

These 8 tools are **production-ready and fully working**. Don't rebuild them unless specifically requested.

### ⚠️ Critical SmugMug API Pattern (RESOLVED)

**IMPORTANT: Always use versioned image URIs with serial number suffix**

**Problem (RESOLVED)**: The `oauth_problem=nonce_used` errors were caused by using non-versioned image keys (e.g., `MLB2MBL`) instead of versioned ones with serial numbers (e.g., `MLB2MBL-0`).

**Root Cause**: When using non-versioned endpoints, SmugMug redirects to the versioned endpoint, but OAuth clients follow redirects without re-signing, causing nonce errors.

**Solution**: Always use the `Uri` field from SmugMug API responses:

```typescript
// ❌ WRONG: Non-versioned (causes oauth_problem=nonce_used)
const endpoint = `/api/v2/album/${albumKey}/image/${imageKey}`;

// ✅ CORRECT: Use Uri field from API response (includes -0 suffix)
const photo = albumData.Response.AlbumImage[0];
const endpoint = photo.Uri; // e.g., "/api/v2/album/G644RP/image/MLB2MBL-0"
```

**Why this matters**:
- PATCH requests for metadata updates work reliably
- No need for artificial delays between requests
- MetaData Monster can update metadata in bulk without errors
- Standard OAuth nonce handling works as expected

**Best Practice for Reading Image Data**:
Still use the sessionStorage pattern for optimal performance:
1. The `/api/v2/album/{albumKey}!images` endpoint returns ALL photo data
2. Store photo data in `sessionStorage` when user navigates
3. Photo detail pages read from cache instead of making API calls

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

**Benefits of caching approach**:
- Faster page loads (no API call)
- Reduced API usage
- Better user experience
- Works for all image operations

**Credit**: Thanks to SmugMug engineer Erik 'Egg' Giberti for identifying the versioned URI solution.

---

## 🎯 Common User Requests & How to Handle Them

### 0. "I need [specific workflow feature]"

**IMPORTANT: Check existing 8 tools FIRST before building anything new!**

Smugtools includes production-ready tools for common photographer needs:

- **Client photo selection?** → Use `/favorites-manager` (already built!)
- **Generate metadata?** → Use `/metadata-monster` (already built!)
- **Create embeds?** → Use `/favorites` (already built!)
- **Organize structure?** → Use `/ai-gallery-creator` (already built!)
- **Sort photos with AI?** → Use `/photo-organizer` (already built!)
- **Share upload links?** → Use `/guest-upload-manager` (already built!)
- **Download photos?** → Use `/downloader` (already built!)
- **Analyze account?** → Use `/sanity-checker` (already built!)
- **API docs?** → Use `/api-reference` (already built!)

**Only build new features if:**
1. The existing 8 tools don't meet the specific requirement
2. User explicitly asks to modify or extend an existing tool
3. User wants something completely different from the 8 tools

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

### 3. "Database and token storage"

**Current State**: ✅ FULLY IMPLEMENTED with NextAuth + Neon PostgreSQL

**Architecture**:
- NextAuth.js handles user sessions
- SmugMug tokens stored in `smugmug_tokens` table (AES-256-CBC encrypted)
- User authentication via `users` table (bcrypt password hashing)
- Coin balance and transactions tracked
- AI operations logged for analytics

**Token Retrieval Pattern**:
```typescript
// In any API route that needs SmugMug access:
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { decrypt } from "@/lib/encryption";
import db from "@/lib/db";

const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const result = await db.query(
  'SELECT access_token, token_secret FROM smugmug_tokens WHERE user_id = $1',
  [session.user.id]
);

const accessToken = decrypt(result.rows[0].access_token);
const tokenSecret = decrypt(result.rows[0].token_secret);
```

**DO NOT rebuild this system** - it's production-ready with proper encryption and session management.

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
# SmugMug API
SMUGMUG_API_KEY=xxx
SMUGMUG_API_SECRET=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

# NextAuth
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000

# Encryption (32-byte hex key)
ENCRYPTION_KEY=xxx

# AI (Anthropic)
ANTHROPIC_API_KEY=xxx
```

**Optional** (for full features):
```env
# Stripe (payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stack Auth (alternative to NextAuth)
NEXT_PUBLIC_STACK_PROJECT_ID=xxx
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=xxx
STACK_SECRET_SERVER_KEY=xxx
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

**Smugtools provides**:
- ✅ Multi-tenant SaaS architecture with Neon PostgreSQL
- ✅ NextAuth.js + SmugMug OAuth 1.0a (fully working)
- ✅ Clean Next.js 14 App Router architecture
- ✅ TypeScript with strict type checking
- ✅ Production SaaS with 8 professional tools:
  1. **Embed & Sell** - Embeddable galleries with buy buttons
  2. **Favorites Selector** - Client photo selection with 7 themes
  3. **MetaData Monster** - AI metadata generation (2 modes, 5 styles)
  4. **AI Gallery Creator** - Structure creation with templates
  5. **Photo Organizer** - AI sorting and smart indexing
  6. **Guest Upload Manager** - Project-based upload links
  7. **Folder Downloader** - Bulk downloads with hierarchy
  8. **Sanity Checker** - AI account analysis
- ✅ 35+ API routes (auth, smugmug, ai, admin, download)
- ✅ Admin dashboard (analytics, user management, tool states)
- ✅ AI Dashboard (usage tracking, coin management)
- ✅ Stripe integration (coin-based payment system)
- ✅ Encrypted token storage (AES-256-CBC)
- ✅ Role-based access control (admin/user)
- ✅ Global albums cache (Zustand store)

**Your job is to**:
- ✅ **FIRST: Check if one of the 8 tools solves the user's need!**
- 🎯 Build NEW features ONLY if not already implemented
- 🎨 Customize existing tools when requested
- 📦 Add integrations (after checking existing functionality)
- 🚀 Help deploy to production (Vercel + Neon + Stripe)
- 🐛 Debug issues (auth/database/API integration)
- 📝 Maintain documentation accuracy

**The authentication is PRODUCTION-READY. 8 professional tools are BUILT. Database architecture is SOLID. Admin system is WORKING. Check what exists before building anything new!** 🌟

**Key Files to Reference**:
- Database schema: `prisma/schema.sql`
- Token encryption: `lib/encryption.ts`
- Albums cache: `stores/albumsStore.ts`
- Auth config: `app/api/auth/[...nextauth]/route.ts`
- Tool states: `app/api/admin/tools/route.ts`
- SmugMug patterns: `app/api/smugmug/*/route.ts`
