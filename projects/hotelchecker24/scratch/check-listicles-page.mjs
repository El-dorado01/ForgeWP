// Check the /listicles/ page - the actual WP page
async function checkListiclesPage() {
  try {
    const res = await fetch('http://hotelchecker24.local/listicles/');
    const html = await res.text();
    console.log('HTTP Status:', res.status, res.url);
    
    // Check for hydration mount points
    const hydrateMatches = html.match(/data-forgewp-hydrate="[^"]*"/g);
    console.log('Hydrate mounts:', hydrateMatches || 'NONE FOUND');

    // Check for forgeWpHydration
    const hasHydration = html.includes('forgeWpHydration');
    console.log('Has forgeWpHydration:', hasHydration);

    // Check for the listicles-workspace chunk
    const hasWorkspaceChunk = html.includes('listicles-workspace');
    console.log('Has listicles-workspace ref:', hasWorkspaceChunk);

    // Check for React scripts
    const scripts = html.match(/src="([^"]*\.js[^"]*)"/g);
    console.log('Scripts loaded:', scripts?.map(s => s.replace(/src="|"/g, '').split('/').pop()));
    
    // Check for the empty state HTML in the static output
    const hasEmptyState = html.includes('Keine Artikel gefunden');
    console.log('Has empty state in static HTML:', hasEmptyState);
    
    // Check for the listicles workspace container
    const hasWorkspaceContainer = html.includes('data-forgewp-hydrate="listicles-workspace"');
    console.log('Has listicles-workspace mount:', hasWorkspaceContainer);

    // Check what manifest is injected
    const manifestMatch = html.match(/"manifest":\s*(\{[^}]+\})/);
    if (manifestMatch) {
      console.log('Manifest:', manifestMatch[1].substring(0, 300));
    }
    
  } catch(e) {
    console.error('Error:', e.message);
  }
}
checkListiclesPage();
