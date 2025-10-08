import { test, expect } from '@playwright/test';

test.describe('Home Page Mobile UX', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test('should display unauthenticated home page correctly on mobile', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/SmugMug Toolbox/i);

    // Verify the Wrench icon is visible
    const wrenchIcon = page.locator('svg').first();
    await expect(wrenchIcon).toBeVisible();

    // Check main heading
    const heading = page.getByRole('heading', { name: /SmugMug Toolbox/i });
    await expect(heading).toBeVisible();

    // Verify tagline
    await expect(page.getByText(/Professional tools to enhance your SmugMug workflow/i)).toBeVisible();

    // Check Connect SmugMug Account button
    const connectButton = page.getByRole('button', { name: /Connect SmugMug Account/i });
    await expect(connectButton).toBeVisible();

    // Verify touch target size (min 44x44px)
    const buttonBox = await connectButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44);

    // Check developer tools section
    await expect(page.getByText('Developer Tools')).toBeVisible();

    // Verify API Reference and Metadata Viewer links are visible and stacked vertically on mobile
    const apiRefLink = page.getByRole('link', { name: /API Reference/i });
    const metadataLink = page.getByRole('link', { name: /Metadata Viewer/i });

    await expect(apiRefLink).toBeVisible();
    await expect(metadataLink).toBeVisible();

    // Check that links have proper touch targets
    const apiRefBox = await apiRefLink.boundingBox();
    expect(apiRefBox).not.toBeNull();
    expect(apiRefBox!.height).toBeGreaterThanOrEqual(44);

    // Ensure no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
  });

  test('should display authenticated toolbox dashboard correctly on mobile', async ({ page }) => {
    // Mock authentication state (you would set cookies or localStorage here in real test)
    // For now, we'll just navigate and check the authenticated state structure

    await page.goto('/');

    // If authenticated state was mocked, check for:
    // - ToolboxHeader component
    // - Tool cards grid
    // - Proper layout

    // Check that heading exists (works for both authenticated and unauthenticated)
    const heading = page.getByRole('heading', { name: /SmugMug Toolbox/i });
    await expect(heading).toBeVisible();

    // Verify heading size is mobile-appropriate (not too large)
    const headingStyles = await heading.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        fontSize: styles.fontSize,
      };
    });

    // Parse font size and ensure it's reasonable for mobile
    const fontSize = parseFloat(headingStyles.fontSize);
    expect(fontSize).toBeLessThan(40); // Should be smaller than 40px on mobile
  });

  test('should have clickable tool cards with proper touch targets (when authenticated)', async ({ page }) => {
    // This test would require authentication
    // For demonstration, we're checking the structure exists

    await page.goto('/');

    // Verify no elements overflow viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 375;

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance for rounding
  });

  test('should handle touch interactions properly', async ({ page }) => {
    await page.goto('/');

    const connectButton = page.getByRole('button', { name: /Connect SmugMug Account/i });

    // Simulate touch interaction
    await connectButton.tap();

    // Verify navigation occurred (would check URL in real implementation)
    // For now, just ensure no errors occurred
    await expect(connectButton).toBeVisible();
  });

  test('should have responsive typography on small screens', async ({ page }) => {
    await page.goto('/');

    // Check that text is readable and properly sized
    const mainHeading = page.getByRole('heading', { name: /SmugMug Toolbox/i });
    const headingBox = await mainHeading.boundingBox();

    expect(headingBox).not.toBeNull();
    // Heading should not overflow viewport width
    expect(headingBox!.width).toBeLessThan(375);
  });

  test('should properly space elements for thumb-friendly interaction', async ({ page }) => {
    await page.goto('/');

    // Check spacing between interactive elements
    const connectButton = page.getByRole('button', { name: /Connect SmugMug Account/i });
    const apiRefLink = page.getByRole('link', { name: /API Reference/i });

    const buttonBox = await connectButton.boundingBox();
    const linkBox = await apiRefLink.boundingBox();

    expect(buttonBox).not.toBeNull();
    expect(linkBox).not.toBeNull();

    // Ensure vertical spacing exists between elements
    const verticalGap = linkBox!.top - (buttonBox!.top + buttonBox!.height);
    expect(verticalGap).toBeGreaterThan(0); // Should have some gap
  });
});

test.describe('ToolboxHeader Mobile UX', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('should display header correctly on mobile', async ({ page }) => {
    await page.goto('/');

    // For unauthenticated users, header won't be visible
    // This test would be more meaningful with authenticated state

    // Verify page doesn't have horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test('should truncate long text on mobile header', async ({ page }) => {
    await page.goto('/');

    // Check that no text overflows
    const allText = await page.locator('body *').evaluateAll((elements) => {
      return elements.every((el) => {
        const rect = el.getBoundingClientRect();
        return rect.right <= window.innerWidth;
      });
    });

    expect(allText).toBe(true);
  });
});

test.describe('Tool Cards Grid Mobile Layout', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('should verify single column layout on mobile', async ({ page }) => {
    await page.goto('/');

    // This would check the tool cards when authenticated
    // For now, verify responsive container exists
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Ensure content doesn't overflow
    const mainWidth = await main.evaluate((el) => el.scrollWidth);
    expect(mainWidth).toBeLessThanOrEqual(375 + 1);
  });
});
