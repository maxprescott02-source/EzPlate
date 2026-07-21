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

async function callGemini(text) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) return { status: 'unavailable', reason: 'no-key' };

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model()) + ':generateContent';

  var payload = {
    contents: [{ role: 'user', parts: [{ text: G.buildPrompt(text) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: G.responseSchema()
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

/*
 * DIAGNOSTIC PROBE (dev only — behind Vercel preview SSO). GET ?probe=1 does a REAL
 * generateContent on the configured model AND lists the models the key can see, returning
 * the raw HTTP status + a snippet of Gemini's own error body. This is how we find out WHY a
 * call comes back "unavailable" (bad model / unauthorized key / API not enabled / rate limit /
 * rejected schema) without leaking the key. Remove or gate before EzPlate is multi-tenant.
 */
async function probeGemini() {
  var key = process.env.GEMINI_API_KEY;
  var out = { model: model(), keyPresent: !!key };
  if (!key) { out.probe = 'no-key'; return out; }
  var base = 'https://generativelanguage.googleapis.com/v1beta';
  // 1) which models can this key actually use for generateContent?
  try {
    var lr = await fetch(base + '/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    var lj = null; try { lj = await lr.json(); } catch (e) {}
    out.listModels = {
      httpStatus: lr.status,
      names: (lj && Array.isArray(lj.models)) ? lj.models
        .filter(function (m) { return !m.supportedGenerationMethods || m.supportedGenerationMethods.indexOf('generateContent') >= 0; })
        .map(function (m) { return String(m.name || '').replace('models/', ''); }).slice(0, 80) : undefined,
      error: (lj && lj.error) ? String(lj.error.message || '').slice(0, 300) : undefined
    };
  } catch (e) { out.listModels = { error: 'fetch-failed: ' + (e && e.message) }; }
  // 2) actually try the configured model on a trivial invoice and report the raw result
  try {
    var gr = await fetch(base + '/models/' + encodeURIComponent(model()) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: G.buildPrompt('Widget Deluxe 1kg  $5.00') }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: G.responseSchema() }
      })
    });
    var gt = ''; try { gt = await gr.text(); } catch (e) {}
    out.generate = { httpStatus: gr.status, ok: gr.ok, bodySnippet: gt.slice(0, 700) };
  } catch (e) { out.generate = { error: 'fetch-failed: ' + (e && e.message) }; }
  return out;
}

module.exports = async function handler(req, res) {
  try {
    // Health check — lets Max verify wiring from the preview before any invoice
    // uses it. Reports the resolved model and whether a key is configured, never
    // the key itself.
    if (req.method === 'GET') {
      if (req.query && (req.query.probe === '1' || req.query.probe === 'true')) {
        return sendJson(res, 200, await probeGemini());
      }
      if (req.query && (req.query.health === '1' || req.query.health === 'true')) {
        return sendJson(res, 200, { ok: true, model: model(), keyPresent: !!process.env.GEMINI_API_KEY });
      }
      return sendJson(res, 405, { status: 'unavailable', reason: 'use-post' });
    }
    if (req.method !== 'POST') return sendJson(res, 405, { status: 'unavailable', reason: 'method' });

    var body = await readBody(req);
    var text = body && typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) return sendJson(res, 200, { status: 'unavailable', reason: 'no-text' });

    var result = await callGemini(text);
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
