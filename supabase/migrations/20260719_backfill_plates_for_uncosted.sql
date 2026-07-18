-- v55 §B — every menu entry lives in the Plates library.
--
-- After §A's backfill, any menu_items row still without a plate_id is an old "not costed" dish that never
-- had a plate. Give each one a fresh EMPTY plate (lines = []) and link it, so everything shows up in the
-- Plates tab. An empty plate reads $0.00 in code but the UI shows a muted "not costed yet".
--
-- Idempotent: the plate id is derived from the dish id ('SPD'||id), so a re-run finds plate_id already set
-- (WHERE plate_id IS NULL matches nothing) and the INSERT is a no-op via ON CONFLICT.
-- Run AFTER 20260719_menu_items_plate_id.sql, BEFORE deploying v55.

INSERT INTO public.plates (id, name, lines)
SELECT 'SPD' || mi.id, COALESCE(NULLIF(mi.name, ''), 'Plate'), '[]'::jsonb
FROM public.menu_items mi
WHERE mi.plate_id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.menu_items mi
SET plate_id = 'SPD' || mi.id
WHERE mi.plate_id IS NULL;
