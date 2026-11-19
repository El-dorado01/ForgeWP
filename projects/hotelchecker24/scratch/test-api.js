async function test() {
  try {
    const resCats = await fetch('http://hotelchecker24.local/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,description,count,meta');
    const dataCats = await resCats.json();
    console.log('Categories:', dataCats.map ? dataCats.map(c => ({ id: c.id, name: c.name, slug: c.slug })) : dataCats);

    const resNoLang = await fetch('http://hotelchecker24.local/wp-json/wp/v2/listicle');
    const dataNoLang = await resNoLang.json();
    console.log('No Lang Listicles:', dataNoLang.map ? dataNoLang.map(p => p.title?.rendered) : dataNoLang);
  } catch (err) {
    console.error('Error fetching API:', err);
  }
}

test();


