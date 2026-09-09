/*
 * extract-pdf.mjs - produce the text the APP would see for a PDF, so the harness scores what the
 * parser actually receives rather than what `pdftotext -layout` prints.
 *
 * This mirrors extractPdfText() in js/app.js line for line: pdf.js getTextContent, items grouped by
 * Math.round(transform[5]) (the y position), groups sorted top to bottom, items joined with a single
 * space, whitespace collapsed. The differences from pdftotext are not cosmetic - on the real Supplier A
 * invoice the unit-of-measure column lands at the START of every page-1 line and at the END of every
 * page-2 line, because pdf.js emits items in content-stream order and the app never sorts by x.
 *
 * pdfjs-dist is NOT a dependency of this repo (no new dependencies) and must not become one for a
 * spike. Point PDFJS_DIR at any directory holding node_modules/pdfjs-dist@4.10.38 (the version the app
 * pins), e.g.  mkdir /tmp/pdfjs && cd /tmp/pdfjs && npm i pdfjs-dist@4.10.38
 *
 *   PDFJS_DIR=/tmp/pdfjs node spike/parser-audit/extract-pdf.mjs in.pdf > out.txt
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const dir = process.env.PDFJS_DIR;
if (!dir) { console.error('set PDFJS_DIR to a directory containing node_modules/pdfjs-dist (see header)'); process.exit(2); }
const require = createRequire(path.join(dir, 'package.json'));
const pdfjsPath = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
const pdfjs = await import(pathToFileURL(pdfjsPath).href);

const file = process.argv[2];
if (!file) { console.error('usage: extract-pdf.mjs FILE.pdf'); process.exit(2); }
const data = new Uint8Array(fs.readFileSync(file));
const pdf = await pdfjs.getDocument({ data, isEvalSupported: false, disableWorker: true, verbosity: 0 }).promise;
let out = '';
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const content = await page.getTextContent();
  const lines = {}, order = [];
  content.items.forEach((it) => {
    if (!it.str) return;
    const y = Math.round(it.transform[5]);
    if (!(y in lines)) { lines[y] = []; order.push(y); }
    lines[y].push(it.str);
  });
  order.sort((a, b) => b - a);
  order.forEach((y) => { out += lines[y].join(' ').replace(/\s+/g, ' ').trim() + '\n'; });
}
process.stdout.write(out);
