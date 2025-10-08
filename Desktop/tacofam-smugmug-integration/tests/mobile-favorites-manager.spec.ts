import { test, expect } from '@playwright/test';

test.describe('Favorites Manager Mobile UX', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test('should display favorites manager page without horizontal scroll', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Wait for page to load or redirect
    await page.waitForLoadState('networkidle');

    // If redirected to home (not authenticated), that's okay
    const url = page.url();
    if (url.includes('/favorites-manager')) {
      // Ensure no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    } else {
      // Redirected due to no auth - this is expected behavior
      expect(url).toContain('/');
    }
  });

  test('should display main heading and instructions correctly', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Check main heading
    const heading = page.getByRole('heading', { name: /Favorites Manager/i });
    await expect(heading).toBeVisible();

    // Verify heading doesn't overflow viewport
    const headingBox = await heading.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(headingBox!.width).toBeLessThan(375);

    // Check instructions banner
    await expect(page.getByText(/How to use:/i)).toBeVisible();
  });

  test('should have properly sized "New Session" button for touch', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Find the New Session button
    const newSessionButton = page.getByRole('button', { name: /New Session/i });
    await expect(newSessionButton).toBeVisible();

    // Verify touch target size (min 44x44px)
    const buttonBox = await newSessionButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox!.width).toBeGreaterThan(0);
  });

  test('should open create session modal on mobile', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Click New Session button
    const newSessionButton = page.getByRole('button', { name: /New Session/i });
    await newSessionButton.tap();

    // Wait for modal to appear
    await page.waitForSelector('text=Create Favorites Session', { timeout: 5000 });

    // Check modal is visible
    const modalHeading = page.getByRole('heading', { name: /Create Favorites Session/i });
    await expect(modalHeading).toBeVisible();

    // Verify mobile drag indicator is visible
    const dragIndicator = page.locator('div.w-12.h-1\\.5.bg-gray-300').first();
    await expect(dragIndicator).toBeVisible();

    // Check close button is visible on mobile
    const closeButton = page.getByRole('button', { name: /Close modal/i });
    await expect(closeButton).toBeVisible();
  });

  test('should have properly sized input fields in modal', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Check session name input
    const nameInput = page.locator('#session-name');
    await expect(nameInput).toBeVisible();

    const nameInputBox = await nameInput.boundingBox();
    expect(nameInputBox).not.toBeNull();
    expect(nameInputBox!.height).toBeGreaterThanOrEqual(48); // Min 48px height

    // Check description textarea
    const descriptionTextarea = page.locator('#session-description');
    await expect(descriptionTextarea).toBeVisible();

    const textareaBox = await descriptionTextarea.boundingBox();
    expect(textareaBox).not.toBeNull();
    expect(textareaBox!.height).toBeGreaterThanOrEqual(96); // Min 96px height
  });

  test('should display album selection in single column on mobile', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Scroll to album section
    await page.evaluate(() => {
      const albumSection = document.querySelector('label:has-text("Select Albums")');
      if (albumSection) {
        albumSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Wait for potential albums to load
    await page.waitForTimeout(1000);

    // Check album selection container
    const albumContainer = page.locator('div.grid.grid-cols-1').first();

    // If albums exist, verify their layout
    const albumButtons = page.locator('button[aria-pressed]');
    const count = await albumButtons.count();

    if (count > 0) {
      // Verify at least one album button has proper touch target
      const firstAlbum = albumButtons.first();
      const albumBox = await firstAlbum.boundingBox();
      expect(albumBox).not.toBeNull();
      expect(albumBox!.height).toBeGreaterThanOrEqual(80); // Min 80px height
    }
  });

  test('should have touch-friendly theme selection buttons', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Scroll to theme section
    await page.evaluate(() => {
      const themeSection = document.querySelector('label:has-text("Gallery Theme")');
      if (themeSection) {
        themeSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(500);

    // Check Purple theme button
    const purpleThemeButton = page.getByRole('button', { name: /Select Purple theme/i });
    await expect(purpleThemeButton).toBeVisible();

    const themeButtonBox = await purpleThemeButton.boundingBox();
    expect(themeButtonBox).not.toBeNull();
    expect(themeButtonBox!.height).toBeGreaterThanOrEqual(88); // Min 88px height
  });

  test('should handle theme selection via touch', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Scroll to theme section
    await page.evaluate(() => {
      const themeSection = document.querySelector('label:has-text("Gallery Theme")');
      if (themeSection) {
        themeSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Tap blue theme
    const blueThemeButton = page.getByRole('button', { name: /Select Blue theme/i });
    await blueThemeButton.tap();

    // Verify selection (check aria-pressed attribute)
    await expect(blueThemeButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should have properly sized checkbox for Buy Button option', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Scroll to buy button option
    await page.evaluate(() => {
      const buyButtonSection = document.querySelector('label:has-text("Enable \\"Buy\\" Button")');
      if (buyButtonSection) {
        buyButtonSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(500);

    // Check checkbox
    const checkbox = page.getByRole('checkbox', { name: /Enable buy button/i });
    await expect(checkbox).toBeVisible();

    const checkboxBox = await checkbox.boundingBox();
    expect(checkboxBox).not.toBeNull();
    expect(checkboxBox!.width).toBeGreaterThanOrEqual(24); // Min 24px (w-6)
    expect(checkboxBox!.height).toBeGreaterThanOrEqual(24);
  });

  test('should have touch-friendly logo upload area', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Scroll to logo section
    await page.evaluate(() => {
      const logoSection = document.querySelector('label:has-text("Branding Logo")');
      if (logoSection) {
        logoSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(500);

    // Check logo upload area
    const uploadArea = page.locator('div.border-2.border-dashed').first();
    await expect(uploadArea).toBeVisible();

    const uploadAreaBox = await uploadArea.boundingBox();
    expect(uploadAreaBox).not.toBeNull();
    expect(uploadAreaBox!.height).toBeGreaterThanOrEqual(160); // Min 160px height
  });

  test('should have properly sized modal footer buttons', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Scroll to bottom to see buttons
    await page.evaluate(() => {
      const footer = document.querySelector('div.bg-gray-50.border-t');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(500);

    // Check Cancel button
    const cancelButton = page.getByRole('button', { name: /Cancel/i });
    await expect(cancelButton).toBeVisible();

    const cancelBox = await cancelButton.boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(cancelBox!.height).toBeGreaterThanOrEqual(44); // Min 44px height

    // Check Create Session button
    const createButton = page.getByRole('button', { name: /Create Session/i });
    await expect(createButton).toBeVisible();

    const createBox = await createButton.boundingBox();
    expect(createBox).not.toBeNull();
    expect(createBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('should close modal when close button is tapped', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Tap close button
    const closeButton = page.getByRole('button', { name: /Close modal/i });
    await closeButton.tap();

    // Wait a moment for animation
    await page.waitForTimeout(300);

    // Modal should be closed
    const modalHeading = page.getByRole('heading', { name: /Create Favorites Session/i });
    await expect(modalHeading).not.toBeVisible();
  });

  test('should close modal when Cancel button is tapped', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Scroll to footer
    await page.evaluate(() => {
      const footer = document.querySelector('div.bg-gray-50.border-t');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Tap cancel button
    const cancelButton = page.getByRole('button', { name: /Cancel/i });
    await cancelButton.tap();

    // Wait a moment for animation
    await page.waitForTimeout(300);

    // Modal should be closed
    const modalHeading = page.getByRole('heading', { name: /Create Favorites Session/i });
    await expect(modalHeading).not.toBeVisible();
  });

  test('should handle text input via touch keyboard', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Type in session name
    const nameInput = page.locator('#session-name');
    await nameInput.tap();
    await nameInput.fill('Wedding Photo Selection');

    // Verify input value
    await expect(nameInput).toHaveValue('Wedding Photo Selection');

    // Type in description
    const descriptionTextarea = page.locator('#session-description');
    await descriptionTextarea.tap();
    await descriptionTextarea.fill('Please select your favorite wedding photos!');

    // Verify textarea value
    await expect(descriptionTextarea).toHaveValue('Please select your favorite wedding photos!');
  });

  test('should display empty state correctly on mobile', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // If no sessions exist, check empty state
    const emptyStateHeading = page.getByRole('heading', { name: /No Favorites Sessions Yet/i });

    if (await emptyStateHeading.isVisible()) {
      // Verify empty state message
      await expect(emptyStateHeading).toBeVisible();
      await expect(page.getByText(/Create a session to let customers select/i)).toBeVisible();

      // Check empty state button
      const createFirstButton = page.getByRole('button', { name: /Create Your First Session/i });
      await expect(createFirstButton).toBeVisible();

      const buttonBox = await createFirstButton.boundingBox();
      expect(buttonBox).not.toBeNull();
      expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('should handle modal scrolling properly', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Get modal content element
    const modalContent = page.locator('div.flex-1.overflow-y-auto').first();
    await expect(modalContent).toBeVisible();

    // Verify content can be scrolled
    const isScrollable = await modalContent.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    // On mobile, modal content should be scrollable
    expect(isScrollable).toBe(true);

    // Try scrolling to bottom
    await modalContent.evaluate((el) => {
      el.scrollTo(0, el.scrollHeight);
    });

    await page.waitForTimeout(300);

    // Scroll back to top
    await modalContent.evaluate((el) => {
      el.scrollTo(0, 0);
    });

    await page.waitForTimeout(300);

    // Modal should still be open
    const modalHeading = page.getByRole('heading', { name: /Create Favorites Session/i });
    await expect(modalHeading).toBeVisible();
  });

  test('should have proper spacing between interactive elements', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Get bounding boxes of form elements
    const nameInput = page.locator('#session-name');
    const descriptionTextarea = page.locator('#session-description');

    const nameBox = await nameInput.boundingBox();
    const descriptionBox = await descriptionTextarea.boundingBox();

    expect(nameBox).not.toBeNull();
    expect(descriptionBox).not.toBeNull();

    // Ensure vertical gap between elements (should have margin)
    const verticalGap = descriptionBox!.top - (nameBox!.top + nameBox!.height);
    expect(verticalGap).toBeGreaterThan(0);
  });

  test('should display session cards properly on mobile when sessions exist', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if any session cards exist
    const sessionCards = page.locator('div.bg-white.rounded-xl.shadow-lg');
    const count = await sessionCards.count();

    if (count > 0) {
      // Verify first session card
      const firstCard = sessionCards.first();
      await expect(firstCard).toBeVisible();

      // Check card doesn't overflow viewport
      const cardBox = await firstCard.boundingBox();
      expect(cardBox).not.toBeNull();
      expect(cardBox!.width).toBeLessThanOrEqual(375);

      // Check action buttons in card
      const copyLinkButton = firstCard.locator('button:has-text("Copy")').first();
      const viewResultsButton = firstCard.locator('button:has-text("View Results")').first();

      if (await copyLinkButton.isVisible()) {
        const copyButtonBox = await copyLinkButton.boundingBox();
        expect(copyButtonBox).not.toBeNull();
        expect(copyButtonBox!.height).toBeGreaterThanOrEqual(44);
      }

      if (await viewResultsButton.isVisible()) {
        const viewButtonBox = await viewResultsButton.boundingBox();
        expect(viewButtonBox).not.toBeNull();
        expect(viewButtonBox!.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should verify all text is readable on mobile (min font size)', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Check main heading font size
    const heading = page.getByRole('heading', { name: /Favorites Manager/i });
    const headingFontSize = await heading.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // Main heading should be at least 24px on mobile (text-2xl)
    expect(headingFontSize).toBeGreaterThanOrEqual(24);

    // Check description text
    const description = page.getByText(/Create sessions for customers to select/i);
    const descFontSize = await description.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    // Description should be at least 14px (text-sm)
    expect(descFontSize).toBeGreaterThanOrEqual(14);
  });

  test('should not have any elements causing horizontal overflow', async ({ page }) => {
    await page.goto('/favorites-manager');

    // Open modal to test it as well
    await page.getByRole('button', { name: /New Session/i }).tap();
    await page.waitForSelector('text=Create Favorites Session');

    // Check for any elements wider than viewport
    const hasOverflow = await page.evaluate(() => {
      const viewportWidth = window.innerWidth;
      const allElements = document.querySelectorAll('*');

      for (const el of Array.from(allElements)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > viewportWidth) {
          console.log('Overflowing element:', el.tagName, el.className);
          return true;
        }
      }
      return false;
    });

    expect(hasOverflow).toBe(false);
  });
});
