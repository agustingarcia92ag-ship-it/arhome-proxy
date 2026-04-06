export const config = { runtime: 'edge' };

const TG_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT  = process.env.TG_CHAT_ID;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function chunkedFromBase64(b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
  }

  try {
    const body    = await req.json();
    const { type } = body;
    const base    = 'https://api.telegram.org/bot' + TG_TOKEN;

    let tgResp;

    if (type === 'photo') {
      // Enviar foto como multipart
      const bytes = chunkedFromBase64(body.photo);
      const blob  = new Blob([bytes], { type: 'image/jpeg' });
      const fd    = new FormData();
      fd.append('chat_id', TG_CHAT);
      fd.append('photo',   blob, 'ambiente.jpg');
      if (body.caption) fd.append('caption', body.caption);
      tgResp = await fetch(base + '/sendPhoto', { method: 'POST', body: fd });

    } else {
      // Mensaje de texto
      tgResp = await fetch(base + '/sendMessage', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          chat_id:    TG_CHAT,
          text:       body.text || '',
          parse_mode: 'HTML'
        })
      });
    }

    const data = await tgResp.text();
    return new Response(data, {
      status:  tgResp.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }
}
