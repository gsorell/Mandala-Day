import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ASSETS = 'C:/Users/gsore/MandalaDay/assets';
const PHONE_SRC = 'C:/Users/gsore/Desktop/Mandala Day Assets/Images/Mandala Day Screenshots - App Store Ready';
const OUT = 'C:/Users/gsore/Desktop/Mandala Day Assets/Images/Play Store Ready';

const NAVY = { r: 0x0b, g: 0x08, b: 0x17 };
const NAVY_HEX = '#0b0817';
const GOLD_HEX = '#c9a24c';
const GOLD_DIM = '#b89340';

await fs.mkdir(OUT, { recursive: true });

// 1. App icon — 512×512, no alpha, navy-flattened
// Source is icon.png (clean mandala, no text) — NOT mandala-icon.png or mandala-logo.png
// which both contain the "MANDALA DAY" wordmark.
{
  const dst = path.join(OUT, 'app-icon-512.png');
  await sharp(path.join(ASSETS, 'icon.png'))
    .resize(512, 512, { fit: 'contain', background: NAVY })
    .flatten({ background: NAVY })
    .png({ compressionLevel: 9 })
    .toFile(dst);
  const m = await sharp(dst).metadata();
  console.log(`app-icon-512.png  ${m.width}x${m.height}  alpha=${m.hasAlpha}`);
}

// 2. Feature graphic — 1024×500 banner with mandala + text
{
  const dst = path.join(OUT, 'feature-graphic-1024x500.png');
  const mandala = await sharp(path.join(ASSETS, 'mandala-icon.png'))
    .resize(440, 440, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
    <style>
      .title { font: 700 84px 'Georgia', 'Times New Roman', serif; fill: ${GOLD_HEX}; letter-spacing: 2px; }
      .tag { font: 400 30px 'Georgia', 'Times New Roman', serif; fill: #e8e3d3; letter-spacing: 1px; }
      .rule { stroke: ${GOLD_DIM}; stroke-width: 1.5; }
    </style>
    <rect width="1024" height="500" fill="${NAVY_HEX}"/>
    <text x="60" y="220" class="title">Mandala Day</text>
    <line x1="60" y1="250" x2="220" y2="250" class="rule"/>
    <text x="60" y="310" class="tag">Six guided meditations a day</text>
    <text x="60" y="360" class="tag" style="font-size:24px;fill:#a39e8e">Calm. Precise. Unforced.</text>
  </svg>`;

  const composited = await sharp({ create: { width: 1024, height: 500, channels: 3, background: NAVY } })
    .composite([
      { input: Buffer.from(svg), top: 0, left: 0 },
      { input: mandala, top: 30, left: 540 },
    ])
    .png()
    .toBuffer();

  await sharp(composited)
    .flatten({ background: NAVY })
    .png({ compressionLevel: 9 })
    .toFile(dst);
  const m = await sharp(dst).metadata();
  console.log(`feature-graphic-1024x500.png  ${m.width}x${m.height}  alpha=${m.hasAlpha}`);
}

// Helper: pad screenshot to 9:16 (ratio 0.5625) by adding navy bars on the sides
async function padTo916(srcPath, dstPath) {
  const src = sharp(srcPath);
  const meta = await src.metadata();
  const { width, height } = meta;
  const targetRatio = 9 / 16;
  const currentRatio = width / height;

  let newW = width;
  let newH = height;
  if (currentRatio < targetRatio) {
    newW = Math.round(height * targetRatio);
  } else if (currentRatio > targetRatio) {
    newH = Math.round(width / targetRatio);
  }

  await src
    .flatten({ background: NAVY })
    .extend({
      top: Math.floor((newH - height) / 2),
      bottom: Math.ceil((newH - height) / 2),
      left: Math.floor((newW - width) / 2),
      right: Math.ceil((newW - width) / 2),
      background: NAVY,
    })
    .png({ compressionLevel: 9 })
    .toFile(dstPath);

  const outM = await sharp(dstPath).metadata();
  return { width: outM.width, height: outM.height };
}

// 3. Phone screenshots (use 4 best — first 4 non-iPad)
const phoneFiles = (await fs.readdir(PHONE_SRC))
  .filter((f) => /\.png$/i.test(f) && !/iPad/i.test(f))
  .sort();

// Prefer numbered ones first
const pickOrder = [
  'mandaladay.netlify.app_.png',
  'mandaladay.netlify.app_ (1).png',
  'mandaladay.netlify.app_ (2).png',
  'mandaladay.netlify.app_ (3).png',
  'mandaladay.netlify.app_ (4).png',
  'mandaladay.netlify.app_ (5).png',
];
const phoneOrdered = pickOrder.filter((f) => phoneFiles.includes(f));

for (let i = 0; i < Math.min(phoneOrdered.length, 6); i++) {
  const src = path.join(PHONE_SRC, phoneOrdered[i]);
  const dst = path.join(OUT, `phone-${String(i + 1).padStart(2, '0')}.png`);
  const { width, height } = await padTo916(src, dst);
  console.log(`phone-${String(i + 1).padStart(2, '0')}.png  ${width}x${height}  (padded from 1242x2688)`);
}

// 4. 7-inch tablet screenshots — reuse phone-sized screens (Play accepts as long as >=320px)
for (let i = 0; i < Math.min(phoneOrdered.length, 4); i++) {
  const src = path.join(PHONE_SRC, phoneOrdered[i]);
  const dst = path.join(OUT, `tablet-7in-${String(i + 1).padStart(2, '0')}.png`);
  const { width, height } = await padTo916(src, dst);
  console.log(`tablet-7in-${String(i + 1).padStart(2, '0')}.png  ${width}x${height}`);
}

// 5. 10-inch tablet screenshots — use iPad Pro screenshot
const iPadSrc = path.join(PHONE_SRC, 'mandaladay.netlify.app_(iPad Pro).png');
try {
  await fs.access(iPadSrc);
  const dst = path.join(OUT, 'tablet-10in-01.png');
  const { width, height } = await padTo916(iPadSrc, dst);
  console.log(`tablet-10in-01.png  ${width}x${height}  (from iPad Pro capture)`);

  // And also provide 3 more 10-inch using upscaled phone screenshots
  for (let i = 0; i < 3; i++) {
    const src = path.join(PHONE_SRC, phoneOrdered[i]);
    const dst = path.join(OUT, `tablet-10in-${String(i + 2).padStart(2, '0')}.png`);
    const { width, height } = await padTo916(src, dst);
    console.log(`tablet-10in-${String(i + 2).padStart(2, '0')}.png  ${width}x${height}`);
  }
} catch {
  console.log('No iPad Pro screenshot found, skipping 10-inch tablet assets');
}

console.log('\n✓ All assets written to:');
console.log('  ' + OUT);
