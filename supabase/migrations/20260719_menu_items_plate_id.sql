-- v55 §A — Plates become a MANY-TO-MANY library.
--
-- A menu entry (menu_items row / "dish") now links to its plate via menu_items.plate_id.
-- One plate can back many dishes (one per menu it's published to). plates.menu_id becomes
-- legacy (kept, no longer read/written). source_plate_id is folded into plate_id.
--
-- APPLY THIS TO PROD BEFORE DEPLOYING THE v55 CODE (v43 lesson: a dbPush* that writes a column
-- the live DB lacks fails wholesale). Idempotent — safe to run more than once.

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS plate_id text REFERENCES public.plates(id);
CREATE INDEX IF NOT EXISTS menu_items_plate_id_idx ON public.menu_items(plate_id);

-- Backfill: a dish's plate is its existing plate_id, else its legacy source_plate_id, else the plate
-- whose legacy menu_id pointed back at this dish (inverting the v40..v54 primary link).
UPDATE public.menu_items mi
SET plate_id = COALESCE(
  mi.plate_id,
  mi.source_plate_id,
  (SELECT p.id FROM public.plates p WHERE p.menu_id = mi.id LIMIT 1)
)
WHERE mi.plate_id IS NULL;
