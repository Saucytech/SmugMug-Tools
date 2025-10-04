# 🔧 Troubleshooting Checklist

## Before You Start

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] SmugMug account active
- [ ] API Key obtained from SmugMug

---

## Common Issues & Solutions

### Issue #1: "Module not found" Error

**Symptoms:**
```
Error: Cannot find module 'oauth-1.0a'
```

**Solution:**
```bash
cd ~/Desktop/tacofam-smugmug-integration
npm install
```

**Why:** Dependencies not installed yet.

---

### Issue #2: "Authentication failed"

**Symptoms:**
- Redirect to SmugMug fails
- "Invalid signature" error
- Can't complete OAuth

**Checklist:**
- [ ] API Key is correct in `.env.local`
- [ ] API Secret is correct in `.env.local`
- [ ] No extra spaces in `.env.local` values
- [ ] Callback URL matches: `http://localhost:3000/api/auth/smugmug/callback`
- [ ] API key is active (check SmugMug developer portal)

**Verify .env.local format:**
```env
SMUGMUG_API_KEY=abc123def456
SMUGMUG_API_SECRET=xyz789uvw012
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

❌ **Wrong:**
```env
SMUGMUG_API_KEY="abc123def456"  # No quotes!
SMUGMUG_API_KEY= abc123def456   # No spaces!
```

---

### Issue #3: "Not authenticated" when loading albums

**Symptoms:**
- OAuth completes successfully
- But can't load albums
- 401 Unauthorized error

**Solution:**
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Check for:
   - `smugmug_access_token`
   - `smugmug_access_token_secret`
4. If missing, re-authenticate

**To fix:**
- Clear localStorage
- Click "Logout"
- Reconnect

---

### Issue #4: Port 3000 already in use

**Symptoms:**
```
Error: Port 3000 is already in use
```

**Solution Option 1:** Stop other process
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 [PID]
```

**Solution Option 2:** Use different port
```bash
PORT=3001 npm run dev
# Then open http://localhost:3001
```

---

### Issue #5: Images not loading/displaying

**Symptoms:**
- Thumbnails show broken image icon
- Console shows 403 errors
- Photos return 404

**Checklist:**
- [ ] Album is not Private in SmugMug
- [ ] Album visibility is Unlisted or Public
- [ ] Images actually exist in album
- [ ] Network connection is working

**To verify:**
1. Open album in SmugMug.com
2. Check privacy settings
3. Ensure photos are visible

---

### Issue #6: OAuth callback URL mismatch

**Symptoms:**
```
Error: redirect_uri_mismatch
```

**Solution:**
1. Go to: https://api.smugmug.com/api/developer
2. Click "Manage Applications"
3. Edit your app
4. Set Callback URL to **exactly**:
   ```
   http://localhost:3000/api/auth/smugmug/callback
   ```
5. Save changes
6. Try authentication again

**Important:** URL must match EXACTLY (no trailing slash!)

---

### Issue #7: TypeScript errors

**Symptoms:**
```
Type error: Property 'AlbumKey' does not exist
```

**Solution:**
```bash
# Rebuild TypeScript
npm run build

# Or restart dev server
# Press Ctrl+C to stop
npm run dev
```

---

### Issue #8: Blank page after authentication

**Symptoms:**
- OAuth completes
- Redirected to homepage
- But page is blank

**Checklist:**
- [ ] Check browser console (F12 → Console)
- [ ] Look for JavaScript errors
- [ ] Verify tokens in URL parameters
- [ ] Check localStorage has tokens

**Debug steps:**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Check Network tab for failed requests

---

### Issue #9: Can't install dependencies

**Symptoms:**
```
npm ERR! code EACCES
npm ERR! permission denied
```

**Solution:**
```bash
# Don't use sudo! Instead:
npm install --legacy-peer-deps

# Or clear npm cache
npm cache clean --force
npm install
```

---

### Issue #10: .env.local not loading

**Symptoms:**
- Environment variables are undefined
- `process.env.SMUGMUG_API_KEY` is null

**Checklist:**
- [ ] File is named `.env.local` (not `.env`)
- [ ] File is in root directory
- [ ] No BOM (Byte Order Mark) in file
- [ ] Server restarted after creating file

**To fix:**
```bash
# Stop server (Ctrl+C)
# Verify file exists
ls -la .env.local

# Restart server
npm run dev
```

---

## Debug Mode

Enable detailed logging:

1. **Check API responses:**
```typescript
// In browser console
localStorage.setItem('debug', 'true')
```

2. **Check server logs:**
```bash
# Server terminal shows request details
# Look for OAuth signature issues
```

3. **Network tab:**
```
F12 → Network → Filter: XHR
- Watch API calls
- Check request headers
- Verify access tokens
```

---

## Still Stuck?

### Step-by-step debug process:

1. **Verify basics:**
   ```bash
   node --version    # Should be 18+
   npm --version     # Should be 9+
   pwd               # Should be in project folder
   ls .env.local     # File should exist
   ```

2. **Check environment:**
   ```bash
   cat .env.local    # Verify API credentials
   ```

3. **Clean install:**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

4. **Fresh start:**
   ```bash
   # Stop server (Ctrl+C)
   # Clear browser cache
   # Clear localStorage (F12 → Application)
   npm run dev
   ```

5. **Check logs:**
   - Terminal where npm is running
   - Browser console (F12)
   - Network tab (F12 → Network)

---

## Testing Checklist

✅ **Everything working:**
- [ ] `npm run dev` starts without errors
- [ ] Browser opens to http://localhost:3000
- [ ] Login button appears
- [ ] Clicking "Connect" redirects to SmugMug
- [ ] After authorizing, redirects back
- [ ] "Load Albums" fetches your albums
- [ ] Clicking album shows photos
- [ ] Selecting photos shows blue ring
- [ ] Export copies to clipboard
- [ ] Download creates JSON file

---

## Getting Help

If none of the above works:

1. **Check SmugMug API status:**
   - Visit: https://status.smugmug.com/

2. **Review API documentation:**
   - Visit: https://api.smugmug.com/api/v2/doc

3. **Check your API key:**
   - Visit: https://api.smugmug.com/api/developer
   - Verify key is active
   - Check rate limits

4. **Create minimal test:**
   ```bash
   # Test if OAuth works at all
   curl https://api.smugmug.com/api/v2!authuser
   ```

---

## Quick Reference

**Start app:** `npm run dev`
**Install deps:** `npm install`
**Build:** `npm run build`
**Clean:** `rm -rf node_modules .next`

**Config file:** `.env.local`
**Log location:** Terminal output
**Storage:** Browser localStorage

**SmugMug Developer Portal:**
https://api.smugmug.com/api/developer

**API Docs:**
https://api.smugmug.com/api/v2/doc

---

## Success Indicators

✅ You're good if you see:
- No red errors in console
- Albums load successfully
- Photos display with thumbnails
- Export creates valid JSON
- No 401/403 errors in Network tab

🎉 If everything above works - you're all set!
