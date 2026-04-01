export const config = { runtime: 'edge' };

const STABILITY_KEY  = process.env.STABILITY_API_KEY;
const URL_REPLACE    = 'https://api.stability.ai/v2beta/stable-image/edit/search-and-replace';
const URL_IMG2IMG    = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function chunkedBtoa(buffer) {
  const bytes  = new Uint8Array(buffer);
  let   result = '';
  const CHUNK  = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    result += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(result);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageMime, prompt, surfaceType } = body;

    if (!imageBase64 || !prompt) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 y prompt son requeridos' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Convertir base64 a binario
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const blob       = new Blob([imageBytes], { type: imageMime || 'image/jpeg' });

    // Determinar qué superficie buscar
    const surface = surfaceType === 'piso'
      ? 'the floor'
      : 'the walls';

    // Search and Replace: busca la superficie y la reemplaza con la textura
    const replacePrompt = prompt
      + ', high quality texture on ' + surface
      + ', photorealistic, interior design, 4K, ultra detailed surface material';

    const formData = new FormData();
    formData.append('image',          blob, 'room.jpg');
    formData.append('prompt',         replacePrompt);
    formData.append('search_prompt',  surface + ' in the room');
    formData.append('output_format',  'jpeg');

    let resp = await fetch(URL_REPLACE, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_KEY}`,
        'Accept':        'image/*',
      },
      body: formData,
    });

    // Si search-and-replace falla, fallback a img2img con strength 0.65
    if (!resp.ok) {
      const errText = await resp.text();
      console.log('Search-replace failed, falling back to img2img:', errText);

      const fd2 = new FormData();
      fd2.append('image',           blob, 'room.jpg');
      fd2.append('prompt',          prompt
        + ', apply ' + (surfaceType === 'piso' ? 'floor' : 'wall') + ' material texture'
        + ', keep furniture and objects unchanged'
        + ', photorealistic interior, same lighting, 4K');
      fd2.append('negative_prompt', 'changed furniture, moved objects, different layout, blurry, low quality');
      fd2.append('mode',            'image-to-image');
      fd2.append('strength',        '0.65');
      fd2.append('model',           'sd3-large-turbo');
      fd2.append('output_format',   'jpeg');

      resp = await fetch(URL_IMG2IMG, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_KEY}`,
          'Accept':        'image/*',
        },
        body: fd2,
      });

      if (!resp.ok) {
        const err2 = await resp.text();
        return new Response(
          JSON.stringify({ error: `Stability AI error ${resp.status}: ${err2}` }),
          { status: resp.status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }
    }

    const imgBase64 = chunkedBtoa(await resp.arrayBuffer());

    return new Response(
      JSON.stringify({ image: imgBase64, mime: 'image/jpeg' }),
      { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );
  }
}
