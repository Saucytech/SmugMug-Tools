# Multi-Tenant SaaS Platform Setup Guide

## ⚠️ IMPORTANT: Complete These Steps in Order

### Step 1: Add Environment Variables

Add these to your Vercel project (or `.env.development.local` for local dev):

```env
# Database (Already done via Neon integration)
DATABASE_URL="your-neon-connection-string"

# NextAuth Secret (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"  # Change to your production URL in production

# Encryption Key for SmugMug Tokens
ENCRYPTION_KEY="6c4b8e2a302deba0d142b1f95a559ba5728968ce30c1f004eacb1911d85caba8"

# Stripe (Get from https://dashboard.stripe.com/test/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # Get after setting up webhook
```

### Step 2: Run Database Schema

1. Open the **Neon SQL Editor** in your Neon Console
2. Copy the entire contents of `prisma/schema.sql`
3. Paste and execute it in the SQL Editor
4. Verify tables were created:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see these tables:
- users
- smugmug_tokens
- coin_transactions
- ai_operations
- accounts
- sessions
- verification_tokens

### Step 3: Create Admin Password Hash

The schema includes a placeholder admin user. You need to generate a real password hash:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_ADMIN_PASSWORD', 10, (err, hash) => console.log(hash));"
```

Then update the admin user in Neon SQL Editor:

```sql
UPDATE users
SET password_hash = 'YOUR_GENERATED_HASH_HERE'
WHERE email = 'admin@smugmugtoolbox.com';
```

Or change the email to your preferred admin email:

```sql
UPDATE users
SET email = 'your@email.com', password_hash = 'YOUR_GENERATED_HASH_HERE'
WHERE role = 'admin';
```

### Step 4: Set Up Stripe (Payment Processing)

1. Go to https://dashboard.stripe.com/
2. Get your **publishable** and **secret** API keys (use test mode for development)
3. Set up a webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
4. Copy the **Webhook Signing Secret** and add to environment variables

### Step 5: Update Environment Variables in Vercel

After local testing, add all environment variables to Vercel:

```bash
vercel env add NEXTAUTH_SECRET production
vercel env add ENCRYPTION_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

Update `NEXTAUTH_URL` to your production domain:
```bash
vercel env add NEXTAUTH_URL production
# Enter: https://your-domain.vercel.app
```

### Step 6: Test Locally

```bash
npm run dev
```

Visit:
- http://localhost:3000/auth/signin - Login page
- http://localhost:3000/auth/signup - Registration page
- http://localhost:3000/admin - Admin dashboard (after login as admin)

### Step 7: Deploy to Production

```bash
git add -A
git commit -m "Add multi-tenant authentication system"
git push origin feature/multi-tenant-auth
```

Then merge to main or deploy directly to Vercel.

---

## Architecture Overview

### User Types

**Admin Users:**
- View platform-wide analytics
- See all users and their usage
- Grant bonus coins
- Cannot access users' SmugMug accounts
- Access: `/admin` dashboard

**Regular Users:**
- Sign up and purchase coins via Stripe
- Connect their SmugMug account
- Use coins to process photos with AI
- View only their own usage
- Access: All tools + `/dashboard`

### Database Tables

- **users** - User accounts with roles and coin balances
- **smugmug_tokens** - Encrypted OAuth tokens per user
- **coin_transactions** - All purchases and spending
- **ai_operations** - Track every AI request with token usage
- **accounts/sessions** - NextAuth session management

### Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ AES-256-CBC encryption for SmugMug tokens
- ✅ HTTP-only cookies for sessions
- ✅ CSRF protection via NextAuth
- ✅ Role-based access control
- ✅ Encrypted database connection (Neon SSL)

### Payment Flow

1. User clicks "Buy Coins" button
2. Stripe Checkout session created with coin package details
3. User completes payment on Stripe
4. Stripe sends webhook to `/api/stripe/webhook`
5. Webhook verifies payment and credits user's coin balance
6. Transaction recorded in `coin_transactions` table

### AI Processing Flow

1. User triggers AI operation (e.g., generate metadata)
2. System checks user's coin balance
3. Creates record in `ai_operations` table (status: processing)
4. Calls Anthropic API with YOUR API key
5. Records token usage and calculates coin cost
6. Deducts coins from user balance
7. Updates operation record (status: completed)
8. Creates transaction in `coin_transactions` table

---

## Troubleshooting

### "DATABASE_URL not set"
Make sure you ran `vercel env pull .env.development.local`

### "ENCRYPTION_KEY not set or invalid"
The key must be exactly 64 hex characters. Use the one provided or generate a new one with: `openssl rand -hex 32`

### "Can't connect to database"
Check that your Neon database is active and the connection string is correct.

### "Admin login fails"
Make sure you updated the admin password hash in the database.

### "Stripe webhook not working"
1. Check webhook secret is correct
2. Verify webhook URL is set to `/api/stripe/webhook`
3. Check Vercel logs for errors

---

## Next Steps After Setup

1. ✅ Test user registration and login
2. ✅ Test admin dashboard access
3. ✅ Set up Stripe test mode purchases
4. ✅ Test AI operations with coin deduction
5. ✅ Review admin analytics
6. ✅ Configure Stripe webhook in production
7. ✅ Set production environment variables
8. ✅ Deploy to production

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Neon database logs
3. Verify all environment variables are set correctly
4. Test database connection with: `SELECT 1;` in Neon SQL Editor
