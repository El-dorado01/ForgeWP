import fs from 'node:fs';

const filePath = 'C:\\Users\\hp\\Local Sites\\hotelchecker24\\app\\public\\wp-content\\themes\\hotelchecker24\\forgewp-static\\template-kontakt-page.html';
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all PHP blocks
  const regex = /<\?php[\s\S]*?\?>/g;
  let match;
  let count = 0;
  while ((match = regex.exec(content)) !== null) {
    const phpCode = match[0];
    if (phpCode.includes('if') || phpCode.includes('endif') || phpCode.includes('else')) {
      count++;
      const start = Math.max(0, match.index - 80);
      const end = Math.min(content.length, match.index + phpCode.length + 80);
      console.log(`[Block ${count}] Pos: ${match.index}`);
      console.log(`Context: ${content.substring(start, end).replace(/\n/g, ' ')}`);
      console.log('--------------------------------------------------');
    }
  }
} else {
  console.log('File does not exist');
}
