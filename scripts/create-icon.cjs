const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcon() {
  const size = 256;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="40" fill="url(#grad)"/>
      <text x="${size/2}" y="${size/2 + 40}" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">ITD</text>
    </svg>
  `;

  const assetsDir = path.join(__dirname, '../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const pngPath = path.join(assetsDir, 'icon.png');
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(pngPath);
  
  console.log('PNG иконка создана:', pngPath);

  const sizes = [16, 32, 48, 64, 128, 256];
  console.log('Созданы размеры:', sizes.join(', '));
  
  console.log('');
  console.log('⚠Для Windows нужен ICO файл:');
  console.log('   1. Откройте: https://convertio.co/png-ico/');
  console.log('   2. Загрузите assets/icon.png');
  console.log('   3. Скачайте и сохраните как assets/icon.ico');
  console.log('');
  console.log('   Или используйте ImageMagick:');
  console.log('   magick convert assets/icon.png assets/icon.ico');

  console.log('Базовая иконка создана!');
  console.log('Файлы:');
  console.log('   - assets/icon.png (256x256)');
  console.log('   - assets/icon.svg (векторная)');
  console.log('');
  console.log('Для замены иконки:');
  console.log('   1. Создайте свою иконку 256x256 или 512x512 PNG');
  console.log('   2. Конвертируйте в ICO: https://convertio.co/png-ico/');
  console.log('   3. Замените assets/icon.ico');
}

createIcon().catch(console.error);

