# Smugtools Architecture

Comprehensive technical architecture documentation for the Smugtools multi-tenant SaaS platform.

---

## System Overview

**Smugtools** is a production-ready, multi-tenant SaaS platform built to extend SmugMug's capabilities with AI-powered professional tools for photographers.

### Technology Stack

**Frontend**:
- Next.js 14 (App Router with Server Components)
- React 18
- TypeScript (strict mode)
- TailwindCSS (utility-first styling)
- Zustand (global state management)

**Backend**:
- Next.js API Routes (serverless functions)
- NextAuth.js (authentication)
- Neon PostgreSQL (serverless database)
- Node.js crypto (AES-256-CBC encryption)

**External Services**:
- SmugMug API v2 (OAuth 1.0a)
- Anthropic Claude API (AI operations)
- Stripe (payment processing)
- Vercel (hosting & deployment)

---

## Database Architecture

### Technology: Neon PostgreSQL

**Why Neon**:
- Serverless (auto-scaling, pay-per-use)
- Instant branching for development
- Connection pooling built-in
- SSL by default
- Fast cold starts

### Schema Overview

#### Core Tables

**`users`**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  coin_balance INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- Stores user accounts with bcrypt password hashing
- `role`: 'admin' or 'user'
- `coin_balance`: AI operation credits

**`smugmug_tokens`**
```sql
CREATE TABLE smugmug_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_secret TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- OAuth tokens encrypted with AES-256-CBC
- One-to-one relationship with users
- Tokens decrypted only when needed for API calls

**`tool_states`**
```sql
CREATE TABLE tool_states (
  id SERIAL PRIMARY KEY,
  tool_id VARCHAR(100) UNIQUE NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'on',
  disabled_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- Admin control over tool availability
- `status`: 'on', 'disabled', 'off'
- `disabled_message`: Shown to users when status is 'disabled'

**`coin_transactions`**
```sql
CREATE TABLE coin_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  reference_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- Complete audit trail of all coin changes
- `type`: 'purchase', 'usage', 'bonus', 'refund'
- `reference_id`: Stripe payment ID or AI operation ID

**`ai_operations`**
```sql
CREATE TABLE ai_operations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL,
  operation_type VARCHAR(100) NOT NULL,
  tokens_used INTEGER,
  cost_in_coins INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```
- Tracks every AI API call
- Powers analytics and usage reports
- `status`: 'pending', 'completed', 'failed'

**`uploaded_images`**
```sql
CREATE TABLE uploaded_images (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_name VARCHAR(255),
  person_name VARCHAR(255),
  album_uri VARCHAR(500),
  image_uri VARCHAR(500),
  upload_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
- Guest upload tracking
- Project-based organization
- Links to SmugMug album/image URIs

#### NextAuth Tables

**`accounts`** - OAuth provider connections
**`sessions`** - Active user sessions (JWT-based)
**`verification_tokens`** - Email verification (if implemented)

#### Stripe Tables

**`stripe_customers`** - Links users to Stripe customer IDs
**`stripe_payments`** - Payment history

### Relationships

```
users (1) ──→ smugmug_tokens (1)
users (1) ──→ coin_transactions (many)
users (1) ──→ ai_operations (many)
users (1) ──→ uploaded_images (many)
users (1) ──→ accounts (many)
users (1) ──→ sessions (many)
users (1) ──→ stripe_customers (1)
```

### Indexes

```sql
CREATE INDEX idx_smugmug_tokens_user_id ON smugmug_tokens(user_id);
CREATE INDEX idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX idx_ai_operations_user_id ON ai_operations(user_id);
CREATE INDEX idx_ai_operations_status ON ai_operations(status);
CREATE INDEX idx_tool_states_tool_id ON tool_states(tool_id);
```

---

## Authentication Architecture

### NextAuth.js Flow

```
1. User visits /auth/signin
2. Submits credentials
3. NextAuth validates against users table
4. Creates session in sessions table
5. Returns HTTP-only session cookie
6. User redirected to dashboard
```

### SmugMug OAuth Flow

```
1. User clicks "Connect SmugMug"
2. Redirect to /api/auth/smugmug
3. Request token from SmugMug
4. Store token secret in HTTP-only cookie
5. Redirect to SmugMug authorization page
6. User authorizes application
7. SmugMug redirects to /api/auth/smugmug/callback
8. Exchange request token for access token
9. Encrypt access token + secret
10. Store encrypted tokens in smugmug_tokens table
11. Clear temporary cookies
12. User session now has SmugMug access
```

### Session Management

**Session Storage**: PostgreSQL via NextAuth
**Cookie Settings**:
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 // 30 days
}
```

**Session Check Pattern**:
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Session includes: user.id, user.email, user.role
  const userId = session.user.id;
  const isAdmin = session.user.role === 'admin';
}
```

---

## Encryption System

### Token Encryption

**Algorithm**: AES-256-CBC
**Library**: Node.js built-in `crypto`
**Key Size**: 256 bits (32 bytes)
**IV Size**: 128 bits (16 bytes, randomized per encryption)

**Implementation** (`lib/encryption.ts`):
```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Why Encrypt SmugMug Tokens**:
1. Tokens provide full account access
2. Database breaches won't expose usable tokens
3. Compliance with security best practices
4. Defense in depth strategy

**Key Management**:
- ENCRYPTION_KEY stored in environment variables (never committed)
- Different key per environment (dev/staging/prod)
- Key rotation procedure documented (manual process)

---

## State Management

### Global State: Zustand

**Albums Store** (`stores/albumsStore.ts`):
```typescript
interface AlbumsStore {
  albums: Album[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchAlbums: () => Promise<void>;
  clearCache: () => void;
}
```

**Why Zustand**:
- Lightweight (< 1KB)
- No boilerplate
- Built-in devtools
- Server-side rendering compatible

**Cache Strategy**:
- Fetch albums once per session
- Store in Zustand + localStorage
- Invalidate on user action (create/delete album)
- Manual refresh available via UI button

### Local State: React Hooks

**Tool-specific state**:
- `useState` for component-local data
- `useEffect` for side effects
- `useCallback` for memoized functions
- `useMemo` for expensive computations

**localStorage patterns**:
- Favorites Selector: Client session data
- AI Gallery Creator: Template saves
- MetaData Monster: Pending updates

---

## Tool State Management System

### Purpose

Allow admins to control tool availability platform-wide without code deployment.

### Database Schema

```sql
tool_states (
  tool_id: "metadata-monster",
  tool_name: "MetaData Monster",
  status: "on" | "disabled" | "off",
  disabled_message: "Maintenance in progress..."
)
```

### Status Meanings

**`on` (Green)**:
- Tool fully functional
- Visible on homepage
- Users can access and use

**`disabled` (Yellow)**:
- Tool visible on homepage
- Grayed out/disabled appearance
- Hover shows `disabled_message`
- Users cannot click or access
- Useful for "Coming Soon" or maintenance

**`off` (Red)**:
- Tool completely hidden
- Not rendered on homepage
- Users cannot see or access
- Useful for deprecated/removed features

### Implementation

**Homepage Integration** (`app/page.tsx`):
```typescript
const toolStates = await fetch('/api/tools/states').then(r => r.json());

const isToolAvailable = (toolId: string) => {
  const state = toolStates.find(t => t.tool_id === toolId);
  return state?.status === 'on';
};

const getDisabledMessage = (toolId: string) => {
  const state = toolStates.find(t => t.tool_id === toolId);
  return state?.disabled_message;
};
```

**Admin Control** (`/admin/tools`):
- Three-button toggle (Green/Yellow/Red)
- Click to change state
- Instant update (no page refresh)
- Changes reflected immediately for all users

---

## AI Integration Architecture

### Provider: Anthropic Claude

**Model**: `claude-3-sonnet-20240229`
**API**: REST (streaming not used)
**Authentication**: API key in headers

### Coin System

**Coin Calculation**:
```typescript
// lib/coinCalculator.ts
export function calculateCoins(tokens: number): number {
  // Simple 1:1 ratio for now
  // Future: Dynamic pricing based on model cost
  return Math.ceil(tokens / 1000); // 1 coin per 1000 tokens
}
```

**Common Operations**:
- Metadata generation (1 photo) = 1 coin (~250 tokens)
- AI chat message = 1-5 coins (varies by length)
- Gallery structure creation = 2-10 coins (varies by complexity)

### Flow: Metadata Generation

```
1. User selects photos in MetaData Monster
2. Frontend calls /api/ai/generate-metadata
3. Backend checks user coin balance (DB query)
4. If insufficient: return 402 Payment Required
5. Create ai_operations record (status: pending)
6. Deduct coins from user balance
7. For each photo:
   a. Fetch image URL from SmugMug
   b. Call Anthropic API with image URL + prompt
   c. Parse AI response (JSON)
   d. Store metadata in response array
8. Update ai_operations record (status: completed, tokens_used)
9. Create coin_transaction record (type: usage)
10. Return metadata to frontend
11. User reviews and saves to SmugMug
```

### Rate Limiting

**Anthropic API**:
- 50 requests/minute (enforced by Anthropic)
- Token limits per request (varies by tier)

**Internal Limits**:
- No artificial rate limiting currently
- Coin balance is natural rate limit

---

## Security Architecture

### Threat Model

**Potential Threats**:
1. Unauthorized access to SmugMug accounts
2. Database breach exposing tokens
3. XSS attacks stealing session cookies
4. CSRF attacks performing unwanted actions
5. SQL injection in database queries
6. API key exposure in client code

### Mitigations

**1. Token Encryption**
- AES-256-CBC for SmugMug OAuth tokens
- Keys stored in environment variables
- Decryption only when needed for API calls

**2. Password Security**
- bcrypt hashing with 10 rounds
- No plaintext passwords ever stored
- Salting built into bcrypt

**3. Session Security**
- HTTP-only cookies (not accessible via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite=Lax (CSRF protection)
- 30-day expiration

**4. Input Validation**
- TypeScript for type checking
- Server-side validation on all inputs
- Parameterized SQL queries (no string interpolation)
- Content-Type checking

**5. API Key Protection**
- Environment variables only
- Never committed to git
- Vercel environment configuration
- Different keys per environment

**6. Admin Access Control**
```typescript
// Middleware pattern
const session = await getServerSession(authOptions);
if (session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## Performance Optimizations

### 1. Image Optimization

**Next.js Image Component**:
```typescript
<Image
  src={photo.ThumbnailUrl}
  width={300}
  height={200}
  alt={photo.Title}
  loading="lazy"
  placeholder="blur"
/>
```

### 2. Code Splitting

**Dynamic Imports**:
```typescript
const MetaDataMonster = dynamic(() => import('@/components/MetaDataMonster'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

### 3. Database Connection Pooling

**Neon Pooler**:
- Use `DATABASE_URL` (pooled) for API routes
- Use `DATABASE_URL_UNPOOLED` for migrations/maintenance
- Automatic connection management

### 4. API Route Caching

**Cache Headers** (where appropriate):
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
  }
});
```

### 5. Album Caching

**Zustand + localStorage**:
- Fetch albums once per session
- Store in both memory (Zustand) and localStorage
- Check timestamp before refetching
- Manual refresh button for user control

---

## Deployment Architecture

### Hosting: Vercel

**Why Vercel**:
- Optimized for Next.js
- Automatic deployments from Git
- Edge network (global CDN)
- Serverless functions (API routes)
- Environment variable management
- Preview deployments for PRs

### Build Process

```bash
1. Git push to main branch
2. Vercel detects changes
3. npm install (dependencies)
4. npm run build (Next.js build)
5. Deploy to edge network
6. Health checks
7. Traffic switched to new deployment
8. Old deployment kept as rollback option
```

### Environment Configuration

**Development**:
- `.env.development.local` (git-ignored)
- localhost:3000
- Test Stripe keys
- Test SmugMug API

**Production**:
- Vercel environment variables
- Custom domain (smugtools.com)
- Production Stripe keys
- Production SmugMug API
- HTTPS enforced

---

## Monitoring & Observability

### Current State

**Vercel Analytics**:
- Page view tracking
- Performance metrics
- Error rate monitoring

**Console Logging**:
- Development: verbose logging
- Production: errors only

### Future Enhancements

**Recommended Tools**:
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (APM)
- New Relic (performance)

---

## Scalability Considerations

### Current Capacity

**Bottlenecks**:
1. SmugMug API rate limit (5,000 req/day per key)
2. Anthropic API rate limit (50 req/min)
3. Database connections (Neon limits)

### Scaling Strategy

**Horizontal Scaling** (Vercel handles automatically):
- Serverless functions scale to demand
- Edge network distributes load globally
- No server management needed

**Database Scaling** (Neon handles):
- Auto-scaling compute
- Connection pooling
- Read replicas (future)

**Rate Limit Handling**:
- Queue system for SmugMug API calls (future)
- Multiple API keys rotation (future)
- Anthropic tier upgrade as needed

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.development.local
# Edit .env.development.local with your keys

# Run database migrations (Neon SQL Editor)
# Copy prisma/schema.sql and execute

# Start dev server
npm run dev
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-tool

# Make changes, commit frequently
git add .
git commit -m "Add new tool: Description"

# Push to GitHub
git push origin feature/new-tool

# Create Pull Request on GitHub
# Vercel creates preview deployment automatically
```

### Code Style

**Linting**: ESLint with Next.js config
**Formatting**: Prettier (automatic on save)
**TypeScript**: Strict mode enabled

---

## Disaster Recovery

### Backup Strategy

**Database** (Neon):
- Automatic daily backups
- Point-in-time recovery available
- Branch-based testing (copy production data)

**Code**:
- Git repository (GitHub)
- Vercel deployment history (30 days)

### Recovery Procedures

**Database Restore**:
1. Access Neon dashboard
2. Select restore point
3. Create new branch from backup
4. Verify data integrity
5. Swap connection strings
6. Redeploy application

**Application Rollback**:
1. Access Vercel dashboard
2. Select previous deployment
3. Click "Promote to Production"
4. Traffic instantly switched

---

## Future Architecture Considerations

### Short-term

1. Redis for session storage (faster than database)
2. Job queue for bulk operations (BullMQ)
3. WebSocket support for real-time updates
4. CDN for static assets (Cloudflare)

### Long-term

1. Microservices architecture (separate AI service)
2. Event-driven architecture (Kafka/RabbitMQ)
3. Multi-region deployment (global performance)
4. Kubernetes (if moving off Vercel)
5. GraphQL API (unified data layer)

---

## Architecture Decision Records (ADRs)

### ADR-001: Neon PostgreSQL over AWS RDS

**Decision**: Use Neon serverless PostgreSQL
**Rationale**:
- Serverless (no management overhead)
- Auto-scaling to demand
- Instant database branching for testing
- Better cold start times than RDS
- Lower cost for variable usage

### ADR-002: NextAuth over Custom Auth

**Decision**: Use NextAuth.js for authentication
**Rationale**:
- Battle-tested library
- Built-in OAuth provider support
- Database session management
- CSRF protection included
- Active community support

### ADR-003: Zustand over Redux

**Decision**: Use Zustand for global state
**Rationale**:
- Significantly simpler API
- Smaller bundle size (< 1KB)
- No boilerplate code needed
- TypeScript first-class support
- Sufficient for application needs

### ADR-004: Monorepo over Microservices

**Decision**: Single Next.js application
**Rationale**:
- Simpler deployment
- Faster development velocity
- Easier debugging
- Shared types across frontend/backend
- Sufficient for current scale
- Can split later if needed

---

**Last Updated**: 2025-10-08

**Maintained By**: Development Team

**Review Schedule**: Quarterly or after major changes
