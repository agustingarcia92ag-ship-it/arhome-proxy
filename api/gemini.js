export const config = { runtime: 'edge' };

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const BASE       = 'https://generativelanguage.googleapis.com/v1beta';

// Models to try in order of preference
const MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-pro-preview-03-25',
];

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
  }

  try {
    const body = await req.json();

    // Try each model until one works
    let lastError = 'No models available';
    for (const model of MODELS) {
      const url  = BASE + '/models/' + model + ':generateContent?key=' + GEMINI_KEY;
      const resp = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      });

      const text = await resp.text();

      // If not a "model not found" error, return this response
      if (resp.ok) {
        return new Response(text, {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
      }

      // Check if it's a model-not-found error → try next
      if (text.includes('not found') || text.includes('not supported') || text.includes('no longer available')) {
        lastError = model + ' not available';
        continue;
      }

      // Any other error (auth, quota, etc.) → return immediately
      return new Response(text, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

    // All models failed
    return new Response(JSON.stringify({ error: { message: 'No available model found. Last error: ' + lastError } }), {
      status: 503,
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
