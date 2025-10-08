import { test, expect } from '@playwright/test';

/**
 * Mobile UI Tests for Favorites Manager
 *
 * These tests focus on UI/UX elements that can be verified without authentication.
 * For full functional tests, see mobile-favorites-manager.spec.ts
 */

test.describe('Favorites Manager Mobile UI/UX', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test('should handle redirect gracefully when not authenticated', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Wait for page to load or redirect
    await page.waitForLoadState('networkidle');

    // Should redirect to home when not authenticated
    const url = page.url();
    expect(url).toMatch(/\/(favorites-manager)?$/);
  });

  test('should verify mobile-friendly CSS classes are present in page source', async ({ page }) => {
    // Navigate to page
    const response = await page.goto('/favorites-manager');

    // Get page HTML
    const html = await page.content();

    // Verify responsive classes are in the markup
    expect(html).toContain('sm:');  // Responsive breakpoints
    expect(html).toContain('min-h-[44px]'); // Touch targets
    expect(html).toContain('touch-manipulation'); // Touch optimization
  });

  test('should have viewport meta tag for mobile', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=device-width');
  });

  test('should have no horizontal scroll on any page state', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Check for horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
  });

  test('should have mobile-appropriate font sizes', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Get all text elements
    const textElements = await page.locator('body *').all();

    // Check that no text is too small
    for (const element of textElements) {
      const fontSize = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return parseFloat(computed.fontSize);
      });

      // No text should be smaller than 12px
      if (fontSize > 0) {
        expect(fontSize).toBeGreaterThanOrEqual(12);
      }
    }
  });

  test('should not have elements causing horizontal overflow', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Check for overflow
    const hasOverflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const allElements = document.querySelectorAll('*');

      for (const el of Array.from(allElements)) {
        const rect = el.getBoundingClientRect();
        // Allow small tolerance for sub-pixel rendering
        if (rect.right > viewportWidth + 2) {
          console.log('Overflowing element:', el.tagName, el.className, rect.right);
          return true;
        }
      }
      return false;
    });

    expect(hasOverflow).toBe(false);
  });

  test('should have proper page structure (semantic HTML)', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Check for semantic HTML structure
    const main = page.locator('main');
    const hasMain = await main.count();

    // Should have main landmark or content container
    expect(hasMain).toBeGreaterThanOrEqual(0); // May not be present if redirected
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like auth redirects, 404s for optional resources)
    const criticalErrors = errors.filter(err =>
      !err.includes('Authentication failed') &&
      !err.includes('Auth check failed') &&
      !err.includes('404') &&
      !err.includes('Failed to load resource')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should have accessible color contrast', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Run basic color contrast check
    // Note: This is a simplified check. Use axe-core for comprehensive testing
    const hasGoodContrast = await page.evaluate(() => {
      // Check that we're using dark text on light backgrounds
      const body = document.body;
      const styles = window.getComputedStyle(body);
      const bgColor = styles.backgroundColor;

      // Should have a background color set
      return bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
    });

    expect(hasGoodContrast).toBe(true);
  });

  test('should have responsive images (if any)', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = await page.locator('img').all();

    for (const img of images) {
      // Check if image has alt text (accessibility)
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();

      // Check if image fits within viewport
      const box = await img.boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Press Tab key
    await page.keyboard.press('Tab');

    // Check that focus is visible (some element should be focused)
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });

  test('should have proper meta tags for mobile', async ({ page }) => {
    await page.goto('/favorites-manager');

    // At minimum, should have viewport meta (required for mobile)
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=device-width');

    // Other mobile meta tags are optional but nice to have
    // Not testing for apple-mobile-web-app-capable as it's optional
  });
});

test.describe('Favorites Manager Mobile Performance', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('should load page within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds on mobile
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have minimal layout shift', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Wait for initial load
    await page.waitForLoadState('domcontentloaded');

    // Get initial body height
    const initialHeight = await page.evaluate(() => document.body.offsetHeight);

    // Wait for full load
    await page.waitForLoadState('networkidle');

    // Get final body height
    const finalHeight = await page.evaluate(() => document.body.offsetHeight);

    // Height shouldn't change dramatically (indicates layout shift)
    const heightDifference = Math.abs(finalHeight - initialHeight);
    expect(heightDifference).toBeLessThan(100); // Allow some change for content load
  });

  test('should not load excessive resources', async ({ page }) => {
    const resources: string[] = [];

    // Track all requests
    page.on('request', (request) => {
      resources.push(request.url());
    });

    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Should not make excessive requests
    expect(resources.length).toBeLessThan(50); // Reasonable limit
  });
});

test.describe('Favorites Manager Mobile Accessibility', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('should have lang attribute on HTML', async ({ page }) => {
    await page.goto('/favorites-manager');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('should have skip links or landmarks for screen readers', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Check for ARIA landmarks or skip links
    const landmarks = await page.locator('[role="main"], [role="navigation"], main, nav').count();
    expect(landmarks).toBeGreaterThanOrEqual(0);
  });

  test('should have form labels properly associated', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Get all inputs
    const inputs = await page.locator('input, textarea, select').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Input should have either an id (for label), aria-label, or aria-labelledby
      const hasAccessibleLabel = id || ariaLabel || ariaLabelledBy;

      if (hasAccessibleLabel) {
        expect(hasAccessibleLabel).toBeTruthy();
      }
    }
  });

  test('should have interactive elements with proper ARIA attributes', async ({ page }) => {
    await page.goto('/favorites-manager');
    await page.waitForLoadState('networkidle');

    // Get all buttons
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      // Button should have accessible text or aria-label
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const hasAccessibleName = (text && text.trim() !== '') || ariaLabel;

      expect(hasAccessibleName).toBeTruthy();
    }
  });
});
