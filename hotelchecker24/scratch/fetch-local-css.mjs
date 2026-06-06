async function run() {
  const url = 'http://hotelchecker24.local/wp-content/themes/hotelchecker24/assets/index-DULbTUXg.css?ver=1.0.0';
  console.log(`Fetching CSS from: ${url}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const css = await res.text();
    console.log(`Downloaded size: ${css.length} characters`);
    
    const index = css.indexOf('a[href=""]');
    console.log(`Contains a[href=""]: ${index !== -1}`);
    if (index !== -1) {
      console.log(`Context: ${css.substring(index, index + 150)}`);
    }
  } catch (e) {
    console.error('Fetch failed:', e.message);
  }
}

run();
