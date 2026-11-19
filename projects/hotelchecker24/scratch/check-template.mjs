async function checkPage() {
  try {
    // Check what page template is used for /hotelvergleiche/
    const res = await fetch('http://hotelchecker24.local/hotelvergleiche/');
    const html = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('URL:', res.url);
    
    // Look for hydration mount points
    const hydrateMatches = html.match(/data-forgewp-hydrate="[^"]*"/g);
    console.log('Hydrate mounts:', hydrateMatches || 'NONE FOUND');

    // Check if this is using the right template
    const templateHint = html.match(/class="page-template-([^"]+)"/);
    console.log('Template class:', templateHint ? templateHint[1] : 'not found');
    
    // Check body classes
    const bodyClass = html.match(/<body[^>]*class="([^"]*)"/);
    console.log('Body classes:', bodyClass ? bodyClass[1] : 'not found');
    
    // Check if page even exists with right slug
    const title = html.match(/<title>([^<]*)<\/title>/);
    console.log('Page title:', title ? title[1] : 'not found');

    // Check the forgewp-static section in the page
    const hasStaticContent = html.includes('forgewp-static') || html.includes('template-listicles-page');
    console.log('Uses forgewp-static:', hasStaticContent);

    // Check for the "empty" state vs actual hydration
    const hasEmptyState = html.includes('Keine Artikel gefunden');
    console.log('Has empty state HTML:', hasEmptyState);

  } catch(e) {
    console.error('Error:', e.message);
  }
}
checkPage();
