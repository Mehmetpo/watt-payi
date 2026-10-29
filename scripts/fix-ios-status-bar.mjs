// Replaces the placeholder status-bar glyphs (dots + block) baked into the
// framed App Store screenshots with real iOS signal / Wi-Fi / battery icons.
// App Review rejected the originals under guideline 2.3.10 (non-iOS status bar).
// Usage: node scripts/fix-ios-status-bar.mjs [--dry] ; edits store-assets/ios/** in place.
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'store-assets/ios';
const dry = process.argv.includes('--dry');

const isBlack = (d, i) => d[i] < 10 && d[i + 1] < 10 && d[i + 2] < 10;
const isDark = (d, i) => d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 100;

async function fix(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 3;

  // Dynamic Island = the pure-black blob in the upper half (bezel is lighter).
  const rowHasBlack = (y) => {
    for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.75); x++) if (isBlack(data, px(x, y))) return true;
    return false;
  };
  let minX = W, maxX = -1, minY = H, maxY = -1;
  let y = 0;
  while (y < Math.floor(H * 0.55) && !rowHasBlack(y)) y++;
  for (; y < Math.floor(H * 0.55) && rowHasBlack(y); y++) {
    if (y < minY) minY = y; maxY = y;
    for (let x = Math.floor(W * 0.2); x < Math.floor(W * 0.8); x++) {
      if (isBlack(data, px(x, y))) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
  }
  if (maxX < 0) throw new Error(`no island found in ${file}`);
  let k = (maxY - minY + 1) / 37; // px per iOS point
  const cy = Math.round((minY + maxY) / 2);

  // Old glyphs: dark columns right of the island. The cluster ends at the first
  // wide gap, which keeps the phone bezel / rounded corner out of the bbox.
  const x0 = maxX + 4;
  const y0 = cy - Math.round(20 * k);
  const y1 = cy + Math.round(12 * k);
  const maxGap = Math.round(28 * k);
  let gx0 = -1, gx1 = -1, lastDark = -1;
  for (let x = x0; x < W; x++) {
    let dark = false;
    for (let y = y0; y <= y1 && !dark; y++) dark = isDark(data, px(x, y)) && !isBlack(data, px(x, y));
    if (dark) { if (gx0 < 0) gx0 = x; lastDark = x; gx1 = x; }
    else if (gx0 >= 0 && x - lastDark > maxGap) break;
  }
  if (gx1 < 0) throw new Error(`no status glyphs found in ${file}`);
  let gy0 = H, gy1 = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = gx0; x <= gx1; x++) {
      if (isDark(data, px(x, y)) && !isBlack(data, px(x, y))) { if (y < gy0) gy0 = y; if (y > gy1) gy1 = y; break; }
    }
  }
  const gcy = Math.round((gy0 + gy1) / 2);
  const screenRight = gx1 + Math.round(14 * k);
  const y0b = y0;
  void y0b;

  const ink = [data[px(gx0 + 2, gcy)], data[px(gx0 + 2, gcy) + 1], data[px(gx0 + 2, gcy) + 2]];
  const inkCss = `rgb(${ink.join(',')})`;
  const pad = Math.round(14 * k);
  const fillX0 = gx0 - pad, fillX1 = Math.min(screenRight, gx1 + pad);

  // Wipe with per-row background sampled just right of the glyphs.
  const sampleX = Math.min(screenRight, fillX1 + 1);
  const rects = [];
  for (let y = Math.min(gy0, gcy - Math.round(8 * k)); y <= Math.max(gy1, gcy + Math.round(8 * k)); y++) {
    const c = data.subarray(px(sampleX, y), px(sampleX, y) + 3);
    rects.push(`<rect x="${fillX0}" y="${y}" width="${fillX1 - fillX0 + 1}" height="1.5" fill="rgb(${c[0]},${c[1]},${c[2]})"/>`);
  }

  // iOS glyphs, right-aligned to the old glyph edge. Units are points * k.
  const R = gx1;
  const kk = k;
  k = Math.min(kk, (R - maxX - 12) / 77); // never collide with the island
  const bw = 27 * k, bh = 13 * k, nub = 2 * k;
  const bx = R - bw - nub, by = gcy - bh / 2;
  const wx = bx - 7 * k - 17 * k, wy = gcy - 6 * k;
  const sx = wx - 7 * k - 18 * k, sy = gcy - 6 * k;
  const bars = [4, 6.5, 9, 12].map((h, i) => {
    const w = 3 * k, gap = 1.6 * k;
    return `<rect x="${sx + i * (w + gap)}" y="${sy + (12 - h) * k}" width="${w}" height="${h * k}" rx="${0.9 * k}" fill="${inkCss}"/>`;
  }).join('');
  const wcx = wx + 8.5 * k, wby = wy + 11.2 * k;
  const arc = (r) => {
    const a = (Math.PI / 4);
    const x1a = wcx - r * Math.sin(a), y1a = wby - r * Math.cos(a);
    const x2a = wcx + r * Math.sin(a), y2a = wby - r * Math.cos(a);
    return `<path d="M${x1a} ${y1a} A${r} ${r} 0 0 1 ${x2a} ${y2a}" stroke="${inkCss}" stroke-width="${2.2 * k}" stroke-linecap="round" fill="none"/>`;
  };
  const wifi = `${arc(10.5 * k)}${arc(6.7 * k)}<circle cx="${wcx}" cy="${wby - 1.2 * k}" r="${1.6 * k}" fill="${inkCss}"/>`;
  const battery = `
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${3.8 * k}" fill="none" stroke="${inkCss}" stroke-opacity="0.4" stroke-width="${1 * k}"/>
    <rect x="${bx + 2 * k}" y="${by + 2 * k}" width="${bw - 4 * k}" height="${bh - 4 * k}" rx="${2.2 * k}" fill="${inkCss}"/>
    <rect x="${bx + bw + 1 * k}" y="${gcy - 2.2 * k}" width="${1.6 * k}" height="${4.4 * k}" rx="${0.8 * k}" fill="${inkCss}" fill-opacity="0.45"/>`;

  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects.join('')}<rect x="${minX}" y="${minY}" width="${maxX - minX + 1}" height="${maxY - minY + 1}" rx="${(maxY - minY + 1) / 2}" fill="#000"/>${bars}${wifi}${battery}</svg>`);
  if (dry) { console.log(file, { k: k.toFixed(2), gcy, glyphs: [gx0, gx1], screenRight }); return; }
  const out = await sharp(file).composite([{ input: svg }]).png().toBuffer();
  writeFileSync(file, out);
  console.log('fixed', file);
}

for (const dir of readdirSync(ROOT)) {
  for (const f of readdirSync(join(ROOT, dir)).filter((n) => n.endsWith('.png'))) {
    await fix(join(ROOT, dir, f));
  }
}
