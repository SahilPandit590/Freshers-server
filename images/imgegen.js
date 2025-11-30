// generate-all-versions.js → RESUME-SAFE + SKIP IF EXISTS (FINAL)
require('dotenv').config();
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const cliProgress = require('cli-progress');

const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: '{label} [{bar}] {percentage}% | {value}/{total} | {filename}'
}, cliProgress.Presets.shades_classic);

const CONFIG = {
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME || 'freshersimages'
  },
  sourceFolder: 'C://cse-II',
  workerUrl: process.env.WORKER_URL || 'https://throbbing-limit-1136.sahil-pandit-65a.workers.dev',
  versions: {
    lqip:     { width: 40,   height: 53,   quality: 20, blur: 10, folder: 'lqip' },
    thumb:    { width: 600,  height: 800,  quality: 78,           folder: 'thumbs' },
    display:  { width: 1920, height: 2560, quality: 85,           folder: 'display' },
    download: { width: 6240, height: 4160, quality: 90,           folder: 'downloads' }
  }
};

// Validate credentials
if (!CONFIG.r2.accountId || !CONFIG.r2.accessKeyId || !CONFIG.r2.secretAccessKey) {
  console.error('Missing R2 credentials in .env!');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${CONFIG.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.r2.accessKeyId,
    secretAccessKey: CONFIG.r2.secretAccessKey
  }
});

// Helper: upload only if object doesn't exist
async function uploadIfNotExists(bucket, key, body, contentType, bar) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    bar.increment({ filename: path.basename(key) + ' (exists)' });
    return false; // skipped
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
      }));
      bar.increment({ filename: path.basename(key) });
      return true; // uploaded
    }
    throw err; // real error
  }
}

async function processImage(filename, inputPath, bars) {
  const ext = /\.(jpe?g|png)$/i;
  const webpName = filename.replace(ext, '.webp');

  for (const [name, cfg] of Object.entries(CONFIG.versions)) {
    const bar = bars[name];
    try {
      let img = sharp(inputPath)
        .rotate() // respects EXIF
        .webp({ quality: cfg.quality, effort: 6 });

      if (cfg.width || cfg.height) {
        img = img.resize({
          width: cfg.width,
          height: cfg.height,
          fit: 'cover',
          position: 'center',
          withoutEnlargement: true
        });
      }

      if (cfg.blur) img = img.blur(cfg.blur);

      const buffer = await img.toBuffer();
      const key = `${cfg.folder}/${webpName}`;

      await uploadIfNotExists(
        CONFIG.r2.bucketName,
        key,
        buffer,
        'image/webp',
        bar
      );

    } catch (e) {
      console.error(`\nFailed ${cfg.folder}/${webpName}:`, e.message);
      bar.increment({ filename: webpName + ' (error)' });
    }
  }
}

(async () => {
  console.log('STARTING RESUME-SAFE UPLOAD — ALL 4 VERSIONS\n');

  const files = await fs.readdir(CONFIG.sourceFolder);
  const images = files.filter(f => /\.(jpe?g|png)$/i.test(f));

  if (images.length === 0) {
    console.log('No images found in folder!');
    return;
  }

  console.log(`Found ${images.length} images. Starting upload...\n`);

  // Create progress bars
  const bars = {};
  for (const v of Object.keys(CONFIG.versions)) {
    bars[v] = multibar.create(images.length, 0, { label: v.padEnd(10), filename: '' });
  }

  // Process all images
  for (const file of images) {
    await processImage(file, path.join(CONFIG.sourceFolder, file), bars);
  }

  multibar.stop();

  const sample = images[0].replace(/\.(jpe?g|png)$/i, '.webp');
  console.log('\nALL DONE! (Skipped already uploaded files)');
  console.log('Sample URLs:');
  console.log(`   LQIP:     ${CONFIG.workerUrl}/lqip/${sample}`);
  console.log(`   Thumb:    ${CONFIG.workerUrl}/thumbs/${sample}`);
  console.log(`   Display:  ${CONFIG.workerUrl}/display/${sample}`);
  console.log(`   Download: ${CONFIG.workerUrl}/downloads/${sample}`);

  console.log('\nNow run: node generate-json.js');
  console.log('Your gallery will be live in minutes!');
})();