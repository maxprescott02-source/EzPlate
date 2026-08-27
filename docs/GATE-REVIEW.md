# Gate review before public signup

**Batch 210, 27 Aug 2026, shipped as `ezplate-v172`.** The sign-off `docs/QUEUE.md`'s "Gate review before public signup" item asked for: read the gates end to end and say whether they hold together, rather than whether each was built.

**Everything below was MEASURED against production on 27 Aug 2026** — `pg_proc`, `pg_policies`, `information_schema`, PostgREST with the shipped anon key, and the live `/auth/v1/settings`. Where something is reasoned rather than run, it says so and says why.

⚠️ **This is a sign-off on the gates as they stand today. It is not a promise about anything added later** — a new endpoint that ships user data to a third party, or a new policy on a tenant table, reopens it. That is the same standing-precondition shape as `CLAUDE.md`'s privacy gate, and for the same reason.

---

## Verdict, in one line each

| Gate | Verdict |
|---|---|
| 1 · `restore_backup` is `SECURITY INVOKER` and tenant-scoped | ✅ **HOLDS** |
| 2 · The anon key in `index.html` reads nothing | ✅ **HOLDS** |
| 3 · pdf.js is clear of both known RCEs, and pinned | ✅ **HOLDS** |
| 4 · Gemini's tier | ⚠️ **ACCEPTED RESIDUAL** — Max deferred the paid tier post-launch; the disclosure is what makes it acceptable |
| 5 · Rate limits / billing on the AI endpoints | ❌ **DID NOT HOLD.** Half fixed in this batch, half is a named residual |
| 6 · `invite_pending` as an email oracle | ⚠️ **ACCEPTED, with a shrinking surface** |
| 7 · Open API-level signup | ⚠️ **ACCEPTABLE, conditional on gate 5's residual** |

**The overall answer: the gates hold for a stranger's DATA and did not hold for Max's KEY.** Six years of this project's security work has been about tenant isolation, and it is genuinely sound — a self-made account sees nothing, writes nothing, and cannot reference another café's rows. The hole was one level to the side: two of our own endpoints spent a real API key for anybody who asked, and nothing in the tenant work could ever have caught that, because no database was involved.

---

## Gate 1 — `restore_backup` is `SECURITY INVOKER`

**Measured:** `pg_proc.prosecdef = false`. It is the only `public` function in the project that is not `SECURITY DEFINER`, and that is the point: it runs as the caller, so RLS applies to every statement in it.

Under 182's tenant policies that makes it tenant-scoped for free, and since 187 a non-owner is refused outright. The five tables it deletes and rewrites each carry exactly one permissive policy, `business_id = current_business_id()`, on `ALL` — so a caller's restore can only ever reach their own café's rows.

**The flag the item asked for is still correct and still needed.** `SECURITY INVOKER` is doing the isolation work here as a side effect of the policies, not because the function asserts anything itself. If a future migration ever made it `SECURITY DEFINER` for convenience, it would silently gain the power to wipe every café in the project, and nothing in the function's body would look different.

**One thing this review found and did not chase:** `anon` retains `EXECUTE` on `restore_backup` (and on `claim_business_invite` and `business_team`). It is **inert** rather than dangerous, and that is provable from the schema rather than by running it: for `anon`, `current_business_id()` returns NULL, `business_id = NULL` evaluates to NULL, so the `delete … where true` matches no rows, and `ingredients.business_id` is `NOT NULL` with a default of `current_business_id()`, so an insert fails on the column before RLS is even consulted. **It was NOT tested by calling it**, because the only place to call it is production, and being wrong about it costs Scoopy's real data. That is a stop condition, not a shortcut. Staging is where it belongs, and staging is paused — recorded in `docs/MAINTENANCE.md`.

## Gate 2 — the anon key

**Measured over PostgREST with the key that actually ships in `index.html`**, not through the MCP, because `CLAUDE.md`'s rule is that the MCP's role is not the client's:

```
ingredients [] · plates [] · menus [] · menu_items [] · supplier_phrases []
ing_price_history [] · app_settings [] · businesses [] · business_members [] · business_invites []
rpc/current_business_id -> null
```

`current_business_id()`'s body is now `select business_id from business_members where user_id = auth.uid()` and nothing else — 186 removed the anon branch, and there is no fallback left to close. **Rotating the key would still achieve nothing**, and now for the good reason rather than the bad one: it is not that rotation is futile because the key ships in the page, it is that the key confers nothing.

## Gate 3 — pdf.js

**Settled by batch 195 and this review only confirms it.** `PDFJS_VER='4.10.38'`: above the 4.2.67 floor that fixes CVE-2024-4367 outright, and outside the `5.6.83 ≤ v < 6.2.108` window of GHSA-hq66-cqwq-w95j. SRI is present on the module script, `isEvalSupported:false` remains as a second layer, and the worker is pinned to the same version (SRI-exempt because `new Worker()` has no such mechanism).

`tests/third-party-pins.test.js` holds the version-and-hash **pair** for both third-party scripts and encodes both advisory windows, so "bump to latest" fails by name rather than quietly re-entering the second hole. **Read that file rather than re-deriving the question**, which is what this review did.

## Gate 4 — Gemini's tier

**Free tier, Max's key.** Google may use free-tier prompts and responses to improve its products, including training, and human reviewers may read them.

**This is an accepted residual, not an unclosed gate**, and two things make it acceptable:

- **The disclosure shipped** on 27 Aug 2026 as `ezplate-v171` with Max's approved wording. A stranger is told, before their invoice text leaves, that it goes to Google's free tier, that it may be used for training, and that a human may read it. They accept it at sign-up, before an account exists.
- **Max deferred the paid tier explicitly**, post-launch, in writing (`docs/QUEUE.md`, "Move the AI endpoints to Gemini's PAID tier"). Measured at roughly 5–20c per café per month.

**What is genuinely missing is the acceptance RECORD** — the tick gates the form and is never persisted, so nothing knows who accepted which version. That is already filed and is not re-raised here.

## Gate 5 — rate limits and billing on the AI endpoints ❌

**This is the gate that did not hold, and it was not close.**

Measured on the production alias, unauthenticated:

```
GET /api/insight?health=1        -> 200 {"ok":true,"model":"gemini-3.1-flash-lite","keyPresent":true}
GET /api/parse-invoice?health=1  -> 200 {"ok":true,"model":"gemini-3.1-flash-lite","keyPresent":true}
```

Both endpoints accepted a POST from anywhere with **no auth, no rate limit, and no origin check**, and the client sent no credential of any kind. `api/parse-invoice` buffers up to ~2MB of caller-supplied text and forwards it to Gemini on Max's key. Nothing in this repo bounded who could do that or how often.

**Why nothing had caught it.** Every gate above is about the database, and this endpoint touches no database. The tenant work made a stranger's account see nothing — and a stranger never needed an account for this. The health endpoint even confirms a key is configured, which is a useful thing to have told an abuser.

### What this batch fixed

`api/_auth.js` now requires a **live, confirmed session** on both endpoints, verified by one `GET /auth/v1/user` against Supabase with the caller's bearer token. The client sends it via `apiAuthHeaders()`, which resolves the token per call rather than caching it — a cached access token expires within the hour and every AI call would then quietly 401, which presents as the feature "just not working" rather than as an error.

**It fails closed**: a missing token, a rejected token, or a verification call that itself failed all refuse. That default is a decision about consequence, per `CLAUDE.md` — refusing a legitimate caller costs the AI second-reader, which the app already renders as "unavailable" and which changes no data; admitting an illegitimate one costs quota now and money on the paid tier.

**Two publishable values are hard-coded in `api/_auth.js`** — the project URL and the anon key, both already world-readable in `index.html`. The alternative was new Vercel env vars, which would either fail open when absent (a gate that is decoration) or take the live invoice reader down the moment this deployed. `tests/api-auth.test.js` asserts they still match `index.html`, because two definitions of one thing is the defect this repo keeps finding.

### What this batch did NOT fix — the named residual

⚠️ **A signed-in caller is still unbounded.** Requiring an account raises the cost of abuse from zero to "confirm an email address"; it does not cap anyone. A real per-account quota needs a counter that survives between serverless invocations, which means a table, which means a migration, which means staging — **and staging is paused**. Half-building it against production was the wrong trade.

**So gate 5 is signed off as: the anonymous hole is closed, the authenticated one is open and named.** It is filed in `docs/MAINTENANCE.md` and it becomes a launch blocker the day the paid tier lands, because that is the day abuse stops costing quota and starts costing money. **Set the Google Cloud spend cap in the same sitting as enabling billing** — that is the cheap half and it needs no code.

## Gate 6 — `invite_pending` as an email oracle

`invite_pending(email)` is `SECURITY DEFINER`, granted to `anon`, and answers whether any café has a pending invitation for an address. Measured: `rpc/invite_pending` with `nobody@example.com` returns `false` to an unauthenticated caller.

**Accepted, and the surface is about to shrink rather than grow.** The argument in `20260814_invitations.sql`'s header stands — it is the smaller of the two available surfaces, since the alternative leaked more. What it discloses is narrow: whether an address has been invited to *some* café, not which, not by whom, and not whether the address has an account.

**Two things change the picture since it was written, and they point in opposite directions:**

- **192 made it reachable** — the sign-up form called it on every attempt, so it stopped being a function nothing invoked.
- **The café-creation branch removes that caller entirely.** Sign-up stops being invitation-gated, so once that ships, `invite_pending` has no caller in the shipped client at all. It is deliberately not dropped in the same change — an old client still cached on a phone calls it and refuses sign-up on an unreadable answer, so the drop must follow the client rather than lead it.

**The decision, stated because the item asked for one either way: it is acceptable to launch with, and it should be DROPPED once the café-creation client has been live long enough that no cached client still calls it.** Supabase's per-IP limit is the only brake, and that is thin — but the thing being protected is thin too, and the endpoint is on its way out rather than in.

## Gate 7 — open API-level signup

**Measured on the live auth settings:**

```
disable_signup: false      mailer_autoconfirm: false      anonymous_users: false
```

**So API-level signup is already open, today, before any of the signup work ships.** Anyone with the public anon key can POST `/auth/v1/signup`. That is worth stating plainly because the item's framing — "is open signup acceptable *now that* a self-made account can see nothing" — implies a future tense that does not apply.

**It is acceptable, and here is what bounds it:**

- **Email confirmation is required** (`mailer_autoconfirm:false`), so Supabase issues no session until the address is proven. An unconfirmed account is inert.
- **A confirmed account with no membership sees nothing and writes nothing** — measured in gate 2, and the tenant policies are what make it true rather than a client check.
- **`business_members_one_business_per_user` is UNIQUE**, so an account can join or found at most one café. N spam accounts therefore cost at most N empty cafés, not unbounded rows.
- **A foreign key does not confine a reference to your own tenant** — the standing trap — but nothing in the signup path writes a caller-supplied id into a tenant column.

**The one thing that made open signup genuinely unsafe was gate 5**, and it had nothing to do with signup: an open endpoint spending a real key does not care whether accounts exist. With the anonymous half closed, the remaining exposure is "someone confirms an email address and then burns quota", which is bounded work for the abuser and recoverable for Max.

⚠️ **The condition on this sign-off: gate 5's residual must be closed before the paid tier is enabled, not before signup opens.** Those are different days and it matters which one the work is tied to.

---

## What this review changed

- **Fixed:** the anonymous caller hole on both AI endpoints (`api/_auth.js`, both handlers, `apiAuthHeaders()` in the client, `tests/api-auth.test.js`).
- **Filed to `docs/MAINTENANCE.md`:** per-account rate limiting on the AI endpoints; proving `restore_backup` is inert for `anon` on staging; dropping `invite_pending` once no cached client calls it.
- **Left alone deliberately:** the acceptance record (already filed), the paid tier (Max's, deferred), and the pdf.js question (settled, and `tests/third-party-pins.test.js` is the authority).
