// Update the listicles page slug to hotelvergleiche in WordPress
// Requires authentication - using Basic Auth with Application Password
// This script uses the WP REST API to update the page slug

async function updatePageSlug() {
  try {
    // First, let's try a direct SQL update approach via WP CLI output
    // Check if we can authenticate with WP REST API using cookie or basic auth
    
    // Try updating via REST API with cookie auth (from logged-in session)
    // We'll use the nonce approach instead - check what auth is available
    
    // Check the current page state
    const res = await fetch('http://hotelchecker24.local/wp-json/wp/v2/pages/10', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const page = await res.json();
    console.log('Current page:', page.slug, '| Auth required:', res.status);
    
  } catch(e) {
    console.error('Error:', e.message);
  }
}
updatePageSlug();
