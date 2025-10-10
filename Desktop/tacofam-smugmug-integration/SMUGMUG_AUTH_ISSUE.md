# SmugMug Authentication Connection Issue

## 🚨 Critical Bug Report

**Status**: Users can complete OAuth flow but SmugMug connection never registers as "connected"

**Impact**: All 8 production tools are blocked by "SmugMug Connection Required" banner even after successful authentication

---

## 📋 Problem Description

Users follow this flow:
1. ✅ Log in to Smugtools with NextAuth (email/password) - **WORKS**
2. ✅ Click "Connect to SmugMug" button - **WORKS**
3. ✅ Complete SmugMug OAuth authorization - **WORKS**
4. ✅ Redirect back to homepage with encrypted tokens saved to database - **WORKS**
5. ❌ Homepage still shows "SmugMug Connection Required" banner - **FAILS**
6. ❌ All 8 tools remain disabled/locked - **FAILS**

**Expected**: After OAuth callback, `isSmugMugConnected` state should be `true` and tools should unlock

**Actual**: `isSmugMugConnected` remains `false`, banner stays visible, tools stay locked

---

## 🏗️ Current Architecture

### Technology Stack

**Frontend**:
- Next.js 14.2.32 (App Router)
- React 18 with hooks (`useState`, `useEffect`, `useSession`)
- NextAuth.js client (`useSession` hook)
- TypeScript

**Backend**:
- Next.js API routes (server-side)
- NextAuth.js (JWT strategy, 30-day sessions)
- OAuth 1.0a (SmugMug integration)
- Neon PostgreSQL (serverless)
- AES-256-CBC encryption for tokens

**Authentication Flow**:
1. **User Auth**: NextAuth.js with database-backed users (`users` table)
2. **SmugMug OAuth**: OAuth 1.0a three-legged flow
3. **Token Storage**: Encrypted in `smugmug_tokens` table (one-to-one with `users`)
4. **Session Management**: JWT tokens in HTTP-only cookies

### Database Schema

```sql
-- User authentication (NextAuth)
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  role VARCHAR(20) DEFAULT 'user',
  coin_balance INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
)

-- SmugMug OAuth tokens (encrypted)
smugmug_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  access_token_encrypted TEXT NOT NULL,  -- AES-256-CBC encrypted
  token_secret_encrypted TEXT NOT NULL,  -- AES-256-CBC encrypted
  smugmug_nickname VARCHAR(255),
  smugmug_domain VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## 📁 Key Files

### OAuth Initiation
**File**: `app/api/auth/smugmug/route.ts`
- Request token from SmugMug
- Store `oauth_token_secret` in HTTP-only cookie (10 min expiration)
- Redirect to SmugMug authorization page
- Callback URL: `${NEXT_PUBLIC_APP_URL}/api/auth/smugmug/callback`

### OAuth Callback
**File**: `app/api/auth/smugmug/callback/route.ts` (lines 27-161)

**What it does**:
1. Checks NextAuth session exists (`getServerSession(authOptions)`)
2. Exchanges request token for access token
3. Fetches SmugMug user info (nickname, domain)
4. **Encrypts** tokens with AES-256-CBC
5. **Saves to database**: `db.saveSmugMugTokens(userId, encryptedAccessToken, encryptedTokenSecret, smugmugNickname, smugmugDomain)`
6. Clears temporary OAuth cookie
7. **Redirects to homepage**: `NextResponse.redirect(new URL('/', NEXT_PUBLIC_APP_URL))`

**Critical line** (line 132-138):
```typescript
await db.saveSmugMugTokens(
  userId,
  encryptedAccessToken,
  encryptedTokenSecret,
  smugmugNickname,
  smugmugDomain
);
```

### Homepage Connection Check
**File**: `app/page.tsx` (lines 24-71)

**State management** (lines 24-25):
```typescript
const [isSmugMugConnected, setIsSmugMugConnected] = useState(false);
const [checkingSmugMug, setCheckingSmugMug] = useState(true);
```

**Effect hook** (lines 37-57):
```typescript
useEffect(() => {
  // Check if user is logged in with NextAuth
  if (session) {
    setIsAuthenticated(true);
    checkSmugMugConnection(); // ← THIS FUNCTION RUNS
  } else {
    setIsAuthenticated(false);
    setIsSmugMugConnected(false);
    setCheckingSmugMug(false);
  }

  // ... admin role check ...
  loadToolStates();
}, [session]);
```

**Connection check function** (lines 59-71):
```typescript
const checkSmugMugConnection = async () => {
  try {
    const response = await fetch('/api/smugmug/user', {
      credentials: 'include', // Send cookies
    });
    setIsSmugMugConnected(response.ok); // ← TRUE if 200, FALSE if 401/500
  } catch (error) {
    console.error('Error checking SmugMug connection:', error);
    setIsSmugMugConnected(false);
  } finally {
    setCheckingSmugMug(false);
  }
};
```

**Banner display** (lines 430-457):
```typescript
{!checkingSmugMug && !isSmugMugConnected && (
  <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6">
    <h3 className="text-xl font-bold text-gray-900 mb-2">
      SmugMug Connection Required
    </h3>
    <p className="text-gray-700 mb-4">
      All tools require a SmugMug account connection to function.
    </p>
    <button onClick={() => window.location.href = '/api/auth/smugmug'}>
      Connect to SmugMug
    </button>
  </div>
)}
```

### SmugMug User Verification Endpoint
**File**: `app/api/smugmug/user/route.ts` (lines 22-90)

**What it does**:
1. Checks NextAuth session exists
2. **Fetches tokens from database**: `db.getSmugMugTokens(userId)` (line 36)
3. If no tokens found → returns `401` (**THIS CAUSES THE FAILURE**)
4. Decrypts tokens
5. Makes OAuth-signed request to `https://api.smugmug.com/api/v2!authuser`
6. Returns user data if successful → `200` response

**Critical check** (lines 38-43):
```typescript
if (!tokenData) {
  return NextResponse.json(
    { error: 'SmugMug account not connected. Please connect your SmugMug account.' },
    { status: 401 } // ← HOMEPAGE SEES THIS = isSmugMugConnected = FALSE
  );
}
```

### Database Helper
**File**: `lib/db.ts` (lines 58-89)

**Token retrieval** (lines 58-63):
```typescript
async getSmugMugTokens(userId: number) {
  const result = await sql`
    SELECT * FROM smugmug_tokens WHERE user_id = ${userId} LIMIT 1
  `;
  return result[0] || null; // Returns null if no tokens exist
}
```

**Token saving** (lines 65-89):
```typescript
async saveSmugMugTokens(
  userId: number,
  accessTokenEncrypted: string,
  tokenSecretEncrypted: string,
  smugmugNickname?: string,
  smugmugDomain?: string
) {
  await sql`
    INSERT INTO smugmug_tokens (
      user_id, access_token_encrypted, token_secret_encrypted,
      smugmug_nickname, smugmug_domain
    )
    VALUES (
      ${userId}, ${accessTokenEncrypted}, ${tokenSecretEncrypted},
      ${smugmugNickname || null}, ${smugmugDomain || null}
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      access_token_encrypted = ${accessTokenEncrypted},
      token_secret_encrypted = ${tokenSecretEncrypted},
      smugmug_nickname = ${smugmugNickname || null},
      smugmug_domain = ${smugmugDomain || null},
      updated_at = CURRENT_TIMESTAMP
  `;
}
```

---

## 🔍 Suspected Issues

### Theory 1: Race Condition
After OAuth callback redirects to `/`, the homepage `useEffect` runs `checkSmugMugConnection()` **BEFORE** the database write completes.

**Evidence**:
- Callback saves tokens (async database operation)
- Callback immediately redirects to `/` (doesn't wait)
- Homepage `useEffect` triggers on mount
- `fetch('/api/smugmug/user')` might query database before tokens are committed

**Fix**: Add delay or retry logic in `checkSmugMugConnection()`

### Theory 2: Session Cookie Not Updating
The callback saves tokens to database BUT the client-side NextAuth session doesn't refresh, so `session.user.id` is stale or missing when `checkSmugMugConnection()` runs.

**Evidence**:
- Callback uses `getServerSession(authOptions)` (server-side)
- Homepage uses `useSession()` (client-side)
- Client-side session might not reflect database changes immediately

**Fix**: Force session refresh after redirect: `await update()` from `useSession()`

### Theory 3: Database Connection Pooling
Neon PostgreSQL serverless might have connection pooling issues causing write/read inconsistency.

**Evidence**:
- Callback writes with `db.saveSmugMugTokens()`
- Homepage reads with `db.getSmugMugTokens()`
- Different Lambda function instances might hit different connection pools

**Fix**: Add retry logic with exponential backoff

### Theory 4: Encryption Key Mismatch
Callback encrypts with one key, verification decrypts with different key (unlikely but possible).

**Evidence**:
- Environment variable `ENCRYPTION_KEY` must be consistent
- If decryption fails, `encryption.decrypt()` might throw error

**Fix**: Add error logging in decryption step

### Theory 5: User ID Mismatch
The `userId` extracted from session in callback doesn't match the `userId` extracted in verification endpoint.

**Evidence**:
- Callback: `const userId = (session.user as any).id;` (line 130)
- Verification: `const userId = (session.user as any).id;` (line 35)
- If NextAuth session doesn't include `id` properly, this fails silently

**Fix**: Add logging to verify `userId` consistency

### Theory 6: Cache Issues
Frontend is caching the old "not connected" state even after database update.

**Evidence**:
- All API routes use `export const dynamic = 'force-dynamic';`
- But homepage might cache `fetch('/api/smugmug/user')` response

**Fix**: Add cache busting header or query parameter

---

## 🎯 What We Need Codex to Do

### 1. **Identify the Root Cause**
Review the authentication flow and pinpoint why `db.getSmugMugTokens(userId)` returns `null` even after successful OAuth callback.

### 2. **Ensure Correct Architecture**
We **MUST** maintain database-backed authentication for these reasons:

**Business Requirements (NON-NEGOTIABLE)**:
- ✅ **Coin-based billing system**: Track AI usage per user for charging
- ✅ **User management**: Admin dashboard needs user identification
- ✅ **Access revocation**: Centrally disable abusive/expired accounts
- ✅ **Audit trail**: Compliance and debugging require operation logs
- ✅ **Scalability**: Support teams, permissions, sub-accounts in future

**DO NOT**:
- ❌ Switch to cookie-only authentication (breaks billing)
- ❌ Remove database token storage (breaks user management)
- ❌ Use localStorage for tokens (security risk + no server access)

**DO**:
- ✅ Keep database-backed NextAuth + encrypted SmugMug tokens
- ✅ Maintain current architecture (`users` + `smugmug_tokens` tables)
- ✅ Fix the connection detection logic without architectural changes

### 3. **Implement Robust Connection Check**
The `checkSmugMugConnection()` function should:
- Handle race conditions (database write latency)
- Retry failed checks with exponential backoff
- Log errors clearly for debugging
- Update state reliably after successful OAuth

### 4. **Test Edge Cases**
- Fresh user (first OAuth connection)
- Existing user (reconnecting SmugMug)
- Expired tokens (should prompt re-auth)
- Database connection failures
- Network errors

### 5. **Maintain Security Best Practices**
- HTTP-only cookies for sessions
- Encrypted tokens at rest (AES-256-CBC)
- No sensitive data in client-side localStorage
- CSRF protection (NextAuth handles this)

---

## 📊 Success Criteria

**User Flow Should Work Like This**:
1. User logs in → NextAuth session created
2. User clicks "Connect to SmugMug" → OAuth flow starts
3. User authorizes on SmugMug → Redirect to callback
4. Callback saves encrypted tokens to database
5. Homepage loads → `checkSmugMugConnection()` runs
6. Verification endpoint finds tokens → Returns `200 OK`
7. **Homepage hides banner, unlocks all 8 tools** ✅

**What Success Looks Like**:
- `isSmugMugConnected === true` after OAuth completion
- "SmugMug Connection Required" banner disappears
- All tool cards become clickable (not grayed out)
- Console logs show successful token retrieval
- Works consistently on repeat tests

---

## 🛠️ Debugging Suggestions

### Add Logging to Callback
In `app/api/auth/smugmug/callback/route.ts` (after line 138):
```typescript
await db.saveSmugMugTokens(...);

// ADD THIS:
console.log('✅ Saved SmugMug tokens for user:', userId);
const verification = await db.getSmugMugTokens(userId);
console.log('🔍 Verification read:', verification ? '✅ Found' : '❌ Not found');
```

### Add Logging to Verification Endpoint
In `app/api/smugmug/user/route.ts` (after line 36):
```typescript
const tokenData = await db.getSmugMugTokens(userId);

// ADD THIS:
console.log('🔍 User verification:', {
  userId,
  hasTokens: !!tokenData,
  tokenColumns: tokenData ? Object.keys(tokenData) : [],
});
```

### Add Logging to Homepage
In `app/page.tsx` (in `checkSmugMugConnection` function):
```typescript
const checkSmugMugConnection = async () => {
  try {
    console.log('🔍 Checking SmugMug connection...');
    const response = await fetch('/api/smugmug/user', {
      credentials: 'include',
    });
    console.log('📡 SmugMug check response:', {
      status: response.status,
      ok: response.ok,
    });
    setIsSmugMugConnected(response.ok);
  } catch (error) {
    console.error('❌ SmugMug connection check failed:', error);
    setIsSmugMugConnected(false);
  } finally {
    setCheckingSmugMug(false);
  }
};
```

### Check Database Directly
Run this SQL query in Neon console after OAuth completion:
```sql
SELECT
  u.id,
  u.email,
  st.user_id,
  st.created_at as tokens_created,
  st.updated_at as tokens_updated,
  LENGTH(st.access_token_encrypted) as token_length
FROM users u
LEFT JOIN smugmug_tokens st ON u.id = st.user_id
ORDER BY u.created_at DESC
LIMIT 10;
```

**Expected**: After OAuth, user should have matching `smugmug_tokens` row

---

## 💡 Recommended Fix Priority

1. **Add retry logic** to `checkSmugMugConnection()` (handles race conditions)
2. **Add session refresh** after OAuth redirect (ensures NextAuth state is current)
3. **Add comprehensive logging** (helps identify which theory is correct)
4. **Test database write/read timing** (measure latency between save and verify)
5. **Consider optimistic UI update** (assume success after redirect, verify in background)

---

## 📝 Notes for Codex

**What's Working**:
- ✅ NextAuth login/logout
- ✅ SmugMug OAuth three-legged flow
- ✅ Token encryption/decryption (no reported errors)
- ✅ Database schema and queries (tested manually)
- ✅ All 8 tools work IF `isSmugMugConnected === true` (can test as admin)

**What's Broken**:
- ❌ Connection state detection after OAuth callback
- ❌ User experience (tools stay locked after successful auth)

**Tech Debt**:
- Homepage `useEffect` dependency array only includes `[session]` - might need `[session?.user?.id]` for more granular tracking
- No retry logic for transient database failures
- No optimistic UI updates

**Security Notes**:
- ⚠️ Never log decrypted tokens
- ⚠️ Don't expose database errors to client
- ⚠️ Maintain HTTP-only cookie security
- ⚠️ Keep encryption key secret (never commit to repo)

---

## 🚀 Getting Started

1. **Clone repo**: `git clone https://github.com/Saucytech/SmugMug-Tools.git`
2. **Install deps**: `npm install`
3. **Set up env**: Copy `.env.example` to `.env.local` (get credentials from Kaydin)
4. **Run dev**: `npm run dev`
5. **Test flow**:
   - Create test user at `/auth/signup`
   - Log in at `/auth/signin`
   - Click "Connect to SmugMug" on homepage
   - Complete OAuth
   - **BUG**: Banner still shows after redirect

---

## ✅ Definition of Done

- [ ] User completes OAuth → Banner disappears immediately
- [ ] Tools unlock after SmugMug connection
- [ ] Works on first connection (new user)
- [ ] Works on reconnection (existing user)
- [ ] No console errors
- [ ] Database architecture unchanged (NextAuth + encrypted tokens)
- [ ] PR includes logging for future debugging
- [ ] PR includes retry logic for race conditions
- [ ] Tested with multiple accounts
- [ ] Verified in production environment

---

**Last Updated**: 2025-10-10
**Reporter**: Kaydin (Saucytech)
**Assigned To**: Codex AI
**Priority**: 🔥 **CRITICAL** - Blocks all 8 production tools
