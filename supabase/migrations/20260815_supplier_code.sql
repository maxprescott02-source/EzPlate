-- 20260815_supplier_code.sql — batch 193
--
-- WHAT THIS DOES
--   Adds ONE nullable column, `public.ingredients.supplier_code`. It holds the
--   supplier's own product code for a product created by the catalogue CSV
--   importer, and it exists for exactly one reason: so that re-importing the
--   same supplier export UPDATES each product instead of creating a second copy
--   of it. That is a stated requirement of the queue item this ships.
--
-- WHY A COLUMN, AND NOT A CONTENT-DERIVED PRODUCT ID
--   The cheaper design is obvious and it is WRONG here. Deriving `ingredients.id`
--   from (supplier, product code) would need no schema change at all and would
--   make re-import a plain upsert on the primary key.
--
--     select conname, pg_get_constraintdef(oid) from pg_constraint
--      where conrelid = 'public.ingredients'::regclass and contype = 'p';
--     -->  ingredients_pkey   PRIMARY KEY (id)
--
--   Measured against production, 15 Aug 2026. `ingredients_pkey` is on `id`
--   ALONE — it is NOT `(business_id, id)`. Batch 183 widened `app_settings` to
--   `(business_id, key)` and `supplier_phrases` to `(business_id, id)` precisely
--   because their ids are content-derived and would therefore collide across
--   tenants; `ingredients` was never widened, and has got away with it only
--   because `uid()` mints random ids.
--
--   So a content-derived product id would mean: two cafés importing the SAME
--   supplier's export mint the SAME primary key. The second one's upsert either
--   fails on someone else's row or silently affects zero rows behind the tenant
--   policy — the class of failure this repo keeps finding. The id stays random
--   (`uid('IMP')`) and the identity that must be stable lives in this column.
--
-- WHY NULLABLE WITH NO DEFAULT, WHICH IS THE PART THAT IS NOT COSMETIC
--   `restore_backup` inserts `ingredients` as
--     insert into ingredients select * from jsonb_populate_recordset(null::ingredients, …)
--   with NO column list, and `jsonb_populate_recordset` turns a JSON key that is
--   ABSENT into an EXPLICIT NULL — which OVERRIDES a column DEFAULT rather than
--   falling back to it. `CLAUDE.md` carries that trap and the ten
--   `set_business_id` triggers are the remedy for the column that could not
--   tolerate it.
--
--   This column tolerates it exactly, and deliberately: a backup written before
--   today legitimately has no supplier code for any product, and NULL is the
--   right answer for those rows. Giving it a DEFAULT is what would make it a
--   claim that holds everywhere except after a disaster. It has none, and it
--   must never be given one.
--
-- NO UNIQUE INDEX, STATED SO THE ABSENCE READS AS A DECISION
--   `(business_id, supplier, supplier_code)` is what the importer treats as
--   unique, and it is enforced in the client, which resolves the key before it
--   writes. It is deliberately NOT a database constraint: `supplier` is a
--   free-text field a user can edit on any product at any time, so a unique
--   index here would raise 23505 on an ordinary product edit, on a path that has
--   nothing to do with importing. A duplicate product is untidy; a write that
--   fails on the Products screen for a reason nothing on screen explains is
--   worse.
--
-- ORDER: THIS FILE FIRST, THEN THE CLIENT
--   The opposite of 186, and for the same reason stated the other way round.
--   Here the database is the half that tolerates both answers — a column nothing
--   reads yet is inert — while a client that writes `supplier_code` against a
--   database without the column gets PGRST204 on every product write, including
--   an ordinary price edit that has nothing to do with importing. So the
--   migration is applied before the deploy, and the intermediate state is a
--   column with no rows in it.
--
-- ROLLBACK (one statement)
--   alter table public.ingredients drop column supplier_code;
--   ⚠️ Dropping it does NOT give its ordinal_position back — Postgres never
--   reuses an attnum — so `columns_fp` in docs/STAGING.md's fingerprint query
--   would differ from production afterwards even though nothing is wrong. That
--   is recorded in that file already; it is a note about the detector, not a
--   reason to hesitate over the rollback.
--
-- APPLIED
--   Staging (pboidoxjghntalovzrke): 15 Aug 2026, by Claude, via execute_sql.
--     Verified AS THE CLIENT over PostgREST with the staging publishable key and
--     a signed-in member of the staging café: a write carrying `supplier_code`
--     came back with the value in the representation, and a re-write of the same
--     code updated the row rather than adding one.
--   Production (izrnptxhdylllodvglla): 15 Aug 2026, by Claude, via execute_sql.
--     Verified the column exists, is nullable, has no default, and that all 412
--     existing product rows read back with `supplier_code` null and every other
--     column unchanged.

begin;

alter table public.ingredients
  add column if not exists supplier_code text;

comment on column public.ingredients.supplier_code is
  'The supplier''s own product code, set by the catalogue CSV importer. The importer treats (business_id, supplier, supplier_code) as this product''s identity so a re-import updates rather than duplicates. Nullable with NO default on purpose — see 20260815_supplier_code.sql.';

commit;
