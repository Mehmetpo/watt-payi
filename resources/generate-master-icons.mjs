import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Bolt paths and gradient match the approved design in
// docs/superpowers/specs/2026-08-21-release-prep-design.md.
// Gradient stops are re-expressed at 0%/50%/100% (SVG stop-offset
// cannot exceed 100%, unlike the CSS token's 0%/55%/130%) — this
// preserves the same visual left-to-right color progression.
const BOLT_PATHS = `
    <path d="M10 30 L35 30 L20 55 L40 55 L15 90 L55 45 L35 45 L60 10 Z" fill="white" opacity="0.95"/>
    <path d="M50 30 L75 30 L60 55 L80 55 L55 90 L95 45 L75 45 L100 10 Z" fill="white" opacity="0.55" transform="translate(-8,0)"/>
`;

const GRADIENT_DEFS = `
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6D5EF0"/>
      <stop offset="50%" stop-color="#8F7FF5"/>
      <stop offset="100%" stop-color="#FF5D5D"/>
    </linearGradient>
  </defs>
`;

// Icon: bolt group scaled to occupy ~59% of the canvas width/height,
// centered — leaves a safe margin so Android's adaptive-icon circular/
// squircle mask doesn't clip the artwork.
const ICON_SVG = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${GRADIENT_DEFS}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(212,212) scale(6)">
    ${BOLT_PATHS}
  </g>
</svg>`;

// Splash: bolt scaled much smaller (~30% of width) and centered, since
// splash source gets cropped differently across phone aspect ratios.
const SPLASH_SVG = `<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  ${GRADIENT_DEFS}
  <rect width="2732" height="2732" fill="url(#bg)"/>
  <g transform="translate(956,956) scale(8.2)">
    ${BOLT_PATHS}
  </g>
</svg>`;

mkdirSync('resources', { recursive: true });

await sharp(Buffer.from(ICON_SVG)).png().toFile('resources/icon.png');
await sharp(Buffer.from(SPLASH_SVG)).png().toFile('resources/splash.png');

console.log('Wrote resources/icon.png and resources/splash.png');
