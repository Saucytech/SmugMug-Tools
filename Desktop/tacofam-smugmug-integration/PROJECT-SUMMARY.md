# 🌮 TacoFam SmugMug Integration

**Created**: $(date)
**Location**: `/Users/kaydincarlsen/Desktop/tacofam-smugmug-integration`

## 📁 Project Structure

```
tacofam-smugmug-integration/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── smugmug/
│   │   │       ├── route.ts              # OAuth initiation
│   │   │       └── callback/
│   │   │           └── route.ts          # OAuth callback
│   │   └── smugmug/
│   │       └── albums/
│   │           ├── route.ts              # Fetch albums
│   │           └── [albumKey]/
│   │               └── images/
│   │                   └── route.ts      # Fetch photos
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                          # Main UI
├── lib/
│   └── smugmug-client.ts                 # API helper utilities
├── .env.example                          # Environment template
├── .gitignore
├── README.md                             # Full documentation
├── SETUP-GUIDE.md                        # Step-by-step setup
├── setup.sh                              # Automated setup script
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🎯 What This App Does

1. **Authenticates with SmugMug** using OAuth 1.0a
2. **Fetches your albums** from SmugMug API
3. **Displays photos** from selected albums
4. **Allows multi-select** of photos
5. **Exports photo data** as JSON with URLs and metadata

## 🚀 Quick Start (3 Steps)

### Step 1: Get API Key
Go to: https://api.smugmug.com/api/developer/apply

### Step 2: Configure
```bash
cd ~/Desktop/tacofam-smugmug-integration
cp .env.example .env.local
# Edit .env.local with your API credentials
```

### Step 3: Run
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## 📚 Documentation Files

- **README.md** - Complete technical documentation
- **SETUP-GUIDE.md** - Step-by-step setup instructions (READ THIS FIRST!)
- **setup.sh** - Automated setup script

## 🔑 Required Environment Variables

```env
SMUGMUG_API_KEY=your_api_key
SMUGMUG_API_SECRET=your_api_secret  
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🛠️ Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **OAuth 1.0a** - SmugMug authentication
- **SmugMug API v2** - Photo data retrieval

## ✨ Features

✅ OAuth 1.0a authentication with SmugMug
✅ Browse all your SmugMug albums
✅ View photos with thumbnails
✅ Multi-select photos
✅ Export as JSON (clipboard or download)
✅ Responsive design
✅ Error handling
✅ Loading states

## 📦 Exported Data Format

Photos are exported with:
- Image URLs (thumbnail, large, original)
- Filename
- Title & Caption
- Image Key (unique identifier)
- All metadata for TacoFam integration

## 🔗 Integration with TacoFam

Use exported photo URLs in:
- Markdown articles (frontmatter + content)
- Database imports (Recipe.featuredImage field)
- Editorial CMS (media library)

## ⚠️ Important Notes

### For Development
- Safe to use localStorage for tokens
- Works on localhost:3000
- Perfect for testing and content creation

### For Production
- ❌ DO NOT deploy as-is!
- ✅ Implement secure token storage (database)
- ✅ Add proper session management
- ✅ Use HTTPS only
- ✅ Implement rate limiting

## 🆘 Need Help?

1. Read **SETUP-GUIDE.md** for detailed instructions
2. Check SmugMug API docs: https://api.smugmug.com/api/v2/doc
3. Review browser console for errors (F12)
4. Check terminal logs where npm is running

## 🎉 You're Ready!

Follow the setup guide to get started. Within 10 minutes, you'll be browsing your SmugMug photos and selecting images for TacoFam articles!

Happy cooking (and coding)! 🌮📸
