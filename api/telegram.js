export const config = { runtime: 'edge' };

const TG_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT  = process.env.TG_CHAT_ID;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
  }

  try {
    const { type, ...payload } = await req.json();
    const base = 'https://api.telegram.org/bot' + TG_TOKEN;

    let tgResp;
    if (type === 'photo') {
      // payload.photo = base64 string, payload.caption
      const bytes  = Uint8Array.from(atob(payload.photo), c => c.charCodeAt(0));
      const blob   = new Blob([bytes], { type: 'image/jpeg' });
      const fd     = new FormData();
      fd.append('chat_id', TG_CHAT);
      fd.append('photo',   blob, 'ambiente.jpg');
      fd.append('caption', payload.caption || '');
      tgResp = await fetch(base + '/sendPhoto', { method: 'POST', body: fd });
    } else {
      // type === 'message'
      tgResp = await fetch(base + '/sendMessage', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: TG_CHAT, text: payload.text, parse_mode: 'HTML' })
      });
    }

    const data = await tgResp.text();
    return new Response(data, {
      status:  tgResp.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
