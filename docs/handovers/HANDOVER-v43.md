# HANDOVER — v43 (follow-up bugfix on the v42 batch)

Branch: `fix/pack-control-and-menus` (same branch as v42, **unmerged**). Ships as
**v43** — all six version spots bumped from v42. `npm test` = **128 green**;
`node -c` clean; jsdom smoke passes. One code change + one test update.

## What happened (phone testing of v42)

Max phone-tested v42. Everything *worked* (plates/dishes saved and survived
refresh), but **every publish popped an error toast** — *"The menu item didn't
save, so '<name>' isn't online yet — try again when connected"* — and the sync
banner kept saying **offline** even though saves were landing.

## Root cause #1 (the real one) — a BACKEND schema gap, not app code

`dbPushMenu` has upserted `source_plate_id` on every `menu_items` row since v40
(it powers "reuse one costed dish across menus" — a dish that shares another
plate's recipe/cost). **Max's Supabase `menu_items` table never had that
column** (his columns: `id, section, name, price, notes, is_custom, updated_at,
menu_id, photo_url`). Postgres/PostgREST rejects the ENTIRE upsert when it
contains one unknown column, so **every dish save failed** — universally, on
every menu, which is exactly the symptom. Products kept working because they
write a different table.

**Fix (Max applied, backend — no app change):**
```sql
alter table menu_items add column if not exists source_plate_id text;
```
Saves work immediately after; no redeploy needed. (Confirmed by Max: "I've fixed
the back end and it's all working now.")

Data was never lost — localStorage held everything, which is why it survived
refresh; it just wasn't reaching the cloud.

## Root cause #2 (the app bug this batch fixes) — a masking toast

Why it took days to find: `toast()` uses a SINGLE popup element and overwrites
its text. On a failed dish save, two toasts fired back-to-back —
`pushWrite`'s real *"Couldn't save menu item: &lt;reason&gt;"* first, then v42's
`dbPushPlateAfterMenu` *"…isn't online yet…"* a microtask later, **overwriting
the real one**. So Max only ever saw the vague, wrong "offline" message; the
actual PostgREST error ("could not find the 'source_plate_id' column …") was
never visible. The v42 message also mislabeled a genuine server *rejection* as
"offline".

**Fix:** `dbPushPlateAfterMenu` no longer toasts on a failed/again-unconfirmed
menu-item push. It still aborts the plate write (no orphan plate) and returns
null — but messaging is now **solely** `pushWrite`'s job:
- server rejection → `pushWrite` shows the REAL error ("Couldn't save … : …");
- genuinely offline → `pushWrite` sets the quiet 'offline' banner and shows NO
  scary toast (the app's intended "saved locally" behaviour).

**Test:** `tests/menu-plate-order.test.js` — the old "aborts *and warns*" case is
now "aborts WITHOUT a masking toast" (asserts no `toast` call here; abort +
null return unchanged). All other sequencing tests stand.

## Judgement calls

- Removed the second toast entirely rather than rewording it: any toast here
  duplicates pushWrite's and, being last, would overwrite it — same masking bug
  in a new coat. One owner of save-messaging (pushWrite) is the fix.
- Did NOT strip `source_plate_id` from the write to "match" the old schema —
  that would silently break reuse-a-dish-across-menus. Adding the column is the
  correct fix, and it's Max's to run (done).
- Left the `navigator.onLine` false-offline behaviour (bootstrapSync early-return
  on line ~101, the window 'offline' listener) UNTOUCHED — out of scope for this
  fix and Max reports the banner is fine now that writes succeed. It remains a
  known latent quirk (already flagged in v40 code comments); revisit only if the
  banner misbehaves again on a real phone.

## Follow-ups / still open

- **Optional-table noise not yet addressed:** `menus`-table writes
  (`dbUpsertMenuRecord` = "menu", `dbDeleteMenuRecord` = "menu delete") still
  toast loudly if that table is missing/RLS-blocked, even though the READ treats
  it as optional. If Max sees errors specifically when *creating or deleting a
  menu*, make those two writes quiet/best-effort like the read. Not done this
  pass (no evidence he's hit it; the reported bug was `menu_items`).
- Same class of risk elsewhere: any `pushWrite` upsert that names a column the
  live DB lacks fails wholesale. Worth a one-time audit of every `dbPush*` column
  list against the actual Supabase schema before the next big feature.
- Merge: v42+v43 still need Max's phone sign-off on the branch preview, then
  merge to `main`. Then build the Tidy lists Settings UI (`HANDOVER-v40.md`).

## Needs Max's phone (branch preview)

1. Publish a dish to any menu → **no** error toast; confirm the row appears in
   the Supabase `menu_items` table (real cloud save, not just local).
2. The rest of the v42 list still applies — see `HANDOVER-v42.md`.
