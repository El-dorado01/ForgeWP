// Check what forgeWpLocale and forgeWpTranslations.currentLanguage are set to
async function checkLocale() {
  try {
    const res = await fetch('http://hotelchecker24.local/listicles/');
    const html = await res.text();
    
    // Extract the inline script content
    const inlineScripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    for (const script of inlineScripts) {
      if (script.includes('forgeWpHydration') || script.includes('forgeWpTranslations')) {
        const content = script.replace(/<script[^>]*>|<\/script>/g, '').trim();
        if (content.length < 5000) {
          console.log('=== Inline Script ===');
          console.log(content.substring(0, 1000));
          console.log('...');
        }
      }
    }
    
    // Look for currentLanguage
    const langMatch = html.match(/currentLanguage["']?\s*:\s*["']([^"']+)["']/);
    console.log('\ncurrentLanguage:', langMatch ? langMatch[1] : 'NOT FOUND');
    
    // Look for forgeWpLocale
    const localeMatch = html.match(/forgeWpLocale\s*=\s*["']([^"']+)["']/);
    console.log('forgeWpLocale:', localeMatch ? localeMatch[1] : 'NOT FOUND');
    
  } catch(e) {
    console.error('Error:', e.message);
  }
}
checkLocale();
