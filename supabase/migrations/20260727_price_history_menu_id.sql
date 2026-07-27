-- v89 — per-menu food-cost history.
--
-- price_history has always held ONE number per point: the average food cost % across every
-- menu combined. The Dashboard is now menu-aware, so it needs a series per menu as well.
--
-- menu_id is NULLABLE and every existing row stays NULL. NULL means "all menus" — the
-- aggregate series the chart and the stat cards have always drawn. Rows with a menu_id are
-- the new per-menu series and are read into a SEPARATE array client-side, so no existing
-- all-menus figure changes by so much as a decimal.
--
-- No foreign key to menus(id) on purpose: deleting a menu must not delete its cost history,
-- and menusList is also allowed to be empty (see CLAUDE.md hard rule 7). An orphaned menu_id
-- is simply a series nothing asks for any more.
--
-- APPLY THIS BEFORE DEPLOYING v89. Previews and production share one database.
-- Until it is applied, v89 detects the missing column at bootstrap and keeps per-menu points
-- in localStorage only — no errors, no toasts, but the history will not survive a sync.

alter table price_history
  add column if not exists menu_id text;

create index if not exists price_history_menu_id_recorded_at_idx
  on price_history (menu_id, recorded_at);
