# Smugtools.com

🚀 **Professional SmugMug Tools for Photographers**

The complete toolkit for photographers using SmugMug. Built with Next.js 14, TypeScript, and AI - featuring client galleries, metadata generation, analytics, and more.

---

## 🌟 What is Smugtools?

**Smugtools.com** is a professional SaaS platform that extends SmugMug's capabilities with powerful tools for photographers:

- 🤖 **AI-Powered Metadata** - Generate titles, captions, and keywords automatically
- 👥 **Client Galleries** - Beautiful, shareable galleries for client photo selection
- 📊 **Analytics Dashboard** - Track usage, AI operations, and client engagement
- 🎨 **Multi-Album Tools** - Create embeddable galleries from multiple albums
- 💎 **Premium Features** - Coin-based AI processing with flexible pricing
- 🔐 **Multi-Tenant SaaS** - Secure, scalable architecture for multiple users

---

## ✨ Features

### 🧰 Professional Tools

#### MetaData Monster
AI-powered bulk metadata generation for your photos:
- Batch process titles, captions, and keywords
- Multiple AI prompt styles (Professional, Creative, SEO, etc.)
- Edit before saving to SmugMug
- Export reports as CSV
- Token-based AI usage tracking

#### Favorites Manager
Let clients select their favorite photos:
- Customizable branding with logo upload
- Multiple theme options
- Shareable client links
- Optional "Buy" button integration
- Track customer selections

#### Multi-Album Selector
Create embeddable photo galleries:
- Select photos across multiple albums
- Generate embed codes (HTML, React, WordPress, JSON)
- Multiple display layouts (Grid, Carousel, Masonry)
- Preview before exporting

#### Photo Downloader
Bulk download tools for photographers:
- Download multiple photos at once
- Organize by album or custom selection
- High-quality original files
- Progress tracking

### 🔐 Authentication & Security

- **NextAuth.js** - Secure user authentication
- **Role-Based Access** - Admin and user roles
- **Encrypted Tokens** - AES-256-CBC encryption for SmugMug OAuth tokens
- **Session Management** - HTTP-only cookies
- **CSRF Protection** - Built-in security

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

# Database
DATABASE_URL=your_neon_connection_string

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Encryption
ENCRYPTION_KEY=your_64_char_hex_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI
ANTHROPIC_API_KEY=your_anthropic_key
```

### 3. Database Setup

Run the Neon schema:

```bash
# Copy schema to Neon SQL Editor
cat prisma/schema.sql
```

Execute in your Neon console, then create admin user:

```sql
-- Generate password hash first:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 10, (err, hash) => console.log(hash));"

UPDATE users
SET password_hash = 'YOUR_HASH', email = 'admin@smugtools.com'
WHERE role = 'admin';
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation

### For Users
- [Setup Guide](./MULTI_TENANT_SETUP.md) - Complete deployment instructions
- [API Reference](./API_ENDPOINTS.md) - All available endpoints
- [Tool Inventory](./tools/TOOLBOX_INVENTORY.md) - Feature documentation

### For Developers
- [Developer Guide](./CLAUDE.md) - AI assistant instructions
- [Agent Architecture](./.claude/agents/README.md) - Specialized AI agents
- [Security Guide](./.claude/agents/security-guardian.md) - Security best practices

---

## 🏗️ Architecture

```
smugtools/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # NextAuth + SmugMug OAuth
│   │   ├── smugmug/           # SmugMug API integration
│   │   ├── ai/                # AI metadata generation
│   │   ├── stripe/            # Payment processing
│   │   └── admin/             # Admin endpoints
│   ├── metadata-monster/      # AI metadata tool
│   ├── favorites-manager/     # Client gallery tool
│   ├── downloader/            # Bulk download tool
│   ├── admin/                 # Admin dashboard
│   ├── auth/                  # Sign in/up pages
│   └── pricing/               # Pricing & purchase
├── components/                # React components
├── lib/                       # Utilities
│   ├── db.ts                 # Database client
│   ├── encryption.ts         # Token encryption
│   └── coinCalculator.ts     # AI cost calculator
├── prisma/                    # Database schemas
└── stores/                    # Zustand state management
```

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
