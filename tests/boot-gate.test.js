/*
 * boot-gate.test.js — v108: the honest loading state.
 *
 * THE DEFECT THIS PREVENTS. Before v108 the app hydrated synchronously from localStorage and painted
 * before a single server byte arrived. With Supabase as the source of truth that is no longer
 * possible, and the tempting shortcut — paint whatever is cached, swap it when the fetch lands — is
 * exactly what the brief forbids: it reintroduces two sources of truth in miniature, and the user
 * cannot tell a week-old price from a current one.
 *
 * So the contracts here are about what the user is TOLD:
 *   1. Loading shows a loading state, with no Try again button (there is nothing to retry yet).
 *   2. Success hides the gate completely.
 *   3. Failure shows an error, keeps the message, and offers exactly one action.
 *   4. Offline and misconfigured are DIFFERENT messages — "you're offline" and "this device can't
 *      reach your database" send the user to different places.
 *   5. Once the app is up, a later re-sync NEVER re-gates it. Pull-to-refresh runs the same
 *      bootstrapSync, and throwing a full-screen overlay over a working app on every refresh would
 *      be worse than the problem. An ERROR may still surface.
 *   6. The gate never blocks on its own absence — a missing element is a no-op, not a throw.
 *
 * Runs the REAL shipped bootGate, brace-extracted from js/app.js, against a minimal DOM stub.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(name) {
  const sig = `function ${name}(`;
  const i = SRC.indexOf(sig);
  if (i < 0) throw new Error(`boot-gate: function not found -> ${name}. app.js changed; update this test`);
  const start = SRC.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < SRC.length; n++) {
    if (SRC[n] === '{') depth++;
    else if (SRC[n] === '}' && --depth === 0) return SRC.slice(i, n + 1);
  }
  throw new Error(`boot-gate: unbalanced braces for ${name}`);
}

/* A DOM stub small enough to read, with just the surface bootGate touches. */
function mkNode(id) {
  const cls = new Set();
  return {
    id, hidden: true, textContent: '', onclick: null,
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
  };
}

function makeGate(present) {
  const nodes = present
    ? { bootGate: mkNode('bootGate'), bootGateMsg: mkNode('bootGateMsg'), bootGateRetry: mkNode('bootGateRetry') }
    : {};
  const calls = { bootstrapSync: 0 };
  // eslint-disable-next-line no-new-func
  const api = new Function('D', 'C', `
    "use strict";
    var document = { getElementById: function(id){ return D[id] || null; } };
    var bootstrapSync = function(){ C.bootstrapSync++; };
    var _bootGateDone = false;
    ${extractFn('bootGate')}
    return { bootGate: bootGate };
  `)(nodes, calls);
  return { gate: nodes.bootGate, msg: nodes.bootGateMsg, retry: nodes.bootGateRetry, run: api.bootGate, calls };
}

test('loading shows the gate, with no retry offered yet', () => {
  const g = makeGate(true);
  g.run('loading');
  assert.strictEqual(g.gate.hidden, false, 'the gate is what stands in for the data that has not arrived');
  assert.strictEqual(g.retry.hidden, true, 'nothing to retry while it is still trying');
  assert.strictEqual(g.msg.textContent, 'Loading your data…');
});

test('success hides the gate entirely', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');
  assert.strictEqual(g.gate.hidden, true, 'a hidden gate is the only acceptable success state');
  assert.strictEqual(g.gate.classList.contains('is-error'), false);
});

test('failure shows the message and exactly one action', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('error', 'Couldn’t load your data: boom');
  assert.strictEqual(g.gate.hidden, false);
  assert.ok(g.gate.classList.contains('is-error'), 'the error class is what drops the spinner');
  assert.match(g.msg.textContent, /Couldn’t load your data: boom/);
  assert.strictEqual(g.retry.hidden, false, 'the user must be given a way forward');
  assert.strictEqual(typeof g.retry.onclick, 'function');
});

test('Try again re-runs the sync and returns to the loading state', () => {
  const g = makeGate(true);
  g.run('error', 'nope');
  g.retry.onclick();
  assert.strictEqual(g.calls.bootstrapSync, 1, 'the button must actually retry, not just clear itself');
  assert.strictEqual(g.retry.hidden, true, 'and it goes back to looking like work in progress');
  assert.match(g.msg.textContent, /Trying again/);
});

test('a working app is NEVER re-gated by a later re-sync', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');                            // first boot succeeded — app is usable
  g.run('loading');                       // pull-to-refresh runs the same bootstrapSync
  assert.strictEqual(g.gate.hidden, true,
    'a full-screen overlay over a working app on every refresh is worse than the problem it solves');
});

test('…but a later FAILURE can still surface', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');
  g.run('error', 'lost it');
  assert.strictEqual(g.gate.hidden, false, 'silence is the failure mode this batch exists to remove');
  assert.match(g.msg.textContent, /lost it/);
});

test('offline and misconfigured are different messages, not one generic failure', () => {
  // Pulled from the real call sites so the two cannot silently converge on a shared string.
  const offline = SRC.match(/bootReady\('error','([^']*offline[^']*)'\)/i);
  const noClient = SRC.match(/bootReady\('error','(This device[^']*)'\)/);
  assert.ok(offline, "the offline branch must name being offline");
  assert.ok(noClient, 'the no-client branch must name the configuration, not the network');
  assert.notStrictEqual(offline[1], noClient[1],
    'one generic message would send the user to the wrong fix');
  assert.match(offline[1], /connection/i);
});

test('a missing gate element is a no-op, never a throw', () => {
  const g = makeGate(false);
  assert.doesNotThrow(() => { g.run('loading'); g.run('error', 'x'); g.run('ok'); },
    'a JS failure must not be able to trap the app behind an overlay it cannot clear');
});
