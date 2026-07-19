-- v54 — Plates become an independent library.
--
-- A plate may now exist unpublished (no menu). plates.menu_id is the nullable link to a
-- menu_items row (FK plates_menu_id_fkey); NULL means "unpublished library plate".
--
-- NOTE: on the live Scoopy's project this column is ALREADY nullable (verified via MCP on
-- 18 Jul 2026 — is_nullable = YES), so this migration is a no-op there. It is committed for
-- repo/other-environment parity and is idempotent: DROP NOT NULL on an already-nullable
-- column succeeds and changes nothing.

ALTER TABLE public.plates ALTER COLUMN menu_id DROP NOT NULL;
