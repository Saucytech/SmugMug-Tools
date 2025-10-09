# Smugtools.com

🚀 **Professional SmugMug Tools for Photographers**

The complete toolkit for photographers using SmugMug. Built with Next.js 14, TypeScript, and AI - featuring client galleries, metadata generation, analytics, and more.

> ⚠️ **IMPORTANT DISCLAIMER:** Smugtools is NOT an official SmugMug application. It is a third-party tool that interacts with your SmugMug account via the official SmugMug API. These tools can modify, delete, move, or rename your photos and albums. **Use at your own risk.** Always back up important content before using destructive operations. Deleted content can be recovered in your SmugMug account at: [SmugMug Library Trash](https://www.smugmug.com/app/library/trash)

---

## 🌟 What is Smugtools?

**Smugtools.com** is a multi-tenant SaaS platform that extends SmugMug's capabilities with 8 professional tools for photographers:

- 🤖 **AI-Powered Metadata** - Generate titles, captions, and keywords automatically
- 👥 **Client Galleries** - Beautiful, shareable galleries for client photo selection
- 📊 **Analytics Dashboard** - Track usage, AI operations, and client engagement
- 🎨 **Multi-Album Tools** - Create embeddable galleries from multiple albums
- 📤 **Guest Uploads** - Share upload links with clients and guests
- 📁 **Bulk Downloads** - Download photos with preserved folder hierarchy
- 🔍 **Sanity Checker** - AI-powered account analysis and optimization
- 🎯 **Photo Organizer** - AI sorting with smart indexing
- 💎 **Coin System** - Flexible AI credit pricing with Stripe integration
- 🔐 **Enterprise Security** - Encrypted tokens, NextAuth, role-based access

---

## ✨ Features

### 🧰 8 Professional Tools

#### 1. Embed & Sell (Multi-Album Selector)
Create embeddable photo galleries:
- Select photos across multiple albums
- Generate embed codes (HTML, React, WordPress, JSON)
- Multiple display layouts (Grid, Carousel, Masonry)
- Buy button integration
- Preview before exporting

#### 2. Favorites Selector (Favorites Manager)
Let clients select their favorite photos:
- 7 customizable color themes
- Logo branding upload (PNG/JPG/SVG)
- Shareable client links
- Optional "Buy" button integration
- Customer tracking (name, email)

#### 3. MetaData Monster
AI-powered bulk metadata generation:
- 2 modes: Normal & Seek & Capture
- 5 prompt styles (Professional, Creative, SEO, Minimal, Descriptive)
- Batch process titles, captions, keywords
- Edit before saving to SmugMug
- Export reports as CSV
- 1 coin per photo

#### 4. AI Gallery Creator
Create folder structures with AI assistance:
- AI chat for automatic structure creation
- 5 pre-built templates (Wedding, Sports, Real Estate, Portrait, Corporate)
- Manual folder/gallery creation tools
- Destruction Mode for cleanup
- Template save/load system
- Guest upload link generation

#### 5. Photo Organizer
AI-powered photo organization:
- AI auto-sorting into correct albums
- Confidence scoring for suggestions
- Smart indexing for fast searches
- Bulk organization
- Preview before applying

#### 6. Guest Upload Manager
Share upload links with clients:
- Project-based organization
- People library (reusable templates)
- Drag-and-drop people management
- Unique upload URL per person
- Batch "Execute Pending" for bulk creation
- Upload tracking

#### 7. Folder Downloader
Download with preserved hierarchy:
- 3 download strategies (Single ZIP, Album-based, Auto-split)
- 5 image size options (Original, X3Large, X2Large, XLarge, Large)
- Folder tree navigation with checkboxes
- Preserve original folder structure
- Delete albums option

#### 8. Sanity Checker
Comprehensive account analysis:
- AI-powered deep analysis using cached gallery data
- Severity categorization (Critical, Optimization, General)
- Terminal-style log output
- Clickable links to affected galleries
- Auto-fix available for some issues

### 🔐 Authentication & Security

- **NextAuth.js** - Secure user authentication with database sessions
- **Stack Auth Integration** - Optional authentication provider
- **Role-Based Access** - Admin and user roles with permission system
- **Encrypted Tokens** - AES-256-CBC encryption for SmugMug OAuth tokens
- **Session Management** - HTTP-only, SameSite cookies
- **CSRF Protection** - Built-in NextAuth security
- **Tool State Management** - Admin control over tool availability

### 💰 Monetization Ready

- **Stripe Integration** - Accept payments for AI credits
- **Coin System** - Flexible credit-based pricing
- **Usage Tracking** - Monitor AI operations and costs
- **Admin Dashboard** - Grant bonus coins, view analytics
- **Transaction History** - Complete audit trail

### 🎨 Tech Stack

- **Next.js 14** - App Router, Server Components
- **TypeScript** - Full type safety
- **Tailwind CSS** - Modern, responsive design
- **Neon PostgreSQL** - Serverless database
- **Anthropic Claude** - AI vision for metadata
- **Stripe** - Payment processing
- **OAuth 1.0a** - SmugMug authentication

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- SmugMug account with API access
- Neon database (free tier available)
- Stripe account (for payments)
- Anthropic API key (for AI features)

### 1. Clone Repository

```bash
git clone https://github.com/Saucytech/smugtools.git
cd smugtools
npm install
```

### 2. Environment Setup

Create `.env.development.local`:

```env
# SmugMug API
SMUGMUG_API_KEY=your_api_key
SMUGMUG_API_SECRET=your_api_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Neon PostgreSQL)
DATABASE_URL=your_neon_connection_string
DATABASE_URL_UNPOOLED=your_neon_unpooled_string

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Encryption (for SmugMug tokens)
ENCRYPTION_KEY=your_64_char_hex_key

# Stripe (optional - for coin purchases)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI (Anthropic Claude)
ANTHROPIC_API_KEY=your_anthropic_key

# Stack Auth (optional alternative to NextAuth)
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_client_key
STACK_SECRET_SERVER_KEY=your_stack_secret_key
```

### 3. Database Setup

**See detailed instructions in [MULTI_TENANT_SETUP.md](./MULTI_TENANT_SETUP.md)**

Quick steps:

```bash
# 1. Copy schema to Neon SQL Editor
cat prisma/schema.sql

# 2. Execute schema in Neon console

# 3. Generate admin password hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 10, (err, hash) => console.log(hash));"

# 4. Update admin user in database
# Run in Neon SQL Editor:
UPDATE users
SET password_hash = 'YOUR_HASH', email = 'admin@smugtools.com'
WHERE role = 'admin';
```

### 4. Run Development Server

```bash
npm run dev
```

Visit:
- Homepage: [http://localhost:3000](http://localhost:3000)
- Sign up: [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup)
- Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 📚 Documentation

### For Users
- [Setup Guide](./MULTI_TENANT_SETUP.md) - Complete multi-tenant setup instructions
- [Tools Guide](./TOOLS_GUIDE.md) - Comprehensive guide to all 8 tools
- [Admin Guide](./ADMIN_GUIDE.md) - Platform administration and management

### For Developers
- [API Reference](./API_REFERENCE.md) - All 35+ API endpoints documented
- [Architecture Guide](./ARCHITECTURE.md) - System design, database schema, security
- [Developer Guide](./CLAUDE.md) - AI assistant development instructions

### Legacy Documentation
- [Legacy Docs](./docs/legacy/) - Archived documentation from earlier versions
- [Mobile Docs](./docs/mobile/) - Mobile optimization documentation archive

---

## 🏗️ Architecture

```
smugtools/
├── app/
│   ├── api/                       # 35+ API routes
│   │   ├── auth/                 # NextAuth + SmugMug OAuth
│   │   │   ├── [...nextauth]/   # NextAuth handlers
│   │   │   ├── signup/          # User registration
│   │   │   └── smugmug/         # SmugMug OAuth flow
│   │   ├── smugmug/              # SmugMug API integration
│   │   │   ├── albums/          # Album management
│   │   │   ├── folders/         # Folder operations
│   │   │   ├── create-gallery/  # Gallery creation
│   │   │   ├── create-folder/   # Folder creation
│   │   │   ├── upload/          # Photo uploads
│   │   │   └── [20+ more]       # Additional endpoints
│   │   ├── ai/                   # AI operations
│   │   │   └── generate-metadata/
│   │   ├── admin/                # Admin-only endpoints
│   │   │   └── tools/           # Tool state management
│   │   ├── tools/                # Tool states API
│   │   └── download/             # Bulk download handler
│   ├── metadata-monster/         # Tool: AI metadata generation
│   ├── favorites-manager/        # Tool: Client galleries
│   ├── ai-gallery-creator/       # Tool: Structure creator
│   ├── photo-organizer/          # Tool: AI sorting
│   ├── guest-upload-manager/     # Tool: Upload links
│   ├── downloader/               # Tool: Bulk downloads
│   ├── sanity-checker/           # Tool: Account analysis
│   ├── admin/                    # Admin dashboard
│   ├── ai-dashboard/             # AI usage analytics
│   ├── auth/                     # Sign in/up pages
│   └── pricing/                  # Coin packages
├── components/                   # React components
│   ├── ToolboxHeader.tsx        # Main navigation
│   ├── AlbumsLoader.tsx         # Album fetching
│   ├── CacheSyncButton.tsx      # Cache management
│   └── SessionProvider.tsx      # Auth provider
├── lib/                          # Utilities
│   ├── db.ts                    # Database client (Neon)
│   ├── encryption.ts            # AES-256-CBC for tokens
│   ├── coinCalculator.ts        # AI cost calculation
│   └── galleryCache.ts          # Album cache system
├── stores/                       # Zustand state
│   └── albumsStore.ts           # Global albums state
├── prisma/                       # Database
│   └── schema.sql               # 8 tables schema
└── types/                        # TypeScript types
    └── smugmug.ts               # SmugMug API types
```

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.**

---

## ⚠️ Important Disclaimers

### Not an Official SmugMug Product

**Smugtools.com is an independent third-party application** and is not affiliated with, endorsed by, or supported by SmugMug, Inc. We use the official SmugMug API to provide our services, but we are not part of SmugMug.

### Use at Your Own Risk

These tools can perform **destructive operations** on your SmugMug account:

- ✂️ **Delete photos and albums** - Permanently remove content (recoverable from trash)
- 🔄 **Move and reorganize** - Change folder structures and album locations
- ✏️ **Rename and modify** - Update album names, photo titles, captions, keywords
- 🔁 **Overwrite metadata** - Replace existing photo information

**Important:**
- Always review changes before confirming destructive actions
- Test with a small subset of photos first
- Back up important content before using batch operations
- Keep track of what you've modified

### Recovery Options

If you accidentally delete content:

1. Go to your SmugMug account
2. Navigate to **Library → Trash**
3. Direct link: https://www.smugmug.com/app/library/trash
4. Restore deleted items within 60 days (SmugMug's retention period)

### Data Privacy

- We **never** store your SmugMug photos on our servers
- OAuth tokens are encrypted in our database (AES-256-CBC)
- All SmugMug API calls go directly from your browser or our server to SmugMug
- AI processing sends only image URLs to Anthropic Claude (not the images themselves)
- We don't share your data with third parties

### Support & Liability

- Use Smugtools at your own risk
- We are not responsible for data loss or account issues
- Always maintain backups of important photos
- For SmugMug account issues, contact SmugMug support directly
- For Smugtools issues, contact us at support@smugtools.com

---

## 🔐 Security

Smugtools implements enterprise-grade security:

- ✅ **Password Hashing** - bcrypt with 10 rounds
- ✅ **Token Encryption** - AES-256-CBC for OAuth tokens
- ✅ **Secure Sessions** - HTTP-only, SameSite cookies
- ✅ **CSRF Protection** - NextAuth built-in
- ✅ **Role-Based Access** - Admin/user permissions
- ✅ **SSL Encryption** - Neon database SSL
- ✅ **API Rate Limiting** - DDoS protection
- ✅ **Input Validation** - XSS prevention

---

## 💎 Pricing & Coins

Smugtools uses a **coin-based credit system**:

- AI operations consume coins based on token usage
- Users purchase coin packages via Stripe
- Admins can grant bonus coins
- Real-time balance tracking
- Complete transaction history

**Default Packages:**
- Starter: 1,000 coins - $9.99
- Professional: 5,000 coins - $39.99
- Enterprise: 15,000 coins - $99.99

---

## 🚀 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel login
vercel deploy --prod
```

### Environment Variables

Set these in Vercel dashboard:
- All `.env` variables
- Update `NEXTAUTH_URL` to production domain
- Update SmugMug callback URL

### Stripe Webhook

Configure webhook in Stripe dashboard:
- URL: `https://your-domain.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `payment_intent.succeeded`

---

## 🛠️ Development

### Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
npm test             # Run Playwright tests
```

### Testing

```bash
# Run all tests
npm test

# Mobile tests
npm run test:mobile

# UI mode
npm run test:ui

# Debug mode
npm run test:debug
```

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details

---

## 🙋 Support

- **Website**: [smugtools.com](https://smugtools.com)
- **Email**: support@smugtools.com
- **GitHub Issues**: [Report a bug](https://github.com/Saucytech/smugtools/issues)
- **SmugMug API**: [Official Documentation](https://api.smugmug.com/api/v2/doc)

---

## 🌟 Roadmap

- [ ] Video support for galleries
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Shopify integration
- [ ] Print fulfillment integration
- [ ] Social media auto-posting
- [ ] Client invoicing system
- [ ] Advanced SEO tools

---

## 🎉 Credits

Built with ❤️ by [Saucytech](https://github.com/Saucytech)

Powered by:
- [Next.js](https://nextjs.org)
- [Anthropic Claude](https://www.anthropic.com)
- [SmugMug API](https://api.smugmug.com)
- [Neon Database](https://neon.tech)
- [Stripe](https://stripe.com)

---

**Transform your SmugMug workflow with Smugtools.com** 🚀
