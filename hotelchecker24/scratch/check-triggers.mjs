async function checkHomepageTriggers() {
  try {
    const res = await fetch('http://hotelchecker24.local/');
    const h = await res.text();
    const m = h.match(/data-forgewp-hydrate="latest-listicles-grid"([^>]*)/);
    console.log('LatestListiclesGrid attrs:', m ? m[1] : 'NOT FOUND');
    const all = h.match(/data-forgewp-hydrate="[^"]*"[^>]*/g);
    console.log('\nAll hydrate islands:');
    all?.forEach(a => console.log(' ', a.substring(0, 120)));
  } catch(e) {
    console.error(e.message);
  }
}
checkHomepageTriggers();
