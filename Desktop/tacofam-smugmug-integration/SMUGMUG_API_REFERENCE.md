# SmugMug API v2 Reference Documentation

> Comprehensive reference documentation for the SmugMug API v2, compiled from https://api.smugmug.com/api/v2/doc/

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [HTTP Methods](#http-methods)
4. [API Endpoints](#api-endpoints)
5. [Advanced Topics](#advanced-topics)
6. [Upload API](#upload-api)
7. [Best Practices](#best-practices)

---

## API Overview

### General Information
- **API Type**: REST-style API
- **Base URL**: `https://api.smugmug.com/api/v2`
- **Access**: Available to SmugMug subscribers
- **Format**: JSON responses
- **Interactive Browser**: Live API Browser available for testing

### Key Features
- Discoverable and self-documenting
- Supports filtering and expanding related data
- Rate limiting enforced
- Paging support for large result sets

---

## Authentication

### API Key

**How to Get an API Key**:
1. Log in to SmugMug
2. Fill out the API key request form
3. Receive API key and secret

**API Key Usage**:
- Required for all requests
- Add to query string: `?APIKey=your-key-here`
- Public data: API key only
- Private data: API key + OAuth

**Security**:
- **CRITICAL**: Keep your API secret confidential
- Anyone with your secret can impersonate your application
- Never commit secrets to version control

### OAuth 1.0a Authentication

**OAuth Version**:
- **Recommended**: OAuth 1.0a (NOT OAuth 1.0)
- OAuth 1.0a requires `oauth_callback` parameter
- Dynamic callbacks not allowed in OAuth 1.0

**OAuth Flow**:
1. Request token with `oauth_callback` parameter
2. Redirect user to SmugMug authorization page
3. User grants permissions
4. Exchange request token for access token
5. Use access token for authenticated requests

**Access Levels**:
- Default: Lowest access level
- Users can modify access level in Account Settings
- Permissions cannot be changed programmatically

**Signature Requirements**:
- Use HMAC-SHA1 signature method
- Percent-encode the `oauth_signature`
- Use `/` for empty path URIs
- Lowercase all hostname letters
- Use correct `Content-Type` for POST/PATCH requests

**Common OAuth Issues**:

1. **Nonce Used Error** (`oauth_problem=nonce_used`):
   - SmugMug has aggressive nonce caching
   - Some endpoints (like `/api/v2/image/{imageKey}`) are particularly sensitive
   - **Solution**: Implement request queuing with 10+ second delays between requests
   - Use fresh OAuth instances for each request
   - Use long nonces (64-96 characters recommended)

2. **Invalid Signature**:
   - Double-check signature calculation
   - Verify all parameters are included
   - Use standard OAuth library (recommended)

3. **Insufficient Permissions**:
   - Check user's access level in Account Settings
   - Default is lowest level - user must upgrade

**Best Practices**:
- Use a standard OAuth library (don't implement manually)
- Always pass `oauth_callback` in OAuth 1.0a
- Carefully follow OAuth signing algorithm
- Contact api@smugmug.com for persistent issues

---

## HTTP Methods

### GET - Retrieve Data
**Purpose**: Fetch information from the API
- No request body required
- Used for reading/querying data
- Safe and idempotent

**Example**:
```http
GET /api/v2/user/username HTTP/1.1
Accept: application/json
```

### POST - Create Objects
**Purpose**: Create new resources or perform complex operations
- Requires request body
- Used for:
  - Creating albums, folders, galleries
  - Image rotation
  - Moving images between galleries
  - Complex operations beyond simple field edits

**Example**:
```http
POST /api/v2/folder/user/example/Cats!albums HTTP/1.1
Content-Type: application/json

{
  "NiceName": "Big-Cats",
  "Title": "Big Cats",
  "Privacy": "Public"
}
```

### PATCH - Update Existing Fields
**Purpose**: Edit data fields of existing objects
- Requires request body with fields to update
- Used for:
  - Changing privacy settings
  - Updating image metadata (Title, Caption, Keywords)
  - Modifying album/folder properties

**Example**:
```http
PATCH /api/v2/image/{imageKey} HTTP/1.1
Content-Type: application/json

{
  "Title": "Sunset at Beach",
  "Caption": "Beautiful sunset photograph",
  "Keywords": "sunset, beach, nature"
}
```

**⚠️ Important**: Some SmugMug endpoints do NOT support PUT method - always use PATCH for updates.

### DELETE - Remove Objects
**Purpose**: Delete resources
- Typically no request body required
- Permanent operation - use with caution

**Example**:
```http
DELETE /api/v2/album/{albumId} HTTP/1.1
```

### Supported Content Types
- `application/json` (recommended)
- `application/x-www-form-urlencoded`
- `multipart/form-data`

---

## API Endpoints

### User Endpoints

#### Get Authenticated User
```
GET /api/v2!authuser
```
**Description**: Returns the currently authenticated user

**Response**:
- User details
- Links to related resources (Node, UserProfile, Features)
- Cart information

#### Get Specific User
```
GET /api/v2/user/{username}
```
**Description**: Returns information about a specific user

**Parameters**:
- `{username}`: SmugMug username

**Key Fields**:
- `Name`: User's display name
- `ViewPassHint`: Site password hint

**Important Links**:
- `Features`: User's available features
- `Node`: User's root node
- `UserProfile`: Public profile
- `UnlockUser`: Site unlock (if locked)

#### Get Site User
```
GET /api/v2!siteuser
```
**Description**: Returns user of the current domain

---

### Album Endpoints

#### Get Album
```
GET /api/v2/album/{albumId}
```
**Description**: Retrieve album details

**Key Fields**:
- `Name`: Album name
- `Description`: Album description
- `Privacy`: Public/Private/Unlisted
- `UrlName`: URL-friendly name
- `WebUri`: Album web page URL
- `ImagesLastUpdated`: Timestamp of last image update
- `SmugSearchable`: Searchable on SmugMug
- `WorldSearchable`: Searchable via search engines

#### Create Album
```
POST /api/v2/folder/user/{username}/{folderPath}!albums
```
**Description**: Create a new album

**Required Parameters**:
- `NiceName`: URL-friendly name
- `Title`: Human-readable title
- `Privacy`: Public/Private/Unlisted

**Example Request**:
```json
{
  "NiceName": "Big-Cats",
  "Title": "Big Cats",
  "Privacy": "Public"
}
```

**Response**:
- Created Album object with unique identifier

#### Get Album Images
```
GET /api/v2/album/{albumKey}!images
```
**Description**: Retrieve all images in an album

**Response**:
- Array of Image objects
- Includes all metadata (Title, Caption, Keywords, URLs, etc.)

**💡 Tip**: This endpoint returns ALL photo data - use sessionStorage to cache results and avoid individual image API calls.

---

### Image Endpoints

#### Get Image
```
GET /api/v2/image/{imageId}
```
**Description**: Retrieve image details (photos or videos)

**⚠️ Known Issue**: This endpoint has persistent OAuth nonce collision problems. **Use the Album Images endpoint instead** (`/api/v2/album/{albumKey}!images`) and cache results in sessionStorage.

**Optional Parameters**:
- `id`: Feature flag fallback
- `prefix`: Key filter

**Owner-Writable Fields**:
- `Altitude`
- `Caption`
- `Hidden`
- `Keywords`
- `Latitude`
- `Longitude`
- `Title`
- `Watermark`

**Important Links**:
- `ImageAlbum`: Album containing the image
- `ImageMetadata`: Additional file metadata
- `ImageSizeDetails`: Media URLs and dimensions

#### Update Image Metadata (via AlbumImage) ⭐ RECOMMENDED
```
PATCH /api/v2/album/{albumKey}/image/{imageKey}
```
**Description**: Update image metadata in the context of a specific album

**✅ Advantages**:
- More reliable than the Image endpoint
- Fewer nonce collision issues
- Works when you have both AlbumKey and ImageKey

**⚠️ Critical Notes**:
- Use PATCH method (NOT PUT - returns 405 Method Not Allowed)
- Still subject to nonce caching - implement 10+ second delays between requests
- Requires both AlbumKey and ImageKey (available when fetching from album)
- Implement retry logic with exponential backoff

#### Update Image Metadata (via Image) ⚠️ NOT RECOMMENDED
```
PATCH /api/v2/image/{imageId}
```
**Description**: Update image fields (Title, Caption, Keywords, etc.) directly

**❌ Known Issues**:
- Persistent OAuth nonce collision problems
- High failure rate even with delays
- Use AlbumImage endpoint instead when possible

**⚠️ Critical Notes**:
- Use PATCH method (NOT PUT - returns 405 Method Not Allowed)
- Subject to aggressive nonce caching - implement 10+ second delays between requests
- Implement retry logic with exponential backoff
- **Prefer AlbumImage endpoint whenever you have an AlbumKey**

**Example Request**:
```json
{
  "Title": "Mountain Sunrise",
  "Caption": "Early morning in the Rockies",
  "Keywords": "mountain, sunrise, nature, landscape"
}
```

**Response**:
- Updated Image object

**Best Practices**:
- Use global request queue to prevent concurrent requests
- Wait minimum 10 seconds between PATCH requests
- Implement retry logic (3 attempts recommended)
- Check for `nonce_used` errors and retry

---

### Folder Endpoints

#### Get Folder
```
GET /api/v2/folder/user/{username}/{folder-path}
```
**Description**: Retrieve folder details

**Response Includes**:
- Owner details
- Folder metadata (DateAdded, DateModified)
- Privacy settings
- Links to albums and child folders

#### Create Folder
```
POST /api/v2/folder/user/{username}/{parent-folder-path}!folders
```
**Description**: Create a new folder

**Required Parameters**:
- `UrlName`: User-configurable part of WebUri
- `Name`: Human-readable title
- `Privacy`: Public/Unlisted/Private

**Important Notes**:
- Use Node endpoint for New SmugMug support
- Folder hierarchy limited to **5 levels deep**
- Albums do not count toward depth limit
- Legacy accounts have different structure (Categories/Subcategories)

---

### Node Endpoints

#### Get Node
```
GET /api/v2/node/{nodeId}
```
**Description**: Retrieve node details (folders, albums, or pages)

**Key Fields**:
- `Name`: Human-readable title
- `Description`: Node description
- `Privacy`: Public/Unlisted/Private
- `DateAdded`: Creation timestamp
- `DateModified`: Last modification time
- `WebUri`: Node's webpage URL

**Important Links**:
- `ChildNodes`: Immediate child nodes
- `ParentNode`: Parent node
- `HighlightImage`: Representative image
- `User`: Node owner

#### Create Node
```
POST /api/v2/node/{parentNodeId}!children
```
**Description**: Create a new node (album, folder, or page)

**Example Request**:
```json
{
  "Type": "Album",
  "Name": "My Smug Album",
  "UrlName": "My-Smug-Album",
  "Privacy": "Public"
}
```

**Hierarchy Limitations**:
- Root folder can have folder trees up to **5 levels deep**
- Albums do not count toward depth limit

---

### Image Size Parameters

SmugMug provides 13 different image size variations:

| Size Code | Description | Typical Use |
|-----------|-------------|-------------|
| `Ti` | Tiny | Thumbnails |
| `Th` | Thumb | Small thumbnails |
| `S` | Small | Mobile previews |
| `M` | Medium | Web display |
| `L` | Large | Full screen |
| `XL` | X-Large | High-res display |
| `X2` | X2-Large | Retina display |
| `X3` | X3-Large | High-DPI |
| `X4` | X4-Large | Ultra high-res |
| `X5` | X5-Large | Maximum quality |
| `4k` | 4K | 4K displays |
| `5k` | 5K | 5K displays |
| `O` | Original | Original upload |

**Size Conversion**:
Image URLs contain size codes in both path and filename:
```
https://photos.smugmug.com/.../M/image-M.jpg
                              ^       ^
                           Path    Filename
```

To convert sizes, replace both occurrences:
```typescript
const convertImageSize = (url: string, targetSize: string): string => {
  return url
    .replace(/\/(Ti|Th|S|M|L|XL|X2|X3|X4|X5|4k|5k|O)\//, `/${targetSize}/`)
    .replace(/-(Ti|Th|S|M|L|XL|X2|X3|X4|X5|4k|5k|O)\./, `-${targetSize}.`);
};
```

---

## Upload API

### Upload Endpoint
```
POST https://upload.smugmug.com/
```
**Description**: Upload photos, videos, or archives to SmugMug

**⚠️ Note**: Upload API is **separate** from main SmugMug API

### Required Headers
- `Content-Length`: Media size in bytes
- `Content-MD5`: Base64-encoded MD5 digest
- `Content-Type`: Media MIME type (e.g., `image/jpeg`)
- `X-Smug-AlbumUri`: Target album API URI
- `X-Smug-Version`: `v2`
- `X-Smug-ResponseType`: `JSON` (recommended)
- `Authorization`: OAuth parameters (in header only)

### Optional Headers
- `X-Smug-Caption`: Image caption
- `X-Smug-Keywords`: Comma-separated keywords
- `X-Smug-Latitude`: GPS latitude
- `X-Smug-Longitude`: GPS longitude
- `X-Smug-Altitude`: GPS altitude
- `X-Smug-Hidden`: Hide image (true/false)
- `X-Smug-Title`: Image title

### File Size Limits
- **Photos**: 524,288,000 bytes (~500 MB)
- **Videos**: 3,221,225,472 bytes (~3 GB)
- **Archives**: 3,221,225,472 bytes (~3 GB)

### Supported Formats
- **Images**: jpg, jpeg, heic
- **Videos**: (formats not explicitly listed)

### Authorization
- **OAuth Required**: Upload only supports OAuth in Authorization header
- Cannot use query string parameters for OAuth on upload endpoint

### Response
```json
{
  "Image": {
    "Uri": "/api/v2/image/{imageId}",
    "ImageKey": "ABC123",
    "URL": "https://..."
  }
}
```

---

## Advanced Topics

### 1. Optimizing Response Sizes
**Use Filters**: Customize response content
```
GET /api/v2/album/{albumId}?_filter=Name,Privacy,ImageCount
```
- Reduces payload size
- Faster response times
- Lower bandwidth usage

### 2. Expanding Related Data
**Combine Multiple Requests**: Use `_expand` parameter
```
GET /api/v2/album/{albumId}?_expand=HighlightImage
```
- Reduces number of API calls
- More efficient data retrieval
- Single response with related data

### 3. Rate Limits
**Detection**: Watch for rate limit headers
- API enforces rate limiting
- Monitor response headers for rate limit status
- Implement backoff strategies

**Best Practices**:
- Cache responses when possible
- Use `_filter` to reduce payload
- Implement exponential backoff
- Monitor API usage

### 4. Performance Metrics
- Server-side performance metrics available
- Monitor request timing
- Optimize slow endpoints

### 5. Multi-get Requests
**Purpose**: Retrieve multiple objects in parallel
- Same object type only
- More efficient than sequential requests
- Reduces total request time

### 6. Method and Content Overrides
**Purpose**: Work around HTTP proxy limitations
- Override HTTP method
- Modify request/response handling
- Handle restrictive network environments

### 7. OPTIONS Requests
**Purpose**: Discover available methods
```
OPTIONS /api/v2/album/{albumId}
```
**Response**: Available HTTP methods for the endpoint

---

## Best Practices

### 1. Authentication
✅ **DO**:
- Use OAuth 1.0a (not 1.0)
- Use standard OAuth libraries
- Keep API secrets secure
- Store tokens in secure HTTP-only cookies

❌ **DON'T**:
- Implement OAuth manually
- Store secrets in client-side code
- Commit secrets to version control
- Use OAuth 1.0 (use 1.0a instead)

### 2. API Requests
✅ **DO**:
- Use appropriate HTTP methods (GET, POST, PATCH, DELETE)
- Include proper Content-Type headers
- Implement retry logic with exponential backoff
- Cache responses when possible
- Use `_filter` to reduce payload size

❌ **DON'T**:
- Use PUT method (use PATCH for updates)
- Make concurrent requests to same endpoint
- Ignore rate limits
- Request unnecessary data

### 3. Image Metadata Updates
✅ **DO**:
- Use PATCH method (not PUT)
- Implement global request queue
- Wait minimum 10 seconds between requests
- Use fresh OAuth instances per request
- Implement retry logic (3 attempts)
- Handle `nonce_used` errors gracefully

❌ **DON'T**:
- Use PUT method (returns 405)
- Make concurrent PATCH requests
- Retry immediately after nonce errors
- Use short nonces (<64 characters)

### 4. Data Retrieval
✅ **DO**:
- Use `/api/v2/album/{albumKey}!images` for batch image data
- Cache results in sessionStorage/localStorage
- Use image size parameters appropriately
- Implement pagination for large datasets

❌ **DON'T**:
- Use `/api/v2/image/{imageKey}` GET endpoint (nonce issues)
- Make individual API calls for each image
- Request original size when thumbnails suffice
- Load all data at once without pagination

### 5. Error Handling
✅ **DO**:
- Check HTTP status codes
- Parse error messages
- Implement retry logic
- Log errors for debugging
- Provide user-friendly error messages

❌ **DON'T**:
- Ignore error responses
- Retry indefinitely
- Expose API errors to users
- Assume requests always succeed

### 6. Performance
✅ **DO**:
- Use `_expand` for related data
- Use `_filter` to reduce payload
- Implement caching strategies
- Use appropriate image sizes
- Monitor API usage

❌ **DON'T**:
- Make unnecessary API calls
- Request full data when filtered would suffice
- Ignore performance metrics
- Load original images for thumbnails

---

## Known Issues and Workarounds

### Issue: OAuth Nonce Collision on `/api/v2/image/{imageKey}` GET
**Problem**: Persistent `oauth_problem=nonce_used` errors

**Affected Endpoints**:
- `GET /api/v2/image/{imageKey}` (most affected)

**Workaround**:
1. Use `/api/v2/album/{albumKey}!images` instead
2. Cache results in sessionStorage
3. Read from cache instead of making individual image calls

**Example Implementation**:
```typescript
// In album page - cache photo data when clicked
sessionStorage.setItem('currentPhoto', JSON.stringify(photo));

// In photo detail page - read from cache
const cachedPhoto = sessionStorage.getItem('currentPhoto');
if (cachedPhoto) {
  const photo = JSON.parse(cachedPhoto);
  // Use photo data without API call
}
```

### Issue: OAuth Nonce Collision on `/api/v2/image/{imageKey}` PATCH
**Problem**: Frequent `oauth_problem=nonce_used` errors when updating metadata

**Workaround**:
1. Implement global request queue
2. Enforce 10+ second minimum gap between requests
3. Use fresh OAuth instance per request
4. Use long nonces (64-96 characters)
5. Implement retry logic with exponential backoff

**Example Implementation**:
```typescript
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 10000; // 10 seconds

async function waitForRequestSlot() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_GAP) {
    const waitTime = MIN_REQUEST_GAP - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

// Before making PATCH request
await waitForRequestSlot();
// ... make request
```

### Issue: PUT Method Not Supported
**Problem**: `405 Method Not Allowed` when using PUT

**Solution**: Use PATCH method for all updates
```typescript
// ❌ Wrong
fetch(url, { method: 'PUT', ... })

// ✅ Correct
fetch(url, { method: 'PATCH', ... })
```

---

## Additional Resources

- **Live API Browser**: https://api.smugmug.com/api/v2/doc
- **Support Email**: api@smugmug.com
- **OAuth 1.0a Spec**: https://oauth.net/core/1.0a/
- **Developer Portal**: https://api.smugmug.com

---

## Document Version
- **Last Updated**: 2025-10-05
- **API Version**: v2
- **Source**: https://api.smugmug.com/api/v2/doc/

---

**Note**: This reference document is compiled from SmugMug's official API documentation. For the most up-to-date information, always refer to the official documentation at https://api.smugmug.com/api/v2/doc/
