# Email to SmugMug API Support

**To:** api@smugmug.com
**Subject:** Persistent oauth_problem=nonce_used Errors on Image Metadata PATCH Requests

---

## Email Content

Dear SmugMug API Support Team,

I am writing to report a persistent issue with the SmugMug API v2 that is preventing reliable updates to image metadata via PATCH requests. Despite implementing extensive workarounds and following OAuth 1.0a best practices, I continue to encounter `oauth_problem=nonce_used` errors.

### Issue Summary

**Problem:** Both `/api/v2/image/{imageKey}` and `/api/v2/album/{albumKey}/image/{imageKey}` endpoints consistently return `oauth_problem=nonce_used` errors when attempting to update image metadata (Title, Caption, Keywords) via PATCH requests.

**Impact:** Unable to programmatically update image metadata in bulk, which is a critical feature for professional photography workflow automation.

---

### Technical Details

**Affected Endpoints:**
1. `PATCH /api/v2/image/{imageKey}`
2. `PATCH /api/v2/album/{albumKey}/image/{imageKey}`

**Error Response:**
```json
{
  "Code": 401,
  "Message": "oauth_problem=nonce_used"
}
```

**OAuth Implementation:**
- OAuth Version: 1.0a (as recommended)
- Signature Method: HMAC-SHA1
- Nonce Length: 96 characters (cryptographically unique)
- Nonce Generation: Fresh OAuth instance created for each request
- Programming Language: Node.js / TypeScript
- OAuth Library: oauth-1.0a (npm package)

---

### Attempted Solutions

I have implemented the following measures to prevent nonce collisions, all without success:

1. **Global Request Queue:**
   - Enforced 10-second minimum gap between ALL requests
   - Single-threaded request processing (no concurrent requests)
   - Verified via logging that delays are being applied

2. **Fresh OAuth Instances:**
   - Creating new OAuth instance for each request
   - Each instance generates unique nonces using crypto.randomBytes
   - No instance reuse between requests

3. **Extended Nonces:**
   - Increased nonce length from default 32 to 96 characters
   - Using cryptographically secure random generation
   - Verified uniqueness via logging

4. **Retry Logic:**
   - Implemented 3-attempt retry with exponential backoff
   - Progressive delays: 10s → 20s → 30s total wait time
   - All retries fail with same nonce_used error

5. **Endpoint Alternatives:**
   - Tested both Image and AlbumImage endpoints
   - Both fail with identical nonce_used errors
   - Confirmed PATCH method (not PUT, which returns 405)

---

### Reproduction Details

**Test Case:**
```javascript
// Request 1: Successfully fetches album images
GET /api/v2/album/G644RP!images → 200 OK

// Request 2: Wait 10 seconds, then attempt metadata update
PATCH /api/v2/album/G644RP/image/MLB2MBL
Body: {"Title": "New Title"}
Headers: {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Authorization": "OAuth oauth_consumer_key=..., oauth_nonce=... [96 chars], ..."
}
→ 401 Unauthorized: oauth_problem=nonce_used

// Request 3: Wait another 10 seconds, retry with NEW nonce
→ 401 Unauthorized: oauth_problem=nonce_used (different nonce)

// Request 4: Wait another 10 seconds, retry with NEW nonce
→ 401 Unauthorized: oauth_problem=nonce_used (different nonce)
```

**Actual Logs:**
```
📝 Updating AlbumImage metadata (attempt 1/3): {
  albumKey: 'G644RP',
  imageKey: 'MLB2MBL',
  fields: [ 'Title' ]
}
⏳ Waiting 9608ms for request slot...

📝 Updating AlbumImage metadata (attempt 2/3): {
  albumKey: 'G644RP',
  imageKey: 'MLB2MBL',
  fields: [ 'Title' ]
}
⏳ Waiting 9659ms for request slot...

📝 Updating AlbumImage metadata (attempt 3/3): {
  albumKey: 'G644RP',
  imageKey: 'MLB2MBL',
  fields: [ 'Title' ]
}

⚠️ Nonce collision on attempt 1, retrying...
⚠️ Nonce collision on attempt 2, retrying...

==================== SMUGMUG ALBUMIMAGE PATCH ERROR ====================
Status: 401
Status Text: Unauthorized
URL: https://api.smugmug.com/api/v2/album/G644RP/image/MLB2MBL
Album Key: G644RP
Image Key: MLB2MBL
Attempt: 3/3
Request Body: {"Title":"Traditional Mexican Cook Flipping Handmade Tortillas"}
Response Body: {"Code":401,"Message":"oauth_problem=nonce_used"}
=========================================================================

Total Duration: 20.8 seconds
```

---

### Observations

1. **GET Requests Work Fine:**
   - No nonce issues when fetching data (GET /api/v2/album/{albumKey}!images)
   - Problem is specific to PATCH requests on image metadata

2. **Other PATCH Endpoints:**
   - Have not tested other PATCH endpoints extensively
   - Can provide additional testing if helpful

3. **Timing Evidence:**
   - 10 seconds between attempts should be sufficient for nonce expiration
   - Total 20+ seconds across 3 attempts still fails
   - Suggests server-side nonce cache may not be expiring properly

4. **Nonce Uniqueness Verified:**
   - Logged nonces are confirmed unique (96 random characters)
   - No client-side nonce reuse occurring
   - Issue appears to be server-side validation logic

---

### Environment Information

**API Key:** 2D4ZRJvnzMjsc7DxB9R7VjSTMksfqkX8
**Application:** SmugMug Toolbox (Next.js 14 application)
**Use Case:** Professional photographer workflow automation
**Request Volume:** Batch metadata updates (10-50 images per session)
**Testing Period:** October 2025
**Region:** United States

---

### Questions for Support

1. **Is this a known issue** with the PATCH endpoints for image metadata?

2. **Are there recommended delays** between PATCH requests beyond the 10 seconds we've implemented?

3. **Is there an alternative method** for bulk updating image metadata that would be more reliable?

4. **Is the nonce cache duration configurable**, or can it be increased to prevent these collisions?

5. **Are there rate limits** on PATCH requests that might be causing this behavior?

6. **Is there a batch update endpoint** we should be using instead of individual PATCH requests?

7. **Can you reproduce this issue** with the test case provided above?

---

### Requested Support

We would greatly appreciate:

1. **Confirmation** that this is a known API limitation or bug
2. **Guidance** on recommended workarounds or alternative approaches
3. **Timeline** for a potential fix if this is acknowledged as a bug
4. **API documentation updates** if there are undocumented requirements we're missing

This issue is blocking a critical feature for professional photographers who need to batch-update metadata for hundreds of images. Any assistance would be greatly appreciated.

---

### Additional Information Available

I can provide:
- Complete OAuth signature calculation logs
- Full HTTP request/response dumps
- Video demonstration of the issue
- Access to test application (if needed)
- Additional endpoint testing results

Thank you for your time and assistance. I look forward to your response.

Best regards,

[Your Name]
[Your Email]
[Your SmugMug Account Username]

---

## Supporting Documentation

**GitHub Repository (if applicable):** [Your repo URL]
**API Documentation Referenced:** https://api.smugmug.com/api/v2/doc
**OAuth 1.0a Specification:** https://oauth.net/core/1.0a/

---

## Follow-up Actions

After sending this email:

1. ✅ Document the issue in CLAUDE.md as a known limitation
2. ✅ Add user-facing warning in MetaData Monster UI
3. ✅ Monitor api@smugmug.com for response
4. ⏳ Wait for SmugMug support response (typically 1-3 business days)
5. 📝 Update implementation based on their recommendations

---

**Email sent:** [Date]
**Response received:** [Date]
**Resolution status:** Pending
