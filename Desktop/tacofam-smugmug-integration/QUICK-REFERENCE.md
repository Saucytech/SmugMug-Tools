# 🚀 Quick Reference Card

## Getting Started (5 Minutes)

```bash
# 1. Get API credentials
open https://api.smugmug.com/api/developer/apply

# 2. Setup project
cd ~/Desktop/tacofam-smugmug-integration
cp .env.example .env.local
# Edit .env.local with your API key/secret

# 3. Install & run
npm install
npm run dev
# Open http://localhost:3000
```

## Essential Commands

| Command | What it does |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |

## File Locations

| File | Purpose |
|------|---------|
| `.env.local` | API credentials |
| `app/page.tsx` | Main UI |
| `app/api/*` | Backend routes |
| `lib/smugmug-client.ts` | API utilities |

## Environment Variables

```env
SMUGMUG_API_KEY=your_key_here
SMUGMUG_API_SECRET=your_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## User Flow

1. Click "Connect SmugMug Account"
2. Authorize in SmugMug
3. Click "Load Albums"
4. Click album to view photos
5. Click photos to select
6. Click "Export" to get JSON

## Exported JSON Format

```json
{
  "ImageKey": "abc123",
  "FileName": "taco.jpg",
  "ThumbnailUrl": "https://...",
  "ArchivedUri": "https://..."
}
```

## Common Issues

| Problem | Solution |
|---------|----------|
| "Module not found" | Run `npm install` |
| "Port 3000 in use" | `PORT=3001 npm run dev` |
| "Auth failed" | Check `.env.local` credentials |
| "Not authenticated" | Clear localStorage, reconnect |
| Images not loading | Check album privacy in SmugMug |

## Keyboard Shortcuts

- **Ctrl+C** - Stop server
- **Cmd+R** - Refresh browser
- **F12** - Open DevTools
- **Cmd+Shift+R** - Hard refresh

## Browser DevTools

```
F12 → Console    # Check for errors
F12 → Network    # Watch API calls
F12 → Application → Local Storage  # View tokens
```

## API Endpoints

| Endpoint | What it does |
|----------|-------------|
| `GET /api/auth/smugmug` | Start OAuth |
| `GET /api/auth/smugmug/callback` | OAuth callback |
| `GET /api/smugmug/albums` | List albums |
| `GET /api/smugmug/albums/[key]/images` | List photos |

## Documentation Files

| File | Read when |
|------|-----------|
| `SETUP-GUIDE.md` | **First time setup** |
| `README.md` | Technical details |
| `TROUBLESHOOTING.md` | Something broken |
| `VISUAL-GUIDE.md` | See UI mockups |
| `PROJECT-SUMMARY.md` | Quick overview |

## SmugMug Resources

- **Apply for API Key**: https://api.smugmug.com/api/developer/apply
- **Manage Keys**: https://api.smugmug.com/api/developer
- **API Docs**: https://api.smugmug.com/api/v2/doc
- **Status Page**: https://status.smugmug.com/

## Testing Checklist

✅ Prerequisites:
- [ ] Node.js 18+ installed
- [ ] SmugMug account
- [ ] API key obtained
- [ ] `.env.local` configured

✅ Verification:
- [ ] `npm run dev` works
- [ ] Can authenticate
- [ ] Albums load
- [ ] Photos display
- [ ] Can select photos
- [ ] Export works

## Default Ports

- **Dev Server**: http://localhost:3000
- **API Routes**: http://localhost:3000/api/*

## Folder Structure

```
tacofam-smugmug-integration/
├── app/              # Frontend & API routes
├── lib/              # Utilities
├── types/            # TypeScript types
├── .env.local        # Secrets (create this!)
└── package.json      # Dependencies
```

## Need Help?

1. Check `TROUBLESHOOTING.md`
2. Look at browser console (F12)
3. Check terminal logs
4. Verify SmugMug API status
5. Review `.env.local` settings

## Pro Tips

💡 **Tip 1**: Always restart server after editing `.env.local`
💡 **Tip 2**: Use browser incognito mode to test fresh auth
💡 **Tip 3**: Check Network tab for failed API calls
💡 **Tip 4**: Clear localStorage if auth seems stuck
💡 **Tip 5**: Keep albums "Unlisted" for API access

## Quick Links

- 🔑 [Get API Key](https://api.smugmug.com/api/developer/apply)
- 📖 [Setup Guide](./SETUP-GUIDE.md)
- 🔧 [Troubleshooting](./TROUBLESHOOTING.md)
- 📚 [Full Documentation](./README.md)

---

**Remember:** Read `SETUP-GUIDE.md` for detailed instructions!

Print this card and keep it handy! 📄
