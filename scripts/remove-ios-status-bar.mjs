// Removes the clock and the signal / Wi-Fi / battery glyphs from the framed Turkish
// App Store screenshots, leaving the plain screen and the Dynamic Island.
// App Review rejected build 8 and build 9 under guideline 2.3.10 ("remove non-iOS
// status bar images"), and build 9 already had iOS-style glyphs painted on, so the
// images carry no status bar at all now.
// Usage: node scripts/remove-ios-status-bar.mjs [--dry] [--out=dir]
// Without --out it edits store-assets/ios/** in place (the originals stay in git).
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'store-assets/ios';
const dry = process.argv.includes('--dry');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const outRoot = outArg ? outArg.slice('--out='.length) : null;

const isBlack = (d, i) => d[i] < 10 && d[i + 1] < 10 && d[i + 2] < 10;
const INK_DELTA = 14; // per-channel distance from the row background that counts as glyph ink

async function clean(file, target) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (x, y) => (y * W + x) * 3;

  // Dynamic Island: the first pure-black blob in the middle of the image. The bezel is lighter.
  const rowHasBlack = (y) => {
    for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x++) if (isBlack(data, px(x, y))) return true;
    return false;
  };
  let y = 0;
  while (y < H * 0.6 && !rowHasBlack(y)) y++;
  const islandTop = y;
  let minX = W, maxX = -1;
  for (; y < H * 0.6 && rowHasBlack(y); y++) {
    for (let x = Math.floor(W * 0.25); x < Math.floor(W * 0.75); x++) {
      if (isBlack(data, px(x, y))) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
  }
  const islandBottom = y - 1;
  if (maxX < 0) throw new Error(`no island found in ${file}`);
  const k = (islandBottom - islandTop + 1) / 37; // px per iOS point

  // The glyphs sit beside the upper part of the island. A taller band would reach the
  // rounded screen corners and pull the bezel into the cluster.
  const y0 = islandTop - Math.round(3 * k);
  const y1 = islandTop + Math.round(26 * k);
  const bgX = minX - Math.round(4 * k); // always free: the gap between the clock and the island
  const bg = (row) => data.subarray(px(bgX, row), px(bgX, row) + 3);
  const inked = (x, row) => {
    const b = bg(row), i = px(x, row);
    return Math.abs(data[i] - b[0]) > INK_DELTA || Math.abs(data[i + 1] - b[1]) > INK_DELTA || Math.abs(data[i + 2] - b[2]) > INK_DELTA;
  };
  const columnInked = (x) => {
    for (let row = y0; row <= y1; row++) if (inked(x, row)) return true;
    return false;
  };

  // Walk outwards from the island. A cluster ends at the first wide gap, which keeps
  // the rounded screen corner and the bezel out of it.
  const maxGap = Math.round(14 * k);
  const cluster = (from, step) => {
    let start = -1, end = -1;
    for (let x = from; x > 0 && x < W; x += step) {
      if (columnInked(x)) { if (start < 0) start = x; end = x; } else if (start >= 0 && Math.abs(x - end) > maxGap) break;
    }
    if (start < 0) throw new Error(`no status glyphs found in ${file}`);
    if (Math.abs(end - start) > W * 0.16) throw new Error(`glyph cluster too wide in ${file}: ${start}-${end}`);
    return [Math.min(start, end), Math.max(start, end)];
  };
  const pad = Math.max(3, Math.round(3 * k));
  const boxes = [cluster(bgX, -1), cluster(maxX + Math.round(2 * k), 1)].map(([a, b]) => {
    let top = H, bottom = -1;
    for (let row = y0; row <= y1; row++) {
      for (let x = a; x <= b; x++) if (inked(x, row)) { if (row < top) top = row; if (row > bottom) bottom = row; break; }
    }
    return { x0: a - pad, x1: b + pad, y0: top - pad, y1: bottom + pad };
  });

  if (dry) { console.log(file, { W, H, k: +k.toFixed(2), island: [minX, maxX, islandTop, islandBottom], boxes }); return; }

  for (const box of boxes) {
    for (let row = box.y0; row <= box.y1; row++) {
      const b = [...bg(row)];
      for (let x = box.x0; x <= box.x1; x++) data.set(b, px(x, row));
    }
  }
  // Redraw the island as a clean pill: the iPad frames left a glyph fragment on its edge.
  const edge = Math.round(2 * k);
  for (let row = islandTop - edge; row <= islandBottom + 1; row++) {
    const b = [...bg(row)];
    for (let x = minX - edge; x <= maxX + edge; x++) data.set(b, px(x, row));
  }
  const iw = maxX - minX + 1, ih = islandBottom - islandTop + 1;
  const island = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${minX}" y="${islandTop}" width="${iw}" height="${ih}" rx="${ih / 2}" fill="#000"/></svg>`);
  await sharp(data, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: island }]).removeAlpha().png({ compressionLevel: 9 }).toFile(target);
  console.log('cleaned', target);
}

for (const dir of readdirSync(ROOT)) {
  const outDir = outRoot ? join(outRoot, dir) : join(ROOT, dir);
  if (outRoot) mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(join(ROOT, dir)).filter((n) => n.endsWith('.png'))) {
    await clean(join(ROOT, dir, f), join(outDir, f));
  }
}
