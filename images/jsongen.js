// generate-json.js
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  sourceFolder: "D:\\cse1",
  workerUrl: 'https://throbbing-limit-1136.sahil-pandit-65a.workers.dev',
  outputFile: 'C:\\Users\\sahil\\OneDrive\\Desktop\\Freshers\\images.json'
};

async function generateJSON() {
  console.log('🔄 Generating images.json...\n');
  
  // Get all image files
  const files = await fs.readdir(CONFIG.sourceFolder);
  const images = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  
  console.log(`Found ${images.length} images\n`);
  
  // Generate JSON structure
  const imageData = images.map(filename => {
    const webpName = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    
    return {
      name: filename,
      lqip: `${CONFIG.workerUrl}/lqip/${webpName}`,
      thumb: `${CONFIG.workerUrl}/thumbs/${webpName}`,
      display: `${CONFIG.workerUrl}/display/${webpName}`,
      download: `${CONFIG.workerUrl}/downloads/${webpName}`
    };
  });
  
  // Save to file
  await fs.writeFile(
    CONFIG.outputFile,
    JSON.stringify(imageData, null, 2)
  );
  
  console.log(`✅ Generated ${CONFIG.outputFile} with ${imageData.length} entries`);
  console.log('\nSample entry:');
  console.log(JSON.stringify(imageData[0], null, 2));
  
  // Statistics
  const jsonSize = (await fs.stat(CONFIG.outputFile)).size;
  console.log(`\n📄 JSON file size: ${(jsonSize / 1024).toFixed(2)} KB`);
  console.log(`\n🎉 Done! Use this JSON in your app.`);
}

generateJSON().catch(console.error);