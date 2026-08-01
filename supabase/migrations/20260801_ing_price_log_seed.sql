-- v108 — the existing per-product cost history, moved off Max's phone. Generated, not hand-written.
--
-- RUN THIS SECOND, after 20260801_ing_price_history.sql has created the table.
--
-- WHY IT IS A MIGRATION AND NOT CODE
-- These 33 points have never existed anywhere but `localStorage.cafeDB_ingPriceLog` in one
-- browser profile on one device. The online-only batch stops reading that key. If the points
-- are not on the server before that code ships, they are gone — not degraded, gone — and they
-- are the input to `ingPriceAt`, which is what historical plate costs, the movers card and
-- insight family 1 are computed from.
--
-- SOURCE: the stamped v106 backup export, `ezplate-backup-2026-08-01 (1).json`, taken
-- 2026-07-31T21:45:12Z. Stamp 393 / be5e0fbe — verified against the literal, matches.
--
-- Every point falls in a 25-minute window on 15 Jul 2026: one invoice import, 33 products.
-- Nothing has been logged since (`logIngPrice` fires only on invoice apply and builder
-- hand-edit). If Max takes a fresher export before running this, regenerate the file from it
-- rather than assuming — the check is trivial, and the cost of guessing wrong is a lost point
-- with no second copy.
--
-- Timestamps: the in-memory log stores epoch milliseconds; these are the same instants as ISO
-- UTC. Values are `cost_per_base_unit` at that moment, verbatim, at full precision — CLAUDE.md's
-- rounding rule is display-only and stored costs stay exact.
--
-- Idempotent via the table's unique (product_id, recorded_at) constraint: re-running inserts
-- nothing. That is deliberate, so this file can be run again after a fresher regeneration
-- without double-weighting any observation.

insert into public.ing_price_history (product_id, recorded_at, cost_per_base_unit) values
  ('CXmrfijuo433', '2026-07-15T01:56:33.350Z', 0.00663),
  ('P0004', '2026-07-15T01:31:16.608Z', 0.012199999999999999),
  ('P0010', '2026-07-15T01:56:33.345Z', 0.01657),
  ('P0016', '2026-07-15T01:56:33.349Z', 0.00311),
  ('P0018', '2026-07-15T01:31:16.613Z', 0.009890000000000001),
  ('P0026', '2026-07-15T01:31:16.596Z', 0.01277),
  ('P0027', '2026-07-15T01:56:33.345Z', 0.0121),
  ('P0031', '2026-07-15T01:56:33.346Z', 0.00657),
  ('P0038', '2026-07-15T01:56:33.349Z', 0.0031),
  ('P0042', '2026-07-15T01:31:16.597Z', 0.01498),
  ('P0072', '2026-07-15T01:56:33.347Z', 0.0094),
  ('P0074', '2026-07-15T01:31:16.608Z', 0.02355),
  ('P0076', '2026-07-15T01:31:16.609Z', 0.0115),
  ('P0079', '2026-07-15T01:31:16.610Z', 0.2),
  ('P0104', '2026-07-15T01:31:16.599Z', 0.00788),
  ('P0106', '2026-07-15T01:56:33.348Z', 0.01248),
  ('P0108', '2026-07-15T01:31:16.600Z', 0.00268),
  ('P0130', '2026-07-15T01:56:33.348Z', 0.0068200000000000005),
  ('P0145', '2026-07-15T01:31:16.601Z', 0.013),
  ('P0168', '2026-07-15T01:31:16.614Z', 0.00158),
  ('P0180', '2026-07-15T01:56:33.350Z', 0.013349999999999999),
  ('P0189', '2026-07-15T01:56:33.348Z', 0.01417),
  ('P0212', '2026-07-15T01:31:16.602Z', 0.00658),
  ('P0216', '2026-07-15T01:31:16.612Z', 0.00395),
  ('P0231', '2026-07-15T01:31:16.612Z', 0.00165),
  ('P0255', '2026-07-15T01:31:16.603Z', 0.01073),
  ('P0283', '2026-07-15T01:31:16.614Z', 0.01),
  ('P0295', '2026-07-15T01:31:16.615Z', 0.021670000000000002),
  ('P0300', '2026-07-15T01:56:33.350Z', 0.00268),
  ('P0330', '2026-07-15T01:31:16.604Z', 0.02198),
  ('P0332', '2026-07-15T01:31:16.605Z', 1.06),
  ('P0334', '2026-07-15T01:31:16.607Z', 0.01337),
  ('P0389', '2026-07-15T01:56:33.351Z', 0.00127)
on conflict (product_id, recorded_at) do nothing;

-- VERIFY AFTER RUNNING:
--
--   select count(*) from public.ing_price_history;
--     -> expect 33
--
--   select count(distinct product_id) from public.ing_price_history;
--     -> expect 33  (one point per product — this log has never had a second observation)
--
--   select min(recorded_at), max(recorded_at) from public.ing_price_history;
--     -> both 2026-07-15, roughly 01:31 to 01:57 UTC
