export const config = { runtime: 'edge' };

const STABILITY_KEY = process.env.STABILITY_API_KEY;
const STABILITY_URL = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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
    const { imageBase64, imageMime, prompt } = body;

    if (!imageBase64 || !prompt) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 y prompt son requeridos' }),
        { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Enriquecer prompt: SOLO cambiar paredes/pisos, respetar todo lo demas
    const enrichedPrompt = prompt
      + ', keep all furniture exactly as in original photo'
      + ', keep all objects and decorations unchanged'
      + ', only apply new texture on walls and floor surfaces'
      + ', same room composition, same lighting conditions, same camera angle and perspective'
      + ', photorealistic architectural visualization, interior design, 4K ultra detailed';

    // Negative prompt: evitar cambios en muebles y estructura
    const negativePrompt = 'different furniture, moved objects, new decorations, different room layout, '
      + 'different perspective, different lighting, changed decor, removed furniture, '
      + 'blurry, low quality, distorted, cartoon, illustration, painting';

    // Convertir base64 a binario
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const blob = new Blob([imageBytes], { type: imageMime || 'image/jpeg' });

    // Form data para Stability AI
    const formData = new FormData();
    formData.append('image', blob, 'room.jpg');
    formData.append('prompt', enrichedPrompt);
    formData.append('negative_prompt', negativePrompt);
    formData.append('mode', 'image-to-image');
    formData.append('strength', '0.55');         // bajo = mas fiel a la foto original
    formData.append('model', 'sd3-large-turbo');
    formData.append('output_format', 'jpeg');

    const resp = await fetch(STABILITY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_KEY}`,
        'Accept': 'image/*',
      },
      body: formData,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(
        JSON.stringify({ error: `Stability AI error ${resp.status}: ${errText}` }),
        { status: resp.status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Devolver imagen como base64 (chunked para evitar stack overflow)
    const imgBuffer = await resp.arrayBuffer();
    const imgBytes  = new Uint8Array(imgBuffer);
    let imgBase64   = '';
    const CHUNK     = 8192;
    for (let i = 0; i < imgBytes.length; i += CHUNK) {
      imgBase64 += String.fromCharCode.apply(null, imgBytes.subarray(i, i + CHUNK));
    }
    imgBase64 = btoa(imgBase64);

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
