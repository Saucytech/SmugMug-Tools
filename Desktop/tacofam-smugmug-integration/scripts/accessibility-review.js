const { chromium } = require('playwright');

async function checkAccessibility() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const tools = [
    { name: 'Favorites Manager', url: 'http://localhost:3000/favorites-manager', theme: 'pink' },
    { name: 'MetaData Monster', url: 'http://localhost:3000/metadata-monster', theme: 'green' },
    { name: 'Multi-Album Selector', url: 'http://localhost:3000/multi-album-selector', theme: 'purple' },
    { name: 'AI Gallery Creator', url: 'http://localhost:3000/ai-gallery-creator', theme: 'teal' },
    { name: 'Photo Organizer', url: 'http://localhost:3000/photo-organizer', theme: 'orange' },
    { name: 'Guest Upload Manager', url: 'http://localhost:3000/guest-upload-manager', theme: 'blue' },
    { name: 'Embed & Sell (Main)', url: 'http://localhost:3000', theme: 'purple' }
  ];

  console.log('🎨 Accessibility & Design Review Report\n');
  console.log('========================================\n');

  for (const tool of tools) {
    console.log(`\n📱 ${tool.name} (${tool.theme} theme)\n`);
    console.log('----------------------------');

    try {
      await page.goto(tool.url, { waitUntil: 'networkidle' });

      // Wait for instructions banner to be visible
      await page.waitForTimeout(1000);

      // Get the instructions banner element - check for different color themes
      const selectors = [
        'div[class*="bg-pink-50"]',
        'div[class*="bg-green-50"]',
        'div[class*="bg-purple-50"]',
        'div[class*="bg-teal-50"]',
        'div[class*="bg-orange-50"]',
        'div[class*="bg-blue-50"]',
        'div[class*="bg-yellow-50"]'
      ];

      let banner = null;
      for (const selector of selectors) {
        banner = await page.$(selector);
        if (banner) break;
      }

      if (banner) {
        // Get computed styles
        const styles = await banner.evaluate(el => {
          const computed = window.getComputedStyle(el);
          const text = el.querySelector('p');
          const textComputed = text ? window.getComputedStyle(text) : null;

          return {
            background: computed.backgroundColor,
            borderColor: computed.borderColor,
            textColor: textComputed ? textComputed.color : 'N/A',
            fontSize: textComputed ? textComputed.fontSize : 'N/A',
            fontWeight: text?.querySelector('span')?.style?.fontWeight ||
                       (text?.querySelector('.font-semibold') ? '600' : '400'),
            padding: computed.padding
          };
        });

        console.log('Banner Styles:', styles);

        // Get the actual text content
        const textContent = await banner.evaluate(el => el.innerText);
        console.log('Text Content:', textContent.substring(0, 100) + '...');

        // Analyze color contrast
        const contrastAnalysis = await page.evaluate(() => {
          const banner = document.querySelector('[class*="border-b"][class*="p-4"]');
          if (!banner) return null;

          const bgColor = window.getComputedStyle(banner).backgroundColor;
          const textElement = banner.querySelector('p');
          const textColor = textElement ? window.getComputedStyle(textElement).color : null;

          // Function to convert rgb to hex
          function rgbToHex(rgb) {
            const match = rgb.match(/\d+/g);
            if (!match) return null;
            const [r, g, b] = match.map(Number);
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          }

          // Function to calculate relative luminance
          function getLuminance(r, g, b) {
            const [rs, gs, bs] = [r, g, b].map(c => {
              c = c / 255;
              return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
          }

          // Function to calculate contrast ratio
          function getContrastRatio(rgb1, rgb2) {
            const match1 = rgb1.match(/\d+/g);
            const match2 = rgb2.match(/\d+/g);
            if (!match1 || !match2) return null;

            const [r1, g1, b1] = match1.map(Number);
            const [r2, g2, b2] = match2.map(Number);

            const l1 = getLuminance(r1, g1, b1);
            const l2 = getLuminance(r2, g2, b2);

            const lighter = Math.max(l1, l2);
            const darker = Math.min(l1, l2);

            return (lighter + 0.05) / (darker + 0.05);
          }

          const contrastRatio = bgColor && textColor ? getContrastRatio(bgColor, textColor) : null;

          return {
            backgroundColor: bgColor,
            textColor: textColor,
            backgroundHex: bgColor ? rgbToHex(bgColor) : null,
            textHex: textColor ? rgbToHex(textColor) : null,
            contrastRatio: contrastRatio ? contrastRatio.toFixed(2) : null,
            wcagAANormal: contrastRatio >= 4.5 ? '✅ Pass' : '❌ Fail',
            wcagAAANormal: contrastRatio >= 7 ? '✅ Pass' : '❌ Fail',
            wcagAALarge: contrastRatio >= 3 ? '✅ Pass' : '❌ Fail'
          };
        });

        if (contrastAnalysis) {
          console.log('\n🔍 Color Contrast Analysis:');
          console.log(`Background: ${contrastAnalysis.backgroundHex} (${contrastAnalysis.backgroundColor})`);
          console.log(`Text: ${contrastAnalysis.textHex} (${contrastAnalysis.textColor})`);
          console.log(`Contrast Ratio: ${contrastAnalysis.contrastRatio}:1`);
          console.log(`WCAG AA (Normal Text): ${contrastAnalysis.wcagAANormal}`);
          console.log(`WCAG AAA (Normal Text): ${contrastAnalysis.wcagAAAormal}`);
          console.log(`WCAG AA (Large Text): ${contrastAnalysis.wcagAALarge}`);
        }

        // Take a screenshot for visual review
        await banner.screenshot({ path: `screenshots/${tool.name.replace(/\s+/g, '-').toLowerCase()}-banner.png` });
        console.log(`\n📸 Screenshot saved: ${tool.name.replace(/\s+/g, '-').toLowerCase()}-banner.png`);

      } else {
        console.log('⚠️  No instructions banner found!');
      }

    } catch (error) {
      console.log(`❌ Error accessing ${tool.name}:`, error.message);
    }
  }

  console.log('\n\n========================================');
  console.log('📊 ACCESSIBILITY SUMMARY\n');
  console.log('WCAG Requirements:');
  console.log('- Normal Text: Minimum 4.5:1 (AA), 7:1 (AAA)');
  console.log('- Large Text (18pt+): Minimum 3:1 (AA), 4.5:1 (AAA)');
  console.log('\nRecommendations:');
  console.log('1. Ensure all text meets WCAG AA standards (4.5:1 minimum)');
  console.log('2. Consider using darker text colors for better readability');
  console.log('3. Test with screen readers for full accessibility');
  console.log('========================================\n');

  await browser.close();
}

// Create screenshots directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

checkAccessibility().catch(console.error);