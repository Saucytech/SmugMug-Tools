# Smugtools - Complete Tools Guide

Professional photographer tools for SmugMug account management. This guide documents all 8 production tools in the Smugtools platform.

---

## Quick Reference

| Tool | Purpose | AI Required | Best For |
|------|---------|-------------|----------|
| Embed & Sell | Create embeddable galleries | No | Portfolio websites, selling photos |
| Favorites Selector | Client photo selection | No | Wedding proofs, client approvals |
| MetaData Monster | AI metadata generation | Yes (1 coin/photo) | SEO optimization, bulk metadata |
| AI Gallery Creator | Structure organization | Yes (varies) | Event setup, folder organization |
| Photo Organizer | AI photo sorting | Yes (varies) | Organizing unsorted photos |
| Guest Upload Manager | Share upload links | No | Collecting guest photos |
| Folder Downloader | Bulk downloads | No | Backups, client delivery |
| Sanity Checker | Account analysis | Yes (varies) | Quality checks, optimization |

---

## Tool 1: Embed & Sell

**Location**: `/favorites`

**Purpose**: Create embeddable photo galleries for your website with optional buy buttons.

### Features

- **Multi-Album Selection**: Choose photos from multiple albums
- **4 Export Formats**:
  - HTML (standalone embed code)
  - React (React component code)
  - WordPress (shortcode)
  - JSON (raw data for custom integration)
- **Display Layouts**: Grid, Carousel, Masonry
- **Buy Button Integration**: Link to SmugMug cart/purchase
- **Mobile Responsive**: Works on all devices
- **Preview**: See gallery before exporting

### How to Use

#### Step 1: Load Albums
1. Click "Load Albums" button
2. Wait for your SmugMug albums to fetch
3. Albums appear in left sidebar

#### Step 2: Select Albums
1. Check boxes next to desired albums
2. Selected albums highlighted
3. Photos load in main grid

#### Step 3: Select Photos
1. Click photos to select/deselect
2. Selected photos show checkmark overlay
3. Counter shows selection count

#### Step 4: Choose Export Format
1. Click format tab (HTML/React/WordPress/JSON)
2. Review generated code
3. Configure buy button (optional)

#### Step 5: Export
1. Copy code to clipboard
2. Paste into your website
3. Test on live site

### Export Format Examples

**HTML Example**:
```html
<div class="smugtools-gallery">
  <img src="https://photos.smugmug.com/..." alt="Photo 1" />
  <img src="https://photos.smugmug.com/..." alt="Photo 2" />
</div>
<style>
  .smugtools-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
</style>
```

**React Example**:
```jsx
export default function Gallery() {
  const photos = [
    { url: "...", title: "Photo 1" },
    { url: "...", title: "Photo 2" }
  ];
  return (
    <div className="grid grid-cols-3 gap-4">
      {photos.map(p => <img key={p.url} src={p.url} alt={p.title} />)}
    </div>
  );
}
```

### Use Cases

- **Portfolio Websites**: Showcase work on personal sites
- **Client Proofing**: Embed galleries for client review
- **E-commerce**: Sell prints via SmugMug integration
- **Blog Posts**: Embed photo stories in WordPress
- **Custom Applications**: Use JSON for custom integrations

### Tips

- Select photos from multiple albums for variety
- Preview on mobile before deploying
- Use buy button for monetization
- Update gallery code when adding new photos

---

## Tool 2: Favorites Selector

**Location**: `/favorites-manager`

**Purpose**: Let clients select their favorite photos from your albums with beautiful, branded galleries.

### Features

- **7 Color Themes**:
  - Purple Elegance
  - Ocean Blue
  - Forest Green
  - Sunset Red
  - Golden Orange
  - Blush Pink
  - Dark Mode
- **Logo Branding**: Upload your logo (PNG/JPG/SVG, max 2MB)
- **Buy Button Toggle**: Enable/disable purchasing
- **Customer Tracking**: Collect name and email
- **Shareable Links**: Generate unique URLs for clients
- **Favorites Export**: Download CSV of selected photos
- **Session Persistence**: Client selections saved automatically

### How to Use

#### Step 1: Create Session
1. Navigate to Favorites Selector
2. Click "Create New Session"
3. Enter session name (e.g., "Smith Wedding - Proofs")

#### Step 2: Configure Branding
1. Select color theme from dropdown
2. Upload your logo (optional)
3. Toggle buy button on/off
4. Preview appearance in real-time

#### Step 3: Select Albums
1. Choose albums for client review
2. Albums load with all photos
3. Photos display in selected theme

#### Step 4: Share with Client
1. Click "Generate Link"
2. Copy shareable URL
3. Send to client via email/text
4. Client opens link in any browser

#### Step 5: Track Selections
1. Client selects favorite photos by clicking
2. Selected photos show heart icon
3. Client enters name and email (optional)
4. Client clicks "Submit Favorites"

#### Step 6: Review Favorites
1. Return to Favorites Selector dashboard
2. View all client sessions
3. See selected photos with thumbnails
4. Export CSV with photo URLs and metadata

### Client Experience

**What Client Sees**:
1. Branded gallery with your logo and colors
2. Large, high-quality photo previews
3. Simple click-to-select interface
4. Selection counter in header
5. Optional buy button for purchases
6. Name/email form before submitting

**Mobile Experience**:
- Touch-friendly large photo grids
- Swipe gestures for navigation
- Optimized loading for slow connections
- Responsive design adapts to screen size

### Use Cases

- **Wedding Photography**: Let couples select favorites for albums
- **Event Photography**: Allow attendees to pick photos
- **Family Portraits**: Help families choose their favorites
- **School Photos**: Students select yearbook photos
- **Corporate Events**: Team members pick headshots

### Tips

- Use consistent branding (logo + theme) across sessions
- Set clear selection limits for clients (e.g., "Pick 50 favorites")
- Follow up with clients who haven't submitted
- Export CSV for easy photo delivery
- Create template sessions for recurring events

### Theme Customization

Each theme includes:
- Header background color
- Button colors (primary/secondary)
- Selection highlight color
- Font colors (light/dark optimized)
- Logo placement and sizing

**Dark Mode Special**: Optimized for OLED screens, reduces eye strain for evening viewing.

---

## Tool 3: MetaData Monster

**Location**: `/metadata-monster`

**Purpose**: AI-powered bulk metadata generation for titles, captions, and keywords.

### Features

- **2 Operating Modes**:
  - **Normal Mode**: Process all photos in album
  - **Seek & Capture Mode**: Only process photos missing metadata
- **5 Prompt Styles**:
  - **Professional**: Business-appropriate descriptions
  - **Creative**: Artistic, expressive language
  - **Descriptive**: Detailed factual descriptions
  - **SEO**: Keyword-optimized for search engines
  - **Minimal**: Concise, short descriptions
- **Selective Fields**: Choose Title, Caption, Keywords, or all three
- **Edit Before Saving**: Review and modify AI suggestions
- **CSV Export**: Backup metadata before applying
- **Coin System**: 1 coin per photo processed

### How to Use

#### Step 1: Select Album
1. Click "Load Albums"
2. Choose album to process
3. Photos load with current metadata visible

#### Step 2: Choose Mode
**Normal Mode**:
- Processes ALL photos regardless of existing metadata
- Useful for refreshing outdated metadata
- Overwrites existing data (after review)

**Seek & Capture Mode**:
- Only processes photos with missing/empty fields
- Preserves existing good metadata
- More efficient for partially-tagged albums

#### Step 3: Configure Settings
1. Select prompt style from dropdown
2. Check boxes for desired fields:
   - ☑ Title
   - ☑ Caption
   - ☑ Keywords
3. Review coin cost estimate

#### Step 4: Process Photos
1. Click "Generate Metadata"
2. AI analyzes each photo
3. Progress bar shows completion
4. Results appear in editable table

#### Step 5: Review & Edit
1. Browse generated metadata in table
2. Edit any fields directly
3. See photo thumbnail alongside text
4. Flag photos to skip saving

#### Step 6: Save or Export
**Save to SmugMug**:
- Click "Save to SmugMug"
- Metadata updates via API
- Confirmation for each photo

**Export CSV**:
- Click "Export CSV"
- Download backup file
- Includes image keys and all metadata

### Prompt Style Comparison

**Example Photo**: Traditional Mexican cook flipping handmade tortillas

**Professional**:
- Title: "Traditional Mexican Tortilla Preparation"
- Caption: "Skilled artisan demonstrates authentic handmade tortilla cooking techniques using traditional methods."
- Keywords: culinary, mexican-cuisine, traditional-cooking, food-preparation, artisan

**Creative**:
- Title: "Dance of the Tortilla Master"
- Caption: "In a symphony of sizzling and flipping, ancient culinary wisdom comes alive through practiced hands transforming simple dough into golden perfection."
- Keywords: culinary-art, tradition, craftsmanship, cultural-heritage, gastronomic-journey

**SEO**:
- Title: "Mexican Cook Making Tortillas - Traditional Food Photography"
- Caption: "Professional food photography capturing authentic Mexican tortilla making process. Traditional cooking methods and handmade tortillas by skilled chef."
- Keywords: mexican-food, tortilla-making, traditional-cooking, food-photography, mexican-chef, handmade-tortillas, authentic-cuisine

**Minimal**:
- Title: "Making Tortillas"
- Caption: "Traditional Mexican cooking"
- Keywords: cooking, mexican, tortillas

### Cost Calculation

**Coin Usage**:
- Base: 1 coin per photo
- Includes: Image analysis + metadata generation
- Average tokens: 200-300 per photo
- Batch discount: None currently

**Example Costs**:
- 10 photos = 10 coins
- 50 photos = 50 coins
- 100 photos = 100 coins

### Use Cases

- **SEO Optimization**: Add keywords to portfolio galleries
- **Portfolio Enhancement**: Professional descriptions for client viewing
- **Bulk Tagging**: Process hundreds of event photos quickly
- **Missing Metadata**: Fill in gaps in existing albums
- **Multilingual Support**: Future - translate metadata

### Tips

- Start with Seek & Capture mode to save coins
- Export CSV before saving (backup!)
- Review AI suggestions - they're good but not perfect
- Use SEO mode for publicly-visible galleries
- Use Professional mode for client galleries
- Edit keywords to match your style
- Process albums in batches to manage coin usage

### Limitations

- English language only (currently)
- Cannot detect people/faces (privacy)
- May misinterpret artistic/abstract photos
- Requires good-quality image previews
- 1-minute timeout per photo (rare)

---

## Tool 4: AI Gallery Creator

**Location**: `/ai-gallery-creator`

**Purpose**: Create folder structures and galleries with AI assistance or manual tools.

### Features

- **AI Chat Interface**: Describe desired structure, AI creates it
- **5 Pre-built Templates**:
  1. Wedding Photography 2024
  2. Sports Team Season
  3. Real Estate Listings
  4. Portrait Session
  5. Corporate Event
- **Manual Tools**:
  - Create folder
  - Create gallery
  - Drag-and-drop organization
- **Destruction Mode**: Safely delete folders/galleries
- **Template Save/Load**: Save custom structures for reuse
- **Guest Upload Links**: Generate upload URLs for new galleries

### How to Use

#### Method 1: AI Chat
1. Click "AI Assistant" tab
2. Describe structure in natural language
3. Example prompts:
   - "Create a wedding structure with ceremony, reception, and portraits folders"
   - "Set up a real estate folder for 123 Main St with interior and exterior galleries"
   - "Make a sports season structure with practice, games, and highlights"
4. AI generates structure plan
5. Review and approve
6. AI creates folders/galleries in SmugMug

#### Method 2: Templates
1. Click "Templates" tab
2. Browse 5 pre-built templates
3. Select desired template
4. Customize names and settings
5. Click "Apply Template"
6. Structure created in SmugMug

#### Method 3: Manual Creation
1. Click "Manual Tools" tab
2. Use folder/gallery creation forms
3. Drag-and-drop to organize
4. Real-time preview of structure
5. Save when satisfied

### Template Descriptions

**1. Wedding Photography 2024**:
```
📁 [Wedding Name] - [Date]
  📁 Getting Ready
    📸 Bride Preparation
    📸 Groom Preparation
  📁 Ceremony
    📸 Ceremony Photos
  📁 Reception
    📸 Reception Photos
    📸 Dancing
  📁 Portraits
    📸 Couple Portraits
    📸 Family Portraits
```

**2. Sports Team Season**:
```
📁 [Team Name] - [Year] Season
  📁 Team Photos
    📸 Team Roster
    📸 Individual Portraits
  📁 Games
    📸 Game 1 vs [Opponent]
    📸 Game 2 vs [Opponent]
  📁 Practice
    📸 Practice Sessions
  📁 Highlights
    📸 Best of Season
```

**3. Real Estate Listings**:
```
📁 [Property Address]
  📁 Exterior
    📸 Front Elevation
    📸 Backyard
    📸 Street View
  📁 Interior
    📸 Living Spaces
    📸 Bedrooms
    📸 Kitchen/Bath
  📁 Details
    📸 Features & Finishes
```

**4. Portrait Session**:
```
📁 [Client Name] - [Date]
  📸 Individual Portraits
  📸 Family Portraits
  📸 Candid Moments
  📸 Client Selects
```

**5. Corporate Event**:
```
📁 [Event Name] - [Date]
  📁 Arrival & Setup
    📸 Venue Setup
  📁 Presentations
    📸 Keynote Speakers
  📁 Networking
    📸 Networking Photos
  📁 Group Photos
    📸 Team Photos
```

### Destruction Mode

**Safety Features**:
- Two-step confirmation
- Shows folder contents before deletion
- Can restore from SmugMug trash (60 days)
- Cannot delete non-empty folders (must delete galleries first)

**How to Delete**:
1. Enable "Destruction Mode" toggle
2. Select folder/gallery to delete
3. Review confirmation dialog
4. Confirm deletion
5. Item moves to SmugMug trash

### Guest Upload Link Generation

**Use Case**: Create gallery and immediately share upload link

**Steps**:
1. Create new gallery via AI or manual tools
2. Gallery appears in structure tree
3. Click "Generate Upload Link" button
4. Unique URL copied to clipboard
5. Share URL with clients/guests
6. They upload directly to gallery (no login needed)

**Upload Link Settings**:
- Optional password protection
- Upload limit (max photos per user)
- Expiration date
- Allow comments/captions

### Use Cases

- **Wedding Photographers**: Standardized wedding structure
- **Event Photographers**: Quick event setup
- **Real Estate**: Property listing galleries
- **Schools**: Class/team photo organization
- **Corporate**: Conference/meeting galleries
- **Portrait Studios**: Session folder templates

### Tips

- Save custom templates for recurring events
- Use AI for one-off unique structures
- Use templates for consistency across clients
- Enable guest uploads for immediate photo collection
- Delete empty test galleries regularly (Destruction Mode)
- Organize by date in folder names for chronological sorting

---

## Tool 5: Photo Organizer

**Location**: `/photo-organizer`

**Purpose**: AI-powered photo sorting with confidence scoring and smart indexing.

### Features

- **AI Auto-Sorting**: Analyzes photos and suggests correct albums
- **Confidence Scoring**: Shows AI's certainty (0-100%)
- **Smart Indexing**: Fast searches across large photo libraries
- **Bulk Organization**: Move multiple photos at once
- **Preview Mode**: See suggestions before applying
- **Undo Support**: Revert moves if needed

### How to Use

#### Step 1: Select Source Album
1. Choose "Unsorted" or source album
2. Photos load in grid view
3. Current location shown

#### Step 2: Define Destination Albums
1. Select target albums (where photos should go)
2. AI learns album purposes
3. Example: "Portraits", "Landscapes", "Events"

#### Step 3: Run AI Analysis
1. Click "Analyze Photos"
2. AI evaluates each photo
3. Suggests best-fit album
4. Assigns confidence score

#### Step 4: Review Suggestions
**Confidence Levels**:
- **90-100%**: High confidence, likely correct
- **70-89%**: Medium confidence, review recommended
- **Below 70%**: Low confidence, manual review needed

**Grid View**:
- Photo thumbnail
- Current location
- Suggested destination
- Confidence percentage
- Accept/Reject buttons

#### Step 5: Approve Moves
**Options**:
- Accept All High Confidence (>90%)
- Accept Individual Suggestions
- Edit Destination Manually
- Reject Suggestion

#### Step 6: Apply Changes
1. Click "Apply Organization"
2. Photos move via SmugMug API
3. Progress tracking
4. Completion report

### AI Logic

**How AI Determines Destination**:
1. **Visual Analysis**: Scene type, colors, composition
2. **Existing Metadata**: Title, caption, keywords
3. **Album Patterns**: Learns from existing album contents
4. **Filename Clues**: Date, camera settings, location

**Example Decisions**:
- Photo with wedding dress + chapel → "Weddings" album (95% confidence)
- Landscape with mountains + sunset → "Landscapes" album (92% confidence)
- Group photo at office → "Corporate Events" album (78% confidence)
- Abstract art → Multiple possibilities (55% confidence - manual review)

### Use Cases

- **Event Cleanup**: Sort event photos into categories
- **Travel Organization**: Separate landscapes, people, food
- **Studio Workflow**: Sort session photos by type
- **Client Deliveries**: Organize before delivery
- **Archive Management**: Retroactively organize old albums

### Tips

- Create clear, specific destination albums
- Add metadata to destination albums to train AI
- Review low-confidence suggestions manually
- Use descriptive album names (not "Album 1", "Album 2")
- Run in preview mode first
- Accept high-confidence moves to save time

### Limitations

- Cannot detect specific people (privacy)
- Needs at least 2 destination albums
- May struggle with abstract/artistic photos
- Requires photos in albums (not in library root)

---

## Tool 6: Guest Upload Manager

**Location**: `/guest-upload-manager`

**Purpose**: Share unique upload links with clients and guests for photo collection.

### Features

- **Project-Based Organization**: Group uploads by event/session
- **People Library**: Reusable people templates
- **Drag-and-Drop**: Easy people management
- **Unique URLs**: Each person gets private upload link
- **Batch Execution**: Create all galleries at once
- **Upload Tracking**: Monitor submissions
- **SmugMug Integration**: Direct upload to your account

### How to Use

#### Step 1: Create Project
1. Click "New Project"
2. Enter project name (e.g., "Smith Wedding")
3. Choose parent folder in SmugMug
4. Set project settings:
   - Upload limit per person
   - Allow captions
   - Require email

#### Step 2: Add People

**Method A: Manual Entry**:
1. Click "Add Person"
2. Fill in details:
   - Name (required)
   - Email (optional)
   - Notes (optional)
3. Person added to project list

**Method B: From People Library**:
1. Click "People Library" tab
2. Browse saved people templates
3. Drag person into project
4. Duplicate entry with all details

**Method C: CSV Import**:
1. Download CSV template
2. Fill in spreadsheet
3. Upload CSV file
4. People bulk imported

#### Step 3: Configure Upload Settings
**Per-Person Settings**:
- Max uploads (e.g., 50 photos)
- Gallery privacy (Public/Unlisted/Private)
- Upload deadline
- SmugMug folder destination

**Project-Wide Settings**:
- Watermarking (yes/no)
- Original photo retention
- Auto-gallery creation
- Notification emails

#### Step 4: Execute Pending
1. Review people list
2. Click "Execute Pending"
3. System creates:
   - SmugMug gallery for each person
   - Unique upload URL
   - Upload tracking record
4. URLs generated and displayed

#### Step 5: Share Links
**Distribution Options**:
- Copy individual links
- Export CSV with all links
- Send automated emails (if configured)
- Generate QR codes (future)

**Example Link**:
```
https://upload.smugmug.com/services/api/upload/...?uploadKey=abc123
```

#### Step 6: Monitor Uploads
**Tracking Dashboard**:
- Person name
- Photos uploaded / limit
- Last upload timestamp
- Gallery link
- Status indicator

**Actions**:
- View uploaded photos
- Extend limit
- Disable further uploads
- Delete gallery

### People Library

**Purpose**: Reuse common people across multiple projects

**Use Cases**:
- Recurring event attendees
- Regular clients
- Venue staff
- Team members

**Management**:
- Add to library from any project
- Edit library entries
- Delete unused entries
- Tag/categorize people

### Use Cases

- **Weddings**: Guests upload their photos
- **Events**: Attendees contribute shots
- **Team Sports**: Players upload action photos
- **Corporate**: Employees submit headshots
- **Family Reunions**: Everyone shares photos
- **Schools**: Students upload project photos

### Tips

- Set reasonable upload limits (25-50 photos typical)
- Include instructions in email to guests
- Use People Library for recurring events
- Execute Pending in batches to manage API calls
- Monitor uploads and extend limits if needed
- Thank guests for contributions

### Advanced Features

**SmugMug Gallery Settings** (inherited by upload galleries):
- Privacy levels
- Print purchasing (enabled/disabled)
- Download permissions
- Watermarking rules
- Gallery descriptions

**Bulk Actions**:
- Extend deadlines for all people
- Change privacy settings
- Move galleries to different folder
- Delete all project galleries

---

## Tool 7: Folder Downloader

**Location**: `/downloader`

**Purpose**: Download photos with preserved folder hierarchy in multiple formats.

### Features

- **3 Download Strategies**:
  1. **Single ZIP**: All photos in one ZIP file
  2. **Album-Based**: One ZIP per album
  3. **Auto-Split**: Automatic split at 150 photos per ZIP
- **5 Image Sizes**:
  - Original (full resolution)
  - X3Large (3000px longest side)
  - X2Large (1600px longest side)
  - XLarge (1024px longest side)
  - Large (800px longest side)
- **Folder Tree Navigation**: Checkbox tree for selection
- **Hierarchy Preservation**: Maintains folder structure in ZIP
- **Delete After Download**: Optional album deletion
- **Progress Tracking**: Real-time download progress

### How to Use

#### Step 1: Load Folder Tree
1. Tool fetches your SmugMug folder structure
2. Tree displays with expand/collapse controls
3. Checkboxes for folders and albums

#### Step 2: Select Content
**Selection Options**:
- Check individual albums
- Check entire folders (selects all child albums)
- Mix and match
- Select count shown in header

**Example Selection**:
```
☑ 2024 Events
  ☑ January
    ☑ New Year Party (45 photos)
    ☑ Birthday Shoot (23 photos)
  ☐ February
    ☐ Valentine's Session (67 photos)
```

#### Step 3: Choose Download Strategy

**Strategy 1: Single ZIP**:
- All photos in one file
- Maintains folder hierarchy inside ZIP
- Best for: Small selections (<500 photos)
- Pros: Simple, one download
- Cons: Large file size, slow if big

**Strategy 2: Album-Based**:
- One ZIP per selected album
- Each ZIP named after album
- Best for: Client delivery, organized downloads
- Pros: Easy to distribute, manageable sizes
- Cons: Multiple downloads

**Strategy 3: Auto-Split**:
- Automatically splits at 150 photos per ZIP
- Numbered sequentially (Part1.zip, Part2.zip, etc.)
- Best for: Very large downloads (>500 photos)
- Pros: Prevents huge files, faster processing
- Cons: Multiple files to manage

#### Step 4: Select Image Size

**Size Recommendations**:
- **Original**: Archival backups, printing, professional use
- **X3Large (3000px)**: High-quality web, social media, small prints
- **X2Large (1600px)**: Web galleries, email sharing
- **XLarge (1024px)**: Web use, screen viewing
- **Large (800px)**: Thumbnails, quick previews, small screens

**File Size Impact**:
- Original: 3-10 MB per photo
- X3Large: 1-3 MB per photo
- X2Large: 400-800 KB per photo
- XLarge: 200-400 KB per photo
- Large: 100-200 KB per photo

#### Step 5: Additional Options
**Delete After Download**:
- ☐ Delete albums from SmugMug after download
- **WARNING**: Permanent deletion (goes to trash for 60 days)
- Use case: Cleaning up after event delivery

**Preserve Metadata**:
- ☑ Include EXIF data in downloaded files
- Camera settings, date/time, location
- Recommended: Keep checked

#### Step 6: Initiate Download
1. Click "Start Download"
2. Server begins processing:
   - Fetches photos from SmugMug
   - Resizes to selected size
   - Creates ZIP file(s)
   - Preserves folder structure
3. Progress bar shows completion
4. Download link(s) appear
5. Click to download ZIP(s)

#### Step 7: Extract and Verify
1. Extract ZIP file(s) on your computer
2. Verify folder structure preserved
3. Check photo quality
4. Confirm photo count matches selection

### ZIP Structure Example

**Original SmugMug Structure**:
```
2024 Events/
  January/
    New Year Party/
      photo1.jpg
      photo2.jpg
    Birthday Shoot/
      photo3.jpg
```

**Downloaded ZIP Structure** (preserved):
```
2024-Events/
  January/
    New-Year-Party/
      photo1.jpg
      photo2.jpg
    Birthday-Shoot/
      photo3.jpg
```

### Use Cases

- **Archival Backups**: Download original resolution for local storage
- **Client Delivery**: Album-based ZIPs for easy distribution
- **Portfolio Migration**: Move to different platform
- **Local Editing**: Download for Lightroom/Photoshop work
- **Offline Access**: Keep copies for presentations
- **Space Cleanup**: Download then delete old albums

### Tips

- **For small deliveries (<100 photos)**: Use Single ZIP
- **For client deliveries**: Use Album-Based strategy
- **For massive backups (>1000 photos)**: Use Auto-Split
- **Test with small selection first**: Verify sizing and structure
- **Original for backups**: Always use Original size for archives
- **X2Large for web**: Good balance of quality and file size
- **Schedule large downloads**: Can take 10-30 minutes for 1000+ photos
- **Check available storage**: Ensure enough disk space

### Performance Expectations

**Download Times** (approximate):
- 50 photos (X2Large): 2-3 minutes
- 100 photos (X2Large): 5-7 minutes
- 500 photos (X2Large): 20-30 minutes
- 1000 photos (Original): 45-60 minutes

**Factors Affecting Speed**:
- Selected image size (Original slowest)
- SmugMug server load
- Your internet speed
- Number of albums
- Photo file sizes

### Limitations

- **Max photos per download**: 2000 (use multiple downloads if more)
- **SmugMug API rate limit**: 5000 requests/day
- **ZIP file size limit**: 4GB per ZIP (Auto-Split handles this)
- **Processing timeout**: 30 minutes (Auto-Split prevents this)

---

## Tool 8: Sanity Checker

**Location**: `/sanity-checker`

**Purpose**: Comprehensive AI-powered account analysis and optimization recommendations.

### Features

- **AI Deep Analysis**: Uses cached gallery data for comprehensive scan
- **Severity Categorization**:
  - **Critical Issues**: Must fix (broken links, missing albums)
  - **Optimization Suggestions**: Should fix (SEO, metadata gaps)
  - **General Suggestions**: Nice to have (organization, naming)
- **Terminal-Style Output**: Real-time log of findings
- **Clickable Links**: Jump directly to problem galleries
- **Auto-Fix**: Automatic fixes for some issues
- **Detailed Reports**: Export findings as PDF/CSV

### How to Use

#### Step 1: Run Sanity Check
1. Navigate to Sanity Checker
2. Click "Run Full Scan"
3. Tool fetches cached gallery data
4. AI begins analysis
5. Real-time log shows progress

**Log Output Example**:
```
[12:34:56] 🔍 Starting Sanity Check...
[12:34:57] ✓ Loaded 1,234 photos from cache
[12:34:58] ✓ Analyzing folder structure...
[12:35:03] ⚠️ Found 23 photos without titles
[12:35:05] ❌ Critical: Album "Wedding 2023" has broken gallery link
[12:35:08] ℹ️ Suggestion: Consider adding keywords to 145 photos
[12:35:12] ✓ Scan complete - 3 critical, 7 optimizations, 12 suggestions
```

#### Step 2: Review Findings

**Critical Issues** (Red):
- Broken gallery links
- Missing parent folders
- Duplicate albums (same name, location)
- Privacy setting conflicts
- Empty albums (no photos)

**Optimization Suggestions** (Yellow):
- Photos missing metadata (title/caption/keywords)
- Poor SEO (generic titles like "Photo 1")
- Inconsistent naming conventions
- Suboptimal folder organization
- Large image file sizes (not optimized)

**General Suggestions** (Blue):
- Consistent album naming
- Better folder grouping
- Seasonal organization
- Gallery descriptions
- Copyright notices

#### Step 3: Click Through Issues
1. Click any issue in log
2. Opens SmugMug directly to problem location
3. See issue in context
4. Fix manually or use auto-fix

#### Step 4: Apply Auto-Fixes

**Auto-Fixable Issues**:
- Empty albums (delete)
- Duplicate albums (merge)
- Missing metadata (generate with MetaData Monster)
- Privacy inconsistencies (standardize)
- Broken links (repair)

**How to Auto-Fix**:
1. Select issue in log
2. Click "Auto-Fix" button
3. Review proposed fix
4. Confirm action
5. AI applies fix via SmugMug API
6. Verify fix in log

#### Step 5: Export Report
**Export Formats**:
- **PDF**: Printable report with findings
- **CSV**: Spreadsheet with all issues
- **JSON**: Raw data for custom analysis

**Report Contents**:
- Executive summary
- Issue breakdown by severity
- Affected galleries list
- Recommended actions
- Before/after metrics

### Analysis Categories

#### 1. Metadata Quality
**Checks**:
- Title presence and quality
- Caption completeness
- Keyword density
- Copyright information
- Geolocation data

**Suggestions**:
- Add missing titles
- Improve generic titles ("IMG_1234" → descriptive)
- Add keywords for SEO
- Include photographer credit
- Remove GPS data if privacy concern

#### 2. Folder Organization
**Checks**:
- Logical folder hierarchy
- Consistent naming conventions
- Appropriate nesting depth
- Empty folders
- Orphaned galleries

**Suggestions**:
- Group related galleries into folders
- Standardize naming (date formats, capitalization)
- Flatten overly-nested structures
- Delete unused folders
- Move misplaced galleries

#### 3. Gallery Settings
**Checks**:
- Privacy settings consistency
- Print purchasing configuration
- Download permissions
- Social sharing settings
- Gallery descriptions

**Suggestions**:
- Align privacy across event galleries
- Enable print sales where appropriate
- Protect client proofs (private)
- Add gallery descriptions for SEO

#### 4. Photo Quality
**Checks**:
- Duplicate photos (same file hash)
- Extremely large file sizes
- Poor image quality (low resolution)
- Incorrect orientations
- Missing photos (broken references)

**Suggestions**:
- Remove exact duplicates
- Resize oversized photos
- Delete low-quality rejects
- Rotate misoriented photos

#### 5. SEO Optimization
**Checks**:
- Album URL slugs
- Photo title uniqueness
- Keyword presence
- Alt text quality
- Gallery descriptions

**Suggestions**:
- Improve URL slugs (descriptive, not generic)
- Use unique photo titles
- Add relevant keywords
- Write compelling descriptions
- Include location data

### Use Cases

- **Pre-Delivery Quality Check**: Before sending galleries to clients
- **SEO Audit**: Optimize portfolio for search engines
- **Spring Cleaning**: Annual account maintenance
- **Migration Prep**: Before moving to new platform
- **Client Onboarding**: Audit new client's existing account

### Tips

- Run after major uploads or reorganizations
- Schedule quarterly scans for maintenance
- Fix critical issues immediately
- Batch optimization suggestions
- Use MetaData Monster for metadata gaps
- Export report for planning work sessions
- Track improvements over time

### Severity Guide

**When to Fix**:
- **Critical**: Immediately (breaks functionality)
- **Optimization**: Within 1 week (impacts client experience)
- **General**: When convenient (nice-to-have improvements)

**Prioritization**:
1. Fix critical issues first
2. Optimize client-facing galleries
3. Improve internal organization
4. Enhance SEO for portfolio

---

## Coin System

Several tools use the AI-powered coin system for processing.

### Coin-Based Tools

| Tool | Cost | What It Does |
|------|------|--------------|
| MetaData Monster | 1 coin/photo | Generates title, caption, keywords |
| AI Gallery Creator | Varies | Creates folder structures |
| Photo Organizer | Varies | Sorts photos into albums |
| Sanity Checker | Varies | Analyzes account health |

### Purchasing Coins

**Coin Packages** (via Stripe):
- **Starter**: 1,000 coins - $9.99
- **Professional**: 5,000 coins - $39.99
- **Enterprise**: 15,000 coins - $99.99

**How to Purchase**:
1. Navigate to `/pricing`
2. Select package
3. Click "Purchase"
4. Checkout via Stripe
5. Coins credited immediately

### Tracking Coin Usage

**AI Dashboard** (`/ai-dashboard`):
- Current coin balance
- Usage history
- Cost per operation
- Tokens consumed
- Remaining balance projection

**Coin Transactions**:
- Purchase history
- Usage breakdown by tool
- Refunds (if applicable)
- Bonus coins from admin

### Coin Tips

- Start with Starter package to test tools
- Use Seek & Capture mode in MetaData Monster to save coins
- Batch operations when possible
- Monitor balance in AI Dashboard
- Contact admin for bonus coins (issues, testing)

---

## Mobile Optimization

All 8 tools are fully responsive and optimized for mobile devices.

### Mobile-Friendly Features

**Touch Interfaces**:
- Large tap targets (44x44px minimum)
- Swipe gestures for galleries
- Pull-to-refresh
- Touch-friendly checkboxes

**Performance**:
- Progressive image loading
- Reduced data usage
- Offline fallbacks
- Fast tap responses

**Layout**:
- Single-column layouts on mobile
- Collapsible sections
- Bottom navigation
- Sticky headers

### Mobile-Specific Tips

- Use Favorites Selector on tablets for client reviews
- Test uploads on mobile before sharing guest links
- Download smaller image sizes on mobile (X2Large or XLarge)
- Use portrait orientation for MetaData Monster review
- Enable landscape for Photo Organizer grid view

---

## Keyboard Shortcuts

Power user shortcuts for faster workflows:

| Shortcut | Action | Tools |
|----------|--------|-------|
| `Ctrl/Cmd + A` | Select all photos | Embed & Sell, Photo Organizer |
| `Ctrl/Cmd + D` | Deselect all | Embed & Sell, Photo Organizer |
| `Space` | Quick preview | All tools with photo grids |
| `Arrow Keys` | Navigate photos | All tools with photo grids |
| `Enter` | Confirm action | All tools with dialogs |
| `Esc` | Cancel/Close | All tools with dialogs |

---

## Troubleshooting

### Common Issues

**"Not enough coins"**:
- Solution: Purchase more coins at `/pricing`
- Alternative: Use non-AI tools (Embed & Sell, Guest Upload Manager)

**"SmugMug connection failed"**:
- Solution: Re-connect SmugMug account
- Go to dashboard, click "Connect SmugMug"
- Re-authorize application

**"Photos not loading"**:
- Solution 1: Refresh album cache (click refresh button)
- Solution 2: Clear browser cache
- Solution 3: Check SmugMug album permissions

**"Download failed"**:
- Solution: Reduce selection size or image size
- Try Album-Based strategy instead of Single ZIP
- Check internet connection stability

**"Upload link not working"**:
- Solution: Verify link hasn't expired
- Check SmugMug gallery still exists
- Regenerate upload link in Guest Upload Manager

---

## Getting Help

### In-App Support

**Feature Requests**:
- Use Feature Request tool on homepage
- Describe desired functionality
- Vote on existing requests

**Bug Reports**:
- Email: support@smugtools.com
- Include: Tool name, steps to reproduce, screenshots

### Documentation

- **Setup Guide**: [MULTI_TENANT_SETUP.md](./MULTI_TENANT_SETUP.md)
- **API Reference**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Admin Guide**: [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)

### Community

- **GitHub Issues**: Report bugs and request features
- **Email Support**: support@smugtools.com
- **SmugMug Forums**: Community discussions

---

**Last Updated**: 2025-10-08

**Transform your SmugMug workflow with Smugtools!** 🚀
