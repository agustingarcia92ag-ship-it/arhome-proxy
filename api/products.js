export const config = { runtime: 'edge' };

const STORE_ID = '4523655';
const TOKEN    = process.env.TN_TOKEN || 'ad7dc6de0d29cbaa24bec61d6df6ad997fd5b409';
const TN_BASE  = `https://api.tiendanube.com/v1/${STORE_ID}`;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url  = new URL(req.url);
  const page = url.searchParams.get('page') || '1';

  try {
    // published=true filtra solo productos activos/visibles en la tienda
    const tnUrl = `${TN_BASE}/products?per_page=50&page=${page}&published=true`;
    const resp  = await fetch(tnUrl, {
      headers: {
        'Authentication': `bearer ${TOKEN}`,
        'User-Agent':     'ARHomeRender/1.0',
      },
    });

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `TN API error: ${resp.status}` }),
        { status: resp.status, headers: corsHeaders() }
      );
    }

    const data = await resp.json();

    // Filtro adicional por si acaso
    const filtered = Array.isArray(data)
      ? data.filter(p => p.published === true)
      : data;

    return new Response(JSON.stringify(filtered), { status: 200, headers: corsHeaders() });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders() }
    );
  }
}
