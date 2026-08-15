/* An ES module standing in for pdf.js on the CDN, so tests/third-party-pins.test.js
   can RUN the real ensurePdfjs() instead of grepping its source. It exports the two
   things ensurePdfjs touches. It is NOT a stub of any app function — the code under
   test is the real one; this is only the remote module it imports. */
export const GlobalWorkerOptions = { workerSrc: null };
export const version = 'stub';
export function getDocument(){ return { promise: Promise.resolve({ numPages: 0 }) }; }
