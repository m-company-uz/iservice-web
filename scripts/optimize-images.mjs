#!/usr/bin/env node
/**
 * Turns the client's originals (`../reference_files/web/img`, up to 6048×8064 iPhone shots)
 * into the crops the site uses, in `public/images/`. Run once per new photo set; the outputs
 * are committed, the originals are not.
 *
 * - EXIF is stripped (the originals carry GPS), orientation is applied first.
 * - Masters are JPEG at ~2× their largest display size; next/image serves AVIF/WebP from them.
 * - `focusY` (0..1) is where the crop window is centred vertically.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, '../reference_files/web');
const out = join(root, 'public/images');

const jobs = [
  // Hero: master at the microscope bench. Art-directed: wide on desktop, tall on phones (DEV 1).
  { from: 'img/work/work5.DNG', to: 'hero-desktop.jpg', w: 1920, h: 1200, focusY: 0.47, q: 74 },
  { from: 'img/work/work5.DNG', to: 'hero-phone.jpg', w: 1080, h: 1350, focusY: 0.55, q: 72 },
  // Branch facades. GPS in loc1–3 and the work shots matches Aviasozlar 2-65; loc4 is the second branch.
  { from: 'img/loc/loc3.jpg', to: 'branch-aviasozlar-2-65.jpg', w: 1280, h: 720, focusY: 0.38, q: 72 },
  { from: 'img/loc/loc4.jpg', to: 'branch-aviasozlar-bozori.jpg', w: 1280, h: 720, focusY: 0.42, q: 72 },
  // "Our workshop" strip, one per folder the client sent.
  { from: 'img/repair_and_recovery_of_motherboard/6.jpg', to: 'work-motherboard.jpg', w: 960, h: 1200, focusY: 0.5, q: 72 },
  { from: 'img/notebook_cleaning_and_profilactics/2.jpg', to: 'work-notebook.jpg', w: 960, h: 1200, focusY: 0.5, q: 74 },
  { from: 'img/build_prepare/1.jpg', to: 'work-build.jpg', w: 960, h: 1200, focusY: 0.42, q: 72 },
];

async function crop({ from, to, w, h, focusY, q }) {
  const img = sharp(join(src, from), { failOn: 'none' }).rotate();
  const { data, info } = await img.toBuffer({ resolveWithObject: true });
  const ratio = w / h;
  let cw = info.width;
  let ch = Math.round(cw / ratio);
  if (ch > info.height) {
    ch = info.height;
    cw = Math.round(ch * ratio);
  }
  const top = Math.min(Math.max(0, Math.round(info.height * focusY - ch / 2)), info.height - ch);
  const left = Math.round((info.width - cw) / 2);
  await sharp(data)
    .extract({ left, top, width: cw, height: ch })
    .resize(w, h)
    .jpeg({ quality: q, mozjpeg: true, progressive: true })
    .toFile(join(out, to));
  console.log(`${to.padEnd(34)} ${w}×${h}  ← ${from}`);
}

async function og() {
  // Language-neutral social card: the hero shot, darkened, with the white logo.
  const base = await sharp(join(src, 'img/work/work5.DNG'), { failOn: 'none' })
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.55 })
    .toBuffer();
  const logo = await sharp(join(src, 'assets/logo-gears-white.png')).resize({ width: 520 }).toBuffer();
  await sharp(base)
    .composite([{ input: logo, left: 64, top: 64 }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(join(root, 'src/app/opengraph-image.jpg'));
  console.log('src/app/opengraph-image.jpg        1200×630');
}

async function logos() {
  await mkdir(join(out, 'brand'), { recursive: true });
  for (const f of ['logo-gears-white.png', 'logo-gears.png', 'logo-plain-white.png']) {
    await sharp(join(src, 'assets', f)).png({ compressionLevel: 9, palette: true }).toFile(join(out, 'brand', f));
  }
  await sharp(join(root, 'src/app/icon.svg')).resize(180, 180).png().toFile(join(root, 'src/app/apple-icon.png'));
  console.log('brand logos + apple-icon.png');
}

await mkdir(out, { recursive: true });
for (const j of jobs) await crop(j);
await og();
await logos();
