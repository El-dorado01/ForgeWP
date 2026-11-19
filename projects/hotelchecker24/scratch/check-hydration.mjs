async function check() {
  try {
    const res = await fetch('http://hotelchecker24.local/hotelvergleiche/');
    const html = await res.text();
    
    // Check for forgeWpHydration
    const hydMatch = html.match(/window\.forgeWpHydration\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (hydMatch) {
      console.log('=== forgeWpHydration found ===');
      try {
        const data = JSON.parse(hydMatch[1]);
        console.log('siteSettings.options.home:', data?.siteSettings?.options?.home);
        console.log('Keys:', Object.keys(data));
      } catch(e) {
        console.log('RAW (first 600 chars):', hydMatch[1].substring(0, 600));
      }
    } else {
      console.log('forgeWpHydration NOT found in page HTML');
    }

    // Check for polylang locale
    const localeMatch = html.match(/forgeWpLocale\s*=\s*["']([^"']+)["']/);
    console.log('forgeWpLocale:', localeMatch ? localeMatch[1] : 'NOT FOUND');

    // Check for listicle-related scripts
    const scriptMatches = html.match(/src="[^"]*listicle[^"]*"/g);
    console.log('Listicle scripts:', scriptMatches || 'none');

    // Check which JS files are loaded
    const allScripts = html.match(/src="([^"]*\.js[^"]*)"/g);
    console.log('All scripts:', allScripts);

    // Check for Hydrate trigger
    const hydrateMatch = html.match(/data-forgewp-component="[^"]*"/g);
    console.log('Hydrate components:', hydrateMatch || 'none');
    
  } catch(e) {
    console.error('Error:', e.message);
  }
}
check();
