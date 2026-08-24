/*
 * A declared test file that kills the TEST RUNNER, not itself — which is the only way to reproduce
 * what an OOM kill, a native abort or a cancelled CI job look like to the gate: a top-level
 * `node --test` process that dies by SIGNAL rather than exiting.
 *
 * The obvious version (`process.kill(process.pid)`) does NOT work and is why this file says so:
 * `node --test` runs each file in a child, catches the child's death, prints a failing test and
 * exits 1 — so spawnSync sees an ordinary non-zero status and the interesting case never arises.
 * Measured, after the first draft of this fixture did exactly that and left the assertion unable to
 * tell the two classifications apart.
 *
 * Driven only by tests/mutation-gate.test.js's classifier case; not part of `npm test`.
 */
process.kill(process.ppid, 'SIGKILL');
