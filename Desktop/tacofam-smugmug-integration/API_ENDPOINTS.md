# SmugMug Toolbox API Endpoints Reference

Complete reference for all API endpoints in the SmugMug Toolbox application.

---

## 🔐 Authentication

All `/api/smugmug/*` endpoints now use **HTTP-only cookies** for authentication (as of latest security update).

**No longer required in headers:**
- ~~`X-Access-Token`~~ (deprecated)
- ~~`X-Access-Token-Secret`~~ (deprecated)

**Instead, use:**
```javascript
fetch('/api/smugmug/endpoint', {
  credentials: 'include', // Automatically sends cookies
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## 📍 Authentication Endpoints

### `GET /api/auth/smugmug`
**Purpose:** Initiate OAuth 1.0a authentication flow with SmugMug

**Request:**
```javascript
window.location.href = '/api/auth/smugmug';
```

**Response:**
```json
{
  "redirectUrl": "https://api.smugmug.com/services/oauth/1.0a/authorize?oauth_token=..."
}
```

---

### `GET /api/auth/smugmug/callback`
**Purpose:** Handle OAuth callback and store tokens in secure cookies

**Query Parameters:**
- `oauth_token` - Request token from SmugMug
- `oauth_verifier` - Verification code

**Response:** Redirects to `/` with tokens stored in HTTP-only cookies

---

### `POST /api/auth/logout` *(NEW)*
**Purpose:** Clear authentication cookies and log out user

**Request:**
```javascript
await fetch('/api/auth/logout', {
  method: 'POST',
  credentials: 'include',
});
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📸 SmugMug API Endpoints

### `GET /api/smugmug/user`
**Purpose:** Get authenticated user information

**Request:**
```javascript
const response = await fetch('/api/smugmug/user', {
  credentials: 'include'
});
```

**Response:**
```json
{
  "user": {
    "NickName": "username",
    "Name": "Full Name",
    "Uris": {
      "Node": { "Uri": "/api/v2/node/..." }
    }
  }
}
```

**Used by:** Main dashboard, authentication check

---

### `GET /api/smugmug/albums`
**Purpose:** List all albums for authenticated user

**Request:**
```javascript
const response = await fetch('/api/smugmug/albums', {
  credentials: 'include'
});
```

**Response:**
```json
{
  "albums": [
    {
      "AlbumKey": "abc123",
      "Name": "My Album",
      "ImageCount": 42,
      "Uris": {
        "AlbumImages": { "Uri": "/api/v2/album/abc123!images" }
      }
    }
  ]
}
```

**Used by:** MetaData Monster, Multi-Album Selector, Favorites Manager

---

### `GET /api/smugmug/albums/[albumKey]/images`
**Purpose:** Get all images in a specific album

**Path Parameters:**
- `albumKey` - Album identifier

**Request:**
```javascript
const response = await fetch('/api/smugmug/albums/albumKey123/images', {
  credentials: 'include'
});
```

**Response:**
```json
{
  "images": [
    {
      "ImageKey": "xyz789",
      "FileName": "IMG_001.jpg",
      "Title": "Sunset",
      "Caption": "Beautiful sunset",
      "Keywords": "nature, sunset",
      "ThumbnailUrl": "https://...",
      "ArchivedUri": "https://..."
    }
  ]
}
```

**Used by:** MetaData Monster, Favorites Manager, Photo pages

---

### `PATCH /api/smugmug/album/[albumKey]/image/[imageKey]`
**Purpose:** Update image metadata within album context

**Path Parameters:**
- `albumKey` - Album identifier
- `imageKey` - Image identifier

**Request Body:**
```json
{
  "Title": "New Title",
  "Caption": "New caption",
  "Keywords": "keyword1, keyword2"
}
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Includes 5-15 second random delay to avoid SmugMug nonce collisions

**Used by:** MetaData Monster

---

### `PATCH /api/smugmug/image/[imageKey]`
**Purpose:** Update image metadata directly

**Path Parameters:**
- `imageKey` - Image identifier

**Request Body:**
```json
{
  "Title": "Updated Title",
  "Caption": "Updated caption",
  "Keywords": "new, keywords"
}
```

**Response:**
```json
{
  "success": true,
  "image": { /* updated image data */ }
}
```

**Used by:** Metadata editor components

---

### `GET /api/smugmug/folders`
**Purpose:** List all folders for authenticated user

**Request:**
```javascript
const response = await fetch('/api/smugmug/folders', {
  credentials: 'include'
});
```

**Response:**
```json
{
  "folders": [
    {
      "NodeID": "abc123",
      "Name": "2024",
      "Type": "Folder",
      "Uri": "/api/v2/node/abc123",
      "HasChildren": true
    }
  ]
}
```

**Used by:** Guest Upload Manager, AI Gallery Creator, Photo Organizer

---

### `POST /api/smugmug/create-folder`
**Purpose:** Create a new folder under a parent

**Request Body:**
```json
{
  "parentFolderUri": "/api/v2/node/abc123",
  "folderName": "New Folder",
  "folderUrlName": "new-folder"
}
```

**Response:**
```json
{
  "success": true,
  "folder": {
    "Name": "New Folder",
    "Uri": "/api/v2/node/xyz789"
  },
  "existing": false
}
```

**Note:** If folder exists, returns `existing: true` with existing folder data

**Used by:** Guest Upload Manager, AI Gallery Creator

---

### `POST /api/smugmug/create-gallery`
**Purpose:** Create a new gallery (album) in a folder

**Request Body:**
```json
{
  "folderUri": "/api/v2/node/abc123",
  "galleryName": "Wedding Photos",
  "galleryUrlName": "wedding-photos"
}
```

**Response:**
```json
{
  "success": true,
  "album": {
    "AlbumKey": "xyz789",
    "Name": "Wedding Photos",
    "WebUri": "https://...",
    "UploadKey": "abc123"
  }
}
```

**Used by:** Guest Upload Manager, AI Gallery Creator

---

### `POST /api/smugmug/upload`
**Purpose:** Upload image to album with metadata

**Request:** multipart/form-data
- `file` - Image file
- `albumKey` - Target album key
- `fileName` - Optional filename
- `title` - Optional title
- `caption` - Optional caption
- `keywords` - Optional keywords

**Example:**
```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('albumKey', 'abc123');
formData.append('title', 'My Photo');

const response = await fetch('/api/smugmug/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});
```

**Response:**
```json
{
  "success": true,
  "imageKey": "img123",
  "imageUri": "/api/v2/image/img123",
  "fileName": "photo.jpg"
}
```

**Used by:** Guest Upload Manager

---

### `POST /api/smugmug/move-image`
**Purpose:** Move image from one album to another

**Request Body:**
```json
{
  "imageUri": "/api/v2/image/img123",
  "sourceAlbumKey": "album1",
  "destinationAlbumKey": "album2"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image successfully moved"
}
```

**Note:** Uses collect + delete pattern. May return partial success.

**Used by:** Photo Organizer

---

### `POST /api/smugmug/collect-image`
**Purpose:** Add existing image to album without removing from source

**Request Body:**
```json
{
  "imageUri": "/api/v2/image/img123",
  "albumKey": "album2"
}
```

**Response:**
```json
{
  "success": true,
  "albumImage": { /* album image data */ }
}
```

**Used by:** Photo Organizer

---

### `POST /api/smugmug/guest-upload-folder`
**Purpose:** Get or create "Guest Upload Projects" root folder

**Request:**
```javascript
const response = await fetch('/api/smugmug/guest-upload-folder', {
  method: 'POST',
  credentials: 'include'
});
```

**Response:**
```json
{
  "folder": {
    "Name": "Guest Upload Projects",
    "Uri": "/api/v2/node/...",
    "NodeID": "..."
  },
  "created": true
}
```

**Note:** Idempotent - returns existing folder if already created

**Used by:** Guest Upload Manager

---

### `GET /api/smugmug/folder-path/[nodeId]`
**Purpose:** Get folder hierarchy path from root to specified node

**Path Parameters:**
- `nodeId` - Node identifier

**Response:**
```json
{
  "path": [
    { "Name": "Root", "NodeID": "...", "Type": "Folder" },
    { "Name": "2024", "NodeID": "...", "Type": "Folder" },
    { "Name": "Wedding", "NodeID": "...", "Type": "Folder" }
  ]
}
```

**Used by:** AI Gallery Creator

---

### `GET /api/smugmug/album-templates`
**Purpose:** Get available album templates

**Response:**
```json
{
  "templates": [
    {
      "Uri": "/api/v2/albumtemplate/...",
      "Name": "SmugMug",
      "IsDefault": true
    }
  ]
}
```

**Used by:** AI Gallery Creator

---

### `POST /api/smugmug/create-structure`
**Purpose:** Bulk create folders and galleries from AI-generated plan

**Request Body:**
```json
{
  "plan": {
    "folders": [
      {
        "name": "Events",
        "parentFolderName": null,
        "privacy": "Unlisted"
      }
    ],
    "galleries": [
      {
        "name": "Birthday Party",
        "parentFolderName": "Events",
        "enableGuestUploads": true
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "created": {
    "folders": [/* created folders */],
    "galleries": [/* created galleries */]
  },
  "uploadUrls": [
    {
      "galleryName": "Birthday Party",
      "uploadUrl": "https://..."
    }
  ],
  "errors": []
}
```

**Used by:** AI Gallery Creator

---

## 🤖 AI Endpoints

### `POST /api/ai/generate-metadata`
**Purpose:** Generate title, caption, and keywords using Claude AI

**Request Body:**
```json
{
  "imageUrl": "https://...",
  "options": {
    "generateTitle": true,
    "generateCaption": true,
    "generateKeywords": true,
    "promptStyle": "professional"
  }
}
```

**Prompt Styles:**
- `professional` - Business/commercial style
- `creative` - Artistic and expressive
- `descriptive` - Detailed factual descriptions
- `seo` - Search-optimized keywords
- `minimal` - Brief and concise

**Response:**
```json
{
  "title": "Golden Hour Beach Sunset",
  "caption": "Waves crash against rocky shores...",
  "keywords": "sunset, beach, ocean, golden hour"
}
```

**Credits:** 1 credit per generation (100 free credits included)

**Used by:** MetaData Monster

---

### `POST /api/ai/suggest-gallery`
**Purpose:** AI suggestion for gallery organization

**Request Body:**
```json
{
  "description": "I want to organize wedding photos by event"
}
```

**Response:**
```json
{
  "suggestion": "Recommended structure...",
  "reasoning": "Based on your description..."
}
```

**Used by:** AI Gallery Creator

---

### `POST /api/ai/generate-gallery-plan`
**Purpose:** Generate structured folder/gallery creation plan

**Request Body:**
```json
{
  "userInput": "Create albums for 2024 events",
  "existingFolders": [/* existing folder structure */]
}
```

**Response:**
```json
{
  "plan": {
    "folders": [/* folders to create */],
    "galleries": [/* galleries to create */],
    "summary": "Creating structure for..."
  }
}
```

**Used by:** AI Gallery Creator

---

### `POST /api/ai/analyze-gallery`
**Purpose:** Analyze photos and suggest organization

**Request Body:**
```json
{
  "photos": [/* photo metadata */],
  "context": "Wedding event"
}
```

**Response:**
```json
{
  "analysis": "...",
  "suggestions": [/* organization suggestions */]
}
```

**Used by:** AI Gallery Creator

---

## 🔥 Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Human-readable error message",
  "debug": "Technical details (development only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing parameters)
- `401` - Not authenticated (missing/invalid tokens)
- `403` - Forbidden (insufficient SmugMug permissions)
- `404` - Resource not found
- `500` - Server error

---

## 📊 Rate Limits

- **SmugMug API:** 5,000 requests/day per API key
- **AI Generation:** Limited by credit balance (100 free credits)
- **Image Updates:** Automatic 5-15 second delays to prevent nonce collisions

---

## 🧪 Testing Endpoints

### Using curl:

```bash
# Test user endpoint (cookies must be set)
curl -b cookies.txt http://localhost:3000/api/smugmug/user

# Create folder
curl -X POST http://localhost:3000/api/smugmug/create-folder \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"parentFolderUri":"/api/v2/node/abc","folderName":"Test"}'
```

### Using Browser Console:

```javascript
// Test endpoint with automatic cookie handling
fetch('/api/smugmug/user', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);

// Create folder
fetch('/api/smugmug/create-folder', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    parentFolderUri: '/api/v2/node/abc',
    folderName: 'Test Folder'
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 🔒 Security Notes

### Recent Security Improvements:
- ✅ Tokens now stored in HTTP-only cookies (not localStorage)
- ✅ Secure flag set on cookies in production
- ✅ SameSite=lax for CSRF protection
- ✅ 30-day expiration on auth cookies
- ✅ Environment variables validated at startup

### Best Practices:
- Always use `credentials: 'include'` when calling APIs
- Never expose tokens in URLs or client-side code
- Use the `/api/auth/logout` endpoint to clear sessions
- Monitor rate limits to avoid API throttling

---

## 📚 Related Documentation

- [SmugMug API v2 Documentation](https://api.smugmug.com/api/v2/doc)
- [OAuth 1.0a Specification](https://oauth.net/core/1.0a/)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)

---

*Last Updated: 2025-10-07*
*Security Update: Migrated from localStorage to HTTP-only cookies*