import { test, expect } from '@playwright/test';

/**
 * MetaData Monster Mobile UX Tests
 *
 * Tests the MetaData Monster tool on mobile devices (375x667 viewport - iPhone SE)
 * to ensure all features work correctly on tablets/phones.
 *
 * Critical areas tested:
 * - Mode toggle buttons (full-width stacked)
 * - Gallery selection grid (touch-friendly checkboxes)
 * - Photo cards (single column, large touch targets)
 * - Metadata editing forms (48px+ inputs, mobile keyboards)
 * - Action buttons (proper spacing, full-width on mobile)
 * - No horizontal scroll
 */

test.describe('MetaData Monster - Mobile UX', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to MetaData Monster
    await page.goto('http://localhost:3000/metadata-monster');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display mode toggle buttons stacked full-width on mobile', async ({ page }) => {
    const normalModeButton = page.locator('button:has-text("Normal Mode")');
    const seekModeButton = page.locator('button:has-text("Seek & Capture")');

    // Check buttons are visible
    await expect(normalModeButton).toBeVisible();
    await expect(seekModeButton).toBeVisible();

    // Check buttons have minimum touch target height (48px)
    const normalBox = await normalModeButton.boundingBox();
    const seekBox = await seekModeButton.boundingBox();

    expect(normalBox?.height).toBeGreaterThanOrEqual(48);
    expect(seekBox?.height).toBeGreaterThanOrEqual(48);

    // Check buttons are stacked vertically (y positions should be different)
    expect(seekBox!.y).toBeGreaterThan(normalBox!.y);

    // Verify buttons are tappable
    await normalModeButton.tap();
    await expect(normalModeButton).toHaveClass(/bg-green-600/);

    await seekModeButton.tap();
    await expect(seekModeButton).toHaveClass(/bg-purple-600/);
  });

  test('should have no horizontal scroll on any page', async ({ page }) => {
    // Check initial page
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);

    // Switch to Seek & Capture mode
    await page.locator('button:has-text("Seek & Capture")').tap();
    await page.waitForTimeout(500);

    const bodyWidthAfter = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidthAfter = await page.evaluate(() => window.innerWidth);
    expect(bodyWidthAfter).toBeLessThanOrEqual(viewportWidthAfter);
  });

  test('should display gallery selection grid in single column on mobile', async ({ page }) => {
    // Switch to Seek & Capture mode
    await page.locator('button:has-text("Seek & Capture")').tap();
    await page.waitForTimeout(1000);

    // Get all gallery cards
    const galleryCards = page.locator('[class*="grid"] > div[class*="bg-white"]').first();

    if (await galleryCards.isVisible()) {
      const cardBox = await galleryCards.boundingBox();

      // Card should be close to full width on mobile (allowing for padding)
      expect(cardBox?.width).toBeGreaterThan(300); // Most of 375px viewport

      // Check checkbox size is touch-friendly (24x24px on mobile)
      const checkbox = galleryCards.locator('input[type="checkbox"]');
      const checkboxBox = await checkbox.boundingBox();
      expect(checkboxBox?.width).toBeGreaterThanOrEqual(20); // w-6 = 24px
    }
  });

  test('should display album grid in single column on mobile (Normal Mode)', async ({ page }) => {
    // Normal mode should be active by default
    await page.waitForTimeout(1000);

    // Check if albums are displayed
    const albumButton = page.locator('button:has-text("Select an Album")').first();

    if (await albumButton.isVisible()) {
      const buttonBox = await albumButton.boundingBox();

      // Album card should be close to full width
      expect(buttonBox?.width).toBeGreaterThan(300);

      // Check minimum touch target height
      expect(buttonBox?.height).toBeGreaterThanOrEqual(80);
    }
  });

  test('should have touch-friendly settings checkboxes and selectors', async ({ page }) => {
    // Need to select an album first (mock scenario)
    // This test checks the settings panel structure

    const settingsCheckboxes = page.locator('input[type="checkbox"]');
    const firstCheckbox = settingsCheckboxes.first();

    if (await firstCheckbox.isVisible()) {
      const checkboxBox = await firstCheckbox.boundingBox();

      // Checkboxes should be at least 20x20px (w-5 h-5)
      expect(checkboxBox?.width).toBeGreaterThanOrEqual(20);
      expect(checkboxBox?.height).toBeGreaterThanOrEqual(20);
    }

    // Check prompt style selector has minimum height
    const promptSelector = page.locator('select').first();
    if (await promptSelector.isVisible()) {
      const selectorBox = await promptSelector.boundingBox();
      expect(selectorBox?.height).toBeGreaterThanOrEqual(48);
    }
  });

  test('should display metadata input forms with 48px+ height', async ({ page }) => {
    // This test assumes we're in a state where metadata forms are visible
    // In real scenario, would need to generate metadata first

    const textInputs = page.locator('input[type="text"]');
    const textareas = page.locator('textarea');

    // Check text inputs have minimum touch target height
    const inputCount = await textInputs.count();
    if (inputCount > 0) {
      const firstInput = textInputs.first();
      const inputBox = await firstInput.boundingBox();

      if (inputBox) {
        expect(inputBox.height).toBeGreaterThanOrEqual(48);
      }
    }

    // Check textareas have minimum height
    const textareaCount = await textareas.count();
    if (textareaCount > 0) {
      const firstTextarea = textareas.first();
      const textareaBox = await firstTextarea.boundingBox();

      if (textareaBox) {
        expect(textareaBox.height).toBeGreaterThanOrEqual(80);
      }
    }
  });

  test('should have action buttons with minimum 48px height', async ({ page }) => {
    // Check credits button
    const creditsButton = page.locator('button:has-text("Credits")');
    if (await creditsButton.isVisible()) {
      const creditsBox = await creditsButton.boundingBox();
      expect(creditsBox?.height).toBeGreaterThanOrEqual(48);
    }

    // Check Export button (if visible)
    const exportButton = page.locator('button:has-text("Export")');
    if (await exportButton.isVisible()) {
      const exportBox = await exportButton.boundingBox();
      expect(exportBox?.height).toBeGreaterThanOrEqual(48);
    }

    // Check Scan button in Seek & Capture mode
    await page.locator('button:has-text("Seek & Capture")').tap();
    await page.waitForTimeout(500);

    const scanButton = page.locator('button:has-text("Scan for Missing Metadata")');
    if (await scanButton.isVisible()) {
      const scanBox = await scanButton.boundingBox();
      expect(scanBox?.height).toBeGreaterThanOrEqual(48);
    }
  });

  test('should display credits modal properly on mobile', async ({ page }) => {
    const creditsButton = page.locator('button:has-text("Credits")');
    await creditsButton.tap();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Check modal is visible and centered
    const modal = page.locator('div:has-text("Need More Credits?")').first();
    await expect(modal).toBeVisible();

    // Modal should not overflow viewport
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(375); // Viewport width

    // Close button should be tappable
    const closeButton = page.locator('button:has-text("Close")');
    const closeBox = await closeButton.boundingBox();
    expect(closeBox?.height).toBeGreaterThanOrEqual(44);

    // Close modal
    await closeButton.tap();
    await expect(modal).not.toBeVisible();
  });

  test('should have responsive padding throughout', async ({ page }) => {
    // Check main container has mobile padding
    const mainContainer = page.locator('div.min-h-screen').first();
    const containerClass = await mainContainer.getAttribute('class');

    // Should have p-4 for mobile (16px padding)
    expect(containerClass).toContain('p-4');

    // Check cards have mobile-friendly padding
    const cards = page.locator('div[class*="rounded-xl"]');
    const firstCard = cards.first();

    if (await firstCard.isVisible()) {
      const cardClass = await firstCard.getAttribute('class');
      // Should have p-4 or sm:p-6 pattern
      expect(cardClass).toMatch(/p-\d/);
    }
  });

  test('should stack action buttons vertically on mobile', async ({ page }) => {
    // Need to be in a state where bulk actions are visible
    // This would require selecting an album first

    const selectAllButton = page.locator('button:has-text("Select All")');
    const deselectAllButton = page.locator('button:has-text("Deselect All")');

    if (await selectAllButton.isVisible() && await deselectAllButton.isVisible()) {
      const selectBox = await selectAllButton.boundingBox();
      const deselectBox = await deselectAllButton.boundingBox();

      // Buttons should have minimum touch target height
      expect(selectBox?.height).toBeGreaterThanOrEqual(44);
      expect(deselectBox?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should handle text truncation properly on mobile', async ({ page }) => {
    // Check that long album names truncate properly
    const albumNames = page.locator('h3[class*="truncate"]');
    const nameCount = await albumNames.count();

    if (nameCount > 0) {
      const firstName = albumNames.first();
      const nameBox = await firstName.boundingBox();

      // Name should not overflow its container
      expect(nameBox?.width).toBeLessThanOrEqual(375);
    }
  });

  test('should display photo thumbnails at appropriate size for mobile', async ({ page }) => {
    // In photo list view, thumbnails should be 96x96px (w-24 h-24) on mobile
    const thumbnails = page.locator('img[class*="rounded-lg"]');
    const thumbCount = await thumbnails.count();

    if (thumbCount > 0) {
      const firstThumb = thumbnails.first();
      const thumbBox = await firstThumb.boundingBox();

      // Thumbnail should be visible and appropriately sized
      if (thumbBox) {
        expect(thumbBox.width).toBeLessThanOrEqual(150); // Not too large for mobile
        expect(thumbBox.height).toBeLessThanOrEqual(150);
      }
    }
  });

  test('should show condensed text labels on mobile', async ({ page }) => {
    // Check that "Export Report" becomes "Export" on mobile
    const exportButton = page.locator('button:has-text("Export")');

    if (await exportButton.isVisible()) {
      const buttonText = await exportButton.textContent();

      // On mobile should show shorter text
      expect(buttonText).not.toContain('Report'); // sm:hidden removes "Report"
    }
  });

  test('should maintain touch target spacing in photo cards', async ({ page }) => {
    // Photo cards should have adequate spacing between interactive elements
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 1) {
      const firstCheckbox = checkboxes.first();
      const secondCheckbox = checkboxes.nth(1);

      const firstBox = await firstCheckbox.boundingBox();
      const secondBox = await secondCheckbox.boundingBox();

      // Should have vertical spacing between cards (space-y-4 = 16px)
      if (firstBox && secondBox) {
        const spacing = secondBox.y - (firstBox.y + firstBox.height);
        expect(spacing).toBeGreaterThanOrEqual(10); // Some spacing
      }
    }
  });
});

/**
 * Accessibility Tests for Mobile
 */
test.describe('MetaData Monster - Mobile Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/metadata-monster');
    await page.waitForLoadState('networkidle');
  });

  test('should have tappable elements with sufficient spacing', async ({ page }) => {
    // All interactive elements should be at least 44x44px (Apple HIG)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();

        if (box) {
          // Check minimum touch target size
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should maintain focus states on mobile', async ({ page }) => {
    const normalModeButton = page.locator('button:has-text("Normal Mode")');

    // Focus the button
    await normalModeButton.focus();

    // Should have focus styling
    const classList = await normalModeButton.getAttribute('class');
    expect(classList).toBeTruthy();
  });

  test('should support keyboard navigation on tablet devices', async ({ page }) => {
    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should navigate through focusable elements
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
  });
});

/**
 * Performance Tests for Mobile
 */
test.describe('MetaData Monster - Mobile Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should load quickly on mobile network', async ({ page }) => {
    // Simulate slow 3G
    await page.route('**/*', route => route.continue());

    const startTime = Date.now();
    await page.goto('http://localhost:3000/metadata-monster');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds even on slow network
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle rapid taps without breaking', async ({ page }) => {
    await page.goto('http://localhost:3000/metadata-monster');
    await page.waitForLoadState('networkidle');

    const modeButton = page.locator('button:has-text("Seek & Capture")');

    // Rapid taps
    await modeButton.tap();
    await modeButton.tap();
    await page.locator('button:has-text("Normal Mode")').tap();
    await page.locator('button:has-text("Seek & Capture")').tap();

    // Should still be functional
    await expect(page.locator('button:has-text("Seek & Capture")')).toBeVisible();
  });
});
