/*
 * api/parse-invoice.js — the invoice second-reader (Reader 2).
 *
 * FIRST server-side code in this repo. Vercel serves any file under /api as a
 * zero-config Node serverless function — this adds NO build step and does not
 * touch the four hand-written client files. It exists only so the Gemini API key
 * never reaches the browser, the repo, or any log.
 *
 * Contract:
 *   GET  /api/parse-invoice?health=1  -> { ok:true, model, keyPresent } (no key value)
 *   POST /api/parse-invoice { text }  -> { status:'ok', supplier, date, lines[] }
 *                                        | { status:'unavailable' }
 *
 * The client treats ANY non-ok / error / timeout as "unavailable" and degrades to
 * today's app exactly. So on every failure path we still return 200 with a clean
 * unavailable body rather than an error the client would have to special-case.
 *
 * SECURITY: the invoice text and the model output are both untrusted. We fence the
 * text in the prompt (see _gemini.buildPrompt) and validate the output strictly
 * (_gemini.validatePayload) before returning it. Nothing from either is executed.
 */
'use strict';

var G = require('./_gemini.js');

var GEMINI_TIMEOUT_MS = 15000;   // function-side budget to Gemini; client waits ~20s

function model() {
  return (process.env.GEMINI_MODEL && String(process.env.GEMINI_MODEL).trim()) || G.DEFAULT_MODEL;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Read a JSON POST body whether or not the platform pre-parsed it.
function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body != null) {
      if (typeof req.body === 'string') { try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve(null); } }
      return resolve(req.body);
    }
    var data = '';
    req.on('data', function (c) { data += c; if (data.length > 2000000) req.destroy(); });   // ~2MB cap
    req.on('end', function () { if (!data) return resolve(null); try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    req.on('error', function () { resolve(null); });
  });
}

async function callGemini(text, categories) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) return { status: 'unavailable', reason: 'no-key' };

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model()) + ':generateContent';

  var payload = {
    contents: [{ role: 'user', parts: [{ text: G.buildPrompt(text, { categories: categories }) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: G.responseSchema(),   // now marks lines (+ per-line rawText/derivedUnitPrice) required — see _gemini.js
      thinkingConfig: { thinkingBudget: 0 }  // v64: pure extraction, no thinking — faster/cheaper and the winning probe config
    }
  };

  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, GEMINI_TIMEOUT_MS);
  var resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    return { status: 'unavailable', reason: 'fetch-error' };   // includes abort/timeout
  }
  clearTimeout(timer);

  if (!resp.ok) return { status: 'unavailable', reason: 'http-' + resp.status };   // 429s land here

  var data;
  try { data = await resp.json(); } catch (e) { return { status: 'unavailable', reason: 'bad-json' }; }

  // Pull the model's text out of the candidates envelope, then validate hard.
  var textOut = '';
  try {
    var parts = data && data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts;
    if (Array.isArray(parts)) textOut = parts.map(function (p) { return (p && p.text) || ''; }).join('');
  } catch (e) { textOut = ''; }
  if (!textOut) return { status: 'unavailable', reason: 'empty' };

  return G.validatePayload(textOut);   // -> {status:'ok',...} or {status:'unavailable',...}
}


module.exports = async function handler(req, res) {
  try {
    // Health check — lets Max verify wiring from the preview before any invoice
    // uses it. Reports the resolved model and whether a key is configured, never
    // the key itself.
    if (req.method === 'GET') {
      // v70: the diagnostic ?probe=1 endpoint (real, billed Gemini calls; added v64 to debug the reader
      // rollout) has been REMOVED — the reader is live and stable, and a billed no-auth endpoint has no
      // place before EzPlate is multi-tenant. Only the key-free health check remains.
      if (req.query && (req.query.health === '1' || req.query.health === 'true')) {
        return sendJson(res, 200, { ok: true, model: model(), keyPresent: !!process.env.GEMINI_API_KEY });
      }
      return sendJson(res, 405, { status: 'unavailable', reason: 'use-post' });
    }
    if (req.method !== 'POST') return sendJson(res, 405, { status: 'unavailable', reason: 'method' });

    var body = await readBody(req);
    var text = body && typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) return sendJson(res, 200, { status: 'unavailable', reason: 'no-text' });
    // v73: the client sends its existing category list so the model reuses one that fits. Untrusted
    // like the invoice text — buildPrompt trims/bounds it; a missing/bad list is just an empty hint.
    var categories = (body && Array.isArray(body.categories)) ? body.categories : [];

    var result = await callGemini(text, categories);
    return sendJson(res, 200, result);   // always 200: unavailable is a normal, expected outcome
  } catch (e) {
    // Last-resort: never leak a stack; the client just sees unavailable.
    return sendJson(res, 200, { status: 'unavailable', reason: 'server-error' });
  }
};

// Exported for completeness / potential future tests; the PURE logic lives in
// _gemini.js and is what the test suite pins.
module.exports.callGemini = callGemini;
module.exports.model = model;
