async function run() {
  const url = 'http://hotelchecker24.local/hotel/forestis-dolomites/';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const html = await res.text();
    
    // Find stylesheet links
    const stylesheetRegex = /<link rel=['"]stylesheet['"].*?>/g;
    const links = html.match(stylesheetRegex) || [];
    console.log('\nStylesheets enqueued:');
    links.forEach(l => console.log(`  ${l}`));

    // Find footer markup
    const footerStart = html.indexOf('<footer');
    const footerEnd = html.indexOf('</footer>');
    if (footerStart !== -1 && footerEnd !== -1) {
      const footerHtml = html.substring(footerStart, footerEnd + 9);
      console.log('\nFooter HTML (snippet):');
      // Look for social media links
      const socialStart = footerHtml.indexOf('Social Media');
      if (socialStart !== -1) {
        console.log(footerHtml.substring(socialStart - 50, socialStart + 500));
      } else {
        console.log(footerHtml.substring(0, 1000));
      }
    } else {
      console.log('\nFooter not found in HTML');
    }
  } catch (e) {
    console.error('Fetch failed:', e.message);
  }
}

run();
