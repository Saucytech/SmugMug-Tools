// Color Contrast Analysis for SmugMug Toolbox Instructions Banners
// Based on WCAG 2.1 Guidelines

// Function to calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Function to calculate contrast ratio
function getContrastRatio(color1, color2) {
  const l1 = getLuminance(...color1);
  const l2 = getLuminance(...color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Function to check WCAG compliance
function checkWCAG(ratio) {
  return {
    ratio: ratio.toFixed(2),
    AANormal: ratio >= 4.5 ? '✅ PASS' : '❌ FAIL',
    AAANormal: ratio >= 7 ? '✅ PASS' : '❌ FAIL',
    AALarge: ratio >= 3 ? '✅ PASS' : '❌ FAIL'
  };
}

// Tailwind color values (approximate RGB values)
const colors = {
  // Backgrounds (50 shades)
  'pink-50': [254, 242, 242],
  'green-50': [240, 253, 244],
  'purple-50': [250, 245, 255],
  'teal-50': [240, 253, 250],
  'orange-50': [255, 247, 237],
  'blue-50': [239, 246, 255],
  'yellow-50': [254, 252, 232],

  // Text colors (600-800 shades)
  'pink-600': [219, 39, 119],
  'pink-700': [190, 24, 93],
  'pink-800': [157, 23, 77],

  'green-600': [22, 163, 74],
  'green-700': [21, 128, 61],
  'green-800': [22, 101, 52],

  'purple-600': [147, 51, 234],
  'purple-700': [126, 34, 206],
  'purple-800': [107, 33, 168],

  'teal-600': [13, 148, 136],
  'teal-700': [15, 118, 110],
  'teal-800': [17, 94, 89],

  'orange-600': [234, 88, 12],
  'orange-700': [194, 65, 12],
  'orange-800': [154, 52, 18],

  'blue-600': [37, 99, 235],
  'blue-700': [29, 78, 216],
  'blue-800': [30, 64, 175],

  'yellow-600': [202, 138, 4],
  'yellow-700': [161, 98, 7],
  'yellow-800': [133, 77, 14]
};

console.log('🎨 ACCESSIBILITY COLOR CONTRAST ANALYSIS');
console.log('==========================================\n');

const tools = [
  { name: 'Favorites Manager', bg: 'pink-50', text: 'pink-800', icon: 'pink-600' },
  { name: 'MetaData Monster', bg: 'green-50', text: 'green-800', icon: 'green-600' },
  { name: 'Multi-Album Selector', bg: 'purple-50', text: 'purple-800', icon: 'purple-600' },
  { name: 'AI Gallery Creator', bg: 'teal-50', text: 'teal-800', icon: 'teal-600' },
  { name: 'Photo Organizer', bg: 'orange-50', text: 'orange-800', icon: 'orange-600' },
  { name: 'Guest Upload Manager', bg: 'blue-50', text: 'blue-800', icon: 'blue-600' },
  { name: 'Embed & Sell', bg: 'purple-50', text: 'purple-800', icon: 'purple-600' }
];

console.log('Current Implementation Analysis:');
console.log('---------------------------------\n');

tools.forEach(tool => {
  console.log(`📱 ${tool.name}`);
  console.log(`   Background: ${tool.bg}`);
  console.log(`   Text: ${tool.text}`);
  console.log(`   Icon: ${tool.icon}`);

  const bgColor = colors[tool.bg];
  const textColor = colors[tool.text];
  const iconColor = colors[tool.icon];

  const textContrast = getContrastRatio(bgColor, textColor);
  const iconContrast = getContrastRatio(bgColor, iconColor);

  const textWCAG = checkWCAG(textContrast);
  const iconWCAG = checkWCAG(iconContrast);

  console.log(`   \n   Text Contrast: ${textWCAG.ratio}:1`);
  console.log(`   - WCAG AA (4.5:1): ${textWCAG.AANormal}`);
  console.log(`   - WCAG AAA (7:1): ${textWCAG.AAANormal}`);

  console.log(`   \n   Icon Contrast: ${iconWCAG.ratio}:1`);
  console.log(`   - WCAG AA (3:1 for graphics): ${iconWCAG.AALarge}`);

  console.log('\n');
});

console.log('\n==========================================');
console.log('📊 RECOMMENDATIONS');
console.log('==========================================\n');

console.log('✅ GOOD NEWS:');
console.log('- All current color combinations should meet WCAG AA standards');
console.log('- Text uses 800-level colors which provide strong contrast');
console.log('- Icons use 600-level colors which should meet graphic requirements\n');

console.log('⚠️  POTENTIAL IMPROVEMENTS:');
console.log('1. For WCAG AAA compliance (7:1 ratio), consider using 900-level text colors');
console.log('2. Some combinations might be borderline - actual rendering may vary');
console.log('3. Test with real users, including those with color vision deficiencies\n');

console.log('🎯 SUGGESTED ALTERNATIVES FOR AAA COMPLIANCE:');
console.log('If any fail WCAG AA, consider these adjustments:');

const alternatives = [
  { name: 'Pink theme', current: 'pink-800', suggested: 'pink-900 or gray-900' },
  { name: 'Green theme', current: 'green-800', suggested: 'green-900 or gray-900' },
  { name: 'Purple theme', current: 'purple-800', suggested: 'purple-900 or gray-900' },
  { name: 'Teal theme', current: 'teal-800', suggested: 'teal-900 or gray-900' },
  { name: 'Orange theme', current: 'orange-800', suggested: 'orange-900 or gray-900' },
  { name: 'Blue theme', current: 'blue-800', suggested: 'blue-900 or gray-900' }
];

alternatives.forEach(alt => {
  console.log(`- ${alt.name}: ${alt.current} → ${alt.suggested}`);
});

console.log('\n==========================================');
console.log('🔍 TESTING WITH REAL BROWSER');
console.log('==========================================');
console.log('Note: These are theoretical calculations based on Tailwind defaults.');
console.log('Actual contrast may vary due to:');
console.log('- Monitor calibration');
console.log('- Browser rendering');
console.log('- Operating system color profiles');
console.log('\nAlways test with real tools like:');
console.log('- Chrome DevTools Lighthouse');
console.log('- WebAIM Contrast Checker');
console.log('- axe DevTools');
console.log('==========================================\n');