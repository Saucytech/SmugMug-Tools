# 🎉 START HERE

## Welcome to TacoFam SmugMug Integration!

You've just created a complete Next.js application that connects to SmugMug and allows you to browse photos for use in TacoFam articles.

---

## ⚡ 3-Minute Quick Start

### 1️⃣ Get SmugMug API Key (2 minutes)

Visit: https://api.smugmug.com/api/developer/apply

Fill out:
- **Application Name**: TacoFam Photo Integration
- **Callback URL**: `http://localhost:3000/api/auth/smugmug/callback`

Copy your **API Key** and **API Secret**

### 2️⃣ Configure (30 seconds)

```bash
cd ~/Desktop/tacofam-smugmug-integration
cp .env.example .env.local
```

Open `.env.local` and paste your credentials:
```env
SMUGMUG_API_KEY=paste_your_key_here
SMUGMUG_API_SECRET=paste_your_secret_here
```

### 3️⃣ Run (30 seconds)

```bash
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## ✅ Success Looks Like This

1. Browser opens to landing page
2. Click "Connect SmugMug Account"
3. Authorize in SmugMug
4. Click "Load Albums"
5. See your albums appear
6. Click any album
7. See photos with thumbnails
8. Click photos to select them
9. Click "Export" to get JSON

---

## 📚 What to Read Next

| Document | When to Read | Time |
|----------|-------------|------|
| **INDEX.md** | Navigation guide | 2 min |
| **SETUP-GUIDE.md** | Detailed setup steps | 10 min |
| **QUICK-REFERENCE.md** | Commands & shortcuts | 2 min |

---

## 🎯 Your Goal

**Export SmugMug photos** to use in TacoFam articles with proper URLs and metadata.

---

## 🆘 Need Help?

**Not working?** → Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**Questions?** → Read [INDEX.md](./INDEX.md) to find the right doc

---

## 🗂️ What You Have

```
📁 tacofam-smugmug-integration/
├── 📘 INDEX.md                 ← Navigation hub
├── 📗 SETUP-GUIDE.md           ← Detailed instructions
├── 📙 README.md                ← Technical docs
├── 📔 QUICK-REFERENCE.md       ← Cheat sheet
├── 📕 TROUBLESHOOTING.md       ← Fix problems
├── 📖 VISUAL-GUIDE.md          ← UI mockups
├── 📄 PROJECT-SUMMARY.md       ← Overview
├── ⚙️  .env.example            ← Config template
├── 🔧 setup.sh                 ← Auto-setup script
└── 💻 app/                     ← Application code
```

---

## 🚀 Next Steps

1. ✅ **Read this file** (you are here!)
2. ⬜ Get SmugMug API key
3. ⬜ Configure `.env.local`
4. ⬜ Run `npm install`
5. ⬜ Run `npm run dev`
6. ⬜ Open http://localhost:3000
7. ⬜ Connect to SmugMug
8. ⬜ Browse your photos
9. ⬜ Export and use in TacoFam!

---

## 💡 Pro Tip

Keep **QUICK-REFERENCE.md** open in a tab for commands and shortcuts!

---

## 🎨 What This Does

```
SmugMug Photos → This App → Exported JSON → TacoFam Articles
```

You can:
- Browse all your SmugMug albums
- Select multiple photos
- Export URLs and metadata as JSON
- Use the data in markdown articles
- Import into TacoFam database

---

## ⏱️ Time Investment

- **Setup**: 5 minutes
- **First use**: 2 minutes
- **Daily use**: < 1 minute to export photos

---

## 🎯 Success Criteria

You'll know it's working when:
- ✅ Server starts without errors
- ✅ You can authenticate with SmugMug
- ✅ Albums load and display
- ✅ Photos appear with thumbnails
- ✅ Selecting photos shows blue rings
- ✅ Export creates valid JSON

---

## 🔑 Essential Links

- **Get API Key**: https://api.smugmug.com/api/developer/apply
- **Manage Keys**: https://api.smugmug.com/api/developer
- **API Docs**: https://api.smugmug.com/api/v2/doc

---

## Ready? Let's Go! 🚀

Follow the **3-Minute Quick Start** above, then you're off to the races!

For detailed instructions, read **[SETUP-GUIDE.md](./SETUP-GUIDE.md)**

---

**Questions?** Check [INDEX.md](./INDEX.md) for navigation

**Problems?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**Reference?** Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

---

Happy photo browsing! 🌮📸
