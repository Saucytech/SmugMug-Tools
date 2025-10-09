# Smugtools API Reference

Complete reference for all API endpoints in the Smugtools platform.

## Authentication

All API routes (except public ones) require authentication via NextAuth.js sessions.

### Session Management

**NextAuth Endpoints**:
- `POST /api/auth/[...nextauth]` - NextAuth handlers (signin, signout, session, providers)
- `POST /api/auth/signup` - User registration
- `GET /api/auth/logout` - User logout

**Headers Required** (for authenticated requests):
```
Cookie: next-auth.session-token=xxx
```

---

## SmugMug API Routes

### User Information

#### Get Authenticated User
```
GET /api/smugmug/user
```
Returns current user's SmugMug account information.

**Response**:
```json
{
  "Response": {
    "User": {
      "NickName": "username",
      "Name": "Full Name",
      "Uri": "/api/v2/user/username"
    }
  }
}
```

---

### Albums

#### List User Albums
```
GET /api/smugmug/albums
```
Fetches all albums for authenticated user.

**Response**:
```json
{
  "Response": {
    "Album": [
      {
        "AlbumKey": "ABC123",
        "Name": "Album Name",
        "UrlName": "album-name",
        "Uri": "/api/v2/album/ABC123",
        "ImageCount": 42
      }
    ]
  }
}
```

#### Get Album Images
```
GET /api/smugmug/albums/[albumKey]/images
```
Fetches all images in an album.

**Parameters**:
- `albumKey` (string) - Album identifier (e.g., "G644RP")

**Response**:
```json
{
  "Response": {
    "AlbumImage": [
      {
        "ImageKey": "MLB2MBL",
        "Title": "Photo Title",
        "Caption": "Photo caption",
        "Keywords": "keyword1,keyword2",
        "Uri": "/api/v2/album/G644RP/image/MLB2MBL-0",
        "ArchivedUri": "https://photos.smugmug.com/...",
        "ThumbnailUrl": "https://..."
      }
    ]
  }
}
```

#### Delete Albums
```
DELETE /api/smugmug/albums/delete
```
Deletes one or more albums.

**Request Body**:
```json
{
  "albumKeys": ["ABC123", "DEF456"]
}
```

---

### Folders

#### List Folders
```
GET /api/smugmug/folders
```
Fetches user's folder list.

#### Get Folder Tree
```
GET /api/smugmug/folder-tree
```
Returns complete folder hierarchy with nested structure.

**Response**:
```json
{
  "Response": {
    "Node": {
      "NodeID": "abc123",
      "Name": "Root",
      "Type": "Folder",
      "ChildNodes": [...]
    }
  }
}
```

---

### Images

#### Update Image Metadata
```
PATCH /api/smugmug/image/[imageKey]
```
Updates image title, caption, keywords.

**IMPORTANT**: Always use versioned image URI with `-0` suffix (e.g., `MLB2MBL-0`).

**Request Body**:
```json
{
  "Title": "New Title",
  "Caption": "New Caption",
  "Keywords": "keyword1,keyword2,keyword3"
}
```

**Response**:
```json
{
  "Response": {
    "Image": {
      "Title": "New Title",
      "Caption": "New Caption",
      "Keywords": "keyword1,keyword2,keyword3"
    }
  }
}
```

#### Move Image Between Albums
```
POST /api/smugmug/move-image
```
Moves image from one album to another.

**Request Body**:
```json
{
  "imageUri": "/api/v2/album/ABC/image/XYZ-0",
  "targetAlbumUri": "/api/v2/album/DEF"
}
```

#### Collect Image to Album
```
POST /api/smugmug/collect-image
```
Adds existing image to another album (creates reference).

**Request Body**:
```json
{
  "imageUri": "/api/v2/album/ABC/image/XYZ-0",
  "targetAlbumUri": "/api/v2/album/DEF"
}
```

---

### Gallery/Album Management

#### Create Gallery (Album)
```
POST /api/smugmug/create-gallery
```
Creates new gallery/album.

**Request Body**:
```json
{
  "name": "Gallery Name",
  "urlName": "gallery-name",
  "privacy": "Public",
  "parentNodeUri": "/api/v2/node/abc123"
}
```

#### Create Folder
```
POST /api/smugmug/create-folder
```
Creates new folder node.

**Request Body**:
```json
{
  "name": "Folder Name",
  "urlName": "folder-name",
  "privacy": "Public",
  "parentNodeUri": "/api/v2/node/parent123"
}
```

#### Create Structure (Bulk)
```
POST /api/smugmug/create-structure
```
Creates multiple folders and galleries in one operation.

**Request Body**:
```json
{
  "structure": {
    "name": "Event 2024",
    "type": "folder",
    "children": [
      {
        "name": "Ceremony",
        "type": "gallery"
      },
      {
        "name": "Reception",
        "type": "gallery"
      }
    ]
  },
  "parentNodeUri": "/api/v2/node/root"
}
```

#### Delete Node
```
DELETE /api/smugmug/delete-node
```
Deletes folder or gallery node.

**Request Body**:
```json
{
  "nodeUri": "/api/v2/node/abc123"
}
```

---

### Upload

#### Create Guest Upload Folder
```
POST /api/smugmug/guest-upload-folder
```
Creates folder configured for guest uploads.

**Request Body**:
```json
{
  "name": "Guest Uploads",
  "parentNodeUri": "/api/v2/node/parent123"
}
```

#### Upload Photo
```
POST /api/smugmug/upload
```
Uploads photo to album.

**Request Body**: multipart/form-data with image file

**Headers**:
```
Content-Type: multipart/form-data
X-Smug-AlbumUri: /api/v2/album/ABC123
X-Smug-FileName: photo.jpg
X-Smug-ResponseType: JSON
```

---

### Templates

#### Get Album Templates
```
GET /api/smugmug/album-templates
```
Returns available gallery templates (Wedding, Sports, etc.).

**Response**:
```json
{
  "templates": [
    {
      "id": "wedding-2024",
      "name": "Wedding Photography 2024",
      "structure": { ... }
    }
  ]
}
```

---

## AI Routes

### Metadata Generation

#### Generate Image Metadata
```
POST /api/ai/generate-metadata
```
Generates AI-powered title, caption, and keywords for images.

**Request Body**:
```json
{
  "images": [
    {
      "imageKey": "MLB2MBL-0",
      "imageUrl": "https://photos.smugmug.com/...",
      "albumKey": "G644RP"
    }
  ],
  "promptStyle": "professional",
  "includeTitle": true,
  "includeCaption": true,
  "includeKeywords": true
}
```

**Response**:
```json
{
  "results": [
    {
      "imageKey": "MLB2MBL-0",
      "title": "Traditional Mexican Cook Flipping Handmade Tortillas",
      "caption": "Expert hands crafting authentic cuisine...",
      "keywords": ["cooking", "mexican", "tortillas", "traditional", "culinary"],
      "tokensUsed": 245,
      "coinCost": 1
    }
  ],
  "totalCoins": 5
}
```

**Prompt Styles**:
- `professional` - Business-appropriate descriptions
- `creative` - Artistic and expressive language
- `descriptive` - Detailed factual descriptions
- `seo` - SEO-optimized with keyword focus
- `minimal` - Concise, minimal text

---

## Admin Routes

### Tool Management

#### Get Tool States
```
GET /api/tools/states
```
Public endpoint - returns current state of all tools.

**Response**:
```json
{
  "tools": [
    {
      "tool_id": "metadata-monster",
      "tool_name": "MetaData Monster",
      "status": "on",
      "disabled_message": null
    },
    {
      "tool_id": "photo-organizer",
      "tool_name": "Photo Organizer",
      "status": "disabled",
      "disabled_message": "Maintenance in progress - back soon!"
    }
  ]
}
```

**Statuses**:
- `on` - Tool fully functional and visible
- `disabled` - Tool visible but not accessible (shows message)
- `off` - Tool hidden from users

#### Update Tool State (Admin Only)
```
PUT /api/admin/tools
```
Updates tool availability state.

**Request Body**:
```json
{
  "toolId": "metadata-monster",
  "status": "disabled",
  "disabledMessage": "Upgrading AI model - back in 1 hour"
}
```

**Authorization**: Requires `role = 'admin'` in session.

---

## Download Route

#### Initiate Bulk Download
```
POST /api/download
```
Generates ZIP file of selected photos.

**Request Body**:
```json
{
  "images": [
    {
      "url": "https://photos.smugmug.com/...",
      "filename": "photo1.jpg"
    }
  ],
  "strategy": "single",
  "size": "Original"
}
```

**Strategies**:
- `single` - One ZIP with all photos
- `album` - One ZIP per album
- `auto` - Auto-split (max 150 per ZIP)

**Sizes**:
- `Original` - Full resolution
- `X3Large` - 3000px
- `X2Large` - 1600px
- `XLarge` - 1024px
- `Large` - 800px

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**Common Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## Rate Limits

- **SmugMug API**: 5,000 requests/day per API key
- **AI Operations**: Based on user coin balance
- **Upload**: 100 photos per batch

---

## Best Practices

### 1. Always Use Versioned Image URIs

```typescript
// ❌ Wrong
const uri = `/api/v2/image/${imageKey}`;

// ✅ Correct
const uri = image.Uri; // e.g., "/api/v2/album/ABC/image/XYZ-0"
```

### 2. Cache Album Data

Use the global albums store to avoid duplicate API calls:

```typescript
import { useAlbumsStore } from '@/stores/albumsStore';

const { albums, isLoading, fetchAlbums } = useAlbumsStore();
```

### 3. Handle Coin Balance

Check user's coin balance before AI operations:

```typescript
const session = await getServerSession(authOptions);
const result = await db.query(
  'SELECT coin_balance FROM users WHERE id = $1',
  [session.user.id]
);

if (result.rows[0].coin_balance < requiredCoins) {
  return NextResponse.json(
    { error: 'Insufficient coins' },
    { status: 402 }
  );
}
```

### 4. Encrypt SmugMug Tokens

Always decrypt tokens from database before use:

```typescript
import { decrypt } from '@/lib/encryption';

const accessToken = decrypt(encryptedToken);
const tokenSecret = decrypt(encryptedSecret);
```

---

## Testing Endpoints

### Using curl

```bash
# Login first to get session cookie
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  -c cookies.txt

# Use session for authenticated requests
curl http://localhost:3000/api/smugmug/albums \
  -b cookies.txt
```

### Using Postman

1. Import Smugtools collection (if available)
2. Set up environment variables
3. Use cookie authentication
4. Test endpoints sequentially

---

## Documentation Links

- **SmugMug API v2**: https://api.smugmug.com/api/v2/doc
- **NextAuth.js**: https://next-auth.js.org/
- **Anthropic Claude API**: https://docs.anthropic.com/

---

**Last Updated**: 2025-10-08
