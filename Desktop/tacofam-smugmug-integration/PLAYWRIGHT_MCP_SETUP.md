# Playwright MCP Setup Guide

This guide will help you set up Playwright MCP for automated browser testing with Claude Code on Mac.

## What is Playwright MCP?

Playwright MCP allows Claude Code to:
- Automate browser interactions
- Take screenshots of web pages
- Test UI elements and workflows
- Validate responsive design
- Capture visual regressions

## Prerequisites

✅ **Already Completed:**
- Node.js v23.7.0 installed
- npm 10.9.2 installed
- Playwright packages installed in project

## Setup Steps

### Step 1: Install Playwright MCP Server Globally

Open Terminal and run:

```bash
npm install -g @modelcontextprotocol/server-playwright
```

### Step 2: Install Playwright Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers.

### Step 3: Configure MCP in Claude Code

You need to add Playwright MCP to your Claude Code configuration.

**Option A: Using Claude Code UI (Recommended)**

1. Open Claude Code
2. Type `/config` or open settings
3. Navigate to MCP Servers section
4. Add a new MCP server with these details:
   - **Name**: `playwright`
   - **Command**: `npx`
   - **Args**: `["@modelcontextprotocol/server-playwright"]`
   - **Enabled**: ✅

**Option B: Manual Configuration**

Edit your Claude Code config file:

**For Mac:**
```bash
nano ~/.claude/config.json
```

Add this to the `mcpServers` section:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"]
    }
  }
}
```

### Step 4: Restart Claude Code

Completely quit and restart Claude Code to load the new MCP server.

### Step 5: Verify Setup

In Claude Code, you should now be able to ask:
- "Take a screenshot of http://localhost:3000"
- "Navigate to the favorites manager and verify the text is visible"
- "Test the photo grid spacing on Multi-Album Selector"

---

## Project-Specific .mcprc (Optional)

For this specific project, create a `.mcprc` file to configure Playwright for Smugtools testing:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"],
      "env": {
        "HEADLESS": "true"
      }
    }
  }
}
```

---

## Test Scenarios for Smugtools

Once Playwright MCP is set up, you can test:

### 1. **Multi-Album Selector**
```
Take a screenshot of http://localhost:3000/multi-album-selector
Verify photo grid has 24px spacing between images
Test that live preview shows columns correctly
```

### 2. **Favorites Manager**
```
Navigate to http://localhost:3000/favorites-manager
Click "Create Favorites Session" button
Verify album names are dark text on white background
Type in Session Name field and verify text is visible
```

### 3. **MetaData Monster**
```
Open http://localhost:3000/metadata-monster
Select an album
Generate metadata for a photo
Verify AI-generated text appears correctly
```

### 4. **Responsive Design**
```
Test http://localhost:3000 on mobile viewport (375x667)
Verify navigation menu collapses correctly
Test touch interactions
```

---

## Troubleshooting

### "MCP server not found"
- Make sure `@modelcontextprotocol/server-playwright` is installed globally
- Restart Claude Code completely
- Check config.json syntax (valid JSON)

### "Browser launch failed"
- Run `npx playwright install` to download browsers
- Check if you have enough disk space
- On Mac, may need to allow browser in System Settings > Privacy & Security

### "Connection timeout"
- Increase timeout in Playwright config
- Check firewall settings
- Ensure localhost:3000 is accessible

---

## Advanced Configuration

### Custom Playwright Config

Create `playwright.config.ts` in your project:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### Test Script Example

Create `e2e/favorites-manager.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('Favorites Manager text visibility', async ({ page }) => {
  await page.goto('/favorites-manager');

  // Click Create Session button
  await page.click('text=Create Favorites Session');

  // Check session name input text color
  const input = page.locator('input[placeholder*="Session"]');
  await input.fill('Test Session');

  // Verify text is visible (not white on white)
  const color = await input.evaluate(el =>
    window.getComputedStyle(el).color
  );

  // Should be dark gray (#111827)
  expect(color).toBe('rgb(17, 24, 39)');
});
```

---

## Next Steps After Setup

1. ✅ Complete MCP configuration above
2. ✅ Restart Claude Code
3. ✅ Ask Claude to take screenshots
4. ✅ Run automated visual tests
5. ✅ Verify all UI fixes worked correctly

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [MCP Playwright Server](https://github.com/modelcontextprotocol/servers/tree/main/playwright)
- [Claude Code MCP Guide](https://docs.claude.com/claude-code/mcp)

---

**Status:** Ready for setup
**Last Updated:** 2025-10-05
**Created by:** Claude Code Session
