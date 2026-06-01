// Simulate what useWpQuery does in production on the /listicles/ page
// forgeWpHydration.siteSettings.options.home = "http://hotelchecker24.local"
// apiBase = new URL("http://hotelchecker24.local").pathname = "" (empty - root site)
// fetchUrl = "/wp-json/wp/v2/listicle?per_page=100&page=1&_embed=1"

async function simulateQuery() {
  // Test 1: The URL that useWpQuery would build
  const homeUrl = 'http://hotelchecker24.local';
  let apiBase = '';
  try {
    apiBase = new URL(homeUrl).pathname.replace(/\/$/, '');
  } catch(e) {}
  console.log('apiBase:', JSON.stringify(apiBase)); // Should be ""
  
  const fetchUrl = `${apiBase}/wp-json/wp/v2/listicle?per_page=100&page=1&_embed=1`;
  console.log('Fetch URL:', fetchUrl);
  
  try {
    const res = await fetch(`http://hotelchecker24.local${fetchUrl}`);
    const data = await res.json();
    console.log('Result count:', Array.isArray(data) ? data.length : 'NOT ARRAY');
    if (Array.isArray(data) && data.length > 0) {
      console.log('First post title:', data[0].title?.rendered);
      console.log('First post type:', data[0].type);
      console.log('First post status:', data[0].status);
    } else if (!Array.isArray(data)) {
      console.log('Error response:', JSON.stringify(data));
    }
  } catch(e) {
    console.error('Fetch error:', e.message);
  }

  // Test 2: What if the page is served at /listicles/ and scripts load BEFORE forgeWpHydration is set?
  // The hydration script is injected BEFORE the react runtime as 'before' script
  // So window.forgeWpHydration should be available when React runs
  
  // Test 3: Check with lang param
  const langFetchUrl = `http://hotelchecker24.local/wp-json/wp/v2/listicle?per_page=100&page=1&_embed=1&lang=de`;
  console.log('\nWith lang=de:');
  try {
    const res2 = await fetch(langFetchUrl);
    const data2 = await res2.json();
    console.log('Result count with lang=de:', Array.isArray(data2) ? data2.length : JSON.stringify(data2));
  } catch(e) {
    console.error('Fetch error:', e.message);
  }

  // Test 4: Without lang
  const noLangUrl = `http://hotelchecker24.local/wp-json/wp/v2/listicle?per_page=100&page=1&_embed=1`;
  console.log('\nWithout lang:');
  try {
    const res3 = await fetch(noLangUrl);
    const data3 = await res3.json();
    console.log('Result count without lang:', Array.isArray(data3) ? data3.length : JSON.stringify(data3));
  } catch(e) {
    console.error('Fetch error:', e.message);
  }
}
simulateQuery();
