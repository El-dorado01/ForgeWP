async function checkHydrationData() {
  try {
    const res = await fetch('http://hotelchecker24.local/listicles/');
    const html = await res.text();
    
    // Extract the forgeWpHydration script
    const hydMatch = html.match(/window\.forgeWpHydration\s*=\s*(\{[\s\S]+?\});\s*(?:window\.|\/\/)/);
    if (hydMatch) {
      try {
        const data = JSON.parse(hydMatch[1]);
        console.log('=== forgeWpHydration ===');
        console.log('themeUri:', data.themeUri);
        console.log('siteSettings.options.home:', data?.siteSettings?.options?.home);
        console.log('siteSettings.options.siteurl:', data?.siteSettings?.options?.siteurl);
        console.log('pageLinks:', JSON.stringify(data.pageLinks));
        console.log('manifest keys:', Object.keys(data.manifest || {}));
        console.log('listicles-workspace chunk:', data?.manifest?.['listicles-workspace']);
      } catch(e) {
        // Try a different approach
        const homeMatch = hydMatch[1].match(/"home"\s*:\s*"([^"]+)"/);
        console.log('home:', homeMatch ? homeMatch[1] : 'not found');
        const siteurlMatch = hydMatch[1].match(/"siteurl"\s*:\s*"([^"]+)"/);
        console.log('siteurl:', siteurlMatch ? siteurlMatch[1] : 'not found');
      }
    } else {
      // Try another pattern
      const scriptPattern = /<script[^>]*>([\s\S]*?window\.forgeWpHydration[\s\S]*?)<\/script>/;
      const match = html.match(scriptPattern);
      if (match) {
        console.log('Script content preview:', match[1].substring(0, 500));
      } else {
        console.log('forgeWpHydration not found via any pattern');
        // Check if there's a home setting
        const homeMatch = html.match(/"home":"([^"]+)"/);
        console.log('home found:', homeMatch ? homeMatch[1] : 'not found');
      }
    }
    
    // Also check forgeWpTranslations  
    const transMatch = html.match(/window\.forgeWpTranslations\s*=\s*(\{[\s\S]+?\});\s*(?:window\.|\/\/|if)/);
    if (transMatch) {
      try {
        const data = JSON.parse(transMatch[1]);
        console.log('\n=== forgeWpTranslations ===');
        console.log('full data:', JSON.stringify(data));
      } catch(e) {
        console.log('Failed parsing JSON:', e.message);
      }
    }
    
  } catch(e) {
    console.error('Error:', e.message);
  }
}
checkHydrationData();
