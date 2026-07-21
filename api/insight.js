/*
 * api/insight.js — optional Dashboard insight phrasing (Reader-style second layer).
 *
 * Vercel zero-config Node function. Exists only so the Gemini key stays server-side.
 * The client already computed and displayed the deterministic templates; this endpoint
 * merely returns a warmer phrasing of the SAME facts, with every number preserved
 * (enforced by _insight.validateInsightResponse). Any failure returns a clean 200
 * "unavailable" and the client keeps its templates — the dashboard is never blocked.
 *
 * Contract:
 *   GET  /api/insight?health=1        -> { ok:true, model, keyPresent }
 *   POST /api/insight { insights:[{facts,text}] } -> { status:'ok', lines:[{text}] }
 *                                                     | { status:'unavailable' }
 *
 * SECURITY: the insight lines are fenced as untrusted DATA in the prompt; the model's
 * output is validated hard (no number it wasn't given may appear) before returning.
 */
'use strict';

var G = require('./_gemini.js');
var I = require('./_insight.js');

var GEMINI_TIMEOUT_MS = 12000;   // phrasing is small; keep it snappy. Client waits ~20s.

function model() {
  return (process.env.GEMINI_MODEL && String(process.env.GEMINI_MODEL).trim()) || G.DEFAULT_MODEL;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body != null) {
      if (typeof req.body === 'string') { try { return resolve(JSON.parse(req.body)); } catch (e) { return resolve(null); } }
      return resolve(req.body);
    }
    var data = '';
    req.on('data', function (c) { data += c; if (data.length > 200000) req.destroy(); });   // ~200KB cap — insights are tiny
    req.on('end', function () { if (!data) return resolve(null); try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    req.on('error', function () { resolve(null); });
  });
}

async function callGemini(insights) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) return { status: 'unavailable', reason: 'no-key' };

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model()) + ':generateContent';

  var payload = {
    contents: [{ role: 'user', parts: [{ text: I.buildInsightPrompt(insights) }] }],
    generationConfig: {
      temperature: 0.4,                 // a little warmth; the numbers are pinned by validation regardless
      responseMimeType: 'application/json',
      responseSchema: I.insightSchema()
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
    return { status: 'unavailable', reason: 'fetch-error' };
  }
  clearTimeout(timer);

  if (!resp.ok) return { status: 'unavailable', reason: 'http-' + resp.status };

  var data;
  try { data = await resp.json(); } catch (e) { return { status: 'unavailable', reason: 'bad-json' }; }

  var textOut = '';
  try {
    var parts = data && data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts;
    if (Array.isArray(parts)) textOut = parts.map(function (p) { return (p && p.text) || ''; }).join('');
  } catch (e) { textOut = ''; }
  if (!textOut) return { status: 'unavailable', reason: 'empty' };

  return I.validateInsightResponse(textOut, insights);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query && (req.query.health === '1' || req.query.health === 'true')) {
        return sendJson(res, 200, { ok: true, model: model(), keyPresent: !!process.env.GEMINI_API_KEY });
      }
      return sendJson(res, 405, { status: 'unavailable', reason: 'use-post' });
    }
    if (req.method !== 'POST') return sendJson(res, 405, { status: 'unavailable', reason: 'method' });

    var body = await readBody(req);
    var insights = body && Array.isArray(body.insights) ? body.insights : null;
    if (!insights || !insights.length) return sendJson(res, 200, { status: 'unavailable', reason: 'no-insights' });
    if (insights.length > 10) insights = insights.slice(0, 10);   // cap — the dashboard sends 1–3

    var result = await callGemini(insights);
    return sendJson(res, 200, result);
  } catch (e) {
    return sendJson(res, 200, { status: 'unavailable', reason: 'server-error' });
  }
};

module.exports.callGemini = callGemini;
module.exports.model = model;
