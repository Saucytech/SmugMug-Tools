# TacoFam SmugMug Integration - Setup Guide

## 🎯 Overview

This application allows you to authenticate with SmugMug via OAuth, browse your photo albums, and select photos to use in your TacoFam articles. Selected photos can be exported as JSON with all necessary metadata and URLs.

## 📋 Prerequisites

- **Node.js 18+** installed
- **SmugMug account** with photos/albums
- **SmugMug API Key** (we'll get this in Step 1)

## 🚀 Quick Start

### Step 1: Get SmugMug API Credentials

1. **Visit SmugMug Developer Portal**
   - Go to: https://api.smugmug.com/api/developer/apply
   - Log in with your SmugMug account

2. **Apply for an API Key**
   - Click "Apply for an API Key"
   - Fill out the form:
     ```
     Application Name: TacoFam Photo Integration
     Description: Browse and select SmugMug photos for TacoFam articles
     Application URL: http://localhost:3000
     Callback URL: http://localhost:3000/api/auth/smugmug/callback
     ```
   - Accept terms and submit

3. **Save Your Credentials**
   - After approval, you'll see:
     - **API Key** (looks like: abc123def456...)
     - **API Secret** (looks like: xyz789uvw012...)
   - Keep these safe - you'll need them next!

### Step 2: Install the Application

```bash
# Navigate to the project folder
cd ~/Desktop/tacofam-smugmug-integration

# Install dependencies
npm install
```

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env.local

# Open .env.local in your editor
nano .env.local
# or
code .env.local
```

Add your credentials:

```env
SMUGMUG_API_KEY=your_api_key_from_step1
SMUGMUG_API_SECRET=your_api_secret_from_step1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Save and close the file!**

### Step 4: Run the Application

```bash
npm run dev
```

Open your browser to: **http://localhost:3000**

## 🎨 How to Use

### 1. Connect to SmugMug

- Click **"Connect SmugMug Account"**
- You'll be redirected to SmugMug
- Click **"Authorize"** to grant access
- You'll be redirected back to the app

### 2. Browse Your Albums

- Click **"Load Albums"**
- All your SmugMug albums will appear
- Click any album to view its photos

### 3. Select Photos

- Click on photos to select them
- Selected photos get a **blue ring**
- Click again to deselect

### 4. Export Photos

Two options:

**A) Copy to Clipboard**
- Click **"Copy X to Clipboard"**
- Photo data is copied as JSON
- Paste into any editor

**B) Download JSON File**
- Click **"Download JSON"**
- Saves as `tacofam-photos-[timestamp].json`
- Perfect for batch processing

## 📦 Exported Data Format

```json
[
  {
    "ImageKey": "abc123",
    "FileName": "birria-tacos-closeup.jpg",
    "Title": "Birria Tacos Closeup",
    "Caption": "Jalisco-style birria with consomé",
    "ThumbnailUrl": "https://photos.smugmug.com/.../thumb.jpg",
    "ArchivedUri": "https://photos.smugmug.com/.../original.jpg",
    "Uris": {
      "LargeImageUrl": "https://photos.smugmug.com/.../large.jpg"
    }
  }
]
```

## 🔗 Using Photos in TacoFam

### In Markdown Articles

```markdown
---
title: Tacos de Birria Recipe
featured_image: https://photos.smugmug.com/.../birria-tacos.jpg
---

![Birria Tacos](https://photos.smugmug.com/.../birria-tacos.jpg)
*Authentic Jalisco-style birria tacos with consomé*
```

### In Database

If importing to your TacoFam database:

```typescript
await prisma.recipe.create({
  data: {
    title: "Tacos de Birria",
    featuredImage: "https://photos.smugmug.com/.../birria-tacos.jpg",
    images: [
      "https://photos.smugmug.com/.../step1.jpg",
      "https://photos.smugmug.com/.../step2.jpg",
    ],
    // ... other fields
  }
})
```

## ⚙️ Configuration Options

### For Production

When deploying to production:

1. **Update Environment Variables**:
   ```env
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

2. **Update SmugMug API Settings**:
   - Go to: https://api.smugmug.com/api/developer
   - Click "Manage Applications"
   - Update:
     - Application URL: `https://your-domain.com`
     - Callback URL: `https://your-domain.com/api/auth/smugmug/callback`

### Image Size Options

SmugMug provides multiple image sizes. To get different sizes, modify the export:

```typescript
// In lib/smugmug-client.ts
const exportData = {
  thumbnail: photo.ThumbnailUrl,     // 150px
  small: photo.Uris?.SmallImageUrl,  // 400px
  medium: photo.Uris?.MediumImageUrl, // 600px
  large: photo.Uris?.LargeImageUrl,   // 1024px
  original: photo.ArchivedUri,        // Full resolution
};
```

## 🔧 Troubleshooting

### "Authentication failed"

**Cause**: Invalid API credentials
**Solution**: 
- Check your API Key and Secret in `.env.local`
- Ensure no extra spaces or quotes
- Verify the key is active at https://api.smugmug.com/api/developer

### "Not authenticated" when loading albums

**Cause**: OAuth flow didn't complete
**Solution**:
- Click "Logout" and reconnect
- Clear browser localStorage
- Check browser console for errors

### Images not displaying

**Cause**: Album privacy settings
**Solution**:
- In SmugMug, ensure albums are at least "Unlisted"
- Private albums may not work with API

### Callback URL mismatch

**Cause**: Callback URL doesn't match SmugMug settings
**Solution**:
- Verify callback URL in SmugMug settings: `http://localhost:3000/api/auth/smugmug/callback`
- Must match exactly (including http/https)

## 🔒 Security Notes

### For Development

✅ **Safe for development**:
- Tokens stored in localStorage
- Works on localhost
- Good for testing

### For Production

⚠️ **DO NOT deploy as-is!** You need:

1. **Secure token storage**:
   - Use database (PostgreSQL with NextAuth)
   - Encrypt tokens at rest
   - Never expose in client-side code

2. **Session management**:
   - Implement proper sessions
   - Add CSRF protection
   - Set secure cookies

3. **HTTPS only**:
   - OAuth requires HTTPS in production
   - Get SSL certificate

4. **Rate limiting**:
   - Implement API rate limits
   - Track requests per user

## 📊 SmugMug API Limits

- **Rate Limit**: 5,000 requests/day per API key
- **Token Lifetime**: Permanent (until revoked)
- **Album Access**: Respects SmugMug privacy settings

## 🛠️ Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 📚 Resources

- [SmugMug API Documentation](https://api.smugmug.com/api/v2/doc)
- [SmugMug Developer Portal](https://api.smugmug.com/api/developer)
- [Next.js Documentation](https://nextjs.org/docs)
- [OAuth 1.0a Specification](https://oauth.net/core/1.0a/)

## 🆘 Getting Help

### Check Logs

1. **Browser Console**: F12 → Console tab
2. **Terminal**: Where you ran `npm run dev`

### Common Issues

| Error | Solution |
|-------|----------|
| "Module not found" | Run `npm install` |
| "Port 3000 in use" | Stop other apps or use `PORT=3001 npm run dev` |
| "OAuth error" | Check API credentials in `.env.local` |

### Still Stuck?

1. Check the README.md for more details
2. Review SmugMug API documentation
3. Verify all environment variables are set correctly

## 🎉 Success!

Once everything is working:

1. ✅ You can browse all your SmugMug albums
2. ✅ Select multiple photos easily
3. ✅ Export photo URLs and metadata
4. ✅ Use photos in your TacoFam articles

Enjoy building TacoFam with your amazing photos! 🌮📸
