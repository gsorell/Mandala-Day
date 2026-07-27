import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const IN = 'C:/Users/gsore/Desktop/Mandala Day Assets/Images/Mandala Day Screenshots';
const OUT = 'C:/Users/gsore/Desktop/Mandala Day Assets/Images/Mandala Day Screenshots - App Store Ready';

const files = (await fs.readdir(IN)).filter(f => /\.png$/i.test(f));

for (const f of files) {
  const src = path.join(IN, f);
  const dst = path.join(OUT, f.replace(/\s*\(iPhone 14 Pro Max\)/i, '').replace(/\.png$/i, '.png'));
  const img = sharp(src);
  const meta = await img.metadata();
  await img
    .flatten({ background: { r: 0x0b, g: 0x08, b: 0x17 } })
    .png({ compressionLevel: 9 })
    .toFile(dst);
  console.log(`${f}  ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}  ->  ${path.basename(dst)}`);
}
