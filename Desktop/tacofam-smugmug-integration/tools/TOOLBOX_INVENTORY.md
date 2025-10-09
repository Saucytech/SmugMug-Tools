# Smugtools - Complete Tool Inventory

**Last Updated:** 2025-10-08
**Purpose:** Comprehensive reference document for all Smugtools tools, their features, locations, and development status.

---

## Table of Contents
1. [Overview](#overview)
2. [Tool Registry](#tool-registry)
3. [Navigation Integration](#navigation-integration)
4. [Development Status](#development-status)
5. [File Structure](#file-structure)
6. [Adding New Tools](#adding-new-tools)
7. [Mobile Optimization Checklist](#mobile-optimization-checklist)

---

## Overview

The Smugtools contains **10 professional tools** for photographers and SmugMug users. All tools are:
- Fully integrated into navigation (homepage + header dropdown)
- Authenticated with SmugMug OAuth 1.0a
- Built with Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Production-ready with error handling and loading states

---

## Tool Registry

### 1. Embed & Sell
**ID:** `embed-sell`
**Path:** `/` (homepage tool selector)
**Icon:** ShoppingCart (Purple gradient)
**Color Theme:** Purple (#9333EA)
**File Location:** `app/page.tsx` (inline component)

**Purpose:**
Create embeddable photo galleries with buy buttons for selling photos on external websites.

**Key Features:**
- Multi-select photos across albums
- 3 display layouts (Grid, Carousel, Slideshow)
- Generate embed codes with buy buttons
- Live preview before exporting
- SmugMug Buy button integration

**Tech Stack:**
- State: React useState + Set for selections
- Storage: None (session-based)
- API: `/api/smugmug/albums/{albumKey}/images`

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED**

---

### 2. Favorites Selector (Favorites Manager)
**ID:** `favorites`
**Path:** `/favorites-manager`
**Icon:** Heart (Pink gradient)
**Color Theme:** Pink (#DB2777)
**File Location:** `app/favorites-manager/page.tsx`

**Purpose:**
Create shareable client galleries where customers can select their favorite photos. Perfect for client approvals and photo selection sessions.

**Key Features:**
- Create unlimited favorite sessions
- Multi-album support
- Shareable public links (no auth required)
- Customizable themes and branding
- Optional "Buy" button integration
- Real-time vote tracking
- Results dashboard with CSV export
- Track who voted for each photo

**Tech Stack:**
- State: localStorage for sessions
- Storage: Client-side localStorage (favoritesStorage utility)
- API: `/api/smugmug/albums/{albumKey}/images`

**Related Pages:**
- `app/favorites-manager/page.tsx` - Main dashboard (create/manage sessions)
- `app/favorites-manager/[sessionId]/page.tsx` - Results page (view votes)
- `app/favorites/[sessionId]/page.tsx` - Customer-facing selection page (public)

**Mobile Status:** ✅ **FULLY OPTIMIZED (Phase 1 - Completed)**
- Responsive layouts with table-to-cards pattern
- 44x44px touch targets (WCAG compliant)
- Mobile-friendly forms and modals
- Optimized floating action bars

---

### 3. MetaData Monster
**ID:** `metadata-monster`
**Path:** `/metadata-monster`
**Icon:** Code2 (Green gradient)
**Color Theme:** Green (#10B981)
**File Location:** `app/metadata-monster/page.tsx`

**Purpose:**
AI-powered bulk metadata generator. Automatically create titles, captions, and keywords for photos using Claude AI.

**Key Features:**
- AI-powered metadata generation
- Batch process entire albums
- 6 prompt styles (Professional, Creative, SEO, Storytelling, Technical, Minimal)
- Credit-based system (50 free credits)
- Edit before saving
- Direct save to SmugMug
- Export reports as CSV
- Skip already-processed photos

**Tech Stack:**
- State: React useState
- Storage: localStorage for credits
- AI: Claude API via `/api/ai/generate-metadata`
- SmugMug: PATCH `/api/smugmug/image/{imageKey}`

**Mobile Status:** ⚠️ **PARTIALLY OPTIMIZED (Phase 2 - In Progress)**
- ✅ Fixed ReferenceError bugs (lines 387, 426)
- ❌ Has pre-existing syntax error at line 597 (missing closing brace)
- ❌ Mobile UI optimizations blocked by syntax error
- Needs: Responsive checkboxes, mobile-friendly forms, optimized layouts

**Known Issues:**
- **CRITICAL:** Syntax error at line 597 - missing closing brace in return statement
  - Error exists in git commit 602512e (pre-existing)
  - Blocks all mobile optimization work
  - File has 136 `{` but only 135 `}` before line 595

---

### 4. AI Gallery Creator
**ID:** `ai-gallery-creator`
**Path:** `/ai-gallery-creator`
**Icon:** Sparkles (Teal/Cyan gradient)
**Color Theme:** Teal (#14B8A6)
**File Location:** `app/ai-gallery-creator/page.tsx`

**Purpose:**
Chat with AI to create complex folder and gallery structures automatically. Describe your desired organization and let AI build it.

**Key Features:**
- Conversational AI interface
- Create nested folder structures
- Bulk gallery creation
- Natural language commands
- Preview before execution
- Auto-organization suggestions

**Tech Stack:**
- State: React useState + chat history
- AI: Claude API for structure planning
- SmugMug: Folder/Album creation APIs

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED (Phase 4)**

---

### 5. Photo Organizer
**ID:** `photo-organizer`
**Path:** `/photo-organizer`
**Icon:** Brain (Indigo/Purple gradient)
**Color Theme:** Indigo (#6366F1)
**File Location:** `app/photo-organizer/page.tsx`

**Purpose:**
AI-powered photo organization with smart gallery indexing. Build an index of existing albums, then auto-sort new photos with confidence scores.

**Key Features:**
- Smart gallery indexing
- AI-powered auto-sorting
- Confidence-based suggestions
- Dry run mode (preview before moving)
- Manual override options
- Batch processing
- Index persistence

**Tech Stack:**
- State: localStorage for gallery index
- Storage: localStorage key: `photo-organizer-index`
- AI: Claude for image analysis and categorization
- SmugMug: Image move/copy APIs

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED (Phase 5)**

---

### 6. Guest Upload Manager
**ID:** `guest-upload-manager`
**Path:** `/guest-upload-manager`
**Icon:** Upload (Blue/Cyan gradient)
**Color Theme:** Blue (#3B82F6)
**File Location:** `app/guest-upload-manager/page.tsx`

**Purpose:**
Create shareable upload links for clients and guests. Let them upload photos directly to your SmugMug albums.

**Key Features:**
- Generate shareable upload links
- Optional password protection
- Direct upload to specific albums
- Progress tracking
- File validation
- Guest naming/email capture
- Upload history

**Tech Stack:**
- State: React useState
- Storage: Session-based
- SmugMug: Upload API endpoint
- File handling: FormData + fetch

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED (Phase 6)**

---

### 7. Multi-Album Selector
**ID:** `multi-album-selector`
**Path:** `/multi-album-selector`
**Icon:** Grid (Cyan gradient)
**Color Theme:** Cyan (#06B6D4)
**File Location:** `app/multi-album-selector/page.tsx`

**Purpose:**
Select photos across multiple albums and generate embeddable galleries with 8 different display styles.

**Key Features:**
- Multi-album photo selection
- 8 display styles:
  - Grid (responsive columns)
  - Carousel (horizontal scroll)
  - Masonry (Pinterest-style)
  - Slideshow (auto-advance)
  - Lightbox (modal view)
  - Pinterest (staggered grid)
  - Justified (row-based)
  - Polaroid (tilted frames)
- Export formats:
  - HTML (standalone)
  - React component
  - WordPress shortcode
  - JSON data
- Live preview
- Customization options:
  - Column count
  - Spacing
  - Borders
  - Shadows
  - Hover effects
  - Captions

**Tech Stack:**
- State: React useState + Set for selections
- Storage: Session-based (no persistence)
- SmugMug: Album/Image APIs

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED (Phase 3)**

**Previously Orphaned:** This tool was not listed in homepage or header dropdown until 2025-10-08.

---

### 8. API Reference
**ID:** `api-reference`
**Path:** `/api-reference`
**Icon:** Book (Amber/Orange gradient)
**Color Theme:** Amber (#F59E0B)
**File Location:** `app/api-reference/page.tsx`

**Purpose:**
Interactive SmugMug API documentation browser. Search endpoints, view examples, and understand API structure.

**Key Features:**
- Categorized endpoint browser
- Authentication docs
- User, Album, Image, Folder, Search endpoints
- Request/response examples
- Parameter documentation
- Copy-paste ready examples
- Search functionality

**Tech Stack:**
- State: React useState for filtering
- Data: Static endpoint definitions
- Display: Expandable sections with syntax highlighting

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED (Phase 4)**

**Previously Orphaned:** This tool was not listed in homepage or header dropdown until 2025-10-08.

---

### 9. Metadata Viewer
**ID:** `metadata-viewer`
**Path:** `/metadata`
**Icon:** Eye (Slate/Gray gradient)
**Color Theme:** Slate (#64748B)
**File Location:** `app/metadata/page.tsx`

**Purpose:**
Inspect detailed EXIF and metadata for individual SmugMug images. View camera settings, GPS data, keywords, and full technical details.

**Key Features:**
- Input ImageKey to fetch metadata
- Display EXIF data (camera, lens, settings)
- GPS location info
- Keywords and tags
- File information
- Upload details
- Organized by category
- Copy data to clipboard

**Tech Stack:**
- State: React useState
- API: `/api/smugmug/image/{imageKey}`
- Display: Organized metadata sections

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED (Phase 5)**

**Previously Orphaned:** This tool was not listed in homepage or header dropdown until 2025-10-08.

**Note:** Uses the problematic `/api/v2/image/{imageKey}` endpoint that has OAuth nonce issues. May need to switch to sessionStorage pattern like other tools.

---

### 10. Sanity Checker
**ID:** `sanity-checker`
**Path:** `/sanity-checker`
**Icon:** ClipboardCheck (Orange/Red gradient)
**Color Theme:** Orange (#F97316)
**File Location:** `app/sanity-checker/page.tsx`

**Purpose:**
Comprehensive account analysis tool. Scan all galleries, metadata, and settings to find optimization opportunities and potential issues.

**Key Features:**
- Full account scan
- Gallery analysis
- Metadata completeness check
- SEO optimization suggestions
- Duplicate detection
- Missing information alerts
- AI-powered recommendations
- Auto-fix capabilities
- Detailed reports
- Export findings as CSV

**Tech Stack:**
- State: React useState + localStorage for index
- Storage: Uses gallery index from Photo Organizer
- AI: Claude for analysis and suggestions
- SmugMug: Multiple API endpoints for data collection

**Mobile Status:** ⚠️ **NOT YET OPTIMIZED (Phase 6)**

**Previously Missing from Homepage:** Was in ToolboxHeader but not on homepage grid until 2025-10-08.

---

## Navigation Integration

### ToolboxHeader Component
**Location:** `components/ToolboxHeader.tsx`

**Purpose:**
Persistent header shown on all tool pages with dropdown navigation.

**TOOLS Array:**
```typescript
const TOOLS: Tool[] = [
  { id: 'embed-sell', name: 'Embed & Sell', path: '/', color: 'text-purple-600', icon: ShoppingCart },
  { id: 'favorites', name: 'Favorites Selector', path: '/favorites-manager', color: 'text-pink-600', icon: Heart },
  { id: 'metadata-monster', name: 'MetaData Monster', path: '/metadata-monster', color: 'text-green-600', icon: Code2 },
  { id: 'ai-gallery-creator', name: 'AI Gallery Creator', path: '/ai-gallery-creator', color: 'text-teal-600', icon: Sparkles },
  { id: 'photo-organizer', name: 'Photo Organizer', path: '/photo-organizer', color: 'text-indigo-600', icon: Brain },
  { id: 'guest-upload-manager', name: 'Guest Upload Manager', path: '/guest-upload-manager', color: 'text-blue-600', icon: Upload },
  { id: 'multi-album-selector', name: 'Multi-Album Selector', path: '/multi-album-selector', color: 'text-cyan-600', icon: Grid },
  { id: 'api-reference', name: 'API Reference', path: '/api-reference', color: 'text-amber-600', icon: Book },
  { id: 'metadata-viewer', name: 'Metadata Viewer', path: '/metadata', color: 'text-slate-600', icon: Eye },
  { id: 'sanity-checker', name: 'Sanity Checker', path: '/sanity-checker', color: 'text-orange-600', icon: ClipboardCheck },
];
```

**Props:**
- `currentTool?: string` - Highlights active tool in dropdown

**Features:**
- Logo button (returns to homepage)
- Tool switcher dropdown (shows all tools except current)
- User menu with avatar and logout
- Authenticated user display
- Sticky positioning

### Homepage Dashboard
**Location:** `app/page.tsx`

**Purpose:**
Main landing page with tool grid for authenticated users.

**Tool Cards:**
All 10 tools displayed as clickable cards with:
- Gradient icon background
- Tool name and description
- Feature tags (3 per tool)
- "Launch Tool" button with arrow animation
- Hover effects (shadow, scale, border color)

**Unauthenticated State:**
Shows SmugMug OAuth login button and welcome message.

---

## Development Status

### Mobile Optimization Phases

#### ✅ Phase 1: Favorites Manager (COMPLETED)
- Fixed dynamic Tailwind classes bug
- Implemented responsive layouts
- Added table-to-cards pattern
- Ensured 44x44px touch targets
- Optimized all 3 pages:
  - Main dashboard
  - Results page
  - Customer-facing selection page

#### ⚠️ Phase 2: MetaData Monster (IN PROGRESS - BLOCKED)
- ✅ Fixed ReferenceError bugs (err → _err)
- ❌ **BLOCKED:** Pre-existing syntax error at line 597
  - Missing closing brace before return statement
  - Error exists in git commit 602512e
  - Prevents all mobile optimization work
- **Next Steps:** Fix syntax error before continuing

#### 🔜 Phase 3: Multi-Album Selector (PENDING)
- Not started
- Needs responsive layout audit
- Touch target improvements
- Mobile-friendly export UI

#### 🔜 Phase 4: API Reference (PENDING)
- Not started
- Needs collapsible sections for mobile
- Touch-friendly navigation
- Responsive code blocks

#### 🔜 Phase 5: Metadata Viewer (PENDING)
- Not started
- Single-column metadata display
- Touch-friendly input
- Responsive data tables

#### 🔜 Phase 6: Remaining Tools (PENDING)
- AI Gallery Creator
- Photo Organizer
- Guest Upload Manager
- Sanity Checker
- Main Dashboard

---

## File Structure

```
app/
├── page.tsx                          # Homepage + Embed & Sell tool
├── favorites-manager/
│   ├── page.tsx                      # Create/manage sessions
│   └── [sessionId]/page.tsx          # View results
├── favorites/
│   └── [sessionId]/page.tsx          # Customer selection page (public)
├── metadata-monster/page.tsx         # AI metadata generator
├── ai-gallery-creator/page.tsx       # AI-powered gallery builder
├── photo-organizer/page.tsx          # Smart photo sorting
├── guest-upload-manager/page.tsx     # Client upload links
├── multi-album-selector/page.tsx     # Embeddable gallery creator
├── api-reference/page.tsx            # API documentation browser
├── metadata/page.tsx                 # EXIF/metadata viewer
├── sanity-checker/page.tsx           # Account analysis tool
└── api/
    ├── auth/smugmug/
    │   ├── route.ts                  # OAuth initiation
    │   └── callback/route.ts         # OAuth callback
    ├── ai/
    │   └── generate-metadata/route.ts # AI metadata generation
    └── smugmug/
        ├── albums/
        │   ├── route.ts              # Fetch albums
        │   └── [albumKey]/images/route.ts # Fetch images
        ├── folders/route.ts          # Fetch folders
        ├── user/route.ts             # Get user info
        └── image/[imageKey]/route.ts # Update image metadata

components/
└── ToolboxHeader.tsx                 # Navigation header with dropdown

lib/
├── smugmug-client.ts                 # OAuth helper + token storage
└── favorites-storage.ts              # Favorites session storage utility

tools/
└── TOOLBOX_INVENTORY.md             # This document
```

---

## Adding New Tools

### Checklist for Adding a New Tool:

1. **Create Tool Page**
   - Create `app/your-tool/page.tsx`
   - Use `'use client'` directive
   - Import ToolboxHeader component
   - Add authentication check

2. **Add to ToolboxHeader**
   - Edit `components/ToolboxHeader.tsx`
   - Import required Lucide icon
   - Add to TOOLS array with:
     - Unique `id` (kebab-case)
     - Display `name`
     - Tool `path`
     - Icon component
     - Color theme (text-{color}-600)

3. **Add to Homepage**
   - Edit `app/page.tsx`
   - Import icon if needed
   - Add tool card in the grid with:
     - onClick handler (router.push)
     - Gradient background matching color theme
     - Tool name and description
     - 3 feature tags
     - "Launch Tool" button

4. **Update This Document**
   - Add tool to [Tool Registry](#tool-registry)
   - Include all features and tech stack
   - Document file locations
   - Set mobile status to "NOT YET OPTIMIZED"

5. **Test Navigation**
   - Verify tool appears in homepage grid
   - Verify tool appears in header dropdown
   - Test navigation from both locations
   - Test authentication flow

---

## Mobile Optimization Checklist

When optimizing a tool for mobile, ensure:

### Touch Targets (WCAG 2.1 Level AA)
- [ ] All buttons minimum 44x44px
- [ ] All links minimum 44x44px
- [ ] All checkboxes/radios 44x44px
- [ ] Adequate spacing between touch targets (8px minimum)

### Typography
- [ ] Base text size 16px (prevents iOS auto-zoom)
- [ ] Use responsive font sizes: `text-base sm:text-lg`
- [ ] Headings scale: `text-2xl sm:text-3xl md:text-4xl`
- [ ] Line height adequate for readability

### Layout
- [ ] Single-column layouts on mobile (<768px)
- [ ] Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- [ ] No horizontal scrolling
- [ ] Adequate padding/margins (px-4 sm:px-6 md:px-8)

### Tables
- [ ] Convert tables to cards on mobile
- [ ] Use `hidden md:table` for desktop tables
- [ ] Use `md:hidden` for mobile card layouts
- [ ] Ensure all data is accessible in card format

### Forms
- [ ] Full-width inputs on mobile
- [ ] `text-base` input font size (prevents zoom)
- [ ] Adequate input padding (py-3 sm:py-4)
- [ ] Labels properly associated
- [ ] Clear error messages

### Modals/Dialogs
- [ ] Full-height on mobile
- [ ] Easy-to-hit close buttons (min 44x44px)
- [ ] Scrollable content
- [ ] Fixed action buttons at bottom

### Images
- [ ] Responsive aspect ratios
- [ ] Lazy loading (`loading="lazy"`)
- [ ] Proper alt text
- [ ] Touch-friendly thumbnails

### Navigation
- [ ] Hamburger menu on mobile (if needed)
- [ ] Bottom navigation bars (if appropriate)
- [ ] Swipeable elements clearly indicated
- [ ] Back buttons accessible

### Performance
- [ ] Test on slow connections
- [ ] Minimize initial load time
- [ ] Progressive enhancement
- [ ] Skeleton loaders for async content

### Testing
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test at 375px width (iPhone SE)
- [ ] Test at 768px width (iPad)
- [ ] Test landscape orientation
- [ ] Use browser DevTools mobile emulation

---

## Known Issues

### Critical
1. **MetaData Monster - Syntax Error (Line 597)**
   - Missing closing brace in return statement
   - Exists in git commit 602512e (pre-existing)
   - Blocks all mobile optimization work
   - **Status:** Unresolved
   - **Priority:** HIGH

### API Limitations
1. **SmugMug OAuth Nonce Issue**
   - GET `/api/v2/image/{imageKey}` endpoint has persistent nonce collision errors
   - Even with unique nonces, returns `oauth_problem=nonce_used`
   - **Workaround:** Use sessionStorage pattern instead
   - **Affected Tools:** Metadata Viewer (potentially)

### Mobile Optimization
1. **9 Tools Not Mobile-Optimized**
   - Only Favorites Manager is fully responsive
   - Others need systematic mobile optimization
   - **Status:** In progress (phase-by-phase approach)

---

## Change Log

### 2025-10-08
- **Added 3 orphaned tools to navigation:**
  - Multi-Album Selector
  - API Reference
  - Metadata Viewer
- **Updated ToolboxHeader:**
  - Added Grid, Book, Eye icons
  - Added 3 new tools to TOOLS array
- **Updated Homepage:**
  - Added Grid, Eye icons to imports
  - Added 3 new tool cards to grid
  - Added Sanity Checker (was already in header)
- **Created this document** (`tools/TOOLBOX_INVENTORY.md`)
- **Verified:** All 10 tools now synced across homepage and header

### Previous Changes
- Phase 1 (Favorites Manager) mobile optimization completed
- Phase 2 (MetaData Monster) - Fixed ReferenceError bugs, blocked by syntax error

---

## Maintenance Notes

### Regular Updates Required:
1. Update tool count when new tools are added
2. Update [Tool Registry](#tool-registry) with new features
3. Update [Navigation Integration](#navigation-integration) when structure changes
4. Update [Development Status](#development-status) as mobile optimization progresses
5. Update [Change Log](#change-log) with all modifications

### Before Adding a New Tool:
1. Read [Adding New Tools](#adding-new-tools) checklist
2. Choose a unique color theme not already used
3. Select appropriate Lucide icon
4. Update this document before committing code

### Mobile Optimization Workflow:
1. Complete one tool at a time (follow phase order)
2. Test thoroughly on mobile devices
3. Update mobile status in tool registry
4. Mark phase as completed in [Development Status](#development-status)
5. Update this document

---

**Document Maintained By:** Development Team
**Review Frequency:** After each tool addition or major update
**Version:** 1.0.0
