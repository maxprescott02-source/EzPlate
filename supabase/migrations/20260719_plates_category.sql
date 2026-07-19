-- v55 §J — plate.category: the Plates library's own grouping (independent of per-menu sections).
--
-- Run with the other v55 migrations, BEFORE deploying (dbPushPlate writes category). Idempotent.

ALTER TABLE public.plates ADD COLUMN IF NOT EXISTS category text;

-- Backfill each plate from the section of one of its menu entries, where it has one.
UPDATE public.plates p
SET category = (
  SELECT mi.section
  FROM public.menu_items mi
  WHERE mi.plate_id = p.id AND NULLIF(mi.section, '') IS NOT NULL
  ORDER BY mi.updated_at DESC NULLS LAST
  LIMIT 1
)
WHERE p.category IS NULL;
