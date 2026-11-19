// Check the actual listicles page content in detail
import { readFileSync } from 'node:fs';

async function checkListiclesContent() {
  try {
    const res = await fetch('http://hotelchecker24.local/listicles/');
    const html = await res.text();
    
    // Extract inline scripts content
    const scriptPattern = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;
    let match;
    let scriptIndex = 0;
    while ((match = scriptPattern.exec(html)) !== null) {
      const content = match[1].trim();
      if (content.length > 10) {
        console.log(`\n=== Inline Script #${++scriptIndex} (${content.length} chars) ===`);
        console.log(content.substring(0, 300));
      }
    }

    // Find the listicles-workspace container HTML
    const workspaceMatch = html.match(/data-forgewp-hydrate="listicles-workspace"([^>]*)>([\s\S]{0,200})/);
    if (workspaceMatch) {
      console.log('\n=== Listicles Workspace mount attributes ===');
      console.log('Attrs:', workspaceMatch[1]);
      console.log('Content preview:', workspaceMatch[2].substring(0, 100));
    }
    
  } catch(e) {
    console.error('Error:', e.message);
  }
}
checkListiclesContent();
