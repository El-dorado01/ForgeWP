async function main() {
  try {
    const res = await fetch('http://hotelchecker24.local/en/');
    if (!res.ok) {
      console.log(`Failed to fetch local EN page (Status: ${res.status}). Checking /en-us/ or other subpaths...`);
      return;
    }
    const html = await res.text();
    
    const match = html.match(/window\.forgeWpHydration\s*=\s*(\{[\s\S]+?\});/);
    if (match) {
      const data = JSON.parse(match[1]);
      console.log('Local EN Page Hydrated Menus:', data.menus);
    } else {
      console.log('No hydration data found on local EN page');
    }
    
    const navMatch = html.match(/<div class="hidden md:block">([\s\S]*?)<\/div>/);
    if (navMatch) {
      console.log('Local EN Page Server-Rendered Menu HTML:', navMatch[1].trim());
    }
    
    const langMatch = html.match(/currentLanguage["']?\s*:\s*["']([^"']+)["']/);
    console.log('Local EN Page Lang:', langMatch ? langMatch[1] : 'not found');
  } catch (e) {
    console.error('Error fetching local EN page:', e.message);
  }
}

main();
