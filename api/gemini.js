export const config = { runtime: 'edge' };

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BASE       = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL      = 'gemini-2.0-flash-lite';

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
  }
  try {
    const body = await req.json();
    const url  = BASE + '/models/' + MODEL + ':generateContent?key=' + GEMINI_KEY;
    const resp = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const data = await resp.text();
    return new Response(data, {
      status:  resp.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
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
