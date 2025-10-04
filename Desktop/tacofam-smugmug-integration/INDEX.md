# 📚 Documentation Index

Welcome to the TacoFam SmugMug Integration! This index will help you find exactly what you need.

## 🎯 Start Here

**New to this project?** Read in this order:

1. **[PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md)** - 5 min overview
2. **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - Step-by-step setup (10 min)
3. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Cheat sheet

## 📖 All Documentation

### Essential Reading

| Document | Read When | Time |
|----------|-----------|------|
| [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md) | Just downloaded | 5 min |
| [SETUP-GUIDE.md](./SETUP-GUIDE.md) | First time setup | 10 min |
| [README.md](./README.md) | Technical details | 15 min |

### Reference Material

| Document | Use For | Time |
|----------|---------|------|
| [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) | Quick lookups | 2 min |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Fixing problems | As needed |
| [VISUAL-GUIDE.md](./VISUAL-GUIDE.md) | UI understanding | 5 min |

## 🎓 Learning Paths

### Path 1: Quick Start (Total: 20 min)
```
1. PROJECT-SUMMARY.md    (5 min)
2. SETUP-GUIDE.md        (10 min)
3. Run the app           (5 min)
4. Start using!
```

### Path 2: Complete Understanding (Total: 45 min)
```
1. PROJECT-SUMMARY.md    (5 min)
2. SETUP-GUIDE.md        (10 min)
3. README.md             (15 min)
4. VISUAL-GUIDE.md       (5 min)
5. Run the app           (5 min)
6. Experiment            (5 min)
```

### Path 3: Troubleshooting
```
Problem occurred?
↓
1. TROUBLESHOOTING.md - Check your issue
2. QUICK-REFERENCE.md - Verify setup
3. Browser DevTools   - Check errors
4. README.md          - Review architecture
```

## 📂 What's What

### PROJECT-SUMMARY.md
```
What: High-level overview
Contains: 
  - Project structure
  - 3-step quick start
  - Tech stack
  - Features list
  - Integration examples
Read when: First time viewing project
```

### SETUP-GUIDE.md
```
What: Detailed setup instructions
Contains:
  - Step-by-step SmugMug API setup
  - Installation commands
  - Configuration details
  - Usage instructions
  - Export format examples
  - Security notes
Read when: Setting up for first time
```

### README.md
```
What: Complete technical documentation
Contains:
  - Full feature list
  - Architecture overview
  - Tech stack details
  - API integration
  - Development workflow
  - Production considerations
Read when: Want deep technical understanding
```

### QUICK-REFERENCE.md
```
What: Cheat sheet
Contains:
  - Common commands
  - File locations
  - Quick troubleshooting
  - Keyboard shortcuts
  - Essential links
Read when: Need quick reminder
Print: Yes! Keep at desk
```

### TROUBLESHOOTING.md
```
What: Debug guide
Contains:
  - 10 common issues + solutions
  - Debug checklist
  - Testing steps
  - Success indicators
Read when: Something's broken
```

### VISUAL-GUIDE.md
```
What: UI/UX documentation
Contains:
  - ASCII mockups
  - User flow diagrams
  - Data flow charts
  - Color scheme
  - Component guide
Read when: Want to understand UI
```

## 🗂️ Code Documentation

### Source Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main UI component |
| `app/layout.tsx` | Layout wrapper |
| `app/api/auth/smugmug/route.ts` | OAuth initiation |
| `app/api/auth/smugmug/callback/route.ts` | OAuth callback |
| `app/api/smugmug/albums/route.ts` | Fetch albums |
| `app/api/smugmug/albums/[albumKey]/images/route.ts` | Fetch photos |
| `lib/smugmug-client.ts` | API utilities |
| `types/smugmug.ts` | TypeScript types |

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Secrets (create this!) |
| `.env.example` | Template |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript config |
| `next.config.js` | Next.js config |
| `tailwind.config.js` | Tailwind config |

## 🔍 Finding Specific Information

### "How do I...?"

| Task | Document | Section |
|------|----------|---------|
| Get API credentials | SETUP-GUIDE.md | Step 1 |
| Install dependencies | SETUP-GUIDE.md | Step 2 |
| Configure environment | SETUP-GUIDE.md | Step 3 |
| Run the app | SETUP-GUIDE.md | Step 4 |
| Use the interface | SETUP-GUIDE.md | Usage |
| Fix auth errors | TROUBLESHOOTING.md | Issue #2 |
| Export photos | README.md | Usage → Export |
| Integrate with TacoFam | README.md | Integration |
| Deploy to production | README.md | Security Notes |

### "What is...?"

| Term | Document | Where |
|------|----------|-------|
| OAuth 1.0a | README.md | Tech Stack |
| SmugMug API | README.md | Architecture |
| Access token | SETUP-GUIDE.md | Step 1 |
| Album key | types/smugmug.ts | SmugMugAlbum |
| Export format | SETUP-GUIDE.md | Exported Data |

### "Why...?"

| Question | Document | Section |
|----------|----------|---------|
| Why Next.js? | README.md | Tech Stack |
| Why OAuth 1.0a? | README.md | Architecture |
| Why localStorage? | README.md | Security Notes |
| Why not production ready? | README.md | Security Notes |

## 🎯 Quick Scenarios

### Scenario 1: "I just cloned this repo"
```
1. Read: PROJECT-SUMMARY.md
2. Follow: SETUP-GUIDE.md
3. Keep handy: QUICK-REFERENCE.md
```

### Scenario 2: "Something's broken"
```
1. Check: TROUBLESHOOTING.md
2. If not found: Browser DevTools (F12)
3. If still stuck: README.md architecture
```

### Scenario 3: "How do I use this?"
```
1. Follow: SETUP-GUIDE.md → Usage
2. Reference: VISUAL-GUIDE.md
3. Understand: README.md → Integration
```

### Scenario 4: "I want to modify the code"
```
1. Understand: README.md → Architecture
2. Reference: types/smugmug.ts
3. Look at: Source files (app/*)
```

### Scenario 5: "Deploying to production"
```
1. Read: README.md → Security Notes
2. Review: SETUP-GUIDE.md → For Production
3. **DO NOT** deploy without changes
```

## 📋 Checklists

### Before You Start
- [ ] Read PROJECT-SUMMARY.md
- [ ] Have SmugMug account
- [ ] Have Node.js 18+
- [ ] Ready to get API key

### Setup Complete When
- [ ] Dependencies installed
- [ ] .env.local configured
- [ ] Server runs without errors
- [ ] Can authenticate
- [ ] Albums load
- [ ] Photos display

### Ready to Integrate When
- [ ] Can export photos
- [ ] Understand JSON format
- [ ] Know photo URLs
- [ ] Tested with TacoFam

## 🔗 External Resources

- **SmugMug**
  - [Apply for API Key](https://api.smugmug.com/api/developer/apply)
  - [API Documentation](https://api.smugmug.com/api/v2/doc)
  - [Developer Portal](https://api.smugmug.com/api/developer)

- **Next.js**
  - [Documentation](https://nextjs.org/docs)
  - [App Router Guide](https://nextjs.org/docs/app)

- **TypeScript**
  - [Handbook](https://www.typescriptlang.org/docs/)

## 💡 Tips

- 📌 **Bookmark this page** for quick access
- 🖨️ **Print QUICK-REFERENCE.md** to keep at your desk
- 📱 **Save TROUBLESHOOTING.md** offline for emergencies
- 🔖 **Tab order**: Summary → Setup → Reference

## 🆘 Still Lost?

Follow this decision tree:

```
┌─────────────────────┐
│ What do you need?   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
 Overview      Setup?
    │             │
    ▼             ▼
PROJECT-    SETUP-GUIDE.md
SUMMARY.md       │
                 │
            ┌────┴────┐
            │         │
        Working?   Broken?
            │         │
            ▼         ▼
        Use it!   TROUBLESHOOTING.md
```

## 📞 Support Channels

1. **Documentation** - You're here!
2. **Code Comments** - Check source files
3. **SmugMug API** - Their documentation
4. **Browser DevTools** - F12 for errors

---

## Summary

**New user?** → [SETUP-GUIDE.md](./SETUP-GUIDE.md)
**Quick lookup?** → [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
**Something broken?** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
**Deep dive?** → [README.md](./README.md)

Happy integrating! 🌮📸
