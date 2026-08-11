var loadedPlateId=null,invRows=[],nameTimer=null,publishTargetId=null;
var gemToken=0,gemStatus=null,gemApplied=false,gemCheckStart=0;   // v62: AI second-reader — token discards late/stale responses, status drives the summary note, gemApplied freezes an applied import. v63: gemCheckStart timestamps the "checking" state so the flip to checked/unavailable never flickers (see gemSettle)
/* v108: BASE_PRODUCTS (393 rows, 132 KB) and BASE_IDS were deleted here. The catalogue lives in the
   `ingredients` table — migrated by 20260801_base_products_backfill.sql, verified 412 live products.
   The base+productsById merge existed only because localStorage held deltas on top of a hardcoded base;
   with the server as the source of truth, products are just products. is_custom is no longer derived
   from BASE_IDS — it round-trips through the row boundary instead (see rowToIngredient). */

/* ================== 172: THE ENVIRONMENT FENCE ==================
   Local state must not cross between the production and staging Supabase projects.

   WHY IT IS A REAL RISK AND NOT A TIDINESS CONCERN. localStorage is keyed by
   ORIGIN, and both environments are reached from the SAME origin — production is
   `/`, staging is `/?env=staging`. So every key is shared between them by default.
   Most of what is stored is a view preference and crossing would only be untidy,
   but ONE key is not: `cafeDB_plateDraft` is unsaved authored work (CLAUDE.md
   names it the standing exception to "preferences and caches only"), and its lines
   carry `kid` and `pid` values that identify DIFFERENT ROWS in the other project.
   A draft authored against staging and resumed against production would silently
   cost a real plate from whatever staging ids happened to collide.

   THE RULE IS BLANKET, AND THAT IS THE POINT: on a change of project, every
   `cafeDB_`/`cafeCost_` key goes. An exception list ("keep the theme, keep the
   install dismissal") is a list that rots the moment someone adds a key and does
   not think about this function — and the failure would be silent. Losing a theme
   preference on a deliberate environment switch costs nothing.

   ⚠️ FIRST RUN PURGES NOTHING. A null stamp means this code has simply never run
   on this device, not that the environment changed — so the deploy that ships this
   must not wipe the settings of the one user the app has. Only a stamp that EXISTS
   and DIFFERS is a switch.

   It runs here, at the top of the file, because it has to beat every top-level
   localStorage reader below it (`dashRange`, `dashScope`). Moving it later
   re-introduces the bug in a form no test would obviously catch.

   ⚠️ IT CANNOT BEAT ALL OF THEM, and the earlier version of this comment claimed it
   did — naming "the theme preference", which is read by the THEME RESOLVER inline in
   index.html's <head>, before this file is even fetched. No amount of ordering inside
   app.js reaches that, so the resolver makes the same stamp comparison itself; the
   comment there explains why. The general shape is worth remembering: this fence is
   a whole-page concern, and app.js is not the whole page. */
var ENV_STAMP_KEY='cafeCost_env';

/* 174: the purge itself, lifted out of `envFence` so signing in and out can reuse it.
   Two callers, one rule: a change of ENVIRONMENT and a change of USER are the same
   event as far as local state is concerned — everything held here describes the data
   that was on screen a moment ago, and after either change that data is somebody
   else's. The queue's auth item says "login purges local state" and this is the purge
   it means; writing a second one would be two rules that agree until they don't.

   ⚠️ It does NOT touch Supabase's own `sb-<ref>-auth-token`, which is how the session
   survives a reload. That key carries neither of this app's prefixes, so it is out of
   scope by construction rather than by an exception — and Supabase namespaces it by
   project ref, so it cannot cross environments either. */
function purgeLocalState(store, exceptKey){
  var doomed=[];
  try{
    for(var i=0;i<store.length;i++){
      var k=store.key(i);
      if(k && k!==exceptKey && (k.indexOf('cafeDB_')===0 || k.indexOf('cafeCost_')===0)) doomed.push(k);
    }
    // collected first, removed second: removing while iterating by index re-indexes
    // the store underneath the loop and silently skips every other key.
    doomed.forEach(function(k){ try{ store.removeItem(k); }catch(e){} });
  }catch(e){}
  return doomed.length;
}

function envFence(store, ref){
  if(!store || !ref) return null;                              // no storage, or no env resolved: nothing to fence
  var prev;
  try{ prev=store.getItem(ENV_STAMP_KEY); }catch(e){ return null; }   // storage throws (private mode): leave it alone
  if(prev===ref) return 0;                                     // same project as last time
  var n=0;
  if(prev!==null) n=purgeLocalState(store, ENV_STAMP_KEY);     // an ACTUAL switch — see the first-run note above
  try{ store.setItem(ENV_STAMP_KEY, ref); }catch(e){}
  return n;
}
try{ envFence(window.localStorage, window.SUPA_REF); }catch(e){}

/* ================== 173: THE ID GENERATOR ==================
   One place that mints a row id, for every table whose primary key is a bare `text`
   column the client chooses.

   THE DEFECT IT REMOVES. Ids were `PREFIX + Date.now().toString(36)`. Two accounts
   creating a plate in the same millisecond mint the SAME id — and because every write
   is `.upsert()`, the second one does not error, it OVERWRITES the first, under a
   green "Saved" banner. Single-tenant that cannot happen and none of this matters;
   the moment there are two cafés it is a silent data-loss path.

   THE THREE GUARANTEES, and why all three are needed:
     - `Date.now()` keeps ids roughly time-ordered, which is worth keeping for reading
       a table by eye and for debugging. It guarantees nothing on its own.
     - `_uidSeq` guarantees ABSOLUTE uniqueness within one page session, including
       inside a loop that runs many times in the same millisecond (the invoice
       importer does exactly that). Deterministic, not probabilistic.
     - the random block is what makes ids unique ACROSS accounts and sessions, where
       a counter cannot help because the two counters know nothing about each other.
   `nextChangeId` already had this exact shape with a 1296-value token; it was the
   precedent, and it now shares the implementation instead of being a near-copy.

   ⚠️ WHY NO MIGRATION OF EXISTING ROWS IS NEEDED, which is the load-bearing claim of
   this change and is pinned in tests/unique-ids.test.js: a new id can never equal an
   OLD one, because every new id carries a `-` and the old format has no separator at
   all. So Scoopy's existing rows stay exactly as they are and a second café cannot
   collide with them. Rewriting live ids would have meant chasing every reference,
   including the ones inside plate-line JSONB — a large destructive migration bought
   for nothing.

   ⚠️ THIS DOES NOT COVER SEMANTIC KEYS, and it must not be extended to them: the nine
   `app_settings` keys, `supplier_phrases.id` (deliberately content-derived, so that
   re-teaching a pack UPDATES one row instead of duplicating it), the `K0001` kitchen
   ids and `MENU_ORIGINAL`. Those are NAMES the code looks things up by, not surrogate
   ids, and randomising them breaks the lookup rather than fixing anything. They need
   tenant scoping, which is the `business_id` item's job. See docs/QUEUE.md. */
var _uidSeq = 0;
function uidRandom(n){                                       // n base-36 characters of real entropy
  var out = '';
  var c = (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') ? crypto : null;
  if(c){
    /* 252 = 7 × 36, and bytes at or above it are REJECTED rather than folded in. A bare
       `% 36` over 0-255 is biased, because 256 is not a multiple of 36: the digits 0-3
       come up on 8 of the 256 byte values and the rest on 7, making them ~14% likelier.
       That is a real loss of the entropy that separates two ACCOUNTS, and the counter
       cannot make it up — it knows nothing about the other session.

       The refill count is BOUNDED because a rejected byte yields no character, so an
       unbounded loop would spin forever against a source that only ever returned
       252-255. Real `crypto` cannot do that (about 1.5e-14 per refill), but "cannot" is
       doing a lot of work in a loop with no exit, and distrusting it costs one counter.
       Falling out of it lands on the Math.random top-up below, which always terminates. */
    for(var tries=0; tries<8 && out.length<n; tries++){
      var buf = new Uint8Array(n - out.length + 8);          // + slack, so refills are rare
      c.getRandomValues(buf);
      for(var i=0;i<buf.length && out.length<n;i++){
        if(buf[i] < 252) out += (buf[i] % 36).toString(36);
      }
    }
    if(out.length >= n) return out;
  }
  /* Math.random is a weaker source, not an absent one. An id is not a secret and does not
     need to be unguessable — it needs to not repeat — so degrading here is correct, and
     far better than throwing on a browser without `crypto`.
     ⚠️ It TOPS UP to n rather than adding n: this is also the exit from the bounded loop
     above, where `out` may already hold some characters, and a fixed-length append there
     would return an over-long id. */
  while(out.length < n) out += Math.floor(Math.random()*36).toString(36);
  return out;
}
function uid(prefix){
  _uidSeq = (_uidSeq + 1) % 1679616;                         // 36^4, so it always fits four chars
  return String(prefix||'') + Date.now().toString(36)
       + '-' + _uidSeq.toString(36) + '-' + uidRandom(8);
}

/* ================== Supabase data layer (single source of truth) ==================
   Local storage is kept only as an OFFLINE MIRROR so the app still opens and search
   still works with no signal. On every load we replace the mirror with server data. */
var SUPA = (window.supabase && window.SUPA_URL) ? window.supabase.createClient(window.SUPA_URL, window.SUPA_KEY) : null;

/* 172: a permanent, unmissable marker when this is NOT production. The accident
   this whole staging item exists to prevent is doing real work against the wrong
   database, and the only thing standing between the two is a query string that
   scrolls off the address bar. Never rendered on production — the element is not
   created at all — so it cannot regress Max's app. */
function markNonProductionEnv(){
  if(!window.SUPA_ENV || window.SUPA_ENV==='production') return null;
  var el=document.createElement('div');
  el.className='envbadge'; el.id='envBadge';
  el.setAttribute('role','status');
  // the tail is a `.btn-noun`, which is the app's OWN pattern for a label that has to
  // survive a narrow phone — the same one that keeps "Import invoice" to "Import".
  // Below 640 the badge reads just "STAGING", which is what lets it sit in the mobile
  // header's right-hand slot without covering the brand. Built as nodes rather than
  // innerHTML so the env name can never be markup.
  el.appendChild(document.createTextNode(window.SUPA_ENV.toUpperCase()));
  var tail=document.createElement('span');
  tail.className='btn-noun';
  tail.textContent=' data — not the café';
  el.appendChild(tail);
  (document.body||document.documentElement).appendChild(el);
  try{ document.title='['+window.SUPA_ENV+'] '+document.title; }catch(e){}
  return el;
}

function setSync(state){
  var el=document.getElementById('syncBanner'); if(!el) return;
  var map={loading:'Loading latest data\u2026', saving:'Saving\u2026', ok:'Saved',
           offline:"Offline \u2014 changes won't save", error:"Can't reach server \u2014 working offline"};
  el.textContent=map[state]||''; el.setAttribute('data-state',state||''); el.hidden=false;
  clearTimeout(el.__t);
  if(state==='ok'){ el.__t=setTimeout(function(){ el.hidden=true; }, 1400); }
}
function online(){ return !!SUPA && navigator.onLine; }
function errText(err){ return (err && (err.message||err.error_description||err.error||err.details||err.hint||err.code)) || 'unknown error'; }
/* v108 \u2014 A FAILED WRITE IS NEVER QUIET AGAIN.
   The defect this batch exists to remove was not that offline happens; it was that offline failed
   INVISIBLY. A price edit vanished with no word, under a green banner, and the user found out a week
   later. Two things caused that and both are gone:

     1. The `!navigator.onLine` branch below used to set a quiet 'offline' banner and suppress the
        toast, on the reasoning that the write was "saved locally". With localStorage no longer a
        data store that sentence is simply false \u2014 and it was always half-false, because nothing ever
        retried. Every failure now says so, in the same words, whatever the cause.
     2. `if(!SUPA) return Promise.resolve(null)` returned a NULL that read as success to any caller
        doing `if(!res.error)`. It now returns an error shape, so "no client" cannot be mistaken for
        "wrote fine".

   v40's lesson still stands and is deliberately kept: do NOT pre-skip on `navigator.onLine`. It
   false-reports offline in installed PWAs, which both showed a bogus banner AND dropped the write.
   We ATTEMPT the write and judge by the real outcome. `navigator.onLine` is used only to word the
   message afterwards, where being wrong costs nothing.

   Returns the settled result so ordered writes (plate -> dish) can chain. */

/* ===== where each dataset actually persists (v111) =====
   v108 emptied nine `saveX()` functions to no-ops but left ~35 calls to them scattered through the
   mutation paths. v111 deleted both. The ONLY thing those no-ops still carried was this map, so it
   lives here instead — one place, next to the gateway every one of these helpers goes through.
   A mutation to any of these is only persisted if it reaches its helper below; there is no other
   destination, and (see the top of this comment) a failure to arrive is always surfaced.
     products (`productsById`)      -> dbPushIngredient        [ingredients]
     kitchen words                  -> dbSetSetting            [app_settings, key kitchen_ingredients]
     dishes (`customMenu`)          -> dbPushMenu / dbDeleteMenu             [menu_items]
     menus (`menusList`)            -> dbUpsertMenuRecord / dbDeleteMenuRecord  [menus]
     plates (`savedPlates`)         -> dbPushPlate / dbDeletePlate           [plates]
     food-cost history              -> dbPushHistory           [price_history]
     per-menu history               -> dbPushMenuHistory       [menu_price_history, menu_id set]
     per-dish sell price            -> dbPushMenuPrice         [menu_price_history]
     per-product cost               -> dbPushIngPrice via saveIngLog         [ing_price_history]
     supplier memory                -> dbPushSupplierPhrase / dbDeleteSupplierPhrase [supplier_phrases]
   `saveIngLog` and `saveKitchenIngredients` survive because they are NOT no-ops — they flush and
   push. Do not assume a `save`-prefixed name here is decoration. */
function pushWrite(builder, label){
  if(!SUPA){
    var noClient={error:{message:'No database connection'}};
    setSync('error'); toast('Couldn\u2019t save '+label+' \u2014 no database connection');
    return Promise.resolve(noClient);
  }
  setSync('saving');
  var fail=function(e){
    console.error('[sync] '+label+' failed:', e);
    setSync('error');
    // Offline only changes the WORDING \u2014 never whether the user is told.
    toast(navigator.onLine
      ? 'Couldn\u2019t save '+label+': '+errText(e)
      : 'Couldn\u2019t save '+label+' \u2014 you\u2019re offline. It has NOT been saved.');
    return {error:e};
  };
  return Promise.resolve().then(builder).then(function(res){
    if(res && res.error) return fail(res.error);
    setSync('ok');
    return res;
  }).catch(fail);
}

/* ============================================================================
   THE ROW BOUNDARY (v108) — every crossing between a Supabase row and an
   in-memory object lives HERE, in pairs, and nowhere else.

   WHY THIS IS A SECTION AND NOT SCATTERED HELPERS. Until v108 the translation
   ran on sync only, at a handful of sites, and a reader could get away with
   touching raw fields. With the server as the source of truth EVERY read
   crosses this boundary, and a missed field does not throw — it arrives
   `undefined` and the damage reads like a missing relationship rather than a
   naming bug. That is how the v106 backup audit found `menu_items` exporting
   camelCase against snake_case columns, silently, on 76 of 77 dishes.

   THE RULE: readers call `rowToX`, writers call `xToRow`. Nothing outside this
   section names a column, and nothing inside it names a DOM node.

   WHERE THE SHAPE ACTUALLY CHANGES — the complete list, checked against the
   live schema 1 Aug 2026, not assumed:

     menu_items   is_custom <-> custom · menu_id <-> menuId
                  plate_id <-> plateId · source_plate_id <-> sourcePlateId
     price_history        recorded_at <-> t (ISO <-> epoch ms)
                          avg_food_cost_pct <-> v
     menu_price_history   recorded_at <-> t · price <-> v · keyed menu_item_id
     ing_price_history    recorded_at <-> t · cost_per_base_unit <-> v
                          keyed product_id
     ingredients / plates / menus / supplier_phrases
                  NO case change — snake_case on both sides. Do not "tidy"
                  them into camelCase to match the others; the JS product
                  model has used `cost_per_base_unit` since v1 and every
                  costing path reads it by that name.

   The three history logs share ONE point shape, `{t, v}`, and differ only in
   which column carries the value. That is why they get one pair of mappers
   with the column named, not three near-copies.
   ============================================================================ */

/* --- products (UI "Products"; table `ingredients`) --- */
function ingredientToRow(p){ return {
  id:p.id, description:p.description, brand:p.brand||null, category:p.category||null,
  sub_category:p.sub_category||null, item_type:p.item_type||null, base_unit:p.base_unit||null,
  cost_per_base_unit:(p.cost_per_base_unit==null?null:p.cost_per_base_unit), cost_basis:p.cost_basis||null,
  is_food:(p.is_food!==false), pack_size_raw:p.pack_size_raw||null, sold_by:p.sold_by||null,
  current_price_exgst:(p.current_price_exgst==null?null:p.current_price_exgst),
  price_as_of:(p.price_as_of||null), search_aliases:(p.search_aliases||[]),
  supplier:p.supplier||null,
  pack_qty:(p.pack_qty==null?null:p.pack_qty), pack_unit:p.pack_unit||null,
  /* v108: was `!BASE_IDS.has(p.id)`, derived from the deleted literal. Now it round-trips: a base row
     arrives from the server carrying false and keeps it, while a product the app is CREATING has no
     is_custom at all and is custom by definition. Same `!==false` shape as is_food above, and the
     default falls the safe way — mislabelling a custom product as base would hide it from nothing the
     app reads (no product path reads is_custom), but it would corrupt the column that tells a restore
     which rows the user made. */
  is_custom:(p.is_custom!==false) }; }
/* v108: the read direction, which did not exist before — bootstrapSync used the raw row AS the override
   object (`ov[r.id]=r`). That worked only because `ingredients` columns happen to match the product model
   field-for-field, i.e. by luck rather than by design, and it left no place to normalise a value. Named
   here so the luck is documented and the pair is symmetric.
   The `Number()` calls are DEFENSIVE, not a fix: checked against production 1 Aug 2026, PostgREST returns
   `numeric` as a JSON number, so they are identity today. They are here because the column type is what
   guarantees that, not the client, and a `numeric` read as a string would corrupt costing silently rather
   than throw. `search_aliases` is jsonb and can arrive null on a row written before the column's default. */
function rowToIngredient(r){ return {
  id:r.id, description:r.description, brand:r.brand||null, category:r.category||null,
  sub_category:r.sub_category||null, item_type:r.item_type||null, base_unit:r.base_unit||null,
  cost_per_base_unit:(r.cost_per_base_unit==null?null:Number(r.cost_per_base_unit)),
  cost_basis:r.cost_basis||null, is_food:(r.is_food!==false),
  pack_size_raw:r.pack_size_raw||null, sold_by:r.sold_by||null,
  current_price_exgst:(r.current_price_exgst==null?null:Number(r.current_price_exgst)),
  price_as_of:(r.price_as_of||null), search_aliases:(Array.isArray(r.search_aliases)?r.search_aliases:[]),
  supplier:r.supplier||null,
  pack_qty:(r.pack_qty==null?null:Number(r.pack_qty)), pack_unit:r.pack_unit||null,
  // v108: carried into the model now that BASE_IDS is gone — it is the only remaining record of which
  // rows the user made. Nothing renders it; it exists so the write direction can put it back unchanged.
  is_custom:(r.is_custom!==false) }; }

/* --- dishes / menu items (table `menu_items`) — the case-crossing one --- */
// v55: a dish links to its plate via menu_items.plate_id (canonical). source_plate_id is legacy — still
// READ as a fallback for rows not yet migrated, never relied on as the primary link.
function rowToMenu(r){ return {id:r.id, section:r.section, name:r.name, price:r.price, notes:r.notes||'', custom:!!r.is_custom, menuId:(r.menu_id||'MENU_ORIGINAL'), plateId:(r.plate_id||r.source_plate_id||null), sourcePlateId:(r.source_plate_id||null)}; }
/* v108: extracted verbatim from dbPushMenu's inline object literal. Same values, same plate_id/
   source_plate_id mirroring (v55 rollout) — the point is that the column names now appear once. */
function menuToRow(item){ var pid=(item.plateId||item.sourcePlateId||null); return {
  id:item.id, section:item.section, name:item.name, price:item.price, notes:item.notes||null,
  is_custom:true, menu_id:(item.menuId||'MENU_ORIGINAL'), plate_id:pid, source_plate_id:pid }; }

/* --- plates (table `plates`) --- */
// v55: plates.menu_id is legacy (a plate no longer belongs to one dish). Not read into the model anymore.
function rowToPlate(r){ return {id:r.id, name:r.name, lines:Array.isArray(r.lines)?r.lines:[], category:(r.category||null)}; }
// v55: menu_id is deliberately absent from the write — the legacy column keeps whatever it had and is
// never read. category (§J) is the plate library's own grouping, independent of per-menu sections.
function plateToRow(sp){ return {id:sp.id, name:sp.name, lines:sp.lines||[], category:(sp.category||null)}; }

/* --- menus (table `menus`) — NOTE: `menus` holds MENUS; `menu_items` holds DISHES.
   `rowToMenu` above maps a DISH despite its name (v55 naming, pinned by tests). Do not rename it;
   read the table name, not the function name. --- */
function rowToMenuRecord(r){ return {id:r.id, name:r.name, season:(r.season||null)}; }
function menuRecordToRow(m){ return {id:m.id, name:m.name, season:m.season||null}; }

/* --- the change log (table `menu_change_log`, v114) — what MAX DID, as opposed to what the suppliers
   did. Supplier price movements live in `ing_price_history` and must never reach this table; the line
   is drawn at a function rather than at a list, because every product-price write in the app funnels
   through `setProduct` and nothing else. See 20260806_menu_change_log.sql for the full reasoning.
   `t` is epoch MILLISECONDS in memory (matching the three history logs) and timestamptz on the server.
   menuIds is always an ARRAY — one user action is one entry, listing every menu it touched. --- */
function rowToChange(r){
  if(!r || !r.id) return null;
  var t=new Date(r.recorded_at).getTime();
  // Same rule as rowToPoint: an unparseable timestamp is DROPPED, never admitted as NaN. A NaN `t`
  // sorts unpredictably, and this series exists to be placed against a chart's time axis.
  if(!isFinite(t)) return null;
  // Finite-or-null, matching changeEntry rather than merely coercing: Number('rubbish') is NaN, and a NaN
  // in this series is the same hazard the timestamp check above guards against.
  var num=function(x){ var n=(x==null||x==='')?null:Number(x); return (typeof n==='number' && isFinite(n))?n:null; };
  return {id:r.id, t:t, kind:r.kind||'', plateId:r.plate_id||null, dishId:r.dish_id||null,
    menuIds:Array.isArray(r.menu_ids)?r.menu_ids:[],
    avgBefore:num(r.avg_before), avgAfter:num(r.avg_after),
    costBefore:num(r.cost_before), costAfter:num(r.cost_after),
    detail:(r.detail&&typeof r.detail==='object')?r.detail:{}};
}
function changeToRow(e){ return {
  id:e.id, recorded_at:(typeof e.t==='string'?e.t:new Date(e.t).toISOString()), kind:e.kind,
  plate_id:e.plateId||null, dish_id:e.dishId||null, menu_ids:Array.isArray(e.menuIds)?e.menuIds:[],
  avg_before:e.avgBefore==null?null:e.avgBefore, avg_after:e.avgAfter==null?null:e.avgAfter,
  cost_before:e.costBefore==null?null:e.costBefore, cost_after:e.costAfter==null?null:e.costAfter,
  detail:e.detail||{} }; }

/* --- supplier memory (table `supplier_phrases`) --- */
function rowToSupplierPhrase(r){ return {id:r.id, supplier:r.supplier, phrase_norm:r.phrase_norm, qty:Number(r.qty), unit:r.unit}; }
function supplierPhraseToRow(e){ return {id:e.id, supplier:e.supplier, phrase_norm:e.phrase_norm, qty:e.qty, unit:e.unit, updated_at:new Date().toISOString()}; }

/* --- the three history logs, one shape `{t, v}` ---
   `valueCol` is the only thing that differs: price_history -> avg_food_cost_pct,
   menu_price_history -> price, ing_price_history -> cost_per_base_unit.
   `t` is epoch MILLISECONDS in memory and timestamptz on the server; the conversion is here and
   only here. A row whose timestamp will not parse is DROPPED rather than admitted as NaN — a NaN
   `t` sorts unpredictably and would poison every chart and band that reads the series. */
function rowToPoint(r, valueCol){
  var raw=r?r[valueCol]:null;
  // The null check is SEPARATE from isFinite on purpose: Number(null) is 0 and Number('') is 0, both
  // finite, so a null price column would have become a REAL-LOOKING $0.00 point rather than a dropped
  // one — a fabricated observation in a series the dashboard draws bands from. (Caught by
  // row-boundary.test.js when this mapper was written; 0 itself is legitimate — P0277 costs 0.)
  if(raw==null || raw==='') return null;
  var t=new Date(r.recorded_at).getTime(), v=Number(raw);
  if(!isFinite(t) || !isFinite(v)) return null;
  return {t:t, v:v};
}
function pointToRow(t, v, valueCol, keyCol, keyVal){
  var row={recorded_at:(typeof t==='string'?t:new Date(t).toISOString())};
  row[valueCol]=v; if(keyCol) row[keyCol]=keyVal;
  return row;
}
/* Group history rows into `{key: [{t,v}]}` — the shape menuHistory / menuPriceLog / ingPriceLog all use.
   `keyCol` null means the ungrouped all-menus series (price_history rows with a null menu_id). */
function rowsToSeries(rows, valueCol, keyCol){
  var out=keyCol?{}:[];
  (rows||[]).forEach(function(r){
    var pt=rowToPoint(r, valueCol); if(!pt) return;
    if(!keyCol){ out.push(pt); return; }
    var k=r[keyCol]; if(k==null) return;
    (out[k]||(out[k]=[])).push(pt);
  });
  return out;
}

/* writes */
function dbPushIngredient(id){ var p=byId[id]; if(!p) return; pushWrite(function(){ return SUPA.from('ingredients').upsert(ingredientToRow(p)); }, 'ingredient'); }
// v55: write plate_id (canonical) and MIRROR it to source_plate_id, so a device still running v54 keeps
// resolving the dish's plate during the rollout. Requires the plate_id migration applied first (v43 lesson).
// v108: the row literal moved to menuToRow — this is the write, not the translation.
function dbPushMenu(item){ return pushWrite(function(){ return SUPA.from('menu_items').upsert(menuToRow(item)); }, 'menu item'); }
function dbUpsertMenuRecord(m){ return pushWrite(function(){ return SUPA.from('menus').upsert(menuRecordToRow(m)); }, 'menu'); }
// v55: a plate no longer carries a menu link (many-to-many lives on menu_items.plate_id). menu_id is left
// out of the write — the legacy column keeps whatever it had and is never read. category (§J) is the plate
// library's own grouping (independent of per-menu sections).
function dbPushPlate(sp){ if(!sp) return Promise.resolve(null); return pushWrite(function(){ return SUPA.from('plates').upsert(plateToRow(sp)); }, 'plate'); }
// v112: returns its promise. It could not be sequenced before, which is exactly why the plate delete
// used to race the dish deletes that must precede it — see dbDeletePlateAfterDishes.
function dbDeletePlate(id){ return pushWrite(function(){ return SUPA.from('plates').delete().eq('id',id); }, 'plate delete'); }
// v108 (D3): products are really deleted now — the tombstone list that used to hide them is gone.
function dbDeleteIngredient(id){ return pushWrite(function(){ return SUPA.from('ingredients').delete().eq('id',id); }, 'product delete'); }
// v114: RETURNS its pushWrite, where it used to drop it. Same one-word gap v112 closed on dbDeleteMenu /
// dbDeletePlate: a helper that swallows its promise cannot be sequenced by anyone, however much a caller
// wants to. The ingredient paths need it — a change-log entry must not be written for a change the
// server refused. Existing callers ignore the return and are unaffected.
function dbSetSetting(key,val){ return pushWrite(function(){ return SUPA.from('app_settings').upsert({key:key, value:val}); }, 'setting'); }
/* v114: the change log is INSERT-only by policy as well as by intent — there is no dbUpdateChange or
   dbDeleteChange, and the table grants neither to the app's role.
   ⚠️ THE LATCH IS THE POINT, AND THE BOOT PROBE IS NOT ENOUGH ON ITS OWN. The probe is a SELECT; what it
   authorises is an INSERT, and those fail independently. The migration creates the table, the grants, RLS
   and then two policies as separate statements — so a half-applied run (an editor session that stops on
   an error, someone pasting only the create block) leaves a table that READS 200-with-no-rows and REFUSES
   every insert with 42501. That is the exact shape v90's menu_price_history came up in. Without this,
   `changeLogSupported` would latch true and every plate save, dish edit, repoint and delete would fire a
   doomed insert and a red toast, once per action, forever. One failure is enough to stop trying. */
function dbPushChange(e){
  return Promise.resolve(pushWrite(function(){ return SUPA.from('menu_change_log').insert(changeToRow(e)); }, 'your change history'))
    .then(function(r){ if(!r || r.error) changeLogSupported=false; return r; },
          function(){ changeLogSupported=false; return null; });
}

/* v108: seedIfEmpty is DELETED. It pushed BASE_PRODUCTS / BASE_MENU into empty tables on first run;
   both literals are gone, so it had nothing left to seed from — an empty database now stays empty,
   which is the honest answer. (The brief flagged its `count === 0` whole-table check as a
   multi-tenant hazard to note rather than fix; deleting the function retires that too, for free.)
   The tables were populated for real by 20260801_base_products_backfill.sql. */

/* v108: reconcileLocalOnly is DELETED, and this is the batch's single biggest simplification.
   It existed to heal ONE specific wound: pushWrite dropped writes silently when offline, so a dish
   or plate created with no signal lived only in localStorage, and blindly replacing local with the
   server snapshot would destroy it. Its whole premise was "a local row the server has never seen is
   probably a dropped write, so keep it and re-push".

   Both halves of that premise are now false. A write that fails says so loudly and is NOT applied as
   though it succeeded, so there is no such thing as a row the user believes is saved but isn't. And
   localStorage is no longer a data store, so a local-only row is not evidence of anything.

   Keeping it would have been worse than useless: it is the heal-vs-purge collision the 26 Jul audit
   said had no clean resolution without a write queue. Given a genuinely empty server read — the RLS
   failure this batch also hardens against — it would have resurrected every local row and re-pushed
   it, turning a permissions fault into a data-integrity one. The server snapshot is now simply the
   answer. */

/* ---- v108: the boot gate ----------------------------------------------------------------
   Online-only means that between first paint and the first fetch landing there is genuinely nothing
   to show. The brief's rule: default to an honest loading state, and never paint stale or empty data
   and swap it — that reintroduces two sources of truth in miniature, which is the ambiguity this
   batch removes.

   WHY THIS IS NOT THE SPLASH. The splash is a brand moment: index.html SKIPS it on a same-session
   refresh, and it gives up after 3s regardless. Both are wrong for data — a warm refresh would reveal
   an empty app, and a slow fetch would too. The gate is keyed to the DATA and has no timeout.

   FIRST BOOT ONLY. Pull-to-refresh and every later re-sync go through the same bootstrapSync, and
   flashing a full-screen gate over a working app on every refresh would be worse than useless. The
   sync pill already reports those.

   `bootReady` is what index.html's splash polls (window.__ezReady) — kept so the two cannot disagree
   about whether the app is usable. */
var _bootGateDone=false, _bootRetrying=false, _bootSlowTimer=null;
function bootGate(state, msg){
  var g=document.getElementById('bootGate'); if(!g) return;
  var showing=!g.hidden;
  /* Never re-gate a WORKING app — pull-to-refresh runs the same bootstrapSync and a full-screen
     overlay on every refresh would be worse than useless. But once the gate IS showing an error,
     'loading' must be allowed through or Try again looks dead: the sync reruns while the screen still
     says it failed. (CodeRabbit — my own test missed this because it never reached 'ok' first.) */
  if(_bootGateDone && state!=='error' && !showing) return;
  var m=document.getElementById('bootGateMsg'), r=document.getElementById('bootGateRetry');
  if(state==='loading'){
    g.hidden=false; g.classList.remove('is-error'); if(r) r.hidden=true; if(m) m.textContent=msg||'Loading your data…';
    /* v115: after a week idle the FIRST request pays Supabase's cold start (~1.1s measured, on top
       of the fetch) — and week-long gaps are the normal case here, so the patient message is the
       honest one. Swapped in place after 4s rather than shown up front: a warm boot (200–300ms)
       never sees it. The timer dies with the gate ('ok'/'error' both clear it). */
    if(_bootSlowTimer) clearTimeout(_bootSlowTimer);
    _bootSlowTimer=setTimeout(function(){
      var g2=document.getElementById('bootGate'), m2=document.getElementById('bootGateMsg');
      if(g2 && !g2.hidden && !g2.classList.contains('is-error') && m2) m2.textContent='Still loading — the first open after a break takes a little longer.';
    }, 4000);
    return;
  }
  if(state==='ok'){ _bootGateDone=true; _bootRetrying=false; g.hidden=true; g.classList.remove('is-error'); if(_bootSlowTimer){ clearTimeout(_bootSlowTimer); _bootSlowTimer=null; } return; }
  // error / offline: say which, offer the one action that can help, and keep the app's chrome usable
  if(_bootSlowTimer){ clearTimeout(_bootSlowTimer); _bootSlowTimer=null; }   // v115 (review): the patient message must never overwrite an error — cleared here, not just guarded
  g.hidden=false; g.classList.add('is-error'); _bootRetrying=false;
  if(m) m.textContent=msg||'Couldn’t load your data.';
  if(r){ r.hidden=false; r.onclick=function(){
    if(_bootRetrying) return;                               // a second tap must not race a second boot
    _bootRetrying=true; bootGate('loading','Trying again…'); bootstrapSync();
  }; }
}
function bootReady(state, msg){ window.__ezReady=true; bootGate(state, msg); }

/* pull everything from Supabase and refresh the UI */
async function bootstrapSync(){
  /* v108: no client and no connection are DIFFERENT failures and say so. Neither falls back to
     rendering whatever localStorage happens to hold — under online-only that is not "saved data",
     it is data of unknown age with no way to tell the user how old it is. */
  if(!SUPA){ setSync('offline'); bootReady('error','This device can’t reach your database. Check the app’s configuration.'); return; }
  if(!navigator.onLine){ setSync('offline'); bootReady('error','You’re offline. EzPlate needs a connection to load your products, plates and menus.'); return; }
  bootGate('loading');
  setSync('loading');
  try{
    /* v108 — ONE ROUND TRIP INSTEAD OF SEVEN. Measured against production 1 Aug 2026: the old shape
       (a 4-query batch followed by five sequential awaits) took ~915ms wall clock; all of it in one
       Promise.all takes 181-333ms. Nothing in the chain ever needed the sequencing — it was historical.
       Bytes were never the problem: Supabase serves gzip, so the whole payload is ~36 KB on the wire
       (259 KB decoded), and 25 KB of that is `ingredients`. LATENCY dominates, and each extra await
       costs a full round trip on a phone. That 4x matters because the honest loading state below is
       only honest if it is short.

       REQUIRED vs OPTIONAL. ingredients / menu_items / plates / app_settings must load or the app has
       nothing to show — their errors throw to the catch and raise the error state, which is the point
       of online-only: no partial render pretending to be real. The rest are wrapped in `soft` so a
       missing table or column degrades one feature instead of killing the boot (schema-can-lag —
       these tables genuinely arrived in later migrations). supabase-js RESOLVES with {error} rather
       than rejecting, so `soft` only catches a genuine network throw.

       THE TWO SCHEMA PROBES ARE GONE. `price_history.select('menu_id').limit(1)` and the
       `menu_price_history` equivalent each cost a round trip purely to ask "does this column exist".
       Naming the columns explicitly makes the REAL query answer the same question — it errors if the
       column is missing — so support is now read off the query that had to happen anyway. */
    var soft=function(p){ return Promise.resolve(p).then(function(r){ return r; }, function(e){ return {error:e}; }); };
    var results=await Promise.all([
      SUPA.from('ingredients').select('*'),
      SUPA.from('menu_items').select('*'),
      SUPA.from('plates').select('*'),
      SUPA.from('app_settings').select('*'),
      soft(SUPA.from('menus').select('*')),
      soft(SUPA.from('price_history').select('recorded_at,avg_food_cost_pct,menu_id').order('recorded_at',{ascending:true})),
      soft(SUPA.from('menu_price_history').select('recorded_at,price,menu_item_id').order('recorded_at',{ascending:true})),
      soft(SUPA.from('supplier_phrases').select('*')),
      soft(SUPA.from('ing_price_history').select('recorded_at,cost_per_base_unit,product_id').order('recorded_at',{ascending:true})),
      // v114: DESCENDING + limit, unlike every read above it. The others are bounded by the data (412
      // products, 78 dishes); this one grows for as long as the app is used, and it is on the boot
      // critical path. Newest-500 is the window the chart can draw; the server keeps the lot.
      soft(SUPA.from('menu_change_log').select('*').order('recorded_at',{ascending:false}).limit(500))
    ]);
    var ing=results[0], men=results[1], pla=results[2], setg=results[3];
    var mres=results[4], _h=results[5], _mp2=results[6], spr=results[7], _ipl=results[8], _chg=results[9];
    // v108: setg.error belongs here and was missing (CodeRabbit). app_settings is not a nice-to-have —
    // it carries `kitchen_ingredients`, so a failed read empties every kitchen word AND silently drops
    // the food-cost target back to its 40% default, which moves every suggested price on the Menu tab.
    // Falling back to an empty settings list is exactly the partial-render-pretending-to-be-real that
    // online-only exists to stop.
    if(ing.error||men.error||pla.error||setg.error) throw (ing.error||men.error||pla.error||setg.error);
    menuHistSupported = !(_h && _h.error);                 // the query IS the probe now
    menuPriceHistSupported = !(_mp2 && _mp2.error);
    /* v114: probe-by-query, so an unapplied migration records nothing rather than toasting on every
       save. This covers the table being ABSENT only — a table that reads but refuses writes is caught by
       dbPushChange's latch instead, and both are needed. */
    changeLogSupported = !(_chg && _chg.error);
    /* MERGE, not replace — the same reason menuHistory and menuPriceLog merge.
       An earlier draft replaced wholesale, on the reasoning that "the log is written only after the
       server confirmed the change, so a local-only entry is one for something that did not happen".
       THAT REASONING IS WRONG and it is worth stating why, because it reads as airtight:
       logChangeIfSaved confirms the write that CARRIES the change — the plate row, the dish row, the
       settings blob. It says nothing about whether the log's own insert landed. So a local-only entry is
       an entry for something that DID happen whose insert failed, and replacing would delete the one
       record this table exists to keep, at the next reload, silently. (pushWrite still has no queue and
       no retry — CLAUDE.md's known gap.)
       Server wins on a shared id; a local-only entry survives; the newest 500 are kept. Reversed first
       because the query is newest-first, while memory keeps the same ascending order as every other
       series, so a chart never has to ask which way round this one runs. */
    if(changeLogSupported && _chg && _chg.data){
      changeLog=mergeChangeLog(_chg.data.map(rowToChange).filter(Boolean).reverse(), changeLog);
    }
    // v108: through the boundary, not the raw row. Was `ov[r.id]=r` — see rowToIngredient on why that
    // worked by luck rather than design.
    var ov={}; (ing.data||[]).forEach(function(r){ ov[r.id]=rowToIngredient(r); }); productsById=ov; rebuild();
    var setRows=(setg&&setg.data)?setg.data:[];
    /* v108 (D3): the two tombstone settings are no longer READ. They existed because deletion had to
       survive a hardcoded base layer that re-added the row on every rebuild, and reconcileLocalOnly,
       which needed telling which absences were deliberate. Both are gone, so a tombstone is a second,
       weaker way of saying "deleted" — the third category the brief rules out. The app_settings rows
       are left in the database on purpose: dropping them is not reversible if this batch is rolled
       back, and they cost nothing unread. They can be cleared in a later tidy. */
    var kiRow=setRows.filter(function(r){return r.key==='kitchen_ingredients';})[0];
    if(kiRow&&Array.isArray(kiRow.value)){ kitchenIngredients=kiRow.value; rebuildKById(); }
    var kwsRow=setRows.filter(function(r){return r.key==='king_wiz_skips';})[0];                 // ITEM 4 (v35): wizard skips are shared across staff devices
    if(kwsRow&&Array.isArray(kwsRow.value)){ setKingWizSkips(kwsRow.value); }
    // v108: THE SERVER SNAPSHOT IS THE ANSWER. Was a reconcileLocalOnly heal-and-re-push for both
    // dishes and plates (v42/v55) — see the note where that function used to live. With writes that
    // can no longer fail quietly, a local row the server has never seen is not evidence of a dropped
    // write, and treating it as one would resurrect rows on the RLS-empty read this batch hardens
    // against. The re-push chain (plate first, then the dish that references it) went with it; the
    // ordering rule itself is unchanged and still lives in dbPushMenuAfterPlate for real publishes.
    customMenu=(men.data||[]).map(rowToMenu);
    /* v54/v108: a SUCCESSFUL EMPTY read is the user having deleted every menu, and zero menus is a
       legitimate state — so it must be respected, not re-seeded. Seed only when the table did not
       answer at all (it may not exist on an older project). */
    var menusRead = !!(mres && !mres.error && Array.isArray(mres.data));
    if(menusRead) menusList=mres.data.map(rowToMenuRecord);
    else ensureDefaultMenu();
    if(!menusList.some(function(m){return m.id===currentMenuId;})) setCurrentMenuId(fallbackMenuId());
    savedPlates=(pla.data||[]).map(rowToPlate); rebuildMenu();
    // v89/v108: support is read off the fetch above — naming menu_id in the select means the query
    // fails exactly when the column is missing, which is what the separate probe used to establish.
    if(_h && _h.data){
      // v89: NULL menu_id = the all-menus aggregate (every pre-v89 row). Rows carrying a menu_id are
      // the per-menu series and are kept apart, so priceHistory means exactly what it always meant.
      // v108: split through the boundary layer. rowsToSeries drops unparseable points rather than
      // admitting NaN — see rowToPoint. Two passes so each series states which rows it wants.
      var _all=rowsToSeries(_h.data.filter(function(r){ return !r.menu_id; }), 'avg_food_cost_pct', null);
      var _bym=rowsToSeries(_h.data.filter(function(r){ return !!r.menu_id; }), 'avg_food_cost_pct', 'menu_id');
      priceHistory=_all;
      // v89: MERGE, don't replace. pushWrite still drops writes silently when fully offline (a known gap,
      // CLAUDE.md Data-write rules), so a point logged on a café phone with no signal exists only in
      // localStorage. Replacing wholesale would delete it on the next sync — cost history Max can never
      // get back. Server points win on identical timestamps; local-only points survive. (CodeRabbit, v89.)
      // NOTE: the all-menus priceHistory above still replaces wholesale and has the same gap — untouched
      // here deliberately, it predates this batch and everything reads it. Flagged in the handover.
      if(menuHistSupported){ menuHistory=mergeMenuHistory(_bym, menuHistory); }
    }
    // v90: the sell-price log. Same MERGE rather than replace, for the same reason as above.
    // menuPriceLog has the identical {key: [{t,v}]} shape as menuHistory, so mergeMenuHistory serves both.
    if(menuPriceHistSupported && _mp2 && _mp2.data){
      var _byItem=rowsToSeries(_mp2.data, 'price', 'menu_item_id');
      menuPriceLog=mergeMenuHistory(_byItem, menuPriceLog);
    }
    /* v107: an EMPTY server read must never wipe local supplier memory. Server-wins is deliberate —
       it is how a phrase deleted on one device disappears from the others — but a successful-but-empty
       read and an RLS-blocked read are indistinguishable over PostgREST (the same ambiguity CLAUDE.md
       records for menu_price_history), so a policy fault on supplier_phrases presented as "zero rows"
       and destroyed every taught pack, saving over the local copy in the same breath. Taught packs are
       user-confirmed ground truth with no other copy; keeping a stale entry costs one Remove, losing
       them all costs a re-teach per phrase. Accepted trade: deleting your LAST remaining phrase no
       longer propagates across devices. Local is re-pushed so the server heals rather than diverges. */
    /* v108: the per-product price log arrives from the server for the first time. Straight replace,
       not a merge: mergeMenuHistory existed to protect points that only lived locally because a write
       had been dropped, and writes can no longer be dropped silently. Trimmed to the same 60-point
       window logIngPrice keeps, so memory holds the recent series while the server keeps all of it. */
    if(_ipl && !_ipl.error && Array.isArray(_ipl.data)){
      var _series=rowsToSeries(_ipl.data, 'cost_per_base_unit', 'product_id');
      Object.keys(_series).forEach(function(pid){ var a=_series[pid]; if(a.length>60) _series[pid]=a.slice(-60); });
      ingPriceLog=_series;
    }
    if(spr && !spr.error && Array.isArray(spr.data)){
      var mm={}; spr.data.forEach(function(r){ mm[r.id]=rowToSupplierPhrase(r); });
      var localIds=Object.keys(supplierMem);
      if(!spr.data.length && localIds.length){
        invDbg('[smem] server returned 0 rows but', localIds.length, 'held locally — keeping local, re-pushing');
        localIds.forEach(function(id){ if(typeof dbPushSupplierPhrase==='function') dbPushSupplierPhrase(supplierMem[id]); });
      } else { supplierMem=mm; }
    }   /* supplier_phrases table may not exist yet -> keep local */
    var impRow=setRows.filter(function(r){return r.key==='last_invoice_import';})[0];
    if(impRow && impRow.value){ try{ localStorage.setItem('cafeDB_lastImport', impRow.value); }catch(e){} }
    var cogsRow=setRows.filter(function(r){return r.key==='food_cost_target';})[0];
    if(cogsRow && cogsRow.value!=null){ var pv=parseFloat(cogsRow.value); if(pv>=1&&pv<=99){ cogsPct=pv; var ci2=document.getElementById('setCogsInput'); if(ci2)ci2.value=pv; } }   // v115: syncCogsRead gone with the .cogs-meta line
    var gstRow=setRows.filter(function(r){return r.key==='gst_default';})[0];                    // ITEM 6 (v35): brand-new accounts have no row -> loadGstDefault's 'ex' stands, preserving current behaviour
    if(gstRow && (gstRow.value==='inc'||gstRow.value==='ex')){ setGstDefault(gstRow.value,false); var gi=document.getElementById('setGstDefault'); if(gi)gi.value=gstRow.value; }
    // v81: AI feature toggles round-trip across devices (no row -> the load*() default of ON stands, unchanged behaviour)
    var aiInvRow=setRows.filter(function(r){return r.key==='ai_invoice_check';})[0];
    if(aiInvRow && typeof aiInvRow.value==='boolean'){ setAiInvoiceCheck(aiInvRow.value,false); var aic2=document.getElementById('setAiInvoiceChk'); if(aic2)aic2.checked=aiInvoiceCheck; }
    var aiSugRow=setRows.filter(function(r){return r.key==='ai_suggestions';})[0];
    if(aiSugRow && typeof aiSugRow.value==='boolean'){ setAiSuggestions(aiSugRow.value,false); var asg2=document.getElementById('setAiSuggestChk'); if(asg2)asg2.checked=aiSuggestions; }
    // v74: the v71 'suggest_fab_hidden' synced setting is retired — the insights are a static inline pill now,
    // nothing to hide. An old value left in the DB/localStorage is simply ignored (no reader remains).
    buildMenuOptions(); buildMenuSelector(); renderPlate(); renderPlatesTab(); renderAnalysis(); updateLastImport(); updateEditTag();
    setSync('ok'); bootReady('ok');
  }catch(err){
    console.error('[sync] load failed:', err); setSync('error');
    // v108: an error state, NOT a silent fall back to whatever is in localStorage. errText surfaces
    // the real reason (an RLS refusal reads very differently from a dropped connection).
    bootReady('error', 'Couldn’t load your data: '+errText(err));
  }
}
/* ================== end Supabase data layer ================== */

/* ITEM 5 — pull-to-refresh entry point. bootstrapSync re-fetches all shared
   stores and repaints; it does NOT touch plate[] or the plate-name input, so
   an in-progress build survives a refresh. Safe to call repeatedly. */
function refreshFromCloud(){
  if(!SUPA || !navigator.onLine){ toast('Offline \u2014 showing saved data'); return Promise.resolve(); }
  return Promise.resolve(bootstrapSync()).then(function(){ rerenderCurrentTab(); }, function(){ rerenderCurrentTab(); });
}


/* v108 — THE LOCAL DATA MIRRORS ARE RETIRED.
   (The eight key constants they used — OVRKEY, KINGKEY, MENUKEY, PLATEKEY, HISTKEY, MHISTKEY,
   MPLKEY, GSTKEY — are deleted with them. The KEYS themselves are never reused: an old browser
   profile may still hold those entries, and a future reader must not mistake them for live stores.)
   Every store below used to be `var x = loadX()` at module scope plus a `saveX()` that wrote
   localStorage. That is what made localStorage a second source of truth: the app hydrated from it
   synchronously before a byte arrived from the server, and kept writing a copy that nothing could
   tell the age of.

   Now: each store initialises EMPTY and is filled by bootstrapSync's single batch, and the boot gate
   holds the UI until that lands, so nothing paints against an empty store. The loadX functions are
   deleted outright.

   The saveX functions are KEPT AS NO-OPS ON PURPOSE, and this is a deliberate trade rather than an
   oversight. They have ~50 call sites; deleting the writes is what matters for correctness, while
   collapsing 50 call sites is a large mechanical diff whose only benefit is tidiness — and four of
   them are the sole body of an `if`, where a careless removal leaves a dangling branch. The bodies
   are gutted here (so no business data reaches localStorage), and the call sites are a separate,
   safely-reviewable follow-up. Named in the handover so it is not mistaken for dead code nobody
   noticed. Each is a one-line comment stating what the persistence actually is now: a server push.
*/
let productsById = {};

let PRODUCTS, byId;
/* v108: THE MERGE IS GONE. This was `BASE_PRODUCTS` seeded into a map, then `productsById` layered on
   top, because localStorage held deltas against a hardcoded base. `productsById` now holds the whole
   catalogue as read from `ingredients`, so there is one layer and nothing to reconcile.
   The variable is still called `productsById` and no longer means productsById — renaming it is deferred to
   the phase that removes the localStorage read entirely, so that the deletion diff and the rename diff
   stay separately reviewable. Named in the handover so it is not mistaken for an oversight.
   v108 (D3): the deletedProdIds filter is gone too — a deleted product is a deleted ROW now. */
function rebuild(){
  const map = new Map();
  for(const id in productsById) map.set(id, Object.assign({}, productsById[id]));
  PRODUCTS = [...map.values()];
  byId = Object.fromEntries(PRODUCTS.map(p=>[p.id, p]));
}
/* v109 — the ONE place a product price becomes a history point.
   ROOT CAUSE of the gap this replaces: `logIngPrice` was called from TWO call sites kept in step by
   discipline (the builder hand-edit and invoice-confirm's matched branch), and the Products-tab edit
   form was simply missed — so a price edited there left no trace at all. Max edited two prices on
   31 Jul; the export showed 33 points, newest 15 Jul, with neither of them in it. Product CREATION
   (submitNew, applyInvoice's add-new branch) logged nothing either, which is worse than it reads:
   `ingPriceAt` returns null before a product's first point, so a product created and later re-priced
   has no "was" to have moved from, and the movers card / insight family 1 can say nothing about it.
   Every price write already funnels through here — the only writers that touch productsById directly
   are applyTidy (category/brand/supplier) and bootstrapSync (fills the object, never calls this) —
   so this is where the log belongs.
   THE INVARIANT, stated because it is an invariant and not a guarantee: a product price is only ever
   changed by calling setProduct. There is exactly one shape that could break it — assigning into
   productsById directly, which applyTidy already does (`productsById[pt.id][col]=pt.value`, with
   `col` a runtime value, not a literal). That is safe today because tidy's field is only ever
   category/brand/supplier, but nothing in the code CONSTRAINS it to those. Anything new that writes
   a price must come through here, or it will be invisible to history exactly as saveIngEdit was.
   THE CONDITION IS THE PREVIOUS STORED PRICE, not the last logged point. logIngPrice dedupes against
   the LOG, and nearly every product's log is empty (33 points across 412 products), so a non-price
   write — applyInvoice's pack teach, which patches pack_qty/pack_unit only — would have sailed past
   that dedupe and fabricated a point for a change that never happened. The two guards compose: this
   one asks "did the stored price move", logIngPrice's asks "is this a new observation". */
function setProduct(id, patch){
  var had=productsById[id]?productsById[id].cost_per_base_unit:undefined;
  productsById[id] = Object.assign({}, productsById[id]||{}, patch);
  rebuild(); dbPushIngredient(id);
  if(patch && Object.prototype.hasOwnProperty.call(patch, 'cost_per_base_unit')){
    var now=patch.cost_per_base_unit;
    // had==null covers a brand-new product (undefined) and a product that never had a price: both are
    // a first observation, not a no-op. Max's call, 3 Aug — one row, and it is the difference between
    // a product's first price move being reconstructible and being invisible.
    if((had==null || !samePrice(had, now)) && logIngPrice(id, now)) saveIngLog();
  }
}
rebuild();

function unitNoun(p){return p.base_unit==='g'?'g':p.base_unit==='ml'?'ml':p.base_unit==='ea'?'unit':'';}
function displayUnitWord(p){return p.base_unit==='g'?'kg':p.base_unit==='ml'?'L':'unit';}
function defaultQty(p){return null;}   // v60 (Max): new lines start EMPTY (blank field) — a quantity must be entered before the plate can be saved (see saveCurrentPlate)
function cpbu(p){return p.cost_per_base_unit;}
function perDisplayValue(p){const c=cpbu(p);if(c==null)return null;return (p.base_unit==='g'||p.base_unit==='ml')?c*1000:c;}
function unitCostStr(p){const c=cpbu(p);if(c==null)return '—';
  if(p.base_unit==='g')return '$'+(c*1000).toFixed(2)+'/kg';
  if(p.base_unit==='ml')return '$'+(c*1000).toFixed(2)+'/L';
  if(p.base_unit==='ea')return '$'+c.toFixed(2)+'/unit';return '—';}
function money(x){return '$'+x.toFixed(2);}
function lineCost(p,qty){if(!p)return null;const c=cpbu(p);return c==null?null:qty*c;}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}

/* ============================================================
   Phase 2 — "kitchen words": a kitchen ingredient is a name that
   points at exactly one product. Recipes reference the ingredient;
   swapping its product re-prices every recipe with ZERO plate writes.
   Store: localStorage mirror + the app_settings row 'kitchen_ingredients'.
   ============================================================ */
var kitchenIngredients=[];
var kById={};
function rebuildKById(){ kById={}; (kitchenIngredients||[]).forEach(function(k){ if(k&&k.id) kById[k.id]=k; }); }
rebuildKById();
// v114: returns the write, so a caller that must know whether the server took the change can chain off
// it (see logChangeIfSaved). Callers that ignore the return are unaffected.
function saveKitchenIngredients(){ rebuildKById(); return (typeof dbSetSetting==='function') ? dbSetSetting('kitchen_ingredients', kitchenIngredients) : null; }
function nextKid(){                                                   // 'K0001' + zero-padded, stable across the store
  var max=0; (kitchenIngredients||[]).forEach(function(k){ var n=parseInt(String(k.id||'').replace(/^K/,''),10); if(isFinite(n)&&n>max)max=n; });
  return 'K'+String(max+1).padStart(4,'0');
}
/* the one resolver every plate-line consumer uses to find a line's product */
function lineProduct(l){
  if(!l || l.misc) return null;
  if(l.kid){ var k=kById[l.kid]; return (k && byId[k.pid]) || null; }
  return byId[l.pid] || null;
}
/* a stable line signature for dirty-detection (kid + misc aware) */
function lineSig(l){
  if(!l) return '';
  if(l.misc) return 'misc:'+(l.label||'')+':'+(Number(l.cost)||0);
  return (l.kid?('K'+l.kid):l.pid)+':'+l.qty;
}

/* ---------- search ---------- */
/* v59: THE shared search matcher — token-order-independent, used by every list search bar
   (Products, Ingredients, Plates, Menu, builder #q). The query splits into whitespace tokens;
   EVERY token must appear as a substring of the (already-lowercased) haystack, in ANY order, so
   "gluten free bread" matches "Bread Gluten Free". Empty query matches everything. Callers build
   ONE lowercase haystack per item per render and reuse the tokenised query — no regex, no
   per-keystroke-per-row allocation. */
function searchTokens(q){ return String(q==null?'':q).toLowerCase().split(/\s+/).filter(Boolean); }
function matchTokens(tokens,hay){ for(var i=0;i<tokens.length;i++){ if(hay.indexOf(tokens[i])<0) return false; } return true; }
function hl(text,q){q=q.trim();if(!q)return esc(text);const i=text.toLowerCase().indexOf(q.toLowerCase());
  if(i<0)return esc(text);return esc(text.slice(0,i))+'<mark>'+esc(text.slice(i,i+q.length))+'</mark>'+esc(text.slice(i+q.length));}
const qEl=document.getElementById('q'), dropEl=document.getElementById('drop');
(function(){ var qc=document.getElementById('qClear'); if(qc&&qEl) qc.addEventListener('click',function(){ qEl.value=''; closeDrop(); qEl.focus(); }); })();   // v37: same clear affordance as every other search. v61 item 7 ROOT CAUSE: this used to hide the dropdown with an INLINE display none, which permanently beat .drop.open{display:block} — after one × clear, every later search rendered but stayed invisible (dead till reload). closeDrop() toggles the class only, so the dropdown re-opens normally.
let curList=[], hiIdx=-1;
function kitchenSearchMatches(q){                                     // v55 §G: match the kitchen word's name OR its linked product's description/brand (same as the pantry search, kingSearchFilter). Example: ingredient "Bread" -> product "Bread GF — TipTop" is found by "gf" or "tiptop".
  var list=kingSearchFilter(q, kitchenIngredients, byId).filter(function(k){ return k && k.name; });
  list.sort(function(a,b){ return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
  return list.slice(0,12).map(function(k){ return {__kid:true, id:k.id, name:k.name, pid:k.pid}; });
}
function pickListItem(it){ if(!it) return; if(it.__kid) addKitchenLine(it.id); }   // v59: create-from-search removed — ingredients are made on the Ingredients tab
function renderDrop(){
  const q=qEl.value;
  if(dropEl.style.display) dropEl.style.display='';                   // v61 item 7: never let an inline display override .drop.open — visibility is class-driven only
  curList=kitchenSearchMatches(q); hiIdx=-1;                          // BUILDER IS INGREDIENTS-ONLY: recipes are built from kitchen words, never raw supplier products
  if(!curList.length){
    // v83 item 7: the message holds a real BUTTON, and a listbox may only contain options — swap the
    // role while there are no results (restored below), so the action is exposed as an action.
    dropEl.setAttribute('role','group');
    dropEl.innerHTML=builderNoMatchHtml(q, plate.length>0);
    var go=dropEl.querySelector('.nomatch-go'); if(go) go.onclick=saveAndAddIngredients;
    dropEl.classList.add('open'); qEl.setAttribute('aria-expanded','true'); return;
  }
  dropEl.setAttribute('role','listbox');
  dropEl.innerHTML=curList.map((it,i)=>{
    const p=byId[it.pid];
    return `<div class="opt king-opt" role="option" data-i="${i}" data-kid="${esc(it.id)}">
       <span class="nm">${hl(it.name,q)} <span class="ca">${p?'\u2192 '+esc(p.description):'\u2192 (product missing)'}</span></span>
       <span class="uc">${p?unitCostStr(p):'\u2014'}</span></div>`;
  }).join('');
  dropEl.classList.add('open'); qEl.setAttribute('aria-expanded','true');
}
/* v83 item 7 — the builder's no-match state is an informative DEAD END, never a creation path.
   Creating an ingredient from here was deliberately removed in v59 and STAYS removed: the fuzzy matcher
   can't match abbreviations ("bread gf" does not find "Gluten Free Bread"), so "no match" is not a
   reliable enough signal to safely offer creation — it produced duplicate ingredients. What was missing
   was not a creation path but a way OUT that doesn't cost the user their plate: name what they searched,
   say where the ingredient is made, and — only when there are lines worth losing — offer ONE action that
   SAVES the plate and goes there. Pure, so both the copy and the ABSENCE of a creation affordance are
   testable. */
function builderNoMatchHtml(term, hasLines){
  var qt=(term||'').trim();
  if(!qt) return '<div class="opt opt-msg" style="cursor:default">Type to find an ingredient, or add one on the Ingredients tab.</div>';
  return '<div class="opt opt-msg nomatch" style="cursor:default">'
    +'<span class="nomatch-lead">No ingredient called “'+esc(qt)+'” yet.</span>'
    +(hasLines
      ? '<span class="nomatch-hint">Add it on the Ingredients tab — save your plate first and it’ll be waiting in Plates.</span>'
        +'<button class="btn nomatch-go" type="button">Save plate &amp; add ingredients</button>'
      : '<span class="nomatch-hint">Add it on the Ingredients tab, then come back.</span>')
    +'</div>';
}
/* The one action: save, then land on Ingredients. Routed through saveCurrentPlate so it obeys the SAME
   rules as the Save button — if the plate has no name or a line has no quantity the save is refused and
   we stay put with that error shown and focused, rather than navigating away from an unsaved plate. */
function saveAndAddIngredients(){
  if(!saveCurrentPlate(false)) return;
  closeDrop(); closeBuilder(); showTab('pantry');
}
function closeDrop(){dropEl.classList.remove('open');qEl.setAttribute('aria-expanded','false');hiIdx=-1;}
qEl.addEventListener('input',renderDrop);
qEl.addEventListener('focus',renderDrop);
qEl.addEventListener('keydown',e=>{
  if(!dropEl.classList.contains('open'))return;
  if(e.key==='ArrowDown'){e.preventDefault();hiIdx=Math.min(hiIdx+1,curList.length-1);paintHi();}
  else if(e.key==='ArrowUp'){e.preventDefault();hiIdx=Math.max(hiIdx-1,0);paintHi();}
  else if(e.key==='Enter'){e.preventDefault();const pick=hiIdx>=0?curList[hiIdx]:curList[0];pickListItem(pick);}
  else if(e.key==='Escape'){closeDrop();e.stopPropagation();}   // v137: an open drop is the top layer — don't let the modal's Escape handler close the modal too
});
function paintHi(){[...dropEl.children].filter(c=>c.hasAttribute('role')).forEach((c,i)=>c.classList.toggle('hi',i===hiIdx));const el=dropEl.querySelectorAll('[role="option"]')[hiIdx];if(el)el.scrollIntoView({block:'nearest'});}
dropEl.addEventListener('mousedown',e=>{const o=e.target.closest('.opt');if(!o)return;e.preventDefault();
  if(o.dataset.kid){ addKitchenLine(o.dataset.kid); }});   // v59: no create branch
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))closeDrop();});

/* v115: alternatives() ("Cheaper like-for-like") is DELETED with its one call site in
   renderKingAlts. Matching "like for like" honestly needs semantics this app does not have —
   unit + category pooling produced confident bad suggestions (a cheaper WRONG product is a worse
   outcome than no suggestion). The create-mode name suggestions (renderKingCreateSuggest, which
   shares the #king_alts box) are a different, honest mechanism and STAY. */

/* ---------- plate ---------- */
let plate=[], uidc=1;
const linesEl=document.getElementById('lines');
function addProduct(pid){const p=byId[pid];if(!p)return;plate.push({uid:uidc++,pid,qty:defaultQty(p)});qEl.value='';closeDrop();renderPlate();qEl.focus();}   /* legacy: no UI path since v31 (the builder is ingredients-only). RETAINED DELIBERATELY, v111: it is
   the only constructor of a pid-line reachable from a test, because `plate` is a `let` and therefore not
   a window property. pid-lines are live production data (84 of 179 plate lines) that reach the builder
   via loadPlateState, and four fresh-states specs cover their rendering through this door. Deleting it
   would trade one line for the only coverage of that shape. */
function addKitchenLine(kid){const k=kById[kid];if(!k)return;const p=byId[k.pid];plate.push({uid:uidc++,kid:kid,qty:p?defaultQty(p):null});qEl.value='';closeDrop();renderPlate();qEl.focus();}   /* v60: qty starts empty */
function removeLine(uid){plate=plate.filter(l=>l.uid!==uid);renderPlate();}
function setQty(uid,v){const l=plate.find(x=>x.uid===uid);if(!l)return;const s=(v==null?'':String(v)).trim();const n=parseFloat(s);l.qty=(s===''||isNaN(n))?null:Math.max(0,n);updateLine(uid);updateTotals();}   // v60: a cleared field is null (empty), not 0 — save requires a real quantity

function editPrice(uid){
  const l=plate.find(x=>x.uid===uid);if(!l)return;const p=lineProduct(l);if(!p)return;
  if(!['g','ml','ea'].includes(p.base_unit))return;
  const chip=document.getElementById('pc-'+uid);if(!chip)return;
  const word=displayUnitWord(p), val=perDisplayValue(p);
  chip.innerHTML='$<input class="pin" type="number" min="0" step="0.01" value="'+(val!=null?val.toFixed(2):'')+'"> /'+word;   // v55 §E3: autofilled price shows 2dp (the stored cost_per_base_unit stays exact until the user commits an edit)
  const inp=chip.querySelector('input'); inp.focus(); inp.select();
  let cancelled=false;
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inp.blur();}else if(e.key==='Escape'){cancelled=true;renderPlate();e.stopPropagation();}});   // v137: Escape cancels THIS edit — it must not also close the builder around it
  inp.addEventListener('blur',()=>{ if(!cancelled) commitPrice(uid,inp.value); },{once:true});
}
function commitPrice(uid,raw){
  const l=plate.find(x=>x.uid===uid);if(!l){renderPlate();return;}const p=lineProduct(l);if(!p){renderPlate();return;}
  const v=parseFloat(raw);
  if(!isNaN(v)&&v>=0){
    const base=(p.base_unit==='g'||p.base_unit==='ml')?v/1000:v;
    // v109: the per-product point is written by setProduct itself — one writer for every price path.
    // (v91 added an explicit logIngPrice call here, which was correct and incomplete: keeping the two
    // logs in agreement by remembering to call it at each site is exactly how the Products tab was
    // missed for 18 versions. logHistory stays — it is the OTHER log, the all-menus average.)
    setProduct(p.id,{cost_per_base_unit:base});
    logHistory();
  }
  renderPlate();
}

function miscRowHtml(l){                                              // a removable non-ingredient cost line (spices, boxes, etc.)
  // v67 item 3: a misc line is a SIBLING of an ingredient line and uses the SAME row skeleton, so
  // every column lines up. v69 (REVERSAL of the v60 "no name field" rule, Max's call): the name is
  // EDITABLE so the user can label the line ("Packaging", "Spices"); blank shows "Misc" as a
  // placeholder. F7 (v146): it now spans the Qty and Unit-cost columns, because a misc line has
  // neither - an empty qty input on it would be a control that cannot mean anything.
  // Same ids/handlers (setMiscLabel/setMiscCost/removeLine); the stored label round-trips through save.
  return '<div class="bld-row is-misc" data-uid="'+l.uid+'">'
    +'<span class="bld-ing"><input type="text" class="misc-name" value="'+esc(l.label||'')+'" placeholder="Misc" aria-label="misc cost label" oninput="setMiscLabel('+l.uid+',this.value)"></span>'
    +'<span class="bld-mid"></span>'
    +'<span class="bld-lc misc-costbox"><span class="bld-dollar">$</span><input type="number" min="0" step="0.01" value="'+(l.cost!=null?l.cost:0)+'" aria-label="misc cost amount" oninput="setMiscCost('+l.uid+',this.value)"></span>'
    +'<button class="bld-rm" type="button" aria-label="Remove" onclick="removeLine('+l.uid+')">Remove</button>'
    +'</div>';
}
function addMiscCost(){                                               // Builder-only; never enters the ingredient DB
  plate.push({uid:uidc++, misc:true, label:'', cost:0});
  renderPlate();
  var rows=document.querySelectorAll('.bld-row.is-misc .misc-name'); var last=rows[rows.length-1]; if(last) last.focus();   // v69: name field restored (reverses v60) — focus it so the line can be labelled
}
function setMiscLabel(uid,v){ var l=plate.find(function(x){return x.uid===uid;}); if(l) l.label=v; scheduleDraftSave(); }
function setMiscCost(uid,v){ var l=plate.find(function(x){return x.uid===uid;}); if(l){ l.cost=parseFloat(v)||0; var lc=document.getElementById('lc-'+uid); if(lc) lc.innerHTML=money(l.cost); updateTotals(); } }
/* F7 (v146) — the builder's ingredient table, rebuilt from mock §3.7. One markup, two layouts:
   desktop is the mock's five-column grid (Ingredient | Qty | Unit cost | Cost | remove), mobile is
   §6's stacked row (name over qty-and-unit-cost, cost right). Same cells in the same reading order
   at both widths, which is §6.1's rule.
   ⚠️ The COLUMN NAMED "Unit" IN THE MOCK CARRIES THE UNIT COST HERE, and the band says so. The mock
   shows a bare unit noun; this app's unit price is an inline editable control (.pchip, click to
   re-price the product everywhere) with no other home on the screen, so the unit noun rides in the
   Qty cell after the input - "100 g" - and the third column is the price. Deleting the chip to
   match the mock would have been R3's forbidden dropped control. */
/* 170 — the ONE sentence offering a brand-new cafe its first ingredient, and its one wiring. It has
   two homes (the empty state, or the hint under a list of legacy lines) and never both at once, so
   the markup lives in a function rather than being written twice and drifting. */
function catalogueHintHtml(){ return 'No ingredients yet — <a href="#" id="bhGo">add your first ingredient</a>, then build plates with them.'; }
function wireBhGo(){ var g=document.getElementById('bhGo'); if(g) g.onclick=function(e){ e.preventDefault(); showTab('pantry'); }; }
/* 170 — the header's static title MIRRORS #plateName, which moved into step 2 where the v69 fill
   order puts it. This is the only writer. It is safe to drive from renderPlate() because every one
   of the six places that assigns #plateName.value calls renderPlate() straight after: clearBtn,
   applyPlateDraft, loadPlateState, startNewPlate, duplicateCurrentPlate — and typing, which the
   #plateName input listener covers directly. Checked one by one, not assumed. */
function syncBuilderTitle(){
  var t=document.getElementById('bldTitle'); if(!t) return;
  var el=document.getElementById('plateName'), nm=((el&&el.value)||'').trim();
  t.textContent=nm||'New plate';
  t.classList.toggle('is-unnamed',!nm);
}
function renderPlate(){
  scheduleDraftSave();                                        // v82 D1: persist the in-progress builder (debounced) on every structural change
  var nIng=plate.filter(function(l){return !l.misc;}).length;
  var dc=document.getElementById('dCount'); if(dc) dc.textContent=nIng?(nIng+(nIng===1?' item':' items')):'';
  // v102 fix (CodeRabbit): the hint update must run BEFORE the empty-plate early return — a fresh
  // install has no ingredients AND an empty plate, and that user needs the add-first-ingredient link.
  syncBuilderTitle();
  /* 170 — ONE empty-ingredients message, not two. The screen used to render both of these at once
     on a fresh install: #lines' own "No ingredients yet. Add the first one below." and, directly
     under it, the hint's "No ingredients yet — add your first ingredient…". They mean DIFFERENT
     things (this plate has no lines; the cafe has no catalogue at all) and neither said so.
     So the catalogue hint moves INTO the empty state when the plate is empty, and #builderHint
     carries it only when there are lines to sit under — which is the case v102's CodeRabbit fix was
     really about (a plate of legacy {pid} lines with an empty kitchenIngredients array still needs
     the link). Either way #bhGo, its handler and its wording are unchanged; the anchor's missing
     colour rule belongs to the Onboarding item and is deliberately not touched here. */
  var noCatalogue=!kitchenIngredients.length;
  var bh=document.getElementById('builderHint');
  if(bh){
    if(noCatalogue && plate.length){ bh.style.display=''; bh.innerHTML=catalogueHintHtml(); wireBhGo(); }
    else { bh.style.display='none'; bh.textContent=''; }   // v102 prose cull: the default hint is gone — the search dropdown carries the same guidance (v59: still no create-on-the-spot)
  }
  if(!plate.length){
    // "above", not "below": 170 moved the search to the top of the card, and the direction word was
    // the copy compensating for the control being in the wrong place. Only the word changes — the
    // field's own placeholder stays the mock's "Add an ingredient" (§3 R1, presentational).
    linesEl.innerHTML='<div class="bld-empty">'+(noCatalogue?catalogueHintHtml():'No ingredients yet.<br>Add the first one above.')+'</div>';
    if(noCatalogue) wireBhGo();
    updateTotals();return;
  }
  linesEl.innerHTML=plate.map(l=>{
    if(l.misc){ return miscRowHtml(l); }
    const p=lineProduct(l);
    const isKid=!!l.kid;
    const kName=isKid?((kById[l.kid]&&kById[l.kid].name)||'Ingredient'):null;
    const qtyCell=`<span class="bld-qty"><input type="number" min="0" step="1" value="${l.qty==null?'':l.qty}" placeholder="qty" aria-label="quantity" oninput="setQty(${l.uid},this.value)">`;
    const rmCell=`<button class="bld-rm" type="button" aria-label="Remove ingredient" onclick="removeLine(${l.uid})">Remove</button>`;
    if(!p){                                                    // orphaned line: deleted product or broken kitchen link — greyed, still counted as missing
      const title=isKid?esc(kName):'Product';
      return `<div class="bld-row is-missing" data-uid="${l.uid}">
        <span class="bld-ing"><b>${title}</b><span class="bld-sub warn">product missing</span></span>
        ${qtyCell}</span>
        <span class="bld-unit"></span>
        <span class="bld-lc"><span class="nocost">no cost</span></span>
        ${rmCell}
      </div>`;
    }
    const lc=lineCost(p,l.qty);
    const editable = ['g','ml','ea'].includes(p.base_unit);
    // the chip is the app's re-price-everywhere control; a non-editable base unit renders the same
    // figure as plain text rather than a control that would do nothing (§R4).
    const priceChip = editable
      ? `<span class="pchip" id="pc-${l.uid}" tabindex="0" role="button" title="Click to edit price" onclick="editPrice(${l.uid})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();editPrice(${l.uid})}">${unitCostStr(p)} <span class="pen">✎</span></span>`
      : `<span>${unitCostStr(p)}</span>`;
    // v45 items 6/7 (declutter, Max's call): no "· new"/"· edited" badges and no category — that
    // stays deleted. The kitchen word leads and its linked product is the muted second line.
    const nameBlock = isKid
      ? `<b>${esc(kName)}</b><span class="bld-sub">→ ${esc(p.description)}${p.brand?' · '+esc(p.brand):''}</span>`
      : `<b>${esc(p.description)}</b>${p.brand?`<span class="bld-sub">${esc(p.brand)}</span>`:''}`;   // legacy direct-product line (pre-v31 saved plates)
    return `<div class="bld-row" data-uid="${l.uid}">
      <span class="bld-ing">${nameBlock}</span>
      ${qtyCell}<span class="bld-u">${unitNoun(p)}</span></span>
      <span class="bld-unit">${priceChip}</span>
      <span class="bld-lc" id="lc-${l.uid}">${lc==null?'<span class="nocost">no cost</span>':money(lc)}</span>
      ${rmCell}
    </div>`;}).join('');
  updateTotals();
}
function updateLine(uid){const l=plate.find(x=>x.uid===uid);const p=lineProduct(l);const lc=lineCost(p,l.qty);
  const el=document.getElementById('lc-'+uid);if(el)el.innerHTML=lc==null?'<span class=nocost>no cost</span>':money(lc);}
function updateTotals(){
  let tot=0,missing=0;
  plate.forEach(l=>{ if(l.misc){ tot+=Number(l.cost)||0; return; } const lc=lineCost(lineProduct(l),l.qty);if(lc==null)missing++;else tot+=lc;});
  /* F7 (v146): the docket's own "Total plate cost" row is GONE with the docket. The Cost card's
     #bTotal is the one on-screen total (§7 forbids the same figure twice on one screen) and
     renderBuilderCost below writes it from this very number. */
  const flag=document.getElementById('flag');
  if(missing){flag.style.display='block';flag.textContent='⚠ '+missing+' item'+(missing>1?'s':'')+' have no cost data and are not in the total.';}else flag.style.display='none';
  renderBuilderCost(tot);                                     // Q6 (v125): the cost panel + mobile footer render from the SAME total this function just displayed
  scheduleDraftSave();                                        // v82 D1: qty / misc / price edits funnel through here
}
/* Q6 (v125): the builder's cost panel (desktop) and footer summary (mobile). One renderer, one
   truth: the total is the figure updateTotals just computed, the per-menu verdicts come from
   menuMarginPreview — analyze()'s light — so the builder, the publish dialog and the Menu row can
   never disagree. "On menus" reads menusOfPlate for the LOADED plate; a new unsaved plate has no
   menus and shows the suggested price alone. The shortfall wording ("90c under suggested") is
   DELIBERATE here and deliberately absent from the Menu tab's cell (v131 dropped it there): the
   builder is where a price gets SET, so the gap to suggested is guidance; on the Menu tab it read
   as a price-rise instruction. V5 keeps this panel's under-suggested guidance by design. */
/* F7 (v146) — the WORST menu leads, everywhere this function names one. Red before amber before
   green, because that is the one to act on. rank.red is 0, so the lookup must be nullish-checked,
   never ||'d: `rank[x]||3` rewrites red to LAST (the v125 review caught exactly that shipping). */
function worstMenuOf(on, cost){
  var rank={red:0,amber:1,green:2,none:3};
  var rk=function(l){ return rank[l]!=null?rank[l]:4; };
  return on.map(function(m){ return {m:m, mp:menuMarginPreview(cost, m.price)}; })
    .sort(function(a,b){ return rk(a.mp.light)-rk(b.mp.light); })[0];
}
function renderBuilderCost(tot){
  var tEl=document.getElementById('bTotal'); if(!tEl) return;
  var cost=Number(tot)||0;
  tEl.textContent=money(cost);
  var tp=document.getElementById('bTargetPct'); if(tp) tp.textContent='at '+cogsPct+'%';
  var sEl=document.getElementById('bSuggest'); if(sEl) sEl.textContent=(cost>0)?money(cost/foodTarget()):'—';
  var sp=loadedPlateId?savedPlates.find(function(s){return s.id===loadedPlateId;}):null;
  var on=sp?menusOfPlate(sp):[];
  function shortStr(mp){                                      // "— 90c under suggested" | "" when at/over
    if(mp.pct==null) return '';
    var c=Math.round((mp.suggested-mp.price)*100);
    if(c<1) return '';
    return ' — '+(c<100?(c+'c'):('$'+(c/100).toFixed(2)))+' under suggested';
  }
  /* The mock's Cost card has ONE menu-price input, because its plate is on one menu. This app's
     plate is on any number of menus, each with its own price (menusOfPlate) - R2, and the reason a
     single input cannot ship: it would have to pick one of them silently. The per-menu list is the
     app's truth in the mock's card. The under-suggested wording is DELIBERATE here and deliberately
     absent from the Menu tab's cell (v131 dropped it there): the builder is where a price gets set,
     so the gap to suggested is guidance; on the Menu tab it read as a price-rise instruction. */
  var box=document.getElementById('bMenus');
  if(box){
    if(!on.length){ box.style.display='none'; box.innerHTML=''; }
    else{
      box.style.display='';
      box.innerHTML='<div class="bld-k bld-menus-cap">On menus</div>'+on.map(function(m){
        var mp=menuMarginPreview(cost, m.price);
        var v=(mp.pct==null)?'':'<div class="bverdict bv-'+mp.light+'"><b>'+mp.pct+'% food cost</b>'+esc(shortStr(mp))+'</div>';
        return '<div class="bld-menu"><span class="bm-name">'+esc(m.name)+'</span><span class="bm-price">'+fmt2(m.price)+'</span></div>'+v;
      }).join('');
    }
  }
  /* The mock's header pill ("42.2% food cost"). With many menus there is no single figure, so it
     shows the WORST one and names it - the same choice the mobile bar has made since v125. An
     unpublished plate has no price anywhere, so the pill is absent rather than zero or a dash. */
  var pill=document.getElementById('bldPill');
  if(pill){
    var w=(cost>0 && on.length)?worstMenuOf(on, cost):null;
    if(w && w.mp.pct!=null){
      pill.hidden=false;
      pill.className='bld-pill bv-t-'+w.mp.light;
      pill.textContent=w.mp.pct+'% food cost'+(on.length>1?(' · '+w.m.name):'');
    } else { pill.hidden=true; pill.textContent=''; }
  }
  /* §6's sticky mobile summary bar: plate cost + suggested, as the mock draws it. Its action is
     Save (see the markup comment). Empty until the plate costs something - a bar reading $0.00
     over an empty table is chrome, not information. */
  var foot=document.getElementById('bFootSum');
  if(foot){
    if(!(cost>0)){ foot.innerHTML=''; foot.hidden=true; }
    else{
      foot.hidden=false;
      var line;
      if(on.length){
        var worst=worstMenuOf(on, cost);
        line=(worst.mp.pct==null)
          ? ('suggested '+money(cost/foodTarget())+' at '+cogsPct+'%')
          : ('<b class="bv-t-'+worst.mp.light+'">'+worst.mp.pct+'%</b> on '+esc(worst.m.name)+' at '+fmt2(worst.m.price));
      } else {
        line='not on a menu yet';
      }
      foot.innerHTML='<div class="bfs-fig"><span class="bfs-lbl">Plate cost</span><span class="bfs-total">'+money(cost)+'</span></div>'
        +'<div class="bfs-fig"><span class="bfs-lbl">Suggested</span><span class="bfs-total">'+money(cost/foodTarget())+'</span></div>'
        +'<div class="bfs-line">'+line+'</div>';
    }
  }
  renderBuilderPublish(sp, on);
}
/* F7 (v146) — the mock's Publishing card, R2+R3. The mock draws a single "On menu" <select>; this
   app publishes one plate to MANY menus, each row its own dish with its own price and section, and
   the machinery for that is openManageMenus / openPublishModal, which this card now owns (it was
   reached from the plate-action chooser this item deleted).
   ⚠️ AN UNSAVED PLATE CANNOT BE PUBLISHED and that is not a UI choice: a dish row stores plate_id,
   so there has to be a plate id first. The card says so in words rather than showing a control that
   would fail - §R4's rule about never shipping a dead one. */
function renderBuilderPublish(sp, on){
  var box=document.getElementById('bPublish'); if(!box) return;
  if(!sp){
    box.innerHTML='<p class="bld-note">Save the plate first, then publish it to a menu.</p>';
    return;
  }
  var head=on.length
    ? ('<div class="bld-k">On '+on.length+' '+(on.length===1?'menu':'menus')+'</div>')
    : '<div class="bld-k">Not on a menu</div>';
  box.innerHTML=head+'<button class="btn bld-pubbtn" id="bldPublishBtn" type="button">'+(on.length?'Manage menus':'Add to a menu')+'</button>';
  var b=document.getElementById('bldPublishBtn');
  if(b) b.onclick=function(){ openManageMenus(sp.id); };
}

// v82: explicit discard clears the draft. F7 (v146): it also drops loadedPlateId, so the two
// saved-plate-only rail controls have to follow it - see syncBuilderPlateActions.
document.getElementById('clearBtn').addEventListener('click',function(){plate=[];document.getElementById('plateName').value='';menuLinkEl.value='';loadedPlateId=null;menuTouched=false;hideMatchPrompt();updateEditTag();syncBuilderPlateActions();clearPlateDraft();renderPlate();});
// v60 item 3: ONE docket renderer, shared by the builder's Print button and the plate card's Print
// docket action (load-then-print not needed \u2014 it prints straight from the passed lines). "lines" are
// the working/saved shape: {misc,label,cost} | {kid,qty} | {pid,qty}. Do not fork a second template.
function printDocketFor(name, lines){
  lines=lines||[];
  var pd=document.getElementById('printDocket'); if(!pd){ window.print(); return; }
  var rows=lines.map(function(l){
    if(l.misc){ return '<tr><td class="pd-q"></td><td class="pd-n">'+esc(l.label||'Misc cost')+'</td></tr>'; }
    var p=lineProduct(l);
    var nm=l.kid ? esc((kById[l.kid]&&kById[l.kid].name)||'Ingredient') : (p?esc(p.description||'Item'):'');
    if(!nm) return '';
    var u=p?unitNoun(p):''; var q=l.qty;
    return '<tr><td class="pd-q">'+esc(String(q))+(u?' '+esc(u):'')+'</td><td class="pd-n">'+nm+'</td></tr>';
  }).filter(Boolean).join('');
  pd.innerHTML='<div class="pd-card">'
    +'<div class="pd-logo">Ez<span>Plate</span></div>'
    +'<div class="pd-title">'+esc((name||'').trim()||'Untitled plate')+'</div>'
    +'<div class="pd-meta">Plate docket \u00b7 '+lines.length+' ingredient'+(lines.length===1?'':'s')+'</div>'
    +'<table class="pd-table"><tbody>'+rows+'</tbody></table>'
    +'</div>';
  window.print();
}
document.getElementById('printBtn').addEventListener('click',function(){
  printDocketFor((document.getElementById('plateName').value||''), plate);
});

/* ---------- add-ingredient modal ---------- */
const modal=document.getElementById('modal');
function val(id){return document.getElementById(id).value.trim();}
/* convert a pack size + unit + pack price into a base-unit cost, reusing the same weight/volume logic as the parser */
function packToUnitCost(num, unit, price){
  num=parseFloat(num); price=parseFloat(price);
  if(!(num>0)||isNaN(price)||price<0) return null;
  if(unit==='kg'||unit==='g'){ var grams=num*(unit==='kg'?1000:1); return {base_unit:'g',cost_per_base_unit:price/grams,cost_basis:'$/g',dispPer:price/(grams/1000),dispUnit:'kg'}; }
  if(unit==='l'||unit==='ml'){ var mls=num*(unit==='l'?1000:1); return {base_unit:'ml',cost_per_base_unit:price/mls,cost_basis:'$/ml',dispPer:price/(mls/1000),dispUnit:'L'}; }
  return {base_unit:'ea',cost_per_base_unit:price/num,cost_basis:'$/unit',dispPer:price/num,dispUnit:'unit'};   // count
}
function updateAddCalc(){
  var el=document.getElementById('f_calc'); if(!el) return;
  var r=packToUnitCost(document.getElementById('f_packsize').value, document.getElementById('f_packunit').value, document.getElementById('f_price').value);
  if(!r){ el.className='calc-line'; el.textContent='Enter pack size & price to see the unit cost.'; return; }
  el.className='calc-line ok'; el.textContent='= $'+r.dispPer.toFixed(2)+' / '+r.dispUnit;
}
var addBrandCombo,addSupCombo,addCatCombo;
function initAddCombos(){
  ['f_brand','f_sup','f_category'].forEach(function(x){ var d=document.getElementById(x+'Drop'); if(d)d.style.display='none'; });
  makeInlineCombo('f_brand','f_brandDrop',prodBrands);
  makeInlineCombo('f_sup','f_supDrop',prodSuppliers);
  makeInlineCombo('f_category','f_categoryDrop',prodCategories);
}
function openModal(){initAddCombos();updateAddCalc();openOverlay(modal);}
function closeModal(){closeOverlay(modal);}
function clearForm(){['f_desc','f_brand','f_sup','f_category','f_packsize','f_price'].forEach(id=>{var e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('f_food').checked=true;document.getElementById('f_packunit').value='kg';updateAddCalc();document.getElementById('ferr').style.display='none';}
function submitNew(){
  const desc=val('f_desc'), fe=document.getElementById('ferr');
  const catR=resolveCombo('f_category',prodCategories);
  const brR=resolveCombo('f_brand',prodBrands);
  const supR=resolveCombo('f_sup',prodSuppliers);
  const errs=[];
  if(!desc)errs.push('Product name');
  if(!catR.value)errs.push('Category');
  var calc=packToUnitCost(document.getElementById('f_packsize').value, document.getElementById('f_packunit').value, document.getElementById('f_price').value);
  if(!calc)errs.push('a valid Pack size and Pack price');
  if(errs.length){fe.textContent='Please complete: '+errs.join(', ')+'.';fe.style.display='block';return;}
  if(!brR.ok){ fe.textContent='\u201c'+brR.value+'\u201d is a new brand \u2014 pick \u201cCreate new\u201d from the list to confirm.'; fe.style.display='block'; return; }
  if(!supR.ok){ fe.textContent='\u201c'+supR.value+'\u201d is a new supplier \u2014 pick \u201cCreate new\u201d from the list to confirm.'; fe.style.display='block'; return; }
  const id=uid('U');
  var szUnit=document.getElementById('f_packunit').value;
  const prod=newProductRecord({id:id, desc:desc, brand:brR.value, supplier:supR.value, category:catR.value,
    base_unit:calc.base_unit, cost_per_base_unit:calc.cost_per_base_unit, cost_basis:calc.cost_basis,
    isFood:document.getElementById('f_food').checked,
    packSize:document.getElementById('f_packsize').value, packUnit:szUnit,
    packPrice:document.getElementById('f_price').value});
  setProduct(id,prod);
  closeModal();clearForm();
  if(typeof renderIngredients==='function') renderIngredients();       // v83: the list repaints so the product you just made is visible (rebuild() updates data only, not the DOM)
  toast(desc+' added');
  qEl.focus();
}
/* v82 D2: the create form stored pack_size_raw (a display string) but NEVER the structured
   pack_qty/pack_unit that the edit form reads back (openIngEdit/saveIngEdit) — so the pack-size
   field reopened BLANK, while the per-unit price (from calc) was correct. Root cause: this record
   was built inline and simply omitted those two fields. Build it through one pure helper so create
   and edit agree on the pack shape, and so pack-round-trip is lockable in a test. The pack also
   legitimately feeds invoice pricing (product pack > memory > parser), which the form copy promises. */
function newProductRecord(f){
  var q=parseFloat(f.packSize);
  return {id:f.id, description:f.desc, brand:f.brand||null, supplier:f.supplier||null, category:f.category, sub_category:'',
    item_type:null, search_aliases:[], base_unit:f.base_unit,
    cost_per_base_unit:f.cost_per_base_unit, cost_basis:f.cost_basis,
    is_food:!!f.isFood, pack_qty:(isNaN(q)?null:q), pack_unit:(f.packUnit||null),
    pack_size_raw:(isNaN(q)?'':q+' '+f.packUnit), sold_by:'', current_price_exgst:parseFloat(f.packPrice)};   // no "NaN …" string when the pack size is blank
}
document.getElementById('newBtn').addEventListener('click',openModal);
document.getElementById('mClose').addEventListener('click',closeModal);
document.getElementById('mCancel').addEventListener('click',closeModal);
document.getElementById('mSave').addEventListener('click',submitNew);
['f_packsize','f_price','f_packunit'].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener('input',updateAddCalc);});
document.getElementById('f_packunit').addEventListener('change',updateAddCalc);
modal.addEventListener('mousedown',e=>{if(e.target===modal)closeModal();});
/* v137 (F1b): this modal's own Escape listener is GONE — the one top-layer handler at the end
   of this file closes whatever is actually on top, and reaches this modal through its × (#mClose,
   wired to closeModal just above). A per-modal Escape listener is the shape that made a stack
   close in both directions at once. */

let toastT;
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);}


/* ===== Suggested pricing + Menu analysis ===== */
/* v108: BASE_MENU (69 dishes) was deleted here, with NO migration — 66 of its ids were already rows in
   `menu_items`, and the missing 3 (m42, m51, m50) are exactly the three Max had deleted, so the literal
   was re-adding them on every rebuild and the tombstone list was suppressing them again. Deleting the
   literal drops them by itself, which is why `deleted_menu_ids` has nothing left to do (D3). */
let customMenu=[];
/* ===== multiple menus ===== */
var menusList=[];
// v54: plates are an independent library, so the "Unassigned dishes" holding area (v40/v42) is GONE.
// Menus reference plates; deleting a menu deletes its dishes and UNLINKS (never deletes) their plates,
// which live on in the Plates tab. With plates able to stand alone, ZERO menus is a legitimate state.
/* v108: menusKeyExists is DELETED. It read `cafeDB_menus`, and phase 5b removed every write to that
   key — so it returned false forever, which made ensureDefaultMenu re-seed "Original menu" on EVERY
   boot once the user had deleted their last menu. That silently violates hard rule 7 (zero menus is a
   legitimate state) and would have resurrected a deleted menu indefinitely. Found by CodeRabbit.
   The replacement signal is whether the menus TABLE answered — see bootstrapSync. */
/* Seeds "Original menu" ONLY when the caller has established there is no server answer to respect.
   The caller decides; this function must never guess, because an empty menus table and a fresh
   install are indistinguishable from in here — and they mean opposite things. */
function ensureDefaultMenu(){ if(!menusList.length) menusList.unshift({id:'MENU_ORIGINAL',name:'Original menu',season:null}); }
function fallbackMenuId(){                                          // v54: never a deleted id; null when no menu exists (a valid zero-menu state)
  if(menusList.some(function(m){return m.id==='MENU_ORIGINAL';})) return 'MENU_ORIGINAL';
  return (menusList[0] && menusList[0].id) || null;
}
function canDeleteMenu(id){ return menusList.some(function(m){return m.id===id;}); }   // v54: any existing menu may be deleted — deleting the last one is legitimate now
function loadCurrentMenuId(){ try{ return localStorage.getItem('cafeDB_currentMenuId')||'MENU_ORIGINAL'; }catch(e){ return 'MENU_ORIGINAL'; } }
var currentMenuId=loadCurrentMenuId();
function setCurrentMenuId(id){ currentMenuId=id||null; try{ localStorage.setItem('cafeDB_currentMenuId', currentMenuId||''); }catch(e){} }   // v54: null is valid (no menus)
function menuNameById(id){ var m=menusList.find(function(x){return x.id===(id||'MENU_ORIGINAL');}); return m?m.name:'Original menu'; }
let MENU=[],menuById={};
/* v108: the BASE_MENU seed layer is gone — same shape of change as rebuild(). Dishes come from
   `menu_items` alone, so there is one layer and the Object.assign merge onto a built-in has nothing
   left to merge onto. */
function rebuildMenu(){
  var map={},order=[];
  customMenu.forEach(function(m){ if(!(m.id in map))order.push(m.id); map[m.id]=Object.assign({},map[m.id]||{},m); });
  MENU=order.map(function(k){return map[k];});
  menuById={}; order.forEach(function(k){ menuById[k]=map[k]; });
}
function upsertCustomMenu(item){
  var i=customMenu.findIndex(function(c){return c.id===item.id;});
  if(i>=0) customMenu[i]=item; else customMenu.push(item);
  return dbPushMenu(item);   // v42: return the push so a dependent plate write can be sequenced after this menu_items upsert confirms (heals an orphaned existing dish)
}
rebuildMenu();
var cogsPct = 40;                                  // target food cost, as a percent (e.g. 40)
function foodTarget(){ return cogsPct/100; }               // as a fraction for the maths
function setCogs(pct, persist){
  pct=Math.max(1,Math.min(99, Math.round(pct))); cogsPct=pct;
  if(persist) dbSetSetting('food_cost_target', pct);       // shared across devices
  var th=document.getElementById('aSuggestedTh'); if(th) th.textContent='Suggested at '+pct+'%';   // F5: the mock's §3.2 wording (R1)
  // v115: syncCogsRead (the Menu tab's read-only mirror) is gone with the .cogs-meta line — the
  // Suggested column header below follows the target via renderAnalysis instead
  renderAnalysis();
  try{ if(typeof updateDashNavBadge==='function') updateDashNavBadge(); }catch(e){}   // v133: the target is the one input that changes the badge's answer without changing any data (review finding — it went stale for days otherwise)
}
function fmt2(x){return '$'+Number(x).toFixed(2);}
function analyze(cost, menuPrice){
  const suggested = cost>0 ? cost/foodTarget() : 0;   // sell price at the target food cost
  if(!menuPrice || menuPrice<=0 || suggested<=0)
    return {cost,suggested,menuPrice:menuPrice||null,recommended:suggested,absPct:null,light:'none',state:'nomenu'};
  const shortfall=(suggested-menuPrice)/suggested;        // >0 => menu price is BELOW the suggested price
  const absPct=Math.round(Math.abs(shortfall)*100);
  let light,state,recommended;
  if(shortfall<=0){ light='green'; state='ok'; recommended=menuPrice; }            // at or above suggested = healthy
  else if(shortfall<=0.15){ light='amber'; state='under'; recommended=suggested; } // up to 15% below
  else { light='red'; state='under'; recommended=suggested; }                       // more than 15% below
  return {cost,suggested,menuPrice,recommended,absPct,light,state};
}
/* builder pricing panel */
let menuTouched=false;
const menuLinkEl=document.getElementById('menuLink');
function buildMenuOptions(){
  const groups={}; MENU.forEach(m=>{(groups[m.section]=groups[m.section]||[]).push(m);});
  let html='<option value="">— none —</option>';
  for(const g in groups){html+='<optgroup label="'+esc(g)+'">'+groups[g].map(m=>'<option value="'+m.id+'">'+esc(m.name)+' ('+fmt2(m.price)+')</option>').join('')+'</optgroup>';}
  menuLinkEl.innerHTML=html;
}
function updatePricing(){}  /* pricing now lives only in Menu Analysis */
menuLinkEl.addEventListener('change',()=>{menuTouched=true;updatePricing();});
document.getElementById('plateName').addEventListener('input',function(e){
  renderPlateSuggest(e.target.value);   // live suggestions, every keystroke
  if(e.target.value.trim()){ var pe=document.getElementById('plateNameErr'); if(pe) pe.style.display='none'; }
  syncBuilderTitle();                   // 170: the header title mirrors this field as you type
  scheduleDraftSave();                  // v82 D1: persist the name into the draft too
});
(function(){ var pc=document.getElementById('plateCat'); if(pc) pc.addEventListener('input', scheduleDraftSave); })();   // v82 D1: category into the draft
/* saved plates */
let savedPlates=[];
/* v82 D1 — in-progress plate DRAFT (offline-first). Building a plate then reloading used to lose
   everything. Persist the live builder to ONE localStorage slot (not a draft library), restore it on the
   next open. Snapshot the boot value BEFORE any render can clear it, so an empty-builder render at startup
   can't wipe the stored draft. A draft referencing a since-deleted ingredient degrades gracefully —
   renderPlate/costFromLines already show such a line as "product missing" and leave it out of the total. */
const DRAFTKEY='cafeDB_plateDraft';
function readPlateDraft(){ try{ return JSON.parse(localStorage.getItem(DRAFTKEY)); }catch(e){ return null; } }   // v85: one reader, shared by the boot snapshot and the entry guard
var _bootPlateDraft=readPlateDraft();
function draftHasContent(d){ return !!(d && ((Array.isArray(d.lines)&&d.lines.length) || (d.name&&String(d.name).trim()))); }
function savePlateDraft(){
  try{
    var pn=document.getElementById('plateName'), pc=document.getElementById('plateCat');
    /* v118 — the BASELINE this draft was taken against: what the saved plate looked like when
       drafting STARTED. Null for a brand-new plate, which has nothing to be stale against.
       resumePlateDraft compares it to the plate as it stands NOW, so a draft can never quietly
       reinstate old lines over newer ones.
       ⚠️ IT IS CAPTURED ONCE AND CARRIED, NOT RECOMPUTED. This runs on every keystroke (debounced),
       and `savedPlates` is REASSIGNED under an open builder whenever bootstrapSync reruns - the
       online listener and pull-to-refresh both do it. Recomputing would re-anchor the baseline to
       the very edit it exists to detect: a resync mid-draft would quietly adopt the newer server
       state as "what I started from", the later comparison would match, and the stale draft would
       overwrite it with no warning. Carrying the first one through localStorage rather than a
       variable also survives the reload this whole feature exists for. */
    var prev=readPlateDraft();
    var carry=(prev && prev.loadedPlateId===loadedPlateId && prev.baseSig!=null) ? prev : null;
    var base=loadedPlateId?savedPlates.find(function(s){return s.id===loadedPlateId;}):null;
    var d={lines:plate, name:(pn?pn.value:''), cat:(pc?pc.value:''), loadedPlateId:loadedPlateId, ts:Date.now(),
           baseSig:carry?carry.baseSig:(base?(base.lines||[]).map(lineSig).join('|'):null),
           baseName:carry?carry.baseName:(base?(base.name||''):null)};
    /* ⚠️ v118 — A DRAFT IS UNSAVED WORK, NOT A VISIT, and gating on draftHasContent alone could not
       tell the two apart. Opening a saved plate just to LOOK at it arms draft saves (openBuilder),
       and the very first renderPlate schedules a save; 250ms later the loaded plate's own lines were
       written out as a "draft". Press ×, and the next builder entry - possibly a week later - met
       "You were building X. Resume it, or discard?" about a plate nobody had touched.
       isBuilderDirty() is the question actually being asked: does what is on screen differ from what
       is saved. A look-only visit is not dirty, so it now leaves nothing behind. */
    if(!isBuilderDirty() || !draftHasContent(d)){ localStorage.removeItem(DRAFTKEY); return; }   // nothing changed, or nothing worth resuming ⇒ no stale draft
    localStorage.setItem(DRAFTKEY, JSON.stringify(d));
  }catch(e){}
}
var _draftT=null;
/* v84 BUGFIX — the second half of "resuming doesn't work". The boot pass renders an EMPTY builder
   (restoreLastTab → renderPlate), which scheduled a save that fired ~250ms later, found nothing worth
   keeping and REMOVED the stored draft — while the user was still reading the resume dialog. The v82
   boot snapshot only protected that one offer; a second reload found localStorage already empty.
   A draft may only be written by someone actually IN the builder, so saves stay disarmed until the
   builder is opened (openBuilder). Boot renders happen with the modal closed and now touch nothing. */
var _draftArmed=false;
function armDraftSaves(){ _draftArmed=true; }
/* F7 (v146) — the builder's EDIT COUNTER, and it is what makes "Saved just now" honest.
   ⚠️ Retracting the badge on the next edit is NOT enough on its own, and the F7 pre-push review
   proved it in a browser: save, then edit again WHILE THE WRITE IS STILL IN FLIGHT, then let the
   write resolve, and the resolver puts the badge up for a push that never contained the new line.
   On mobile data - the exact condition this app is designed around - that is reachable by anyone
   who keeps typing after tapping Save.
   So the save captures this counter and refuses to claim success if it has moved. The counter is
   bumped by the one function every builder mutation already funnels through. */
var _builderEdits=0;
/* debounced: builder mutations funnel through renderPlate/updateTotals.
   This is also the one place that knows "the builder just changed", so it is where "Saved just
   now" is retracted. Leaving it up after an edit would be the same lie as showing it before the
   server answered. */
function scheduleDraftSave(){ _builderEdits++; if(typeof setBuilderSaved==='function') setBuilderSaved(false); if(!_draftArmed) return; clearTimeout(_draftT); _draftT=setTimeout(savePlateDraft, 250); }
function clearPlateDraft(){ clearTimeout(_draftT); try{ localStorage.removeItem(DRAFTKEY); }catch(e){} }
/* v118 — has the plate this draft was taken against MOVED since? A draft can sit for a week, and
   resuming it reinstates its own lines under the same loadedPlateId, so anything edited elsewhere in
   the meantime would be silently overwritten by the next save.
   FALSE whenever there is nothing to compare - a brand-new plate (no loadedPlateId), a plate since
   deleted, or a draft written before v118 and so carrying no baseline. Those are all "cannot tell",
   and cannot-tell must not nag; the point is to catch the case we CAN prove. */
function draftBaseChanged(d){
  if(!d || !d.loadedPlateId || d.baseSig==null) return false;
  var sp=savedPlates.find(function(s){return s.id===d.loadedPlateId;});
  if(!sp) return false;
  return (sp.lines||[]).map(lineSig).join('|')!==d.baseSig || (sp.name||'')!==(d.baseName||'');
}
function resumePlateDraft(d){
  if(draftBaseChanged(d)){
    var sp=savedPlates.find(function(s){return s.id===d.loadedPlateId;});
    askConfirm('Plate changed since',
      '“'+((sp&&sp.name)||'That plate')+'” has been edited since you left this draft. Resuming replaces those newer lines with your older ones.',
      'Resume anyway', function(){ applyPlateDraft(d); }, 'Discard draft', clearPlateDraft);
    return;
  }
  applyPlateDraft(d);
}
function applyPlateDraft(d){
  plate=(Array.isArray(d.lines)?d.lines:[]).map(function(l){ return Object.assign({}, l, {uid:uidc++}); });   // fresh uids, never trust stored ones
  loadedPlateId=d.loadedPlateId||null;
  var pn=document.getElementById('plateName'); if(pn) pn.value=d.name||'';
  var pc=document.getElementById('plateCat'); if(pc) pc.value=d.cat||'';
  menuTouched=false; if(typeof updateEditTag==='function') updateEditTag();
  renderPlate(); openBuilder();
}
var _draftOfferWaits=0;
function offerPlateDraftResume(){
  var d=_bootPlateDraft; if(!draftHasContent(d)) return;
  /* ⚠️ v118 — WAIT FOR THE PLATES BEFORE ASKING. This runs as the last statement in app.js (see the
     v83 note above), which is necessarily BEFORE bootstrapSync's await resolves, so `savedPlates` is
     still [] here - guaranteed, not merely likely. The confirm modal outranks the boot gate in
     z-index, so Resume is tappable while the gate is still up, and draftBaseChanged would then find
     no plate for the draft's id and read "not loaded yet" as "deleted, nothing to overwrite" - the
     one branch that must never be guessed. It would skip the warning on the boot path, which is the
     PRIMARY path for this feature: a week-old draft is exactly what resumes at boot.
     ⚠️ THE FLAG IS __ezReady, NOT _bootGateDone. _bootGateDone flips only on SUCCESS, so keying off
     it made a boot that failed - no client, offline, a dead fetch - wait the full timeout before
     asking, which is the state where the user most wants their draft back and the jsdom smoke test
     caught immediately. bootReady sets __ezReady on BOTH outcomes, and on the ok path it is set
     after savedPlates is assigned, so "ready" means "the answer is in, whatever it was".
     Still bounded: if bootstrapSync never concludes at all we ask anyway rather than swallowing the
     offer. The call site does not move - deferring further is strictly safer for the v83 __confirmFn
     ordering, not less safe. */
  if(!window.__ezReady && _draftOfferWaits++ < 50){ setTimeout(offerPlateDraftResume, 200); return; }
  var n=(Array.isArray(d.lines)?d.lines.filter(function(l){return l&&!l.misc;}).length:0);
  var what=(d.name&&d.name.trim())?('“'+d.name.trim()+'”'):(n+' ingredient'+(n===1?'':'s'));
  askConfirm('Unfinished plate', 'You were building '+what+'. Resume it, or discard?', 'Resume',
    function(){ resumePlateDraft(d); }, 'Discard', clearPlateDraft);
}
// v55: the builder edits a PLATE only (name + lines + category). It carries NO menu link — publishing to
// menus is a separate action (Manage menus, from the card). Editing a plate's recipe automatically re-costs
// every menu entry backed by it (they resolve cost via plateForMenuItem). Returns true on success.
function saveCurrentPlate(asNew){
  if(!plate.length){toast('Add ingredients to the plate first');return false;}
  var rawName=(document.getElementById('plateName').value||'').trim();
  var pErr=document.getElementById('plateNameErr');
  if(!rawName){ if(pErr){ pErr.textContent='Give this plate a name before saving.'; pErr.style.display='block'; } var pn=document.getElementById('plateName'); if(pn){ pn.focus(); } return false; }
  if(pErr) pErr.style.display='none';
  // v60 (Max): every ingredient line needs a real quantity before the plate can be saved. New lines
  // start empty; a blank or 0 qty blocks the save and focuses the first offending line's field.
  var badLine=plate.find(function(l){ return !l.misc && !(l.qty>0); });
  if(badLine){
    toast('Enter a quantity for every ingredient');
    var qi=document.querySelector('.bld-row[data-uid="'+badLine.uid+'"] .bld-qty input'); if(qi){ qi.focus(); }
    return false;
  }
  var name=rawName;
  var cat=(typeof builderCategoryValue==='function')?builderCategoryValue():null;   // §J: category combo; null before §J
  var lines=plate.map(function(l){ return l.misc?{misc:true,label:l.label||'',cost:Number(l.cost)||0}:(l.kid?{kid:l.kid,qty:l.qty}:{pid:l.pid,qty:l.qty}); });
  /* v114 — THE ONE PLACE A PLATE'S RECIPE CHANGES. A line added, removed, re-portioned or re-pointed,
     a misc cost line edited, a rename, a recategorisation: all of it arrives here and nowhere else,
     because `plate.lines` has exactly one writer. The change log's whole first kind is this function.
     Both "before" figures must be read BEFORE the mutation two lines down — sp.lines is replaced in
     place, so a cost taken afterwards would compare the new recipe with itself. */
  var _prev=(!asNew && loadedPlateId)?savedPlates.find(function(s){return s.id===loadedPlateId;}):null;
  var _avgBefore=computeAvgFoodCost(), _costBefore=_prev?costFromLines(_prev.lines):null;
  var sp;
  if(!asNew && loadedPlateId){ sp=savedPlates.find(function(s){return s.id===loadedPlateId;}); if(sp){ sp.name=name; sp.lines=lines; if(cat!==null) sp.category=(cat||null); } else loadedPlateId=null; }
  if(asNew || !loadedPlateId){ var id=uid('SP'); sp={id:id,name:name,lines:lines,category:(cat||null)}; savedPlates.push(sp); loadedPlateId=id; }
  var _isNew=(_costBefore==null);
  var _write=dbPushPlate(sp); clearPlateDraft(); updateEditTag(); toast(asNew?'Saved as a new plate':'Plate saved'); renderAnalysis(); if(typeof renderPlatesTab==='function') renderPlatesTab();   // v82 D1: a saved plate is no longer a draft
  /* F7 (v146) — "Saved just now" waits for the SERVER, and for the plate to still BE what was
     pushed. pushWrite resolves to the result or to {error} and never to null (CLAUDE.md Tier 2),
     so `!r || !r.error` is the ok test and an offline drop lands in the else branch, where
     pushWrite's own toast has already said it was not saved.
     ⚠️ The `_builderEdits` check is the second half and is not optional - without it a write that
     resolves AFTER a further edit puts the badge up for a state the server has never seen. The
     counter is read here rather than in the resolver so the comparison is against the moment of
     the push, not the moment of the answer.
     The rest of this function stays optimistic on purpose - the library, the Menu tab and the log
     all repaint immediately - because it is only the WORDING that must wait. */
  var _editsAtPush=_builderEdits;
  if(_write && typeof _write.then==='function'){
    _write.then(function(r){ if((!r || !r.error) && _builderEdits===_editsAtPush) setBuilderSaved(true); });
  } else if(_builderEdits===_editsAtPush){ setBuilderSaved(true); }
  syncBuilderPlateActions();                                         // a saved plate can now be duplicated and deleted
  renderBuilderCost(costFromLines(sp.lines));                        // the Publishing card becomes usable the moment the plate has an id
  logHistory();                                                       // v60 item 1a: a plate re-cost changes the menu average — refresh a visible dashboard
  logChangeIfSaved(_write, _isNew?'plate_created':'plate_edited', {plateId:sp.id,
    menuIds:menusOfPlate(sp).map(function(o){ return o.menuId; }),                 // every menu this re-cost moved; empty for an unpublished plate, which is a real state
    avgBefore:_avgBefore, costBefore:_costBefore, costAfter:costFromLines(sp.lines), detail:{name:sp.name}});
  return true;
}
/* v54: the builder's one primary action. Save writes the plate to the library and refreshes the
   Plates tab.
   F7 (v146) — IT NO LONGER LEAVES THE PAGE, and that is a consequence of the rehome rather than a
   preference: publishing now lives on this page, so a save that navigated away would put the plate
   one screen from the control the user needs next. The mock agrees - its builder header reports
   "Saved just now" in place, and this app now renders that line once the server confirms. */
function saveFromBuilder(){ saveCurrentPlate(false); }
(function(){ var sb=document.getElementById('saveBtn'); if(sb) sb.addEventListener('click',saveFromBuilder); })();
(function(){ var amb=document.getElementById('addMiscBtn'); if(amb) amb.addEventListener('click',addMiscCost); })();
/* menu analysis */
function costFromLines(lines){let c=0,miss=0;(lines||[]).forEach(l=>{ if(l&&l.misc){ var mc=Number(l.cost); if(!isNaN(mc)) c+=mc; return; } const p=lineProduct(l);if(!p){miss++;return;}const lc=lineCost(p,l.qty);if(lc==null)miss++;else c+=lc;});return c;}
/* v55 (many-to-many): a dish links to its plate via dish.plateId; source_plate_id is a legacy fallback.
   One plate can back MANY dishes (one per menu it's published to). These helpers are the single
   resolution path — call sites never poke the raw fields.
   v112: the third branch (a stale local plate.menuId) is GONE. It could never fire: the only writer of
   `sp.menuId` in the whole app was savePlateRestore — itself unreachable, and removed this batch — while
   `rowToPlate` does not read `menu_id` at all, so a server-loaded plate never carries `.menuId`. A
   fallback that cannot fire reads as a safety net and is not one. */
function plateIdOf(d){ if(!d) return null;
  if(d.plateId) return d.plateId;
  return d.sourcePlateId || null;
}
function plateForMenuItem(m){ if(!m) return null; var pid=plateIdOf(m); return pid?(savedPlates.find(function(s){return s.id===pid;})||null):null; }
function dishesOfPlate(sp){ if(!sp) return []; return MENU.filter(function(d){ return plateIdOf(d)===sp.id; }); }   // every menu entry backed by this plate
function menusOfPlate(sp){ var seen={},out=[]; dishesOfPlate(sp).forEach(function(d){ var mid=d.menuId||'MENU_ORIGINAL'; if(seen[mid])return; seen[mid]=1; var m=menusList.find(function(x){return x.id===mid;}); if(m) out.push({menuId:m.id, name:m.name, dishId:d.id, price:d.price, section:d.section}); }); return out; }
/* v113 — THE PUBLISH GUARD'S BLIND SPOT. "One entry per (plate, menu)" was decided by dishesOfPlate,
   which resolves through plateIdOf — so a dish with NO plate link is invisible to it. Publishing the very
   plate an orphaned dish should have been using could not heal it; it silently added a SECOND row of the
   same name, one costed and one not. That is exactly how the v112 orphan surfaced: Max published the
   plate to test the delete flow, got two rows, and reported a publish bug that was not one.
   BOTH dish-creating paths (submitMenuItem, submitAddDish) now share this ONE decision, so the second
   cannot drift away from the first — it had the identical hole and nobody had noticed.
   No auto-heal and no name matching, by decision: linking means guessing which dish belongs to this
   plate, and the v112 repair needed the section, the price and the price history in front of a human
   before the call could be made. The app surfaces the choice; it does not make it. */
function unlinkedDishesOn(dishes, menuId){
  return (dishes||[]).filter(function(d){ return d && !plateIdOf(d) && (d.menuId||'MENU_ORIGINAL')===menuId; });
}
function publishPlan(dishes, plateId, menuId){
  // The `plateId ?` is load-bearing: plateIdOf(an unlinked row) is null, so a bare `===plateId`
  // comparison against a null id would read that row as "this plate is already here" and quietly
  // update it — an auto-heal by accident, which is the one thing this was decided against.
  var existing=plateId ? (dishes||[]).find(function(d){ return d && plateIdOf(d)===plateId && (d.menuId||'MENU_ORIGINAL')===menuId; }) : null;
  if(existing) return {action:'update', existingId:existing.id, unlinked:[]};   // already on this menu — updating it duplicates nothing, so there is nothing to ask
  return {action:'create', existingId:null, unlinked:unlinkedDishesOn(dishes, menuId)};
}
// v55: every dish should own a plate (its recipe). If one is missing (a pre-v55 uncosted dish, or a fresh
// legacy row), create an empty plate and link the dish to it via plateId. §B backfills this at the DB level;
// this is the app-side guarantee. The dish write is sequenced after the plate (menu_items.plate_id FK).
function ensurePlateForDish(m){
  if(!m) return null;
  var sp=plateForMenuItem(m); if(sp) return sp;
  var id=uid('SP'); sp={id:id, name:m.name||'Plate', lines:[]};
  savedPlates.push(sp);
  m.plateId=id; var i=customMenu.findIndex(function(c){return c.id===m.id;}); if(i>=0) customMenu[i]=m; else customMenu.push(m);
  dbPushMenuAfterPlate(m, sp);
  return sp;
}
// §J: plate categories are the library's own grouping. Suggest existing plate categories AND the per-menu
// sections already in use, so the vocabulary stays shared.
function plateCategories(){ var s={}; savedPlates.forEach(function(sp){ if(sp.category) s[sp.category]=1; }); (typeof MENU!=='undefined'?MENU:[]).forEach(function(m){ if(m&&m.section) s[m.section]=1; }); return Object.keys(s).sort(); }
function builderCategoryValue(){ var el=document.getElementById('plateCat'); return el?(el.value||'').trim():''; }
/* Q3 (v122), reworked 9 Aug 2026 (Max): the Food-cost cell states food-cost % vs target ONLY.
   The dollar shortfall it used to append ("+90c") read as a price-rise instruction \u2014 judging cost
   is the app's job, pushing price hikes is not \u2014 so no dollar delta ever renders here (v3 spec \u00a78
   agrees). The word after the % is what discriminates amber from red \u2014 "over" vs "well over" \u2014
   because hue was otherwise the ONLY difference between them. The LIGHT (and therefore the word)
   comes from analyze() \u2014 the one place the green/amber/red rule lives \u2014 so the publish-dialog
   preview, the filter chips and this cell can never disagree ON COLOUR.

   F8 (v147) \u2014 THE THREE VOCABULARIES, DECIDED. The queue asked whether "Slightly under" (the
   publish preview), "Watch" (the filter chips) and "over" (this cell) naming one amber is drift.
   IT IS DELIBERATE, and the reason is that they have three different SUBJECTS:
     \u00b7 THIS CELL judges the COST against the target        -> "over" / "well over" is correct.
     \u00b7 marginLightWord judges the PRICE against suggested  -> "under" is correct, and it is the
       opposite direction only because it is measuring the opposite thing.
     \u00b7 The chips are a FILTER over plates, so the word is what you would DO -> "Watch" / "Rework".
   Unifying them would force one subject onto three questions and make two of the three wrong. The
   COLOUR is shared because the LIGHT is shared \u2014 all three read analyze(), which is the one place
   the green/amber/red rule lives \u2014 and that is the invariant that actually matters.
   The residual, stated rather than hidden: of the nine phrases, "Slightly under" is the only one
   that does not carry its own subject, so it alone can be misread as being about cost. Recorded in
   docs/MAINTENANCE.md as a copy question; it is not a colour bug and not this screen's to fix.
   (The dialog rounds its % to a whole
   number; this cell shows one decimal. Same ratio, different display precision \u2014 a display choice,
   not a second computation.) Colour stays anchored to the TARGET, never to direction.
   The aria-label matters: on phones the thead is display:none, so this span is the cell's only
   announced meaning \u2014 it carries the same word the sighted reader gets. */
function vbadge(a){
  if((a.state==='ok'||a.state==='under') && a.cost>0 && a.menuPrice>0){   // belt-and-braces before the division \u2014 callers can hand-build `a` (a test does)
    var pct=(a.cost/a.menuPrice*100).toFixed(1);
    if(a.state==='ok') return '<span class="vbadge vgood" aria-label="food cost '+pct+'% \u2014 at or under your target">'+pct+'% \u2713</span>';
    var word=a.light==='red'?'well over':'over';                      // the amber/red discriminator \u2014 hue alone was the only other difference
    var shown=word.replace(' ','\u00a0');                             // nbsp: a narrow cell wraps at the \u00b7 , never mid-phrase; aria keeps the plain space
    return '<span class="vbadge '+(a.light==='red'?'vbad':'vwarn')+'" aria-label="food cost '+pct+'% \u2014 '+word+' your target">'+pct+'% \u00b7 '+shown+'</span>';
  }
  return '<span class="muted-dash">\u2014</span>';
}
/* tooltips: tap to toggle (touch) + hover (css) */
function bindTips(){
  document.querySelectorAll('.tip').forEach(t=>{
    t.onclick=function(e){e.stopPropagation();document.querySelectorAll('.tip.open').forEach(o=>{if(o!==t)o.classList.remove('open');});t.classList.toggle('open');};
  });
}
document.addEventListener('click',()=>document.querySelectorAll('.tip.open').forEach(o=>o.classList.remove('open')));
/* tabs */
/* F10 (v149), from the pre-push review, which reproduced this in a browser.
   FOUR separate lists named the tab panes and they were allowed to disagree: showTab's toggle,
   restoreLastTab's VALID, currentTab's fallback order, and openBuilder's hide list. #builderPage is
   a SIBLING of the panes in normal flow, not a positioned overlay, so any pane openBuilder forgets
   stays rendered UNDER the builder — two screens on top of each other, no error and nothing in the
   console. openBuilder's list had never grown past the original five, so this was already live for
   Invoices (F8) and Settings (F9); F10 would have made it three.
   It is ONE array now. Adding a pane means adding it here and nowhere else.
   Order matters to currentTab, which returns the first VISIBLE pane, and 'builder' stays first
   because it is also the default. */
var TAB_PANES=['builder','ingredients','analysis','dashboard','pantry','invoices','settings','account','more'];
function currentTab(){
  /* THE FIRST MATCH, and the DOM order it depends on, is the whole subtlety here. showTab lights
     .nav-more as well as the target's own button whenever one of the four More sub-screens is open,
     so on those screens TWO .navbtn carry `active` at once — deliberately, because the two are
     hidden at opposite widths and only ever one is on screen. querySelector returns the first in
     DOCUMENT order, and #navMore is written LAST in <nav> precisely so the sub-screen's own entry
     wins this read. Move it and currentTab starts answering 'more' for Products, Invoices,
     Settings and Account, which would send rerenderCurrentTab down the wrong branch.
     171: every pane now has a .navbtn with its data-tab, so this branch answers for all nine and
     the loop below is a fallback nothing currently reaches. It is kept, not deleted — its cost is
     nil and it is the only thing that would stop a pane rendering with no lit button from being
     read as 'builder'. It was load-bearing for #tab-account until this batch gave Account a nav
     entry; that sentence is corrected here rather than left standing. */
  var b=document.querySelector('.navbtn.active'); if(b&&b.dataset.tab) return b.dataset.tab;
  var names=TAB_PANES;
  for(var i=0;i<names.length;i++){ var el=document.getElementById('tab-'+names[i]); if(el&&el.style.display!=='none') return names[i]; }
  return 'builder';
}
function rerenderCurrentTab(){                                         // re-run the active tab's render (e.g. once boot data lands)
  try{ if(typeof updateDashNavBadge==='function') updateDashNavBadge(); }catch(e){}   // v133: the sidebar badge follows the data, whichever tab is shown
  var t=currentTab();
  /* F9 (v148): Settings is listed because restoreLastTab() runs BEFORE bootstrapSync resolves — a
     refresh landing on Settings would otherwise paint cogsPct/gstDefault/the AI flags at their
     pre-boot defaults and never correct them, which is the priming failure in its quietest form. */
  /* F10 (v149): 'account' returns early rather than falling through. The screen is static markup
     with nothing to render, and the fallthrough is renderPlatesTab() — which would repaint a HIDDEN
     Plates library every time boot data lands while Account is showing. Harmless today and wrong,
     which is the shape docs/MAINTENANCE.md records for 'invoices' on this same line. */
  /* 171: 'more' joins 'account' for the same reason — four fixed routes, no data, nothing to
     render, and the fallthrough would repaint a hidden Plates library on every boot-data arrival. */
  if(t==='account'||t==='more') return;
  try{ if(t==='analysis')renderAnalysis(); else if(t==='ingredients')renderIngredients(); else if(t==='dashboard')renderDashboard(); else if(t==='pantry')renderKitchenPanel(); else if(t==='settings')renderSettingsTab(); else renderPlatesTab(); }catch(e){ console.error('[rerender]', e); }
}
/* 171: the four screens the More list opens. ONE array, read by showTab's lit-button rule below;
   the same four are `.nav-bottom` in <nav> and the four `[data-more]` rows in #tab-more, and
   tests/more-screen.test.js pins all three against each other so they cannot drift apart. */
var MORE_SUBS=['ingredients','invoices','settings','account'];
/* Is the More screen the nav at this width? It is the exact complement of the sidebar: `.nav-more`
   is hidden at >=1024 and `.nav-bottom` below it, so this ONE query decides both halves and the two
   can never disagree. matchMedia rather than innerWidth: it is the same unit the CSS resolves, and
   CLAUDE.md records that innerWidth and the fixed-position containing block disagree by ~10px on
   the CI runner — a hand-rolled width comparison would flip on a different side of 1024 than the
   stylesheet does, for a band of widths nobody would think to test. */
function moreIsNav(){
  try{ return !window.matchMedia('(min-width:1024px)').matches; }catch(e){ return true; }
}
function showTab(t){
  /* THE ONE-WAY GUARD. #tab-more has no desktop counterpart by design — at >=1024 its four routes
     ARE the sidebar's bottom group — so painting it there would be a screen the nav cannot express
     and cannot leave except by picking another tab. It is reachable at desktop width by exactly one
     route: restoreLastTab() replaying a `cafeDB_lastTab` of 'more' written on a phone, which is the
     mirror of the edge F8 knowingly left open for Invoices and docs/PHONE.md recorded. Sending it
     to the Dashboard is the honest answer, and it is deliberately NOT symmetric: landing on
     Products/Invoices/Settings/Account below 1024 is fine now — each has a lit More tab and a back
     chevron — so those four need no guard, which is the whole point of this batch. */
  if(t==='more' && !moreIsNav()) t='dashboard';
  var _retap=(currentTab()===t);                                       // v115: re-tapping the active tab is a "take me to the top" gesture, not a navigation
  try{ localStorage.setItem('cafeDB_lastTab', t); }catch(e){}          // remember where the user was, for next refresh
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
  /* …and then More is lit for its four sub-screens as well, which is §6's rule ("Invoices/Products/
     Settings/Account highlight More"). This runs AFTER the exact-match pass and can only ADD the
     class, never clear one the pass set: a lit tab bar with nothing lit is what a phone user sees
     on those four screens otherwise. The two lit buttons never share a width — `.nav-more` and
     `.nav-bottom` are hidden at opposite sides of 1024 — so this is not a double highlight, and
     currentTab() still reads the sub-screen's own entry because #navMore is last in the DOM. */
  var _nm=document.getElementById('navMore');
  if(_nm && MORE_SUBS.indexOf(t)>=0) _nm.classList.add('active');
  /* v115 (v60 item 5 reworked): the jump used to fire AFTER the render, so a heavy innerHTML rebuild
     landed at the old scroll offset and then snapped to 0 — two visual states in one frame. A tab
     SWITCH now jumps first and renders already at the top; a RE-TAP smooth-scrolls after (below). */
  if(!_retap){ try{ window.scrollTo(0,0); }catch(e){} }
  TAB_PANES.forEach(function(name){ var el=document.getElementById('tab-'+name); if(el) el.style.display=(t===name)?'':'none'; });
  /* F7 (v146): the builder is a full PAGE now, a child of Plates rather than a tab of its own, so
     every tab change leaves it. Nothing is lost by that - the in-progress plate stays in memory and
     in the draft, and guardUnfinishedPlate offers it back at the next entry, which is exactly what
     pressing × did while it was a modal. */
  var _bp=document.getElementById('builderPage'); if(_bp) _bp.hidden=true;
  /* F4 (v140) tombstone: the `#prodFab` show/hide line lived here. The floating add is deleted —
     v3 §6.1 puts the primary action in the screen header on both platforms, so a second control for
     the same intent was §7's forbidden duplicate. Nothing replaces the line. */
  if(t==='analysis')renderAnalysis();
  if(t==='ingredients')renderIngredients();
  if(t==='dashboard')renderDashboard();
  if(t==='pantry')renderKitchenPanel();   // data-tab="pantry" is the user-invisible key; its LABEL is "Ingredients" (see glossary)
  if(t==='builder')renderPlatesTab();     // data-tab="builder" is unchanged; its LABEL is now "Plates" (v54)
  if(t==='invoices')renderInvoicesTab();  // F8 (v147): a new key, not a rename — there was no Invoices screen before
  /* F9 (v148): the priming that openSettings() used to do on every open. A screen has no open event,
     so this line IS the priming — drop it and every control renders its markup default. */
  if(t==='settings')renderSettingsTab();
  if(_retap){ try{ window.scrollTo({top:0, behavior:'smooth'}); }catch(e){ try{ window.scrollTo(0,0); }catch(_){} } }   // re-tap: content is already rendered, so the browser can animate it (OS reduced-motion turns 'smooth' into a jump on its own)
}
document.querySelectorAll('.navbtn[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));   // v132: [data-tab] — the sidebar's Settings entry wears .navbtn for styling but is an overlay, and showTab(undefined) blanked every pane and wrote the string "undefined" into cafeDB_lastTab (review finding)
/* 171: the More screen's four rows, and the "‹ More" chevron on each of the four screens they open.
   Both are plain navigation and carry a TAB_PANES key in the attribute, so they route through the
   same showTab every nav button does — there is no second navigation path to keep in step. Bound by
   attribute rather than by id for the same reason the nav is: adding a fifth row is markup only. */
document.querySelectorAll('.more-row[data-more]').forEach(function(b){ b.addEventListener('click',function(){ showTab(b.dataset.more); }); });
document.querySelectorAll('.scr-back[data-back]').forEach(function(b){ b.addEventListener('click',function(){ showTab(b.dataset.back); }); });
/* Crossing 1024 with the More screen open — a phone rotated into landscape on a tablet, a desktop
   window widened, or the browser's own device-toolbar toggle. The sidebar appears, `.nav-more` and
   the whole More list vanish with it, and #tab-more would sit there as a blank panel with a lit
   nothing. showTab's guard cannot catch this: no navigation happens. So the media query itself is
   the event, and it fires only on the CROSSING, not on every resize.
   `.addEventListener` with an `addListener` fallback — Safari only added the modern form in 14. */
(function(){
  var mq; try{ mq=window.matchMedia('(min-width:1024px)'); }catch(e){ return; }
  if(!mq) return;
  var onCross=function(e){ if(e.matches && currentTab()==='more') showTab('dashboard'); };
  if(mq.addEventListener) mq.addEventListener('change',onCross);
  else if(mq.addListener) mq.addListener(onCross);
})();
function restoreLastTab(){                                            // return to the last-viewed tab on refresh (Builder is the default)
  var VALID=TAB_PANES;
  var lt=null; try{ lt=localStorage.getItem('cafeDB_lastTab'); }catch(e){}
  if(lt && VALID.indexOf(lt)>=0 && lt!=='builder') showTab(lt);        // Builder is already shown by default markup; only switch if different & valid
}
(function(){
  // ITEM 6 (v35): the Menu tab's #cogsTarget input is now a read-only display (#cogsTargetRead);
  // editing moved to Settings. Nothing to wire here beyond the search controls.
  var ms=document.getElementById('menuSearch'), msc=document.getElementById('menuSearchClear');
  if(ms){ ms.addEventListener('input',function(){ renderAnalysis(); }); ms.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ms.blur(); } }); }
  if(msc){ msc.addEventListener('click',function(){ ms.value=''; renderAnalysis(); ms.focus(); }); }
  var mcf=document.getElementById('menuCatFilter'); if(mcf) mcf.addEventListener('change',renderAnalysis);   // v59: category filter (dish sections)
  var mclf=document.getElementById('menuClearFilters'); if(mclf) mclf.addEventListener('click',clearMenuFilters);   // v59: shared clear behaviour
  var mlc=document.getElementById('menuLightChips');                 // v68: margin-light filter chips (multi-select) — delegated
  if(mlc) mlc.addEventListener('click',function(e){ var b=e.target.closest('.mlf-chip'); var lt=b&&b.getAttribute('data-light'); if(lt) toggleMenuLight(lt); });
})();
buildMenuOptions(); buildMenuSelector(); bindTips();

renderPlate(); renderPlatesTab();

/* ============================================================
   EzPlate — Ingredients page, Dashboard, supplier extraction
   ============================================================ */

/* ---------- price history (Supabase table: price_history) ---------- */
var priceHistory = [];

/* ---------- v89: per-menu price history (price_history.menu_id) ----------
   priceHistory holds ONLY the all-menus aggregate — the series every existing figure on this
   Dashboard has always been computed from. Per-menu points live HERE, in a separate map, and
   nothing above reads them. That separation is deliberate: mixing per-menu rows into
   priceHistory would have silently skewed dashComparisons, histInRange, the 500-point cap and
   the dedup guard, all of which assume one point = one moment across the whole business.
   Shape: { menuId: [{t, v}, …] }, same point shape as priceHistory. */
/* A point's `t` is an ISO string when this device logged it and a number when it came back from
   Supabase — the same duality dashRangePts already guards against. One normaliser for both. */
function ptMs(p){ var t=p&&p.t; return (typeof t==='string')?new Date(t).getTime():(t||0); }
var menuHistory = {};
/* Fold local per-menu points into what the server returned. Pure, so bootstrapSync stays a one-liner
   and tests can run the real thing. Server points win on an identical timestamp; a local point the
   server has never seen is KEPT, because pushWrite drops writes silently when fully offline (CLAUDE.md,
   Data-write rules) and replacing wholesale would delete cost history Max cannot get back. */
function mergeMenuHistory(server, local){
  var out={};
  Object.keys(server||{}).forEach(function(id){ out[id]=(server[id]||[]).slice(); });
  Object.keys(local||{}).forEach(function(id){
    var arr=out[id]||(out[id]=[]), seen={};
    arr.forEach(function(p){ seen[ptMs(p)]=1; });
    (local[id]||[]).forEach(function(p){ if(!seen[ptMs(p)]) arr.push(p); });
  });
  Object.keys(out).forEach(function(id){ out[id].sort(function(a,b){ return ptMs(a)-ptMs(b); }); });
  return out;
}
/* Schema-can-lag guard (CLAUDE.md): the migration adding price_history.menu_id is applied by Max
   in the SQL editor and may not have landed yet. bootstrapSync probes for the column once and
   clears this if it's absent, so we never fire a write that can only fail — an unapplied
   migration degrades to local-only history, not a toast on every price change. */
var menuHistSupported=true;

var dashRange=(function(){ try{ return localStorage.getItem('cafeDB_dashRange')||'3m'; }catch(e){ return '3m'; } })();
function setDashRange(rg){ dashRange=rg; try{ localStorage.setItem('cafeDB_dashRange',rg); }catch(e){} renderDashboard(); }
function dashRangePts(series){                                     // the points inside the chosen window (capped for sanity)
  var src=series||priceHistory;                                    // v115: callable on a per-menu series too (the scoped chart)
  var days={'1w':7,'1m':30,'3m':91,'6m':183,'1y':365}[dashRange];
  var cutoff=Date.now()-days*86400000;
  var pts=days?src.filter(function(p){
    var tt=(typeof p.t==='string')?new Date(p.t).getTime():p.t;   // Supabase points arrive as ISO strings; a string is never >= a number
    return tt>=cutoff;
  }):src.slice();
  return pts.slice(-60);
}
function rangeBarHtml(){
  var os=[['1w','1W'],['1m','1M'],['3m','3M'],['6m','6M'],['1y','1Y'],['all','All']];
  return '<div class="range-bar">'+os.map(function(o){return '<button type="button" class="range-btn'+(dashRange===o[0]?' act':'')+'" data-rg="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';
}
/* F6 (v143): the mock's §3.1 trend SECTION — a plain heading row over the plot, no card around it
   (in v3 only a table or a list is a bordered container). R3 on the control: the mock draws a single
   "3 months ▾" text button where this app has a six-option segmented bar that has worked since v29.
   The app's control survives, in the mock's slot — a real control is never traded for a prettier one
   that offers less. The chart itself is untouched: trendChart owns the geometry, the scrub wiring,
   the markers and the caption exactly as before. */
function dashTrendHtml(scope){
  return '<section class="dash-sec dash-trend">'
    +'<div class="ds-head"><h2>Food cost trend</h2><span class="ds-gap"></span>'+rangeBarHtml()+'</div>'
    +trendChart(scope)
    +'</section>';
}
/* ---- per-product price log — powers price-change alerts + cost ranges.
   v108: this was the ONE dataset in the app with no server destination at all. `ing_price_history`
   now exists (20260801_ing_price_history.sql) and holds the 33 points that had only ever lived in
   one browser profile. It is read in bootstrapSync's single batch and appended to on every new
   point, exactly like price_history and menu_price_history.
   `saveIngLog` is kept as the name every caller already uses, but it now PUSHES rather than writing
   localStorage — the 60-point cap stays a client-side read concern, so the server keeps the full
   append-only series while memory keeps the recent window. ---- */
var ingPriceLog = {};
var _ingLogPending=[];                                              // points added since the last flush
function saveIngLog(){
  if(!_ingLogPending.length) return;
  var batch=_ingLogPending; _ingLogPending=[];
  batch.forEach(function(p){ dbPushIngPrice(p.pid, p.t, p.v); });
}
function dbPushIngPrice(pid, t, v){
  pushWrite(function(){ return SUPA.from('ing_price_history').insert(pointToRow(t, v, 'cost_per_base_unit', 'product_id', pid)); }, 'price history');
}
/* "the same price", one definition — asked twice: by setProduct against the product's PREVIOUS STORED
   value, and by logIngPrice below against the LAST LOGGED point. The exact-equality arm carries $0.00:
   the relative tolerance is scaled BY the value, so at zero it collapses to `0 < 0` and every repeat
   would log a fresh point. (CodeRabbit, v91 — newly reachable once a hand-edited price fed this log,
   and commitPrice accepts 0.) The tolerance is also what absorbs display rounding: the price chip
   shows 2dp, so re-committing an unchanged price hands back a value differing in the 18th decimal,
   which is a keystroke and not an observation. */
function samePrice(a, b){ return a===b || Math.abs(a-b) < Math.abs(b)*1e-6; }
/* Record a per-base-unit price point for this product. Returns true when a point was actually added,
   so callers know whether saveIngLog() is needed (v91 — the invoice path used to key that off
   `priceChanges`, which is only populated when there WAS an old price, so the first price ever logged
   for a product lived in memory until something else happened to save the log).
   v109: the ONE caller is setProduct. Anything that changes a product's price goes through it. */
function logIngPrice(pid, cpbuVal){
  // typeof, not just isFinite: `isFinite('')` is TRUE because Number('') is 0, so a blank field would
  // have been recorded as a real-looking $0.00 observation. Same trap rowToPoint was corrected for in
  // v108 — and 0 itself stays legitimate (P0277 costs 0), which is why the check is on the TYPE.
  if(pid==null || typeof cpbuVal!=='number' || !isFinite(cpbuVal)) return false;
  var a=ingPriceLog[pid]||(ingPriceLog[pid]=[]);
  var last=a.length?a[a.length-1].v:null;
  if(last!=null && samePrice(last, cpbuVal)) return false;
  var now=Date.now();
  a.push({t:now, v:cpbuVal}); if(a.length>60) ingPriceLog[pid]=a.slice(-60);
  _ingLogPending.push({pid:pid, t:now, v:cpbuVal});
  return true;
}
function ingPriceBand(pid){                                          // {min,max} $/base-unit from logged history, or null
  var a=ingPriceLog[pid]; var p=byId[pid]; var cur=p?cpbu(p):null;
  var vals=(a||[]).map(function(x){return x.v;}); if(cur!=null) vals.push(cur);
  vals=vals.filter(function(v){return v!=null&&isFinite(v);}); if(!vals.length) return null;
  return {min:Math.min.apply(null,vals), max:Math.max.apply(null,vals)};
}
/* Q5 (v124): the last logged move for a product, as a % step — the SAME rule as digData('movers')
   (two points minimum, prev>0, finite last, sub-1% is rounding noise), so the Ingredients row's
   inline drift and the Dashboard's What-moved panel can never disagree about whether a price moved.
   And like the movers note says: the SOURCE is not derivable — setProduct is this log's one writer
   and it serves the invoice apply AND a hand edit — so this is "the last logged move", never "the
   last invoice". */
function ingLastMovePct(pid){
  var a=ingPriceLog[pid]; if(!a || a.length<2) return null;
  var prev=a[a.length-2].v, last=a[a.length-1].v;
  // typeof before isFinite — isFinite('') is TRUE (CLAUDE.md), and a '' point would render −100.0%
  if(!(prev>0) || typeof last!=='number' || !isFinite(last)) return null;
  var pct=(last-prev)/prev*100;
  return Math.abs(pct)<1 ? null : pct;
}
/* ---- v114: THE CHANGE LOG — the counterpart to everything above, and the OPPOSITE of it. ------------
   Every log above this line records what a SUPPLIER did. This one records what MAX did. The dashboard's
   food-cost trend is permanently red because ingredient prices drift up continuously and the number only
   falls when somebody acts; a later batch reframes the chart around "where you sit against target" and
   "what you last did about it, and how far it has moved since", and the second half of that has never
   been recorded anywhere.

   ⚠️ WHAT MUST NEVER REACH THIS LOG: a supplier price movement. It is the thing being MEASURED, not an
   intervention — and if it wrote here, the "how long since you last acted" clock would reset every time
   a supplier raised a price, which is the exact event the drift counter exists to accumulate.
   Self-defeating. THE LINE IS A FUNCTION, NOT A LIST: every product-price write in the app funnels
   through `setProduct` (v109), which is ing_price_history's sole writer. If setProduct wrote it, it is
   drift and it belongs there. Twelve paths change a RECIPE, a LINK, a PRICE or a MENU without going
   through setProduct, and those — all of them — write here.

   NOT plates.updated_at, which is the obvious candidate and fails twice: v110's restore rewrites every
   plates row, so ONE restore would erase the whole history of interventions while the trend line it
   annotates survives; and it records that a row was WRITTEN, not that a decision was MADE.

   ⚠️ NO ENTRY IS EVER WRITTEN FOR A CHANGE THE SERVER DID NOT TAKE. The log is append-only — there is no
   update and no delete, at the policy level as well as in this file — so an entry cannot be corrected
   afterwards. Every call site therefore logs in its SUCCESS branch, after the write that carries the
   change has resolved. That is why dbSetSetting now returns its pushWrite. ---------------------------*/
var changeLog = [];
/* Schema-can-lag guard, exactly as menuHistSupported (v89) and menuPriceHistSupported (v90): the boot
   read IS the probe, and an unapplied migration degrades to "record nothing" rather than firing a failed
   write — and a red toast — on every plate save. The migration is applied by hand before this code
   ships, so in practice this never fires; it exists because previews and production share one database
   and a preview can be newer than the schema. */
var changeLogSupported = true;
/* The closed set of kinds. A typo in a call site must not quietly mint a twelfth category that the chart
   will never draw and nobody will notice is missing — changeEntry REFUSES an unknown kind outright. */
var CHANGE_KINDS = ['plate_created','plate_edited','plate_deleted',
                    'ingredient_repointed','ingredient_deleted',
                    'dish_added','dish_linked','dish_price','dish_moved','dish_removed','menu_deleted'];
/* Client-generated, like every other id in this app (SP*, um*, MENU*, K*). That is what makes a restore
   exactly idempotent: an entry carries its own identity into the backup file and back out, so the server
   can `on conflict (id) do nothing` rather than guess at a natural key. The counter breaks ties within a
   millisecond, which is real here — the invoice import can write several entries in one pass. */
/* 173: this was the PRECEDENT for `uid` and is now one of its callers rather than a near-copy.
   Its own comment already had the whole argument — "the counter resets to 0 on every page load, so
   two tabs acting in the same millisecond would otherwise mint the SAME id" — and the same sentence
   is true of two ACCOUNTS, which is what `uid` generalises it to. The old per-load token drew from
   1296 values; `uid` draws from 36^8, on `crypto` where it exists.
   Nothing about the contract changes: still `CL`-prefixed, still time-ordered, still unique enough
   for the `on conflict (id) do nothing` the restore's idempotency turns on. */
function nextChangeId(){ return uid('CL'); }
/* Server rows win on a shared id; entries that exist only here survive. See the call site in
   bootstrapSync for why replacing would lose exactly the entries worth keeping. */
function mergeChangeLog(server, local){
  var seen={}, out=[];
  (server||[]).forEach(function(e){ if(e && !seen[e.id]){ seen[e.id]=1; out.push(e); } });
  (local||[]).forEach(function(e){ if(e && !seen[e.id]){ seen[e.id]=1; out.push(e); } });
  out.sort(function(a,b){ return a.t-b.t; });
  return out.length>500 ? out.slice(-500) : out;
}
/* PURE, and total: same input, same entry, no globals and no clock. Returns null for an unknown kind or
   a missing id/time, so a bad call site produces nothing rather than a malformed row. Normalisation is
   the point — menuIds is always an array of unique non-empty strings, the four figures are a finite
   number or null (never NaN, never ''), and detail is always an object. */
function changeEntry(kind, o){
  o=o||{};
  if(CHANGE_KINDS.indexOf(kind)<0) return null;
  if(!o.id || !isFinite(o.t)) return null;
  var num=function(x){ return (typeof x==='number' && isFinite(x)) ? x : null; };
  var seen={}, ids=[];
  (Array.isArray(o.menuIds)?o.menuIds:(o.menuIds?[o.menuIds]:[])).forEach(function(m){
    if(!m || seen[m]) return; seen[m]=1; ids.push(String(m));
  });
  return {id:String(o.id), t:o.t, kind:kind, plateId:o.plateId||null, dishId:o.dishId||null, menuIds:ids,
    avgBefore:num(o.avgBefore), avgAfter:num(o.avgAfter),
    costBefore:num(o.costBefore), costAfter:num(o.costAfter),
    detail:(o.detail && typeof o.detail==='object' && !Array.isArray(o.detail))?o.detail:{}};
}
/* Record one intervention. `avgBefore` must be captured by the caller BEFORE it mutates anything;
   `avgAfter` defaults to the figure as it stands now, which is why this is called after the repaint.
   Both may legitimately be null — an unpublished plate moves no average at all, and saying so honestly
   beats inventing a zero. Returns the entry, or null when nothing was recorded. */
function logChange(kind, o){
  o=o||{};
  if(o.avgAfter===undefined) o.avgAfter=computeAvgFoodCost();
  var e=changeEntry(kind, Object.assign({id:nextChangeId(), t:Date.now()}, o));
  if(!e) return null;
  changeLog.push(e);
  if(changeLog.length>500) changeLog=changeLog.slice(-500);   // the same window priceHistory keeps; the server holds the lot
  if(changeLogSupported) dbPushChange(e);
  repaintDashboardIfVisible();   // v115 (pre-push review): the dashboard draws this log now, and the entry lands after logHistory's own repaint
  return e;
}
/* The success gate, in one place. `write` is whatever pushWrite handed back: a settled promise resolving
   to the result, to {error}, or to null when there is no client. pushWrite has ALREADY surfaced the real
   error to a toast, so there is nothing to say here — the only decision is whether the intervention
   happened. The rejection handler is belt-and-braces for the same reason dbDeletePlateAfterDishes has
   one: pushWrite always resolves today, and if that ever changed this would silently stop logging. */
function logChangeIfSaved(write, kind, o){
  return Promise.resolve(write).then(function(r){
    if(!r || r.error) return null;
    return logChange(kind, o);
  }, function(){ return null; });
}
// v90: ingMovePct (v74) was removed with dishDriver, its only caller. The movement families now read
// ingPriceAt against a fixed reference moment instead of "the last logged step", which is what lets
// them name a month honestly. Nothing else referenced it.
/* ---- v90: per-plate SELL-PRICE log (Supabase table menu_price_history + a localStorage mirror) ----
   Ingredient prices have been logged since early on; sell prices never were. Without them the app can
   say a plate's COST rose but not whether the PRICE moved with it — so "its cost rose, its price
   didn't" and "over target N months running" were claims it could not stand behind. This starts that
   clock. Same {menuItemId: [{t,v}]} shape as menuHistory, so mergeMenuHistory (v89) merges it too. */
var menuPriceLog = {};
/* Schema-can-lag guard, exactly as menuHistSupported (v89): bootstrapSync probes for the table once
   and clears this if it isn't there, so an unapplied migration degrades to local-only history rather
   than a failing write on every price edit. */
var menuPriceHistSupported=true;
function dbPushMenuPrice(id, iso, v){ pushWrite(function(){ return SUPA.from('menu_price_history').insert(pointToRow(iso, v, 'price', 'menu_item_id', id)); }, 'menu price history'); }
/* Record one dish's sell price. Deduped on VALUE, not on time: a price is a discrete decision, so every
   change deserves a point and an unchanged price deserves none — unlike the food-cost series, which
   moves continuously and needs the hourly guard. Returns true when a point was actually added. */
function logMenuPrice(id, price){
  if(id==null || !(price>0) || !isFinite(price)) return false;
  var a=menuPriceLog[id]||(menuPriceLog[id]=[]);
  var last=a.length?a[a.length-1].v:null;
  if(last!=null && Math.abs(last-price) < 0.005) return false;       // same price to the cent — nothing changed
  a.push({t:new Date().toISOString(), v:price});
  if(a.length>60) menuPriceLog[id]=a.slice(-60);
  return true;
}
/* ONE funnel, called from logHistory — which already fires on every data-changing event — rather than
   sprinkled across the five places a menu_items row gets written. A write path added later is covered
   automatically, and the value dedup makes running it often free. On the very first run it seeds a
   baseline point for every dish that already has a price, so the history is useful from v90 onward
   instead of only from the next time somebody edits something. */
function logAllMenuPrices(){
  var iso=new Date().toISOString();
  (typeof MENU!=='undefined'?MENU:[]).forEach(function(m){
    if(!m || !(m.price>0)) return;
    if(logMenuPrice(m.id, m.price) && menuPriceHistSupported) dbPushMenuPrice(m.id, iso, m.price);
  });
}
/* The sell price in force at a moment: the last point at or before it. null when the log doesn't reach
   back that far — the caller must then stay silent rather than substitute today's price. */
function priceAtOrBefore(id, ms){
  var a=menuPriceLog[id]; if(!a || !a.length) return null;
  var out=null;
  for(var i=0;i<a.length;i++){ if(ptMs(a[i])<=ms) out=a[i].v; else break; }
  return out;
}
/* True only when the log PROVES the price has not moved since `ms`: it must reach back that far, and
   every point from there on must carry the same value. An empty or too-short log returns false, so the
   "its price didn't move" clause is omitted rather than guessed. */
function priceHeldSince(id, ms){
  var a=menuPriceLog[id]; if(!a || !a.length) return false;
  if(ptMs(a[0])>ms) return false;                                    // the log starts after the moment asked about — it cannot know
  var base=priceAtOrBefore(id, ms); if(base==null) return false;
  for(var i=0;i<a.length;i++){ if(ptMs(a[i])>ms && Math.abs(a[i].v-base)>=0.005) return false; }
  return true;
}
function costRangeForLines(lines){                                   // dish cost at each ingredient's lowest and highest logged price
  var lo=0, hi=0, any=false;
  (lines||[]).forEach(function(l){
    if(l&&l.misc){ var mc=Number(l.cost)||0; lo+=mc; hi+=mc; return; }
    var p=lineProduct(l); if(!p) return; var cur=cpbu(p); if(cur==null) return;
    var pid=l.kid?(kById[l.kid]&&kById[l.kid].pid):l.pid;
    var band=ingPriceBand(pid); var mn=band?band.min:cur, mx=band?band.max:cur;
    lo+=mn*l.qty; hi+=mx*l.qty; if(mx-mn>1e-9) any=true;
  });
  return {min:lo, max:hi, hasRange:any};
}
function dishesOverTarget(){                                         // dishes whose food cost sits above the target (margin under target)
  var over=0; MENU.forEach(function(m){ if(!(m.price>0)) return; var sp=plateForMenuItem(m); if(!sp) return;
    var c=costFromLines(sp.lines); if(!(c>0)) return; var a=analyze(c, m.price); if(a.state==='under') over++; });
  return over;
}
function dbPushHistory(iso, v){ pushWrite(function(){ return SUPA.from('price_history').insert(pointToRow(iso, v, 'avg_food_cost_pct')); }, 'price history'); }
function dbPushMenuHistory(iso, v, menuId){ pushWrite(function(){ return SUPA.from('price_history').insert(pointToRow(iso, v, 'avg_food_cost_pct', 'menu_id', menuId)); }, 'menu price history'); }
/* v89: one aggregator, two callers. scope===DASH_ALL (or falsy) is the all-menus figure; any other
   scope is a menu id and narrows to that menu's dishes.

   ⚠️ v97 — THE UNIT IS A PUBLICATION, AND THAT IS A DECISION, NOT AN OVERSIGHT. ⚠️
   This iterates MENU (dishes/menu_items), and since v55 ONE plate can back MANY dishes — one per menu it
   is published to. So a plate on three menus contributes THREE terms to the all-menus mean. That looks
   exactly like a double-counting bug, and v97 briefly "fixed" it to count distinct plates. DON'T. It was
   reverted on purpose, by Max, on real data. Read this before touching it:

   Counting per publication makes the all-menus figure a dish-count-WEIGHTED BLEND of the per-menu
   figures, so it is arithmetically guaranteed to sit inside the range of the By-menu rows. Counting
   distinct plates does not: a plate on two menus that is dearer than average loses its second copy, and
   the headline drops BELOW every row. On Max's own data that is exactly what happened — All menus 21.4%
   against rows of 21.6% and 21.7%, caused by one plate (Bacon & Egg Muffin, ~29.4%) on both menus. A
   headline that contradicts every row underneath it costs more trust than the 0.19pt correction buys.

   THE KNOWN COST, accepted with eyes open (Max, 29 Jul): publishing an existing plate to another menu
   MOVES this number, though nothing got dearer. That is real and it is pinned by a test, so it can't be
   mistaken for a regression. If you want to revisit it, the fix is not to change the maths quietly — it
   is to make the By-menu list stop presenting the headline as comparable to the rows.

   Deliberately NOT mean-of-menu-averages either: that weights a three-plate specials menu equally with a
   forty-plate main menu, i.e. it measures how the menus have been SPLIT. */
var DASH_ALL='all';
function avgFoodCostForScope(scope){
  var vals=[];
  MENU.forEach(function(m){
    if(!(m.price>0)) return;
    if(scope && scope!==DASH_ALL && (m.menuId||'MENU_ORIGINAL')!==scope) return;
    var sp=plateForMenuItem(m);                                        // the ONLY sanctioned resolution path (rule 6)
    if(!sp) return;
    var c=costFromLines(sp.lines);
    if(c>0) vals.push(c/m.price);
  });
  if(!vals.length) return null;
  return vals.reduce(function(a,b){return a+b;},0)/vals.length*100;   // percent
}
function computeAvgFoodCost(){ return avgFoodCostForScope(DASH_ALL); }
/* v89: which menu the DASHBOARD is looking at. Deliberately NOT currentMenuId — that is the Menu tab's
   own selection, and re-scoping a read-only dashboard must not silently re-point the tab where Max edits
   prices. The two stay separate; only the storage KEY is new.

   v97 — NOW PERSISTED. v96 merged the picker into the By-menu list, which made that list the dashboard's
   only scope control; a reload then silently returned to All menus, and the app reloads itself on deploy,
   so it fired without the user doing anything. This is the SAME mechanism the chart timeframe uses
   (dashRange, above): localStorage only, same cafeDB_ namespace, read once here, written on selection.
   Device-local by design — a view preference is not data, so no Supabase and no pushWrite; it must never
   become a row that needs business-scoping when multi-tenant lands. The menu's ID is stored, never its
   list position: the ranking moves whenever prices move.

   VALIDATED AT RENDER, NOT HERE. dashScopeValid() already collapses a scope with no row to All menus,
   silently, which is exactly the required fallback for a menu that has since been deleted. Checking here
   instead would be wrong: menusList loads after this module var initialises, so a boot-time check would
   discard every valid scope while sync is still in flight. */
var dashScope=(function(){ try{ return localStorage.getItem('cafeDB_dashScope')||DASH_ALL; }catch(e){ return DASH_ALL; } })();
function dashScopeValid(){
  if(dashScope===DASH_ALL) return DASH_ALL;
  // The invariant is v89's, unchanged: a narrowed scope exists if and only if the control that can
  // undo it is on screen. v96 moved that control — the picker is gone and the By-menu list IS the
  // selector — so this now asks the LIST, not menusList. A row exists per COSTED menu, which is a
  // strictly smaller set than "menus that exist", and it closes the same trap in three shapes at
  // once: the menu was deleted, fewer than two costed menus remain (the list stops rendering), or
  // the scoped menu's last costed plate went away. Any of those and there is no row to press.
  var rows=menuComparisonRows();
  if(rows.length<2) return DASH_ALL;
  return rows.some(function(r){return r.id===dashScope;})?dashScope:DASH_ALL;
}
function dashScopeLabel(scope){ return (scope===DASH_ALL)?'across all menus':('on '+menuNameById(scope)); }
// v97: write on SELECTION only — not on render, not on a scope-dependent recompute. Mirrors setDashRange.
function setDashScope(scope){ dashScope=scope||DASH_ALL; try{ localStorage.setItem('cafeDB_dashScope',dashScope); }catch(e){} renderDashboard(); }
/* v89: the By-menu list. Ranked by average food cost %, LOWEST first — lower food cost is the better
   result. Menus with nothing costed on them are excluded rather than shown as 0% or "—": a menu with no
   costed plates has no cost efficiency to rank, and an empty row invites a comparison that isn't there.
   NOTE (honesty rule): this ranks COST EFFICIENCY only. EzPlate has no sales-volume data, so it can never
   say which menu earns more — only which one costs less per dollar of menu price. */
function menuComparisonRows(){
  var list=(typeof menusList!=='undefined'?menusList:[]);
  return list.map(function(m){ return {id:m.id, name:m.name, season:m.season||'', pct:avgFoodCostForScope(m.id)}; })
             .filter(function(r){ return r.pct!=null; })
             // v98 (Max, 31 Jul): WORST first — highest food cost % leads. Was best-first since v89;
             // with the desktop selector card scrolling internally, overflow must hide the healthy
             // menus, not the ones that need attention.
             .sort(function(a,b){ return b.pct-a.pct || String(a.name).localeCompare(String(b.name)); });
}
function logHistory(){
  // v60 item 1a (LIVENESS): a data-changing event (price edit, invoice apply, plate save) must ALWAYS
  // refresh a visible dashboard — the header "% today" and stat cards are computed live in renderDashboard,
  // so the fix is simply to re-render. Logging a NEW trend point is separate and still deduped: two edits a
  // minute apart shouldn't stipple the line, but the today figure must still move. So the dedup guards only
  // the point push, NOT the re-render (the old code returned before re-rendering on a deduped change — that
  // was the staleness bug). Cheapest correct mechanism, no polling.
  var v=computeAvgFoodCost();
  if(v!=null){
    v=Math.round(v*10)/10;
    var iso=new Date().toISOString();
    var last=priceHistory[priceHistory.length-1];
    var dup = last && Math.abs(last.v-v)<0.05 && (Date.now()-new Date(last.t).getTime())<3600000;  // near-duplicate within the hour
    if(!dup){
      priceHistory.push({t:iso, v:v});
      if(priceHistory.length>500) priceHistory=priceHistory.slice(-500);
      dbPushHistory(iso, v);
    }
  }
  logMenuHistory();
  logAllMenuPrices();                                                 // v90: capture any sell price that moved (value-deduped, so this is free when none did)
  repaintDashboardIfVisible();
}
/* v115: the visible-tab repaint, shared by logHistory and logChange. logChange needs it because the
   dashboard now RENDERS the change log (markers + since-line), and an entry lands only when its
   carrying write settles — a beat after logHistory's synchronous repaint — so a user sitting on the
   Dashboard would otherwise see the surface one entry stale until their next navigation. */
function repaintDashboardIfVisible(){
  try{ if(typeof updateDashNavBadge==='function') updateDashNavBadge(); }catch(_){ }   // v133: the badge updates even when the dashboard pane is hidden — a price edit on another tab must not leave it stale
  try{ var dash=document.getElementById('tab-dashboard'); if(dash && dash.style.display!=='none') renderDashboard(); }catch(_){ }
}
/* v89: the same point-logging contract as logHistory, once per menu that has costed, priced plates.
   Deduped per series (a menu whose figure hasn't moved doesn't stipple its own line), capped per series,
   and a menu with nothing costed on it logs nothing at all rather than a misleading zero. */
function logMenuHistory(){
  var list=(typeof menusList!=='undefined'?menusList:[]);
  if(!list.length) return;
  var iso=new Date().toISOString(), now=Date.now();
  list.forEach(function(mn){
    var v=avgFoodCostForScope(mn.id);
    if(v==null) return;                                              // nothing costed on this menu — no point, no zero
    v=Math.round(v*10)/10;
    var arr=menuHistory[mn.id]||(menuHistory[mn.id]=[]);
    var last=arr[arr.length-1];
    if(last && Math.abs(last.v-v)<0.05 && (now-ptMs(last))<3600000) return;   // near-duplicate within the hour
    arr.push({t:iso, v:v});
    if(arr.length>500) menuHistory[mn.id]=arr.slice(-500);
    if(menuHistSupported) dbPushMenuHistory(iso, v, mn.id);
  });
}

/* ---------- shared COGS editor (used by Menu Analysis + Dashboard) ---------- */

/* ---------- supplier extraction from invoice header (Feature 1) ---------- */
var invSupplier='';
/* ===== supplier memory: state + persistence ===== */
var supplierMem={};
function normSupplier(s){ return String(s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function memKey(supplier, phrase){ return normSupplier(supplier)+'|'+normalizePhrase(phrase); }
function dbPushSupplierPhrase(e){ pushWrite(function(){ return SUPA.from('supplier_phrases').upsert(supplierPhraseToRow(e)); }, 'supplier phrase'); }
function dbDeleteSupplierPhrase(id){ pushWrite(function(){ return SUPA.from('supplier_phrases').delete().eq('id',id); }, 'supplier phrase delete'); }
function rememberSupplierPhrase(supplier, phrase, qty, unit, pid){
  if(!normSupplier(supplier) || !(qty>0)) return;                 // no supplier -> never store
  var id=memKey(supplier, phrase);
  var e={id:id, supplier:supplier, phrase_norm:normalizePhrase(phrase), qty:qty, unit:unit, pid:(pid||(supplierMem[id]&&supplierMem[id].pid)||null)};
  supplierMem[id]=e; dbPushSupplierPhrase(e);  // same id => one entry, overwritten (never duplicated)
}
function syncMemoryToProduct(pid, qty, unit){                     // ITEM 1: keep Remembered items in step with the product's taught pack
  if(!pid || !(qty>0)) return;
  for(var id in supplierMem){ var e=supplierMem[id];
    if(e && e.pid===pid && (e.qty!==qty || (e.unit||'')!==(unit||''))){ e.qty=qty; e.unit=unit; dbPushSupplierPhrase(e); }
  }
}
function renderSmemList(){
  var box=document.getElementById('smemList'); if(!box) return;
  var ids=Object.keys(supplierMem);
  if(!ids.length){ box.innerHTML='<div class="smem-empty">Nothing saved yet. When you tell EzPlate a pack size while importing an invoice, it\u2019ll be remembered here.</div>'; return; }
  ids.sort(function(a,b){ return (supplierMem[a].supplier+supplierMem[a].phrase_norm).localeCompare(supplierMem[b].supplier+supplierMem[b].phrase_norm); });
  function cap(s){ s=String(s||'').trim(); return s?s.charAt(0).toUpperCase()+s.slice(1):s; }
  // v71 item 5 (Max): a taught pack is user-confirmed ground truth the app relies on for correct costings, so
  // it is READ-ONLY here (no inline qty edit \u2014 that risked silently miscosting, the same reason pack/unit are
  // create-only on products). The deliberate correction path is Remove, then let the next invoice re-teach it.
  box.innerHTML=ids.map(function(id){ var e=supplierMem[id]; var ul=e.unit==='ea'?'units':e.unit==='l'?'L':e.unit==='ml'?'mL':e.unit;
    return '<div class="smem-row" data-id="'+esc(id)+'"><div class="smem-main"><div class="smem-sentence">'+esc(cap(e.phrase_norm))+' \u2014 from '+esc(e.supplier)+'</div></div>'
      +'<span class="smem-eq">=</span><span class="smem-qty-ro">'+esc(String(e.qty))+' '+esc(ul)+'</span>'
      +'<button type="button" class="smem-del">Remove</button></div>';
  }).join('');
  box.querySelectorAll('.smem-row').forEach(function(row){
    var id=row.getAttribute('data-id');
    row.querySelector('.smem-del').addEventListener('click', function(){ delete supplierMem[id]; dbDeleteSupplierPhrase(id); renderSmemList(); toast('Removed'); });
  });
}
function openSmem(){ renderSmemList(); show('smemModal'); }
function closeSmem(){ hide('smemModal'); }   // F9 (v148): no reopen — the Settings screen is still there underneath
function invSupplierDetect(text){
  var lines=(text||'').split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean).slice(0,20);
  function clean(s){ return s.replace(/\s+/g,' ').replace(/\b(pty\.?\s*ltd\.?|p\/l|ltd\.?)\b\.?$/i,'').replace(/[|,;].*$/,'').trim(); }
  // 1) explicit "Supplier: X" style anywhere
  for(var i=0;i<lines.length;i++){
    var m=lines[i].match(/^(?:supplier|vendor|from|sold by|distributed by)\s*[:\-]\s*(.+)$/i);
    if(m && m[1].trim().length>=2){ invDbg('[supplier] explicit label:', m[1]); return clean(m[1]); }
  }
  // Header = the block before the first "Invoice"/"Tax Invoice"/"Statement" heading (the letterhead area).
  var stop=lines.length;
  for(var s=0;s<lines.length;s++){ if(/\b(?:tax\s+)?invoice\b|\bstatement\b/i.test(lines[s])){ stop=s; break; } }
  var header=lines.slice(0, stop>0?stop:Math.min(lines.length,8));
  /* v107 ROOT CAUSE: the heading is NOT a reliable end-of-letterhead. On Bidfood's layout (all four
     of Max's real invoices) the extracted order is "Document No:" / "I\u2026\u200b.SUN" / "TAX INVOICE" /
     "BIDFOOD SUNSHINE COAST a division of" \u2014 the trading name is one line BELOW the heading, so the
     slice above holds only the document number and the supplier line is unreachable. Give the
     KNOWN-NAME pass a window that spans the heading; it matches only values already present in the
     user's own products, so widening it cannot invent a supplier, only find one it would have
     missed. The GUESSER below keeps the narrow letterhead \u2014 that one can be wrong, so it stays tight. */
  var knownWin=lines.slice(0, Math.min(lines.length, Math.max(stop+8, 12)));
  /* 2) a known SUPPLIER, then a known BRAND. The two are searched over different windows on purpose
     (CodeRabbit, v107): a supplier value IS the answer to "who invoiced this", so it earns the wide
     window. A brand is only circumstantial evidence, and the wide window can reach far enough down a
     compact invoice to touch the first item rows — where a brand like "Tip Top" would be read as the
     supplier. Brands therefore stay confined to the letterhead exactly as before v107. */
  function longestIn(win, vals){
    var hay=win.join('\n').toLowerCase(), hit=null;
    vals.forEach(function(k){ if(k && k.length>=3 && hay.indexOf(k.toLowerCase())>=0){ if(!hit||k.length>hit.length) hit=k; } });
    return hit;
  }
  var uniq=function(a){ return Array.from(new Set(a.filter(Boolean))); };
  var bestSup=longestIn(knownWin, uniq(PRODUCTS.map(function(p){return p.supplier;})));
  if(bestSup){ invDbg('[supplier] known supplier in header:', bestSup); return bestSup; }
  var bestBrand=longestIn(header, uniq(PRODUCTS.map(function(p){return p.brand;})));
  if(bestBrand){ invDbg('[supplier] known brand in letterhead:', bestBrand); return bestBrand; }
  // 3) first business-name-looking line in the header (skip ABN/address/phone/date/number lines)
  for(var j=0;j<header.length;j++){
    var L=header[j];
    if(/\d{2}[\/\-.]\d{2}|\babn\b|\bacn\b|statement|street|\brd\b|\bst\b|road|p\.?\s*o\.?\s*box|phone|ph:|fax|email|www\.|@|\$|\d{3,}/i.test(L)) continue;
    /* v107: a BARE FIELD LABEL is not a business name. "Document No:" carries no digits, no address
       word and no punctuation the filters above look for, so it passed every one of them and became
       the supplier on six of Max's seven taught packs. Labels WITH their value ("Document No: 47821")
       were already caught by the \d{3,} rule \u2014 it is the label alone, its value wrapped to the next
       line by PDF extraction, that leaked. Skipping it makes an unidentified supplier come back
       BLANK, and blank is safe: rememberSupplierPhrase refuses to store without a supplier.
       The list includes strategy 1's OWN labels (supplier/vendor/sold by/…) — CodeRabbit, v107:
       strategy 1 needs `label: value` on one line, so a bare "Supplier:" whose value wrapped falls
       through to here, and without this would be returned as a supplier literally named "Supplier:".
       Matching is whole-line, so a real business ("Page Brothers", "Account Foods") is untouched. */
    if(/^(?:(?:document|invoice|order|purchase|customer|account|delivery|docket|consignment|reference|ref|page|date|our|your|route|tax|no|number|supplier|vendor|sold|distributed|from|by|to|ship|bill)\b[\s.#:—–-]*)+$/i.test(L)) continue;
    if(/[A-Za-z]{3,}/.test(L) && L.length<=42){ invDbg('[supplier] header business name:', L); return clean(L); }
  }
  invDbg('[supplier] could not identify \u2014 left blank'); return '';   // no guess
}

/* ============================================================
   Feature 3 — Ingredients page
   ============================================================ */
/* Item 1C — shared empty-state (icons echo the nav tab icons at large size) */
var ICON_LEAF_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9"/><path d="M12 12C12 8 9.2 5.5 5 5.5c0 4.2 2.8 6.5 7 6.5Z"/><path d="M12 9.5c0-3 2.4-4.5 6-4.5 0 3.2-2.4 4.7-6 4.7Z"/></svg>';   /* v36: tomato (was leaf) — matches the tab glyph */
var ICON_BOX_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
var ICON_MENU_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="14"/></svg>';   // v58: the Menu nav glyph (ascending bars)
/* ===== v58: THE empty-state system — ONE place every tab's empty state is built =====
   Two mutually-exclusive variants; NO inline empty-state markup lives anywhere else. The marker
   class `es-built` is emitted ONLY here — the route-through test asserts every tab goes through it.
   A: search/filter-empty (data exists, nothing matches) -> emptySearchState. B: true-empty (no data
   at all) -> emptyStateHtml. A tab renders exactly one, never both. */
function emptyStateHtml(icon,title,body,actionsHtml){   // variant B: true-empty
  return '<div class="empty-state es-built">'+icon+'<h3>'+esc(title)+'</h3>'
    +(body?'<p>'+esc(body)+'</p>':'')
    +(actionsHtml?'<div class="es-actions">'+actionsHtml+'</div>':'')+'</div>';
}
// variant A: ONE action, the SAME label on every tab; clearFn resets that tab's search AND any
// active filters, then rerenders. No getting-started guidance in this variant, ever.
function emptySearchState(icon,noun,clearFn){
  return emptyStateHtml(icon,'No '+noun+' match.','',
    '<button class="linklike es-clear" type="button" onclick="'+clearFn+'()">Clear search &amp; filters</button>');
}
// per-tab clear helpers — shared by the empty-state action AND the header "Clear filters" button.
function clearProductFilters(){ ['ingSearch','ingCatFilter','ingSupFilter'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; }); renderIngredients(); }
function clearIngredientFilters(){ var el=document.getElementById('kingSearch'); if(el) el.value=''; kingQuery=''; var c=document.getElementById('kingCatFilter'); if(c) c.value=''; renderKitchenPanel(); }
function clearPlateFilters(){ var s=document.getElementById('plateSearch'); if(s) s.value=''; var f=document.getElementById('plateCatFilter'); if(f) f.value=''; renderPlatesTab(); }
// v68: Menu tab margin-light filter — multi-select tappable chips (green/amber/red). Empty = show all;
// tapping red shows red only; tapping amber too shows amber+red (the "everything needing attention" case).
var menuLightFilter=[];
function lightFilterPass(active, light){                            // pure (tested): no active lights ⇒ everything; else only the active lights
  if(!active || !active.length) return true;
  return active.indexOf(light)>=0;
}
function toggleMenuLight(light){
  var i=menuLightFilter.indexOf(light);
  if(i>=0) menuLightFilter.splice(i,1); else menuLightFilter.push(light);
  syncMenuLightChips(); renderAnalysis();
}
function syncMenuLightChips(){                                      // reflect state on the chips (active vs inactive + aria-pressed)
  ['green','amber','red'].forEach(function(lt){
    var b=document.querySelector('.mlf-chip[data-light="'+lt+'"]'); if(!b) return;
    var on=menuLightFilter.indexOf(lt)>=0;
    b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false');
  });
}
function clearMenuFilters(){ var m=document.getElementById('menuSearch'); if(m) m.value=''; var c=document.getElementById('menuCatFilter'); if(c) c.value=''; menuLightFilter=[]; syncMenuLightChips(); renderAnalysis(); }
function ingUnitLabel(p){ return p.base_unit==='g'?'per kg':p.base_unit==='ml'?'per litre':p.base_unit==='ea'?'per unit':(p.base_unit||''); }
var TIDY_DOOR='__tidy__';   // v60 item 8: sentinel option value = "open the Tidy modal scoped to this field"
function fillFilter(sel, list, label){
  if(!sel) return; var cur=sel.value;
  var html='<option value="">'+label+'</option>'+list.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');
  if(sel.dataset && sel.dataset.tidyField) html+='<option value="'+TIDY_DOOR+'">✎ Manage list…</option>';   // one door per category/supplier filter
  sel.innerHTML=html; if(cur && list.indexOf(cur)>=0) sel.value=cur;
}
/* F4 (v140): the mock's §3.5 header subtitle. The mock's own slot holds a strapline; this app's
   catalogue is ~400 products, where the count is the more useful sentence — and while a filter is on
   it answers the question #ingCount used to, so deleting that line loses nothing. Unfiltered it
   counts the WHOLE library (what you have), not the filtered view (what you searched), which is the
   rule F2 and F3 already set. */
function prodHeadSummary(total, shown, filtered){
  if(!total) return '';
  if(filtered) return shown+' of '+total+' product'+(total===1?'':'s');
  var sup=prodSuppliers().length;
  var bits=[total+' product'+(total===1?'':'s')];
  if(sup) bits.push(sup+' '+(sup===1?'supplier':'suppliers'));
  return bits.join(', ');
}
function renderIngredients(){
  var wrap=document.getElementById('ingList'); if(!wrap) return;
  var sub=document.getElementById('ingHeadSub');
  var note=document.getElementById('ingListNote');
  var showNote=function(on){ if(note) note.hidden=!on; };
  var ctl=document.getElementById('ingControls');
  var showControls=function(on){ if(ctl) ctl.hidden=!on; };
  if(!PRODUCTS.length){                                               // brand-new user: no products at all -> full empty state (gate on the store, not the filtered rows)
    if(sub) sub.textContent='';
    showNote(false); showControls(false);   // nothing to search, and fillFilter has not run — an option-less select is a control that does nothing (F2's true-empty defect)
    /* §5's composed empty state, and this screen's FIRST-RUN state (§5 makes them one).
       "New product" without the "+": §7 allows one label per intent, and the header's primary now
       carries it. Import stays the primary here — a new café gets its catalogue from invoices. */
    wrap.innerHTML=emptyStateHtml(ICON_BOX_BIG,'No products yet.','Import an invoice to fill your catalogue, or add one product by hand.',
      '<button class="btn primary" type="button" onclick="document.getElementById(\'importBtn\').click()">Import invoice</button>'
      +'<button class="btn" type="button" onclick="openModal()">New product</button>');   // v45 item 4: "Add product" -> "New product" everywhere
    return;
  }
  showControls(true);
  fillFilter(document.getElementById('ingCatFilter'), prodCategories(), 'All categories');
  fillFilter(document.getElementById('ingSupFilter'), prodSuppliers(), 'All suppliers');
  var q=(document.getElementById('ingSearch')?document.getElementById('ingSearch').value:'').trim().toLowerCase();
  var toks=searchTokens(q);   // v59: shared token matcher
  var cat=(document.getElementById('ingCatFilter')||{}).value||'';
  var sup=(document.getElementById('ingSupFilter')||{}).value||'';
  var cf=document.getElementById('ingClearFilters'); if(cf) cf.style.display=(q||cat||sup)?'':'none';   // v54: hidden when nothing is active (matches the app's hide-inert pattern)
  var items=PRODUCTS.filter(function(p){
    if(cat && p.category!==cat) return false;
    if(sup && (p.supplier||'')!==sup) return false;
    if(toks.length){ var hay=((p.description||'')+' '+(p.brand||'')+' '+(p.category||'')+' '+(p.supplier||'')).toLowerCase(); if(!matchTokens(toks,hay)) return false; }
    return true;
  }).slice().sort(function(a,b){return (a.description||'').toLowerCase().localeCompare((b.description||'').toLowerCase());});
  if(sub) sub.textContent=prodHeadSummary(PRODUCTS.length, items.length, !!(q||cat||sup));
  if(!items.length){ showNote(false); wrap.innerHTML=emptySearchState(ICON_BOX_BIG,'products','clearProductFilters'); return; }   // v58: variant A via the shared helper
  showNote(true);
  /* The column band labels the desktop table (mock §3.5), rows-present branch only.
     ⚠ The mock's fourth heading is "Pack price" and THAT LABEL WOULD BE A LIE HERE (R2).
     `dispPrice` renders a per-base-unit figure ("$3.45/kg"); the pack price is a different number,
     living on the edit form as `ig_price` against `ig_packQty`. So the column ships with the mock's
     position and the honest heading — the same word Ingredients uses for the same kind of figure, so
     the two screens cannot teach a chef two names for one number. Same refusal F3 made of the
     mock's "30-day change". */
  var band='<div class="ing-band" aria-hidden="true"><span>Product</span><span>Category</span><span>Supplier</span>'
    +'<span class="ib-num">Unit cost</span><span class="ib-num">Last change</span></div>';
  wrap.innerHTML=band+items.map(function(p){
    /* Q7 (v126) unchanged in substance: the change column reads the last LOGGED move, by the same
       ingLastMovePct rule the Ingredients row and the dashboard's What-moved panel use, so the three
       can never disagree. F4 changes only how it LOOKS — a tinted mono pill (mock §3.5), and the
       muted word "steady" where there is no logged move, replacing the bare dash. "steady" is not
       "no change": it is "no move worth reporting", which the aria-label says. Semantic colour: a
       price rise is bad. */
    var pct=ingLastMovePct(p.id);
    var drift=(pct==null)?'<span class="ing-drift none" aria-label="no recent price change">steady</span>'
      :('<span class="ing-drift '+(pct>0?'up':'down')+'" aria-label="price '+(pct>0?'up':'down')+' '+Math.abs(pct).toFixed(1)+'% at the last logged move">'+(pct>0?'+':'−')+Math.abs(pct).toFixed(1)+'%</span>');
    /* v99's rule survives Q7 by DEDUPING, not hiding: dispPrice's figure carries the basis for the
       normal units ("$3.45/kg"), so the label only renders when it ADDS information — an unknown/dim
       base_unit or a missing cost, exactly the rows where the label is the correctness flag the v20
       eggs bug made law. Untouched by the rebuild; the queue item names it as an R2 to keep. */
    var basisKnown=(['g','ml','ea'].indexOf(p.base_unit)>=0) && (cpbu(p)!=null);
    /* `is-nil` marks a PLACEHOLDER, not missing data: a desktop column needs a cell, so an absent
       category or supplier renders a dash there and is simply absent on the phone, where there are
       no columns to keep. The class is what the breakpoint rules key off, so it goes on both paths.
       `no-cat` rides the ROW so the phone's meta separator can be chosen in CSS without a sibling
       chain — the chain it replaces is the one that out-ranked a desktop column rule on F3 (§27). */
    var catCell='<span class="ing-tag'+(p.category?'':' is-nil')+'">'+esc(p.category||'—')+'</span>';
    var supCell='<span class="ing-tag sup'+(p.supplier?'':' is-nil')+'">'+esc(p.supplier||'—')+'</span>';
    return '<button class="ing-card'+(p.category?'':' no-cat')+'" type="button" data-id="'+esc(p.id)+'">'
      +'<span class="ing-main"><span class="ing-name">'+esc(p.description)+'</span>'
      +(p.brand?'<span class="ing-brand">'+esc(p.brand)+'</span>':'')+'</span>'
      +'<span class="ing-meta">'+catCell+supCell+'</span>'
      +'<span class="ing-price"><b>'+dispPrice(p)+'</b>'+(basisKnown?'':('<span class="ing-per">'+ingUnitLabel(p)+'</span>'))+'</span>'
      +drift
      +'</button>';
  }).join('');
  wrap.querySelectorAll('.ing-card').forEach(function(b){ b.onclick=function(){ openIngEdit(b.getAttribute('data-id')); }; });
}
/* v130: the Q7 (v126) density toggle is DELETED, not hidden (Max, 9 Aug 2026: it changes too
   little to earn a control a chef has to understand). prodDensity / setProdDensity /
   applyProdDensity and the seg-density control are gone; this tombstone keeps the names greppable.
   The one legal localStorage key it held (cafeDB_prodDensity) is actively removed so the store
   goes back to holding only live view preferences. */
try{ localStorage.removeItem('cafeDB_prodDensity'); }catch(e){}
var ingEditId=null;
function openIngEdit(id){
  var p=byId[id]; if(!p) return; ingEditId=id;
  document.getElementById('ingModalTitle').textContent='Edit product';
  document.getElementById('ig_name').value=p.description||'';
  document.getElementById('ig_brand').value=p.brand||'';
  document.getElementById('ig_cat').value=p.category||'';
  document.getElementById('ig_sup').value=p.supplier||'';
  var ut=p.base_unit==='g'?'kg':p.base_unit==='ml'?'litre':p.base_unit==='ea'?'unit':'kg';
  document.getElementById('ig_unit').value=ut;
  var pv=perDisplayValue(p); document.getElementById('ig_price').value=(pv==null?'':pv);
  document.getElementById('ig_packQty').value=(p.pack_qty==null?'':p.pack_qty);
  document.getElementById('ig_packUnit').value=(p.pack_unit||'');
  var e=document.getElementById('ig_err'); if(e)e.style.display='none';
  ['ig_brand','ig_cat','ig_sup'].forEach(function(x){ var d=document.getElementById(x+'Drop'); if(d)d.style.display='none'; });
  makeInlineCombo('ig_brand','ig_brandDrop',prodBrands);
  makeInlineCombo('ig_cat','ig_catDrop',prodCategories);
  makeInlineCombo('ig_sup','ig_supDrop',prodSuppliers);
  var puSel=document.getElementById('ig_packUnit');
  if(puSel && !puSel.__wired){ puSel.__wired=true; puSel.addEventListener('change', syncIgUnitFromPack); }
  var uSel=document.getElementById('ig_unit'); var lp=document.getElementById('ig_pricePer'); if(lp&&uSel) lp.textContent=igPriceSuffix();
  show('ingModal');
}
function packUnitToIgUnit(pu){ pu=(pu||'').toLowerCase(); return pu==='ea'?'unit':pu==='kg'?'kg':pu==='g'?'g':pu==='l'?'litre':pu==='ml'?'ml':null; }
function syncIgUnitFromPack(){                                        // when a pack unit is chosen, make the *displayed* unit match it
  var puSel=document.getElementById('ig_packUnit'); var uSel=document.getElementById('ig_unit'); if(!puSel||!uSel) return;
  if(uSel.disabled) return;                                          // v54: unit type is create-only on the EDIT form — never auto-change a product's base unit (it would corrupt saved plate costs)
  var want=packUnitToIgUnit(puSel.value); if(!want) return;
  if(uSel.value!==want){ uSel.value=want; var lp=document.getElementById('ig_pricePer'); if(lp) lp.textContent=igPriceSuffix(); }
}
function igPriceSuffix(){ var u=(document.getElementById('ig_unit')||{}).value; return u==='unit'?'/unit':u==='litre'?'/L':u==='ml'?'/mL':u==='g'?'/g':'/kg'; }
/* v108 (decision D3) \u2014 WHAT REFERENCES THIS PRODUCT.
   Pure, so it can be tested without a DOM. Returns {ingredients:[names], plates:[names]}.

   WHY THIS EXISTS AT ALL. Until now `deleted_prod_ids` filtered at RENDER time and the row stayed,
   so "deleting" a product could not break a plate that costed from it \u2014 every reference still
   resolved. That property was accidental, undocumented, and is exactly what a real DELETE removes.
   The chain is plate -> ingredient -> product, so the breakage lands on plate COSTS: a dangling pid
   makes a line cost nothing, and a plate quietly gets cheaper. In a costing app that is the worst
   possible failure, because the number still looks like a number.

   BOTH reference paths are checked, because both are live on real data (verified against production
   1 Aug 2026: of 179 plate lines, 81 reach a product through a kitchen ingredient's pid and 84 name
   one directly). Checking only the first would miss half of them. */
function productRefs(pid){
  var ings=(kitchenIngredients||[]).filter(function(k){ return k && k.pid===pid; });
  var kids={}; ings.forEach(function(k){ kids[k.id]=true; });
  var plates=(savedPlates||[]).filter(function(sp){
    return (sp && Array.isArray(sp.lines) ? sp.lines : []).some(function(l){
      return l && (l.pid===pid || (l.kid!=null && kids[l.kid]));
    });
  });
  return { ingredients:ings.map(function(k){ return k.name; }),
           plates:plates.map(function(sp){ return sp.name; }) };
}
function deleteIngredient(){
  var id=ingEditId; if(!id||!byId[id]) return; var nm=byId[id].description||'this product';
  var refs=productRefs(id);
  /* REFUSE, and name what breaks \u2014 not a generic "are you sure". Max's call (D3): the thing that
     protects the user is not reversibility, it is not silently breaking plate costs. Refusing is
     better than a scary confirm here because the fix is real work the user has to do anyway \u2014 an
     ingredient must point at SOME product, so repointing it first is the correct next step, not an
     obstacle. */
  /* BOTH reference kinds block the delete. Gating on `refs.ingredients` alone was a real bug \u2014 caught
     by CodeRabbit, and it is the exact failure this guard exists to prevent. `productRefs` finds the
     direct plate-line path correctly and the delete then ignored it, so a product used ONLY by a
     direct line (84 of Max's 179 lines take that route \u2014 the LARGER half) would have been deleted and
     the plate would quietly get cheaper. The unit tests pinned productRefs thoroughly and only
     structurally pinned deleteIngredient, which is precisely the gap that let it through. */
  if(refs.ingredients.length || refs.plates.length){
    var list=function(a){ return a.slice(0,3).join(', ')+(a.length>3?' and '+(a.length-3)+' more':''); };
    var plateCount=refs.plates.length, plural=(plateCount===1?'':'s');
    var msg;
    if(refs.ingredients.length){
      msg='\u201c'+nm+'\u201d is linked to the ingredient'+(refs.ingredients.length===1?' ':'s ')+list(refs.ingredients)+'.'
        + (plateCount?' Those are used by '+plateCount+' plate'+plural+', whose costs would break.':'')
        + ' Point '+(refs.ingredients.length===1?'it':'them')+' at another product first, then delete this one.';
    } else {
      msg='\u201c'+nm+'\u201d is used directly by '+plateCount+' plate'+plural+' ('+list(refs.plates)+'), whose cost'+plural
        + ' would break. Change '+(plateCount===1?'that plate':'those plates')+' first, then delete this one.';
    }
    askConfirm('Can\u2019t delete this product', msg, 'OK', function(){});
    return;
  }
  askConfirm('Delete product?', 'Remove \u201c'+nm+'\u201d from your products? Nothing is using it.', 'Delete', function(){
    // v108: a REAL delete. The tombstone list is gone \u2014 deletion means the row is gone, one meaning,
    // no second weaker way of saying it. Recoverable from the last backup export if ever needed.
    if(productsById[id]) delete productsById[id];
    dbDeleteIngredient(id);
    rebuild(); closeIngEdit(); renderIngredients(); toast('Product deleted');
  });
}
function closeIngEdit(){ hide('ingModal'); ingEditId=null; }
function saveIngEdit(){
  var id=ingEditId; if(!id||!byId[id]) return;
  var err=document.getElementById('ig_err'); function fail(m){ if(err){err.textContent=m;err.style.display='block';} }
  var name=document.getElementById('ig_name').value.trim();
  var price=parseFloat(document.getElementById('ig_price').value);
  // v54: unit type is create-only on the edit form. Derive it from the STORED product (same mapping
  // openIngEdit displays with), so an edit can never change base_unit/cost_basis — only the price does.
  var _bu=byId[id].base_unit;
  var unitType=_bu==='g'?'kg':_bu==='ml'?'litre':_bu==='ea'?'unit':'kg';
  if(!name) return fail('Enter a product name.');
  if(isNaN(price)||price<0) return fail('Enter a valid price per unit.');
  var cat=resolveCombo('ig_cat', prodCategories); if(!document.getElementById('ig_cat').value.trim()) cat={ok:true,value:''};
  if(!cat.ok) return fail('\u201c'+cat.value+'\u201d is a new category \u2014 pick \u201cCreate new\u201d to confirm.');
  var br=resolveCombo('ig_brand', prodBrands); if(!br.ok) return fail('\u201c'+br.value+'\u201d is a new brand \u2014 pick \u201cCreate new\u201d to confirm.');
  var sup=resolveCombo('ig_sup', prodSuppliers); if(!sup.ok) return fail('\u201c'+sup.value+'\u201d is a new supplier \u2014 pick \u201cCreate new\u201d to confirm.');
  var ub=invUnitToBase(unitType);
  var pq=parseFloat(document.getElementById('ig_packQty').value); var pu=document.getElementById('ig_packUnit').value;
  setProduct(id, {description:name, brand:br.value||null, category:cat.value||null, supplier:sup.value||null,
    base_unit:ub.base_unit, cost_basis:ub.cost_basis, cost_per_base_unit:price/ub.div,
    pack_qty:(isNaN(pq)?null:pq), pack_unit:(pu||null)});
  if(!isNaN(pq) && pq>0) syncMemoryToProduct(id, pq, (pu||'ea'));   // ITEM 1: no stale Remembered-items entry left behind
  logHistory();
  renderIngredients(); if(typeof renderPlate==='function') renderPlate(); if(typeof renderAnalysis==='function') renderAnalysis();
  closeIngEdit(); toast('Product updated');
}

/* ============================================================
   Feature 1 (Phase 2) — "My ingredients" panel + create/change/delete
   ============================================================ */
function kingProductLabel(k){                                        // "Chips 10mm Straight Cut — Safries · Bidfood" (Q5: the leading → is CSS on .king-link, presentation not content)
  var p=byId[k.pid];
  if(!p) return '(product missing)';
  return p.description+(p.brand?' \u2014 '+p.brand:'')+(p.supplier?' \u00b7 '+p.supplier:'');   // v103: the price lives in .king-price; Q5 (v124): supplier joins the sentence, per the design
}
// v59 item 6a: an ingredient's category is DERIVED, live, from its linked product \u2014 never stored on
// the ingredient. Repointing the link or editing the product's category changes it automatically.
function kingCategory(k){ var p=k&&byId[k.pid]; return (p&&p.category)||''; }
function kingCategories(){ var s={}; (kitchenIngredients||[]).forEach(function(k){ var c=kingCategory(k); if(c) s[c]=1; }); return Object.keys(s).sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase());}); }
/* ITEM 3 (v35): the pantry filter, kept pure (no DOM) so it can be tested directly.
   v59: routed through the shared token matcher (searchTokens/matchTokens) like every other search
   bar — matches the kitchen word's name, its linked product's description/brand, AND its DERIVED
   category (= the linked product's category, item 6a), in any token order. */
function kingSearchFilter(q, words, prods){
  var toks=searchTokens(q);
  if(!toks.length) return (words||[]).slice();
  return (words||[]).filter(function(k){
    if(!k) return false;
    var p=(prods||{})[k.pid];
    var hay=((k.name||'')+' '+(p?((p.description||'')+' '+(p.brand||'')+' '+(p.category||'')+' '+(p.supplier||'')):'')).toLowerCase();   // Q5 (v124): the row shows the supplier now, so the search six pixels above it must match it too (the Products filter already does)
    return matchTokens(toks,hay);
  });
}
var kingQuery='';
/* F3 (v139): the mock's §3.4 header subtitle, computed and counting the WHOLE library rather than
   the filtered view - a summary of what you have, not of what you searched. Broken links are the
   one thing worth surfacing in the header, because they are silently costing plates nothing. */
function kingHeadSummary(list){
  var n=(list||[]).length; if(!n) return '';
  var broken=0; list.forEach(function(k){ if(!byId[k.pid]) broken++; });
  var bits=[n+' '+(n===1?'ingredient':'ingredients')];
  if(broken) bits.push(broken+' '+(broken===1?'product':'products')+' missing');
  return bits.join(', ');
}
function renderKitchenPanel(){
  var box=document.getElementById('kingList'); if(!box) return;
  var sw=document.getElementById('kingSearch'); if(sw) kingQuery=sw.value||'';
  var sub=document.getElementById('kingHeadSub'); if(sub) sub.textContent=kingHeadSummary(kitchenIngredients);
  var note=document.getElementById('kingListNote');
  var showNote=function(on){ if(note) note.hidden=!on; };
  var ctl=document.getElementById('kingControls');
  var showControls=function(on){ if(ctl) ctl.hidden=!on; };
  if(!kitchenIngredients.length){
    showNote(false); showControls(false);   // nothing to search, and fillFilter has not run — an option-less select is a control that does nothing
    /* §5's composed empty state, and this screen's FIRST-RUN state (§5 makes them one).
       R3: the header strapline the mock's header bar has no room for is re-housed HERE, which is
       where "each one links to a product you buy" actually teaches somebody - a café with a full
       list already knows. It is not deleted, and Tier 2's four-noun law makes the sentence
       load-bearing: this is the only place the app explains Ingredient -> Product. */
    box.innerHTML=emptyStateHtml(ICON_LEAF_BIG,'Name your first ingredient',
      'Ingredients are the names you cook with. Each one links to a product you buy, so its cost follows the price you pay.',
      '<button class="btn primary" type="button" id="kingEmptyNew">New ingredient</button>');
    var b=document.getElementById('kingEmptyNew'); if(b) b.onclick=function(){ openKingModal(null); };
    renderKingProgress();                                            // zero kitchen words + many products is EXACTLY when the wizard matters
    return;
  }
  var kcat=(document.getElementById('kingCatFilter')||{}).value||'';   // v59 item 6a: filter by DERIVED category
  showControls(true);
  fillFilter(document.getElementById('kingCatFilter'), kingCategories(), 'All categories');
  var kcf=document.getElementById('kingClearFilters'); if(kcf) kcf.style.display=(kingQuery||kcat)?'':'none';
  var list=kingSearchFilter(kingQuery, kitchenIngredients, byId)
    .filter(function(k){ return !kcat || kingCategory(k)===kcat; })
    .sort(function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());});
  if(!list.length){                                                  // ITEM 3 (v35): there ARE words, the filter/search just matched none of them
    showNote(false);
    box.innerHTML=emptySearchState(ICON_LEAF_BIG,'ingredients','clearIngredientFilters');   // v58: variant A via the shared helper
    renderKingProgress();                                            // progress counts PRODUCTS, not the filtered view — it stays true
    return;
  }
  showNote(true);
  /* The column band labels the desktop table (mock §3.4), rows-present branch only.
     ⚠ The mock's fourth heading is "30-day change" and THAT LABEL WOULD BE A LIE HERE (R2).
     `ingLastMovePct` compares the last two logged points regardless of their dates - it is the
     LAST MOVE, not a 30-day window. A true 30-day rule would also break the invariant that this
     row and the dashboard's What-moved panel can never disagree, because they share this function.
     So the column ships with the mock's position and an honest heading; Products already words it
     the same way in its aria ("at the last logged move"). */
  var band='<div class="king-band" aria-hidden="true"><span>Ingredient</span><span>Category</span>'
    +'<span class="kb-num">Unit cost</span><span class="kb-num">Last change</span><span class="kb-num">Used in</span></div>';
  // v44 item 6b: the whole row opens the Edit modal (Products pattern) — no visible Edit/Remove links.
  // Remove lives INSIDE the modal now, still going through deleteKitchenIngredient unchanged.
  box.innerHTML=band+list.map(function(k){
    /* F3 (v139): five cells, the mock's §3.4 order. What the rebuild did NOT change, all from the
       banked contract: the category is DERIVED from the linked product and never stored; a broken
       link stays loud and its N counts the KID ARM ONLY, because a relink mutates `k.pid` alone and
       cannot heal a legacy bare-pid line (the v124 review caught that lie once).
       R1: the Category column REVERSES the recorded Q5 decision to drop it from the row, and turns
       the `!king-meta`-adjacent pin in king-rows.test.js red. The mock wins; the pin is flipped
       consciously in the same change rather than worked around. */
    var kp=byId[k.pid];
    var used=platesUsingKid(k.id).length;
    /* "Used in N plates" counts the kid arm, NOT productRefs' both-sides count. The contract left
       this open per surface; kid-only is right here because the column sits on an INGREDIENT and a
       legacy bare-pid line uses the PRODUCT without going through this ingredient. It also keeps
       ONE number on screen: the row, the relink promise and the modal's #king_used already share
       this computation, and productRefs here would put "9 plates" on a row whose own modal says 7.
       (Trap 4 of the contract already counts three meanings for this phrase; this adds none.) */
    var usedCell='<span class="king-used-n'+(used?'':' is-nil')+'">'+(used?(used+' plate'+(used===1?'':'s')):'—')+'</span>';
    var link, price, drift, cat;
    if(kp){
      var pct=ingLastMovePct(k.pid);
      /* Muted "steady" replaces rendering nothing (mock §3.4). It is not "no change": it means no
         logged move worth reporting, which is also what a sub-1% move reads as. The aria says so. */
      drift=(pct==null)
        ? '<span class="king-drift none" aria-label="no recent price change">steady</span>'
        : '<span class="king-drift '+(pct>0?'up':'down')+'" aria-label="price '+(pct>0?'up':'down')+' '+Math.abs(pct).toFixed(1)+'% at the last logged move">'+(pct>0?'+':'−')+Math.abs(pct).toFixed(1)+'%</span>';
      /* `is-nil` marks a PLACEHOLDER, not a broken link: a linked product with no category of its
         own is empty here too, and without the class the phone showed the bare table dash the
         design forbids. The class is what the breakpoint rules key off, so it goes on both paths. */
      var kc=kingCategory(k);
      cat='<span class="king-cat'+(kc?'':' is-nil')+'">'+esc(kc||'—')+'</span>';
      link='<span class="king-link">'+esc(kingProductLabel(k))+'</span>';
      price='<span class="king-price">'+esc(unitCostStr(kp))+'</span>';
    } else {
      link='<span class="king-link king-missing">⚠ product missing — '
        +(used?('relink to keep '+used+' plate'+(used===1?'':'s')+' costed'):'relink to give it a cost')+'</span>';
      price='<span class="king-price notcosted">no cost</span>';
      drift='<span class="king-drift none" aria-label="no price to track">—</span>';
      cat='<span class="king-cat is-nil">—</span>';
    }
    /* The aria-label OVERRIDES the row's content, so the four figures are never announced. That is
       a KNOWN, QUEUED defect (the screen-wide announcement rule), deliberately not fixed inside a
       restyle - the contract says so at trap 5. The label gains nothing here and loses nothing. */
    /* `no-cat` lets the phone's meta line choose its separator in CSS without a sibling chain -
       the chain this replaces out-ranked a desktop column rule and moved a cell (see §27). */
    return '<div class="king-row'+(kingCategory(k)?'':' no-cat')+(kp?'':' is-broken')+'" data-kid="'+esc(k.id)+'" role="button" tabindex="0" aria-label="Edit '+esc(k.name||'ingredient')+(kp?'':' — product missing')+'">'
      +'<span class="king-id"><span class="king-name">'+esc(k.name||'Ingredient')+'</span>'+link+'</span>'
      +cat+price+drift+usedCell
      +'</div>';
  }).join('');
  box.querySelectorAll('.king-row').forEach(function(row){
    var open=function(){ openKingModal(row.getAttribute('data-kid')); };
    row.onclick=open;
    row.onkeydown=function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } };   // keyboard parity for the button-role card
  });
  renderKingProgress();                                              // ITEM 2 (v34): setup progress + wizard entry stay current with the list
}
/* ===== ITEM 2 (v34): "Set up from products" — bulk-create kitchen words so setup is fast, incremental, never blocking ===== */
/* ITEM 4 (v35): skips are PERSISTED and SHARED. Deciding "we never cook with this"
   is a data decision about the café, not a per-device UI preference, so it rides
   the same setting + localStorage-mirror path as everything else and reaches every
   staff phone. The in-memory shape stays a map for O(1) lookups in kingWizGroups;
   only the stored shape is an array. There are no per-skip confirms by design —
   speed is the point, and a mis-skip costs two taps to undo. */
var kingWizOpen=false, kingWizSkip={}, kingWizLimit=40, kingWizShowSkipped=false;
function kingWizSkipIds(){ return Object.keys(kingWizSkip); }
// v55 §H: park a product the user just repointed AWAY from into the wizard's Skipped list, so it isn't
// re-proposed as "unlinked" and nag. Recoverable via Unskip. No-op for a falsy pid.
function parkRepointedProduct(pid){ if(pid){ kingWizSkip[pid]=true; saveKingWizSkips(); } }
function setKingWizSkips(ids){                                        // idempotent: same payload in, same state out
  var m={}; (ids||[]).forEach(function(id){ if(id) m[id]=1; });
  kingWizSkip=m;
}
function saveKingWizSkips(){
  var ids=kingWizSkipIds();
  if(typeof dbSetSetting==='function') dbSetSetting('king_wiz_skips', ids);
}
// v108: the localStorage hydrate is gone — bootstrapSync's app_settings read calls setKingWizSkips.
function kingLinkableProducts(){ return PRODUCTS.filter(function(p){ return p && p.description && p.is_food!==false; }); }
function kingUnlinkedProducts(){
  var linked={}; (kitchenIngredients||[]).forEach(function(k){ if(k&&k.pid) linked[k.pid]=1; });
  return kingLinkableProducts().filter(function(p){ return !linked[p.id]; });
}
function proposeKingName(p){                                          // supplier description -> friendly kitchen word ("Eggs Large Bulk (180)" -> "Eggs Large")
  var toks=coreTokens(p.description||'', p.brand||''), seen={}, out=[];
  toks.forEach(function(t){ if(!seen[t]){ seen[t]=1; out.push(t); } });
  if(!out.length){ var f=inorm(p.description||'').split(' ').filter(Boolean); out=f.length?[f[0]]:['item']; }
  return out.slice(0,3).map(function(t){ return t.charAt(0).toUpperCase()+t.slice(1); }).join(' ');
}
function kingNameExists(nm){ nm=(nm||'').trim().toLowerCase(); return (kitchenIngredients||[]).some(function(k){ return k && (k.name||'').trim().toLowerCase()===nm; }); }
/* ITEM 2 (v35): the rename decision, kept pure (no DOM) so it can be tested directly.
   Excludes the word being edited by id, so re-saving a word under its OWN current name
   is fine while landing on someone else's name is refused. A rename is never a copy:
   there is exactly one outcome — the same kid keeps its id and gains a new label. */
function kingRenameCheck(kid, name, words){
  name=(name||'').trim();
  if(!name) return {ok:false, reason:'empty', name:name};
  var clash=(words||[]).filter(function(k){ return k && k.id!==kid && (k.name||'').trim().toLowerCase()===name.toLowerCase(); })[0];
  if(clash) return {ok:false, reason:'duplicate', name:name};
  return {ok:true, name:name};
}
function kingWizOutstanding(){                                        // ITEM 4 (v35): what the wizard could still PROPOSE — a skipped product is decided, not outstanding
  return kingUnlinkedProducts().filter(function(p){ return !kingWizSkip[p.id]; }).length;
}
/* ITEM 5 (v35): what an invoice add-as-new line's Kitchen name field MEANS. Pure, so
   the decision is testable without a live import. v34 read this field as free text and
   SILENTLY skipped creation when the name already existed — which threw away the most
   valuable case: the brand swap. Now a name that already exists (typed OR picked from
   the list — same intent, same outcome) REPOINTS that word at the new product. */
function kingNameAction(nm, words){
  nm=(nm||'').trim();
  if(!nm) return {action:'none'};
  var hit=(words||[]).filter(function(k){ return k && (k.name||'').trim().toLowerCase()===nm.toLowerCase(); })[0];
  if(hit) return {action:'repoint', kid:hit.id, name:hit.name};
  return {action:'create', name:nm};
}
/* ITEM 5 (v35): the unit-category decision, extracted from saveKingModal so the modal
   path and the deferred invoice path cannot drift apart. Both now call this. */
function kingRepointGuard(oldBaseUnit, newBaseUnit){
  var oldCat=oldBaseUnit?unitCatCategory(oldBaseUnit):null, newCat=newBaseUnit?unitCatCategory(newBaseUnit):null;
  return {needsConfirm: !!(oldCat && newCat && oldCat!==newCat), oldCat:oldCat, newCat:newCat};
}
function unitCatWord(c){ return c==='kg'?'kg':c==='l'?'litre':'unit'; }
function renderKingProgress(){
  var pr=document.getElementById('kingProgress'), wb=document.getElementById('kingWizBtn'); if(!pr||!wb) return;
  var total=kingLinkableProducts().length, un=kingUnlinkedProducts().length, done=total-un;
  var todo=kingWizOutstanding(), skipped=kingWizSkipIds().length;
  // hide only when there is nothing left to propose AND nothing skipped to recover — otherwise skipping everything would strand the Unskip list behind a hidden button
  if(!total || (!todo && !skipped && !kingWizOpen)){ pr.style.display='none'; wb.style.display='none'; return; }
  pr.textContent=done+' of '+total+' products have an ingredient';   // stays literal: a skipped product genuinely has no ingredient, so it still counts as not-done here
  pr.style.display=un?'block':'none';
  wb.style.display='';                                              // stays visible while open so "Close setup" is always reachable
  wb.innerHTML=kingWizOpen?'Close<span class="btn-noun"> setup</span>':'Set up<span class="btn-noun"> from products</span>';   // v44 item 5: the noun span hides on phones so the pantry pair fits one line
}
function kingWizGroups(){                                             // proposal -> products[]; same cleaned name = one grouped choice, never silent duplicates
  var map={}, order=[];
  kingUnlinkedProducts().forEach(function(p){
    if(kingWizSkip[p.id]) return;
    var nm=proposeKingName(p), key=nm.toLowerCase();
    if(!map[key]){ map[key]={name:nm, products:[]}; order.push(key); }
    map[key].products.push(p);
  });
  order.sort(function(a,b){ return map[a].name.localeCompare(map[b].name); });
  return order.map(function(k){ return map[k]; });
}
function kingWizRowHtml(g,gi){
  var one=g.products.length===1, p0=g.products[0];
  var prodBit=one
    ? '<span class="kw-prod">'+esc(p0.description)+(p0.brand?' \u00b7 '+esc(p0.brand):'')+'</span>'
    : '<select class="kw-pick" aria-label="Which product">'+g.products.map(function(p,pi){ return '<option value="'+esc(p.id)+'"'+(pi?'':' selected')+'>'+esc(p.description)+(p.brand?' \u2014 '+esc(p.brand):'')+'</option>'; }).join('')+'</select>';
  return '<div class="kw-row" data-gi="'+gi+'">'
    +'<input class="kw-name" type="text" value="'+esc(g.name)+'" aria-label="Ingredient name">'
    +prodBit
    +'<button class="btn kw-add" type="button">Add</button>'
    +'<button class="linklike kw-skip" type="button">Skip</button>'
    +'</div>';
}
/* ITEM 4 (v35): the skipped list is always reachable while the wizard is open, so a
   mis-skip is never a dead end. Collapsed by default — it's recovery, not the job. */
function kingWizSkippedHtml(ids){
  if(!ids || !ids.length) return '';
  var html='<div class="kw-skipped"><button class="linklike kw-skiptoggle" type="button">Skipped ('+ids.length+') \u2014 '+(kingWizShowSkipped?'hide':'show')+'</button>';
  if(kingWizShowSkipped){
    html+=ids.map(function(id){
      var p=byId[id];
      var lbl=p ? (p.description+(p.brand?' \u00b7 '+p.brand:'')) : '(this product no longer exists)';
      return '<div class="kw-srow" data-pid="'+esc(id)+'"><span class="kw-prod">'+esc(lbl)+'</span>'
        +'<button class="linklike kw-unskip" type="button">Unskip</button></div>';
    }).join('');
  }
  return html+'</div>';
}
function wireKingWizSkipped(box){
  var t=box.querySelector('.kw-skiptoggle'); if(t) t.onclick=function(){ kingWizShowSkipped=!kingWizShowSkipped; renderKingWizard(); };
  box.querySelectorAll('.kw-unskip').forEach(function(b){ b.onclick=function(){
    var row=b.closest('.kw-srow'); if(!row) return;
    delete kingWizSkip[row.getAttribute('data-pid')];
    saveKingWizSkips(); renderKingWizard();                          // no confirm — two taps to undo is the whole design
  }; });
}
function renderKingWizard(){
  var box=document.getElementById('kingWiz'); if(!box) return;
  if(!kingWizOpen){ box.style.display='none'; box.innerHTML=''; hide('kingWizModal'); renderKingProgress(); return; }
  show('kingWizModal');                                               // v61 item 4: the wizard lives in its own modal now — opening is explicit, the × closes it
  var groups=kingWizGroups();
  var skipIds=kingWizSkipIds(), skipHtml=kingWizSkippedHtml(skipIds);
  if(!groups.length){
    box.innerHTML='<div class="kw-done">'+(skipIds.length
        ? '\u2713 Nothing left to set up \u2014 everything else is skipped.'   // "every product has an ingredient" would be a lie here
        : '\u2713 Every product has an ingredient \u2014 you can use all of them in plates.')
      +'</div>'+skipHtml;
    box.style.display='block'; wireKingWizSkipped(box); renderKingProgress(); return;
  }
  var singles=groups.filter(function(g){return g.products.length===1;}).length;
  var head='<div class="kw-head"><span class="kw-explain">Tap Add to accept a name (edit it first if you like). Skip anything you\u2019d never cook with.</span>'
    +(singles>1?'<button class="btn ghost kw-all" type="button">Add all '+singles+' suggested</button>':'')+'</div>';
  var shown=groups.slice(0,kingWizLimit);
  box.innerHTML=head+shown.map(kingWizRowHtml).join('')
    +(groups.length>shown.length?'<button class="linklike kw-more" type="button">Show '+(groups.length-shown.length)+' more</button>':'')
    +skipHtml;
  box.style.display='block';
  var wireRow=function(row){
    var gi=parseInt(row.getAttribute('data-gi'),10), g=shown[gi]; if(!g) return;
    var pidOf=function(){ var s=row.querySelector('.kw-pick'); return s?s.value:g.products[0].id; };
    row.querySelector('.kw-add').onclick=function(){
      var nm=(row.querySelector('.kw-name').value||'').trim()||g.name;
      if(kingNameExists(nm)){ toast('\u201c'+nm+'\u201d already exists \u2014 edit the name first'); return; }
      kitchenIngredients.push({id:nextKid(), name:nm, pid:pidOf()});
      saveKitchenIngredients(); renderKitchenPanel(); renderKingWizard();
    };
    row.querySelector('.kw-skip').onclick=function(){ g.products.forEach(function(p){ kingWizSkip[p.id]=1; }); saveKingWizSkips(); renderKingWizard(); };   // ITEM 4 (v35): persists + syncs; no confirm by design
  };
  box.querySelectorAll('.kw-row').forEach(wireRow);
  var all=box.querySelector('.kw-all');
  if(all) all.onclick=function(){
    var gs=kingWizGroups().filter(function(g){return g.products.length===1;});
    askConfirm('Add '+gs.length+' ingredients?', 'One ingredient per product, using the suggested names. You can rename or remove any of them later.', 'Add all', function(){
      var made=0, skipped=0, taken={};
      gs.forEach(function(g){
        var nm=g.name;
        if(kingNameExists(nm)||taken[nm.toLowerCase()]){ skipped++; return; }
        taken[nm.toLowerCase()]=1;
        kitchenIngredients.push({id:nextKid(), name:nm, pid:g.products[0].id}); made++;
      });
      if(made) saveKitchenIngredients();                             // one write for the whole batch
      renderKitchenPanel(); renderKingWizard();
      toast(made+' ingredient'+(made===1?'':'s')+' added'+(skipped?(' \u00b7 '+skipped+' skipped (name already used)'):''));
    });
  };
  var more=box.querySelector('.kw-more'); if(more) more.onclick=function(){ kingWizLimit+=40; renderKingWizard(); };
  wireKingWizSkipped(box);                                          // ITEM 4 (v35)
  renderKingProgress();
}
function toggleKingWizard(){ kingWizOpen=!kingWizOpen; if(kingWizOpen) kingWizLimit=40; renderKingWizard(); }
function closeKingWizard(){ if(!kingWizOpen) return; kingWizOpen=false; renderKingWizard(); }   // v61 item 4: the single close path — keeps kingWizOpen in sync with the modal (× / Escape / backdrop all route here)
/* ---- create / change-product modal (Name + product search-select) ---- */
var kingEditId=null, kingChosenPid=null, kingAddToPlateOnSave=false;
function renderKingAlts(){
  // v115: the edit-mode "Cheaper like-for-like" list is GONE (see the alternatives() tombstone
  // above the plate section). Create mode keeps its name-based suggestions; edit mode now just
  // clears the shared box.
  var box=document.getElementById('king_alts'); if(!box) return;
  if(!kingEditId){ renderKingCreateSuggest(); return; }              // ITEM 2b (v34): create mode reuses this box for name-based suggestions
  box.style.display='none'; box.innerHTML='';
}
/* ITEM 2b (v34): create mode — typing "Chips" immediately offers the top product matches, one tap links it.
   Reuses rankCandidates (the invoice matcher) read-only; nothing in the protected region is modified. */
function renderKingCreateSuggest(){
  var box=document.getElementById('king_alts'); if(!box) return;
  if(kingEditId){ return; }                                          // edit mode is renderKingAlts' job
  var nm=(document.getElementById('king_name')?document.getElementById('king_name').value:'').trim();
  if(nm.length<2 || kingChosenPid){ box.style.display='none'; box.innerHTML=''; return; }
  var cands=(rankCandidates(nm)||[]).slice(0,3).map(function(c){ return byId[c.id]; }).filter(Boolean);
  if(!cands.length){ box.style.display='none'; box.innerHTML=''; return; }
  box.innerHTML='<div class="ka-head">Link to one of these?</div>'+cands.map(function(p){
    return '<div class="ka-row"><span class="ka-name">'+esc(p.description)+(p.brand?' <span class="ca">'+esc(p.brand)+'</span>':'')+'</span>'
      +'<span class="ka-price">'+esc(unitCostStr(p))+'</span>'
      +'<button class="use" type="button" data-pid="'+esc(p.id)+'">Use</button></div>';
  }).join('');
  box.style.display='block';
  box.querySelectorAll('.use').forEach(function(b){ b.addEventListener('click',function(){
    var pid=b.getAttribute('data-pid'); var p=byId[pid]; if(!p) return;
    kingChosenPid=pid;
    var inp=document.getElementById('king_prod'); if(inp) inp.value=p.description+(p.brand?' \u2014 '+p.brand:'');
    box.style.display='none'; box.innerHTML='';
    kingSyncSave();
  }); });
}
function kingValid(){
  var nm=(document.getElementById('king_name').value||'').trim();
  return !!nm && !!kingChosenPid && !!byId[kingChosenPid];
}
function kingSyncSave(){ var s=document.getElementById('kingModalSave'); if(s) s.disabled=!kingValid(); updateKingCat(); }
// v59 item 6a: reflect the DERIVED category live as the linked product changes (read-only display)
function updateKingCat(){
  var el=document.getElementById('king_cat'); if(!el) return;
  var pid=kingChosenPid || (kingEditId && kById[kingEditId] ? kById[kingEditId].pid : null);
  var p=pid!=null?byId[pid]:null; var c=p&&p.category;
  el.textContent=c?c:'—';
}
function renderKingProdDrop(){
  var inp=document.getElementById('king_prod'), drop=document.getElementById('king_prodDrop'); if(!inp||!drop) return;
  var q=(inp.value||'').trim().toLowerCase();
  var pool=PRODUCTS.filter(function(p){ return p && p.description; });
  var scored;
  if(!q){ scored=pool.slice().sort(function(a,b){return a.description.toLowerCase().localeCompare(b.description.toLowerCase());}).slice(0,8); }
  else{
    scored=pool.filter(function(p){ return ((p.description||'')+' '+(p.brand||'')).toLowerCase().indexOf(q)>=0; })
      .sort(function(a,b){ return a.description.toLowerCase().indexOf(q)-b.description.toLowerCase().indexOf(q) || a.description.localeCompare(b.description); })
      .slice(0,8);
  }
  if(!scored.length){ drop.innerHTML='<div class="opt muted">No products match</div>'; drop.style.display='block'; anchorDrop(drop); return; }
  drop.innerHTML=scored.map(function(p){
    return '<div class="opt cat-opt" data-pid="'+esc(p.id)+'">'+esc(p.description)+(p.brand?' <span class="ca">'+esc(p.brand)+'</span>':'')+' <span class="ca">'+esc(unitCostStr(p))+'</span></div>';
  }).join('');
  drop.style.display='block'; anchorDrop(drop);   // v59 item 2: escape the modal-body clip
  drop.querySelectorAll('.cat-opt').forEach(function(o){ o.addEventListener('mousedown',function(e){ e.preventDefault();
    var pid=o.getAttribute('data-pid'); var p=byId[pid]; if(!p) return;
    kingChosenPid=pid; inp.value=p.description+(p.brand?' \u2014 '+p.brand:''); drop.style.display='none'; resetDrop(drop); kingSyncSave();
  }); });
}
function openKingModal(kid){
  kingEditId=kid||null; kingChosenPid=null;
  if(!kid) kingAddToPlateOnSave=false;                               // create-from-search sets this true AFTER openKingModal returns
  var isEdit=!!kingEditId; var k=isEdit?kById[kingEditId]:null;
  document.getElementById('kingModalTitle').textContent=isEdit?'Edit ingredient':'New ingredient';
  var nameEl=document.getElementById('king_name'), prodEl=document.getElementById('king_prod');
  nameEl.value=isEdit?(k?k.name:''):''; nameEl.disabled=false;                 // ITEM 2 (v35): edit mode can rename. Plates persist {kid, qty} only (see the lines map in savePlate) and read the label live via kById, so a rename is display-only and cannot touch a recipe.
  prodEl.value=isEdit&&k&&byId[k.pid]?(byId[k.pid].description+(byId[k.pid].brand?' \u2014 '+byId[k.pid].brand:'')):'';
  kingChosenPid=isEdit&&k?k.pid:null;
  var err=document.getElementById('king_err'); if(err)err.style.display='none';
  document.getElementById('king_prodDrop').style.display='none';
  renderKingAlts();
  if(!prodEl.__wired){ prodEl.__wired=true;
    prodEl.addEventListener('input',function(){ kingChosenPid=null; kingSyncSave(); renderKingProdDrop(); });
    prodEl.addEventListener('focus',renderKingProdDrop);
    prodEl.addEventListener('blur',function(){ setTimeout(function(){ var d=document.getElementById('king_prodDrop'); if(d){ d.style.display='none'; resetDrop(d); } },150); });
  }
  if(!nameEl.__wired){ nameEl.__wired=true; nameEl.addEventListener('input',function(){
    var ke=document.getElementById('king_err'); if(ke) ke.style.display='none';   // ITEM 2 (v35): a rejected rename clears as soon as they start fixing it
    kingSyncSave(); renderKingCreateSuggest(); }); }
  var usedEl=document.getElementById('king_used');                   // ITEM 2d (v34): surface the model's payoff at the moment it matters
  if(usedEl){
    if(isEdit){
      var used=(savedPlates||[]).filter(function(sp){ return (sp.lines||[]).some(function(l){ return l&&l.kid===kingEditId; }); }).length;
      usedEl.textContent=used?('Used in '+used+' saved plate'+(used===1?'':'s')+' \u2014 changing the product updates all of them.')
                             :'Not used in any saved plates yet.';
      usedEl.style.display='block';
    } else usedEl.style.display='none';
  }
  var remEl=document.getElementById('kingModalRemove');              // v44 item 6b: Remove lives in the modal, edit mode only
  if(remEl) remEl.style.display=isEdit?'':'none';
  kingSyncSave();
  show('kingModal');
}
function closeKingModal(){ hide('kingModal'); kingEditId=null; kingChosenPid=null; kingAddToPlateOnSave=false; }
function saveKingModal(){
  if(!kingValid()) return;
  var name=(document.getElementById('king_name').value||'').trim();
  var pid=kingChosenPid, np=byId[pid];
  if(kingEditId){                                                    // ITEM 2 (v35): edit flow — rename, change product, or both
    var k=kById[kingEditId]; if(!k){ closeKingModal(); return; }
    var chk=kingRenameCheck(kingEditId, name, kitchenIngredients);
    if(!chk.ok){                                                    // rejected inline; the modal stays open on the offending field
      var ke=document.getElementById('king_err');
      if(ke){ ke.textContent=(chk.reason==='duplicate')
        ? ('\u201c'+chk.name+'\u201d is already an ingredient \u2014 pick another name.')
        : 'Enter an ingredient name.'; ke.style.display='block'; }
      return;
    }
    var renamed=(chk.name!==k.name), moved=(pid!==k.pid);
    if(!renamed && !moved){ closeKingModal(); return; }              // clean no-op: no write, no toast, no confirm
    var oldP=byId[k.pid];
    var g=kingRepointGuard(oldP?oldP.base_unit:null, np.base_unit);  // ITEM 5 (v35): one guard, shared with the invoice repoint path
    var commit=function(){
      // v114: the blast radius and the average must be read BEFORE the pid moves — computeAvgFoodCost()
      // is live, so one line later it would already be the AFTER figure and the entry would record no
      // movement at all. Only a MOVE is an intervention: a rename is display-only (plates persist
      // {kid, qty}), so it cannot change a single cost and must not reset the "since you last acted" clock.
      var hit=platesUsingKid(kingEditId), avgBefore=computeAvgFoodCost();
      var oldPid=k.pid; k.name=chk.name; k.pid=pid;
      if(moved) parkRepointedProduct(oldPid);   // v55 §H: a repointed-away product is auto-parked in the wizard's "Skipped (N)" list, not re-proposed as unlinked
      var write=saveKitchenIngredients(); renderKitchenPanel(); rerenderCurrentTab();
      if(moved) logChangeIfSaved(write, 'ingredient_repointed', {menuIds:menuIdsForPlates(hit), avgBefore:avgBefore,
        detail:{name:chk.name, from:(byId[oldPid]||{}).description||null, to:(np||{}).description||null, plates:hit.length}});
      if(moved) logHistory();   // v115 path 2: a repoint moves every plate that cooks with it — the trend line must move too. Inside if(moved): a rename is display-only and must not stipple the line.
      toast(moved?(renamed?'Ingredient updated':'Product changed'):'Ingredient renamed'); };
    if(moved && g.needsConfirm){                                     // the guard belongs to the PRODUCT change — a rename alone can never change how anything is measured, so it must not fire here
      closeKingModal();                                             // close this modal first so the confirm sits cleanly on top
      askConfirm('Different unit type',
        '\u201c'+chk.name+'\u201d is measured per '+unitCatWord(g.oldCat)+' but the new product is per '+unitCatWord(g.newCat)+'. Plate amounts keep their numbers but change meaning \u2014 check any plate that uses it.',
        'Change anyway', commit);
      return;
    }
    commit(); closeKingModal(); return;
  }
  // create flow
  var id=nextKid();
  kitchenIngredients.push({id:id, name:name, pid:pid});
  saveKitchenIngredients(); renderKitchenPanel();
  var toPlate=kingAddToPlateOnSave; kingAddToPlateOnSave=false;
  closeKingModal(); toast('\u201c'+name+'\u201d added');
  if(toPlate && typeof addKitchenLine==='function'){ addKitchenLine(id); }   // create-from-builder: drop it straight onto the plate
  else rerenderCurrentTab();
}
/* v114 — an ingredient is shared, so a change to one moves EVERY plate that cooks with it. That is the
   whole point of the kitchen-word layer, and it is what makes a repoint the cheapest real intervention
   in the app: swap "Chips" to a cheaper supplier product once and every plate re-costs. These two
   helpers name the blast radius so the change log can record which menus an ingredient-level change
   actually reached. (The first also replaces the inline filter deleteKitchenIngredient used to carry.) */
function platesUsingKid(kid){ return (savedPlates||[]).filter(function(sp){ return (sp.lines||[]).some(function(l){ return l&&l.kid===kid; }); }); }
/* Q5 (v124): the broken-link row's N is platesUsingKid — the KID arm only, ON PURPOSE, because the
   copy promises "relink to keep N plates costed" and relinking mutates k.pid and nothing else. A
   legacy bare-pid line resolves through byId directly (lineProduct), so a relink cannot heal it and
   counting it would make the sentence a lie for exactly those plates — the v124 review caught the
   first cut doing that. The both-sides law stays where it belongs: productRefs, where deleting a
   PRODUCT really does break both paths. */
function menuIdsForPlates(list){
  var seen={}, out=[];
  (list||[]).forEach(function(sp){ menusOfPlate(sp).forEach(function(o){ if(!seen[o.menuId]){ seen[o.menuId]=1; out.push(o.menuId); } }); });
  return out;
}
function deleteKitchenIngredient(kid){
  var k=kById[kid]; if(!k) return;
  var used=platesUsingKid(kid).length;
  var msg='Remove \u201c'+(k.name||'this ingredient')+'\u201d?';
  if(used) msg+=' It\u2019s used in '+used+' saved plate'+(used===1?'':'s')+' \u2014 those lines will show as \u201cproduct missing\u201d until you point them somewhere else.';
  askConfirm('Remove ingredient?', msg, 'Remove', function(){
    // v114: this LOWERS every affected plate's cost, because a line whose ingredient is gone stops
    // costing anything (lineProduct returns null and costFromLines counts it as missing, not as zero
    // dollars of a real ingredient). That is a fall in the number with no saving behind it, which is
    // precisely the kind of movement the log has to be able to explain later.
    var hit=platesUsingKid(kid), avgBefore=computeAvgFoodCost();
    kitchenIngredients=kitchenIngredients.filter(function(x){return x.id!==kid;});
    var write=saveKitchenIngredients(); renderKitchenPanel(); rerenderCurrentTab(); toast('Ingredient removed');
    logChangeIfSaved(write, 'ingredient_deleted', {menuIds:menuIdsForPlates(hit), avgBefore:avgBefore,
      detail:{name:k.name||null, plates:hit.length}});
    logHistory();   // v115 path 5: the drop this records is real but has no saving behind it (see the comment above) — the change-log entry is what explains it later
  });
}
(function(){
  function on(id,fn){ var b=document.getElementById(id); if(b) b.addEventListener('click',fn); }
  on('kingNew',function(){ openKingModal(null); });
  on('kingWizBtn',toggleKingWizard);
  on('kingWizClose',closeKingWizard);                                // v61 item 4: the × closes the wizard modal
  (function(){ var kwm=document.getElementById('kingWizModal'); if(!kwm) return;
    kwm.addEventListener('mousedown',function(e){ if(e.target===kwm) closeKingWizard(); });   // backdrop tap closes (skips are already persisted — no data loss)
    /* v137 (F1b): the wizard's own Escape listener is GONE — the top-layer handler at the end of
       this file reaches it through #kingWizClose, which is closeKingWizard. That matters here more
       than most: the wizard deliberately stacks a confirm over itself (Add all), and a listener
       that only knew about the wizard closed it out from under that confirm. */ })();
  var _goHome=function(){ showTab('dashboard'); };   // v39: the logo is the way home
  ['brandHome','sideBrandHome'].forEach(function(id){   // header logo (mobile) + sidebar logo (desktop >=1024px) — one is always the visible one
    var el=document.getElementById(id); if(!el) return;
    el.addEventListener('click',_goHome);
    el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); _goHome(); } });
  });
  var ks=document.getElementById('kingSearch'), kc=document.getElementById('kingSearchClear');
  if(ks){ ks.addEventListener('input',function(){                     // ITEM 3 (v35)
    kingQuery=ks.value||'';
    // v61 item 4: the wizard is a modal takeover now — it can't coexist with the tab search behind it, so the old "searching closes the wizard" coupling is gone. Opening is explicit; the × closes it.
    renderKitchenPanel();
  });
  ks.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ks.blur(); } }); }   // v37: Enter commits the search (dismisses the keyboard)
  if(kc) kc.addEventListener('click',function(){ if(ks){ ks.value=''; } kingQuery=''; renderKitchenPanel(); if(ks) ks.focus(); });
  var kcf=document.getElementById('kingCatFilter'); if(kcf) kcf.addEventListener('change',renderKitchenPanel);   // v59 item 6a: category filter
  var kclf=document.getElementById('kingClearFilters'); if(kclf) kclf.addEventListener('click',clearIngredientFilters);   // v59: shared clear behaviour
  on('kingModalSave',saveKingModal); on('kingModalCancel',closeKingModal); on('kingModalClose',closeKingModal);
  on('kingModalRemove',function(){ var kid=kingEditId; if(!kid) return; closeKingModal(); deleteKitchenIngredient(kid); });   // v44 item 6b: close first so the used-in-N confirm sits cleanly on top (same pattern as the unit guard)
  var m=document.getElementById('kingModal'); if(m) m.addEventListener('click',function(ev){ if(ev.target===m) closeKingModal(); });
})();

// v60 item 6: ONE shared clear-× wiring pattern. The tab search bars already carry the always-visible ×
// (ms-clear markup); this reaches the two modal SEARCH boxes that lacked it — the product-link search
// and the dish picker. Clears the field, re-runs the search, refocuses. onClear carries the per-box redraw.
function wireSearchClear(inputId, clearId, onClear){
  var inp=document.getElementById(inputId), btn=document.getElementById(clearId);
  if(!inp||!btn) return;
  btn.addEventListener('click',function(){ inp.value=''; if(typeof onClear==='function') onClear(); inp.focus(); });
}
wireSearchClear('king_prod','king_prodClear',function(){ kingChosenPid=null; if(typeof kingSyncSave==='function') kingSyncSave(); if(typeof renderKingProdDrop==='function') renderKingProdDrop(); });
wireSearchClear('ad_search','ad_searchClear',function(){ if(typeof renderDishPicker==='function') renderDishPicker(''); });


/* ============================================================
   Feature 2 — Dashboard
   ============================================================ */
function avgOf(arr){ return arr.length? arr.reduce(function(a,b){return a+b;},0)/arr.length : null; }
function histInRange(fromTs, toTs){ return priceHistory.filter(function(h){ var t=new Date(h.t).getTime(); return t>=fromTs && t<toTs; }).map(function(h){return h.v;}); }
function dashComparisons(){
  var now=new Date();
  // v97 ROOT CAUSE of the reported stale headline (v96 handover, friction 2): this used to read
  // `if(current==null && priceHistory.length) current=priceHistory[last].v` — when nothing is costed AND
  // priced right now, computeAvgFoodCost correctly returns null and the old line substituted the last
  // LOGGED point, i.e. a figure describing a state that no longer exists. It was never one region: cmp.current
  // is the single value the headline AND all three stat cards read, so both went stale together, and the
  // `ytd=current` fallback below then baselined the ghost against itself ("holding steady" vs nothing).
  // Null now propagates: the headline falls to "—" plus verdictHtml's existing "Nothing costed and priced
  // yet" copy (which this fallback had made unreachable at all-menus scope). The CHART is untouched and
  // stays honest — priceHistory is a log of what WAS true, and drawing it is not a claim about now.
  // (v98 revision: the "how today's average compares" stat cards that also read cmp.current are DELETED
  // from the dashboard — see renderDashboard — but this null-propagation contract is about the HEADLINE
  // and predates them; dash-persist.test.js still pins it.)
  var current=computeAvgFoodCost();
  var startThisMonth=new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  var startLastMonth=new Date(now.getFullYear(), now.getMonth()-1, 1).getTime();
  var lastMonth=avgOf(histInRange(startLastMonth, startThisMonth));
  var lastWeek=avgOf(histInRange(Date.now()-7*86400000, Date.now()+1));
  var startYear=new Date(now.getFullYear(),0,1).getTime();
  var ytd=avgOf(histInRange(startYear, Date.now()+1));
  if(ytd==null) ytd=current;
  return {current:current, lastMonth:lastMonth, lastWeek:lastWeek, ytd:ytd};
}
/* v98 revision: statCard and the "how today's average compares" block are DELETED (Max's call,
   31 Jul) \u2014 the block duplicated what the chart shows, the long horizon is reachable via the
   range toggles, and it stated an all-menus average under a heading naming a single menu.
   Deleted, not relocated, on every width. dashComparisons above stays whole: the headline reads
   cmp.current and the v97 null-propagation regression pins it. Tombstone so the name greps. */
/* ===== v47: trend-chart rebuild (Collectr feel, EzPlate skin) \u2014 helpers ===== */
/* Monotone cubic tangents (Fritsch\u2013Carlson). Clamped so the curve NEVER overshoots a real
   reading \u2014 between two points it stays inside their value range, so it can't dip below 0
   or invent peaks between readings. The SAME tangents feed the path builder AND the scrub
   evaluator, so the riding dot follows exactly the curve that is drawn. */
function tcTangents(xs,ys){
  var n=xs.length, m=new Array(n), d=new Array(Math.max(0,n-1)), i;
  if(n<2){ if(n) m[0]=0; return m; }
  for(i=0;i<n-1;i++) d[i]=(ys[i+1]-ys[i])/(xs[i+1]-xs[i]);
  m[0]=d[0]; m[n-1]=d[n-2];
  for(i=1;i<n-1;i++) m[i]=(d[i-1]*d[i]<=0)?0:(d[i-1]+d[i])/2;   // tangent 0 at local extrema
  for(i=0;i<n-1;i++){
    if(!d[i]){ m[i]=0; m[i+1]=0; continue; }
    var a=m[i]/d[i], b=m[i+1]/d[i], s=a*a+b*b;
    if(s>9){ var t=3/Math.sqrt(s); m[i]=t*a*d[i]; m[i+1]=t*b*d[i]; }   // the monotonicity clamp
  }
  return m;
}
function tcPath(xs,ys,m){                                        // Hermite -> cubic beziers (controls at +/- h/3 along tangents)
  var p='M'+xs[0].toFixed(1)+' '+ys[0].toFixed(1);
  for(var i=0;i<xs.length-1;i++){
    var h=xs[i+1]-xs[i];
    p+=' C'+(xs[i]+h/3).toFixed(1)+' '+(ys[i]+m[i]*h/3).toFixed(1)
      +' '+(xs[i+1]-h/3).toFixed(1)+' '+(ys[i+1]-m[i+1]*h/3).toFixed(1)
      +' '+xs[i+1].toFixed(1)+' '+ys[i+1].toFixed(1);
  }
  return p;
}
function tcYAt(xs,ys,m,px){                                      // cubic Hermite eval on the same tangents (the scrub dot rides THIS)
  var n=xs.length;
  if(px<=xs[0]) return ys[0];
  if(px>=xs[n-1]) return ys[n-1];
  var i=0; while(i<n-2 && px>xs[i+1]) i++;
  var h=xs[i+1]-xs[i], t=(px-xs[i])/h, t2=t*t, t3=t2*t;
  return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(3*t2-2*t3)*ys[i+1]+(t3-t2)*h*m[i+1];
}
function tcTicks(target,mn,mx){                                  // v48: 3\u20134 y-axis values ANCHORED ON the target
  /* HARD REQUIREMENT (v48 patch): the dashed target line must always sit on a labelled tick \u2014
     that's the entire basis for the line carrying no word of its own. So the sequence is built
     FROM the target (target \u00b1 k\u00b7step) and extended until it covers the data, never generated
     independently and hoped onto it. Integer-biased steps (no 0.5/2.5) keep labels 3\u20134 chars
     unless the user's own target is decimal. Assumes mn <= target <= mx (callers concat the
     target into the domain values first). */
  var steps=[1,2,5,10,20,50], si=0, i;
  var raw=(mx-mn)/3;
  for(i=0;i<steps.length;i++){ si=i; if(steps[i]>=raw) break; }
  var build=function(step){
    var lo=target-Math.ceil((target-mn)/step)*step;
    var hi=target+Math.ceil((mx-target)/step)*step;
    while(lo<0) lo+=step;                                        // %-of-sales axis: never label below zero
    var out=[]; for(var v=lo; v<=hi+1e-9; v+=step) out.push(+v.toFixed(1));
    return out;
  };
  var out=build(steps[si]);
  while(out.length>4 && si<steps.length-1){ si++; out=build(steps[si]); }   // widen the step, never thin \u2014 filtering could drop the target tick
  while(out.length<3){                                           // step bigger than the whole span: pad outward, target stays in the set
    var st=steps[si], lo2=out[0], hi2=out[out.length-1];
    if(lo2-st>=0) out.unshift(+(lo2-st).toFixed(1)); else out.push(+(hi2+st).toFixed(1));
  }
  return out;
}
/* v60 item 1b (ZOOM): margins move 1-2 pts at a time, and a domain stretched to always reach a
   distant target flattened that movement into noise. niceStep/niceTicks generate 3-4 round ticks
   over the data extent WITHOUT anchoring on the target, so the visible band is only as tall as the
   readings need. The target line is drawn only when it falls inside the domain (or within one tick
   of it), and THEN tcTicks' "target sits on a labelled tick" rule still governs (see trendChart).
   ⚠️ v145 CORRECTION. This comment used to open "the y-domain now fits the DATA, not the target",
   and that was FALSE whenever the target was in view: the very next line of trendChart concatenated
   the target into the domain, and the domain was then derived from the outermost TICK rather than
   from the data at all. The sentence sent an investigation the wrong way before it was caught, and
   it is exactly the class of stale fact CLAUDE.md warns about — a true-sounding claim nothing
   re-checks. What is written here now is what the code does: the domain fits the data when the
   target is absent, and fits the data UNION the target when it is drawn. See the block in
   trendChart for why the two cases are built differently.
   This SUPERSEDES v48's always-include-target domain rule (tcTicks itself is unchanged). */
var TICK_STEPS=[1,2,5,10,20,50];
function niceStep(raw){ for(var i=0;i<TICK_STEPS.length;i++){ if(TICK_STEPS[i]>=raw) return TICK_STEPS[i]; } return TICK_STEPS[TICK_STEPS.length-1]; }
function niceTicks(mn,mx){                                        // 3-4 round ticks covering [mn,mx], not anchored on any value
  var si=TICK_STEPS.indexOf(niceStep((mx-mn)/3));
  var build=function(step){ var lo=Math.floor(mn/step)*step; if(lo<0) lo=0; var hi=Math.ceil(mx/step)*step;
    var out=[]; for(var v=lo; v<=hi+1e-9; v+=step) out.push(+v.toFixed(1)); return out; };
  var out=build(TICK_STEPS[si]);
  while(out.length>4 && si<TICK_STEPS.length-1){ si++; out=build(TICK_STEPS[si]); }   // widen the step until 4 or fewer labels
  while(out.length<3){                                            // step bigger than the whole span: pad outward
    var st=TICK_STEPS[si], lo2=out[0], hi2=out[out.length-1];
    if(lo2-st>=0) out.unshift(+(lo2-st).toFixed(1)); else out.push(+(hi2+st).toFixed(1));
  }
  return out;
}
function targetInView(target,dmn,dmx,step){ return target>=dmn-step && target<=dmx+step; }   // shown when inside, or within one tick
var TREND_GEO=null;   // geometry handoff trendChart -> wireTrendScrub (same render pass; null when the chart is empty)
var AX_CHW=0;         // measured advance of one glyph of the 11px mono axis font (mono: all glyphs equal) — cached once
function axCharW(){
  if(AX_CHW) return AX_CHW;
  try{
    var mono=(getComputedStyle(document.documentElement).getPropertyValue('--mono')||'monospace').trim();
    var ctx=document.createElement('canvas').getContext('2d');
    ctx.font='11px '+mono;
    AX_CHW=ctx.measureText('0').width||6.6;
  }catch(e){ AX_CHW=6.6; }                                       // no canvas (jsdom): a Menlo-ish estimate
  return AX_CHW;
}
/* ===== v115: the chart reframed — colour anchored to TARGET, drops marked as Max's own work =====
   The line was permanently red: ingredient prices drift up continuously and the number only falls
   when the user intervenes, so colouring by direction reported failure during the ordinary running
   of a café. Colour now means what it means on Menu Analysis — at or under target is green — and
   the sawtooth's drops are labelled as the user's interventions, drawn from the change log. */
/* Markers are DISPLAY decisions over a complete log (the data keeps everything):
   - only entries whose avgBefore/avgAfter PRIMITIVES show a fall get a marker — never keyed on
     `kind`, because a combined price-and-menu edit logs `dish_price` and a kind filter would miss
     it (v114: read detail/primitives, never kind alone). Cost-RAISING interventions stay in the
     log, off the chart.
   - ONE marker per calendar day: the invoice repoint loop writes one entry per ingredient in a
     single confirm, and the line itself dedups within the hour — per-entry markers would draw a
     picket fence under one decision. The day's magnitude is the summed fall.
   - an entry naming a DELETED plate draws like any other (markers aggregate by day and never name
     plates; the movement was real), and entries describing a state a restore rolled back draw too
     — a restore does not un-happen an intervention (v114). */
function trendMarkers(pts){
  if(!pts || pts.length<2) return [];
  if(typeof changeLog==='undefined' || !changeLog || !changeLog.length) return [];
  var t0=ptMs(pts[0]), t1=ptMs(pts[pts.length-1]);
  var days={}, out=[];
  changeLog.forEach(function(e){
    if(!e || typeof e.avgBefore!=='number' || typeof e.avgAfter!=='number') return;
    if(!isFinite(e.avgBefore) || !isFinite(e.avgAfter)) return;
    var drop=e.avgBefore-e.avgAfter;
    if(!(drop>0.001)) return;
    /* Lower bound only (pre-push review, v115): the entry for the change Max JUST made is written
       when its server write settles, so its timestamp lands a beat AFTER the trend point logHistory
       pushed synchronously — an upper bound of t1 excluded exactly the marker the feature exists to
       show, until some future point arrived (typically next session). An entry newer than all data
       is "now": mkX clamps it to the line's right end. */
    if(e.t<t0) return;
    var d=new Date(e.t), key=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();
    if(!days[key]){ days[key]={t:e.t, drop:0, count:0}; out.push(days[key]); }
    if(e.t>days[key].t) days[key].t=e.t;
    days[key].drop+=drop; days[key].count++;
  });
  out.sort(function(a,b){ return a.t-b.t; });
  return out;
}
/* The latest change-log entry with usable figures. Used by the since-line, not the markers. */
function lastChangeEntry(){
  if(typeof changeLog==='undefined' || !changeLog) return null;
  var best=null;
  changeLog.forEach(function(e){
    if(!e || typeof e.avgBefore!=='number' || typeof e.avgAfter!=='number') return;
    if(!isFinite(e.avgBefore) || !isFinite(e.avgAfter)) return;
    if(!best || e.t>best.t) best=e;
  });
  return best;
}
/* v115 — the signature line: the achievement, then the gap. DELIBERATELY silent on the fix
   (portions, products, suppliers, prices are all Max's call — chefs reprice least of all, because
   reprints cost money; naming any one of them would be prescribing, which this app does not do).
   Omitted entirely when the log has nothing usable — an empty state, not a fault.
   ⚠️ ALL-MENUS ONLY (pre-push review, v115): every entry's avgBefore/avgAfter IS
   computeAvgFoodCost(), the all-menus series — subtracting it from a per-menu current would
   fabricate drift out of the gap between two different series (all-menus 30, Winter 45 → a
   phantom "up 15 pts"). The v89 scope-honesty rule: a figure the app can't stand behind isn't
   shown. So a narrowed dashboard renders no since-line at all, same spirit as the chart's own
   scope-note one tile below. */
function sinceLineHtml(scope, current){
  if(scope && scope!==DASH_ALL) return '';
  var e=lastChangeEntry();
  if(!e || current==null) return '';
  var drop=e.avgBefore-e.avgAfter;
  var ageDays=(Date.now()-e.t)/86400000;
  var lead;
  if(ageDays>=14){ var wks=Math.round(ageDays/7); lead='No changes for '+wks+' week'+(wks===1?'':'s')+'.'; }
  else if(drop>0.05) lead='Your last change cut '+drop.toFixed(1)+' pts.';   // same figure style as the anchor line above it
  else lead='Your last change was '+(ageDays<1.5?'today':Math.round(ageDays)+' days ago')+'.';
  var drift=current-e.avgAfter, gap='';
  if(drift>=0.1) gap=' Costs up '+drift.toFixed(1)+' pts since.';
  else if(drift<=-0.1) gap=' Costs down '+(-drift).toFixed(1)+' pts since.';
  var calm=drift<0.1;   // the warm tint marks accumulating drift; a line with no drift sits quiet
  return '<p class="since'+(calm?' calm':'')+'"><b>'+esc(lead)+'</b>'+esc(gap)+'</p>';
}
/* F6 (v143) — THE PLOT IS SIZED IN RENDERED PIXELS, not in a fixed 320-unit viewBox.
   Measured on the rebuilt screen, not reasoned about: everything inside this SVG is expressed in
   VIEWBOX UNITS and therefore scales with the rendered width — the axis type (`font-size:11px` in
   CSS is 11 USER UNITS on an SVG <text>, not 11 device px), the 2.5 stroke, the marker radii, the
   tick dashes. In a 320-unit box on an 872px column that is a 2.7× enlargement: the axis labels
   measured ~30px and the line ~6.8px, against the mock's 10.5 and 1.75. It has been wrong on
   desktop since v94 and right on a phone by accident, because 320 units ≈ 340 rendered px there.
   The v121 comment named the SYMPTOM — "rendering the 320-unit viewBox wider scales the axis type
   out of bounds" — and worked around it with a 540px cap that made the chart float in its card.
   This removes the cause, so the chart can fill the mock's column at every width.
   W is the column's own content width, read from #dashBody: it is laid out and visible before this
   runs (showTab sets the pane's display BEFORE calling renderDashboard), and every render
   re-measures. The fallback is the phone-sized 320 for the one case that has no layout — a
   boot-time render into a tab that is still hidden, which nobody sees and which showTab re-renders.
   H uses the mock's OWN two ratios: 190/900 at desktop, 110/350 on the phone. The threshold is a
   CONTENT width, not a viewport width, because that is what this measures — below 1024 there is no
   sidebar, so a 600px viewport is already a ~560px column.
   The bounds and the ratios live INSIDE the function on purpose: it is the whole plot-sizing
   decision, and a test can extract it entire and drive it against a stubbed width rather than
   re-implementing the arithmetic (CLAUDE.md — a stub that mirrors a real function must mirror its
   contract, so extract the real one). No layout is needed for the fallback path: `document` is
   simply absent in a sandbox, and the try/catch is what makes that the documented 320 case. */
function trendPlotSize(){
  var MIN=300, MAX=960, PHONE=320, DESK_FROM=560, R_DESK=190/900, R_PHONE=110/350;
  var w=0;
  try{ var el=document.getElementById('dashBody'); w=el?el.clientWidth:0; }catch(e){ w=0; }
  if(!w) w=PHONE;
  w=Math.max(MIN, Math.min(MAX, Math.round(w)));
  return { W:w, H:Math.round(w*(w>=DESK_FROM?R_DESK:R_PHONE)) };
}
function trendChart(scope){
  /* v115 stage 2 — the promise the v89 comment made ("Stage 2 gives it the two-line chart once the
     history exists"): per-menu history has been recording since v89 and now holds real points, so a
     narrowed dashboard draws the MENU'S OWN line whenever that menu has two points in the chosen
     range. The fallback — and ONLY the fallback — is the all-menus line with the scope-note; a menu
     whose history is still building keeps the exact v94 behaviour. Markers and the "All menus ·"
     caption prefix belong to the all-menus series alone: change-log figures ARE the all-menus
     average (see sinceLineHtml), so a marker on a per-menu line would mix two series. */
  var narrowed=!!(scope && scope!==DASH_ALL);
  var scopedPts=narrowed?dashRangePts((typeof menuHistory!=='undefined'&&menuHistory&&menuHistory[scope])||[]):null;
  var drawingScoped=!!(scopedPts && scopedPts.length>=2);
  var pts=drawingScoped?scopedPts:dashRangePts();
  var fellBack=narrowed&&!drawingScoped;
  var scopeNote=fellBack?'<p class="hint scope-note">Per-menu history is still building — this line covers all menus.</p>':'';
  /* v52 GUTTER GEOMETRY — v51 removed the left gutter so the curve could start at the card's
     text column, but that drew the plot (fill dots, line) UNDERNEATH the y-axis labels (Max's
     screenshot: dots surrounding "10%"). The structural fix: ONE gutter constant that every
     plot element respects. plotLeft = padL = widest tick label (measured in the real 11px mono,
     axCharW) + 8px gap; labels sit INSIDE the gutter, right-aligned to plotLeft-8, so the widest
     label's LEFT edge lands at x=0 = the title/caption/stats column, digits sit flush as a
     column, and ZERO plot pixels (fill, line, dots, target line, crosshair) render left of
     plotLeft. v48 invariants preserved: geometry constant across ranges (labels are "NN%" =
     same glyph count for any 2-digit percent, so the measured gutter can't vary between
     ranges), labels vertically CENTRED on their value so the target tick sits exactly on the
     dashed rule (pinned by fresh-states.spec.js). */
  /* v94 density: H 210→104 — the approved mockup's chart is compact, with the line using most of
     the vertical space. Only the viewBox HEIGHT changed: the x-gutter (padL/axGap), axis fonts,
     tick/domain generation, target-line rule and scrub wiring were untouched, and still are.
     F6 (v143): W and H come from trendPlotSize() instead of being the constants 320/104. Nothing
     else in this function changes — every value below still derives from W and H exactly as it
     did. See trendPlotSize for the measurement that forced it. */
  var _sz=trendPlotSize(), W=_sz.W, H=_sz.H, padR=10,padT=14,padB=20;
  TREND_GEO=null;
  if(pts.length<2){                                              // 0 or 1 point: the empty-state card (unchanged); scrub wiring bails on TREND_GEO
    var emptyHint=(priceHistory.length>=2)
      ? 'No points in this range yet \u2014 try a longer range.'
      : 'The trend needs at least two logged points. A point is recorded only when a plate on a menu has been costed (so an average food cost exists) and a price then changes. Put a costed plate on a menu, then update a price, to start the line.';
    return '<div class="dash-chart empty"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Food cost trend"></svg>'
      +'<p class="hint chart-hint">'+emptyHint+'</p>'+scopeNote+'</div>';
  }
  /* v60 item 1b: the DOMAIN fits the DATA (target excluded), so small margin moves read as movement.
     A minimum span (~5 pts, centred) stops a flat window from magnifying 0.x-pt noise. Ticks derive from
     the domain: when the target is in view we keep v48's target-on-a-tick generator (extended to cover
     both data and target); when it's far away we use plain round ticks over the data and annotate the
     target at the edge instead of stretching the axis to reach it. Domain = tick extent ± half a step,
     so headroom stays consistent in tick units and similar ranges can't jitter. */
  var dvals=pts.map(function(p){return p.v;});
  var dmn=Math.min.apply(null,dvals), dmx=Math.max.apply(null,dvals);
  /* ===== v145 — THE DOMAIN, and why it is now built two different ways =====
     The reported defect: with the target near the readings the series collapsed into a band with
     most of the plot empty under it. Measured before fixing, target 30 with data 31.0-32.5: ticks
     rendered 25/30/35 and the series occupied fractions 0.33-0.43 of the plot, i.e. 10% of it,
     with ~57% dead below. Control case, target 30 with data 36-42: 75% of the plot. Healthy.
     TWO RULES WERE COMPOUNDING, and each is defensible alone.
       1. v60's minimum ~5-pt window, so a FLAT series does not magnify 0.x-pt noise.
       2. v48's hard requirement that the target sit on a LABELLED TICK, which is the whole reason
          the dashed line carries no word of its own. tcTicks builds outward from the target and
          widens the step until it has <=4 ticks — with a 5-pt window that lands on step 5.
     The domain was then `ticks[0]-step/2 .. last+step/2`, so a step of 5 spent 15 points of axis
     on 1.5 points of data. Neither rule is wrong; applying both to the same range is.
     ⚠️ The v60 comment claiming "the DOMAIN fits the DATA (target excluded)" was FALSE whenever the
     target was in view — the line right under it concatenated the target into the domain. It has
     been rewritten rather than left, because it sent this batch's investigation the wrong way once.
     THE SPLIT: when the target is drawn it already guarantees a sensible span, so the minimum
     window is not applied on top of it and the domain is the readings-plus-target extent with
     proportional headroom. When the target is NOT drawn, v60's behaviour is kept verbatim — that
     is the case its minimum window was written for, and nothing about it changed. */
  var tmn=dmn, tmx=dmx, span=dmx-dmn;
  // the in-view TEST still uses v60's widened window, so exactly the same targets qualify as
  // before. Only what happens AFTER a target qualifies is different.
  if(span<5){ var midT=(dmn+dmx)/2; tmn=midT-2.5; tmx=midT+2.5; }
  if(tmn<0) tmn=0;
  var probeStep=niceStep((tmx-tmn)/3);
  var targetShown=targetInView(cogsPct, tmn, tmx, probeStep);
  var ticks, mn, mx, step, head;
  if(targetShown){
    /* The ticks are generated over the readings-UNION-target range and the DOMAIN is then their
       extent, plus a hair. Nothing is filtered, and that is the point: tcTicks covers whatever
       range it is handed, so every tick it returns is inside the domain BY CONSTRUCTION and an
       off-plot label is structurally impossible rather than cleaned up afterwards.
       ⚠️ The first cut of this fix DID filter — generate over a padded domain, then drop the ticks
       that fell outside it — and the pre-push review reproduced the consequence: for readings
       [28,30,32] against a target of 30, tcTicks widens to step 5 (its <=4-tick rule), returns
       [25,30,35], and the filter leaves ONE labelled value on the whole axis. Ordinary café data,
       squarely inside the case this batch exists to improve. Worse, the fresh-states tick-count
       assertion had been rewritten to permit it, which is rewriting a spec to fit a regression
       rather than closing the regression. That assertion is restored below. */
    var lo=Math.min(dmn,cogsPct), hi=Math.max(dmx,cogsPct);
    // a series with almost no variance sitting ON its target has no range to build an axis from;
    // 1.5 points is the smallest window that still yields three round ticks around it. This is
    // v60's minimum-window idea at the scale the target case actually needs — the 5-pt version is
    // what compounded with the tick rule in the first place.
    if(hi-lo<1.5){ var midT=(lo+hi)/2; lo=midT-0.75; hi=midT+0.75; }
    if(lo<0) lo=0;
    ticks=tcTicks(cogsPct, lo, hi);
    var tickSpan=ticks[ticks.length-1]-ticks[0];
    // headroom off the TICK extent, so the outermost labels are not welded to the plot edges. A
    // fraction, never a tick step: a step-sized pad is what let a coarse step dominate the domain.
    head=Math.max(tickSpan*0.04, 0.15);
    mn=Math.max(0, ticks[0]-head); mx=ticks[ticks.length-1]+head;
  } else {
    dmn=tmn; dmx=tmx;                                              // v60's window, unchanged
    ticks=niceTicks(dmn, dmx);
    step=ticks.length>1?ticks[1]-ticks[0]:5;
    head=step/2;
    mn=Math.max(0,ticks[0]-step/2); mx=ticks[ticks.length-1]+step/2;
  }
  /* THE DOMAIN MUST CONTAIN THE READINGS, and deriving it from the ticks does not guarantee that.
     `tcTicks` ends with `while(lo<0) lo+=step` — a guard that keeps tick LABELS non-negative on a
     percent axis, and does it by raising its whole sequence. So near the zero floor `ticks[0]` can
     sit ABOVE a reading, and since `y(v)` is unclamped the curve then draws BELOW the plot floor,
     into the strip the marker labels use. Reproduced by the pre-push review at a 1.5% target with
     readings flat at 0, and it is NOT new — `main` fails the same way at a 3.5% target — so the
     guard sits after BOTH branches rather than inside the new one.
     Widening can only help: the ticks stay inside a domain that grew, so "every tick is on the
     plot" survives untouched. Reachable rather than likely — it needs a food cost at or near 0%,
     which means near-free ingredients — but `cogsPct` is only clamped to [1,99], so the input
     range the code states for itself allows it. */
  if(dmn<mn) mn=Math.max(0, dmn-head);
  if(dmx>mx) mx=dmx+head;
  var fmtTick=function(v){ return (v%1?v.toFixed(1):v.toFixed(0))+'%'; };
  // v52: the label gutter — sized to the widest tick label so a wide label ("32.5%" from a
  // decimal target) widens the gutter instead of clipping at the svg edge (the v48 bug)
  var axGap=8, maxCh=Math.max.apply(null,ticks.map(function(v){ return fmtTick(v).length; }));
  var padL=Math.ceil(maxCh*axCharW()+axGap);
  var x=function(i){ return padL+(W-padL-padR)*(pts.length===1?0.5:i/(pts.length-1)); };
  var y=function(v){ return padT+(H-padT-padB)*(1-(v-mn)/(mx-mn)); };
  var xs=[], ys=[];
  pts.forEach(function(p,i){ xs.push(x(i)); ys.push(y(p.v)); });
  var tan=tcTangents(xs,ys);
  var d=tcPath(xs,ys,tan);                                       // v47: smooth monotone curve (was straight polyline segments)
  /* v115 — colour is anchored to the TARGET, not to direction (supersedes the v47 "green = improving"
     semantic and its never-change note, deliberately: direction-colouring made the chart permanently
     red, because prices only drift up between interventions — it told the user he was failing during
     the ordinary running of a café). Green now means what it has always meant on Menu Analysis: at or
     under target. Rising-but-under stays green; the judgement about drift lives in the over-target
     band and the since-line, not in the line's slope. */
  var latest=pts[pts.length-1].v;
  var overNow=latest>cogsPct+0.05;
  var stroke=overNow?'var(--bad)':'var(--good)';
  // v61 item 6 (SUPERSEDES v60's edge-annotation half): the dashed target rule renders only when the target
  // is inside the domain (or within one tick, per targetInView). When it's outside, NOTHING is drawn — no edge
  // marker, no arrow. The user knows their own target; the line's only job is to warn as costs approach it.
  var refLine='', band='';
  if(targetShown){
    var refYn=y(cogsPct);
    refLine='<line class="ref-line" x1="'+padL+'" y1="'+refYn.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+refYn.toFixed(1)+'" stroke="var(--muted2)" stroke-dasharray="4 4" stroke-width="1"/>';
    // v115: the over-target zone — a faint wash above the target line, so the red has somewhere to
    // live and the line itself stops carrying the judgement. Clamped to the plot; absent when the
    // target sits above the domain (nothing over target to shade).
    var bandBot=Math.min(Math.max(refYn,padT),H-padB);
    if(bandBot>padT+1) band='<rect class="over-band" x="'+padL+'" y="'+padT+'" width="'+(W-padL-padR)+'" height="'+(bandBot-padT).toFixed(1)+'" fill="var(--bad)" opacity="0.07"/>';
  }
  /* v115 — the intervention markers (see trendMarkers above for the display rules). The x-axis is
     INDEX-spaced, not time-scaled, so a marker's time is interpolated between its neighbouring
     readings; y rides the rendered curve via tcYAt, same as the scrub dot. Dots always draw; the
     magnitude label drops on any marker within 30 viewBox units of the previous label (several
     markers at 380px must not collide — the scrub tooltip still carries the full sentence), and
     labels sit in the empty padB strip below the plot where nothing can overlap them. */
  var marks=drawingScoped?[]:trendMarkers(pts);   // v115: markers carry all-menus figures — they draw only on the all-menus line (same honesty rule as the since-line)
  var ptsMs=pts.map(function(p){ return ptMs(p); });
  var mkX=function(t){
    if(t<=ptsMs[0]) return xs[0];
    for(var i=1;i<ptsMs.length;i++){
      if(t<=ptsMs[i]){
        var f=(ptsMs[i]===ptsMs[i-1])?1:(t-ptsMs[i-1])/(ptsMs[i]-ptsMs[i-1]);
        return xs[i-1]+(xs[i]-xs[i-1])*f;
      }
    }
    return xs[xs.length-1];
  };
  var mkGuides='', mkDots='', mkLabels='', mkGeo=[], lastLblX=-1e9;
  marks.forEach(function(mk){
    var mx=mkX(mk.t), my=tcYAt(xs,ys,tan,mx);
    mkGuides+='<line x1="'+mx.toFixed(1)+'" y1="'+padT+'" x2="'+mx.toFixed(1)+'" y2="'+(H-padB)+'" stroke="var(--border)" stroke-width="1"/>';
    mkDots+='<circle class="mk-pt" cx="'+mx.toFixed(1)+'" cy="'+my.toFixed(1)+'" r="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>';
    var mag=Math.round(mk.drop*10)/10;
    /* v145 (UI-7): the label carries its UNIT. It read as a bare "−0.2", which states a magnitude
       of nothing in particular; the mock's equivalent is "price change, -0.7". The SUBJECT stays in
       the caption ("● marks changes you made") rather than being repeated on every marker, which
       is what keeps the label short enough to sit in the padB strip on a phone.
       The collision gap moves 30 → 52 with it: the labels are ~8 characters now, and at ~6px a
       character in the 10-unit type that is ~48px. Since v143 a viewBox unit is about a rendered
       pixel, so 30 units no longer clears an 8-character label and two markers three days apart
       would have overprinted. */
    if(mag>=0.1 && mx-lastLblX>=52){
      mkLabels+='<text class="mk-lbl" x="'+mx.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" font-size="10" fill="var(--accent)">−'+mag+' pts</text>';
      lastLblX=mx;
    }
    mkGeo.push({x:mx, drop:mk.drop, count:mk.count});
  });
  var area=d+' L'+xs[xs.length-1].toFixed(1)+' '+(H-padB)+' L'+xs[0].toFixed(1)+' '+(H-padB)+' Z';
  /* v94 polish (SUPERSEDES the v47 dotted texture, its v94 opacity tweak and the fade mask — do
     not restore them): the area under the curve is a smooth translucent gradient of the semantic
     line colour, and the per-point reading dots are GONE (Max's call — the scrub dot #tcDot is
     the way to read a value). The static drawing is duplicated into a bright and a dim group;
     scrubbing only moves the clip split. */
  var drawing='<path d="'+area+'" fill="url(#tcarea)"/>'
    +'<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  // v52: labels live INSIDE the gutter, right-aligned to plotLeft-8 so the digits sit flush as a
  // column whatever each label's width; the gutter is sized to the widest label (see padL above)
  // so the widest label's left edge = x0 = the title/caption column. Vertically CENTRED on their
  // value so the target tick sits exactly on the dashed rule (v48 invariant, pinned).
  var axis=ticks.map(function(v){ return '<text class="ax" x="'+(padL-axGap)+'" y="'+(y(v)+3.5).toFixed(1)+'" text-anchor="end">'+fmtTick(v)+'</text>'; }).join('');
  // v115: the words follow the colour — position against target, plus the markers, not direction.
  var posWord=overNow?('over your '+fmtTargetPct()+' target'):('under your '+fmtTargetPct()+' target');
  var ariaMk=marks.length?(', with '+marks.length+' marked change'+(marks.length===1?'':'s')+' you made'):'';
  var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" tabindex="0" aria-label="Average food cost trend, currently '+posWord+ariaMk+'. Use the left and right arrow keys to step through readings.">'
    +'<defs>'
    // v94 polish: the area gradient — semantic line colour at 18% under the curve, transparent at
    // the plot floor. Anchored to the plot's Y extents (userSpaceOnUse) so it reads identically on
    // every range and both themes; the colour is the same CSS var the stroke uses.
    +'<linearGradient id="tcarea" x1="0" y1="'+padT+'" x2="0" y2="'+(H-padB)+'" gradientUnits="userSpaceOnUse">'
    +'<stop offset="0" stop-color="'+stroke+'" stop-opacity="0.18"/><stop offset="1" stop-color="'+stroke+'" stop-opacity="0"/></linearGradient>'
    +'<clipPath id="tcClipB"><rect id="tcRectB" x="0" y="0" width="'+W+'" height="'+H+'"/></clipPath>'
    +'<clipPath id="tcClipD"><rect id="tcRectD" x="'+W+'" y="0" width="0" height="'+H+'"/></clipPath>'
    +'</defs>'
    +band      // v115: under everything — the wash is context, never chrome
    +refLine   // v60 item 1b: present only when the target is inside the domain
    +mkGuides  // v115: marker hairlines sit behind the curve, like gridlines
    +'<g clip-path="url(#tcClipB)">'+drawing+'</g>'
    +'<g clip-path="url(#tcClipD)" opacity="0.35">'+drawing+'</g>'
    +axis   // v48: the "Target" word is gone (Max's call) — the dashed line lands exactly on the axis tick labelled with the user's own target number, so it explains itself
    +mkDots+mkLabels   // v115: marker dots ride the curve OUTSIDE the scrub clip groups (they must not dim), labels live in the empty padB strip
    +'<line id="tcCross" x1="0" x2="0" y1="'+padT+'" y2="'+(H-padB)+'" stroke="var(--muted2)" stroke-width="1" stroke-dasharray="2 3" visibility="hidden"/>'
    +'<circle id="tcDot" r="4" fill="'+stroke+'" stroke="var(--surface)" stroke-width="1.5" visibility="hidden"/>'
    +'</svg>';
  TREND_GEO={xs:xs, ys:ys, tan:tan, pts:pts, W:W, H:H, padL:padL, padR:padR, padT:padT, padB:padB, marks:mkGeo};
  /* v115 caption — states the position against the TARGET, never a direction verdict ("trending up"
     told the user he was failing while prices did what prices do). "All menus" stays: the v89 scope
     honesty is unchanged — this series covers every menu. The marker sentence appears once, here,
     so the marks themselves need no per-marker wording (they carry only a magnitude). */
  var overCount=0; pts.forEach(function(p){ if(p.v>cogsPct+0.05) overCount++; });
  var capPos=(overCount===pts.length)?('over your '+fmtTargetPct()+' target across this range')
    :(overCount?('crosses your '+fmtTargetPct()+' target in this range')
    :('under your '+fmtTargetPct()+' target across this range'));
  var capMk=marks.length?(' <span class="mk-note"><span class="mk-dot">●</span> marks changes you made.</span>'):'';
  // v115: "All menus" prefixes only the all-menus line. A scoped draw says "This menu" — a
  // reference, not a restatement (the heading owns the NAME, v97's one-statement rule).
  var capScope=drawingScoped?'This menu':'All menus';
  return '<div class="dash-chart" id="trendWrap">'+svg
    +'<div class="tp-tip" id="trendTip" aria-hidden="true"></div>'
    +'<p class="hint chart-hint">'+capScope+' \u00b7 '+capPos+'.'+capMk+'</p>'+scopeNote+'</div>';
}
/* ===== v90: "Dig in" — four headline cards that drill down INLINE ============================
   Replaces the three highlight cards and #hlModal. The brief's pattern is list → detail → back —
   a `.detail-open` class swap, no modal: tapping a card replaces the grid in place and a back
   arrow returns. (It cited Settings' mobile drill-down as the precedent; F9/v148 deleted that with
   the Settings modal, so this is now the app's only instance and owns the pattern outright. The
   class name is shared with nothing — grep confirms one consumer.) A modal for a sorted list is a heavier
   surface than the content needs, and it stacked another dismissable layer on a screen the 26 Jul
   audit already wanted fewer of.

   SCOPE is per-card and stated in the card's own label, because two of these are NOT about a menu:
   - foodcost / plate  → scoped to the Dashboard's selector (they rank plates ON a menu)
   - movers / stock    → GLOBAL, always. They rank PRODUCTS, which belong to no menu, so narrowing
                         them to a menu would produce a number that answers a different question
                         than the one the selector implies. Their labels say so.

   RULE C: every label states the basis of its ranking — "food cost %", "cost per plate", "per
   unit". None of these is a ranking by money made or lost; EzPlate has no sales volume.

   The lists show EVERY item, not a top-N (Max's call), and plate rows carry their margin light so
   a long list stays scannable. `.dig-list` is a plain block of rows — no virtualisation — which is
   right at café scale (a big menu here is ~80 plates); revisit if a list ever runs to thousands. */
var DIG_CARDS=[
  {kind:'foodcost', label:'Highest food cost %',   scoped:true},
  {kind:'plate',    label:'Highest cost per plate', scoped:true},
  {kind:'movers',   label:'Biggest movers',        scoped:false},
  {kind:'stock',    label:'Dearest per unit',      scoped:false}
];
var digOpen=null;                                                    // the kind currently drilled into, or null for the grid
function setDigOpen(kind){ digOpen=kind||null; renderDashboard(); }
/* One data source per card: {title, sub, rows:[{name, disp, light}]}. `light` is the margin light
   where the row is a plate on a menu, and null where it isn't (a product has no margin). */
function digData(kind, scope){
  var isAll=(scope==null||scope===DASH_ALL), rows=[];
  if(kind==='foodcost'){
    MENU.forEach(function(m){
      if(!(m.price>0)) return;
      if(!isAll && (m.menuId||'MENU_ORIGINAL')!==scope) return;
      var sp=plateForMenuItem(m); if(!sp) return;
      var c=costFromLines(sp.lines); if(!(c>0)) return;
      rows.push({name:m.name, val:c/m.price*100, disp:(c/m.price*100).toFixed(1)+'%', light:analyze(c, m.price).light});
    });
    rows.sort(function(a,b){ return b.val-a.val || String(a.name).localeCompare(String(b.name)); });
    return {title:'Highest food cost %', sub:dashScopeLabel(isAll?DASH_ALL:scope), rows:rows};
  }
  if(kind==='plate'){
    // cost per plate is a property of the PLATE, but which plates count depends on the scope — a menu
    // narrows it to the plates published there. Deduped by plate: one plate on two menus is one row.
    var seen={};
    MENU.forEach(function(m){
      if(!isAll && (m.menuId||'MENU_ORIGINAL')!==scope) return;
      var sp=plateForMenuItem(m); if(!sp || seen[sp.id]) return;
      var c=costFromLines(sp.lines); if(!(c>0)) return;
      seen[sp.id]=1;
      rows.push({name:sp.name||m.name||'Plate', val:c, disp:fmt2(c), light:(m.price>0?analyze(c, m.price).light:null)});
    });
    rows.sort(function(a,b){ return b.val-a.val || String(a.name).localeCompare(String(b.name)); });
    return {title:'Highest cost per plate', sub:dashScopeLabel(isAll?DASH_ALL:scope), rows:rows};
  }
  if(kind==='movers'){
    // Largest logged price change per product, most recent step. GLOBAL: products belong to no menu.
    var since=null;
    Object.keys(ingPriceLog||{}).forEach(function(pid){
      var a=ingPriceLog[pid]; if(!a || a.length<2) return;
      var p=byId[pid]; if(!p) return;
      var prev=a[a.length-2].v, last=a[a.length-1].v;
      if(!(prev>0) || last==null || !isFinite(last)) return;
      var pct=(last-prev)/prev*100;
      if(Math.abs(pct)<1) return;                                    // sub-1% is rounding noise, not a move
      var t=ptMs(a[a.length-1]); if(since==null || t<since) since=t;
      /* v120: `sub` is for the What-moved panel's second line. Two dimensions, which is the bar
         Max set in v90 — a bare "in 9 plates" was rejected as something the owner already knows,
         but paired with the size of the move it is the thing they could not compute in their head.
         Breadth counts through productRefs so BOTH reference paths are checked (ingredient→pid and
         plate-line→pid); do not swap it for a single-path count.
         WHEN is a time phrase and nothing more. The design's "last invoice" is NOT derivable —
         setProduct is the one writer of this log and it is called by the invoice apply AND by a
         hand edit, so claiming an invoice source would be false about half the time. */
      var np=(typeof productRefs==='function')?productRefs(p.id).plates.length:0;
      rows.push({name:p.description+(p.brand?' — '+p.brand:''), val:Math.abs(pct),
        disp:(pct>0?'+':'−')+Math.abs(pct).toFixed(1)+'%', dir:(pct>0?'up':'down'), light:null,
        sub:moverWhen(t)+(np?(' · in '+np+' plate'+(np===1?'':'s')):'')});
    });
    rows.sort(function(a,b){ return b.val-a.val || String(a.name).localeCompare(String(b.name)); });
    return {title:'Biggest movers', sub:(since!=null?('price changes since '+monthLabel(since)):'across all products'), rows:rows};
  }
  // stock — dearest per unit, across every product actually used in a plate. GLOBAL.
  var usedPids={};
  (savedPlates||[]).forEach(function(sp){ (sp.lines||[]).forEach(function(l){
    if(!l||l.misc) return; if(l.kid){ var k=kById[l.kid]; if(k&&k.pid!=null) usedPids[k.pid]=true; } else if(l.pid!=null) usedPids[l.pid]=true; }); });
  rows=PRODUCTS.filter(function(p){ return usedPids[p.id]; })
    .map(function(p){ var v=perDisplayValue(p); return v==null?null:{name:p.description+(p.brand?' — '+p.brand:''), val:v, disp:dispPrice(p), light:null}; })
    .filter(Boolean);
  rows.sort(function(a,b){ return b.val-a.val || String(a.name).localeCompare(String(b.name)); });
  return {title:'Dearest per unit', sub:'across all products', rows:rows};
}
/* F6 (v143): the mock's §3.1 "Dig in" ROW — label left, subject muted in the middle, figure mono
   hard right. The mock's four rows and this app's four drill-down cards were already the same four
   questions in the same order, so this is the mock's grammar over the shipped control: the row is
   still a button and still opens the same inline drill-down. `.dig-card` is kept as the class name
   because it is the hook `renderDashboard` wires `setDigOpen` to (CLAUDE.md: never rename an
   identifier for tidiness). */
function digCardHtml(card, scope){
  var d=digData(card.kind, scope), top=d.rows[0];
  var val=top? '<span class="dig-v'+(top.dir?(' '+top.dir):'')+'">'+esc(top.disp)+'</span>' : '<span class="dig-v muted">—</span>';
  // v98: an empty tile declares itself so CSS can quiet it — "Nothing yet" should not carry
  // the same visual weight as a tile with real data (same chrome, quieter content).
  return '<button class="dig-card'+(top?'':' is-empty')+'" type="button" data-kind="'+esc(card.kind)+'">'
    +'<span class="dig-k">'+esc(card.label)+'</span>'
    +'<span class="dig-n">'+(top?esc(top.name):'Nothing yet')+'</span>'
    +val+'</button>';
}
function digInHtml(scope){
  if(digOpen){
    var d=digData(digOpen, scope);
    var body=d.rows.length
      ? '<ul class="dig-list">'+d.rows.map(function(r){
          return '<li class="dig-row">'
            +(r.light?'<span class="dot '+esc(r.light)+'" aria-hidden="true"></span>':'')
            +'<span class="dig-rn">'+esc(r.name)+'</span>'
            +'<span class="dig-rv'+(r.dir?(' '+r.dir):'')+'">'+esc(r.disp)+'</span></li>';
        }).join('')+'</ul>'
      // v58 empty-state system: the ONE place an empty state is built. No bespoke markup, no one-off rule.
      : emptyStateHtml(ICON_MENU_BIG, 'Nothing to rank yet.', 'Cost a plate and put it on a menu to fill this list.');
    return '<section class="dash-sec dash-dig detail-open"><div class="ds-head">'
      +'<button class="dig-back" type="button" id="digBack" aria-label="Back to Dig in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>'
      +'<h2>'+esc(d.title)+'</h2></div>'
      +'<p class="hint dig-sub">'+esc(d.sub)+'</p>'+body+'</section>';
  }
  return '<section class="dash-sec dash-dig"><div class="ds-head"><h2>Dig in</h2></div>'
    +'<div class="dig-grid">'+DIG_CARDS.map(function(c){ return digCardHtml(c, scope); }).join('')+'</div>'
    +'</section>';
}
/* =====================================================================================
   AI-assisted helper, built as GROUNDED INSIGHTS (not a chatbot). v63 shipped the first,
   single-shape version (over-target → reprice); v67 broadened it into several TYPES and moved
   it onto the Menu tab; v90 moves it to the DASHBOARD (one home, not two) and rewrites what
   counts as an insight at all.
   Hard law unchanged: the app computes EVERY number deterministically here; the AI (optional
   layer below) may only rephrase the SAME sentence and is forbidden to produce a figure.
   The whole engine ships and is useful with NO API call.

   v90 — THE BAR (Max): "Eggs are in 8 plates" is useless; the owner already knows what is in
   their own plates. The previous bar ("not visible in the menu table") was too weak. The real
   bar is something the owner could not compute in their head, so:

   RULE A — every candidate declares the DIMENSIONS it combines, and must carry at least TWO,
     or be a single aggregate across the whole dataset. One dimension on its own is either
     obvious or already on screen. See INSIGHT_DIMS / ruleA.
   RULE B — it must point at a decision, and it POINTS WITHOUT PRESCRIBING: state the fact and
     its size, never the fix. The app cannot judge culinary substitutability (v71), so no
     suggested swaps, portions or prices.
   RULE C — EzPlate has NO sales volume (deliberate: no POS integration, manual entry rejected
     as unreliable). Every ranking is by COST EFFICIENCY and says so. Nothing may imply profit
     impact or money earned/lost, because that needs volume the app does not have.

   Each TYPE is a pure function (tests pin them) returning zero+ candidates of the shape
   {kind, dims, scope, facts, text, score}: `facts` holds every number that appears in `text`
   (the phrasing validators depend on exactly that), `scope` is 'menu' | 'global' | undefined
   for both. selectInsights ranks by score, keeps type VARIETY (≤1 per kind) and rotates the
   near-top group by a per-render seed. deriveInsights orchestrates; the impure computeInsights
   builds the data bundle for the CURRENT DASHBOARD SCOPE.

   RULE D (v91) — EVERY FAMILY RUNS ON EVERY RENDER. No family is gated on another family's
     result, and no state of the menu (over target, under target, no history) may stop a family
     being asked. A family with nothing to say returns [] and blocks nothing. The all-healthy line
     is not a family: it is what the panel says when the whole engine came back empty, and it may
     only claim "all clear" when nothing is over target as well. v90 broke this by branching on the
     over-target count and it shipped a panel that said "nothing needs attention" while the
     comparison bar directly beneath it reported costs creeping up.
   ===================================================================================== */

/* Rule A's dimension vocabulary — the six kinds of thing an insight can add. `aggregation` is
   the one that stands alone (an average or count across the whole dataset is by definition not
   something you hold in your head); every other dimension needs a partner. */
var INSIGHT_DIMS={ time:1, composition:1, breadth:1, aggregation:1, distribution:1, comparison:1 };
function ruleA(c){
  if(!c || !Array.isArray(c.dims)) return false;
  var seen={}, n=0;
  c.dims.forEach(function(d){ if(INSIGHT_DIMS[d] && !seen[d]){ seen[d]=1; n++; } });
  if(n>=2) return true;
  return n===1 && !!seen.aggregation;                                // a whole-dataset aggregate is allowed to stand alone
}
/* Scope gate. Some types are facts about the PRODUCT LIST rather than about any one menu —
   concentration and the price anomaly — so they only speak at all-menus scope. Suppress what
   doesn't apply rather than forcing it.
   v92: `category` is no longer menu-only. v90 reasoned that averaging sections across every menu
   "averages away the thing that makes it useful", but the effect of that was that the strongest
   family needing NO price history was silent at the DEFAULT scope, which is where the owner
   actually looks — leaving only the snapshot-only families, which are the weak ones. A section
   average across all menus is still a legitimate aggregate over a real group of plates. */
function scopeAllows(c, isAll){
  if(!c || !c.scope) return true;                                    // 'any' — meaningful at both
  return isAll ? (c.scope!=='menu') : (c.scope!=='global');
}
function pts1(x){ return Math.round(x*10)/10; }                      // one decimal, for "points" figures
function clamp01(x, lo, hi){ return x<lo?lo:(x>hi?hi:x); }

/* ===================== v92: VALUE RANKING — score, then a hard FLOOR =====================
   Until v92 a family emitted and the panel displayed, capped only by menu size. That is why five
   weak lines could fill the panel: the strong families were starved of price history (they all read
   ingPriceLog, which had one writer until v91) and the survivors were exactly the families
   computable from a static snapshot of today's numbers — which can only count, spread or aggregate.
   Ranking alone would not have helped, because the strong candidates were never in the pool. So
   value is now declared, not implied, on the two axes the owner would recognise:

   NON-OBVIOUSNESS — could they have worked this out looking at the menu table? A movement over time
     could not (they'd need last month's prices). A count of rows could.
   ACTIONABILITY — does it name the thing to look at? A named plate, ingredient, section or supplier
     points somewhere. A menu-wide average does not.

   score = 100 · (0.55·novel + 0.45·act) · magnitude, magnitude ∈ [0.5, 1] for how big THIS instance
   is. INSIGHT_FLOOR is absolute: a candidate below it never displays, however empty the panel —
   three real insights beat five padded ones. Tuning lives HERE, in one table, not scattered across
   twelve families as hand-picked constants. */
var INSIGHT_VALUE={
  drift:        {novel:0.95, act:1.00},   // one named plate, one named era — the sharpest shape there is
  costbase:     {novel:1.00, act:0.90},   // needs prices they no longer have, and names the culprit
  longstanding: {novel:0.90, act:1.00},
  volatility:   {novel:0.85, act:0.85},
  anomaly:      {novel:0.80, act:0.90},   // names ONE product that may simply be entered wrong
  category:     {novel:0.70, act:0.75},
  complexity:   {novel:0.70, act:0.60},   // a real cross-cutting pattern, but no single target
  concentration:{novel:0.60, act:0.70},   // only ever emitted WITH its consequence (see the family)
  nearcluster:  {novel:0.45, act:0.60}    // a count — but of something not visible anywhere on screen
};
var INSIGHT_FLOOR=45;                                                // below this, silence is the better answer
function insightScore(kind, magnitude){
  var v=INSIGHT_VALUE[kind]; if(!v) return 0;
  return 100*(0.55*v.novel + 0.45*v.act)*clamp01(magnitude==null?1:magnitude, 0.5, 1);
}

/* ============================ FAMILY 1 — cost-base movement, culprit named ============================
   The average moved, and here is which ingredient did it and how far its reach goes.
   time × aggregation × breadth. Needs ≥2 logged price points on at least one ingredient in scope.
   Both figures are computed at TODAY'S sell prices, so the comparison isolates COST movement —
   it is not a claim about what the percentage read at the time. */
function insCostBase(mv){
  if(!mv || !(Math.abs(mv.pts)>=0.3) || !mv.name || !mv.sinceLabel) return [];
  if(!(Math.abs(mv.ingPct)>=3) || !(mv.plates>=1)) return [];
  var up=mv.pts>0, p=pts1(Math.abs(mv.pts)), ip=Math.round(Math.abs(mv.ingPct)), n=mv.plates;
  return [{kind:'costbase', dims:['time','aggregation','breadth'], score:insightScore('costbase', 0.5+Math.abs(mv.pts)/4),
    facts:{pts:p, ingPct:ip, plates:n},
    text:'Your average food cost is '+p+' pts '+(up?'higher':'lower')+' than at '+mv.sinceLabel+' prices — '
      +mv.name+', '+(mv.ingPct>0?'up':'down')+' '+ip+'% across '+n+' plate'+(n===1?'':'s')+', is most of it.'}];
}

/* ============================ FAMILY 2 — plate drift ============================
   One plate's ingredients cost more than they did, and what that does to its food cost % at
   today's price. time × composition. The "its price hasn't moved" clause is added ONLY when the
   sell-price log proves it (priceHeldSince) — never assumed, because a plate whose price also
   rose has not drifted at all. */
function insDrift(d){
  if(!d || !d.name || !d.sinceLabel) return [];
  if(!(d.up>=0.20) || !(d.toPct-d.fromPct>=2)) return [];            // needs a real move in both money and points
  var up=Math.round(d.up*100)/100, f=Math.round(d.fromPct), t=Math.round(d.toPct);
  return [{kind:'drift', dims:['time','composition'], score:insightScore('drift', 0.5+(t-f)/16),
    facts:{name:d.name, up:up, fromPct:f, toPct:t},
    text:d.priceHeld
      ? (d.name+'’s ingredients cost $'+up.toFixed(2)+' more than in '+d.sinceLabel+' and its price hasn’t moved — '+f+'% to '+t+'%.')
      : (d.name+'’s ingredients cost $'+up.toFixed(2)+' more than in '+d.sinceLabel+' — at today’s price that lifts it from '+f+'% to '+t+'%.')}];
}

/* ============================ FAMILY 3 — category imbalance ============================
   Section averages. aggregation × comparison. Needs ≥2 sections of ≥2 plates and a ≥3-pt gap —
   below that there is no imbalance to report. v92: the `scope:'menu'` restriction is GONE (see
   scopeAllows) — it was the reason the strongest history-free family never showed at the default
   scope, which is exactly where the weak lines were filling the panel. */
function insCategory(dishes, targetFrac){
  var by={};
  dishes.forEach(function(d){
    if(!(d.cost>0)||!(d.menuPrice>0)) return; var s=(d.section||'').trim(); if(!s) return;
    (by[s]||(by[s]={sum:0,n:0})); by[s].sum+=d.cost/d.menuPrice; by[s].n++;
  });
  var cats=Object.keys(by).filter(function(s){ return by[s].n>=2; })
    .map(function(s){ return {name:s, pct:Math.round(by[s].sum/by[s].n*100)}; });
  if(cats.length<2) return [];
  cats.sort(function(a,b){ return a.pct-b.pct; });
  var lo=cats[0], hi=cats[cats.length-1]; if(hi.pct-lo.pct<3) return [];
  return [{kind:'category', dims:['aggregation','comparison'], score:insightScore('category', 0.5+(hi.pct-lo.pct)/20),
    facts:{loName:lo.name, loPct:lo.pct, hiName:hi.name, hiPct:hi.pct},
    text:'Your '+lo.name+' plates average '+lo.pct+'% food cost, '+hi.name+' sits at '+hi.pct+'%.'}];
}

/* ============================ FAMILY 4 — volatility ============================
   The widest-swinging plate, as a food-cost % band at today's price, and its standing.
   distribution × comparison. Needs a real logged range and a ≥4-pt swing. */
function insVolatility(dishes){
  var best=null, bestSwing=0;
  dishes.forEach(function(d){
    if(!d.hasRange || !(d.cost>0) || !(d.menuPrice>0)) return;
    var lo=Math.round(d.costMin/d.menuPrice*100), hi=Math.round(d.costMax/d.menuPrice*100);
    var swing=hi-lo; if(swing<4 || swing<=bestSwing) return;
    bestSwing=swing;
    best={kind:'volatility', dims:['distribution','comparison'], score:insightScore('volatility', 0.5+swing/24),
      facts:{name:d.name, loPct:lo, hiPct:hi},
      text:d.name+' swings '+lo+'–'+hi+'% with '+(d.volatileIng||'ingredient')+' prices — your least predictable plate.'};
  });
  return best?[best]:[];
}

/* ============================ FAMILY 5 — long-standing problem ============================
   Not a blip: over target through every cost change we have recorded. time × comparison.
   Needs ≥3 distinct months of cost points for that plate (see HISTORY DEPTH below) — under that
   "always" means "twice", which is not a run. The price-log clause is added only when proved. */
function insLongStanding(ls){
  if(!ls || !ls.name || !ls.sinceLabel || !(ls.months>=3)) return [];
  return [{kind:'longstanding', dims:['time','comparison'], score:insightScore('longstanding', 0.5+ls.months/16),
    facts:{name:ls.name, months:ls.months},
    text:ls.priceHeld
      ? (ls.name+' has been over target through every cost change since '+ls.sinceLabel+', with no price move — '+ls.months+' months.')
      : (ls.name+' has been over target through every cost change since '+ls.sinceLabel+' — '+ls.months+' months, not a one-off.')}];
}

/* ============================ FAMILY 6 — near-miss cluster ============================
   How many plates sit within half a point of target: a whole-dataset aggregate, so it clears
   Rule A on its own. Points at where the smallest movements matter, without prescribing one.
   v92 FRAMING (Max): this is an OPPORTUNITY, not a shortfall — these are the plates closest to
   the target of anything on the menu, which is a good position to be in, not a deficit. The copy
   says so, and the phrasing prompt is told not to invert it. Never "only N". */
function insNearCluster(dishes, targetFrac){
  var n=0;
  var named=[];
  dishes.forEach(function(d){
    if(!(d.cost>0)||!(d.menuPrice>0)) return;
    if(Math.abs(d.cost/d.menuPrice - targetFrac)*100 <= 0.5){ n++; if(d.name) named.push(d.name); }
  });
  if(n<2) return [];
  var tp=Math.round(targetFrac*100);
  // v93 (Max): NAME them. "2 plates" sends you hunting; "Barra & Chips and Cheeseburger" is the
  // insight. Beyond two the names stop being scannable, so the rest become a counted remainder —
  // `others` is in facts because it is a figure and the money law applies to every figure.
  // The old trailing "— the closest on your menu" was cut: it restated the first half in more words.
  // The remainder counts off `n`, NOT off the names we happen to have: a qualifying plate with a
  // blank name still sits in the cluster, and counting from named.length would print "A and B" over
  // a facts.count of 4. (CodeRabbit, v93.)
  var lead, extra=null, show=named.slice(0,2), rest=n-show.length;
  if(!named.length){ lead=n+' plates'; }                             // no names at all: fall back to the count
  else if(rest>0){ extra=rest; lead=show.join(', ')+' and '+rest+' other'+(rest===1?'':'s'); }
  else { lead=show.join(' and '); }
  var facts={count:n, targetPct:tp};
  if(extra!=null) facts.others=extra;
  return [{kind:'nearcluster', dims:['aggregation','distribution'], score:insightScore('nearcluster', 0.7+n*0.1),
    facts:facts,
    text:lead+' sit within half a point of your '+tp+'% target.'}];
}

/* ============================ FAMILY 7 — supplier concentration ============================
   How far ONE supplier reaches across the plate library, AND WHAT THAT EXPOSES YOU TO.
   breadth × aggregation × comparison. GLOBAL: a fact about the product list, not any one menu.
   BREADTH-based, never spend-based — "spend" would imply purchase volume the app does not have
   (Rule C).

   v92 (Max): "supplies 20 of 42 plates" is a BARE COUNT and must not emit. The reach only means
   something with its consequence attached, so the family now computes one deterministically: if
   that supplier's prices rose 10%, how many points would it add to the average food cost across
   the plates they touch? A conditional, clearly marked as one, in points — not money, which would
   need volume. Below CONC_MIN_PTS the answer is "not much", and the line stays silent.

   COVERAGE GATE, and it matters more than the thresholds: the supplier field is optional and
   mostly empty in real use (Max's own data: 8 of 44 used products carry one). Reach computed over
   a mostly-unlabelled product list measures WHICH SUPPLIER GOT TYPED IN, not procurement. Under
   CONC_MIN_COVERAGE the family cannot know what it would be claiming, so it says nothing. */
var CONC_MIN_PTS=0.5, CONC_MIN_COVERAGE=0.5;
function insConcentration(sup){
  if(!sup || !sup.name || !(sup.suppliers>=2)) return [];            // with one supplier the answer is trivially "all of them"
  if(!(sup.coverage>=CONC_MIN_COVERAGE)) return [];                  // the field is too empty for the number to mean anything
  if(!(sup.plates>=3) || !(sup.total>0) || sup.plates/sup.total < 0.40) return [];
  var pts=pts1(sup.ptsPer10||0); if(!(pts>=CONC_MIN_PTS)) return []; // reach without consequence is the bare count Max rejected
  return [{kind:'concentration', dims:['breadth','aggregation','comparison'], scope:'global',
    score:insightScore('concentration', 0.5+pts/2),
    facts:{plates:sup.plates, total:sup.total, rise:10, pts:pts},
    text:sup.name+' is in '+sup.plates+' of your '+sup.total+' costed plates — a 10% rise there would add '
      +pts+' pts to their average food cost.'}];
}

/* ============================ FAMILY 8 — price ANOMALY (was: price gap) ============================
   ONE product priced far above the next dearest thing you buy in the same unit. Reads as "check
   that's right", because most of the time it is a data-entry error — a pack price typed as a unit
   price, or a per-kg figure entered per-100g. distribution × comparison. GLOBAL.

   v92 (Max) — THE SPREAD VERSION WAS INVALID AND IS GONE. It compared products by CATEGORY, and a
   category here is a supplier catalogue heading, not a substitutability class: on Max's real data
   it fired "your 6 VEGETABLES products run $2.10–$13.33 per kg — a 6.3x spread", which is brown
   onions against spinach. Those are not alternatives and the spread between them means nothing.
   SMALLGOODS (bacon next to $0.30/kg items) is the same failure. No threshold fixes it, because
   the grouping itself was wrong.

   An anomaly test needs no substitutability claim: it says one number looks out of place next to
   every other number of the same kind, which is true regardless of what the products are. So the
   grouping is now BASE UNIT ONLY (never compare $/kg against $/unit) and the comparison is against
   the NEXT DEAREST, not the cheapest — being the dearest is unremarkable; being a multiple of the
   runner-up is not. Needs ≥4 in the unit group so "next dearest" means something, and ≥3x.
   Known limit: two similarly-priced outliers mask each other. Deliberate — a conservative test
   that stays quiet is the right trade for a line that says "this may be wrong". */
var ANOM_MIN_RATIO=3, ANOM_MIN_GROUP=4;
function insPriceAnomaly(an){
  if(!an || !an.name || !an.unit) return [];
  if(!(an.count>=ANOM_MIN_GROUP) || !(an.top>0) || !(an.next>0)) return [];
  var mult=Math.round(an.top/an.next*10)/10; if(!(mult>=ANOM_MIN_RATIO)) return [];
  return [{kind:'anomaly', dims:['distribution','comparison'], scope:'global',
    // the magnitude base is 0.6, not 0.5, so an anomaly at exactly ANOM_MIN_RATIO still clears
    // INSIGHT_FLOOR — a family's own gate and the floor must agree, or the gate quietly means
    // nothing and instances vanish between the two. (CodeRabbit, v92; pinned by the minimum-input
    // test in insights.test.js.)
    score:insightScore('anomaly', 0.6+(mult-ANOM_MIN_RATIO)/10),
    facts:{top:Math.round(an.top*100)/100, mult:mult},
    text:an.name+' at $'+an.top.toFixed(2)+'/'+an.unit+' is '+mult+'x your next dearest ingredient — worth checking that’s right.'}];
}

/* ===== KEPT from v75, re-declared against Rule A (each already combined two dimensions) ===== */

// Do many-ingredient plates cost a higher % than simpler ones? aggregation × comparison. Only when
// the pattern actually holds (both groups ≥2 plates, ≥COMPLEX_MIN_GAP). `minIng` is in facts so "6+"
// survives. v92: the gap gate went 3 → 5 pts. At 3 the candidate scored 42.6 against a floor of 45,
// so it passed its own gate and was then silently dropped — a family gate that admits instances the
// floor refuses is a gate that means nothing. 5 pts is also the honest bar: a 3-point difference
// between complex and simple plates is inside the noise of a café menu. (CodeRabbit, v92.)
var COMPLEX_MIN_GAP=5;
function insComplexity(dishes){
  var many={sum:0,n:0}, few={sum:0,n:0};
  dishes.forEach(function(d){
    if(!(d.cost>0)||!(d.menuPrice>0)||!(d.nIng>0)) return;
    var fc=d.cost/d.menuPrice; if(d.nIng>=6){ many.sum+=fc; many.n++; } else { few.sum+=fc; few.n++; }
  });
  if(many.n<2 || few.n<2) return [];
  var mp=Math.round(many.sum/many.n*100), fp=Math.round(few.sum/few.n*100), gap=mp-fp;
  if(gap<COMPLEX_MIN_GAP) return [];
  return [{kind:'complexity', dims:['aggregation','comparison'], score:insightScore('complexity', 0.5+gap/20),
    facts:{manyPct:mp, fewPct:fp, gap:gap, minIng:6},
    text:'Plates with 6+ ingredients average '+mp+'% food cost, simpler ones '+fp+'%.'}];
}

/* v92 REMOVED — three families that could not clear INSIGHT_FLOOR at ANY magnitude, i.e. they could
   only ever have displayed because nothing better fired. That is precisely what the floor exists to
   stop, so keeping them scored-but-unreachable would have been dead code pretending to be a feature:
   - insRecentChange: "N plates cost more now than at your last price update" — a bare count. It
     names nothing, so there is no thing to go and look at. Peak score 38 against a floor of 45.
   - insData: "N plates aren't costed yet" — a to-do, not an insight, and the Plates tab already
     shows it. Fails the so-what bar outright. Peak 31.
   - insBest: "X is your strongest margin" — the padding line by construction (its own v90 comment
     said "low score so it never crowds out a real problem"). Under a heading that reads "What needs
     attention" it is noise; the all-healthy line already carries the positive framing for a menu
     with nothing wrong. Peak 25.
   Their data plumbing (`recent`, `coverage`, `recentUp`, `uncosted`) went with them — no orphans.

   v90 REMOVED for failing Rule A or Rule C — recorded here so nobody re-adds them by accident:
   - insReprice / insCut / insSummary: status roll-ups. "X is over target" is what the red light and
     the Variance column already say; adding points or $/serve does not add a DIMENSION.
   - insSpread: the food-cost range across the menu — the light column shows it at a glance.
   - insSpend: "N% of your ingredient spend" implies purchase volume the app has never had (Rule C).
     Concentration is now breadth-based (insConcentration), exactly as the brief requires.
   - insAggregate: "$X per 100 serves above target" reads as money lost, which needs volume (Rule C).
   - insShared: bare breadth — literally the rejected "Eggs are in 8 plates". Replaced by
     insConcentration, which pairs breadth with a consequence.
   - insNearMiss: one plate 1 pt over. Replaced by insNearCluster, an aggregate.
   - insMover: folded into insCostBase, which adds the aggregate impact the bare move was missing.
   Their only helpers (CUT_PTS, dishDriver, driverClause, overServeFmt) went with them — no orphans. */

// Rank by VALUE, keep type VARIETY (≤1 per kind first), and ROTATE the near-top group by seed
// so equally-valuable insights take turns leading across renders/scope-switches. Pure + tested.
// v92: the FLOOR is applied here, before ranking — a candidate worth less than INSIGHT_FLOOR is
// dropped outright, not merely out-ranked, so it can never reach the panel on a quiet day.
function selectInsights(cands, seed, max){
  max=max||3; seed=seed||0;
  var sorted=(cands||[]).filter(function(c){ return c && c.score>=INSIGHT_FLOOR; })
    .map(function(c,i){ return {c:c,i:i}; })
    .sort(function(a,b){ return (b.c.score-a.c.score) || (a.i-b.i); })
    .map(function(x){ return x.c; });
  if(sorted.length>1){                                              // rotate only the near-top (similarly notable) group
    var BAND=12, top=sorted[0].score, g=0;
    while(g<sorted.length && sorted[g].score>=top-BAND) g++;
    if(g>1){ var off=((seed%g)+g)%g; sorted=sorted.slice(off,g).concat(sorted.slice(0,off)).concat(sorted.slice(g)); }
  }
  var out=[], kinds={};
  for(var i=0;i<sorted.length && out.length<max;i++){ var k=sorted[i].kind; if(kinds[k]) continue; kinds[k]=1; out.push(sorted[i]); }   // diverse pass: ≤1 per kind
  for(var j=0;j<sorted.length && out.length<max;j++){ if(out.indexOf(sorted[j])<0) out.push(sorted[j]); }                                // fill pass: only if still short
  return out;
}
/* ONE warm, genuine line for an all-healthy scope — varied by seed so it doesn't read as a fixed
   template. v91: reached ONLY when nothing is over target AND no family observed anything, so the
   copy now states BOTH halves. Until v91 it fired on target compliance alone while other families
   were still reporting movement underneath it — "nothing needs attention" printed directly above an
   insight saying costs were creeping up. Every number (the plate count, the target %) is in facts,
   so the phrasing layer's number check still passes. */
function healthyLine(total, tp, seed){
  var pool=[
    'Nothing needs attention right now — all '+total+' costed plate'+(total===1?'':'s')+' sit at or under your '+tp+'% target, and nothing else stands out.',
    'Everything’s in good shape — all '+total+' costed plate'+(total===1?'':'s')+' are holding at or under '+tp+'%, with nothing else worth flagging.',
    'All clear — your '+total+' costed plate'+(total===1?'':'s')+' are at or under the '+tp+'% target and nothing else is out of line.',
    'A healthy read — nothing sits over your '+tp+'% target across '+total+' costed plate'+(total===1?'':'s')+', and no other pattern stands out.'
  ];
  var i=((seed%pool.length)+pool.length)%pool.length;
  return {kind:'allgood', facts:{total:total, targetPct:tp}, text:pool[i]};
}
/* PURE orchestrator (tests pin it). data = {dishes, isAll, movement, drift, longStanding, supplier,
   priceGap, recent, coverage}; a bare array is treated as {dishes}. Returns the chosen insights as
   {kind, facts, text} (score, dims and scope stripped). The COUNT scales with menu size and NOTHING is
   ever padded to the cap — selectInsights only returns real candidates, so fewer is correct when there
   is genuinely less to say.

   v91 ROOT CAUSE — the over-target check was a GATE, not a ranking input. v90 split the families into
   two lists and picked the list by `over`: with nothing over target it dropped drift entirely and
   prepended the all-healthy line unconditionally, spending one of the (already small) slots on it. So a
   scope with real movement to report could print "nothing needs attention" above the movement itself,
   and a plate that drifted 20%→27% under a 30% target was never reportable at all — being under target
   is not the same as not having moved. Now EVERY family is evaluated on EVERY render and `over` is used
   for exactly one thing: deciding whether the all-healthy line may fire when nothing was observed.
   A family that can't compute returns [] and blocks nothing — that has always been true per family and
   is now true of the orchestrator too. */
function deriveInsights(data, targetFrac, seed){
  if(Array.isArray(data)) data={dishes:data};
  data=data||{};
  var dishes=Array.isArray(data.dishes)?data.dishes:[];
  var isAll=!!data.isAll;
  if(!(targetFrac>0)) return [];
  var costed=dishes.filter(function(d){ return d && d.cost>0 && d.menuPrice>0; });   // published + costed only
  if(!costed.length) return [];                                     // nothing useful to say → the block hides
  var n=costed.length;
  var max = n>=30?5 : n>=16?4 : n>=6?3 : n>=2?2 : 1;                // 1→1, 2–5→2, 6–15→3, 16–29→4, 30+→5
  var over=costed.filter(function(d){ return Math.round((d.cost/d.menuPrice-targetFrac)*100)>=1; }).length;
  // v92: the FLOOR joins Rule A and the scope gate as a per-candidate admission test. Rule A asks
  // "is this the right SHAPE"; the floor asks "is this worth the owner's attention at all".
  var pass=function(c){ return c && ruleA(c) && scopeAllows(c, isAll) && c.score>=INSIGHT_FLOOR; };
  // EVERY family, EVERY render (Rule D). Ordered by how much a tie should favour them (selectInsights
  // breaks equal scores by position). Anything without the history to compute returns [] on its own
  // terms; anything not worth saying is dropped by the floor rather than ranked and shown anyway.
  var observed=[]
    .concat(insLongStanding(data.longStanding||null))               // a standing problem outranks a new one
    .concat(insDrift(data.drift||null))                             // this plate moved, and by how much
    .concat(insCostBase(data.movement||null))                       // the cost base moved, culprit named
    .concat(insCategory(costed, targetFrac))
    .concat(insVolatility(costed))
    .concat(insNearCluster(costed, targetFrac))
    .concat(insConcentration(data.supplier||null))
    .concat(insPriceAnomaly(data.anomaly||null))
    .concat(insComplexity(costed))
    .filter(pass);
  if(!observed.length){
    // Genuinely nothing worth saying. The warm line may claim "all clear" only when nothing is over
    // target either; over target with no family able to speak stays silent rather than reassuring
    // wrongly. v92: "nothing cleared the floor" counts as nothing to say — that is the point of it.
    return over ? [] : [healthyLine(costed.length, Math.round(targetFrac*100), seed||0)];
  }
  return selectInsights(observed, seed||0, max)
    .map(function(c){ return {kind:c.kind, facts:c.facts, text:c.text}; });
}
/* Impure wrapper: build the data bundle for the DASHBOARD's current scope and derive. Every number comes
   from something the app already computes — live plate costs, the per-ingredient price log (ingPriceLog),
   the v90 sell-price log (menuPriceLog), the product list. Nothing here is estimated or extrapolated. */
var gemInsightPhrased=null;                                         // in-render guard: {key, lines:[text], refined} (key = scope|sig)
/* v69 (Max): insights + their Gemini phrasing are CACHED per scope for a PERIOD, then rotate. This (a) saves
   the limited Gemini quota — no re-call on every reload/session within the period — and (b) refreshes what the
   user sees afterwards. The period index also seeds the selection (varied per scope), so each new period leads
   with a different insight. A price change mid-period changes the sig → a fresh call (the insight genuinely
   changed); otherwise one call per scope per period. */
var INSIGHT_PERIOD_MS=24*60*60*1000;                               // one day
function insightPeriod(){ return Math.floor(Date.now()/INSIGHT_PERIOD_MS); }
function menuSeedHash(id){ var h=0, s=String(id||''); for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return h; }
function insightSeedFor(scopeKey){ return (insightPeriod()+menuSeedHash(scopeKey))|0; }   // stable within a period (so it caches), rotates across periods, varies per scope
/* ---- v90: reading the past honestly ----
   Every "since June" figure below is computed against ONE reference moment, not against a basket of
   each ingredient's own last change. `ingPriceAt` returns the price actually in force at that moment;
   a plate takes part only when EVERY one of its priced lines has a logged price reaching back that far
   (`costAtLines(...).complete`). A partial reconstruction would be a number the app can't stand behind,
   so the plate is skipped instead. This is what lets the copy name a month at all. */
function ingPriceAt(pid, ms){
  var a=(pid!=null)?ingPriceLog[pid]:null; if(!a || !a.length) return null;
  var out=null;
  for(var i=0;i<a.length;i++){ if(ptMs(a[i])<=ms) out=a[i].v; else break; }
  return out;
}
/* A plate's cost at the prices in force at `ms`. complete=false when any priced line's log doesn't
   reach back that far — the caller must then skip this plate rather than mix eras.
   `priced` counts the lines that came from the LOG. It is not the same question as completeness: a
   plate built entirely from misc cost lines reconstructs perfectly at every moment (its cost is a
   fixed number) and would otherwise look like a plate whose cost had been observed and never moved.
   Reading a run out of that is inventing history — "over target through every cost change" when
   there were no recorded cost changes at all. So callers require priced > 0 as well. */
function costAtLines(lines, ms){
  var sum=0, complete=true, priced=0;
  (lines||[]).forEach(function(l){
    if(!l) return;
    if(l.misc){ sum+=Number(l.cost)||0; return; }                    // misc rides along at its fixed cost (no price history)
    var p=lineProduct(l); if(!p){ complete=false; return; }
    var pid=l.kid?(kById[l.kid]&&kById[l.kid].pid):l.pid;
    var v=ingPriceAt(pid, ms);
    if(v==null){ complete=false; return; }
    sum+=v*(l.qty||0); priced++;
  });
  return {cost:sum, complete:complete, priced:priced};
}
/* the unit word that matches perDisplayValue's scaling — g is shown per kg, ml per L, ea per unit.
   Anything else has no comparable display unit, so the price-gap family skips it. */
function unitWordFor(base){ return base==='g'?'kg':base==='ml'?'L':base==='ea'?'unit':''; }
/* v120: the What-moved row's time phrase. Deliberately vague-but-true — the log records WHEN a
   price changed and nothing about what caused it, so this never says "last invoice". */
function moverWhen(ms){
  if(ms==null || !isFinite(ms)) return 'recently';
  var d=new Date(ms), now=new Date();
  if(d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth()) return 'this month';
  return monthLabel(ms);
}
function monthLabel(ms){
  var d=new Date(ms), now=new Date();
  var opts=(now.getFullYear()===d.getFullYear())?{month:'long'}:{month:'long', year:'numeric'};
  try{ return new Intl.DateTimeFormat(undefined, opts).format(d); }catch(e){ return d.toDateString(); }
}
/* Which ingredient moved the average furthest over this window, and how far its reach goes.
   `ok` is [{d:{m,sp,cost,price}, then}] — the plates that reconstruct completely at `ms`. Split out of
   computeInsights so it can be tested directly: it produces two numbers that go straight into
   user-facing copy ("Beef, up 18% across 5 plates"), and the money law makes both worth pinning. */
function movementCulprit(ok, ms){
  var byPid={}, n=(ok&&ok.length)||0;
  if(!n) return null;
  ok.forEach(function(x){
    (x.d.sp.lines||[]).forEach(function(l){
      if(!l || l.misc) return;
      var p=lineProduct(l); if(!p) return;
      var pid=l.kid?(kById[l.kid]&&kById[l.kid].pid):l.pid; if(pid==null) return;
      var was=ingPriceAt(pid, ms), isNow=cpbu(p);
      if(was==null || isNow==null || !(was>0)) return;
      var e=byPid[pid]||(byPid[pid]={pts:0, plates:0, seen:{}, was:was, now:isNow,
        name:(l.kid?((kById[l.kid]&&kById[l.kid].name)||p.description):p.description)});
      e.pts+=(isNow-was)*(l.qty||0)/x.d.price/n*100;                // EVERY line contributes cost…
      if(!e.seen[x.d.m.id]){ e.seen[x.d.m.id]=1; e.plates++; }      // …but "across N plates" counts PLATES, not
    });                                                            //    lines: one ingredient twice on one plate
  });                                                              //    is still one plate.
  var top=null;
  Object.keys(byPid).forEach(function(pid){ var e=byPid[pid]; if(!top || Math.abs(e.pts)>Math.abs(top.pts)) top=e; });
  return top;
}
var INSIGHT_WINDOWS=[30,60,90,180];                                  // days back to try for a comparable reference moment
/* Build the data bundle for ONE dashboard scope and derive. scope===DASH_ALL covers every menu;
   any other value is a menu id. v90: this is the DASHBOARD's scope (dashScope), NOT currentMenuId —
   the Menu tab's own persisted selection is untouched by anything on this screen. */
function computeInsights(scope, seed){
  scope=(scope==null)?DASH_ALL:scope;
  var isAll=(scope===DASH_ALL);
  var dishes=[], now=Date.now();
  var inScope=[];                                                    // {m, sp, cost, price} for the reconstruction passes
  try{
    (typeof MENU!=='undefined'?MENU:[]).forEach(function(m){
      if(!m || !(m.price>0)) return;
      if(!isAll && (m.menuId||'MENU_ORIGINAL')!==scope) return;
      var sp=plateForMenuItem(m);
      var cost=sp?costFromLines(sp.lines):0;
      if(!sp || !(cost>0)) return;                                   // a priced dish with no plate / no cost has no margin read
      var range=costRangeForLines(sp.lines);
      var volName=null, volSpread=0, seen={};
      (sp.lines||[]).forEach(function(l){
        if(!l || l.misc) return;
        var p=lineProduct(l); if(!p) return;
        var pid=l.kid?(kById[l.kid]&&kById[l.kid].pid):l.pid;
        var nm=l.kid?((kById[l.kid]&&kById[l.kid].name)||p.description):p.description;
        if(nm && !seen[nm]) seen[nm]=1;
        if(pid){
          var band=ingPriceBand(pid); if(band){ var s=(band.max-band.min)*(l.qty||0); if(s>volSpread){ volSpread=s; volName=nm; } }
        }
      });
      dishes.push({name:m.name, cost:cost, menuPrice:m.price, section:m.section||'', nIng:Object.keys(seen).length,
        costMin:range.min, costMax:range.max, hasRange:range.hasRange, volatileIng:volName});
      inScope.push({m:m, sp:sp, cost:cost, price:m.price});
    });
  }catch(e){ return []; }

  var movement=null, drift=null, longStanding=null;
  try{
    // FAMILY 1 + 2 — pick the most RECENT window that enough plates can be reconstructed at, so the
    // comparison is as current as the data honestly allows.
    for(var w=0; w<INSIGHT_WINDOWS.length && !movement; w++){
      var ms=now-INSIGHT_WINDOWS[w]*86400000, ok=[];
      inScope.forEach(function(d){
        var then=costAtLines(d.sp.lines, ms);
        if(then.complete && then.priced>0 && then.cost>0) ok.push({d:d, then:then.cost});
      });
      if(ok.length<2) continue;
      var sumNow=0, sumThen=0;
      ok.forEach(function(x){ sumNow+=x.d.cost/x.d.price; sumThen+=x.then/x.d.price; });
      var pts=(sumNow-sumThen)/ok.length*100;
      var top=movementCulprit(ok, ms);
      if(top && Math.abs(pts)>=0.3){
        movement={pts:pts, name:top.name, ingPct:(top.now-top.was)/top.was*100, plates:top.plates, sinceLabel:monthLabel(ms)};
      }
      // FAMILY 2 — the single plate whose food cost % moved furthest over the same window
      var worst=null;
      ok.forEach(function(x){
        var fromPct=x.then/x.d.price*100, toPct=x.d.cost/x.d.price*100;
        if(!worst || (toPct-fromPct)>(worst.toPct-worst.fromPct)) worst={name:x.d.m.name, id:x.d.m.id, up:x.d.cost-x.then, fromPct:fromPct, toPct:toPct};
      });
      // Keep the FIRST (most recent) window's drift. The loop only continues while `movement` is still
      // unset, so without this guard a scope that produced drift at 30 days but no movement would have
      // that drift silently replaced by the 60- then 90-day version — the sentence would name a
      // different era depending on whether an unrelated family happened to fire. (CodeRabbit, v90.)
      if(worst && !drift) drift={name:worst.name, up:worst.up, fromPct:worst.fromPct, toPct:worst.toPct,
        sinceLabel:monthLabel(ms), priceHeld:priceHeldSince(worst.id, ms)};
    }
    // FAMILY 5 — over target through EVERY reconstructable month, walking back until the log runs out.
    // Requires ≥3 months (insLongStanding enforces it): under that, "always" means "twice".
    var tf=foodTarget(), bestRun=null;
    inScope.forEach(function(d){
      if(!(d.cost/d.price > tf)) return;                             // must be over target NOW to have a run at all
      var months=0, oldest=null;
      for(var k=1; k<=12; k++){
        var mms=now-k*30*86400000, c=costAtLines(d.sp.lines, mms);
        if(!c.complete || !(c.priced>0) || !(c.cost>0)) break;   // no LOGGED cost behind it → no run to report
        if(!(c.cost/d.price > tf)) break;                            // a month under target ends the run
        months=k; oldest=mms;
      }
      if(months>=3 && (!bestRun || months>bestRun.months)){
        bestRun={name:d.m.name, months:months, sinceLabel:monthLabel(oldest), priceHeld:priceHeldSince(d.m.id, oldest)};
      }
    });
    longStanding=bestRun;
  }catch(e){}

  // FAMILY 7 + 8 — GLOBAL facts about the product list, computed over the whole plate library rather
  // than one menu. deriveInsights suppresses them at menu scope, so they cost nothing there.
  var supplier=null, anomaly=null;
  try{
    // ---- FAMILY 7: reach, its CONSEQUENCE, and how much of the supplier field is even filled in ----
    // The consequence is a plain arithmetic what-if on data the app already holds: raise this
    // supplier's lines by CONC_RISE and see what it does to the average food cost across the plates
    // they touch. Averaged over ALL costed plates in the library, so it reads as an effect on the
    // business, not on a hand-picked subset.
    var CONC_RISE=0.10;
    var platesBySup={}, sups={}, totalPlates=0, ptsBySup={};   // one population: priced plates only
    var priceByPlate={};                                             // plate id → a sell price, resolved ONCE
    (typeof MENU!=='undefined'?MENU:[]).forEach(function(m){
      if(!m || !(m.price>0)) return;
      var id=plateIdOf(m); if(id!=null && priceByPlate[id]==null) priceByPlate[id]=m.price;
    });
    (typeof savedPlates!=='undefined'?savedPlates:[]).forEach(function(sp){
      var mine={}, any=false, exposure={};
      (sp.lines||[]).forEach(function(l){
        if(!l || l.misc) return;
        var p=lineProduct(l); if(!p) return; any=true;
        var s=(p.supplier||'').trim(); if(!s) return;
        sups[s]=1; mine[s]=1;
        var lc=lineCost(p, l.qty); if(lc!=null) exposure[s]=(exposure[s]||0)+lc;
      });
      if(!any) return;
      // ONE population for all three figures. The what-if needs a sell price to express its effect in
      // POINTS, so unpriced plates can't take part — and if they can't take part in the consequence
      // they must not swell the reach denominator either, or "11 of 14" and the points figure would
      // describe different sets of plates while sitting in the same sentence. (CodeRabbit, v92.)
      // A plate on two menus contributes once, at the first price found: the figure is about the
      // plate's cost exposure, and counting it twice would weight it by how often it was published.
      var price=priceByPlate[sp.id];
      if(!(price>0)) return;
      totalPlates++;
      Object.keys(mine).forEach(function(s){ platesBySup[s]=(platesBySup[s]||0)+1; });
      Object.keys(exposure).forEach(function(s){ ptsBySup[s]=(ptsBySup[s]||0)+(exposure[s]*CONC_RISE)/price*100; });
    });
    var topSup=null;
    Object.keys(platesBySup).forEach(function(s){ if(!topSup || platesBySup[s]>platesBySup[topSup]) topSup=s; });
    // COVERAGE: what share of the products actually used in plates carry a supplier at all. Without
    // this the reach figure silently measures data entry (see insConcentration).
    var usedPids={};
    (typeof savedPlates!=='undefined'?savedPlates:[]).forEach(function(sp){ (sp.lines||[]).forEach(function(l){
      if(!l||l.misc) return; if(l.kid){ var k=kById[l.kid]; if(k&&k.pid!=null) usedPids[k.pid]=true; } else if(l.pid!=null) usedPids[l.pid]=true; }); });
    var usedIds=Object.keys(usedPids), withSup=0;
    usedIds.forEach(function(id){ var p=byId[id]; if(p && (p.supplier||'').trim()) withSup++; });
    if(topSup) supplier={name:topSup, plates:platesBySup[topSup], total:totalPlates,
      suppliers:Object.keys(sups).length, coverage:(usedIds.length?withSup/usedIds.length:0),
      ptsPer10:(totalPlates?(ptsBySup[topSup]||0)/totalPlates:0)};

    // ---- FAMILY 8: the price ANOMALY. Grouped by BASE UNIT ONLY — never by category, which is a
    // supplier catalogue heading and not a substitutability class (v92; see insPriceAnomaly).
    var byUnit={};
    (typeof PRODUCTS!=='undefined'?PRODUCTS:[]).forEach(function(p){
      if(!usedPids[p.id]) return;
      var w=unitWordFor(p.base_unit); if(!w) return;
      var v=perDisplayValue(p); if(v==null || !(v>0)) return;
      (byUnit[p.base_unit]||(byUnit[p.base_unit]={unit:w, rows:[]})).rows.push({v:v, name:p.description});
    });
    var bestAnom=null;
    Object.keys(byUnit).forEach(function(k){
      var g=byUnit[k]; if(g.rows.length<ANOM_MIN_GROUP) return;
      g.rows.sort(function(a,b){ return b.v-a.v; });
      var top=g.rows[0], next=g.rows[1];
      if(!(next.v>0)) return;
      var ratio=top.v/next.v;
      if(!bestAnom || ratio>bestAnom.ratio) bestAnom={name:top.name, unit:g.unit, top:top.v, next:next.v, count:g.rows.length, ratio:ratio};
    });
    anomaly=bestAnom;
  }catch(e){}

  return deriveInsights({dishes:dishes, isAll:isAll, movement:movement, drift:drift, longStanding:longStanding,
    supplier:supplier, anomaly:anomaly},
    foodTarget(), (seed==null?insightSeedFor(scope):seed));
}
function insightSig(insights){ return insights.map(function(x){ return x.text; }).join('|'); }
/* Client re-check: the returned phrasing must not contain any number that isn't in the facts
   (defence-in-depth — the server validates too). Rejecting extra numbers is what stops the AI
   from ever presenting a figure the app didn't compute. */
function gemPhrasingOk(text, facts){
  var t=(text==null?'':String(text)).trim(); if(!t || t.length>240) return false;
  var words=t.match(/\S+/g); if(words && words.length>24) return false;   // v74: same ~24-word scannability cap as the server (_insight.js)
  if(/[.!?]\s+\S/.test(t)) return false;                                  // v74: one sentence only (mirrors _insight.js)
  var allowed=[]; for(var k in facts){ if(typeof facts[k]==='number') allowed.push(facts[k]); }
  var re=/-?\d+(?:\.\d+)?/g, m;
  while((m=re.exec(t))){
    var v=parseFloat(m[0]), ok=false;
    for(var j=0;j<allowed.length;j++){ if(Math.abs(v-allowed[j])<0.005){ ok=true; break; } }
    if(!ok) return false;
  }
  return true;
}
/* v69: the per-scope, per-period phrasing cache (localStorage). Only SUCCESSFUL phrasings are stored, so
   offline/unavailable never poisons it; stale periods are pruned on write. */
function insightCacheRead(){ try{ return JSON.parse(localStorage.getItem('cafeDB_insightCache')||'{}')||{}; }catch(e){ return {}; } }
function insightCacheWrite(c){ try{ localStorage.setItem('cafeDB_insightCache', JSON.stringify(c)); }catch(e){} }
/* Optional warmer phrasing (degrades to templates). ONE background POST per scope per PERIOD (v69) — a
   cached phrasing for this scope+period+sig is reused with NO new call (saving the limited Gemini quota);
   offline / unavailable / invalid → the deterministic templates stand. Never blocks the render — it swaps
   text in place only if the Dashboard is still showing this set (applyPhrasedInsights checks the sig). */
function gemPhraseInsights(insights, scopeKey){
  if(!insights || !insights.length) return;
  var sig=insightSig(insights), period=insightPeriod(), mk=scopeKey||'', key=mk+'|'+sig;
  // 1) persistent cache hit: same scope + period + sig → reuse the stored phrasing, no API call
  var cache=insightCacheRead(), ce=cache[mk];
  if(ce && ce.period===period && ce.sig===sig && Array.isArray(ce.lines)){
    gemInsightPhrased={key:key, lines:ce.lines, refined:!!ce.refined};
    applyPhrasedInsights(ce.lines, insights, !!ce.refined); return;
  }
  // 2) in-session guard: don't fire a duplicate fetch before the cache write lands. v90 makes this
  //    guard IN-FLIGHT as well as post-hoc. On the Menu tab this fn ran about once per menu switch, so
  //    claiming the key only on success was enough. The Dashboard re-renders far more often — every
  //    scope change, and every drill-down open or back — and each of those re-renders fired a SECOND
  //    identical POST while the first was still in the air, burning the limited free-tier quota for a
  //    phrasing already on its way. Claim the key BEFORE the fetch; release it if the call fails so a
  //    later render can genuinely retry.
  if(gemInsightPhrased && gemInsightPhrased.key===key){
    if(gemInsightPhrased.inflight) return;                          // a call for this exact set is already out
    applyPhrasedInsights(gemInsightPhrased.lines, insights, gemInsightPhrased.refined); return;
  }
  if(typeof fetch!=='function') return;
  gemInsightPhrased={key:key, lines:null, refined:false, inflight:true};
  var release=function(){ if(gemInsightPhrased && gemInsightPhrased.key===key && gemInsightPhrased.inflight) gemInsightPhrased=null; };
  var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
  var timer=setTimeout(function(){ if(ctrl) ctrl.abort(); },20000);
  fetch('/api/insight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({insights:insights.map(function(x){return {facts:x.facts, text:x.text};})}),signal:ctrl?ctrl.signal:undefined})
    .then(function(res){ return res.ok?res.json():null; })
    .then(function(payload){
      clearTimeout(timer);
      if(!payload || payload.status!=='ok' || !Array.isArray(payload.lines)){ release(); return; }   // invalid → don't cache, retry next render
      var refined=false;                                             // v68: true only if ≥1 shown line is actually Gemini's phrasing (drives the honest credit)
      var lines=insights.map(function(ins,ix){                       // per line: accept the phrasing only if it passes the number check, else keep the template
        var cand=payload.lines[ix] && payload.lines[ix].text;
        if(cand && gemPhrasingOk(cand, ins.facts)){ refined=true; return String(cand).trim(); }
        return ins.text;
      });
      gemInsightPhrased={key:key, lines:lines, refined:refined};
      var c2=insightCacheRead();                                     // persist so reloads within this period don't re-hit Gemini
      c2[mk]={period:period, sig:sig, lines:lines, refined:refined};
      Object.keys(c2).forEach(function(k){ if(!c2[k] || c2[k].period<period-1) delete c2[k]; });   // prune stale periods
      insightCacheWrite(c2);
      applyPhrasedInsights(lines, insights, refined, true);         // v115: the network path is the only one that lands AFTER paint — it alone animates
    })
    .catch(function(){ clearTimeout(timer); release(); });          // any failure → templates already shown; free the key so a later render may retry
}
/* v115 — the swap reads as COMPLETION, not replacement. Three mechanisms made it flash: the
   post-paint textContent rewrite, the credit line appearing (a whole new line box shifted the
   panel and every panel below it), and the resulting grid reflow. The credit's space is now
   RESERVED in CSS (visibility, the .scope-note precedent), and the network path alone fades its
   rewritten lines in (`animate` — the cache/session paths run synchronously before paint, where a
   fade would just make every dashboard render blink). The local pass still renders first and
   unchanged: it is the offline/failure state, and its content is correct — only its transition
   was the glitch. */
function applyPhrasedInsights(lines, insights, refined, animate){
  try{
    var host=document.getElementById('dashInsBody'); if(!host) return;
    if(insightSig(insights)!==host.getAttribute('data-sig')) return;   // the scope moved on → don't overwrite
    lines.forEach(function(t,ix){
      var el=host.querySelector('.ins-line[data-ix="'+ix+'"]'); if(!el) return;
      if(animate && el.textContent!==t){ el.classList.remove('ins-swap'); void el.offsetWidth; el.classList.add('ins-swap'); }
      el.textContent=t;
    });
    // v68: reveal the credit ONLY when Gemini truly phrased a shown line.
    // F6 (v143): the credit sits in the section's HEADER BAND now (the mock's placement), which is
    // outside #dashInsBody — so it is looked up from the section, not from the line host. Left
    // querying `host` this would silently find nothing and the credit would never appear, with
    // every test still green.
    if(refined){ var panel=document.getElementById('dashInsPanel')||host;
      var c=panel.querySelector('.ins-credit'); if(c){ c.hidden=false; if(animate) c.classList.add('ins-swap'); } }
  }catch(e){}
}
/* ===== v90: insights live on the DASHBOARD, inline ==========================================
   They moved OFF the Menu tab entirely: the rainbow FAB, its panel, the swipe-dismiss and the
   show/hide logic are all deleted (26 Jul audit — ten versions on one control, and .msug-panel was
   one of the five independent owners of floating-layer placement). This is deliberately NOT a new
   floating layer: it is an ordinary .panel in the dashboard grid, so there is nothing to place.

   SCOPE: the block follows dashScope, the Dashboard's own selector — with a menu chosen the lines
   are about that menu; on "All menus" they are cross-menu. Types that only make sense at one scope
   are suppressed by deriveInsights rather than forced (see scopeAllows).

   THE AI MARKER, in two parts, and they mean different things:
   - The gradient SPARKLE always shows. The feature is AI-assisted whether or not the API answered,
     and this is now the app's only Gemini identity marker. Its gradient is defined once in
     index.html (#ezSparkGrad), not here — this markup is re-rendered on every scope change.
   - The CREDIT ("Phrased by Gemini, computed by EzPlate" since v133) shows only when Gemini actually phrased a line that is on
     screen. Templates rendering (API off, unavailable, or the toggle disabled) → no credit,
     because nothing was refined. applyPhrasedInsights is the only thing that reveals it.

   No empty state here, by design: when there is nothing to say the panel is absent, exactly as the
   By-menu panel is absent below two costed menus. The verdict header directly above already
   explains a scope with nothing costed, and a second empty state saying the same thing is noise on
   a phone. The drill-downs below DO need one, and use the shared helper. */
var DASH_INS_SPARK='<svg class="ins-spark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="url(#ezSparkGrad)" d="M12 2.2l2.3 6.4 6.4 2.3-6.4 2.3L12 19.6l-2.3-6.4L3.3 10.9l6.4-2.3z"/></svg>';
var dashInsPending=null;                                             // {insights, scope} handed to gemPhraseInsights once the markup is in the DOM
function dashInsightsHtml(scope){
  dashInsPending=null;
  if(!aiSuggestions) return '';                                      // v81: AI suggestions OFF — nothing computed, nothing rendered
  var insights=[]; try{ insights=computeInsights(scope); }catch(e){ insights=[]; }
  if(!insights.length) return '';
  dashInsPending={insights:insights, scope:scope};
  var sig=insightSig(insights);
  /* F6 (v143): the mock's §3.1 "Needs attention" section — bordered container, tinted header band,
     hairline-divided rows. The heading takes the mock's wording ("Needs attention"); the sparkle
     stays, because it is this app's only Gemini identity marker and the mock has no equivalent.
     R1 — the CREDIT moves into the header band, where the mock draws it. The REVEAL LAW is
     untouched: it is still `hidden` until applyPhrasedInsights proves Gemini phrased a line that is
     on screen. ⚠ Because it now sits OUTSIDE #dashInsBody, applyPhrasedInsights looks it up from
     the section (#dashInsPanel) instead — moving it without that change reveals nothing, silently.
     R4 — the mock's rows are a bold lead + plain body + ONE link each, and this app has none of the
     three: an insight is ONE deterministic sentence with no navigation target, and
     applyPhrasedInsights replaces `textContent` WHOLESALE, so a lead/body split could not survive
     the Gemini swap that is the whole point of the panel. Rows are single paragraphs in the mock's
     row chrome. A link would need a per-insight subject the engine does not compute; that is a
     behaviour spec, not a restyle. */
  return '<section class="dash-sec dash-ins" id="dashInsPanel">'
    +'<div class="ds-head"><h2>'+DASH_INS_SPARK+'Needs attention</h2><span class="ds-gap"></span>'
    +'<span class="ins-credit" hidden translate="no">Phrased by Gemini, computed by EzPlate</span></div>'
    // aria-live: the templates render first and the Gemini phrasing swaps in afterwards, so the text
    // under a screen-reader user's cursor genuinely changes after load. Polite, because none of it is
    // urgent. A full re-render replaces the region rather than mutating it, so scope changes don't
    // announce — only the phrasing swap does, which is the change worth hearing about.
    +'<div class="ins-body" id="dashInsBody" aria-live="polite" data-sig="'+esc(sig)+'">'
    +insights.map(function(ins,ix){ return '<p class="ins-line" data-ix="'+ix+'">'+esc(ins.text)+'</p>'; }).join('')
    +'</div></section>';
}
/* ===== v89: the verdict header, the menu selector and the By-menu list =====
   The Dashboard is the manager's surface — "am I OK?" — where every other tab serves the chef
   building things. These three pieces answer it for a chosen scope. */
function fmtTargetPct(){ return (cogsPct%1?cogsPct.toFixed(1):cogsPct.toFixed(0))+'%'; }
/* v115: scopeTrend AND scopeHistory (its only feeder) are DELETED, not hidden (tombstone so the
   names stay greppable). scopeTrend coloured a
   direction verdict — "↑ creeping up" in red — onto the headline, which is the same failure the
   chart's direction-colouring had: rising is the ordinary state of ingredient prices, so the clause
   reported failure during normal trading. Position-vs-target lives in the verdict number and the
   anchor line; drift is carried by the since-line (sinceLineHtml), which is neutral about the fix. */
/* v97: .verdict-cap is GONE — the scope now lives in this card's heading (see renderDashboard), stated once.
   dashScopeLabel itself stays: the Dig-in cards still subtitle themselves with it, and they are a separate
   panel from the card that owns the number and the chart.
   Also v97: cmp.current no longer falls back to the last logged history point, so `pct==null` — and the copy
   below — is reachable again at all-menus scope. That branch had been dead since v89 for that reason. */
/* F6 (v143): this is the MOBILE MOCK's §6 hero — muted label, 44px mono figure, one-sentence
   context — and it is the whole verdict on a phone. At >=1024 the KPI strip states the same figure
   in its first cell, so CSS hides the hero there (the .has-kpis mechanism v133 built); the strip is
   '' whenever nothing is costed and priced, which is what keeps the PATH CARD below visible at every
   width. Both halves live in this one function so the two states cannot render at once.
   R2 — NO DELTA PILL, though the mock draws one beside the number: "vs last month" is the stat class
   Max deleted in v98 and DECIDED AGAINST AGAIN on 9 Aug 2026 (answers Q1, "the chart is the one trend
   surface", closed without building, do not re-propose). The movement lives in the since-line
   underneath, which is honest about which series it read. */
function verdictHtml(scope, cmp){
  var pct=(scope===DASH_ALL)?cmp.current:avgFoodCostForScope(scope);
  /* §5's first-run/empty state, and it is DERIVED — no stored flag, no onboarding step: the screen
     is empty exactly while nothing is costed and priced, and fills itself the moment one plate is.
     The composed card the state spec asks for (bold one-liner, how, one primary CTA) replaces the
     hero rather than sitting under a "—", which is what shipped before and told a new café nothing
     it could act on. The CTA opens the builder — the same openBuilderNew every "New plate" runs, so
     there is one label for one intent (§7). */
  if(pct==null){
    var onMenu=(scope!==DASH_ALL);
    return '<div class="dash-path">'
      +'<p class="dp-lead">Cost your first plate</p>'
      +'<p class="dp-body">Nothing is costed and priced '+(onMenu?'on this menu ':'')+'yet. '
      +'Build a plate from your ingredients, put it on a menu with a sell price, and this screen '
      +'starts tracking your food cost against your '+fmtTargetPct()+' target.</p>'
      +'<button type="button" class="btn primary" id="dashPathCta">New plate</button>'
      +'</div>';
  }
  var d=pct-cogsPct, cls=(d<=0.05)?'good':'bad';
  var vs=(Math.abs(d)<0.05)
    ? ('bang on your '+fmtTargetPct()+' target')
    : (Math.abs(d).toFixed(1)+' pts '+(d<0?'under':'over')+' your '+fmtTargetPct()+' target');
  // v115: the direction clause (scopeTrend) is gone — see the tombstone above scopeHistory.
  /* The label is "Average food cost" and NOT "Average food cost, all menus", which is what the
     mobile mock prints. The mock's phone header carries no scope control at all — its hero label is
     the only thing that can state the scope. This app's header carries the control at BOTH widths,
     and the desktop mock's own KPI label is a bare "Avg food cost" for exactly that reason. So the
     mock is being followed, not deviated from: scope is stated by the control where a control
     exists. It is also v97's one-statement rule, which was paid for once already. */
  return '<div class="dash-hero">'
    +'<div class="dh-label">Average food cost</div>'
    +'<div class="dh-fig"><span class="dh-num '+cls+'">'+pct.toFixed(1)+'%</span></div>'
    +'<p class="dh-ctx">'+esc(vs)+'</p></div>';
}
/* v96: dashScopeSelectorHtml is DELETED, not hidden. It was a native <select> in a .menu-picker-row
   that set dashScope — the same value the By-menu rows below it already set. The list is now the only
   control (see menuCompareHtml). .menu-picker-row itself stays: the Menu tab still uses it. */
/* v95: the By-menu sparkline from the approved mockup, drawn from that menu's OWN history
   (menuHistory, recording since v89). Display-only: nothing is computed that isn't already in
   the log, and a menu with fewer than two points gets NO sparkline rather than a fabricated
   shape (the v89 scope-honesty rule applied to a 54px line). Colour is the semantic pair the
   chart uses: cost falling = good. */
function mcmpSparkHtml(id){
  // v96: the All-menus row is a row like any other, so it draws like one — from priceHistory, which
  // is the all-menus average series (the same numbers the chart above already draws). Routed here
  // rather than at the call site so the row markup stays one code path for every scope.
  if(id===DASH_ALL) return mcmpSparkSeries((typeof priceHistory!=='undefined'&&priceHistory)||[]);
  return mcmpSparkSeries((typeof menuHistory!=='undefined'&&menuHistory&&menuHistory[id])||[]);
}
function mcmpSparkSeries(h){
  h=h||[];
  if(h.length<2) return '';
  var pts=h.slice(-12), vs=pts.map(function(p){return p.v;});
  var mn=Math.min.apply(null,vs), mx=Math.max.apply(null,vs);
  if(mx-mn<0.2){ var mid=(mn+mx)/2; mn=mid-0.1; mx=mid+0.1; }        // a flat series draws centred, not glued to an edge
  var W=54,H=16,P=2;
  var xy=pts.map(function(p,i){
    return (P+(W-2*P)*(i/(pts.length-1))).toFixed(1)+','+(P+(H-2*P)*(1-(p.v-mn)/(mx-mn))).toFixed(1);
  }).join(' ');
  // v115: colour anchored to TARGET, matching the chart above (was direction: fell = good). A menu
  // whose latest average sits at or under target is green however it got there — otherwise the
  // By-menu list contradicts the chart it sits beside.
  var cls=(vs[vs.length-1]<=cogsPct+0.05)?'good':'bad';
  return '<svg class="mcmp-spark '+cls+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" focusable="false">'
    +'<polyline points="'+xy+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
/* v96: this list IS the dashboard's menu selector — the picker chip that used to sit in the headline
   block is gone. Two controls setting one value, with no visible relationship between them, made the
   user work out that the chip drove three regions and the ranking drove nothing; merging them removes
   a control rather than adding one.

   "All menus" is therefore a ROW, not an implicit fallback — it was always a real selectable value
   (the picker's first <option>), and with the picker gone it needs a home or the scope becomes a
   one-way door. It leads the list and is NOT part of the ranking: it is the whole business, not a
   competitor to the menus under it.

   SELECTABLE SET, deliberately narrowed (Max, 29 Jul): menus with nothing costed were in the picker
   but have never been rows here — a menu with no costed plate has no cost efficiency to rank, and an
   empty row invites a comparison that isn't there. They are no longer reachable as a scope. Nothing
   is lost that could be shown: scoping to one only ever produced the "Nothing costed and priced on
   this menu yet" headline. */
/* v97: multiPublishedCount() lived here and drove a line explaining why All menus could sit outside the
   rows' range. That explanation only applied to the short-lived distinct-plate maths, which never
   shipped — with per-publication counting the headline is a weighted blend of the rows, so both the
   helper and the line are gone. Tombstone so the name stays greppable. */
/* v129 (Max, 9 Aug 2026): the v120 scope CHIPS are REVERSED — one dropdown button now, opening the
   ranked list. Still the SAME control the By-menu list has been since v96: the popover rows set
   dashScope through the same `.mcmp-row` + data-scope delegate. The chips' ≤5/6+ collapse rule and
   the promoted-worst-two are gone WITH the chips; the popover ranking stays worst-first, which is
   still Rule C's answer (no sales volume, so cost efficiency is the only honest ranking).

   The button carries the CURRENT scope's name and its food-cost %, coloured by the v115 rule the
   chart, sparklines and headline already share: at-or-under target = good, over = bad, anchored to
   the TARGET. The mock shows a third amber tier here; the dashboard's colour language is binary on
   purpose and one control does not fork it.

   The popover leads with a selectable All-menus ROW (it was a chip; the scope still needs a way
   back), then the ranked menus. The honesty note lives INSIDE the popover now — the ranking it
   qualifies is entirely behind the button, so the note belongs where the ranking is, not floating
   beside a button that ranks nothing. */
var dashMenusOpen=false;                                             // view state only, not persisted — a dropdown, not a preference
function setDashMenusOpen(v){ dashMenusOpen=!!v; renderDashboard(); }
/* v129 review: the dropdown dismisses like the app's other floating layers (the product search
   drop has the same pair) — outside click and Escape. Both gate on dashMenusOpen so they are
   inert whenever the layer is closed. The button's own click never lands here as "outside":
   its wrap still ancestors the (by then detached) target, so closest() finds it either way.
   Esc returns focus to the button — the control the popover belongs to. */
document.addEventListener('click', function(e){
  if(dashMenusOpen && !(e.target.closest && e.target.closest('.dash-scope-wrap'))) setDashMenusOpen(false);
});
document.addEventListener('keydown', function(e){
  if(e.key==='Escape' && dashMenusOpen){
    setDashMenusOpen(false);
    var b=document.getElementById('dashScopeBtn'); if(b) b.focus();
    /* v137 (F1b), found by the pre-push review: this popover is a LAYER, and Escape must close
       one layer. Without this, an Escape pressed while the popover and a modal are both open ran
       this handler AND the top-layer handler at the end of the file, closing two layers on one
       keypress — the exact defect that batch removed from the modal set, surviving here.
       stopIMMEDIATEPropagation, not stopPropagation: both listeners are registered on `document`
       itself, and stopPropagation only stops the walk to the NEXT node, never a sibling listener
       on the same one. (The combobox and price-chip handlers can use the plain form — they sit on
       their own inner elements, so the event genuinely still has a walk to stop.)
       Reproduced before fixing: one Escape took the popover flag AND #settingsPanel down together.
       (That id no longer exists — F9/v148 made Settings a screen. The reproduction stands as the
       record of why this line is here; any other open modal reproduces it identically.) */
    e.stopImmediatePropagation();
  }
});
/* The v115 anchor-to-target pair. A missing figure gets NO class — neutral, never a verdict.
   (Unreachable today: both callers only run with >=2 costed rows. Pinned anyway — an absent value
   falling through to a real-looking verdict is the isFinite('') shape this app has paid for.) */
function dashPctClass(pct){ if(pct==null) return ''; return (pct<=cogsPct+0.05)?'good':'bad'; }
function dashScopeHtml(scope){
  var rows=menuComparisonRows();                                     // already worst-first, already excludes uncosted
  if(rows.length<2){ dashMenusOpen=false; return ''; }               // one costed menu: no control — and the open flag dies WITH the control, or the popover would render pre-opened when a second menu is costed later
  var allPct=computeAvgFoodCost();
  var isAll=(scope===DASH_ALL);
  var name=isAll?'All menus':menuNameById(scope);
  var pct=isAll?allPct:avgFoodCostForScope(scope);
  // aria-label carries the figure the colour encodes; no aria-haspopup — the layer is a group of
  // plain buttons, not a menu, so aria-expanded alone is the honest signal (the #dashMore precedent)
  var html='<div class="dash-scope-wrap">'
    +'<button type="button" class="dash-scope-btn" id="dashScopeBtn"'
    +' aria-expanded="'+(dashMenusOpen?'true':'false')+'" aria-label="Dashboard scope: '+esc(name)
    +(pct==null?'':', '+pct.toFixed(1)+'% food cost')+'">'
    +'<span class="dsb-name">'+esc(name)+'</span>'
    +'<span class="mcmp-pct '+dashPctClass(pct)+'">'+(pct==null?'—':pct.toFixed(1))+'</span>'
    +'<span class="dsb-caret" aria-hidden="true">▾</span></button>';
  if(dashMenusOpen){
    html+=menuCompareHtml(scope, [{id:DASH_ALL,name:'All menus',pct:allPct}].concat(rows));
  }
  return html+'</div>';
}
/* v120: the What-moved panel — the existing 'movers' computation (largest logged price step per
   product) promoted from a Dig-in tile to a panel of its own. No new maths; digData('movers')
   already ranked these and v120 only added each row's `sub`. */
/* F6 (v143): the mock's §3.1 "What moved" section — same rows, now in the v3 row grammar (identity
   left over its muted meta, tinted mono pill hard right) inside a bordered container with a tinted
   header band. The mock's rows are BUTTONS; these are not, and that is R4 rather than an oversight:
   a mover is a PRODUCT, and the row has no destination the app can honestly navigate to from here
   (the Products screen has no deep link and no per-product route). A row that looks pressable and
   does nothing is the dead control §4 forbids. */
function whatMovedHtml(){
  var d=digData('movers'), rows=d.rows.slice(0,3);
  var body=rows.length
    ? '<ul class="mv-list">'+rows.map(function(r){
        // v133 (V2): the delta wears the v3 tinted mono pill — up (a cost rise) is bad, down is good.
        // Colour is a cost observation, the same anchoring every dashboard colour carries.
        return '<li class="mv-row"><span class="mv-main"><span class="mv-name">'+esc(r.name)+'</span>'
          +(r.sub?'<span class="mv-sub">'+esc(r.sub)+'</span>':'')+'</span>'
          +'<span class="dig-v'+(r.dir?(' '+r.dir+' pill '+(r.dir==='up'?'pill-bad':'pill-good')):'')+'">'+esc(r.disp)+'</span></li>';
      }).join('')+'</ul>'
    : '<p class="hint mv-empty">No price moves logged yet.</p>';
  return '<section class="dash-sec dash-moved"><div class="ds-head"><h2>What moved</h2></div>'+body+'</section>';
}
/* v120 made this the chips' disclosure list; v129 makes it the DROPDOWN's popover — dashScopeHtml
   is still its one caller, and now hands it the FULL selectable set: the All-menus row first (the
   chip that carried it is gone, and without a row here the scope is a one-way door — the v96
   lesson), then the ranked menus, worst-first.
   The standalone "By menu" card is still GONE, not optional: a no-argument branch would be
   unreachable code that still looked live, which the v120 pre-push review caught the first time. */
function menuCompareHtml(scope, rows){
  function row(id, name, pct){
    var on=(id===scope);
    return '<li class="mcmp-li"><button type="button" class="mcmp-row'+(on?' act':'')+'" data-scope="'+esc(id)+'"'
      +(on?' aria-current="true"':'')+'>'
      +'<span class="mcmp-name">'+esc(name)+'</span>'
      +mcmpSparkHtml(id)
      +'<span class="mcmp-pct '+dashPctClass(pct)+'">'+(pct==null?'—':pct.toFixed(1)+'%')+'</span></button></li>';
  }
  /* No heading. The old "Ranked by food cost %" head became FALSE the moment the All-menus row
     moved under it — All menus is the whole business, not a competitor in the ranking (the v96
     rule, stated where the rows are built) — and the honesty note below already states the basis
     once. The group's label says what the layer IS (the scope control), not a claim about order.
     dash-dropdown.test.js pins the note's wording and placement. */
  return '<div class="dash-menus-pop" role="group" aria-label="Dashboard scope">'
    +'<ul class="mcmp-list">'+(rows||[]).map(function(r){ return row(r.id, r.name, r.pct); }).join('')+'</ul>'
    +'<p class="hint mcmp-note">Ranked by average food cost % — cost efficiency, not earnings (no sales figures).</p>'
    +'</div>';
}
/* v133 (V3): the §3.1 KPI strip — three cells in one bordered container, internal hairlines.
   Desktop-only by CSS (≥1024): below 1024 today's 44px verdict hero stays until V9 owns mobile
   (§6 keeps a hero there anyway). Every figure is deterministic app arithmetic on the SAME data
   the rest of the dashboard reads. Counts are per publication, the decided headline law.
   Returns '' when nothing is costed and priced — the hero (whose empty state carries the
   actionable copy) stays visible at every width in that case; see .has-kpis in renderDashboard.
   NO delta pill, deliberately: the mock draws one, but "vs last month" is exactly the stat class
   Max deleted in v98 (tombstone at the dp-stats site — "duplicated what the chart shows"), and
   its month figure is an unlabelled baseline besides. Reviving a decided deletion is his call,
   not a restyle's — queued.
   The over-target count uses the SAME 0.05 epsilon as dashPctClass/the badge/verdictHtml, so the
   first two cells can never contradict each other on a display-rounding hair. (dishesOverTarget
   is the insights' own epsilon-free count — left alone on purpose; the strip's law is the
   dashboard's display law.) */
function kpiStripHtml(scope, cmp){
  var isAll=(scope==null||scope===DASH_ALL);
  var pct=isAll?cmp.current:avgFoodCostForScope(scope);
  if(pct==null) return '';
  var over=0, costed=0, unready=0;
  MENU.forEach(function(m){
    if(!isAll && (m.menuId||'MENU_ORIGINAL')!==scope) return;
    var sp=plateForMenuItem(m);
    var c=sp?costFromLines(sp.lines):0;
    // "unready" is honest about what it counts: a dish missing a cost OR a sell price. The old
    // label ("not costed") sent the review hunting phantom ingredient gaps on price-less dishes.
    // A PARTIAL cost still counts as costed — costFromLines returns the partial sum and the
    // broken-link states on the Ingredients tab are the surface that owns that problem.
    if(m.price>0 && c>0){ costed++; if(c/m.price*100 > cogsPct+0.05) over++; }
    else unready++;
  });
  var d=pct-cogsPct;
  var sub=(d>0.05) ? (d.toFixed(1)+' pts over your '+fmtTargetPct()+' target')
        : (d<-0.05 ? (Math.abs(d).toFixed(1)+' pts under your '+fmtTargetPct()+' target')
                   : ('at your '+fmtTargetPct()+' target'));
  return '<div class="kpi-strip">'
    +'<div class="kpi-cell"><div class="kpi-label">Average food cost</div><div class="kpi-row">'
      +'<span class="kpi-num '+dashPctClass(pct)+'">'+pct.toFixed(1)+'%</span></div>'
      +'<div class="kpi-sub">'+sub+'</div></div>'
    +'<div class="kpi-cell"><div class="kpi-label">Plates over target</div><div class="kpi-row"><span class="kpi-num'+(over>0?' bad':'')+'">'+over+'</span></div>'
      +'<div class="kpi-sub">of '+costed+' costed'+(isAll?'':' on this menu')+'</div></div>'
    +'<div class="kpi-cell"><div class="kpi-label">Not costed or priced</div><div class="kpi-row"><span class="kpi-num">'+unready+'</span></div>'
      +'<div class="kpi-sub">plates missing a cost or a sell price</div></div>'
    +'</div>';
}
/* v133 (V3): the sidebar Dashboard badge — the ALL-MENUS average, shown only when it is over
   target. App-computed and deterministic; hidden at or under target, hidden when nothing is
   costed, hidden below 1024 by CSS (the mobile bar has no badge until V9 decides one). */
function updateDashNavBadge(){
  var el=document.getElementById('dashNavBadge'); if(!el) return;
  var pct=null; try{ pct=computeAvgFoodCost(); }catch(e){}
  var over=(pct!=null && pct>cogsPct+0.05);                      // the same epsilon every anchor-to-target site uses
  el.hidden=!over;
  el.textContent=over?(pct.toFixed(1)+'%'):'';
  // aria-label REPLACES a button's accessible name, so the badge is silent to AT unless the
  // label itself carries it (review finding). The prefix stays "Dashboard" so nothing keyed to
  // the name breaks; the suffix states the number AND its meaning — colour is not the carrier.
  var btn=el.closest('.navbtn');
  if(btn) btn.setAttribute('aria-label', over?('Dashboard — average food cost '+pct.toFixed(1)+'%, over target'):'Dashboard');
}
function renderDashboard(){
  var root=document.getElementById('dashBody'); if(!root) return;
  if(typeof priceHistory==='undefined' || typeof savedPlates==='undefined'){ return; }  // data not initialised yet; boot-ready will re-render
  var cmp;
  try{ cmp=dashComparisons(); }catch(e){ console.error('[dashboard] not ready:', e); return; }
  var scope=dashScopeValid();
  /* v89 SCOPE HONESTY, unchanged by the rebuild: the trend chart draws the MENU'S OWN line when that
     menu has two points in range, and otherwise falls back to the all-menus series SAYING SO. Drawing
     the aggregate silently under a menu's name would be a figure this app cannot stand behind.
     v97's one-statement rule also stands: the scope is NAMED ONCE. It used to be stated three times;
     it now lives in the header's scope button — the control that sets it — and, on a phone where that
     button is a bare name and %, in the hero's own label. Those are the readout and the control, not
     two restatements.
     F6 (v143): the eyebrow heading "Average food cost — <scope>" is DELETED with the card that carried
     it. The screen has a §2 header bar now (`.scr-head`, index.html), and a second title under it
     restating the metric is exactly the redundancy v97 removed once already. */
  // v115: the since-line renders HERE rather than inside verdictHtml so the pure verdict block (and
  // its extraction sandbox) stays free of the change log's globals.
  var pctNow=(scope===DASH_ALL)?cmp.current:avgFoodCostForScope(scope);
  /* F6 (v143) — the mock's §3.1 stack, in the mock's order, and it is the SAME order on both
     platforms (§6.1: "Dashboard hierarchy identical: verdict number → trend → Needs attention →
     What moved"). NO CSS reordering anywhere, which is new: the v95/v98 `.dp-tile` ordering handles
     and the v98 desktop grid are both gone. What the phone reads top-to-bottom is what the desktop
     reads top-to-bottom, and the only width-dependent swap is which of the two verdict surfaces is
     showing — the mobile hero or the desktop KPI strip. */
  var kpis=kpiStripHtml(scope, cmp);   // v133: '' when nothing is costed+priced — then the hero's slot carries the path card, at every width
  var html='<div class="dash-top'+(kpis?' has-kpis':'')+'">'
    +kpis                              // >=1024 with .has-kpis: the strip shows and CSS hides the hero; below 1024 CSS hides the strip
    +verdictHtml(scope, cmp)           // the §6 hero — or §5's first-run path card when nothing is costed and priced
    /* R3 — the since-line is in neither mock, and it is not dropped: it is the one place the screen
       says what the LAST CHANGE achieved and how far costs have drifted since. It sits under whichever
       verdict surface is showing. All-menus only, unchanged: its figures ARE the all-menus series, so
       subtracting them from a per-menu current fabricates drift. */
    +sinceLineHtml(scope, pctNow)
    +'</div>'
    +dashTrendHtml(scope)   // v115: the chart owns the scope decision — it emits the scope-note itself ONLY on the all-menus fallback
    +dashInsightsHtml(scope);
  /* v120: What moved + Dig in are the design's two-column second row. While a drill-down is open, Dig
     in takes the full width on its own: the two-column row is for the four summary rows, not a list. */
  html+='<div class="dash-row2'+(digOpen?' is-open':'')+'">'
    +(digOpen?'':whatMovedHtml())
    +digInHtml(scope)
    +'</div>';
  root.innerHTML=html;
  /* F6 (v143): the scope control lives in the SCREEN HEADER now (the mock's §3.1 slot), which is
     static markup OUTSIDE #dashBody — so it is filled separately, and every handler below that
     touches it queries `scopeRoot`, not `root`. One variable, so a later edit cannot wire half of
     them to a subtree that no longer contains the button. */
  var scopeRoot=document.getElementById('dashScopeSlot');
  if(scopeRoot) scopeRoot.innerHTML=dashScopeHtml(scope);
  root.querySelectorAll('.range-btn').forEach(function(b){ b.onclick=function(){ setDashRange(b.getAttribute('data-rg')); }; });
  // v90: the drill-down is a re-render, not a modal — one state variable, no dismissable layer.
  root.querySelectorAll('.dig-card').forEach(function(b){ b.onclick=function(){ setDigOpen(b.getAttribute('data-kind')); }; });
  var digBack=root.querySelector('#digBack'); if(digBack) digBack.onclick=function(){ setDigOpen(null); };
  // v90: the optional Gemini phrasing fires only once the templates are in the DOM, so a slow or failed
  // call leaves a fully-rendered block behind rather than an empty one.
  if(dashInsPending){ try{ gemPhraseInsights(dashInsPending.insights, dashInsPending.scope||''); }catch(e){} }
  // v89: scope changes are session-only and touch nothing else — setDashScope re-renders this tab and
  // leaves currentMenuId (the Menu tab's own selection) exactly where it was.
  // v96: the By-menu rows are the ONLY thing that sets the scope now (the picker's onchange is gone).
  // Note what this does NOT touch: dashRange. Range and scope are orthogonal, and each setter
  // re-renders from the other's live module var rather than resetting it.
  // v129: picking a scope CLOSES the dropdown — the button's own label confirms the selection, so
  // holding the list open (the chips-era disclosure behaviour) would leave a layer covering the
  // number the pick just changed. dashMenusOpen is set directly; setDashScope's re-render carries it.
  // Both handlers refocus the REBUILT button: innerHTML replacement drops focus to <body>, which
  // strands a keyboard user mid-interaction (v129 review). Touch is unaffected — the ring is
  // :focus-visible-gated. The outside-click close deliberately does NOT refocus: the user was
  // leaving, and yanking focus back would hijack whatever they clicked toward.
  // F6 (v143): scopeRoot, not root — the control moved into the screen header. refocusScopeBtn
  // re-queries on every call because setDashScope/setDashMenusOpen re-render and REPLACE the button.
  function refocusScopeBtn(){ var sr=document.getElementById('dashScopeSlot'); var nb=sr&&sr.querySelector('#dashScopeBtn'); if(nb) nb.focus(); }
  if(scopeRoot){
    scopeRoot.querySelectorAll('.mcmp-row').forEach(function(b){ b.onclick=function(){ dashMenusOpen=false; setDashScope(b.getAttribute('data-scope')); refocusScopeBtn(); }; });
    var dsb=scopeRoot.querySelector('#dashScopeBtn'); if(dsb) dsb.onclick=function(){ setDashMenusOpen(!dashMenusOpen); refocusScopeBtn(); };
  }
  // §5's first-run CTA. openBuilderNew is the same function every "New plate" in the app runs, so
  // there is one label for one intent (§7) and no second creation path to keep in step.
  var pathCta=root.querySelector('#dashPathCta'); if(pathCta) pathCta.onclick=function(){ openBuilderNew(); };
  (function wireTrendScrub(){                                        // v47: free scrubbing — crosshair + curve-riding dot + snapping tooltip
    var wrap=document.getElementById('trendWrap'), tip=document.getElementById('trendTip'); if(!wrap||!tip) return;
    var svg=wrap.querySelector('svg'), g=TREND_GEO; if(!svg||!g) return;   // empty chart: TREND_GEO is null, no wiring
    var cross=svg.querySelector('#tcCross'), dot=svg.querySelector('#tcDot'),
        rb=svg.querySelector('#tcRectB'), rd=svg.querySelector('#tcRectD');
    if(!cross||!dot||!rb||!rd) return;
    var n=g.xs.length, stepW=(g.W-g.padL-g.padR)/(n-1), lastIdx=-1, lastMk=-1, raf=0, pending=null, active=false;
    function showAt(vx){                                             // vx in viewBox units, already clamped to the plot
      active=true;
      var vy=tcYAt(g.xs,g.ys,g.tan,vx);                              // the dot rides the RENDERED curve continuously…
      cross.setAttribute('x1',vx.toFixed(1)); cross.setAttribute('x2',vx.toFixed(1)); cross.setAttribute('visibility','visible');
      dot.setAttribute('cx',vx.toFixed(1)); dot.setAttribute('cy',vy.toFixed(1)); dot.setAttribute('visibility','visible');
      rb.setAttribute('width',Math.max(0,vx).toFixed(1));            // bright behind the cursor…
      rd.setAttribute('x',vx.toFixed(1)); rd.setAttribute('width',Math.max(0,g.W-vx).toFixed(1));   // …dimmed ahead of it
      var idx=Math.max(0,Math.min(n-1,Math.round((vx-g.padL)/stepW)));
      // v115: scrubbing near a marker carries the full sentence the marker's bare dot cannot — this
      // is what lets the magnitude labels thin out at 380px without losing anything.
      var mkNear=null, mi;
      if(g.marks) for(mi=0; mi<g.marks.length; mi++){ if(Math.abs(vx-g.marks[mi].x)<=12){ mkNear=g.marks[mi]; break; } }
      var mkKey=mkNear?Math.round(mkNear.x):-1;
      if(idx!==lastIdx || mkKey!==lastMk){                           // …but the REPORTED value snaps to the nearest real reading
        lastIdx=idx; lastMk=mkKey;
        var p=g.pts[idx];
        var when=p.t?new Date(p.t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):('reading #'+(idx+1));
        tip.innerHTML='<span class="tp-d">'+esc(when)+'</span><b class="tp-v">'+p.v.toFixed(1)+'%</b>'
          +(mkNear?('<span class="tp-mk">You made '+(mkNear.count>1?mkNear.count+' changes':'a change')+' — down '+(Math.round(mkNear.drop*10)/10)+' pts</span>'):'');
      }
      tip.classList.add('show'); tip.setAttribute('aria-hidden','false');
      var rect=svg.getBoundingClientRect(), sx=rect.width/g.W, sy=rect.height/g.H;
      var half=(tip.offsetWidth||70)/2, px=vx*sx, py=vy*sy;
      px=Math.max(half+2, Math.min(rect.width-half-2, px));          // clamped: the card never leaves the chart
      tip.classList.toggle('below', py<48);                          // flips under the dot near the top edge
      tip.style.left=px+'px'; tip.style.top=py+'px';
    }
    function rest(){                                                 // pointer-leave/up: no crosshair, full brightness
      active=false; lastIdx=-1;
      cross.setAttribute('visibility','hidden'); dot.setAttribute('visibility','hidden');
      rb.setAttribute('width',g.W); rd.setAttribute('x',g.W); rd.setAttribute('width',0);
      tip.classList.remove('show'); tip.setAttribute('aria-hidden','true');
    }
    function fromEvent(e){
      var rect=svg.getBoundingClientRect();
      var vx=(e.clientX-rect.left)/rect.width*g.W;
      return Math.max(g.padL, Math.min(g.W-g.padR, vx));
    }
    function queue(vx){                                              // rAF throttle: one geometry pass per frame (phone-friendly)
      pending=vx; if(raf) return;
      raf=requestAnimationFrame(function(){ raf=0; if(pending!=null && document.contains(svg)) showAt(pending); pending=null; });
    }
    svg.addEventListener('pointerdown', function(e){ try{ svg.setPointerCapture(e.pointerId); }catch(_){ } e.preventDefault(); queue(fromEvent(e)); });
    svg.addEventListener('pointermove', function(e){ if(e.pointerType==='touch' && !active) return; queue(fromEvent(e)); });   // mouse scrubs on hover; touch needs the press first
    svg.addEventListener('pointerleave', rest);
    ['pointerup','pointercancel'].forEach(function(ev){ svg.addEventListener(ev, function(e){ if(e.pointerType!=='mouse') rest(); }); });
    svg.addEventListener('keydown', function(e){                     // one focusable plot; arrows step the readings
      var idx=lastIdx;
      if(e.key==='ArrowLeft') idx=(idx<0? n-1 : Math.max(0,idx-1));
      else if(e.key==='ArrowRight') idx=(idx<0? 0 : Math.min(n-1,idx+1));
      else if(e.key==='Home') idx=0;
      else if(e.key==='End') idx=n-1;
      else if(e.key==='Escape'){ rest(); return; }
      else return;
      e.preventDefault(); showAt(g.xs[idx]);
    });
    svg.addEventListener('blur', rest);
  })();
}

/* ---------- wiring for new pages/modals ---------- */
(function(){
  var e=document.getElementById('ingSearch'); if(e) e.addEventListener('input',renderIngredients);
  ['ingCatFilter','ingSupFilter'].forEach(function(id){ var s=document.getElementById(id); if(s) s.addEventListener('change',renderIngredients); });
  /* F4 (v140) tombstone: Q7's `#prodFab` click listener is gone with the button — see the header. */
  var isc=document.getElementById('ingSearchClear'); if(isc) isc.addEventListener('click',function(){ var s=document.getElementById('ingSearch'); if(s){ s.value=''; renderIngredients(); s.focus(); } });
  var icf=document.getElementById('ingClearFilters'); if(icf) icf.addEventListener('click',clearProductFilters);   // v58: same helper the empty-state action uses
  var _is=document.getElementById('ingSearch'); if(_is) _is.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); _is.blur(); } });   // v37: Enter commits
  function on(id,fn){ var b=document.getElementById(id); if(b) b.addEventListener('click',fn); }
  on('ingSave',saveIngEdit); on('ingCancel',closeIngEdit); on('ingClose',closeIngEdit); on('ingDelete',deleteIngredient);
  /* F8 (v147) tombstone: `#invIntroX` dismissed the v67 intro banner. The banner is deleted — the
     step-1 dropzone carries "Nothing changes without your review" permanently now, which is the
     one thing the banner said and then let the user hide. `ezInvIntroDismissed` is left in
     localStorage rather than swept: it is a view preference for a view that no longer exists, and
     a boot-time delete would be a write on every start to tidy one dead key. */
  on('invManualToggle',toggleInvManual);   // v67 item 4: reveal/hide the collapsed raw-text paste box
  ['ingModal'].forEach(function(id){ var m=document.getElementById(id); if(m) m.addEventListener('click',function(ev){ if(ev.target===m) hide(id); }); });   // v90: hlModal removed with the highlight cards
})();

restoreLastTab();                                          // safe now: all module data (priceHistory, savedPlates, MENU) is initialised
// v84 BUGFIX: offerPlateDraftResume() used to be called HERE and the Resume button did nothing.
// askConfirm stores its callbacks in __confirmFn/__confirmCancelFn — but `var __confirmFn=null,
// __confirmCancelFn=null;` lives ~2300 lines further down and its INITIALISER runs later in this same
// top-level pass, so it overwrote what askConfirm had just stored. By the time the user could tap
// Resume the callback was null and the dialog closed doing nothing. The call now runs at the very END
// of this file, after every initialiser. Anything that calls askConfirm at load time must do the same.
markNonProductionEnv();                                    // 172: no-op on production; the element is not created at all
wireAccount(); authInit();                                 // 174: sign-in on the Account screen. Gates nothing — see the AUTH block.
bootstrapSync().then(rerenderCurrentTab, rerenderCurrentTab); // once shared data lands, repaint whatever tab is showing (fixes blank dashboard on refresh)
window.addEventListener('online',  function(){ bootstrapSync(); });
window.addEventListener('offline', function(){ setSync('offline'); });


/* ============================================================
   Settings — F9 (v148): a SCREEN (#tab-settings), not the v35 modal.
   Every setting here follows the house rule: one dbSetSetting write + a
   localStorage mirror, loaded idempotently in bootstrapSync.

   TWO ROUTES IN, and each is the only one at its width. 171 changed WHICH two and
   nothing else about the rule: #sideSettings is DESKTOP-ONLY because .nav-bottom is
   CSS-hidden below 1024, and the More screen's Settings row is MOBILE-ONLY because
   .nav-more is CSS-hidden at 1024 and up. The header gear that used to be the mobile
   half is deleted — see the tombstone at the top of index.html.
   Both navigate; removing either strands the screen at that width.
   ============================================================ */
/* The version string. sw.js's CACHE constant is the source of truth; this is a mirror,
   NOT a second source — tests/settings.test.js reads sw.js and fails the build if the two
   ever disagree. Chosen over fetching and regexing sw.js at runtime, which would add an
   async network read that breaks offline for the sake of a label. */
var APP_VERSION='v154';
/* ⚠️ THE PRIMING. The v35 modal primed the form in openSettings(), on every open. A screen has no
   open event, so the priming lives in the RENDER and showTab calls it on every entry — without this
   the screen paints whatever the markup's default attributes say (0%, GST-exclusive, both AI
   switches off, version "—") and silently misreports every setting. `renderSettingsTab` is the ONE
   place these six values are read out of memory; nothing else may prime them.
   It reads live globals rather than the DB: bootstrapSync has already loaded them, and a screen
   that re-fetched would show stale-then-correct on a slow connection. */
/* ================== 174: AUTH ==================
   Supabase email/password sign-in, surfaced on the Account screen and NOTHING ELSE.

   ⚠️ IT GATES NOTHING, and that is the design rather than an unfinished edge. Every RLS
   policy is still `using (true)` for `public`, which covers `anon` and `authenticated`
   alike, so a signed-in session sees exactly what a signed-out one sees. Gating the app
   before isolation exists would be theatre: it would lock the door on a building with no
   walls, and it could lock Max out of his own café's data for no gain. Isolation is the
   `business_id` + RLS item, and enforcement belongs with it.

   ⚠️ NO SIGN-UP. The anon key ships in index.html, so anyone reading the page already has
   the access an account would grant; a sign-up form would not create that exposure, but it
   would advertise it to people who would not otherwise look. Accounts are created in the
   Supabase dashboard until RLS makes an account mean something.

   WHAT IT DOES DO, and the only reason it is worth shipping now: it proves the mechanism
   end to end and gives the multi-tenant work a real `auth.uid()` to attach `business_id`
   to, instead of that item having to build and verify auth at the same time as policies. */
var authUser=null;

/* A change of USER is the same event as a change of ENVIRONMENT: everything in local
   storage describes data that is about to stop being the data on screen. So both go
   through `purgeLocalState` — see the note there about why there is one rule and not two.

   Then it RELOADS. That is deliberate and is the honest option: the purge clears the
   store, but `currentMenuId`, `dashRange`, `dashScope` and the theme were read out of it
   at boot and still sit in memory, so without a reload the app would be running on
   values whose backing store no longer exists. Sign-in and sign-out are rare, deliberate
   actions; a reload costs a second and removes a whole class of stale-state bug. */
function authSwitchUser(){
  try{ purgeLocalState(window.localStorage, ENV_STAMP_KEY); }catch(e){}
  try{ location.reload(); }catch(e){}
}

function authApply(session, isInitial){
  var next=(session && session.user) || null;
  var prevId=authUser && authUser.id, nextId=next && next.id;
  authUser=next;
  renderAccountTab();
  /* ⚠️ The initial event must NEVER purge. `onAuthStateChange` fires INITIAL_SESSION on
     every single load, and treating that as a switch would wipe the user's preferences —
     and the plate draft — on each boot. Only a genuine change of identity is a switch. */
  if(!isInitial && prevId!==nextId) authSwitchUser();
}

async function authInit(){
  if(!SUPA || !SUPA.auth) return;                              // no client (no config, or offline boot)
  try{
    var r=await SUPA.auth.getSession();
    authUser=(r && r.data && r.data.session && r.data.session.user) || null;
  }catch(e){ authUser=null; }
  renderAccountTab();
  try{
    SUPA.auth.onAuthStateChange(function(evt, session){
      authApply(session, evt==='INITIAL_SESSION');
    });
  }catch(e){}
}

async function authSignIn(email, password){
  if(!SUPA || !SUPA.auth) return {error:{message:'No connection to the server.'}};
  try{
    var r=await SUPA.auth.signInWithPassword({email:email, password:password});
    if(r && r.error) return {error:r.error};
    return {data:r && r.data};
  }catch(e){ return {error:{message:errText(e)}}; }
}

async function authSignOut(){
  if(!SUPA || !SUPA.auth) return {error:{message:'No connection to the server.'}};
  try{
    var r=await SUPA.auth.signOut();
    if(r && r.error) return {error:r.error};
    return {data:true};
  }catch(e){ return {error:{message:errText(e)}}; }
}

function renderAccountTab(){
  var out=document.getElementById('acctOut'), inn=document.getElementById('acctIn2');
  if(!out || !inn) return;
  var signedIn=!!authUser;
  out.hidden=signedIn; inn.hidden=!signedIn;
  var who=document.getElementById('acctWho');
  if(who) who.textContent=signedIn
    ? (authUser.email||'this device')+' — signing out clears this device’s saved preferences.'
    : '';
}

function authErr(msg){
  var e=document.getElementById('acctErr'); if(!e) return;
  e.textContent=msg||''; e.hidden=!msg;
}

function wireAccount(){
  var f=document.getElementById('acctForm');
  if(f) f.addEventListener('submit', async function(ev){
    ev.preventDefault();
    authErr('');
    var em=document.getElementById('acctEmail'), pw=document.getElementById('acctPass');
    var btn=document.getElementById('acctIn');
    var email=(em&&em.value||'').trim(), pass=(pw&&pw.value)||'';
    if(!email || !pass){ authErr('Enter your email and password.'); return; }
    if(btn) btn.disabled=true;
    var r=await authSignIn(email, pass);
    if(btn) btn.disabled=false;
    /* The REAL error, not a friendly guess. CLAUDE.md's writes rule is that the actual
       server message reaches the user; "something went wrong" on a login is how someone
       spends ten minutes on a typo'd email. */
    if(r.error){ authErr(errText(r.error)); return; }
    if(pw) pw.value='';
    // no toast and no re-render here: authApply is about to reload the page.
  });
  var so=document.getElementById('acctOutBtn');
  if(so) so.addEventListener('click', async function(){
    so.disabled=true;
    var r=await authSignOut();
    so.disabled=false;
    if(r.error){ toast('Could not sign out: '+errText(r.error)); return; }
  });
}

function renderSettingsTab(){
  var c=document.getElementById('setCogsInput'); if(c) c.value=cogsPct;
  var g=document.getElementById('setGstDefault'); if(g) g.value=gstDefault;
  var v=document.getElementById('setVersion'); if(v) v.textContent=APP_VERSION;
  var ai=document.getElementById('setAiInvoiceChk'); if(ai) ai.checked=aiInvoiceCheck;   // v81
  var as=document.getElementById('setAiSuggestChk'); if(as) as.checked=aiSuggestions;    // v81
  syncThemeSeg();                                                                       // v136
}
/* 171 tombstone: `openSettings()` is DELETED. It was a one-line alias for showTab('settings'),
   kept while the header gear needed a handler to bind; the gear is gone and both surviving routes
   (#sideSettings, the More row) are data-tab navigation, so nothing called it. A one-line alias
   with no caller is the shape `addProduct` warns about — except this one has no Playwright handle
   either, which was checked before deleting: tests/visual/v137-modal-layer.spec.js was its last
   caller and now drives showTab('settings') directly, which is what the gear did anyway. */
/* F9 (v148) tombstone: closeSettings / setSettingsSection / settingsBack / reopenSettingsSection /
   backToSettingsSection are all GONE. The first three were the modal's own machinery. The last two
   existed so a sub-surface opened FROM Settings could reopen Settings on its own section when it
   closed — a modal-over-modal problem. A modal over a SCREEN has none of it: closing Tidy or
   Remembered packs reveals the Settings screen still rendered underneath, which is what Max asked
   for in v81 ("opening Tidy by mistake must be one tap to get back") and is now free. */
// v60 item 8: Tidy lists is a modal now (not an inline Settings section) so Settings stays short.
// One modal, multiple doors: the Settings row opens it on Category; a filter's "Manage list…" door
// opens it pre-scoped to that field. renderTidyValues reads the #tidyField select, so we set it first.
function openTidyManage(field){
  var sel=document.getElementById('tidyField'); if(sel && field) sel.value=field;
  renderTidyValues();
  show('tidyManageModal');
}
function closeTidyManage(){ hide('tidyManageModal'); }   // F9 (v148): no reopen — the Settings screen is still there underneath

/* ===== v59 item 6b: Tidy lists UI (Settings) — the Settings surface for the v40 pure core =====
   Category spans products + plate categories; Brand/Supplier are product-only. Every action goes
   through ONE blast-radius confirm and applies via the existing write helpers (setProduct ->
   dbPushIngredient for products, dbPushPlate for plates, plus tidySupplierMemMigration for a
   supplier rename/clear so taught invoice packs don't orphan). Ingredient categories mirror their
   product, so a category rename here flows to the Ingredients tab automatically. */
var tidyField='category', tidyAction=null, tidyFrom=null;
var TIDY_COLS=['category','brand','supplier'];   // v111: the only product columns applyTidy may write
function renderTidyValues(){
  var box=document.getElementById('tidyValues'); if(!box) return;
  var sel=document.getElementById('tidyField'); tidyField=(sel&&sel.value)||'category';
  var rows=tidyValuesCombined(PRODUCTS, savedPlates, tidyField);
  if(!rows.length){ box.innerHTML='<p class="hint tidy-empty">No '+esc(tidyField)+' values yet.</p>'; return; }
  box.innerHTML=rows.map(function(r){
    var meta=(tidyField==='category')
      ? (r.products+' product'+(r.products===1?'':'s')+(r.plates?(' · '+r.plates+' plate'+(r.plates===1?'':'s')):''))
      : (r.count+' product'+(r.count===1?'':'s'));
    return '<div class="tidy-row" data-v="'+esc(r.value)+'">'
      +'<span class="tidy-val">'+esc(r.value)+'</span><span class="tidy-count">'+esc(meta)+'</span>'
      +'<span class="tidy-acts">'
      +'<button type="button" class="linklike" data-act="rename">Rename</button>'
      +'<button type="button" class="linklike" data-act="merge">Merge</button>'
      +'<button type="button" class="linklike tidy-clear" data-act="clear">Clear</button>'
      +'</span></div>';
  }).join('');
  box.querySelectorAll('.tidy-row .linklike').forEach(function(b){
    b.addEventListener('click',function(){ openTidy(tidyField, b.getAttribute('data-act'), b.closest('.tidy-row').getAttribute('data-v')); });
  });
}
function tidyBlast(plan){                                            // "on 14 products and 3 plates"
  var parts=[]; var np=plan.productPatches.length, nl=plan.platePatches.length;
  if(np) parts.push(np+' product'+(np===1?'':'s'));
  if(nl) parts.push(nl+' plate'+(nl===1?'':'s'));
  return parts.length?('on '+parts.join(' and ')):'nothing';
}
function openTidy(field, action, from){
  tidyField=field; tidyAction=action; tidyFrom=from;
  var title=document.getElementById('tidyModalTitle'), warn=document.getElementById('tidyModalWarn');
  var rw=document.getElementById('tidyRenameWrap'), mw=document.getElementById('tidyMergeWrap');
  var ri=document.getElementById('tidyRenameInput'), ms=document.getElementById('tidyMergeSelect');
  rw.style.display='none'; mw.style.display='none';
  var others=tidyValuesCombined(PRODUCTS, savedPlates, field).map(function(x){return x.value;}).filter(function(v){return v!==from;});
  if(action==='rename'){ title.textContent='Rename '+field; rw.style.display=''; if(ri){ ri.value=from; } }
  else if(action==='merge'){ title.textContent='Merge '+field;
    mw.style.display=''; if(ms){ ms.innerHTML=others.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('')||'<option value="">(no other value to merge into)</option>'; } }
  else { title.textContent='Clear '+field; }
  updateTidyWarn();                                                  // live blast-radius preview
  show('tidyModal');
  if(action==='rename'&&ri){ ri.focus(); ri.select(); }
}
function tidyTarget(){                                               // the chosen "to" value for the current action
  if(tidyAction==='clear') return null;
  if(tidyAction==='rename'){ var ri=document.getElementById('tidyRenameInput'); return ri?ri.value.trim():tidyFrom; }
  var ms=document.getElementById('tidyMergeSelect'); return ms?ms.value:null;
}
function updateTidyWarn(){
  var warn=document.getElementById('tidyModalWarn'); if(!warn) return;
  var plan=tidyPlanAll(PRODUCTS, savedPlates, tidyField, tidyAction, tidyFrom, tidyTarget());
  var to=tidyTarget();
  warn.textContent=(tidyAction==='clear'?('Clear “'+tidyFrom+'” '+tidyBlast(plan)+'?')
                   :tidyAction==='merge'?('Merge “'+tidyFrom+'” into “'+(to||'…')+'” '+tidyBlast(plan)+'?')
                   :('Rename “'+tidyFrom+'” to “'+(to||'…')+'” '+tidyBlast(plan)+'?'))+' This can’t be undone.';
}
function applyTidy(){
  var field=tidyField, action=tidyAction, from=tidyFrom;
  var to=null;
  if(action==='rename'){ to=(document.getElementById('tidyRenameInput').value||'').trim(); if(!to){ toast('Enter a new name'); return; } }
  else if(action==='merge'){ to=(document.getElementById('tidyMergeSelect').value||''); if(!to){ toast('Pick a value to merge into'); return; } }
  var plan=tidyPlanAll(PRODUCTS, savedPlates, field, action, from, to);
  if(!plan.count){ hide('tidyModal'); toast('Nothing to change'); return; }
  var col=plan.field;   // 'category' | 'brand' | 'supplier'
  // v111: `col` is written straight into productsById below, bypassing setProduct — which is the ONE
  // place a price becomes an ing_price_history point (v109). Today it can only be one of three label
  // fields, but nothing in tidyPlanAll constrains it: it takes `field` free and hands it back. If a
  // future field ever routed a PRICE column through here it would move money with no price-log entry
  // and no error. Refuse anything outside the permitted set rather than trust the caller.
  if(TIDY_COLS.indexOf(col)<0){ hide('tidyModal'); toast('Can’t tidy that field'); return; }
  // products: write through productsById (rebuild once, then push each changed row)
  plan.productPatches.forEach(function(pt){ productsById[pt.id]=Object.assign({}, productsById[pt.id]||{}); productsById[pt.id][col]=pt.value; });
  if(plan.productPatches.length){ rebuild(); plan.productPatches.forEach(function(pt){ dbPushIngredient(pt.id); }); }
  // plates (category only)
  plan.platePatches.forEach(function(pt){ var sp=(savedPlates||[]).filter(function(s){return s.id===pt.id;})[0]; if(sp){ sp.category=pt.value; dbPushPlate(sp); } });
  // supplier memory migration (rename/merge/clear a supplier)
  if(field==='supplier'){
    tidySupplierMemMigration(supplierMem, from, (action==='clear'?null:to)).forEach(function(mig){
      if(mig.drop){ delete supplierMem[mig.oldId]; if(typeof dbDeleteSupplierPhrase==='function') dbDeleteSupplierPhrase(mig.oldId); return; }
      delete supplierMem[mig.oldId]; if(mig.oldId!==mig.newId && typeof dbDeleteSupplierPhrase==='function') dbDeleteSupplierPhrase(mig.oldId);
      supplierMem[mig.newId]={id:mig.newId, supplier:mig.supplier, phrase_norm:mig.phrase_norm, qty:mig.qty, unit:mig.unit, pid:mig.pid};
      if(typeof dbPushSupplierPhrase==='function') dbPushSupplierPhrase(supplierMem[mig.newId]);
    });
  }
  hide('tidyModal');
  if(typeof renderIngredients==='function') renderIngredients();
  if(typeof renderKitchenPanel==='function') renderKitchenPanel();
  if(typeof renderPlatesTab==='function') renderPlatesTab();
  if(typeof renderAnalysis==='function') renderAnalysis();
  renderTidyValues();
  toast((action==='clear'?'Cleared':action==='merge'?'Merged':'Renamed')+' '+field+' '+tidyBlast(plan));
}
/* v115: syncCogsRead is DELETED with its subject — the Menu tab's .cogs-meta line (and its
   #cogsTargetRead mirror) is gone; the Suggested column header carries the live target %. */
/* Export backup — client-side only, no server round-trip. Seven data groups, matching
   what bootstrapSync pulls: products, kitchen words, plates, menu items,
   the per-ingredient price log, supplier memory, settings. Deliberately a plain JSON dump:
   it's a lifeboat, not an interchange format.
   v106 added ing_price_log and supplier_mem. supplier_mem does have a server table
   (supplier_phrases); it's here because a backup exists for the case where both copies go.

   v108 — FORMAT 2, and the export is now a COMPLETE SNAPSHOT (decision D2).
   `baseProductsFingerprint` and the two `base_products_*` stamp fields are DELETED with the literal
   they fingerprinted. They existed for one reason: a format-1 file carried only the edited/custom
   products, so a restore had to prove the restoring build's BASE_PRODUCTS matched the exporting
   build's, or 295 untouched products would silently take the new build's prices. With the catalogue
   in `ingredients`, `products` below carries ALL of them and there is no literal to agree about.
   Keeping the fields would be worse than dropping them: with no literal left to hash they could only
   be null, and a naive restore comparison treats null == null as a MATCH — turning rule 9's guard
   into a rubber stamp, which is the exact failure it was written to prevent.
   `format` tells a restore which shape it holds; `app_version` is what it will need when the schema
   drifts, which it will. A truncated file fails at JSON.parse before any count is consulted, so row
   counts would be ceremony rather than protection — deliberately not added. */
function buildBackup(){
  return {
    app:'EzPlate', version:APP_VERSION, exported_at:new Date().toISOString(),
    stamp:{
      /* v114: 2 -> 3. Hard rule 9's general law is that a change to what bootstrapSync puts in memory
         IS a change to the backup format and must bump the stamp — and this adds a whole group.
         Nothing about the seven existing groups changed, which is why BOTH formats stay restorable:
         parseBackupFile accepts 2 and 3, and a format-2 file simply carries no change log, because
         none existed when it was written. That is a true statement about the file, not a guess about
         it — the distinction rule 9 exists to protect. */
      format:3,                                                       // shape of this file, not the app
      app_version:APP_VERSION
    },
    products:productsById,
    kitchen_ingredients:kitchenIngredients,
    plates:savedPlates,
    menu_items:customMenu,
    ing_price_log:ingPriceLog,
    change_log:changeLog,
    supplier_mem:supplierMem,
    settings:{
      food_cost_target:cogsPct,
      gst_default:gstDefault,
      king_wiz_skips:kingWizSkipIds(),
      menus:menusList,
      current_menu_id:currentMenuId
    }
  };
}
function exportBackup(){
  try{
    var d=new Date(), pad=function(x){return (x<10?'0':'')+x;};
    var name='ezplate-backup-'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.json';
    var blob=new Blob([JSON.stringify(buildBackup(),null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click();
    a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); },1000);
    toast('Backup downloaded');
  }catch(e){ console.error('[settings] export failed:', e); toast('Couldn\u2019t build the backup'); }
}
/* ===== Restore from backup (v110) — the counterpart to exportBackup =========================
   exportBackup has shipped without one since it was written. That mattered more after v108 (D3)
   made a product delete a real DELETE: the reasoning that made that acceptable was "reversibility
   is provided by the export" — and that sentence is only true once something can READ the file.
   Until now, recovery meant hand-inserting rows in the Supabase SQL editor.

   THE TRAP THIS CODE EXISTS TO AVOID (hard rule 8). The export dumps IN-MEMORY objects, so a dish
   comes out camelCase (`menuId`, `plateId`) while the columns are `menu_id`, `plate_id`. A restore
   written from the SCHEMA inserts every row with a null plate link — every row present, nothing
   connected, no error raised. On the 1 Aug file that was 76 of 77. So nothing here names a column:
   every group goes through the SAME `xToRow` writers the app already uses, and the SQL function is
   handed rows that are already row-shaped.

   TWO GROUPS HAVE NO ROW MAPPER, and that is not an oversight to paper over: `kitchen_ingredients`
   and everything under `settings` are `app_settings` JSON blobs written by `dbSetSetting`, not
   table rows. Their boundary is the SETTING KEY, so they are assembled as `{key, value}` pairs and
   the key names appear here — the one place outside dbSetSetting's callers that they can.

   ATOMICITY IS THE SERVER'S JOB, NOT THIS FILE'S. A partial restore is worse than none: plates
   without products means every line costs nothing while the margin still reads green. PostgREST
   gives no cross-table transaction across requests, so this sends ONE rpc and lets Postgres be
   all-or-nothing. Verified against production 3 Aug 2026 — a payload that fails at the dishes
   insert rolled back the preceding deletes and inserts completely.
   See supabase/migrations/20260803_restore_backup_fn.sql. */

/* Accept or refuse a file, PURE so tests can slice it. Every refusal has to SAY why in words the
   user can act on: rule 9 exists because a wrong restore is silent, so the refusal must not be. */
function parseBackupFile(text){
  var b;
  try{ b=JSON.parse(text); }
  catch(e){ return {ok:false, reason:'That file isn’t valid JSON — it may be damaged or only partly downloaded.'}; }
  if(!b || typeof b!=='object' || Array.isArray(b)) return {ok:false, reason:'That file isn’t an EzPlate backup.'};
  var st=b.stamp;
  /* No stamp at all = pre-v106. It is a delta against a product list with no record of WHICH build,
     so there is nothing to check it against. Reference material, not a restorable file. */
  if(!st || typeof st!=='object' || Array.isArray(st))
    return {ok:false, reason:'This backup was saved before EzPlate started recording a backup format, so there’s no way to tell what’s inside it. It can’t be restored.'};
  var f=st.format;
  /* Format 1 is REFUSED WHOLESALE, and the honest reason is not "format 1 is incomplete" — some are
     complete (one taken after the 1 Aug backfill holds all 412). It is that EzPlate can no longer
     run the test that tells them apart: rule 9's check is per-id against the built-in product list,
     and v108 deleted that list. Guessing wrong means 295 products carry silently wrong prices,
     which is the exact failure rule 9 was written to prevent. */
  if(f===1)
    return {ok:false, reason:'This is a format 1 backup (v107 or earlier). Some of those hold every product and some hold only the ones you’d edited — and EzPlate can no longer tell which, because the built-in product list it would have to compare against was removed in v108. It survives only in commit aa16387. Restoring blind could leave 295 products with silently wrong prices, so EzPlate won’t do it.'};
  /* v114 — TWO formats are accepted, and refusing format 2 would have been the more dangerous choice.
     v114 adds the change log as an eighth group, which under rule 9's general law is a format change.
     But ~/Downloads/ezplate-PRE-STEP2.json is format 2 and is the newest backup in existence — the only
     recovery path there is. Refusing it would cost a real disaster; accepting it costs nothing, because
     the only thing it lacks is a log that did not exist when it was written. Contrast format 1, which is
     refused precisely because the app can no longer tell a complete one from an incomplete one. */
  if(f!==2 && f!==3)
    return {ok:false, reason:'This backup is marked format “'+String(f)+'”, which this version of EzPlate doesn’t know how to read. It may have been made by a newer version.'};
  /* Every REPLACED group must be present. A missing one is a damaged file, not an empty dataset — and
     the difference matters, because the server would happily replace a table with nothing.
     change_log is NOT in this list, and that is the same distinction the SQL function draws: it is the
     one group the restore never deletes, so a missing one can destroy exactly nothing. It is checked
     below only for TYPE, when it is present at all. */
  var groups=[
    ['products','object','products'], ['kitchen_ingredients','array','ingredients'],
    ['plates','array','plates'], ['menu_items','array','menus'],
    ['ing_price_log','object','price history'], ['supplier_mem','object','remembered items'],
    ['settings','object','settings']
  ];
  for(var i=0;i<groups.length;i++){
    var k=groups[i][0], want=groups[i][2], v=b[k];
    var isArr=Array.isArray(v), isObj=(v&&typeof v==='object'&&!isArr);
    if(groups[i][1]==='array' ? !isArr : !isObj)
      return {ok:false, reason:'This backup is damaged — its '+want+' are missing or unreadable. Nothing has been changed.'};
  }
  if(b.change_log!==undefined && !Array.isArray(b.change_log))
    return {ok:false, reason:'This backup is damaged — its record of your changes is unreadable. Nothing has been changed.'};
  if(!Array.isArray(b.settings.menus))
    return {ok:false, reason:'This backup is damaged — its menus are missing or unreadable. Nothing has been changed.'};
  return {ok:true, data:b};
}

/* Two KINDS of broken reference, and they must not be treated alike.
   HARD — a menu entry pointing at a plate or a menu the file doesn't contain. Postgres rejects the
   whole restore on the foreign key, so catching it here turns an opaque FK error into a sentence.
   SOFT — a dangling pid/kid. It restores fine and then costs nothing, which is the quiet-wrong-
   number failure. But refusing would leave someone whose only lifeboat is slightly imperfect with
   NOTHING, so it is reported in the confirm and the choice is the user's.
   (Misc cost lines carry {cost, misc, label} and no kid BY DESIGN — not a dangling reference.) */
function backupRefCheck(b){
  var hard=[], soft=[];
  var prodIds={}, kIds={}, plateIds={}, menuIds={};
  Object.keys(b.products).forEach(function(id){ prodIds[id]=1; });
  b.kitchen_ingredients.forEach(function(k){ if(k&&k.id) kIds[k.id]=1; });
  b.plates.forEach(function(p){ if(p&&p.id) plateIds[p.id]=1; });
  b.settings.menus.forEach(function(m){ if(m&&m.id) menuIds[m.id]=1; });

  var badPlate=0, badMenu=0;
  b.menu_items.forEach(function(d){
    if(!d) return;
    var pid=d.plateId||d.sourcePlateId||null;
    if(pid && !plateIds[pid]) badPlate++;
    if(d.menuId && !menuIds[d.menuId]) badMenu++;
  });
  /* "entry on your menus" DESCRIBES rather than names. The object noun would have to be a fifth one
     ("menu item" already survives in the Edit modal awaiting its own brief) and this copy must not
     add another — describing without naming is allowed, inventing a noun is not. */
  var s=function(n){ return n===1?'':'s'; }, v=function(n){ return n===1?'s':''; };
  var ent=function(n){ return n+(n===1?' entry':' entries'); };
  if(badPlate) hard.push(ent(badPlate)+' on your menus point'+v(badPlate)+' to a plate that isn’t in this backup');
  if(badMenu) hard.push(ent(badMenu)+' point'+v(badMenu)+' to a menu that isn’t in this backup');

  var badPid=0;
  b.kitchen_ingredients.forEach(function(k){ if(k&&k.pid&&!prodIds[k.pid]) badPid++; });
  if(badPid) soft.push(badPid+' ingredient'+s(badPid)+' link'+v(badPid)+' to a product that isn’t in this backup');

  var badKid=0, badLinePid=0;
  b.plates.forEach(function(p){
    ((p&&p.lines)||[]).forEach(function(l){
      if(!l||typeof l!=='object') return;
      if(l.kid!=null){ if(!kIds[l.kid]) badKid++; }
      else if(l.pid!=null){ if(!prodIds[l.pid]) badLinePid++; }
    });
  });
  if(badKid) soft.push(badKid+' plate line'+s(badKid)+' use'+v(badKid)+' an ingredient that isn’t in this backup');
  if(badLinePid) soft.push(badLinePid+' plate line'+s(badLinePid)+' use'+v(badLinePid)+' a product that isn’t in this backup');
  return {hard:hard, soft:soft};
}

/* Build the rpc payload. EVERY group crosses the boundary through the writer the app already uses —
   this function must never grow a column name of its own. `format` is repeated into the payload so
   the server can refuse independently: a guard only one side knows about is a guard a future caller
   can skip by not knowing about it. */
function backupToPayload(b){
  var ipl=[];
  Object.keys(b.ing_price_log||{}).forEach(function(pid){
    (b.ing_price_log[pid]||[]).forEach(function(pt){
      if(!pt || pt.t==null || pt.v==null) return;                 // a null would restore as a real-looking $0.00
      ipl.push(pointToRow(pt.t, pt.v, 'cost_per_base_unit', 'product_id', pid));
    });
  });
  var s=b.settings, settings=[{key:'kitchen_ingredients', value:b.kitchen_ingredients}];
  if(s.food_cost_target!=null) settings.push({key:'food_cost_target', value:s.food_cost_target});
  if(s.gst_default!=null) settings.push({key:'gst_default', value:s.gst_default});
  if(Array.isArray(s.king_wiz_skips)) settings.push({key:'king_wiz_skips', value:s.king_wiz_skips});
  /* ⚠️ THE WIRE FORMAT DECLARES WHAT THE PAYLOAD CONTAINS, NOT WHICH VERSION BUILT IT — and getting
     that wrong would have broken disaster recovery for exactly as long as it took to notice.
     An earlier draft sent `format:3` unconditionally, reasoning that this object is built here and now.
     But the deployed function is whatever Max last applied by hand, and v110's refuses format 3 outright.
     So between this code reaching Vercel and the v3 migration being run, EVERY restore would have failed
     — including a restore of ~/Downloads/ezplate-PRE-STEP2.json, which is the only recovery path there
     is. The batch takes care to keep format 2 restorable and would have removed the one thing that made
     the WIRE backward-compatible.
     A payload with no change log genuinely IS a format-2 payload: there is nothing in it that a format-2
     reader cannot handle. So it says so, and the old function accepts it. The moment there is a log to
     carry, it says 3 — and by then the table exists, which means migration 1 has been run. */
  var chg=(b.change_log||[]).map(changeToRow);
  return {
    format:chg.length?3:2,
    ingredients:Object.keys(b.products).map(function(id){ return ingredientToRow(b.products[id]); }),
    menus:s.menus.map(menuRecordToRow),
    plates:b.plates.map(plateToRow),
    menu_items:b.menu_items.map(menuToRow),
    supplier_phrases:Object.keys(b.supplier_mem||{}).map(function(id){ return supplierPhraseToRow(b.supplier_mem[id]); }),
    ing_price_history:ipl,
    /* Mapped through changeToRow like every other group — hard rule 8 is obeyed structurally rather
       than by care: this function names no column of its own, so the camelCase/snake_case trap that
       silently unlinked 76 of 77 dishes on the 1 Aug file has nowhere to happen. Sent even when empty,
       and harmless either way: the v3 function treats an absent group as empty, and v110's ignores a
       key it does not know. An absent group is never an error for this table, because the server never
       deletes it (see 20260806_restore_backup_v3.sql). */
    menu_change_log:chg,
    app_settings:settings
  };
}

/* Counts for the confirm. Deliberately worded in the four object nouns only: a plate published to a
   menu is still a plate (CLAUDE.md), so menu entries are described by their relationship rather
   than given a noun of their own. */
function backupSummary(b){
  var nm=b.settings.menus.length, nd=b.menu_items.length;
  var s=function(n){ return n===1?'':'s'; };
  return [
    Object.keys(b.products).length+' product'+s(Object.keys(b.products).length),
    b.kitchen_ingredients.length+' ingredient'+s(b.kitchen_ingredients.length),
    b.plates.length+' plate'+s(b.plates.length),
    nm+' menu'+s(nm)+', with '+nd+' plate'+s(nd)+' on '+(nm===1?'it':'them'),
    Object.keys(b.supplier_mem||{}).length+' remembered item'+s(Object.keys(b.supplier_mem||{}).length)
  ];
}

function dbRestoreBackup(payload){
  return pushWrite(function(){ return SUPA.rpc('restore_backup', {payload:payload}); }, 'the restore');
}

function restoreFromBackupFile(file){
  if(!file) return;
  var refuse=function(msg){ askConfirm('Can’t restore this backup', msg, 'OK', function(){}); };
  if(!online()){ refuse('EzPlate needs a connection to restore — the restore happens on the server. Nothing has been changed.'); return; }
  var reader=new FileReader();
  reader.onerror=function(){ refuse('That file couldn’t be read. Nothing has been changed.'); };
  reader.onload=function(){
    var parsed=parseBackupFile(String(reader.result||''));
    if(!parsed.ok){ refuse(parsed.reason); return; }
    var b=parsed.data, refs=backupRefCheck(b);
    if(refs.hard.length){
      refuse('This backup can’t be restored as it stands:\n\n• '+refs.hard.join('\n• ')+
             '\n\nRestoring it would be rejected part-way through, so nothing has been changed.');
      return;
    }
    var when=b.exported_at ? new Date(b.exported_at) : null;
    var whenTxt=(when && isFinite(when.getTime())) ? when.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}) : 'an unknown date';
    var msg='Exported '+whenTxt+' by EzPlate '+(b.version||'(unknown version)')+'.\n\n'+
            'Everything below REPLACES what’s on the server:\n• '+backupSummary(b).join('\n• ')+
            '\n\nAnything saved since that export is replaced and can’t be recovered. '+
            'Your price history is added to, never replaced.';
    if(refs.soft.length) msg+='\n\nWorth knowing first:\n• '+refs.soft.join('\n• ')+
                             '\nThose will cost nothing until you relink them.';
    askConfirm('Restore from backup', msg, 'Replace my data', function(){
      var payload;
      try{ payload=backupToPayload(b); }
      catch(e){ console.error('[restore] payload build failed:', e); refuse('EzPlate couldn’t read that backup’s contents. Nothing has been changed.'); return; }
      toast('Restoring…');
      dbRestoreBackup(payload).then(function(res){
        if(!res || res.error) return;                              // pushWrite has already said so, in the real words
        /* REPAINT FROM THE SERVER, NEVER FROM THE FILE. Rendering the file's objects would show a
           screen that agrees with the backup whether or not the write actually landed — the same
           two-sources-of-truth ambiguity v108 removed. bootstrapSync is the only reader. */
        var wanted=b.settings.current_menu_id;
        return Promise.resolve(bootstrapSync()).then(function(){
          if(wanted && menusList.some(function(m){ return m.id===wanted; })) setCurrentMenuId(wanted);
          rerenderCurrentTab();
          var n=(res.data&&res.data.ingredients)!=null ? res.data.ingredients : Object.keys(b.products).length;
          toast('Restored — '+n+' products back');
        }, function(err){
          /* THE RESTORE ITSELF SUCCEEDED — only the re-read or the repaint failed. Saying
             "couldn't restore" here would be a lie that invites a second restore, and leaving the
             'Restoring…' toast as the last word is worse: after a destructive operation, silence
             reads as "still going" and the user cannot tell whether their data was replaced.
             So: confirm the write landed, and name the one action that fixes the screen.
             (bootstrapSync normally swallows its own errors into the boot gate, so this is
             defence for the repaint below it — CodeRabbit, PR #50.) */
          console.error('[restore] restored, but the refresh failed:', err);
          setSync('error');
          toast('Restored — but the screen couldn’t refresh. Close and reopen EzPlate.');
        });
      });
    });
  };
  reader.readAsText(file);
}

/* Clear cache & refresh — deletes the service worker's copies of the app shell and
   reloads, so the newest build downloads. It touches NOTHING else: no localStorage, no
   Supabase. Blocked while offline: wiping the offline copy with no connection would
   leave the app dead until signal returns, with no way back. */
function clearCacheAndRefresh(){
  if(!navigator.onLine){ toast('You\u2019re offline \u2014 connect first, or the app can\u2019t download again'); return; }
  askConfirm('Clear cache & refresh',
    'This re-downloads the latest version of the app.\n\nYour products, ingredients, plates and menus are NOT touched \u2014 this only clears the offline copy of the app itself.',
    'Clear & refresh', function(){
      var done=function(){ location.reload(); };
      if(!(window.caches && caches.keys)){ done(); return; }
      caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
        .then(done, done);                                          // a failed delete must still reload, not strand the user
    });
}
(function(){
  function on(id,fn){ var b=document.getElementById(id); if(b) b.addEventListener('click',fn); }
  /* F8 (v147) then F9 (v148) tombstone: `on('sideInvoices',openInv)` and `on('sideSettings',openSettings)`
     opened a modal straight from the sidebar. Both are screens now, so both entries carry a data-tab and
     the generic .navbtn[data-tab] binding navigates them. Wiring the opener here as well would fire BOTH.
     171 tombstone: `on('settingsBtn',openSettings)` goes with the header gear. Every route to Settings
     is data-tab navigation now — #sideSettings on desktop, the More row on mobile — so there is no
     click handler left to bind for this screen at all. */
  // v115: #cogsToSettings is gone with the .cogs-meta line
  on('setExport',exportBackup); on('setClearCache',clearCacheAndRefresh);
  /* v110: the file input is hidden and driven by the visible button, matching the invoice
     Upload-PDF pattern. `value=''` before opening the picker so choosing the SAME file twice
     still fires `change` — without it a second attempt after a refusal silently does nothing. */
  (function(){
    var b=document.getElementById('setRestore'), f=document.getElementById('setRestoreFile');
    if(!b||!f) return;
    b.addEventListener('click', function(){ f.value=''; f.click(); });
    f.addEventListener('change', function(){ var fl=f.files&&f.files[0]; if(fl) restoreFromBackupFile(fl); });
  })();
  var ci=document.getElementById('setCogsInput');
  if(ci) ci.addEventListener('input',function(){ var v=parseFloat(ci.value); if(v>=1&&v<=99){ setCogs(v,true); } });   // setCogs re-renders every consumer, the v133 nav badge included
  var gs=document.getElementById('setGstDefault');
  if(gs) gs.addEventListener('change',function(){ setGstDefault(gs.value,true); });
  // v81: AI feature toggles
  var aic=document.getElementById('setAiInvoiceChk'); if(aic) aic.addEventListener('change',function(){ setAiInvoiceCheck(aic.checked,true); });
  var asg=document.getElementById('setAiSuggestChk'); if(asg) asg.addEventListener('change',function(){ setAiSuggestions(asg.checked,true); });
  // v136 (F1a): the theme segment returns with dark mode. Delegated off .seg so the three
  // buttons share one listener; applyThemePref owns both the store and the attribute.
  /* v137 (F1b): the sidebar's compact toggle. It flips the RESOLVED theme, which is what makes it
     honest under 'system' — see syncThemeToggle. syncThemeSeg keeps the Settings segment in step,
     so the two controls can never show different answers. */
  var stg=document.getElementById('sideThemeToggle');
  if(stg) stg.addEventListener('click',function(){
    var next=resolveTheme(loadThemePref())==='dark' ? 'light' : 'dark';
    applyThemePref(next); syncThemeSeg(next);
  });
  syncThemeToggle();                                                                    // v137: boot state — Settings may never be opened
  var seg=document.querySelector('#tab-settings .seg');
  if(seg){
    var segPick=function(b){ if(!b) return; var pref=b.getAttribute('data-theme-pref'); applyThemePref(pref); syncThemeSeg(pref); b.focus(); };
    seg.addEventListener('click',function(ev){ segPick(ev.target.closest('.seg-btn[data-theme-pref]')); });
    /* The markup is role="radiogroup" + role="radio", which promises arrow-key selection.
       Without this the promise is false: a screen-reader user is told it is a radio group and
       then cannot move inside it. Home/End included per the WAI-ARIA radio-group pattern. */
    seg.addEventListener('keydown',function(ev){
      var btns=Array.prototype.slice.call(seg.querySelectorAll('.seg-btn[data-theme-pref]'));
      var i=btns.indexOf(ev.target.closest('.seg-btn[data-theme-pref]'));
      if(i<0||!btns.length) return;
      var n=-1;
      if(ev.key==='ArrowRight'||ev.key==='ArrowDown') n=(i+1)%btns.length;
      else if(ev.key==='ArrowLeft'||ev.key==='ArrowUp') n=(i-1+btns.length)%btns.length;
      else if(ev.key==='Home') n=0;
      else if(ev.key==='End') n=btns.length-1;
      else return;
      ev.preventDefault();
      segPick(btns[n]);
    });
  }
  // Tidy lists wiring (v59 core; v60 item 8 moves it into a modal)
  var tf=document.getElementById('tidyField'); if(tf) tf.addEventListener('change',renderTidyValues);
  /* F10 (v149) built this row as the ONLY route to #tab-account at any width. 171 added two more —
     #sideAccount in the sidebar's bottom group at ≥1024, and the More screen's Account row below it
     — so "the only route" is no longer true and the sentence is corrected rather than left standing.
     The row still SURVIVES, and F10's reason for it is undamaged: it is a second desktop route, not
     a duplicate of a mobile one. tests/settings-toggles.test.js pins all three together. */
  on('setAccountOpen',function(){ showTab('account'); });
  on('setTidyOpen',function(){ openTidyManage('category'); });   // F9 (v148): opens OVER the Settings screen; closing it reveals the screen, so nothing has to be reopened
  on('setSmemOpen',openSmem);                                    // v71 item 5 moved remembered packs here
  on('tidyManageDone',closeTidyManage); on('tidyManageClose',closeTidyManage);
  var tmm=document.getElementById('tidyManageModal'); if(tmm) tmm.addEventListener('click',function(ev){ if(ev.target===tmm) closeTidyManage(); });
  on('tidyModalConfirm',applyTidy); on('tidyModalCancel',function(){ hide('tidyModal'); }); on('tidyModalClose',function(){ hide('tidyModal'); });
  var tm=document.getElementById('tidyModal'); if(tm) tm.addEventListener('click',function(ev){ if(ev.target===tm) hide('tidyModal'); });
  var tms=document.getElementById('tidyMergeSelect'); if(tms) tms.addEventListener('change',updateTidyWarn);   // refresh the blast-radius line
  var tri=document.getElementById('tidyRenameInput'); if(tri) tri.addEventListener('input',updateTidyWarn);
  // v60 item 8: the "Manage list…" door on each category/supplier filter (data-tidy-field). Handled at the
  // DOCUMENT level in the CAPTURE phase so it runs BEFORE the filter's own change→render listener — that
  // listener rebuilds the <select> (fillFilter), which would clear the sentinel selection before a
  // per-element handler ever saw it. stopPropagation keeps the render from treating the door as a value;
  // we restore the previous value (recorded on focusin) and open the manager pre-scoped.
  document.addEventListener('focusin',function(ev){
    var s=ev.target; if(s&&s.matches&&s.matches('select[data-tidy-field]')&&s.value!==TIDY_DOOR) s.dataset.prevVal=s.value;
  });
  document.addEventListener('change',function(ev){
    var s=ev.target; if(!s||!s.matches||!s.matches('select[data-tidy-field]')) return;
    if(s.value!==TIDY_DOOR) return;
    ev.stopPropagation();
    s.value=s.dataset.prevVal||'';
    openTidyManage(s.dataset.tidyField||'category');
  }, true);
})();

/* ===== PWA: service worker registration ===== */
if ('serviceWorker' in navigator) {
  // Register on window load, at root scope, and surface any failure (no silent catch).
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' })
      .then(function (reg) {
        console.log('[PWA] Service worker registered — scope:', reg.scope);
        if (reg.update) { reg.update(); }
      })
      .catch(function (err) {
        console.error('[PWA] Service worker registration FAILED:', err);
      });
  });
  // When a new worker takes over from an old one, reload once so fresh assets load.
  if (navigator.serviceWorker.controller) {
    var __swReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (__swReloaded) { return; }
      __swReloaded = true;
      try { sessionStorage.setItem('ez_swReload', '1'); } catch (e) {}  // tell the reloaded page not to replay the splash
      window.location.reload();
    });
  }
}

/* ===== Install banner ===== */
(function(){
  var KEY='cafeCost_installDismissed';
  var banner=document.getElementById('installBanner');
  if(!banner) return;
  var iosHint=document.getElementById('iosHint');
  var deferred=null;
  function dismissed(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
  function setDismissed(){try{localStorage.setItem(KEY,'1');}catch(e){}}
  function standalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
  function show(){ if(!dismissed()&&!standalone()) banner.style.display='flex'; }
  function hide(){ banner.style.display='none'; }
  window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); deferred=e; show(); });
  window.addEventListener('appinstalled',function(){ setDismissed(); hide(); });
  document.getElementById('installClose').addEventListener('click',function(){ setDismissed(); hide(); });
  document.getElementById('installBtn').addEventListener('click',function(){
    if(deferred){ deferred.prompt(); deferred.userChoice.then(function(){ deferred=null; setDismissed(); hide(); }); }
    else if(iosHint){ iosHint.style.display='block'; }   /* iOS Safari has no prompt API */
  });
  show();  /* first-visit guidance even where beforeinstallprompt never fires (e.g. iOS) */
})();


/* ====== v2 features: load/edit, promote-to-menu, invoice import, name match ====== */
// v72 motion: reduced-motion probe (CSS handles the killswitch; JS needs it to skip the close-out timing).
function prefersReducedMotion(){ try{ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches); }catch(e){ return false; } }
// v72 motion: modal open/close go through ONE pair so every overlay shares the same entrance AND the reverse-out.
// Open cancels any pending close so a fast reopen can't be swallowed by the close timer.
/* v87 ROOT CAUSE (Max: "scrolling whilst having modal open still scrolls the main page behind
   modal"): nothing ever stopped the DOCUMENT scrolling while an overlay was up. `.mbody` and
   `.modal` do carry overscroll-behavior:contain, but that only bites when THAT element is itself
   scrollable and hits its end — with the pointer on the backdrop, or a modal short enough that
   `.mbody` never scrolls at all (the desktop case), the gesture chained straight through to
   <body>. Measured before the fix: scrollY 150 -> 550 on the backdrop at BOTH widths, and a
   further 550 -> 1150 over the card on desktop.

   The lock is position:fixed on <body> with the scroll offset held in `top` — NOT
   overflow:hidden, which iOS Safari silently ignores on <body>, and iOS is the device this app
   lives on. On unlock we scroll back to the held offset, so closing a modal never jumps the page.

   State is DERIVED from the DOM (is any `.modal-overlay` still `.open`?) rather than counted: the
   app deliberately stacks a confirm on top of a modal (the v44 used-in-N confirm, the unit guard),
   and a plain toggle would free the page while the modal underneath is still up. A derived check
   also cannot drift out of sync the way a counter can. */
var _scrollLockY=0, _scrollLockPad='';
function syncBodyScrollLock(){
  var body=document.body; if(!body||!body.classList) return;
  var want=!!document.querySelector('.modal-overlay.open');
  var have=body.classList.contains('scroll-locked');
  if(want===have) return;                                         // idempotent: reopening while open changes nothing
  if(want){
    _scrollLockY=window.pageYOffset||document.documentElement.scrollTop||0;
    var sbw=window.innerWidth-document.documentElement.clientWidth;   // desktop scrollbar: 0 on phones
    _scrollLockPad=body.style.paddingRight;
    if(sbw>0) body.style.paddingRight=((parseFloat(getComputedStyle(body).paddingRight)||0)+sbw)+'px';   // no content jolt when the bar disappears
    body.style.top=(-_scrollLockY)+'px';
    body.classList.add('scroll-locked');
  } else {
    body.classList.remove('scroll-locked');
    body.style.top='';
    body.style.paddingRight=_scrollLockPad;
    window.scrollTo(0,_scrollLockY);                              // exactly where they were — no jump on close
  }
}
/* ---- v137 (F1b): the modal/sheet primitive — one top layer, one trap, one way back ----

   THE TOP LAYER IS DERIVED FROM THE DOM, never from a list. The old Escape handler closed a
   hard-coded set of 8 ids, which broke in BOTH directions at once: Escape over a stacked confirm
   also closed everything listed underneath it, while 8 other modals had no Escape at all. Stacks
   are deliberate here (ingModal→confirm on product delete, kingWizModal→confirm on Add all,
   tidyManageModal→confirm) — #confirmModal carries z-index:85 for exactly that.
   F9 (v148) removed "Settings→confirm for clear-cache and restore" from that list, and the removal
   is the point rather than tidying: Settings is a SCREEN now, so those two confirms open over
   ordinary page content and cannot lose the z-index race at all. The rule is unchanged and the
   remaining examples are all still live.

   `topOverlay()` reads what the BROWSER would paint on top: highest computed z-index among the
   open overlays, tie-broken by document order, because equal z-index means the later sibling wins
   (the v44 finding that gave #confirmModal its own layer in the first place).

   WHAT THAT DOES AND DOES NOT GUARANTEE — worth stating, because the pre-push review read it the
   other way round. This function cannot disagree with the screen: it computes paint order by the
   same two rules the browser uses, so whatever it returns IS the layer on top. What it cannot do
   is rescue a modal that is painted in the wrong place to begin with. Fifteen of the eighteen
   overlays share z-index:80, so if a future flow opens an EARLIER-in-markup modal over a later
   one, the browser paints the new modal BEHIND the old — a rendering bug — and Escape would then
   correctly close the one actually on top, which is not the one the user just opened.
   No such flow exists today: every real stack either routes through #confirmModal (z-index:85,
   which always wins) or closes the first modal before opening the second (setSmemOpen and
   paPublish both do exactly that). The one genuine same-z stack, Tidy lists -> a tidy action, has
   the child later in the markup and is pinned in tests/visual/v137-modal-layer.spec.js against
   elementFromPoint. The residual hazard is a QUEUE ITEM, not a bug here: nothing makes markup
   order a rule a modal author has to follow.

   It closes through the overlay's own × rather than calling hide(), so each modal keeps its real
   close function: closeConfirm() clears __confirmFn (a bare hide() leaked them), closeKingWizard()
   syncs kingWizOpen, closeBuilder() keeps its semantics. That also makes this self-maintaining —
   a new modal with a × in its .mhead is covered by construction, which is the one thing a fixed
   list can never be. The scope is `.mhead > .x` and not `.x`: the builder's line-remove buttons
   are also `.x`. */
function topOverlay(){
  var open=document.querySelectorAll('.modal-overlay.open'), best=null, bestZ=-Infinity;
  for(var i=0;i<open.length;i++){
    var z=parseInt(getComputedStyle(open[i]).zIndex,10); if(!isFinite(z)) z=0;
    if(z>=bestZ){ bestZ=z; best=open[i]; }                        // >= so a later sibling at equal z wins, as it does on screen
  }
  return best;
}
function closeTopOverlay(){
  var el=topOverlay(); if(!el) return false;
  var x=el.querySelector('.mhead > .x');
  if(x){ x.click(); } else { closeOverlay(el); }                  // no × (none today) — still closes rather than trapping the user
  return true;
}

/* Focus: trap inside the top layer, and give it back when the layer goes.
   The app had neither — the only return-to-opener anywhere was the dashboard scope popover. */
var FOCUSABLE='a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function focusablesIn(el){
  if(!el) return [];
  return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function(n){
    if(n.closest('[aria-hidden="true"],[hidden]')) return false;
    return !!(n.offsetWidth||n.offsetHeight||n.getClientRects().length);   // visible only: these modals hide whole sections
  });
}
/* WHERE FOCUS LANDS: the first focusable, which in practice is the × in .mhead. Chosen over
   "the first form control", which reads better on paper:
     - this app lives on a phone, and auto-focusing an input pops the keyboard over a bottom
       sheet that is only 88dvh tall to begin with;
     - a modal that genuinely wants its field focused already does it AFTER show(), and that
       still wins because it runs later — openTidyRename has worked that way for versions.
   So the default is the predictable one and the exception stays where it already lives. */
function focusOverlay(el){
  var dlg=el.querySelector('.modal')||el, f=focusablesIn(dlg);
  var target=f[0]||dlg;
  if(target===dlg && !dlg.hasAttribute('tabindex')) dlg.setAttribute('tabindex','-1');
  try{ target.focus({preventScroll:true}); }catch(e){ try{ target.focus(); }catch(e2){} }
}
document.addEventListener('keydown',function(e){
  if(e.key!=='Tab') return;
  var el=topOverlay(); if(!el) return;
  var dlg=el.querySelector('.modal')||el;
  if(!dlg.contains(document.activeElement)){ e.preventDefault(); focusOverlay(el); return; }   // focus escaped (or never arrived) — pull it back
  var f=focusablesIn(dlg); if(!f.length) return;
  var first=f[0], last=f[f.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
},true);

function openOverlay(el){
  if(!el) return;
  var wasOpen=el.classList.contains('open');
  clearTimeout(el.__closeT); el.classList.remove('closing'); el.classList.add('open'); el.setAttribute('aria-hidden','false');
  syncBodyScrollLock();
  /* Only on a real open: reopening an already-open overlay (openOverlay is idempotent by design)
     must not overwrite the opener with something inside the modal itself. */
  if(!wasOpen){
    var opener=document.activeElement;
    el.__opener=(opener && opener!==document.body && !el.contains(opener)) ? opener : null;
    focusOverlay(el);
  }
}
function closeOverlay(el){
  if(!el) return;
  var wasOpen=el.classList.contains('open');
  el.setAttribute('aria-hidden','true');                          // a11y + logic: closed at once, whatever the visual does
  clearTimeout(el.__closeT);
  el.classList.remove('open');                                    // .open drops synchronously so every `.open` check + CSS layout sees it closed now
  syncBodyScrollLock();                                           // v87: BEFORE the reduced-motion early return, so both close paths release the page
  if(wasOpen){
    var opener=el.__opener; el.__opener=null;
    /* Return focus only if the opener still exists AND focus is still inside the layer we just
       closed — if something else has since claimed focus (a stacked modal, a re-render), stealing
       it back would be worse than leaving it. */
    if(opener && document.contains(opener) && (!document.activeElement || el.contains(document.activeElement) || document.activeElement===document.body)){
      try{ opener.focus({preventScroll:true}); }catch(e){ try{ opener.focus(); }catch(e2){} }
    }
    var under=topOverlay();                                       // a stack: hand focus back to the layer underneath
    if(under && !under.contains(document.activeElement)) focusOverlay(under);
  }
  if(!wasOpen || prefersReducedMotion()){ el.classList.remove('closing'); return; }
  el.classList.add('closing');                                    // .modal-overlay.closing re-asserts display + runs the fade-out (CSS §14)
  el.__closeT=setTimeout(function(){ el.classList.remove('closing'); }, 320);
}
function show(id){ openOverlay(document.getElementById(id)); }
function hide(id){ closeOverlay(document.getElementById(id)); }

function updateEditTag(){
  var t=document.getElementById('editTag');
  if(t){
    if(loadedPlateId){var sp=savedPlates.find(function(s){return s.id===loadedPlateId;});
      if(sp){t.textContent='Editing: '+(sp.name||'plate');t.style.display='inline';} else t.style.display='none';}
    else t.style.display='none';
  }
  updatePublishLabel();
}
function updatePublishLabel(){
  var t=document.getElementById('addMenuTitle'), s=document.getElementById('addMenuSub'); if(!t)return;
  var linkedId=(menuLinkEl&&menuLinkEl.value&&menuById[menuLinkEl.value])?menuLinkEl.value:'';
  if(linkedId){ t.textContent='Update Menu Item'; s.textContent='Updates “'+menuById[linkedId].name+'” on the menu'; }
  else { t.textContent='Publish to Menu'; s.textContent='Makes this a live menu item with pricing'; }
}

/* ---- word-level fuzzy menu matcher + live suggestions dropdown ---- */
function nmNorm(s){return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function nmPrefix(a,b){var n=Math.min(a.length,b.length),i=0;while(i<n&&a[i]===b[i])i++;return i;}
function scoreMenuName(query,m){
  var q=nmNorm(query); if(!q)return 0;
  var name=nmNorm(m.name); if(!name)return 0;
  if(name===q) return 1000;
  if(name.indexOf(q)>=0) return 600+Math.round(q.length/name.length*100);   // typed phrase inside the name
  if(q.indexOf(name)>=0) return 500;                                          // name inside typed phrase
  var qw=q.split(' ').filter(Boolean), nw=name.split(' ').filter(Boolean);
  if(!qw.length||!nw.length) return 0;
  var total=0, matched=0;
  qw.forEach(function(t){
    var best=0;
    nw.forEach(function(w){
      var s=0;
      if(w===t) s=100;
      else if(w.indexOf(t)===0) s=82;              // prefix: "bene" -> "benedict"
      else if(w.indexOf(t)>=0) s=64;               // substring
      else if(t.indexOf(w)>=0) s=52;               // typed word contains the menu word
      else { var p=nmPrefix(w,t); if(p>=3) s=24+p*4; }   // light typo tolerance
      if(s>best) best=s;
    });
    if(best>0){matched++; total+=best;}
  });
  if(!matched) return 0;
  return total*(matched/qw.length);                // reward covering more of the typed words
}
function platesLinkedMenuIds(){ var s={}; MENU.forEach(function(d){ if(plateIdOf(d)) s[d.id]=true; }); return s; }   // v55: dishes that already have a plate (so the suggest list doesn't offer both)
function rankLoadMatches(query){
  var q=nmNorm(query); if(q.length<2) return [];
  var out=[];
  savedPlates.forEach(function(sp){ var s=scoreMenuName(query,sp); if(s>=50) out.push({kind:'plate',item:sp,score:s}); });
  var linked=platesLinkedMenuIds();
  MENU.forEach(function(m){ if(linked[m.id]) return; var s=scoreMenuName(query,m); if(s>=50) out.push({kind:'menu',item:m,score:s}); });
  out.sort(function(a,b){ return b.score-a.score || (a.item.name||'').toLowerCase().localeCompare((b.item.name||'').toLowerCase()); });
  return out.slice(0,8);
}
function renderPlateSuggest(query){
  var box=document.getElementById('plateSuggest'); if(!box) return;
  var matches=rankLoadMatches(query);
  if(!matches.length){ box.style.display='none'; box.innerHTML=''; return; }   // no match -> treated as a new plate name
  box.innerHTML=matches.map(function(r){
    var it=r.item;
    if(r.kind==='plate'){
      var mi=plateMenuSummary(it);
      var n=(it.lines?it.lines.length:0);
      var sub=mi?('\u2194 '+esc(mi)):(n+' item'+(n===1?'':'s'));
      return '<div class="opt sug-opt" role="option" data-kind="plate" data-id="'+esc(it.id)+'"><span class="nm">'+esc(it.name||'Unnamed plate')+'</span><span class="ca">'+sub+'</span></div>';
    }
    return '<div class="opt sug-opt" role="option" data-kind="menu" data-id="'+esc(it.id)+'"><span class="nm">'+esc(it.name)+'</span><span class="ca">menu item \u00b7 no plate yet \u00b7 '+esc(it.section||'Uncategorised')+'</span></div>';
  }).join('');
  box.querySelectorAll('.sug-opt').forEach(function(o){
    o.addEventListener('mousedown',function(e){ e.preventDefault(); var id=o.getAttribute('data-id'); if(o.getAttribute('data-kind')==='menu') requestLoadMenuItem(id); else requestLoadPlate(id); });
  });
  box.style.display='block';
}
function loadMenuItemBlank(id){                              // v55: cost an uncosted dish -> open its (created+linked) plate
  var m=menuById[id]; if(!m) return;
  var sp=ensurePlateForDish(m); if(!sp) return;
  loadPlateState(sp.id); openBuilder();
  toast('Loaded menu item \u201c'+(m.name||'item')+'\u201d \u2014 add ingredients to cost it');
}
function requestLoadMenuItem(id){
  var m=menuById[id]; if(!m) return;
  if(isBuilderDirty()){ askConfirm('Load menu item','Load '+m.name+'? Unsaved changes will be lost.','Load',function(){ loadMenuItemBlank(id); }); }
  else loadMenuItemBlank(id);
}
function hidePlateSuggest(){ var b=document.getElementById('plateSuggest'); if(b){ b.style.display='none'; b.innerHTML=''; } }
function currentLinesSig(){ return plate.map(lineSig).join('|'); }
function isBuilderDirty(){
  var name=(document.getElementById('plateName').value||'').trim();
  var pcEl=document.getElementById('plateCat'), cat=(pcEl?pcEl.value:'')||'';
  if(plate.length===0 && !name) return false;
  if(loadedPlateId){
    var sp=savedPlates.find(function(s){return s.id===loadedPlateId;});
    if(!sp) return plate.length>0;
    var savedSig=(sp.lines||[]).map(lineSig).join('|');
    /* ⚠️ v118 — CATEGORY IS PART OF THE COMPARISON, and leaving it out became data loss the moment
       savePlateDraft started gating on this function. The category input has scheduled draft saves
       since v82 (see the plateCat listener), so a category-only edit is real unsaved work; while the
       draft gate was draftHasContent alone it was still written. Reading dirt without category would
       have made that edit vanish on × with no draft AND no "Unfinished plate" prompt - silent loss,
       and worse than the bug v118 set out to fix. The other callers (requestLoadPlate,
       requestLoadMenuItem, unfinishedPlateWaiting) all want it too: it is an unsaved change. */
    return savedSig!==currentLinesSig() || (sp.name||'')!==name || (sp.category||'')!==cat;
  }
  return plate.length>0;                                   // a new, unsaved plate with ingredients
}
function requestLoadPlate(id){
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return;
  if(isBuilderDirty()){
    askConfirm('Load plate', 'Load '+(sp.name||'plate')+'? Unsaved changes will be lost.', 'Load', function(){ loadPlate(id); });
  } else { loadPlate(id); }
}
(function(){var pn=document.getElementById('plateName'); if(!pn)return;
  pn.addEventListener('focus',function(){ renderPlateSuggest(pn.value); });
  pn.addEventListener('blur',function(){ setTimeout(hidePlateSuggest,150); });
})();
function hideMatchPrompt(){ hidePlateSuggest(); }

/* ---- load saved plates (via the plate-name search field, or a plate card) ---- */
// v54: set the builder state from a saved plate WITHOUT navigating — used both by loadPlate (which then
// opens the popup) and by the publish-from-card flow (which opens the publish modal instead).
function loadPlateState(id){
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return null;
  plate=[];                                                 // FULL clear first — never blend two plates
  sp.lines.forEach(function(l){ if(l&&l.misc){ plate.push({uid:uidc++,misc:true,label:l.label||'',cost:Number(l.cost)||0}); } else if(l&&l.kid){ plate.push({uid:uidc++,kid:l.kid,qty:l.qty}); } else if(byId[l.pid]) plate.push({uid:uidc++,pid:l.pid,qty:l.qty}); });
  document.getElementById('plateName').value=sp.name||'';
  var pc=document.getElementById('plateCat'); if(pc) pc.value=sp.category||'';   // §J
  menuTouched=false; if(typeof menuLinkEl!=='undefined'&&menuLinkEl) menuLinkEl.value=''; loadedPlateId=sp.id;   // v55: a plate carries no menu link
  hidePlateSuggest(); updateEditTag(); renderPlate();
  return sp;
}
function loadPlate(id){ var sp=loadPlateState(id); if(!sp) return; openBuilder(); toast('Loaded: '+(sp.name||'plate')); }

/* ===== v54: Plates tab (card library) + builder popup + card action menu ===== */
var ICON_PLATE_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v4"/><path d="M9 3v4"/><path d="M12 3v4"/><path d="M6 7h6"/><path d="M9 7v14"/><path d="M18 3v18"/><path d="M18 3c-2.2 0-3.5 3-3.5 6 0 1.5 1.3 2 3.5 2"/></svg>';   // v57: fork + knife (matches the Plates nav glyph)
// v55: a plate can be on MANY menus. The badge summarises them; the cost cell shows "not costed" for an
// empty plate (§B) rather than a misleading $0.00.
function plateMenuSummary(sp){ var on=menusOfPlate(sp); if(!on.length) return null; return on.length===1?on[0].name:(on.length+' menus'); }
function plateIsCosted(sp){ return !!(sp && sp.lines && sp.lines.length); }
/* F2 (v138) — the row's three facts as PLAIN TEXT, one function each, so desktop columns and the
   mobile meta line render the SAME string (§6.1: same names, same reading direction on both).
   platePubText keeps its leading capital for the desktop column; the mobile meta lowercases the
   first letter in CSS, which is the only difference the mock draws between the two. */
function platePubText(sp){ var s=plateMenuSummary(sp); return s?('On '+s):'Unpublished'; }
/* R1: the mock's word is "not costed"; the pre-v138 cell said "—" plus a "not costed yet" caption.
   ONE string on both breakpoints — the mock's own mobile row renders it "-", which would leave a
   bare dash carrying the meaning on the smaller screen. */
function plateCostText(sp){ return plateIsCosted(sp)?fmt2(costFromLines(sp.lines)):'not costed'; }
/* the mock's §3.3 header subtitle, computed rather than decorative: it counts the WHOLE library,
   not the filtered view, because it is a summary of what you own and not of what you searched. */
function plateHeadSummary(list){
  var n=list.length; if(!n) return '';
  var un=0, nc=0;
  list.forEach(function(sp){ if(!plateIsCosted(sp)) nc++; if(!menusOfPlate(sp).length) un++; });
  var bits=[n+' '+(n===1?'plate':'plates')];
  if(nc) bits.push(nc+' not costed');
  if(un) bits.push(un+' unpublished');
  return bits.join(', ');
}
function renderPlatesTab(){
  var wrap=document.getElementById('plateList'); if(!wrap) return;
  var sub=document.getElementById('plateHeadSub'); if(sub) sub.textContent=plateHeadSummary(savedPlates);
  var note=document.getElementById('plateListNote');
  var showNote=function(on){ if(note) note.hidden=!on; };
  /* The controls go with the true-empty state: there is nothing to search and `fillFilter` runs
     only on the rows-present branch, so the category select would render with no options at all -
     a control that does nothing, which §R4 forbids as firmly as an invented one. The FILTERED
     empty state keeps them, because clearing the filter is the way out of it. */
  var ctl=document.getElementById('plateControls');
  var showControls=function(on){ if(ctl) ctl.hidden=!on; };
  if(!savedPlates.length){
    showNote(false); showControls(false);
    /* §5's empty state, v3 copy: bold one-liner + how + one primary. It is also this screen's
       FIRST-RUN state - §5 makes the empty states the onboarding path, so there is no second
       variant and no stored flag deciding between them. */
    wrap.innerHTML=emptyStateHtml(ICON_PLATE_BIG,'Cost your first plate','Add the ingredients a plate uses and EzPlate works out what it costs you.',
      '<button class="btn primary" type="button" onclick="openBuilderNew()">New plate</button>');
    return;
  }
  showControls(true);
  fillFilter(document.getElementById('plateCatFilter'), plateCategories(), 'All categories');   // §J
  var q=(document.getElementById('plateSearch')?document.getElementById('plateSearch').value:'').trim().toLowerCase();
  var toks=searchTokens(q);   // v59: shared token matcher
  var cat=(document.getElementById('plateCatFilter')||{}).value||'';   // §J
  var cf=document.getElementById('plateClearFilters'); if(cf) cf.style.display=(q||cat)?'':'none';
  var items=savedPlates.filter(function(sp){
    if(cat && (sp.category||'')!==cat) return false;
    if(!toks.length) return true;
    return matchTokens(toks, ((sp.name||'')+' '+(sp.category||'')+' '+(plateMenuSummary(sp)||'')).toLowerCase());
  }).slice().sort(function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());});
  if(!items.length){ showNote(false); wrap.innerHTML=emptySearchState(ICON_PLATE_BIG,'plates','clearPlateFilters'); return; }   // v58: variant A via the shared helper
  showNote(true);
  /* The column band labels the desktop table (mock §3.3) and is emitted on the rows-present branch
     only — a band over an empty state labels nothing. aria-hidden because each row announces its
     own name, state and cost; the band is visual wayfinding, not the accessible structure. */
  var band='<div class="plib-band" aria-hidden="true"><span>Plate</span><span>Published</span><span class="plib-bnum">Plate cost</span></div>';
  wrap.innerHTML=band+items.map(function(sp){
    var pub=platePubText(sp), on=(pub!=='Unpublished');
    /* ONE set of four facts, reflowed by CSS: desktop reads them across three columns
       (name·category / published / cost), mobile stacks category+published as the meta line
       under the name (§6.1 - the reading direction never changes, only the wrapping).
       .plib-id groups name+category into ONE desktop grid cell and dissolves on mobile. */
    return '<button class="plib-row" type="button" data-pid="'+esc(sp.id)+'">'
      +'<span class="plib-id"><span class="plib-name">'+esc(sp.name||'Unnamed plate')+'</span>'
      +(sp.category?'<span class="plib-cat">'+esc(sp.category)+'</span>':'')+'</span>'
      +'<span class="plib-pub'+(on?' is-on':'')+'">'+esc(pub)+'</span>'
      +'<span class="plib-cost'+(plateIsCosted(sp)?'':' is-nil')+'">'+esc(plateCostText(sp))+'</span>'
      +'</button>';
  }).join('');
  /* R2, and F7 changes this consciously: the row opens the ACTION CHOOSER, not the builder. The
     mock's row-click goes straight to the builder, but publishing/printing/deleting live in the
     chooser. F7 (v146) FLIPS IT, as that note said it would: the chooser is gone and the row opens
     the builder, which is the mock's §3.3 behaviour. Nothing orphaned - publishing, printing and
     deleting all live on the builder page now. tests/visual/v138-plates.spec.js is updated in the
     same change rather than deleted (protocol §4). */
  wrap.querySelectorAll('.plib-row').forEach(function(b){ b.onclick=function(){ editPlateFromCard(b.getAttribute('data-pid')); }; });
}
/* ---- the builder PAGE (a modal from v54 to v145; the 9 Aug 2026 reversal made it a page) ---- */
/* It is not a tab: `data-tab="builder"` is the Plates library and does not move. openBuilder hides
   the five panes and shows #builderPage; the Plates nav item stays lit, which is what the mobile
   mock's own tab logic does. LEAVING BY TAPPING ANOTHER TAB is allowed and loses nothing - it is
   exactly what pressing × did from v54 to v145: the work stays in memory and in the draft, and
   guardUnfinishedPlate offers it back at the next entry. showTab hides this page for that reason. */
function builderPageEl(){ return document.getElementById('builderPage'); }
function builderIsOpen(){ var el=builderPageEl(); return !!(el && !el.hidden); }
/* F7 (v146) — FOCUS, which the page has to do for itself.
   Every overlay in this app gets focus handling free from openOverlay/closeOverlay: they capture
   the opener, move focus into the layer and hand it back on close. A page is not an overlay, so
   the rewrite silently dropped all three - the F7 pre-push review measured `document.activeElement`
   landing on <body> in BOTH directions, because the opener's own pane is one of the five that
   openBuilder hides. For a keyboard or screen-reader user every entry and exit stranded focus at
   the top of the document. The two functions below are the page's equivalent, deliberately small:
   remember the opener, put focus on the page's first control, hand it back if it still exists. */
var _builderOpener=null;
function focusBuilderPage(){
  var pg=builderPageEl(); if(!pg) return;
  var target=document.getElementById('builderClose') || pg.querySelector('input,button,select,[tabindex]');
  if(target){ try{ target.focus({preventScroll:true}); }catch(e){ try{ target.focus(); }catch(e2){} } }
}
function openBuilder(){ armDraftSaves();                              // v84: the user is now IN the builder — draft saves are live from here (see armDraftSaves)
  if(typeof makeInlineCombo==='function'){ var d=document.getElementById('plateCatDrop'); if(d)d.style.display='none'; makeInlineCombo('plateCat','plateCatDrop',plateCategories); }
  TAB_PANES.forEach(function(name){ var el=document.getElementById('tab-'+name); if(el) el.style.display='none'; });   // F10 (v149): the SHARED list — a pane missing here renders UNDER the builder page, which is a sibling in normal flow, not an overlay
  /* the opener is captured BEFORE the panes are hidden - hiding the pane it lives in is what
     drops focus, so reading activeElement afterwards would only ever find <body>. */
  var _op=document.activeElement;
  if(!builderIsOpen()) _builderOpener=(_op && _op!==document.body)?_op:null;
  var pg=builderPageEl(); if(pg) pg.hidden=false;
  document.querySelectorAll('.navbtn').forEach(function(b){ b.classList.toggle('active', b.dataset.tab==='builder'); });   // the Plates entry stays lit while its child page is open
  setBuilderSaved(false);
  syncBuilderPlateActions();                                          // nothing to duplicate or delete until a plate is saved
  // v61 item 2: every open (New AND Edit) starts at the top — the page can otherwise retain the previous session's scroll position
  try{ window.scrollTo(0,0); }catch(e){}
  focusBuilderPage();
  /* Q6 (v125): refresh the cost panel on EVERY open. Three of the four open paths re-render anyway,
     but resumeUnfinishedPlate's same-session branch calls openBuilder alone — a dish price, menu or
     target changed while the builder was hidden would otherwise show stale (the v125 review's
     scenario). Safe against the v118 draft trap: savePlateDraft gates on isBuilderDirty, so this
     writes no draft on a look-only visit. */
  updateTotals();
}
function closeBuilder(){
  var pg=builderPageEl(); if(pg) pg.hidden=true;
  if(typeof hidePlateSuggest==='function') hidePlateSuggest();
  showTab('builder');                                                 // back to the Plates library, the page this one is a child of
  /* Hand focus back, on the same terms closeOverlay uses: only if the opener still exists, and
     only if nothing else has claimed focus in the meantime. A row that was re-rendered by the
     save is gone from the document, so the fallback is the control that gets you back in. */
  var op=_builderOpener; _builderOpener=null;
  var ae=document.activeElement;
  if(!ae || ae===document.body || (pg && pg.contains(ae))){
    var t=(op && document.contains(op)) ? op : document.getElementById('newPlateBtn');
    if(t){ try{ t.focus({preventScroll:true}); }catch(e){ try{ t.focus(); }catch(e2){} } }
  }
}
/* "Saved just now" is the mock's, and it renders ONLY when the server has confirmed the write -
   never optimistically. An occasional user on mobile data would rather be told a thing did not
   save than find out next week; pushWrite already toasts the failure, so this line's job is to
   stop CLAIMING success. Any subsequent edit clears it, because it would then be describing a
   state that is no longer on the server. */
function setBuilderSaved(on){
  var el=document.getElementById('bldSaved'); if(!el) return;
  el.hidden=!on; el.textContent=on?'Saved just now':'';
}
/* F7 (v146) — ONE owner for the two controls that only mean anything on a SAVED plate.
   ⚠️ It must be called from every path that changes `loadedPlateId`, not just the ones that open
   the page. The F7 pre-push review found the gap: "Clear plate" is the app's explicit discard, it
   sets loadedPlateId=null, and it is nowhere near openBuilder - so both buttons stayed visible and
   both became silent no-ops (duplicateCurrentPlate returns on `if(!sp)`, the delete handler is
   gated on loadedPlateId). A visible control that does nothing is exactly what §R4 forbids, and
   two separate `hidden=` assignments per call site is how it happened. */
function syncBuilderPlateActions(){
  var on=!!loadedPlateId;
  var dup=document.getElementById('bldDuplicate'); if(dup) dup.hidden=!on;
  var del=document.getElementById('bldDelete'); if(del) del.hidden=!on;
}
/* v85 — the two builder entries that REPLACE its contents ("+ New plate", "Edit plate" from a card)
   used to bin unfinished work in silence: press ×, go to the Ingredients tab, come back and tap
   "+ New plate", and the in-progress plate was gone — along with its stored draft (the empty render
   removed the slot 250ms later), so even reloading couldn't get it back. The app ALREADY guards its
   other two builder entries this way (requestLoadPlate / requestLoadMenuItem, via isBuilderDirty);
   these two simply never got it. Same Resume/Discard choice as the boot offer, so the question reads
   the same wherever it's asked, and a stray dismiss does nothing. */
function unfinishedPlateWaiting(){ return isBuilderDirty() || draftHasContent(readPlateDraft()); }   // this session, or a draft whose boot offer was dismissed
function unfinishedPlateLabel(){
  var el=document.getElementById('plateName'), nm=(el?el.value:'')||'';
  if(!nm.trim()){ var d=readPlateDraft(); nm=(d&&d.name)||''; }
  return nm.trim()?('“'+nm.trim()+'”'):'a plate';
}
function resumeUnfinishedPlate(){
  if(isBuilderDirty()){ openBuilder(); return; }                     // same session: × only hid the popup, the work is still loaded
  var d=readPlateDraft(); if(draftHasContent(d)) resumePlateDraft(d);
}
function guardUnfinishedPlate(proceed){
  if(!unfinishedPlateWaiting()){ proceed(); return; }
  askConfirm('Unfinished plate', 'You were building '+unfinishedPlateLabel()+'. Resume it, or discard it and carry on?',
    'Resume', resumeUnfinishedPlate, 'Discard', function(){ clearPlateDraft(); proceed(); });
}
function openBuilderNew(){ guardUnfinishedPlate(startNewPlate); }    // + New plate, guarded
function startNewPlate(){                                            // open the popup on an empty, unlinked plate
  plate=[]; loadedPlateId=null; menuTouched=false;
  var pn=document.getElementById('plateName'); if(pn) pn.value='';
  var pc=document.getElementById('plateCat'); if(pc) pc.value='';   // §J
  var pe=document.getElementById('plateNameErr'); if(pe) pe.style.display='none';
  if(typeof menuLinkEl!=='undefined' && menuLinkEl) menuLinkEl.value='';
  var qq=document.getElementById('q'); if(qq) qq.value='';
  if(typeof hideMatchPrompt==='function') hideMatchPrompt();
  if(typeof hidePlateSuggest==='function') hidePlateSuggest();
  updateEditTag(); syncBuilderPlateActions(); renderPlate(); openBuilder();
}
/* F7 (v146) tombstone: openPlateActions / closePlateActions / paTargetId lived here and drove
   #plateActionsModal, the v54 chooser a plate row used to open. Both are deleted. All four of its
   actions were REHOMED, none dropped: Edit is now the row click itself (below), Add-to-a-menu is
   the builder's Publishing card, Print docket and Delete plate are the builder's rail actions.
   ⚠️ `paPublish` was one of CLAUDE.md's two worked examples of "closes the first modal before
   opening the second"; the other, setSmemOpen, is untouched and still is one. */
function editPlateFromCard(pid){ guardUnfinishedPlate(function(){ loadPlate(pid); }); }   // v85: guarded — same silent-loss path as "+ New plate"
/* F7 (v146) — Duplicate, the mock's §3.7 header action. Clones the LINES and the CATEGORY into a
   new, unsaved plate and leaves you in the builder on it.
   The publish state is deliberately NOT copied: a copy published to the same menu would put two
   rows of the same dish on it. The unsaved-work guard runs BEFORE the clone, not after, so the
   plate being duplicated is never the thing the guard is asking about. */
function duplicateCurrentPlate(){
  var sp=loadedPlateId?savedPlates.find(function(s){return s.id===loadedPlateId;}):null; if(!sp) return;
  var lines=(sp.lines||[]).slice(), cat=sp.category||'', nm=(sp.name||'Plate')+' (copy)';
  guardUnfinishedPlate(function(){
    plate=[]; loadedPlateId=null; menuTouched=false;
    lines.forEach(function(l){ if(l&&l.misc){ plate.push({uid:uidc++,misc:true,label:l.label||'',cost:Number(l.cost)||0}); } else if(l&&l.kid){ plate.push({uid:uidc++,kid:l.kid,qty:l.qty}); } else if(byId[l.pid]) plate.push({uid:uidc++,pid:l.pid,qty:l.qty}); });
    var pn=document.getElementById('plateName'); if(pn) pn.value=nm;
    var pc=document.getElementById('plateCat'); if(pc) pc.value=cat;
    var pe=document.getElementById('plateNameErr'); if(pe) pe.style.display='none';
    if(typeof hidePlateSuggest==='function') hidePlateSuggest();
    updateEditTag(); renderPlate(); openBuilder();
    toast('Duplicated — save it to keep the copy');
  });
}
/* v55: delete a plate AND every menu entry backed by it. Products/ingredients are untouched (§D1 copy).
   F7 (v146): `onRemoved` fires once the optimistic removal has happened and the screen has been
   repainted - it is how the builder page leaves itself when you delete the plate it is editing.
   It must NOT be called before the confirm is taken, and it is deliberately not called again if the
   server rejects the delete: the rollback puts the plate back in the library and says so in a toast,
   which is a better place to be than re-entering a builder the user has just left. */
function deletePlate(id, onRemoved){
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return;
  var nm=sp.name||'plate'; var on=menusOfPlate(sp);
  var msg=on.length
    ? ('Delete “'+nm+'”? It’s on '+on.map(function(o){return o.name;}).join(', ')+' — the plate and those menu entries are removed. Your products and ingredients are untouched.')
    : ('Delete “'+nm+'”? The plate is removed. Your products and ingredients are untouched.');
  askConfirm('Delete plate?', msg, 'Delete', function(){
    var dishes=dishesOfPlate(sp).slice();                            // every menu entry that used this plate
    var dishIds=dishes.map(function(d){ return d.id; });
    var wasLoaded=(loadedPlateId===id);
    var repaint=function(){ rebuildMenu(); buildMenuOptions(); buildMenuSelector(); updateEditTag(); renderPlate(); renderAnalysis(); renderPlatesTab(); };
    /* v114 — the log entry goes in the SUCCESS branch, and on this path that is not a stylistic
       preference. A partial failure here rolls the delete back (v112), and the log is append-only with
       no update and no delete at the policy level, so an entry written optimistically could never be
       retracted: the log would permanently record a plate deletion that did not happen. */
    var avgBefore=computeAvgFoodCost(), menuIds=on.map(function(o){ return o.menuId; }), lineCount=(sp.lines||[]).length;
    forgetMenuItems(dishIds);
    savedPlates=savedPlates.filter(function(s){return s.id!==id;});
    if(wasLoaded) loadedPlateId=null;
    repaint();                                                       // the screen keeps up; the WORDS wait for the server
    if(typeof onRemoved==='function') onRemoved();
    dbDeletePlateAfterDishes(dishIds, id).then(function(r){
      if(r.dishesOk && r.plateOk){
        logChange('plate_deleted', {plateId:id, menuIds:menuIds, avgBefore:avgBefore,
          detail:{name:nm, dishes:dishIds.length, lines:lineCount}});
        logHistory();   // v115 path 11: success-gated, unlike the optimistic call sites — the in-memory delete precedes the await (the avg is already the AFTER figure), and an optimistic point would survive rollbackPlateDelete as a phantom drop
        toast('“'+nm+'” deleted'); return;
      }
      rollbackPlateDelete(sp, wasLoaded, dishes, r, repaint, nm);
    });
  });
}
/* v112 — honest failure. pushWrite has already named the underlying error; this puts the UI back to the
   state the SERVER is actually in, so the screen can never show a delete that did not happen. A dish
   whose delete FAILED is restored; one that succeeded stays gone. The plate comes back only if it is
   still on the server, which it is in both failure shapes: a dish failure means we never tried it. */
function rollbackPlateDelete(sp, wasLoaded, dishes, r, repaint, nm){
  if(!r.dishesOk){
    var back={}; r.failedDishIds.forEach(function(id){ back[id]=1; });
    dishes.forEach(function(d){ if(back[d.id]) customMenu.push(d); });
  }
  savedPlates.push(sp);
  if(wasLoaded) loadedPlateId=sp.id;
  repaint();
  toast(r.dishesOk
    ? '“'+nm+'” was removed from the menu, but the plate couldn’t be deleted — it’s still in your Plates library.'
    : 'Couldn’t delete “'+nm+'” — it has NOT been deleted.');
}
/* ---- Manage menus: a plate can be published to any number of menus, each its own price/category ---- */
var manageMenusPid=null;
function openManageMenus(pid){
  var sp=savedPlates.find(function(s){return s.id===pid;}); if(!sp) return;
  manageMenusPid=pid;
  var t=document.getElementById('manageMenusTitle'); if(t) t.textContent=sp.name||'Plate';
  renderManageMenus(); show('manageMenusModal');
}
function closeManageMenus(){ hide('manageMenusModal'); manageMenusPid=null; }
function renderManageMenus(){
  var box=document.getElementById('mmList'); if(!box) return;
  var sp=savedPlates.find(function(s){return s.id===manageMenusPid;}); if(!sp){ box.innerHTML=''; return; }
  if(!menusList.length){ box.innerHTML='<div class="mm-empty">No menus yet — create one on the Menu tab first, then publish this plate to it.</div>'; return; }
  var onById={}; menusOfPlate(sp).forEach(function(o){ onById[o.menuId]=o; });
  box.innerHTML=menusList.map(function(m){
    var o=onById[m.id];
    return '<div class="mm-row"><span class="mm-name">'+esc(m.name)+'</span>'
      +(o ? '<span class="mm-price">'+fmt2(o.price)+'</span><button class="btn ghost mm-remove" type="button" data-dish="'+esc(o.dishId)+'">Remove</button>'
          : '<button class="btn mm-add" type="button" data-mid="'+esc(m.id)+'">Add</button>')
      +'</div>';
  }).join('');
  box.querySelectorAll('.mm-add').forEach(function(b){ b.onclick=function(){ openPublishModal(manageMenusPid, b.getAttribute('data-mid')); }; });
  box.querySelectorAll('.mm-remove').forEach(function(b){ b.onclick=function(){ mmRemove(b.getAttribute('data-dish')); }; });
}
function mmRemove(dishId){
  var m=menuById[dishId]; if(!m) return;
  var avgBefore=computeAvgFoodCost(), plateId=plateIdOf(m), mid=(m.menuId||'MENU_ORIGINAL'), nm=m.name;
  var write=removeMenuItem(dishId);
  rebuildMenu(); buildMenuOptions(); buildMenuSelector(); renderAnalysis(); renderPlatesTab(); renderManageMenus();
  logChangeIfSaved(write, 'dish_removed', {plateId:plateId, dishId:dishId, menuIds:[mid], avgBefore:avgBefore,
    detail:{name:nm||null, price:m.price, via:'manage-menus'}});
  logHistory();   // v115 path 10: after rebuildMenu() — computeAvgFoodCost reads MENU, which is stale until then
  toast('Removed from the menu — plate kept');
}
(function(){                                                         // Plates-tab + builder-page wiring
  var nb=document.getElementById('newPlateBtn'); if(nb) nb.addEventListener('click',openBuilderNew);
  var bc=document.getElementById('builderClose'); if(bc) bc.addEventListener('click',closeBuilder);
  var ps=document.getElementById('plateSearch'); if(ps){ ps.addEventListener('input',renderPlatesTab); ps.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ps.blur(); } }); }
  var psc=document.getElementById('plateSearchClear'); if(psc) psc.addEventListener('click',function(){ if(ps){ ps.value=''; renderPlatesTab(); ps.focus(); } });
  var pcf=document.getElementById('plateCatFilter'); if(pcf) pcf.addEventListener('change',renderPlatesTab);   // §J category filter
  var pcc=document.getElementById('plateClearFilters'); if(pcc) pcc.addEventListener('click',clearPlateFilters);   // v58: same helper the empty-state action uses
  // F7 (v146): the four rehomed actions. Delete leaves the page, because the plate it was editing
  // no longer exists — staying would leave the builder holding a deleted id.
  var bd=document.getElementById('bldDuplicate'); if(bd) bd.addEventListener('click',duplicateCurrentPlate);
  var bdel=document.getElementById('bldDelete'); if(bdel) bdel.addEventListener('click',function(){ if(loadedPlateId) deletePlate(loadedPlateId, closeBuilder); });
  var mmc=document.getElementById('manageMenusClose'); if(mmc) mmc.addEventListener('click',closeManageMenus);
  var mmd=document.getElementById('manageMenusDone'); if(mmd) mmd.addEventListener('click',closeManageMenus);
})();

/* ---- publish a plate to a menu (create/update a menu_items entry pointing at the plate via plate_id) ---- */
// v55: the FK now runs menu_items.plate_id -> plates.id, so the DISH write must land AFTER the plate is on
// the server (the reverse of the old v40 sequencing). The plate is normally already synced; we re-push it
// (idempotent) and chain the dish after, so a plate whose offline push was dropped can't orphan the dish.
function dbPushMenuAfterPlate(item, sp){
  var platePush = sp ? dbPushPlate(sp) : null;
  if(!platePush) return dbPushMenu(item);
  return Promise.resolve(platePush).then(function(res){ if(!res || res.error){ return null; } return dbPushMenu(item); });
}
/* v112 — the DELETE-side twin, and the same fragile-area rule read backwards.
   `menu_items.plate_id -> plates.id` carries NO delete action, so Postgres rejects (SQLSTATE 23503) any
   attempt to remove a plates row while a dish still points at it. deletePlate and doDeleteEverything used
   to fire the dish deletes and the plate delete as unawaited pushWrites in one synchronous burst: the
   DISPATCH order was right, the COMMIT order was not, so the plate delete could land first and be
   rejected — intermittently, which is why it presented as "sometimes broken" rather than as a bug.
   Deletes run in the mirror image of writes: on the way IN the referenced row lands first (plate, then
   dish); on the way OUT the referencing rows go first (dishes, then plate).
   Reports per-dish outcomes because the caller has to roll back to the state the SERVER is actually in,
   and a partial failure across N dishes is a real outcome, not a binary one.

   The rejection handlers are deliberate belt-and-braces. `pushWrite` catches its own errors and always
   RESOLVES, so today nothing here can reject — but if one ever did, this function would reject, the
   caller's `.then` would never run, and the UI would sit in the optimistic "deleted" state with no
   rollback and no word to the user. That is precisely the silent failure v108 removed from the app, so
   the honest-failure guarantee is made unconditional rather than left resting on pushWrite's internals. */
function dbDeletePlateAfterDishes(dishIds, plateId){
  var ids=dishIds||[];
  var killPlate=function(){
    return Promise.resolve(dbDeletePlate(plateId)).then(function(r){
      return {dishesOk:true, failedDishIds:[], plateOk:!!(r && !r.error)};
    }, function(){ return {dishesOk:true, failedDishIds:[], plateOk:false}; });
  };
  if(!ids.length) return killPlate();
  return Promise.all(ids.map(function(id){
    return Promise.resolve(dbDeleteMenu(id)).then(function(r){ return {id:id, ok:!!(r && !r.error)}; },
                                                 function(){ return {id:id, ok:false}; });
  })).then(function(res){
    var failed=res.filter(function(x){ return !x.ok; }).map(function(x){ return x.id; });
    if(failed.length) return {dishesOk:false, failedDishIds:failed, plateOk:false};   // the plate is NOT touched
    return killPlate();
  });
}
var pubPlateId=null;
function openPublishModal(plateId, presetMenuId){
  var sp=savedPlates.find(function(s){return s.id===plateId;}); if(!sp) return;
  if(!menusList.length){ toast('Create a menu first, then publish into it'); if(typeof openNewMenuModal==='function') openNewMenuModal(); return; }
  pubPlateId=plateId;
  document.getElementById('mi_name').value=sp.name||'';
  document.getElementById('mi_price').value='';
  document.getElementById('mi_notes').value='';
  document.getElementById('mi_cat').value=sp.category||'';
  buildMenuPickers(); var miMenu=document.getElementById('mi_menu'); if(miMenu){ var wantM=(presetMenuId&&menusList.some(function(m){return m.id===presetMenuId;}))?presetMenuId:currentMenuId; if(menusList.some(function(m){return m.id===wantM;})) miMenu.value=wantM; }
  catState.chosen=sp.category||null; catState.chosenIsNew=false;
  document.getElementById('mi_catDrop').style.display='none'; document.getElementById('mi_catNew').style.display='none';
  document.getElementById('mi_err').style.display='none';
  var titleEl=document.getElementById('menuModalTitle'), saveEl=document.getElementById('menuSave');
  if(titleEl) titleEl.textContent='Add to menu'; if(saveEl) saveEl.textContent='Add to menu';
  renderMenuMarginPreview();                                        // v82 item 3: show cost + suggested price up front
  renderPubUnlinked();                                              // v113: only draws if the chosen menu holds an unlinked dish
  show('menuModal');
}
/* v113: the prompt is about the CHOSEN menu, so it follows the picker. buildMenuPickers only rewrites the
   select's innerHTML, never the element, so this listener survives every rebuild. */
function renderPubUnlinked(){
  var miMenu=document.getElementById('mi_menu');
  var mid=(miMenu&&miMenu.value)?miMenu.value:currentMenuId;
  renderUnlinkedPrompt('mi_unlinked', pubPlateId, mid, function(d){
    var sp=savedPlates.find(function(s){return s.id===pubPlateId;}); if(!sp) return;
    linkDishToPlate(d, sp); closeMenuModal();
  });
}
(function(){ var mm=document.getElementById('mi_menu'); if(mm) mm.addEventListener('change', renderPubUnlinked); })();
(function(){ var mp=document.getElementById('mi_price'); if(mp) mp.addEventListener('input', renderMenuMarginPreview); })();   // v82 item 3: live margin as the price is typed
function closeMenuModal(){hide('menuModal');}
/* v82 item 3 — live margin at the point of pricing. The Add-to-menu dialog used to demand a sell price
   while showing NO resulting cost %, margin or light until the dish was committed AND the Menu tab opened —
   the user priced blind, though margin-at-the-decision is EzPlate's whole reason to exist. menuMarginPreview
   REUSES analyze() (the exact cost/target/light logic the Menu table uses — not a reimplementation), so the
   preview and the resulting Menu row can never disagree. Pure, so it's testable against analyze directly. */
function menuMarginPreview(cost, price){
  var a=analyze(cost, price);
  return {cost:cost, price:(price>0?price:null), suggested:a.suggested, light:a.light,
          pct:(cost>0&&price>0)?Math.round(cost/price*100):null};
}
/* The PRICE against the suggested price — a different subject from the Menu cell's cost-vs-target
   wording and from the filter chips' action wording, which is why all three say different things
   about the same amber. Decided deliberate in F8 (v147); the reasoning is written out once, at
   vbadge. Do not "unify" these three without reading it. */
function marginLightWord(light){ return light==='green'?'Healthy margin':light==='amber'?'Slightly under':light==='red'?'Underpriced':''; }
function renderMenuMarginPreview(){
  var box=document.getElementById('mi_preview'); if(!box) return;
  var sp=savedPlates.find(function(s){return s.id===pubPlateId;});
  var cost=sp?costFromLines(sp.lines):0;
  if(!(cost>0)){ box.className='margin-preview'; box.textContent=''; return; }   // uncosted plate → nothing to preview yet
  var priceV=parseFloat((document.getElementById('mi_price')||{}).value);
  var mp=menuMarginPreview(cost, priceV);
  if(mp.pct==null){                                                             // no price yet: show the cost + the target-based suggestion
    box.className='margin-preview';
    box.innerHTML='Ingredient cost <b>'+fmt2(cost)+'</b> · suggested <b>'+fmt2(mp.suggested)+'</b> at a '+cogsPct+'% food cost';
    return;
  }
  box.className='margin-preview mp-'+mp.light;
  box.innerHTML='<span class="dot '+mp.light+'"></span>Ingredient cost <b>'+fmt2(cost)+'</b> · at <b>'+fmt2(mp.price)+'</b> → <b>'+mp.pct+'% food cost</b> · '+marginLightWord(mp.light);
}
/* v113 — one inline prompt, shared by both dish-creating modals. Deliberately NOT a new screen or modal:
   this fires for zero dishes in production today and is a guard against silent recurrence, not a feature.
   Both options are visible and neither is preselected — a Link button per unlinked dish, and the modal's
   own primary button, which still adds a new entry exactly as before. When the menu holds no unlinked
   dish (the normal case) nothing renders and the user sees nothing at all. */
function renderUnlinkedPrompt(boxId, plateId, menuId, onLink){
  var box=document.getElementById(boxId); if(!box) return;
  box.innerHTML=''; box.style.display='none';
  // Read the list off the SAME decision the submit path uses, never a second computation of it — that is
  // the whole reason publishPlan exists. It also settles the case a browser check turned up: when this
  // plate is already on this menu the button UPDATES that entry rather than duplicating anything, so
  // there is no question to put, however many unlinked rows the menu happens to hold.
  var list=publishPlan(MENU, plateId, menuId).unlinked;
  if(!list.length) return;
  // NB: "dish" is not a UI noun here (CLAUDE.md — a plate on a menu is still a plate), so this copy
  // describes the menu row without naming a fifth object. tests/terminology.test.js pins it.
  var html='<p class="up-lead">'+(list.length===1
      ? 'One entry on this menu isn’t linked to a plate, so it shows no cost. If that’s what you’re adding here, link it rather than creating a second one.'
      : list.length+' entries on this menu aren’t linked to a plate, so they show no cost. If one of them is what you’re adding here, link it rather than creating a second one.')+'</p>';
  list.forEach(function(d,n){
    html+='<div class="up-row"><span><span class="up-name">'+esc(d.name||'Untitled')+'</span> '
        + '<span class="up-meta">'+esc(d.section||'Uncategorised')+' · '+fmt2(d.price||0)+'</span></span>'
        // NOT .ghost: that is a transparent background AND a transparent border, which on this amber
        // field renders as a line of centred text rather than a control. Seen at 380px, not guessed.
        + '<button class="btn small up-link" type="button" data-n="'+n+'">Link to this one</button></div>';
  });
  html+='<p class="up-foot">Or ignore this and add a new entry as usual.</p>';
  box.innerHTML=html; box.style.display='block';
  box.querySelectorAll('.up-link').forEach(function(b){
    b.onclick=function(){ var d=list[parseInt(b.getAttribute('data-n'),10)]; if(d) onLink(d); };
  });
}
/* Link an existing, unlinked dish to this plate. The dish keeps its OWN name, price and section: it is
   already priced on that menu, and repricing it from whatever happens to be typed in the modal would be
   the app deciding something it was not asked to. The dish REFERENCES the plate, so the write is
   sequenced after it (menu_items.plate_id → plates.id — see dbPushMenuAfterPlate). */
function linkDishToPlate(dish, sp){
  if(!dish||!sp) return null;
  var i=customMenu.findIndex(function(c){return c.id===dish.id;});
  var item=Object.assign({}, (i>=0?customMenu[i]:dish), {plateId:sp.id});
  // v114: an uncosted row becoming costed is the single largest one-step move the food-cost average can
  // make, and nothing about it is a supplier price. Its own kind, because it is not a new entry on the
  // menu — the row was already there, already priced — and a chart that read it as one would show a
  // plate arriving on a menu it had been on for months.
  var avgBefore=computeAvgFoodCost();
  if(i>=0) customMenu[i]=item; else customMenu.push(item);
  var write=dbPushMenuAfterPlate(item, sp);
  rebuildMenu(); buildMenuOptions();
  logChangeIfSaved(write, 'dish_linked', {plateId:sp.id, dishId:item.id, menuIds:[item.menuId||'MENU_ORIGINAL'],
    avgBefore:avgBefore, costAfter:costFromLines(sp.lines), detail:{name:item.name||null, price:item.price, plate:sp.name||null}});
  // Follow the menu we just acted on, exactly as submitMenuItem does. The Publish modal can target a
  // menu other than the one on screen, so without this the user links a row and is left looking at a
  // different menu, with nothing visibly changed. (CodeRabbit, v113.)
  setCurrentMenuId(item.menuId||'MENU_ORIGINAL'); buildMenuSelector();
  logHistory();                                                   // the dish now has a cost — the menu average and its price log move
  renderAnalysis(); renderPlatesTab();
  // openPublishModal is often reached FROM Manage menus, which would otherwise sit behind this showing
  // the pre-link state. Same refresh submitMenuItem does, and a no-op when that modal isn't open.
  var mm=document.getElementById('manageMenusModal'); if(mm && mm.classList.contains('open')) renderManageMenus();
  toast('“'+(item.name||'Untitled')+'” is now costed from this plate — its menu price is unchanged.');
  return item;
}
function submitMenuItem(){
  var sp=savedPlates.find(function(s){return s.id===pubPlateId;});
  var err=document.getElementById('mi_err');
  if(!sp){ if(err){err.textContent='That plate is no longer available.';err.style.display='block';} return; }
  var name=document.getElementById('mi_name').value.trim();
  var typedCat=document.getElementById('mi_cat').value.trim();
  var allCats=menuCats();
  var existCat=allCats.find(function(c){return c.toLowerCase()===typedCat.toLowerCase();});
  var cat;
  if(typedCat===''){cat='Uncategorised';}
  else if(existCat){cat=existCat;}
  else if(catState.chosen!==null && catState.chosenIsNew && catState.chosen.toLowerCase()===typedCat.toLowerCase()){cat=typedCat;}
  else{document.getElementById('mi_err').textContent='“'+typedCat+'” is a new category — pick “Create new category” from the list to confirm, or choose an existing one.';document.getElementById('mi_err').style.display='block';renderCatDrop();return;}
  var priceV=document.getElementById('mi_price').value;
  var notes=document.getElementById('mi_notes').value.trim();
  var miMenuEl=document.getElementById('mi_menu'); var chosenMenu=(miMenuEl&&miMenuEl.value)?miMenuEl.value:currentMenuId;
  if(!name){err.textContent='Enter a menu item name.';err.style.display='block';return;}
  if(priceV===''||isNaN(parseFloat(priceV))||parseFloat(priceV)<0){err.textContent='Enter a valid sell price.';err.style.display='block';return;}
  // one entry per (plate, menu): re-adding to a menu it's already on updates that entry rather than duplicating.
  var plan=publishPlan(MENU, sp.id, chosenMenu);                   // v113: shared with submitAddDish — see publishPlan
  var targetId=plan.existingId||uid('um');
  var item={id:targetId,section:cat,name:name,price:parseFloat(priceV),notes:notes,custom:true,menuId:chosenMenu,plateId:sp.id};
  /* v114 — this button does TWO different things and the log has to tell them apart. On the create
     branch a plate reaches a menu; on the update branch it is already there and the only thing that can
     have moved is its sell price (publishPlan's `update` means same plate, same menu). Re-publishing at
     the SAME price is neither, and logs nothing — a save that changed no number is not an intervention. */
  var _avgBefore=computeAvgFoodCost(), _priceBefore=(plan.action==='update' && menuById[targetId])?menuById[targetId].price:null;
  var _write;
  if(plan.action==='update'){ _write=upsertCustomMenu(item); }
  else { customMenu.push(item); _write=dbPushMenuAfterPlate({id:targetId,section:cat,name:name,price:parseFloat(priceV),notes:notes,menuId:chosenMenu,plateId:sp.id}, sp); }
  rebuildMenu(); buildMenuOptions(); setCurrentMenuId(chosenMenu); buildMenuSelector();
  logHistory();   // v90: publishing a plate at a sell price changes the menu average and seeds that dish's price log
  if(plan.action!=='update'){
    logChangeIfSaved(_write, 'dish_added', {plateId:sp.id, dishId:targetId, menuIds:[chosenMenu], avgBefore:_avgBefore,
      costAfter:costFromLines(sp.lines), detail:{name:name, price:item.price, section:cat}});
  }else if(_priceBefore==null || Math.abs(_priceBefore-item.price)>=0.005){
    logChangeIfSaved(_write, 'dish_price', {plateId:sp.id, dishId:targetId, menuIds:[chosenMenu], avgBefore:_avgBefore,
      costAfter:costFromLines(sp.lines), detail:{name:name, priceFrom:_priceBefore, priceTo:item.price}});
  }
  renderAnalysis(); renderPlatesTab(); closeMenuModal();
  var mm=document.getElementById('manageMenusModal'); if(mm && mm.classList.contains('open')) renderManageMenus();
  toast('“'+name+'” '+(plan.action==='update'?'updated on':'added to')+' the menu');
}

/* ---- invoice import ---- */
/* ---- invoice file upload: PDF (via PDF.js) or CSV ---- */
var __pdfjsPromise=null;
function ensurePdfjs(){
  if(window.pdfjsLib) return Promise.resolve();
  if(__pdfjsPromise) return __pdfjsPromise;
  __pdfjsPromise=new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js';
    /* v88: pinned version + SRI. integrity/crossOrigin must be set BEFORE the
       element is inserted, or the check never runs. A failed hash fires onerror,
       which the caller already turns into the "could not load the PDF reader"
       toast. The WORKER below cannot take SRI — pdf.js loads it via new Worker(),
       which has no integrity mechanism; it is pinned only. */
    s.integrity='sha384-OemFRmhjDZwhIKuUld0HJozkF2YErsgDaCL41trxGQZt4/WgnopJQqQl2DvDZ07Z';
    s.crossOrigin='anonymous';
    s.onload=function(){ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js'; }catch(e){} res(); };
    s.onerror=function(){ rej(new Error('pdfjs-load')); };
    document.head.appendChild(s);
  });
  return __pdfjsPromise;
}
async function extractPdfText(file){
  await ensurePdfjs();
  var buf=await file.arrayBuffer();
  /* v88: isEvalSupported:false closes CVE-2024-4367 (pdf.js < 4.2.67) — a malicious
     PDF can reach arbitrary JS execution through the eval-based font path, and the
     PDFs here come from SUPPLIERS, on the origin holding the pricing data and the
     Supabase key. Only font rendering uses eval; we extract text, so nothing we
     need is lost. The real fix is pdf.js 4.x — its own brief (see HANDOVER-v88). */
  var pdf=await window.pdfjsLib.getDocument({data:buf, isEvalSupported:false}).promise;
  var out='';
  for(var p=1;p<=pdf.numPages;p++){
    var page=await pdf.getPage(p);
    var content=await page.getTextContent();
    var lines={}, order=[];
    content.items.forEach(function(it){
      if(!it.str) return;
      var y=Math.round(it.transform[5]);                 // group text items into visual lines by y-position
      if(!(y in lines)){ lines[y]=[]; order.push(y); }
      lines[y].push(it.str);
    });
    order.sort(function(a,b){ return b-a; });             // top -> bottom
    order.forEach(function(y){ out += lines[y].join(' ').replace(/\s+/g,' ').trim()+'\n'; });
  }
  return out;
}
function showInvFileErr(msg){ var e=document.getElementById('invFileErr'); if(e){ e.textContent=msg; e.style.display='block'; } }
var IMG_PDF_MSG="This PDF appears to be image-based and can't be read automatically \u2014 please use the manual entry option instead";
/* F8 (v147): every failure path returns to step 1, because that is where the controls that could
   recover it live (browse again, or the paste box). Leaving the scanning panel up with an error
   under it was the shape this rebuild replaced, and it had nothing to press. */
function invFileFailed(msg, useToast){
  invStep('choose');
  var nameEl=document.getElementById('invFileName'); if(nameEl) nameEl.textContent='';
  if(useToast) toast(msg); else showInvFileErr(msg);
}
function handleInvFile(file){
  if(!file) return;
  /* F8 (v147): the Invoices screen's dropzone can start an import with the modal SHUT, which is a
     route openInv() never sees. Everything openInv resets then survives from the previous import —
     #invCsv still holds the last invoice's text and #invReview still holds its rendered rows — so a
     file that fails to parse drops the user onto step 1 beside a paste box full of the PREVIOUS
     invoice, one "Match products" away from re-importing it. Start from a clean modal instead.
     openInv is idempotent for focus (openOverlay does not re-capture an opener it already has), but
     it wipes state, so it must not run when the modal is already open mid-flow. */
  var mo=document.getElementById('invModal');
  if(!(mo && mo.classList.contains('open'))) openInv();
  var nameEl=document.getElementById('invFileName'); if(nameEl) nameEl.textContent='Reading '+file.name;
  var errEl=document.getElementById('invFileErr'); if(errEl) errEl.style.display='none';
  invStep('scan');
  var isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
  if(isPdf){
    extractPdfText(file).then(function(text){
      var cleaned=(text||'').replace(/\s+/g,'');
      if(!cleaned || cleaned.length<15){               // no selectable text = scanned / image-only PDF
        invFileFailed(IMG_PDF_MSG); return;
      }
      text=normPackNotation(text);                     // v55 §I: normalise "N x M's" -> "(N*M)'s" before parsing (and before it's shown in the textarea, so a manual re-parse stays consistent)
      invGst=invGstDetect(text); invSupplier=invSupplierDetect(text);
      var rows=pdfTextToRows(text), ta=document.getElementById('invCsv');
      // v63 fix: the PDF path builds rows DIRECTLY (it doesn't go through parseInvoice), so the AI
      // second reader was never firing and the status note never set for uploaded invoices \u2014 which is
      // how Max actually imports. Mirror parseInvoice here: stamp the status, then fire ONE reader.
      if(rows.length){ ta.value=text.trim(); if(nameEl) nameEl.textContent=''; gemStatus='checking'; gemApplied=false; gemCheckStart=Date.now(); buildInvRows(rows); gemFireSecondReader(text); }   // v67 follow-up: no "N lines read, review below" line \u2014 the "X matched \u00b7 X new" summary below already confirms it worked
      /* F8 (v147): this path told the user to "review the text below" while the paste box was
         COLLAPSED - v67 hid the box and never re-pointed the message. It now opens what it names. */
      else { ta.value=text.trim(); invFileFailed('Couldn\u2019t auto-detect priced lines \u2014 review the extracted text below or enter it manually', true); setInvManual(true); }
    }).catch(function(e){
      if(e && e.message==='pdfjs-load') invFileFailed('Could not load the PDF reader \u2014 check your connection and try again', true);
      else invFileFailed(IMG_PDF_MSG);
    });
  } else {
    var r=new FileReader();
    r.onload=function(){ if(nameEl) nameEl.textContent=''; document.getElementById('invCsv').value=String(r.result||''); parseInvoice(); };   // v67 follow-up: no filename line — the "X matched · X new" summary confirms it worked
    r.onerror=function(){ invFileFailed('Could not read that file', true); };
    r.readAsText(file);
  }
}
// v67 item 4: the raw-text paste box is collapsed by default. Toggle reveals it (power path) and
// focuses the textarea; setInvManual(false) re-collapses. openInv resets it closed on every open so
// a first-time user always sees the clean "upload → match → review" flow, never a wall of monospace.
function setInvManual(open){
  var box=document.getElementById('invManualBox'), tog=document.getElementById('invManualToggle');
  if(box) box.hidden=!open;
  if(tog){ tog.setAttribute('aria-expanded', open?'true':'false'); tog.textContent=open?'Hide paste box':'or paste text manually'; }
  if(open){ var ta=document.getElementById('invCsv'); if(ta) ta.focus(); }
}
function toggleInvManual(){ var box=document.getElementById('invManualBox'); setInvManual(!!(box&&box.hidden)); }
/* F8 (v147): the mock's §4 three-step upload. ONE function switches panels, so no caller can
   leave two of them on screen; every other function keeps writing to the same ids it always did.
   `hidden` and nothing else — .inv-step deliberately carries no `display` rule, and the one it
   needs at step level wears the `:not([hidden])` guard (CLAUDE.md's [hidden] corollary). */
var INV_STEPS={choose:'invStepChoose', scan:'invStepScan', review:'invStepReview'};
function invStep(step){
  Object.keys(INV_STEPS).forEach(function(s){
    var el=document.getElementById(INV_STEPS[s]); if(el) el.hidden=(s!==step);
  });
}
function openInv(){gemStatus=null;gemToken++;gemApplied=false;document.getElementById('invCsv').value='';setInvManual(false);var r=document.getElementById('invReview');r.style.display='none';r.innerHTML='';var fe=document.getElementById('invFileErr');if(fe)fe.style.display='none';var fn=document.getElementById('invFileName');if(fn)fn.textContent='';var fi=document.getElementById('invFile');if(fi)fi.value='';invSupplier='';invStep('choose');updateLastImport();show('invModal');}
function closeInv(){hide('invModal');}
/* F8: the Invoices screen. There is nothing to render but the one true fact the app holds about
   importing — see the R4 note on #tab-invoices for why no recent-imports table is drawn. */
function renderInvoicesTab(){ updateLastImport(); }
function inorm(s){return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
var INV_STOP={kg:1,kgs:1,g:1,gr:1,gram:1,grams:1,l:1,lt:1,ltr:1,litre:1,liter:1,ml:1,ea:1,each:1,unit:1,units:1,pk:1,pack:1,packs:1,packet:1,ctn:1,carton:1,box:1,bag:1,btl:1,bottle:1,tray:1,tub:1,can:1,tin:1,jar:1,x:1,per:1,approx:1,app:1,pcs:1,pce:1,piece:1,pieces:1,portion:1,portions:1,sliced:1,sleeve:1,sleeves:1,case:1,value:1,added:1,premium:1,prem:1,select:1,choice:1,bulk:1,foodservice:1,catering:1,frozen:1,frz:1,fresh:1,raw:1,diced:1,whole:1,pkt:1,or:1,and:1,the:1,of:1,with:1,size:1,pre:1,cut:1,gluten:1,free:1,gf:1};
function coreTokens(s, brand){
  var toks=inorm(s).split(' ').filter(Boolean);
  var bt={}; if(brand){ inorm(brand).split(' ').filter(Boolean).forEach(function(t){bt[t]=1;}); }
  return toks.filter(function(t){
    if(/[0-9]/.test(t)) return false;                 // drop qty / pack size / dimension tokens
    if(t.length<2) return false;
    if(INV_STOP[t]) return false;                     // drop unit / packaging / filler words
    if(bt[t]) return false;                           // drop the supplier brand
    return true;
  });
}
function prodTokenSet(p){
  var set={};
  coreTokens(p.description, p.brand).forEach(function(t){set[t]=1;});
  (p.search_aliases||[]).forEach(function(a){ inorm(a).split(' ').forEach(function(t){ if(t&&!/[0-9]/.test(t)&&t.length>=2) set[t]=1; }); });
  if(p.item_type){ inorm(p.item_type).split(' ').forEach(function(t){ if(t&&t.length>=2) set[t]=1; }); }
  return set;
}
var invGst={mode:'unknown', note:''};
/* ITEM 6 (v35): the GST DEFAULT. There is no invGst *control* in the build — invGst is
   derived from the invoice text by invGstDetect below — so a "default" can only mean one
   thing: what to assume when the invoice doesn't say. An explicit statement on the
   invoice still wins; this only replaces the hardcoded ex-GST assumption in the
   'unknown' branch. See the handover note. */
var gstDefault='ex';   // v108: default until app_settings arrives
function setGstDefault(mode, persist){
  if(mode!=='inc'&&mode!=='ex') return;
  gstDefault=mode;
  if(persist && typeof dbSetSetting==='function') dbSetSetting('gst_default', mode);
}

/* v81: AI feature toggles + theme preference — the same dbSetSetting + localStorage-mirror pattern as GST.
   Defaults preserve today's behaviour: both AI readers ON (brand-new accounts unaffected). */
var AI_INV_KEY='cafeDB_aiInvoiceCheck';
function loadAiInvoiceCheck(){ try{ var v=localStorage.getItem(AI_INV_KEY); if(v==='0') return false; if(v==='1') return true; }catch(e){} return true; }   // default ON — keeps the v62 invoice second-reader
var aiInvoiceCheck=loadAiInvoiceCheck();
function setAiInvoiceCheck(on, persist){
  aiInvoiceCheck=!!on;
  try{ localStorage.setItem(AI_INV_KEY, aiInvoiceCheck?'1':'0'); }catch(e){}
  if(persist && typeof dbSetSetting==='function') dbSetSetting('ai_invoice_check', aiInvoiceCheck);
}
var AI_SUG_KEY='cafeDB_aiSuggestions';
function loadAiSuggestions(){ try{ var v=localStorage.getItem(AI_SUG_KEY); if(v==='0') return false; if(v==='1') return true; }catch(e){} return true; }   // default ON — EzPlate Insights shows unless turned off
var aiSuggestions=loadAiSuggestions();
function setAiSuggestions(on, persist){
  aiSuggestions=!!on;
  try{ localStorage.setItem(AI_SUG_KEY, aiSuggestions?'1':'0'); }catch(e){}
  if(persist && typeof dbSetSetting==='function') dbSetSetting('ai_suggestions', aiSuggestions);
  // v90: insights render on the Dashboard now, so the toggle refreshes THAT tab (dashInsightsHtml
  // returns '' when suggestions are off, so the whole panel appears/disappears with the switch).
  if(typeof renderDashboard==='function'){ try{ renderDashboard(); }catch(e){} }
}

/* v136 (F1a): the theme preference machinery RETURNS. v132 deleted it because the app went
   light-only; the replacement design package ships both palettes and FOLD-IN-PROTOCOL §6
   orders both ported, so the removal's own condition is satisfied rather than reversed.

   THE STORED VALUE AND THE APPLIED VALUE ARE DIFFERENT THINGS, deliberately:
     stored  'light' | 'dark' | 'system'   (absent === 'system')
     applied 'light' | 'dark'              — NEVER absent.
   index.html's <head> resolver writes the applied value before first paint; everything here
   goes through applyThemePref so the two can never drift apart. Keeping the attribute always
   explicit is what lets css/style.css carry ONE html[data-theme="dark"] block instead of the
   pre-v132 arrangement, where "system" meant no attribute and every dark rule had to be
   duplicated into a @media (prefers-color-scheme:dark) mirror — a real bug came from writing
   one half and forgetting the other.

   Device-local on purpose (localStorage, a view preference — CLAUDE.md Tier 2), never
   dbSetSetting: theme belongs to the device, not the café. */
var THEME_KEY='cafeCost_theme';
function loadThemePref(){ try{ var v=localStorage.getItem(THEME_KEY); if(v==='dark'||v==='light') return v; }catch(e){} return 'system'; }
function systemPrefersDark(){ try{ return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches); }catch(e){ return false; } }
/* The resolver. One place decides what the attribute says, so 'system' cannot leave a stale
   'dark' on <html> after the OS flips to light. */
function resolveTheme(pref){ return (pref==='dark'||pref==='light') ? pref : (systemPrefersDark()?'dark':'light'); }
/* The ONE place a resolved theme is written to the document, so the attribute and the PWA
   chrome colour can never disagree. The <meta name="theme-color"> deliberately has no
   media="(prefers-color-scheme:…)" variants: the browser would resolve those against the OS
   while the page resolves against the STORED preference, so choosing Light on a dark phone
   would leave a near-black title bar over a white app — the v132 bug. Reading the colour off
   the live --surface token means it follows the palette instead of duplicating it. */
function applyResolvedTheme(theme){
  var root=document.documentElement;
  root.setAttribute('data-theme', theme);
  try{
    var m=document.querySelector('meta[name="theme-color"]');
    if(m){
      var c=getComputedStyle(root).getPropertyValue('--surface').trim();
      if(c) m.setAttribute('content', c);
    }
  }catch(e){}
}
function applyThemePref(pref){
  if(pref!=='dark'&&pref!=='light') pref='system';
  try{ if(pref==='system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY,pref); }catch(e){}
  applyResolvedTheme(resolveTheme(pref));
}
function syncThemeSeg(pref){
  /* Takes the APPLIED preference when the caller knows it. It used to always re-read the
     store, so on a device where localStorage throws, applyThemePref would swallow the write
     failure, the theme would flip, and the segment would snap back to the old choice with no
     explanation — the control disagreeing with the screen. */
  if(pref!=='light'&&pref!=='dark'&&pref!=='system') pref=loadThemePref();
  var btns=document.querySelectorAll('#tab-settings .seg-btn[data-theme-pref]');
  for(var i=0;i<btns.length;i++){
    var on=btns[i].getAttribute('data-theme-pref')===pref;
    btns[i].setAttribute('aria-checked', on?'true':'false');
    /* Roving tabindex: a radiogroup is ONE tab stop, and arrow keys move within it. Without
       this the three buttons are three stops and the arrow keys below do nothing useful. */
    btns[i].setAttribute('tabindex', on?'0':'-1');
  }
  syncThemeToggle(pref);
}
/* v137 (F1b): the mock's compact sidebar toggle. It is a TWO-state control over a THREE-state
   preference, so what it reports has to be the resolved theme, not the stored one — under
   'system' on a dark OS it must read pressed, or it would offer to switch to the theme already
   on screen. Pressing it therefore leaves 'system' and stores an explicit choice; that is the
   mock's own model (it has no system state at all), and the Settings segment stays the place
   where 'system' can be chosen back. Both controls route through applyThemePref, so neither can
   drift from the attribute. */
function syncThemeToggle(pref){
  var b=document.getElementById('sideThemeToggle'); if(!b) return;
  if(pref!=='light'&&pref!=='dark'&&pref!=='system') pref=loadThemePref();
  var dark=resolveTheme(pref)==='dark';
  b.setAttribute('aria-pressed', dark?'true':'false');
  b.setAttribute('aria-label', dark?'Switch to light mode':'Switch to dark mode');
  var icon=document.getElementById('sideThemeIcon');
  if(icon) icon.setAttribute('d', dark
    ? 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4'   /* sun: pressed = dark is on, tapping returns to light */
    : 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');                                                                                          /* moon */
}
/* NEW in v136, and the reason 'system' is now honest: the pre-v132 code read the OS setting
   once at boot, so a phone switching to dark at sunset left the app light until it was
   reopened — which for an intermittent user could be a week. While the preference is
   'system' (and only then), follow the OS live. */
(function(){
  try{
    var mq=window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)');
    if(!mq) return;
    var onChange=function(){ if(loadThemePref()==='system'){ applyResolvedTheme(resolveTheme('system')); syncThemeToggle('system'); } };   // v137: the toggle reports the RESOLVED theme, so an OS flip has to re-sync it
    if(mq.addEventListener) mq.addEventListener('change',onChange);
    else if(mq.addListener) mq.addListener(onChange);   /* Safari < 14 */
  }catch(e){}
})();
function invDbg(){ if(window.EZ_INV_DEBUG && window.console) try{console.log.apply(console, arguments);}catch(e){} }
function invGstDetect(text){
  var t=(text||'').toLowerCase();
  if(/gst\s*incl|incl[a-z]*\s*gst|inc\.?\s*gst|includes?\s+gst|inclusive of gst/.test(t)) return {mode:'inc', note:'GST-inclusive prices detected \u2014 converted to ex-GST (\u00f71.10) for storage.'};
  if(/gst\s*excl|excl[a-z]*\s*gst|ex\.?\s*gst|plus\s+gst|excludes?\s+gst|exclusive of gst/.test(t)) return {mode:'ex', note:'GST-exclusive prices detected.'};
  // ITEM 6 (v35): the invoice didn't say. Fall back to the Settings default rather than
  // silently assuming ex-GST. An explicit statement above always wins over the default.
  return (gstDefault==='inc')
    ? {mode:'inc', note:'GST status unclear \u2014 using your Settings default: prices treated as GST-inclusive and converted to ex-GST (\u00f71.10).'}
    : {mode:'ex',  note:'GST status unclear \u2014 using your Settings default: prices treated as GST-exclusive. Change the default in Settings.'};
}
/* ---- drop invoice totals / footer / summary lines ---- */
var INV_EXCLUDE=/\b(?:sub-?totals?|totals?|gst|balance|owing|due|account|acct|invoice|abn|acn|payments?|paid|remittances?|freight|delivery|surcharges?|discounts?|rounding|amounts?|eftpos|eft|tax|bsb|statements?|credit|charges?|levy|levies)\b/i;
/* A real product line has a quantity/unit/weight or a "N x N" pack pattern. */
function hasProductStructure(line){
  if(explicitUnitPrice(line)) return true;
  if(packWeight(line)) return true;
  if(packCount(line)) return true;
  if(/\d+(?:\.\d+)?\s*(?:kg|kgs|g|gr|gram|grams|ml|l|lt|ltr|litre|ea|each|unit|units|doz|dozen|pk|pkt|pack|packs|ctn|carton|case|box|sleeve|tray|bag)\b/i.test(line)) return true;
  if(/\d+\s*(?:x|\u00d7|\*)\s*\d/i.test(line)) return true;      // "6 x 2.5", "6 x 6 x ..."
  return false;
}
function invLineClass(name, fullLine){
  if(!INV_EXCLUDE.test(name||'')) return 'ok';                    // no summary keyword -> normal item
  return hasProductStructure(fullLine||name) ? 'uncertain' : 'exclude';  // keyword + no product shape -> drop
}
/* ---- candidate matching: token overlap, top 3 ---- */
function rankCandidates(invName){
  var inv=coreTokens(invName,null); if(!inv.length) return [];
  var scored=[];
  PRODUCTS.forEach(function(p){
    var ps=prodTokenSet(p), pk=Object.keys(ps), overlap=0;
    inv.forEach(function(t){
      if(ps[t]){ overlap++; return; }
      for(var k in ps){ if(t.length>=4&&k.length>=4&&(k.indexOf(t)===0||t.indexOf(k)===0)){ overlap+=0.75; break; } }
    });
    if(overlap<=0) return;
    var shorter=Math.min(inv.length, pk.length)||1;         // overlap / meaningful tokens in the shorter string
    var score=Math.min(1, overlap/shorter);
    if(inv[0] && ps[inv[0]] && inv[0].length>=4) score=Math.max(score,0.6);   // one strong content word (e.g. "hoki") is enough
    scored.push({id:p.id, coverage:score});
  });
  scored.sort(function(a,b){ return b.coverage-a.coverage; });
  return scored.slice(0,3);
}
function buildInvRows(rawRows){
  invRows=rawRows.map(function(r){
    var up=(r.unitPrice==null?null:r.unitPrice);
    if(up!=null && invGst.mode==='inc') up=up/1.1;                 // store ex-GST
    var cands=rankCandidates(r.name);
    var top=cands.length?cands[0].coverage:0;
    var addNew=(top<0.3);                                          // <0.3 -> no confident match -> Add New
    var tier=top>=0.6?'hi':(top>=0.3?'mid':'lo');                  // >=0.6 confident, 0.3-0.59 possible
    var row={name:r.name, raw:r.raw||r.name, unitPrice:up, unit:(r.unit||'auto'), rawUnit:(r.unit||'auto'),
            needManual:(!!r.needManual || up==null), uncertain:!!r.uncertain, cands:cands,
            bestId:(addNew?null:(cands.length?cands[0].id:null)),
            conf:top, tier:tier, addNew:addNew, newItem:null, remembered:false};
    var mem=(normSupplier(invSupplier)?supplierMem[memKey(invSupplier, row.raw||row.name)]:null);
    if(!row.addNew && row.bestId){                                // matched line: product pack > supplier memory > parser (+ unit guard)
      var mp=byId[row.bestId];
      resolveMatchedPrice(row, mp?{pack_qty:mp.pack_qty, pack_unit:mp.pack_unit, base_unit:mp.base_unit}:null, mem);
    } else if(row.needManual && mem){                            // no-match / manual line keeps v20 memory behaviour
      applySupplierMemory(row, mem);
    }
    flagNeedsAttention(row);
    return row;
  });
  renderInvReview();
}
/* ---- structured price extraction ---- */
function moneyMatches(line){
  var re=/\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\b/g, m, arr=[];
  while((m=re.exec(line))!==null){ arr.push({val:parseFloat(m[1].replace(/,/g,'')), idx:m.index, end:re.lastIndex}); }
  return arr;
}
function firstPairPrice(monies){   // first adjacent pair of equal money values = the per-pack (unit) price column, e.g. "52.12 52.12" or qty-1 "$20.00 $20.00"
  for(var i=0;i<monies.length-1;i++){ if(monies[i].val>0 && monies[i].val===monies[i+1].val) return monies[i].val; }
  return null;
}
/* --- supplier memory: pure helpers (kept in this region so tests can reach them) --- */
function normalizePhrase(s){       // stable key for "how this supplier writes this item", ignoring codes/prices/qty noise
  s=(' '+String(s||'')+' ').toLowerCase();
  s=s.replace(/\$?\d+(?:,\d{3})*(?:\.\d+)?/g,' ');   // drop money + any bare numbers (codes, qty, pack counts, prices)
  s=s.replace(/[#*|]/g,' ');                          // drop item-code / bullet punctuation
  s=s.replace(/[^a-z0-9]+/g,' ');                     // keep words only, spaces between
  return s.replace(/\s+/g,' ').trim();
}
function packPriceOf(raw){         // the price of one pack from a raw invoice line
  var m=moneyMatches(raw||''); if(!m.length) return null;
  var p=firstPairPrice(m); return (p!=null)?p:m[m.length-1].val;
}
function applySupplierMemory(row, mem){   // re-derive unit price from a remembered pack {qty, unit}; never touches a row that already parsed
  if(!row || !mem || !row.needManual) return row;
  var pack=packPriceOf(row.raw||row.name); var qty=parseFloat(mem.qty);
  if(pack==null || !(qty>0)) return row;
  var u=(mem.unit||'ea').toLowerCase(), unitPrice, unit;
  if(u==='kg'||u==='g'){ unit='kg'; unitPrice=pack/(qty*(u==='kg'?1:0.001)); }
  else if(u==='l'||u==='ml'){ unit='l'; unitPrice=pack/(qty*(u==='l'?1:0.001)); }
  else { unit='ea'; unitPrice=pack/qty; }
  if(!isFinite(unitPrice)||unitPrice<0) return row;
  row.unitPrice=unitPrice; row.unit=unit; row.needManual=false; row.remembered=true;
  return row;
}
/* --- Phase 1: product-pack pricing + precedence (product pack > supplier memory > parser) + unit guard --- */
function unitToBaseFields(u){ u=(u||'').toLowerCase();              // the unit a price is entered in -> how it's stored
  if(u==='kg') return {base_unit:'g', cost_basis:'$/g', div:1000};
  if(u==='l')  return {base_unit:'ml', cost_basis:'$/ml', div:1000};
  return {base_unit:'ea', cost_basis:'$/unit', div:1};
}
function unitCatCategory(u){ u=(u||'').toLowerCase();
  if(u==='kg'||u==='g'||u==='gr'||u==='gram'||u==='grams') return 'kg';
  if(u==='l'||u==='ml'||u==='lt'||u==='litre') return 'l';
  if(u==='ea'||u==='unit'||u==='units'||u==='each') return 'ea';
  return null;
}
function derivePackPrice(raw, packQty, packUnit){          // product's OWN pack: line pack-price / pack size
  var qty=parseFloat(packQty); if(!(qty>0)) return null;
  var pack=packPriceOf(raw); if(pack==null) return null;
  var u=(packUnit||'ea').toLowerCase(), unit, unitPrice;
  if(u==='kg'||u==='g'){ unit='kg'; unitPrice=pack/(qty*(u==='kg'?1:0.001)); }
  else if(u==='l'||u==='ml'){ unit='l'; unitPrice=pack/(qty*(u==='l'?1:0.001)); }
  else { unit='ea'; unitPrice=pack/qty; }
  if(!isFinite(unitPrice)||unitPrice<0) return null;
  return {unitPrice:unitPrice, unit:unit, source:'product-pack'};
}
function resolveMatchedPrice(row, product, mem){
  var chosen=null;
  if(product && product.pack_qty>0 && product.pack_unit){        // 1) the product's taught pack wins
    var d=derivePackPrice(row.raw||row.name, product.pack_qty, product.pack_unit);
    if(d) chosen={unitPrice:d.unitPrice, unit:d.unit, source:'product-pack', needManual:false};
  }
  if(!chosen && mem && parseFloat(mem.qty)>0){                    // 2) then supplier memory for this phrase
    var pack=packPriceOf(row.raw||row.name), q=parseFloat(mem.qty);
    if(pack!=null && q>0){
      var mu=(mem.unit||'ea').toLowerCase(), unit, up;
      if(mu==='kg'||mu==='g'){ unit='kg'; up=pack/(q*(mu==='kg'?1:0.001)); }
      else if(mu==='l'||mu==='ml'){ unit='l'; up=pack/(q*(mu==='l'?1:0.001)); }
      else { unit='ea'; up=pack/q; }
      if(isFinite(up)&&up>=0) chosen={unitPrice:up, unit:unit, source:'memory', needManual:false};
    }
  }
  if(!chosen){                                                   // 3) else the parser's own derivation, if any
    if(!row.needManual && row.unitPrice!=null) chosen={unitPrice:row.unitPrice, unit:row.unit, source:'parser', needManual:false};
    else chosen={unitPrice:null, unit:(row.unit||'auto'), source:'manual', needManual:true};
  }
  row.unitPrice=chosen.unitPrice; row.unit=chosen.unit; row.needManual=chosen.needManual;
  row.priceSource=chosen.source; row.remembered=(chosen.source==='memory'); row.fromProductPack=(chosen.source==='product-pack');
  if(chosen.source==='product-pack'&&product){ row.taughtQty=parseFloat(product.pack_qty); row.taughtUnit=(product.pack_unit||'ea'); }
  if(chosen.source==='memory'&&mem){ row.taughtQty=parseFloat(mem.qty); row.taughtUnit=(mem.unit||'ea'); }
  var baseCat=product?unitCatCategory(product.base_unit):null;
  row.unitMismatch=false;
  var taught=(chosen.source==='product-pack'||chosen.source==='memory');
  if(!taught && baseCat && chosen.unit && chosen.unit!=='auto' && chosen.unit!==baseCat && !chosen.needManual){
    row.unitMismatch=true; row.needManual=true;                  // a parser GUESS in the wrong unit is blocked; a pack the user taught is the truth
  }
  return row;
}
function unitCat(u){ u=u.toLowerCase();
  if(u==='kg'||u==='kgs') return {cat:'kg',f:1};
  if(u==='g'||u==='gr'||u==='gram'||u==='grams') return {cat:'kg',f:0.001};
  if(u==='l'||u==='lt'||u==='ltr'||u==='litre'||u==='liter') return {cat:'l',f:1};
  if(u==='ml') return {cat:'l',f:0.001};
  if(u==='ea'||u==='each'||u==='unit'||u==='units'||u==='pk'||u==='pack'||u==='ctn'||u==='carton'||u==='box') return {cat:'ea',f:1};
  return null;
}
function explicitUnitPrice(line){                                  // "$6.20/kg" or "6.20 per kg"
  var re=/\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:\/|per\s*)(kg|kgs|g|gr|gram|l|lt|ltr|litre|ml|ea|each|unit)\b/i, m=line.match(re);
  if(!m) return null;
  var val=parseFloat(m[1]), u=m[2].toLowerCase(), cat, factor=1;
  if(u==='kg'||u==='kgs'){cat='kg';factor=1;}
  else if(u==='g'||u==='gr'||u==='gram'){cat='kg';factor=1000;}
  else if(u==='l'||u==='lt'||u==='ltr'||u==='litre'){cat='l';factor=1;}
  else if(u==='ml'){cat='l';factor=1000;}
  else {cat='ea';factor=1;}
  return {unitPrice:val*factor, unit:cat};
}
/* nested pack weight: "6 x (22 x 120g)" -> total kg/L. Multiplies every "N x"/"N of" before the final weight/volume unit. */
function packWeight(line){
  // Find the LAST weight/volume unit + its number = the per-unit weight (e.g. "2.5kg").
  var re=/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gr|gram|grams|l|lt|ltr|litre|liter|ml)\b/gi, m, last=null;
  while((m=re.exec(line))!==null){ last=m; }
  if(!last){ invDbg('[packWeight] no weight/volume unit in:', line); return null; }
  var u=unitCat(last[2]); if(!u||u.cat==='ea'){ return null; }
  var unitNum=parseFloat(last[1]);                                   // e.g. 2.5
  var prefix=line.slice(0,last.index);                              // everything before "2.5kg"
  // Every multiplier before it: a number followed by x / * / of / per / comma / a pack-noun.
  // Handles "6 x 6 x", "6 CTN x 6 x", "6 cartons, 6 per carton,".
  var mult=1, mm, factors=[],
      mr=/(\d+(?:\.\d+)?)\s*(?:x|\u00d7|\*|of\b|per\b|,|ctns?\b|cartons?\b|cases?\b|boxe?s?\b|packe?t?s?\b|sleeves?\b|trays?\b|bags?\b)/gi;
  while((mm=mr.exec(prefix))!==null){ var v=parseFloat(mm[1]); if(v>0){ mult*=v; factors.push(v); } }
  var qtyInCat=mult*unitNum*u.f;                                    // total weight in kg (or L)
  invDbg('[packWeight] structure:', {line:line, orderedX_packQty:factors, unitWeight:unitNum+last[2], multiplied:factors.concat([unitNum]).join(' x ')+' = '+(mult*unitNum)+' '+last[2], totalWeight:qtyInCat+(u.cat==='l'?' L':' kg')});
  return {qtyInCat:qtyInCat, cat:u.cat, factors:factors, unitNum:unitNum};
}
/* per-unit counts: dozen / each / portions, with optional "N x" multiplier chain */
function packCount(line){
  var mult=1, any=false, mm, mr=/(\d+(?:\.\d+)?)\s*[a-z]*\s*(?:x|\u00d7|\*|of)\s*/gi;
  while((mm=mr.exec(line))!==null){ mult*=parseFloat(mm[1]); any=true; }
  var doz=line.match(/(\d+(?:\.\d+)?)\s*(doz|dozen)\b/i);
  if(doz) return (any?mult:1)*parseFloat(doz[1])*12;
  var ct=line.match(/(\d+)\s*(ea|each|unit|units|pcs|pce|piece|pieces|portion|portions|sleeve|sleeves)\b/i);
  if(ct) return (any?mult:1)*parseFloat(ct[1]);
  var sc=line.match(/\b(\d{2,4})'?s\b/i);                          // shorthand pack count e.g. "400s" / "105s" (2-4 digits + optional apostrophe + s)
  if(sc) return (any?mult:1)*parseFloat(sc[1]);
  var ofc=line.match(/\bof\s+(\d+(?:\.\d+)?)\b/i);
  if(ofc) return (any?mult:1)*parseFloat(ofc[1]);
  if(any) return mult;
  return null;
}
function parsePdfLine(line){
  line=(line||'').trim(); if(!line) return null;
  if(!/[A-Za-z]{2,}/.test(line)) return null;
  var monies=moneyMatches(line); if(!monies.length) return null;
  var name=line.slice(0, monies[0].idx).replace(/[\s,;:@\-]+$/,'').trim();
  if(name.length<2) name=line.replace(/[\s,;:@\-]+$/,'').trim();   // qty-first layouts: keep the whole line as the name
  var cls=invLineClass(name, line); if(cls==='exclude'){ invDbg('[parsePdfLine] EXCLUDED (summary/footer line):', line); return null; }
  var unc=(cls==='uncertain');
  var ex=explicitUnitPrice(line);                                 // 1) explicit unit price wins
  if(ex){ invDbg('[parsePdfLine] explicit unit price:', {name:name, unitPrice:ex.unitPrice, unit:ex.unit}); return {name:name, unitPrice:ex.unitPrice, unit:ex.unit, needManual:false, uncertain:unc, raw:line}; }
  // Per-PACK price: columnar invoices repeat the Unit Price / Price columns ("52.12 52.12"); simple invoices
  // repeat the qty-1 unit price as the line total ("$20.00 $20.00"). The first adjacent equal pair is the price
  // of ONE pack. Using it (not the last money / line total) is what stops qty>1 lines being multiplied by qty.
  var total=monies[monies.length-1].val;                          // last money = line total
  var packPrice=firstPairPrice(monies); if(packPrice==null) packPrice=total;
  var aps=line.match(/\b(\d{2,4})'s\b/i);                          // 1b) explicit apostrophe-s pack count e.g. "105'S", "400'S" -> N pieces per pack
  if(aps){ var apc=parseFloat(aps[1]);
    if(apc>0){ invDbg('[parsePdfLine] APOSTROPHE-S count:', {name:name, count:apc, packPrice:packPrice, perUnit:'$'+(packPrice/apc).toFixed(4)+'/unit'});
      return {name:name, unitPrice:packPrice/apc, unit:'ea', needManual:false, uncertain:unc, raw:line}; } }
  var w=packWeight(line);                                         // 2) derive $/kg or $/L from the pack price and the pack's weight/volume
  if(w && w.qtyInCat>0){ var upw=packPrice/w.qtyInCat; invDbg('[parsePdfLine] WEIGHT calc:', {name:name, packPrice:packPrice, lineTotal:total, totalWeight:w.qtyInCat+(w.cat==='l'?' L':' kg'), pricePerUnit:'$'+upw.toFixed(4)+'/'+(w.cat==='l'?'L':'kg')}); return {name:name, unitPrice:upw, unit:w.cat, needManual:false, uncertain:unc, raw:line}; }
  var c=packCount(line);                                          //    or $/unit from the pack price and the per-pack count
  if(c && c>0) return {name:name, unitPrice:packPrice/c, unit:'ea', needManual:false, uncertain:unc, raw:line};
  return {name:name, unitPrice:null, unit:'auto', needManual:true, uncertain:unc, raw:line};   // 3) ambiguous
}
function pdfTextToRows(text){
  var rows=[]; (text||'').split(/\n/).forEach(function(raw){ var r=parsePdfLine(raw); if(r) rows.push(r); });
  return rows;
}
function unitLabelFor(row){
  var u=row&&row.unit;                                            // the resolved unit is the truth — it's what gets written on Apply
  if(u==='kg')return '/kg'; if(u==='l')return '/L'; if(u==='ea')return '/unit';
  var pid=row&&row.bestId;
  if(pid && byId[pid]){ var b=byId[pid].base_unit; return b==='g'?'/kg':b==='ml'?'/L':'/unit'; }
  return '';
}
function parseInvoiceCSV(text){
  var out=[]; text.split(/\r?\n/).forEach(function(line,i){
    line=line.trim(); if(!line)return;
    var parts=line.split(','); if(parts.length<2)return;
    var priceStr=parts[parts.length-1].replace(/[^0-9.\-]/g,''); var price=parseFloat(priceStr);
    var name=parts.slice(0,-1).join(',').trim();
    if(i===0 && /name|product|price|cost|item/i.test(line) && isNaN(price)) return;
    if(!name)return;
    var cls=invLineClass(name, line); if(cls==='exclude') return;
    out.push({name:name, unitPrice:isNaN(price)?null:price, unit:'auto', needManual:isNaN(price), uncertain:(cls==='uncertain'), raw:line});
  });
  return out;
}
// v55 §I: the protected parser's packCount reads "6x8's" as just the "6x" multiplier (6) — its
// shorthand-count regex needs 2-4 digits, so the single-digit "8's" is dropped. Rather than edit the
// protected region (CLAUDE.md rule 1), we normalise the RAW text here, OUTSIDE it: rewrite a compound
// "N x M's" into "(N*M)'s" (e.g. "6x8's" -> "48's") so the parser reads the true per-pack count. Only the
// apostrophe-s compound form is touched; weight packs ("6 x 2.5kg") and bare "6x8" are left alone.
// NOTE: this rewrites the displayed line text too (name shows "48's"); it does NOT add purchased-quantity
// capture — that column isn't parsed at all (see HANDOVER-v55 §I).
function normPackNotation(text){
  return (text||'').replace(/\b(\d+)\s*[x×*]\s*(\d+)(['’]?s)\b/gi, function(m, a, b){
    var n=parseInt(a,10)*parseInt(b,10); return (isFinite(n)&&n>0) ? (n+"'s") : m;
  });
}
function parseInvoice(){
  var txt=normPackNotation(document.getElementById('invCsv').value);
  invGst=invGstDetect(txt); invSupplier=invSupplierDetect(txt);
  var raw=parseInvoiceCSV(txt);
  if(!raw.length){invFileFailed('No valid rows. Use: product name, unit price per kg/unit', true);return;}   // F8: reached from the CSV upload too, which is mid-scan — put the user back where the controls are
  // v62: Reader 1 (this parser) renders the review modal IMMEDIATELY below. Reader 2 (Gemini) then runs
  // ONE background request and merges when it lands — AI adds latency nowhere. gemStatus is set BEFORE
  // buildInvRows so the very first render already shows "AI double-checking…".
  gemStatus='checking'; gemApplied=false; gemCheckStart=Date.now();   // v63: stamp the start so gemSettle can keep "checking" visible long enough to read
  buildInvRows(raw);                                                 // <- renders now, exactly as today
  gemFireSecondReader(txt);
}
function prodOptions(selId){
  return PRODUCTS.slice().sort(function(a,b){return a.description.localeCompare(b.description);}).map(function(p){
    return '<option value="'+p.id+'"'+(p.id===selId?' selected':'')+'>'+esc(p.description)+(p.brand?' \u2014 '+esc(p.brand):'')+'</option>';
  }).join('');
}
function dispPrice(p){var c=cpbu(p);if(c==null)return '\u2014';if(p.base_unit==='g')return '$'+(c*1000).toFixed(2)+'/kg';if(p.base_unit==='ml')return '$'+(c*1000).toFixed(2)+'/L';return '$'+c.toFixed(2)+'/unit';}
/* ---- new-item inline panel ---- */
function prodCategories(){ return Array.from(new Set(PRODUCTS.map(function(p){return p.category;}).filter(Boolean))).sort(); }
function prodBrands(){ return Array.from(new Set(PRODUCTS.map(function(p){return p.brand;}).filter(Boolean))).sort(); }
function prodSuppliers(){ return Array.from(new Set(PRODUCTS.map(function(p){return p.supplier;}).filter(Boolean))).sort(); }

/* ===== v40 item 3: "Tidy lists" pure core =====
   Categories/brands/suppliers aren't their own tables — they're values on products, and the
   dropdowns derive from whatever exists. So "rename/merge/clear" all mean "edit that value across
   every product carrying it". These functions are pure (products array in, plan out) so the maths
   is unit-tested; the Settings UI (a follow-up) calls tidyPlan(), shows the blast-radius confirm,
   then applies plan.patches through the existing dbPushIngredient write path.
   TIDY_FIELDS keys the three managed fields to their product columns. */
var TIDY_FIELDS={ category:'category', brand:'brand', supplier:'supplier' };
function tidyFieldCol(field){ return TIDY_FIELDS[field]||field; }
function tidyFieldValues(products, field){                          // inventory: distinct non-empty values + usage counts, most-used first then A–Z
  var col=tidyFieldCol(field), counts={};
  (products||[]).forEach(function(p){ if(!p) return; var v=p[col]; if(v==null||v==='') return; counts[v]=(counts[v]||0)+1; });
  return Object.keys(counts).map(function(v){ return {value:v, count:counts[v]}; })
    .sort(function(a,b){ return b.count-a.count || a.value.toLowerCase().localeCompare(b.value.toLowerCase()); });
}
function tidyValueExists(products, field, value){                   // does another product already carry this value? (rename-onto-existing => a merge)
  if(value==null||value==='') return false;
  return tidyFieldValues(products, field).some(function(x){ return x.value===value; });
}
function tidyPlan(products, field, action, from, to){               // action: 'rename' | 'merge' | 'clear'. Returns the exact per-product patch list + whether it's a merge.
  var col=tidyFieldCol(field);
  var newVal=(action==='clear')?null:to;
  var isMerge=(action!=='clear') && to!=null && to!==from && tidyValueExists(products, field, to);
  var patches=[];
  (products||[]).forEach(function(p){
    if(!p) return;
    var cur=(p[col]==null?'':p[col]);
    if(cur!==(from==null?'':from)) return;                          // only products carrying `from` are touched
    patches.push({id:p.id, field:col, value:newVal});
  });
  return {action:action, field:col, from:from, to:newVal, isMerge:isMerge, patches:patches};
}
// Supplier memory (taught packs) keys off the supplier NAME via memKey(). Renaming/merging a supplier on products
// would orphan its taught packs unless the memory entries move too. This pure planner lists the re-keys needed;
// the entry's phrase_norm is already normalised, so the new id is memKey(to,·) == normSupplier(to)+'|'+phrase_norm
// — reconstructable WITHOUT re-entering the protected parser region. Clearing a supplier drops its memories.
// v59 item 6b: the Category picker spans BOTH product categories AND plate categories (Max's call).
// This pure planner returns the product patches (via dbPushIngredient) and, for category only, the
// plate patches (via dbPushPlate) — so one Rename/Merge/Clear flows to products, ingredients (which
// mirror their product), AND plates in a single confirmed action. Brand/Supplier are product-only.
function tidyValuesCombined(products, plates, field){
  var pv=tidyFieldValues(products, field);
  if(field!=='category') return pv.map(function(x){ return {value:x.value, count:x.count, products:x.count, plates:0}; });
  var byVal={}; pv.forEach(function(x){ byVal[x.value]={value:x.value, products:x.count, plates:0}; });
  tidyFieldValues(plates, 'category').forEach(function(x){ (byVal[x.value]||(byVal[x.value]={value:x.value,products:0,plates:0})).plates=x.count; });
  return Object.keys(byVal).map(function(v){ var o=byVal[v]; o.count=o.products+o.plates; return o; })
    .sort(function(a,b){ return b.count-a.count || a.value.toLowerCase().localeCompare(b.value.toLowerCase()); });
}
function tidyPlanAll(products, plates, field, action, from, to){
  var pp=tidyPlan(products, field, action, from, to);
  var pl=(field==='category') ? tidyPlan(plates, 'category', action, from, to) : {patches:[], isMerge:false};
  return { field:field, action:action, from:from, to:pp.to,
           productPatches:pp.patches, platePatches:pl.patches,
           isMerge:pp.isMerge||pl.isMerge, count:pp.patches.length+pl.patches.length };
}
function tidySupplierMemMigration(supplierMem, from, to){           // to===null => clear (drop the memories); else re-key onto `to`
  var nf=normSupplier(from), nt=(to==null?null:normSupplier(to)), out=[];
  for(var id in supplierMem){ var e=supplierMem[id]; if(!e) continue;
    if(normSupplier(e.supplier)!==nf) continue;
    out.push(nt==null
      ? {oldId:id, newId:null, drop:true}                          // supplier cleared -> forget its taught packs
      : {oldId:id, newId:nt+'|'+e.phrase_norm, supplier:to, phrase_norm:e.phrase_norm, qty:e.qty, unit:e.unit, pid:(e.pid||null)});
  }
  return out;
}
function kingNames(){ return (kitchenIngredients||[]).map(function(k){return k&&k.name;}).filter(Boolean).sort(); }   // ITEM 5 (v35): the combobox source for the invoice Kitchen name field
var niCombos={};
/* v59 item 2 ROOT CAUSE: modal comboboxes render `.cat-drop` as position:absolute inside `.mbody`,
   whose `overflow:auto` (needed so tall modals scroll) CLIPS the dropdown after ~1.5 rows — the
   Save bar then sits over it. Fix: on open, anchor the dropdown with position:FIXED to the input's
   viewport rect so it ESCAPES the scroll container entirely (the modal's only transform is the
   open animation, long finished by interaction time, so fixed is viewport-relative). The
   `.cat-drop`'s own max-height/overflow give the internal scroll for long lists; opens upward when
   the input sits low. Reposition on scroll/resize while open; clear the inline geometry on close. */
/* v86 ROOT CAUSE (invoice add-new form, Ingredient name field): the space calculation above
   measured the raw VIEWPORT, so a dropdown on the LAST field of a form still saw ~340px of
   "room below" and drew its full 300px panel — straight through the Apply row and 144px past
   the bottom of the line's card (measured at 380px). Fixed by giving anchorDrop a BOX to stay
   inside instead of the whole window:
     - HARD bound  = the modal (never spill outside the surface the user is working in),
     - SOFT bound  = the form panel the input belongs to (a dropdown may float over its OWN
                     fields, but not over the controls that FOLLOW the form, e.g. Apply).
   The soft bound is a preference: if neither side of the input has a usable list height
   within it, we fall back to the hard bound rather than render a 20px sliver. */
var DROP_MIN=140, DROP_MAX=300;
/* The placement decision itself is PURE (no DOM) so the bug's real numbers can be pinned in a
   unit test: r = the input's rect, soft = modal ∩ form panel, hard = modal only. Returns which
   side to open on and how tall the list may be. */
function dropPlace(r, soft, hard){
  var pick=function(box){
    var below=box.bottom-r.bottom-8, above=r.top-box.top-8;
    var useBelow=(below>=above);
    return {below:useBelow, room:Math.max(0, useBelow?below:above)};
  };
  var p=pick(soft);
  if(p.room<DROP_MIN) p=pick(hard);                                       // form too tight both ways -> fall back to the modal bound
  // p.room is already the best space available on the chosen side, so cap to it and nothing else:
  // flooring at DROP_MIN here would push the list back OUTSIDE the hard bound whenever even the
  // modal has less than DROP_MIN either way (a very short window). Staying inside wins.
  return {below:p.below, maxHeight:Math.min(DROP_MAX, p.room)};
}
function dropBox(inp, soft){
  var box={top:0, bottom:window.innerHeight};
  var modal=inp.closest?inp.closest('.modal'):null;
  if(modal){ var mr=modal.getBoundingClientRect(); box.top=Math.max(box.top,mr.top); box.bottom=Math.min(box.bottom,mr.bottom); }
  if(soft){
    var panel=inp.closest?inp.closest('.ni-panel'):null;                 // the invoice add-new form
    if(panel){ var pr=panel.getBoundingClientRect(); box.bottom=Math.min(box.bottom,pr.bottom); }
  }
  return box;
}
function anchorDrop(drop){
  if(!drop) return;
  var wrap=drop.closest('.cat-wrap'); var inp=wrap?wrap.querySelector('input'):null;
  if(!inp && drop.previousElementSibling && drop.previousElementSibling.tagName==='INPUT') inp=drop.previousElementSibling;
  if(!inp) return;
  var r=inp.getBoundingClientRect();
  drop.style.position='fixed'; drop.style.left=r.left+'px'; drop.style.width=r.width+'px'; drop.style.right='auto';
  var p=dropPlace(r, dropBox(inp,true), dropBox(inp,false));
  if(p.below){ drop.style.top=(r.bottom+4)+'px'; drop.style.bottom='auto'; }
  else { drop.style.top='auto'; drop.style.bottom=(window.innerHeight-r.top+4)+'px'; }
  drop.style.maxHeight=p.maxHeight+'px';                                  // .cat-drop's overflow:auto scrolls a long list inside this
}
function resetDrop(drop){ if(!drop) return; ['position','left','width','right','top','bottom','maxHeight'].forEach(function(p){ drop.style[p]=''; }); }
(function(){ var reflow=function(){ document.querySelectorAll('.cat-drop').forEach(function(d){ if(getComputedStyle(d).display!=='none') anchorDrop(d); }); };
  window.addEventListener('resize',reflow); window.addEventListener('scroll',reflow,true); })();   // scroll capture=true catches the modal body scroll
function makeInlineCombo(inpId, dropId, listFn){
  var inp=document.getElementById(inpId), drop=document.getElementById(dropId); if(!inp||!drop) return;
  var state={value:inp.value.trim(), isNew:false, confirmed:!!inp.value.trim()}; niCombos[inpId]=state;
  function render(){
    var q=inp.value.trim(), items=listFn();
    var scored=items.map(function(c){return {c:c,s:catScore(c,q)};}).filter(function(o){return o.s>=0;}).sort(function(a,b){return b.s-a.s;}).slice(0,6);
    var html=''; scored.forEach(function(o){var ex=o.c.toLowerCase()===q.toLowerCase();html+='<div class="opt cat-opt" data-v="'+esc(o.c)+'">'+esc(o.c)+(ex?' <span class="ca">exists</span>':'')+'</div>';});
    var hasExact=items.some(function(c){return c.toLowerCase()===q.toLowerCase();});
    if(q && !hasExact) html+='<div class="opt cat-opt cat-create" data-new="'+esc(q)+'">\u2795 Create new: \u201c'+esc(q)+'\u201d</div>';
    if(!html) html='<div class="opt muted">Type to search\u2026</div>';
    drop.innerHTML=html; drop.style.display='block'; anchorDrop(drop);   // v59 item 2: escape the modal-body clip
    drop.querySelectorAll('.cat-opt').forEach(function(o){ o.addEventListener('mousedown',function(e){e.preventDefault();
      var dn=o.getAttribute('data-new');
      if(dn!==null){ inp.value=dn; state.value=dn; state.isNew=true; state.confirmed=true; }
      else { var v=o.getAttribute('data-v'); inp.value=v; state.value=v; state.isNew=false; state.confirmed=true; }
      drop.style.display='none'; resetDrop(drop);
    }); });
  }
  inp.addEventListener('input',function(){ state.confirmed=false; state.isNew=false; state.value=inp.value.trim(); render(); });
  inp.addEventListener('focus',render);
  inp.addEventListener('blur',function(){ setTimeout(function(){ drop.style.display='none'; resetDrop(drop); },150); });
}
function resolveCombo(inpId, listFn){
  var inp=document.getElementById(inpId), st=niCombos[inpId]||{}; var v=(inp?inp.value.trim():'');
  if(!v) return {ok:true, value:''};
  var items=listFn(), exact=items.filter(function(c){return c.toLowerCase()===v.toLowerCase();})[0];
  if(exact) return {ok:true, value:exact};
  if(st.confirmed && st.isNew && (st.value||'').toLowerCase()===v.toLowerCase()) return {ok:true, value:v};
  return {ok:false, value:v};
}
function niLab(t, src){ return '<span class="ni-lab">'+t+'<span class="ni-af">'+(src==='ai'?'AI suggested':'auto-filled')+'</span></span>'; }   /* v37; v62: one chip SYSTEM, two labels — parser fill = "auto-filled", AI second-reader fill = "AI suggested" */
/* v50 item 1 ROOT CAUSE: the new-item form's values + Apply tick lived ONLY as uncontrolled DOM inputs.
   Any edit to another row calls renderInvReview() -> box.innerHTML=html, which destroyed the form and
   recomputed the tick from invRowState (='new' -> unticked) — so an in-progress new item silently
   cleared. Fix: the form state lives on invRows[i].newItem. niSnapshot reads the live form (fields +
   combo state + the row's Apply tick); niRehydrate writes it back after a rebuild. renderInvReview
   snapshots every OPEN form BEFORE the wipe, then rehydrates after — no per-cell poking (v33 holds). */
var NI_COMBOS=['brand','cat','sup','king'];
// v73: which new-item form fields the Gemini reader can prefill, mapping the field id stem to its
// key on r.aiClean. Name is a plain text field; brand/cat/sup are combos (king is never AI-filled).
var AI_FIELD={ name:'name', brand:'brand', cat:'category', sup:'supplier' };
// v73: commit an AI-suggested (or invoice-header) value into a combo — set the input + niCombos state
// so Confirm All doesn't treat it as an unconfirmed new value. Auto-confirmed (Max's call); isNew still
// reflects whether it's genuinely new, so a matching existing value resolves to that canonical entry.
function niSetCombo(id, val, listFn){
  var e=document.getElementById(id); if(!e || val==null || val==='') return;
  e.value=val; var st=niCombos[id];
  if(st){ st.value=val; st.confirmed=true; st.isNew=!listFn().some(function(x){return (x||'').toLowerCase()===String(val).toLowerCase();}); }
}
function niSnapshot(i){
  if(!document.getElementById('ni_name'+i)) return null;           // form not built for this row -> nothing to capture
  var g=function(id){ var e=document.getElementById(id); return e?e.value:''; };
  var combos={};
  NI_COMBOS.forEach(function(f){ var st=niCombos['ni_'+f+i]||{}; combos[f]={value:(st.value||''), isNew:!!st.isNew, confirmed:!!st.confirmed}; });
  var tr=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]'), ap=tr&&tr.querySelector('.invAppr');
  var prev=invRows[i]&&invRows[i].newItem;
  return { name:g('ni_name'+i), unit:g('ni_unit'+i), price:g('ni_price'+i), pack:g('ni_pack'+i),
           brand:g('ni_brand'+i), cat:g('ni_cat'+i), sup:g('ni_sup'+i), king:g('ni_king'+i),
           combos:combos, edited:Object.assign({}, prev&&prev.edited), approved:(ap?!!ap.checked:(prev?!!prev.approved:false)) };   // §F1: which parser-filled fields the user has since edited (so the "auto-filled" chip doesn't come back)
}
function niRehydrate(i){
  var r=invRows[i], s=r&&r.newItem; if(!s) return;
  var clean=r.aiClean||{}, ed=s.edited||{};
  // v73 late-response upgrade: an AI-filled field the user hasn't touched keeps its build-time AI
  // prefill — don't restore the pre-upgrade snapshot over it. aiClean only exists AFTER the reader
  // returns, so before that aiHeld is always false and this path is byte-identical to today.
  var aiHeld=function(field){ var k=AI_FIELD[field]; return !!k && !ed[field] && clean[k]!=null && clean[k]!==''; };
  var set=function(id,v){ var e=document.getElementById(id); if(e&&v!=null) e.value=v; };
  if(!aiHeld('name')) set('ni_name'+i,s.name);
  set('ni_unit'+i,s.unit); set('ni_price'+i,s.price); set('ni_pack'+i,s.pack);
  NI_COMBOS.forEach(function(f){
    if(aiHeld(f)) return;                                          // leave the AI prefill for this untouched, AI-filled combo
    var id='ni_'+f+i, e=document.getElementById(id), c=s.combos&&s.combos[f];
    if(c){ if(e) e.value=(c.value||''); niCombos[id]={value:(c.value||''), isNew:!!c.isNew, confirmed:!!c.confirmed}; } });
}
function expandNewItem(i){
  var nirow=document.querySelector('.ni-slot[data-ni="'+i+'"]'); if(!nirow) return;   // v72: the form slot now lives inside the row's Match cell (was a separate .ni-row)
  var panel=nirow.querySelector('.ni-panel'), r=invRows[i];
  if(!panel.dataset.built){
    var ut=r.unit==='kg'?'kg':r.unit==='l'?'litre':r.unit==='ea'?'unit':'kg';
    var pv=(r.unitPrice!=null)?r.unitPrice.toFixed(2):'';   // v72: display rounds to the cent, like the matched-row .invPrice prefill (was raw — showed 12.77450980… in the field)
    // v55 §F1: the "auto-filled" chip must key off fields the PARSER filled, not off emptiness (the old
    // :placeholder-shown CSS lit the chip on ANY typed value). Mark those fields with class "af" at build,
    // omit it for fields the user has already edited (tracked on r.newItem.edited so it survives re-renders),
    // and clear it live on first input below.
    var ed=(r.newItem&&r.newItem.edited)||{};
    function afA(f,filled){ return (filled && !ed[f]) ? ' class="af"' : ''; }
    var src=r.aiSource?'ai':'';                              // v62: an AI-appended row (rule 5) labels its prefilled fields "AI suggested"; a parser-built row keeps "auto-filled". Same chip system.
    // v73: per-field descriptive prefill. When the Gemini reader has a clean value for a field the user
    // hasn't edited, use it with the "AI suggested" mark; otherwise fall back to today's deterministic
    // value (parser name / blank brand+cat / invoice-header supplier) with its normal treatment. The AI
    // INTERPRETS the raw text, so its fills carry the AI mark (Max's call), never the plain auto-filled one.
    var clean=r.aiClean||{};
    function niFld(field,detVal,detFilled){
      var k=AI_FIELD[field], aiVal=(k?clean[k]:null);
      if(aiVal && !ed[field]) return {val:aiVal, src:'ai', filled:true, ai:true};
      return {val:detVal, src:src, filled:detFilled, ai:false};
    }
    var fName=niFld('name', r.name, true),
        fBrand=niFld('brand', '', false),
        fCat=niFld('cat', '', false),
        fSup=niFld('sup', (invSupplier||''), !!invSupplier);
    panel.innerHTML=''
     +'<button type="button" class="x ni-close" aria-label="Close add-new-item form">\u00d7</button>'
     +'<div class="ni-head">Add new item from this invoice line</div>'
     +'<div class="ni-grid">'
     /* v37: every field is label-line + control-line; the auto-filled chip lives INLINE on the label — one place, every field, no overlap possible */
     +'<label class="ni-f">'+niLab('Name',fName.src)+'<input id="ni_name'+i+'" type="text"'+afA('name',fName.filled)+' value="'+esc(fName.val)+'"></label>'
     +'<label class="ni-f">'+niLab('Brand',fBrand.src)+'<span class="cat-wrap"><input id="ni_brand'+i+'" type="text"'+afA('brand',fBrand.filled)+' value="'+esc(fBrand.val)+'" autocomplete="off" placeholder="search brands\u2026"><span id="ni_brandDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Category',fCat.src)+'<span class="cat-wrap"><input id="ni_cat'+i+'" type="text"'+afA('cat',fCat.filled)+' value="'+esc(fCat.val)+'" autocomplete="off" placeholder="search categories\u2026"><span id="ni_catDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Supplier',fSup.src)+'<span class="cat-wrap"><input id="ni_sup'+i+'" type="text"'+afA('sup',fSup.filled)+' value="'+esc(fSup.val)+'" autocomplete="off" placeholder="search suppliers\u2026"><span id="ni_supDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Unit type',src)+'<select id="ni_unit'+i+'"'+afA('unit',!!r.unit)+'><option value="kg">per kg</option><option value="g">per g</option><option value="litre">per litre</option><option value="ml">per ml</option><option value="unit">per unit/each</option></select></label>'
     +'<label class="ni-f">'+niLab('Price per unit ($)',src)+'<input id="ni_price'+i+'" type="number" min="0" step="0.01"'+afA('price',pv!=='')+' value="'+pv+'"></label>'
     +'<label class="ni-f">'+niLab('Pack size (optional)',src)+'<input id="ni_pack'+i+'" type="text" placeholder="e.g. 6 x 2.5kg"></label>'
     +'<label class="ni-f ni-full">'+niLab('Ingredient name (optional)',src)+'<span class="cat-wrap"><input id="ni_king'+i+'" type="text" autocomplete="off" placeholder="the name you\u2019ll use when building plates"><span id="ni_kingDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'</div><div class="ferr" id="ni_err'+i+'" style="display:none"></div>';
    panel.dataset.built='1';
    var _nc=panel.querySelector('.ni-close'); if(_nc){ _nc.onclick=function(ev){ ev.preventDefault(); closeNewItem(i); }; }
    var us=document.getElementById('ni_unit'+i); if(us) us.value=ut;
    makeInlineCombo('ni_brand'+i,'ni_brandDrop'+i,prodBrands);
    makeInlineCombo('ni_cat'+i,'ni_catDrop'+i,prodCategories);
    makeInlineCombo('ni_sup'+i,'ni_supDrop'+i,prodSuppliers);
    // ITEM 5 (v35): the kitchen-name field is now a combobox over EXISTING kitchen words.
    // Typing filters them; picking one re-points that word at this new product on save
    // (the brand-swap case). Typing something new still creates a new linked word.
    // v55 §F2: the kitchen-name field starts BLANK. The combo still suggests existing kitchen words as the
    // user types (rank + pick to repoint, or type a new one) — but nothing is auto-filled, so the form never
    // silently means "repoint this word" without the user choosing it.
    makeInlineCombo('ni_king'+i,'ni_kingDrop'+i,kingNames);
    // v73: commit each prefilled combo's value into niCombos state so Confirm All accepts it (a prefilled
    // value that makeInlineCombo captured with isNew=false would otherwise fail resolveCombo when it's new).
    // Supplier keeps today's invoice-header behaviour when the AI has none; brand/cat only when AI-filled.
    if(fBrand.filled) niSetCombo('ni_brand'+i, fBrand.val, prodBrands);
    if(fCat.filled)   niSetCombo('ni_cat'+i,   fCat.val,   prodCategories);
    if(fSup.filled)   niSetCombo('ni_sup'+i,   fSup.val,   prodSuppliers);
    // v55 §F1 + v73: mark a field EDITED on ANY user change (type OR combo-pick) and drop its chip. The
    // edited flag both stops the chip re-marking on re-render AND stops a late AI response from overwriting
    // a field the user has touched (niRehydrate honours it). v73 broadens v55's af-only marking to every
    // field so a value typed before the reader returns is preserved through the upgrade.
    var niFieldId=function(id){ return (id||'').replace('ni_','').replace(new RegExp(i+'$'),''); };
    var niMarkEdited=function(f){ if(!f) return; r.newItem=r.newItem||{}; r.newItem.edited=r.newItem.edited||{}; r.newItem.edited[f]=true; };
    var niOnEdit=function(e){ var t=e.target; if(!t||!t.id) return; var f=niFieldId(t.id); niMarkEdited(f); if(t.classList&&t.classList.contains('af')) t.classList.remove('af'); };
    panel.addEventListener('input', niOnEdit, true);
    panel.addEventListener('change', niOnEdit, true);
    // a combo PICK sets the input via mousedown on a .cat-opt and fires no input/change event — count it too
    panel.addEventListener('mousedown', function(e){ var opt=(e.target&&e.target.closest)?e.target.closest('.cat-opt'):null; if(!opt) return; var wrap=opt.closest('.ni-f'), ctrl=wrap&&wrap.querySelector('input[id^="ni_"],select[id^="ni_"]'); if(ctrl) niMarkEdited(niFieldId(ctrl.id)); }, true);
  }
  nirow.style.display='';
  // v50 item 1: first open -> snapshot the prefilled defaults onto the row; every later (re)build ->
  // rehydrate from what the user had typed, so an unrelated re-render can't wipe an in-progress item.
  if(r.newItem){ niRehydrate(i); } else { r.newItem=niSnapshot(i); }
}
function collapseNewItem(i){ var nirow=document.querySelector('.ni-slot[data-ni="'+i+'"]'); if(nirow) nirow.style.display='none'; }
function closeNewItem(i){
  collapseNewItem(i);
  var r=invRows[i]; if(r){ delete r.userTick; r.addNew=false; r.bestId=null; r.manualPick=false; r.newItem=null; }   /* dismissing the form = this line is neither new nor matched (skip); drop its saved form state */
  renderInvReview();                                               /* ITEM 1 (v33): single render path rebuilds the row (dropdown back to "assign manually", labelled dashes, unticked) */
}
function invUnitToBase(unitType){
  if(unitType==='kg') return {base_unit:'g', cost_basis:'$/g', div:1000};
  if(unitType==='litre'||unitType==='l') return {base_unit:'ml', cost_basis:'$/ml', div:1000};
  if(unitType==='g') return {base_unit:'g', cost_basis:'$/g', div:1};
  if(unitType==='ml') return {base_unit:'ml', cost_basis:'$/ml', div:1};
  return {base_unit:'ea', cost_basis:'$/unit', div:1};
}
function collectNewItem(i){
  var g=function(id){var e=document.getElementById(id);return e?e.value.trim():'';};
  var errEl=document.getElementById('ni_err'+i); function fail(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} return null; }
  if(errEl) errEl.style.display='none';
  var name=g('ni_name'+i), price=parseFloat(g('ni_price'+i)), unitType=g('ni_unit'+i), pack=g('ni_pack'+i);
  if(!name) return fail('Enter a product name.');
  if(isNaN(price)||price<0) return fail('Enter a valid price per unit.');
  if(!unitType) return fail('Choose a unit type.');
  if(!g('ni_cat'+i)) return fail('Choose or create a category.');
  var cat=resolveCombo('ni_cat'+i, prodCategories); if(!cat.ok) return fail('\u201c'+cat.value+'\u201d is a new category \u2014 pick \u201cCreate new\u201d from the list to confirm.');
  var br=resolveCombo('ni_brand'+i, prodBrands); if(!br.ok) return fail('\u201c'+br.value+'\u201d is a new brand \u2014 pick \u201cCreate new\u201d to confirm.');
  var sup=resolveCombo('ni_sup'+i, prodSuppliers); if(!sup.ok) return fail('\u201c'+sup.value+'\u201d is a new supplier \u2014 pick \u201cCreate new\u201d to confirm.');
  var ub=invUnitToBase(unitType);
  return {name:name, brand:br.value||null, category:cat.value, supplier:sup.value||null,
          base_unit:ub.base_unit, cost_basis:ub.cost_basis, cpbu:price/ub.div, pack_size_raw:pack||null,
          kingName:(g('ni_king'+i)||null)};
}
/* ---- review table ---- */
function invMatchOptions(r){
  var html='<option value="skip"'+((!r.bestId&&!r.addNew)?' selected':'')+'>\u2014 assign manually \u2014</option>';
  if(r.cands && r.cands.length){
    html+='<optgroup label="Suggested matches">';
    r.cands.forEach(function(c){ var p=byId[c.id]; if(!p)return;
      html+='<option value="'+c.id+'"'+((!r.addNew&&r.bestId===c.id)?' selected':'')+'>'+esc(p.description)+(p.brand?' \u2014 '+esc(p.brand):'')+'  ('+Math.round(c.coverage*100)+'%)</option>'; });
    html+='</optgroup>';
  }
  html+='<optgroup label="All products">'+prodOptions(r.addNew?null:r.bestId)+'</optgroup>';
  return html;
}
function tierOf(cov){ return cov>=0.6?'hi':(cov>=0.3?'mid':'lo'); }  // same thresholds buildInvRows uses
/* ITEM 1 (v33): the Confidence cell's value. A manual pick is NOT missing data — if the chosen
   product is one of the ranked candidates we show its coverage; otherwise we show a labelled
   'manual' token. Never a bare, unexplained dash on a row that has a product. */
function invDisplayConf(r){
  if(r.addNew || !r.bestId) return {tier:'none', label:'\u2014', has:false};
  if(!r.manualPick) return {tier:(r.tier||'lo'), label:Math.round((r.conf||0)*100)+'%', has:true};
  var cand=(r.cands||[]).filter(function(c){return c.id===r.bestId;})[0];
  if(cand){ var pc=Math.round(cand.coverage*100); return {tier:tierOf(cand.coverage), label:pc+'%', has:true}; }
  return {tier:'manual', label:'manual', has:true};
}
function invRowState(r){                                            // ITEM 4: single source of truth — the summary and the cards must never disagree
  if(r.addNew) return 'new';
  if(r.uncertain) return 'review';
  if(!r.bestId) return 'review';                                     // no match / manually-skipped
  if(r.needManual || r.unitMismatch) return 'review';
  if(r.needsAttention) return 'review';                              // price jump etc.
  if(r.gemReview) return 'review';                                   // v62: AI second reader adopted a value P disagreed with + no history to arbitrate (rule 4) — a human confirms. Auto-tick stays pinned to 'matched' below, so this row waits for the user's tick.
  if(r.gemMatchReview) return 'review';                              // v63 item 2: AI suspects the parser matched the WRONG product — a human ticks the right one
  if(r.gemPriceReview) return 'review';                              // v66: AI + price history suggest the parser MISREAD the price — a human checks (price is NOT changed)
  if(r.tier!=='hi') return 'review';                                 // low-confidence match still wants a human tick
  return 'matched';
}
/* v45 item 1: ONE derive-preview formula — the render prefill and the live recompute must never
   disagree, so both read this. Returns '' when the pack maths can't run (no qty / no pack price). */
function invPackPreviewText(r, q, u){
  if(!(q>0)) return '';
  var pack=packPriceOf(r.raw||r.name); if(pack==null) return '';
  var up=(u==='kg'||u==='g') ? pack/(q*(u==='kg'?1:0.001)) : (u==='l'||u==='ml') ? pack/(q*(u==='l'?1:0.001)) : pack/q;
  if(!isFinite(up)||up<0) return '';
  var cat=(u==='kg'||u==='g')?'kg':(u==='l'||u==='ml')?'l':'ea';
  var old=(r.bestId&&byId[r.bestId]&&cpbu(byId[r.bestId])!=null)?dispPrice(byId[r.bestId]):null;
  return (old?('Was '+old+' → '):'')+'will be $'+up.toFixed(2)+(cat==='kg'?'/kg':cat==='l'?'/L':'/unit');
}
/* v113 — THE WAITING PANEL, AND WHY THE GATE HAD TO MOVE HERE.
   The first cut of this batch only disabled Confirm All. That is the wrong point, because the referee
   does not merely arrive too late to matter — it DEFERS to whatever the human already decided:
     · picking a match sets r.manualPick        -> gemRowLocked -> gemApplyReadings SKIPS the row whole
     · ticking an add-new sets newItem.approved -> same total skip
     · teaching a pack sets packTaught/taughtQty-> T is true    -> gemMergeLine rule 1, no adjudication
   and invSelChanged additionally clears gemMatchReview/gemPriceReview. So a ruling made in the window
   is not just a ruling on unchecked data, it SILENCES the check for that line and is then treated as
   informed. Gating the last step left every step before it exposed. (Max, 6 Aug 2026 — this overrides
   the brief's "do not block the whole review", a decision made without knowing about gemRowLocked.)
   The counts are deliberately NOT shown here: the referee changes them (it demotes rows and appends
   its own), so a summary now would be a number that silently rewrites itself. */
function renderInvWaiting(box){
  var n=invRows.length;
  // F8 (v147): the mock's §4 scanning bar, reused verbatim from step 2 — reading the file and
  // double-checking it are one wait to the person watching, so they wear one visual.
  box.innerHTML='<div class="inv-wait" role="status" aria-live="polite">'
    +'<div class="inv-wait-t">Double-checking '+n+' line'+(n===1?'':'s')+' with the AI reader…</div>'
    +'<div class="inv-bar" aria-hidden="true"><span></span></div>'
    +'<div class="inv-wait-s">Nothing has been saved. The lines appear once the check is done.</div></div>';
  box.style.display='block';
  invStep('review');
}
/* Q8 (v127): the footer counts what will actually apply — "Confirm N changes", recounted on every
   tick and every re-render from the live checkboxes (the same boxes confirmApplyInvoice reads). */
function updateInvApplyCount(){
  var box=document.getElementById('invReview'); var btn=box&&box.querySelector('#invApply'); if(!btn) return;
  var n=box.querySelectorAll('.invAppr:checked').length;
  btn.textContent='Confirm '+n+' change'+(n===1?'':'s');
}
function renderInvReview(){
  if(gemPending()){ var wbox=document.getElementById('invReview'); if(wbox) renderInvWaiting(wbox); return; }   // v113: nothing actionable exists until the referee has spoken
  invRows.forEach(function(r,i){ if(r&&r.addNew&&r.newItem){ var s=niSnapshot(i); if(s) r.newItem=s; } });   // v50 item 1: capture an OPEN new-item form before innerHTML wipes it. Guarded on r.newItem so a fresh addNew row (newItem:null) can't absorb a stale form left in the DOM by a previous invRows/import — only a form THIS row actually opened is re-captured.
  invRows.forEach(flagNeedsAttention);                              // ensure needsAttention is current for EVERY row before we count
  var states=invRows.map(invRowState);
  var matched=states.filter(function(s){return s==='matched';}).length;
  var newc=states.filter(function(s){return s==='new';}).length;
  var review=states.filter(function(s){return s==='review';}).length;
  // Q8 (v127): the verdict reads as a sentence — the design's copy, same three invRowState counts
  var html='<div class="inv-sum"><b>'+matched+' matched and ready</b> · '+review+(review===1?' needs':' need')+' your eye · '+newc+' new product'+(newc===1?'':'s')+'. Nothing saves until you confirm.'+gemStatusHtml()+'</div>';
  if(invGst.note) html+='<div class="inv-gst">'+esc(invGst.note)+'</div>';
  html+='<div class="atable-wrap"><table class="invtable"><thead><tr><th>Invoice line</th><th>Unit price</th><th>Match to product</th><th>Old</th><th>Conf.</th><th>Apply</th></tr></thead><tbody>';
  invRows.forEach(function(r,i){
    var conf=Math.round(r.conf*100);
    // ITEM 1 (v35) ROOT CAUSE: style.css hid td4/td5 (Old price / Confidence) off .muted-row, which sits on EVERY non-matched row — so price-jump and low-confidence rows rendered both cells correctly and then had them hidden, exactly where the old price matters most. The hiding now keys off .is-new (add-new lines only); .muted-row keeps its opacity treatment alone.
    var rc=(invRowState(r)==='matched')?'':' muted-row';
    if(r.addNew) rc+=' is-new';
    var uLbl=unitLabelFor(r)||'/unit';
    var pv=(r.unitPrice!=null)?r.unitPrice.toFixed(2):'';
    var unitWordOf=function(u){return u==='ea'?'units':u==='l'?'L':u==='ml'?'mL':(u||'');};
    var upriceHtml='<div class="uprice-edit"><span class="dol">$</span><input type="number" class="invPrice" min="0" step="0.01" placeholder="unit price" value="'+pv+'"><span class="upu">'+uLbl+'</span></div>';
    // v44 item 1: ONE pack control, two moods. The "Pack: N units \u2014 change" chip is gone; every row
    // with pack context shows the same always-visible [qty][unit][\u2713] row, prefilled with the known pack.
    // A mismatch/unresolved row is the SAME control in its red required state (.pt-required) \u2014 no second
    // visual pattern. Resolution logic, precedence, invRowState and what \u2713 writes are all UNCHANGED.
    var teachHtml='';
    if(r.needManual || r.remembered || r.fromProductPack){
      var mem=(normSupplier(invSupplier)?supplierMem[memKey(invSupplier, r.raw||r.name)]:null);
      var baseCat0=(r.bestId&&byId[r.bestId])?unitCatCategory(byId[r.bestId].base_unit):null;
      // ITEM 1 (v38): the prefill follows the SAME precedence as pricing — product pack > supplier memory > parser guess. r.taughtQty is only set when resolveMatchedPrice actually applied the product pack, so read the product directly as the next fallback: otherwise a product with a taught pack could still be prefilled with the parser's "1.5 kg" guess, and re-confirming that guess would overwrite the taught pack with it.
      var bprod=(r.bestId&&byId[r.bestId])?byId[r.bestId]:null;
      var prodPack=(bprod && bprod.pack_qty>0 && bprod.pack_unit)?bprod:null;
      var pq=(r.taughtQty!=null&&isFinite(r.taughtQty))?r.taughtQty:(prodPack?prodPack.pack_qty:(mem?mem.qty:''));
      var puNow=r.taughtUnit?r.taughtUnit:(prodPack?prodPack.pack_unit:(mem&&mem.unit?mem.unit:(packCount(r.raw||r.name)?'ea':(baseCat0==='kg'?'kg':baseCat0==='l'?'l':'ea'))));
      var required=(r.needManual && !r.remembered);                // unresolved -> the same control, red required mood
      teachHtml='<span class="pack-teach'+(required?' pt-required':'')+'" data-i="'+i+'">'
        +'<span class="pt-lbl sr-only">How many in one pack?</span>'
        +'<span class="pt-group">'
        +'<input type="number" class="invPackQty" inputmode="decimal" min="0" step="0.01" placeholder="qty" title="How many in one pack?" value="'+pq+'">'
        +'<select class="invPackUnit" aria-label="pack unit">'+['ea','kg','g','l','ml'].map(function(u){var lbl=unitWordOf(u); return '<option value="'+u+'"'+(u===puNow?' selected':'')+'>'+lbl+'</option>';}).join('')+'</select>'
        +'</span>'
        +'<button type="button" class="pt-done" title="Done" aria-label="Done">\u2713</button>'
        +'</span>';
    }
    // v45 item 1: the derive preview is its OWN line under the price+pack row (was an inline chip
    // inside .pack-teach), prefilled from the same precedence the inputs use so it shows before typing.
    // v62: rule-4 rows carry an "AI suggested" chip on the price field — the exact .ni-af chip system,
    // inline-flow (never absolutely positioned) so a wrapped price row pushes it to the next line rather
    // than overlapping. Only on matched (non-add-new) rows; the add-new form has its own label chips.
    var aiChip=(!r.addNew && r.aiSuggested)?'<span class="ai-sug" title="Suggested by the AI second reader">AI suggested</span>':'';
    var priceCell='<div class="price-row">'+upriceHtml+aiChip+teachHtml+'</div>'
      +(teachHtml?'<div class="pt-preview">'+esc(invPackPreviewText(r, parseFloat(pq), puNow))+'</div>':'');
    if(r.needManual && !r.remembered){
      var baseCat=(r.bestId&&byId[r.bestId])?unitCatCategory(byId[r.bestId].base_unit):null;
      var baseWord=baseCat==='kg'?'per kg':baseCat==='l'?'per litre':'per unit';
      var msg=r.unitMismatch ? ('This item was priced '+baseWord+' \u2014 edit the pack size to determine price per unit.') : 'Set the pack, or type the price.';   // v45 item 2 wording
      priceCell+='<div class="flag-review pt-explain">'+esc(msg)+'</div>';   // raw invoice line removed (was clutter); logged to console for debugging
      try{ if(window.console&&r.unitMismatch) console.debug('[inv mismatch]', r.raw||r.name); }catch(e){}
    }
    var dc=invDisplayConf(r);                                    // ITEM 1 (v35): hoisted — the DISPLAYED confidence drives the low-match cue, so the token and the % can never contradict each other
    var lowMatch=(dc.tier==='mid'||dc.tier==='lo');              // fires only when a % is shown and that % isn't high. Never on a hand-picked row ('manual') or one with no product ('none') — the user already made that call.
    var flag=r.uncertain?' <span class="flag-review">is this a product?</span>':(r.unitMismatch?' <span class="flag-mismatch">unit mismatch</span>':(r.bestId?(r.gemMatchReview?' <span class="flag-review">check match</span>':(r.gemPriceReview?' <span class="flag-review">check price</span>':(r.needsAttention?' <span class="flag-review">price change \u2014 check</span>':(lowMatch?' <span class="flag-review">low match \u2014 check</span>':'')))):(r.addNew?' <span class="flag-new">new item</span>':' <span class="flag-review">no match</span>')));   // ITEM 4 (v34): the red row treatment is never the only signal. Precedence: uncertain > mismatch > suspected wrong match (v63) > AI price-check (v66) > price jump > low match.
    /* Q8 (v127) — THE TICK TRUTH TABLE (the v50/v52 "ticks lost on any re-render" bug, fixed):
         userTick set   -> the USER's tick/untick stands, whatever the state (their decision, restored —
                           not a pre-tick; an untick on a matched row survives too)
         userTick unset -> the auto-tick law, unchanged: ONLY 'matched' pre-ticks
         addNew rows    -> r.newItem.approved stays the one home for that tick (v50 contract)
       EVERY self-edit to a row's basis (match pick, price edit, pack teach, +New open/close) DELETES
       its userTick — persistence exists ONLY to protect ticks from re-renders caused ELSEWHERE.
       userTick needs no gemRowLocked entry for one reason: the v113 gate renders NO checkboxes while
       the referee is pending, so no userTick can exist for it to override — if that gate ever
       weakens, revisit this. */
    var checked = r.addNew ? !!(r.newItem && r.newItem.approved)
      : (r.userTick!=null ? !!r.userTick : (invRowState(r)==='matched'));
    var chips='';
    if(!r.addNew && r.cands && r.cands.length>1){                 // multiple plausible matches: surface the real choices immediately
      chips='<div class="cand-chips">'+r.cands.slice(0,3).map(function(c){
        var p=byId[c.id]; if(!p) return '';
        var fullNm=p.description+(p.brand?' \u00b7 '+p.brand:'');     // the full name \u2014 shown in the chip on mobile (wraps), title-hover on desktop
        // v72 (Max): emit the FULL name, no JS truncation. Desktop keeps the compact chip \u2014 CSS clips with an
        // ellipsis and `title` reveals it on hover (unchanged). Mobile lets the chip WRAP so the name is never
        // cut off \u2014 which removes the need for the old white-toast long-press reveal (wiring dropped below).
        return '<button type="button" class="cand-chip'+((!r.addNew&&r.bestId===c.id)?' sel':'')+(c.ai?' ai':'')+'" data-i="'+i+'" data-cid="'+esc(c.id)+'" title="'+esc(fullNm)+'">'+(c.ai?'<span class="cc-ai" title="Suggested by the AI second reader">AI</span> ':'')+esc(fullNm)+' <span class="cc-pct">'+Math.round(c.coverage*100)+'%</span></button>';   // v63 item 2: the AI-suspected product is ranked first and carries the same accent chip system (see .cc-ai)
      }).join('')+'</div>';
    }
    // v72: the new-item form now nests INSIDE the line's card, in the Match-to cell right below the
    // "Editing new item" toggle — so the one card reads header → price → match → form → Apply (last).
    // The form panel lives in this .ni-slot (was a separate colspan-6 .ni-row that rendered as a detached
    // white card); expandNewItem fills it. The Apply checkbox is UNMOVED (still the row's final cell), so
    // the inv-rowmarkup ROW_END anchor + the v50 checked-persistence contract are untouched.
    var matchCell = r.addNew
      ? '<div class="match-cell match-new"><button class="btn ni-add-btn" type="button" data-add="'+i+'">+ Add as New Item</button>'
        +'<div class="ni-slot" data-ni="'+i+'" style="display:none"><div class="ni-panel"></div></div></div>'
      : '<div class="match-cell">'+chips+'<select class="invSel">'+invMatchOptions(r)+'</select>'
        +'<button class="btn ni-add-btn ni-add-alt" type="button" data-add="'+i+'">+ New</button></div>';
    // ITEM 1 (v33): a matched row — auto OR manual — always shows the linked product's current price and a real confidence.
    // Only a row with no product shows a dash, and it keeps its mobile label so the line never silently vanishes.
    var oldCell = (r.bestId && byId[r.bestId])
      ? '<td class="num invOld">'+dispPrice(byId[r.bestId])+'</td>'
      : '<td class="num invOld dash">\u2014</td>';
    var confCell = '<td class="num'+(dc.has?'':' dash')+'"><span class="conf '+dc.tier+'">'+dc.label+'</span></td>';
    html+='<tr class="inv-data'+rc+(r.needsAttention?' needs-attention':'')+' st-'+invRowState(r)+'" data-i="'+i+'">'+   // v37: the tint and the summary can never disagree — both read invRowState
      '<td>'+esc(r.name)+flag+'</td>'+
      '<td class="num">'+priceCell+'</td>'+
      '<td>'+matchCell+'</td>'+
      oldCell+
      confCell+
      '<td class="apprcell"><label class="appr-hit"><input type="checkbox" class="invAppr"'+(checked?' checked':'')+'></label></td></tr>';
    // v72: the form panel moved INTO the row's Match cell (.ni-slot, see matchCell above) — no separate row.
  });
  // v113: no `disabled` binding here on purpose. Reaching this line means gemPending() was false, so it
  // could only ever render as enabled — an attribute that cannot fire reads as a second gate and is not
  // one. The real gate is the early return above; invConfirmState still supplies the HINT, which is how
  // the user learns the lines were never AI-checked when the referee timed out.
  var cst=invConfirmState(gemStatus, aiInvoiceCheck);
  /* F8 (v147): the mock's §4 footer bar — hint left, Cancel + primary right. Cancel is NEW and is
     the mock's, not an invention: until now the only way out of a review was the × in the header,
     which on a phone sits above a screenful of scrolled rows. It closes, it never applies.
     The mock's "3 price updates, 30 unchanged" line is NOT reproduced (R5, the loss stated): the
     .inv-sum verdict at the top already counts the app's THREE real states, and two summaries that
     partition the same rows differently is how the summary and the cards came to disagree once. */
  html+='</tbody></table></div><div class="inv-actions">'
    +'<span class="hint'+(cst.unverified?' hint-unverified':'')+'" aria-live="polite">'+esc(cst.hint)+'</span>'
    +'<span class="inv-actions-gap"></span>'
    +'<button class="btn" id="invCancel" type="button">Cancel</button>'
    +'<button class="btn primary" id="invApply" type="button">Confirm All</button></div>';
  var box=document.getElementById('invReview'); box.innerHTML=html; box.style.display='block';
  invStep('review');
  box.querySelectorAll('.invSel').forEach(function(sel){ sel.onchange=function(){invSelChanged(sel.closest('tr'));}; });
  box.querySelectorAll('.invPrice').forEach(function(inp){                 // ITEM 7 root cause: editing the price never recomputed needs-attention, so a clearly-different price failed to turn red
    inp.addEventListener('change', function(){
      var tr=inp.closest('tr'); if(!tr) return; var i=parseInt(tr.dataset.i,10); var r=invRows[i]; if(!r) return;
      var v=parseFloat(inp.value); r.unitPrice=(!isNaN(v)&&v>=0)?v:null;
      delete r.userTick;                                                   // Q8 (v127): the user edited THIS row's price — the old tick approved a different application (v127 review: a blanked price kept its tick and applied nothing, silently)
      if(r.bestId && byId[r.bestId] && (!r.unit || r.unit==='auto')){ var b=byId[r.bestId].base_unit; r.unit=(b==='g'?'kg':b==='ml'?'l':'ea'); }
      r.needManual=(r.unitPrice==null && !r.packTaught);
      r.gemPriceReview=false;                                              // v66: the human just set the price — the AI price-check is resolved
      renderInvReview();                                                   // full repaint so the red state, summary counts and Apply tick all stay consistent (fires on blur, not per keystroke)
    });
  });
  box.querySelectorAll('.pack-teach').forEach(function(pt){
    function recompute(){
      var tr=pt.closest('tr'); if(!tr) return; var i=parseInt(pt.getAttribute('data-i'),10); var r=invRows[i]; if(!r) return;
      var q=parseFloat(pt.querySelector('.invPackQty').value); var u=pt.querySelector('.invPackUnit').value;
      if(!(q>0)) return;
      var pack=packPriceOf(r.raw||r.name); if(pack==null) return;
      var up = (u==='kg'||u==='g') ? pack/(q*(u==='kg'?1:0.001)) : (u==='l'||u==='ml') ? pack/(q*(u==='l'?1:0.001)) : pack/q;
      var cat=(u==='kg'||u==='g')?'kg':(u==='l'||u==='ml')?'l':'ea';
      if(isFinite(up)&&up>=0){
        r.unitPrice=up; r.unit=cat; r.needManual=false; r.unitMismatch=false; r.packTaught=true; r.taughtQty=q; r.taughtUnit=u;   // the unit chosen HERE is the one that gets written — full stop
        var pin=tr.querySelector('.invPrice'); if(pin) pin.value=up.toFixed(2);
        var upu=tr.querySelector('.upu'); if(upu) upu.textContent=unitLabelFor(r);
        var badge=tr.querySelector('.flag-mismatch'); if(badge) badge.style.display='none';
        var pvEl=tr.querySelector('.pt-preview');                  // v45 item 1: the preview line lives under .price-row now, not inside .pack-teach
        if(pvEl){ pvEl.textContent=invPackPreviewText(r, q, u); }
        delete r.userTick;                                       // Q8 (v127): teaching a pack is a self-edit — the tick resets to the state default like every other edit to this row's basis
        var ap=tr.querySelector('.invAppr'); if(ap)ap.checked=(invRowState(r)==='matched');   // v39: a flagged row never auto-ticks
      }
    }
    pt.querySelector('.invPackQty').addEventListener('input', recompute);
    pt.querySelector('.invPackUnit').addEventListener('change', recompute);
  });
  box.querySelectorAll('.pt-done').forEach(function(d){ d.onclick=function(){ renderInvReview(); }; });
  box.querySelectorAll('.cand-chip').forEach(function(ch){
    // v72 (Max): the chip now shows the FULL name (wraps on mobile, ellipsis + `title` hover on desktop), so the
    // old white-toast long-press reveal is gone — a chip is simply tap-to-select.
    ch.onclick=function(){
      var tr=ch.closest('tr'); if(!tr) return; var i=parseInt(tr.dataset.i,10);
      var sel=tr.querySelector('.invSel'); if(!sel) return;
      sel.value=ch.getAttribute('data-cid');
      invSelChanged(tr);                                             // updates row data + full re-render (this tr is now detached)
      var fresh=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]');   // re-query the rebuilt row; the selected chip's .sel + % come from render
      var ap=fresh&&fresh.querySelector('.invAppr'); if(ap) ap.checked=(invRowState(invRows[i])==='matched');   // userTick was deleted by invSelChanged just above — the state default IS the truth here
    };
  });
  box.querySelectorAll('.ni-add-btn').forEach(function(b){ b.onclick=function(){
    var i=parseInt(b.getAttribute('data-add'),10), tr=b.closest('tr'), r=invRows[i];
    if(b.classList.contains('open')){ closeNewItem(i); return; }   /* second tap collapses */
    if(r){ r.addNew=true; r.bestId=null; r.manualPick=false; delete r.userTick; }      /* reject any prior match, this line becomes a new item — and the tick that approved it goes too (Q8) */
    renderInvReview();                                              /* ITEM 1 (v33): single path — row becomes "new", Old/Conf render as labelled dashes */
    expandNewItem(i);                                              /* then open the form on the freshly-rendered row */
    var fresh=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]');
    var fb=fresh&&fresh.querySelector('.ni-add-btn'); if(fb){ fb.classList.add('open'); fb.textContent='Editing new item \u2193'; }
    var ap=fresh&&fresh.querySelector('.invAppr'); if(ap) ap.checked=false;   // v39: new items are ticked by the user once the form is filled
  }; });
  document.getElementById('invApply').addEventListener('click',confirmApplyInvoice);
  var _ic=document.getElementById('invCancel'); if(_ic) _ic.addEventListener('click',closeInv);
  // Q8 (v127): persist the human's tick (the truth table at `checked`), and keep the footer count live
  box.querySelectorAll('.invAppr').forEach(function(cb){
    cb.addEventListener('change', function(){
      var tr=cb.closest('tr'); if(!tr) return; var i=parseInt(tr.dataset.i,10); var r=invRows[i]; if(!r) return;
      if(r.addNew){
        /* F8 (v147) — THE TICK WITH NOWHERE TO LIVE. r.newItem is the v50 home for an add-new tick,
           and it does not exist until the form is opened. An AI-appended add-new row (rule 5) renders
           with a checkbox and no form, so ticking it stored the decision ONLY in the DOM: the next
           re-render read `!!(r.newItem && r.newItem.approved)` = false and dropped it, and if the tick
           survived to Confirm, collectNewItem returned null and the whole import failed on "Fix the
           highlighted new item" pointing at nothing highlighted. Opening the form on the first tick is
           the fix rather than refusing the tick, because a form is what the user needs next either way
           — and expandNewItem's own first-open snapshot reads this very checkbox, so `approved` is
           already true by the time the assignment below runs. */
        if(!r.newItem && cb.checked){
          expandNewItem(i);
          var fb=tr.querySelector('.ni-add-btn'); if(fb){ fb.classList.add('open'); fb.textContent='Editing new item ↓'; }
        }
        if(r.newItem) r.newItem.approved=cb.checked;
      }
      else r.userTick=cb.checked;
      updateInvApplyCount();
    });
  });
  updateInvApplyCount();
  invRows.forEach(function(r,i){                                   // v50 item 1: re-open + rehydrate any new-item form that was open before this rebuild
    if(r&&r.addNew&&r.newItem){
      expandNewItem(i);
      var fresh=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]'), fb=fresh&&fresh.querySelector('.ni-add-btn');
      if(fb){ fb.classList.add('open'); fb.textContent='Editing new item ↓'; }
    }
  });
  updateLastImport();
}
var PRICE_JUMP=0.12;                                              // >12% move vs the stored price is worth a glance
function flagNeedsAttention(row){                                  // ITEM 4: one skimmable signal per row (display only)
  var priceJump=false;
  if(row.bestId && byId[row.bestId] && !row.unitMismatch && !row.needManual && row.unitPrice>0){
    var p=byId[row.bestId], cur=cpbu(p);
    if(cur!=null && cur>0){
      var curPerRowUnit = p.base_unit==='g'?cur*1000 : p.base_unit==='ml'?cur*1000 : cur;   // stored price expressed in the row's unit
      // v55 §E1: compare at CENT precision (CLAUDE.md rounding rule). Two prices that both DISPLAY as the
      // same $x.xx must never flag a "price change" — the old test ran on unrounded floats, so 0.01 vs 0.01
      // (differing only past the cent) tripped the alert.
      var sameAtCent = Math.round(row.unitPrice*100)===Math.round(curPerRowUnit*100);
      if(!sameAtCent && Math.abs(row.unitPrice-curPerRowUnit)/curPerRowUnit > PRICE_JUMP) priceJump=true;
    }
  }
  row.needsAttention = !!(row.unitMismatch || (row.needManual && !row.remembered) || priceJump);
  return row.needsAttention;
}
/* ===================================================================================
   v62: AI second reader (Reader 2 / Gemini) — request + merge. Everything here wraps
   AROUND the existing parser and review flow; it never edits the protected region and
   changes nothing when the network is absent. See docs/handovers/HANDOVER-v62.md for the
   rule-by-rule rationale and the chosen plausibility band.
   =================================================================================== */
var GEM_BAND=0.5;                                                  // rule 3 plausibility band: adopt a reading only if within ±50% of price history H
var GEM_MIN_VISIBLE=900;                                           // v63: minimum ms the "AI double-checking…" note stays up before the result flips it — stops a fast/failed response from flickering the note past unread
/* v63: run a terminal status flip (checked/unavailable + render) but never before the
   "checking" note has been visible GEM_MIN_VISIBLE ms. Re-checks staleness INSIDE the delay
   so a fresh parse (gemToken bumped) or an applied import (gemApplied) still wins the ruling. */
function gemSettle(token, fn){
  var wait=GEM_MIN_VISIBLE-(Date.now()-gemCheckStart);
  var go=function(){ if(token!==gemToken || gemApplied) return; fn(); };
  if(wait<=0) go(); else setTimeout(go, wait);
}
/* v113 — THE CONFIRM GATE. Reader 2 can only ever DEMOTE a row: gemPriceReview / gemMatchReview /
   gemReview each push invRowState from 'matched' to 'review', which un-ticks it. So a user who pressed
   Confirm All inside the checking window committed precisely the rows the referee was about to flag,
   and applyInvoice's gemApplied=true then discarded the verdict — the check ran and ruled on nothing.
   The ROWS still render immediately (they are useful to read while waiting); only APPLYING waits.
   PURE, and the whole condition lives here so a test pins the state rather than a flag. Note there is
   no per-row variant to build: ONE request covers the whole invoice, so every row is equally unchecked
   until the payload lands and they all flip together. Per-row spinners would fake a granularity this
   pipeline does not have. */
function invConfirmState(status, aiOn){
  if(aiOn && status==='checking') return {disabled:true,  unverified:false, hint:'Waiting for the AI check — usually a few seconds.'};
  if(status==='unavailable')      return {disabled:false, unverified:true,  hint:'The AI check didn’t finish — these lines haven’t been double-checked.'};
  return {disabled:false, unverified:false, hint:'Only ticked rows are saved.'};
}
function gemPending(){ return invConfirmState(gemStatus, aiInvoiceCheck).disabled; }
function gemStatusHtml(){                                          // appended to the .inv-sum summary line
  if(gemStatus==='checking')    return ' <span class="ai-status ai-checking">AI double-checking…</span>';
  if(gemStatus==='checked')     return ' <span class="ai-status ai-ok">✓ AI checked</span>';   // CSS fades this out after a beat
  if(gemStatus==='unavailable') return ' <span class="ai-status ai-off">AI check unavailable</span>';
  return '';
}
/* Fire ONE background request. Offline / failed / slow / stale all degrade silently to
   today's app: no error modal, no retry — the summary note just reads "unavailable". */
function gemFireSecondReader(text){
  if(!aiInvoiceCheck){ gemStatus=null; if(typeof renderInvReview==='function') renderInvReview(); return; }   // v81: AI invoice check OFF — no API call at all; the deterministic parser stands and no "checking" note shows
  var token=(++gemToken);                                          // this request's identity; a newer parse/openInv invalidates it
  var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
  var timer=setTimeout(function(){ if(ctrl) ctrl.abort(); },20000);   // client-side ~20s; late = discarded
  /* v113: the gate needs a floor of its own. The abort above only happens where AbortController exists,
     so a hung socket (or an environment without it) leaves gemStatus 'checking' FOREVER — harmless before
     the confirm gate, a permanent lock after it. Budgets this sits outside: api/parse-invoice.js caps
     Gemini at 15s and always answers, the client aborts at 20s. This fires only when neither terminated,
     and lands on exactly the state the abort path would have — so racing it is harmless. */
  var guard=setTimeout(function(){
    if(token!==gemToken || gemApplied || gemStatus!=='checking') return;
    gemStatus='unavailable';
    gemToken++;              // VOID this request, exactly as a fresh parse would. Without it a response that
                             // arrives after the gate has already released would still be merged — and "a late
                             // response after a timeout is discarded" is the rule the whole referee rests on.
    renderInvReview();
  },20000);
  var done=function(payload){
    clearTimeout(timer); clearTimeout(guard);
    if(token!==gemToken || gemApplied) return;                    // late/stale response loses — human ruling & fresh parses win
    gemSettle(token, function(){                                  // v63: hold the "checking" note visible long enough to read before flipping
      if(payload && payload.status==='ok'){ gemApplyReadings(payload); }
      else { gemStatus='unavailable'; renderInvReview(); }
    });
  };
  try{
    if(typeof fetch!=='function'){ clearTimeout(timer); clearTimeout(guard); gemSettle(token, function(){ gemStatus='unavailable'; renderInvReview(); }); return; }
    fetch('/api/parse-invoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text, categories:prodCategories()}),signal:ctrl?ctrl.signal:undefined})   // v73: send existing categories so the model reuses one rather than inventing a near-duplicate
      .then(function(res){ return res.ok?res.json():null; })
      .then(function(payload){ done(payload); })
      .catch(function(){ done(null); });                          // network error / abort / offline
  }catch(e){ done(null); }
}
/* Convert a (price, unit) reading to a canonical {cat, per} — per-kg / per-litre / per-each —
   so parser, Gemini and history compare on the same basis (mirrors flagNeedsAttention's curPerRowUnit). */
function gemCanon(price, unit){
  if(price==null || !isFinite(price) || price<=0) return null;
  unit=(unit||'').toString().toLowerCase();
  if(unit==='g')  return {cat:'kg', per:price*1000};
  if(unit==='kg') return {cat:'kg', per:price};
  if(unit==='ml') return {cat:'l',  per:price*1000};
  if(unit==='l')  return {cat:'l',  per:price};
  if(unit==='ea') return {cat:'ea', per:price};
  return null;                                                    // unknown/auto — not comparable
}
function gemHist(prod){                                            // price history H for a matched product, canonicalised
  if(!prod) return null; var c=cpbu(prod); if(c==null || !(c>0)) return null;
  if(prod.base_unit==='g')  return {cat:'kg', per:c*1000};
  if(prod.base_unit==='ml') return {cat:'l',  per:c*1000};
  return {cat:'ea', per:c};
}
function gemPackEq(a,b){                                           // pack counts equal, or both unknown
  var an=(a==null||a===''||!isFinite(a))?null:a, bn=(b==null||b===''||!isFinite(b))?null:b;
  if(an==null && bn==null) return true;
  if(an==null || bn==null) return false;
  return Math.round(an)===Math.round(bn);
}
/* PURE per-line merge — the whole rule table lives here so tests can pin it against canned
   Gemini readings with no DOM and no live API. Inputs are primitives; output is a decision the
   applier acts on. P=parser reading, G=Gemini reading, H=canonical price history|null, T=taught.
   Returns {rule, action:'keep'|'adopt', winner, unitPrice?, unit?, flagged?}. 'adopt' values are
   always canonical (per kg/l/ea) so the caller writes them straight onto the row. */
function gemMergeLine(P, G, H, T, opts){
  opts=opts||{}; var band=(opts.band!=null?opts.band:GEM_BAND);
  if(T) return {rule:1, action:'keep', winner:'T'};               // rule 1: a taught pack / supplier memory already resolved this line — no conflict ever shown
  var gc=gemCanon(G&&G.derivedUnitPrice, G&&G.unitType);
  if(!gc) return {rule:6, action:'keep', winner:'P'};             // Gemini gave no usable reading → parser stands (rule 6)
  var pc=gemCanon(P&&P.unitPrice, P&&P.unit);
  if(!pc) return {rule:4, action:'adopt', winner:'G', unitPrice:gc.per, unit:gc.cat, flagged:true};   // parser had nothing, Gemini does → adopt as a flagged review
  if(pc.cat===gc.cat && Math.round(pc.per*100)===Math.round(gc.per*100) && gemPackEq(P&&P.packCount, G&&G.packCount))
    return {rule:2, action:'keep', winner:'P=G'};                 // rule 2: P ≈ G at cent precision, same unit, packs agree → verified silently
  // v66: parser HAS a price and Gemini disagrees. MONEY STAYS DETERMINISTIC — the AI NEVER overrules the
  // parser's price (Gemini misreads/hallucinates). Only FLAG for a human when price HISTORY independently
  // shows the parser's number is off (parser out of the band, Gemini inside it). Otherwise the parser
  // stands, silently — we can't say who's right, and the deterministic reader is the backbone. (Pre-v66
  // this ADOPTED Gemini's price, which overruled correct parser readings once the API went live.)
  if(H && H.per>0){
    var lo=H.per*(1-band), hi=H.per*(1+band);
    var pIn=(pc.cat===H.cat && pc.per>=lo && pc.per<=hi);
    var gIn=(gc.cat===H.cat && gc.per>=lo && gc.per<=hi);
    if(!pIn && gIn) return {rule:3, action:'flag', winner:'review', gPer:gc.per, gCat:gc.cat, H:H.per};   // parser looks wrong per history → flag "check price"; the price is NOT changed
  }
  return {rule:7, action:'keep', winner:'P'};                    // can't adjudicate → parser stands, silent
}
/* v63 item 2 / v65 WIDENED — suspected WRONG MATCH. PURE (tests pin it): decide whether Gemini's
   line points at a DIFFERENT product than the parser's local match. Mirrors the price rules — never
   silent, never auto-applies; the caller only FLAGS the row "check match" and ranks the AI product
   first, the human ticks. All inputs are primitives so it needs no DOM/PRODUCTS: aiCands is
   rankCandidates(g.description) already computed by the caller; gCanon/localHist/suggHist are
   canonical {cat,per} readings.
   v65: DECOUPLED from the parser's own confidence. The old rule required Gemini's pick to beat the
   parser's CONFIDENCE (top.coverage >= localCov+0.15), so a wrong match the parser was SURE about —
   the common, painful case — never got flagged. Now the only comparison that matters is how the
   parser's product ranks against Gemini's OWN description (localInAi): if Gemini clearly prefers a
   different product (margin >= 0.15) and that product is a real match (>=0.45), flag it — however
   confident the parser was. A thinner name match (>=0.3) still needs price-history corroboration. */
function gemMatchSuspect(o){
  o=o||{}; var band=(o.band!=null?o.band:GEM_BAND);
  var cands=o.aiCands||[]; if(!cands.length) return {suspect:false};
  var top=cands[0]; if(!top || top.id==null) return {suspect:false};
  if(top.id===o.bestId) return {suspect:false};                   // Gemini agrees with the local match → nothing to flag
  // How strongly Gemini's OWN ranking of its description rates the parser's current match. If the
  // parser's pick is a near-tie for Gemini's pick, that's ambiguity (e.g. two similar chips), not a
  // wrong match — defer to the price merge. Absent from the list → Gemini truly points elsewhere.
  var localInAi=0;
  for(var ci=0;ci<cands.length;ci++){ if(cands[ci] && cands[ci].id===o.bestId){ localInAi=cands[ci].coverage||0; break; } }
  if(top.coverage-localInAi < 0.15) return {suspect:false};       // Gemini doesn't clearly prefer a different product
  var inBand=function(h){ return !!(h && o.gCanon && h.cat===o.gCanon.cat && o.gCanon.per>=h.per*(1-band) && o.gCanon.per<=h.per*(1+band)); };
  var suggPlausible=inBand(o.suggHist), localPlausible=inBand(o.localHist);
  var corroborated=!!(suggPlausible && !localPlausible);          // price fits the AI product, not the local one — the mis-match explains the "jump"
  var strongName=(top.coverage>=0.45);                            // Gemini names a real, clearly-better-matching product (no longer gated on parser confidence)
  var priceBacked=(top.coverage>=0.3 && corroborated);           // thinner name match, but price history backs the swap
  if(!(strongName || priceBacked)) return {suspect:false};
  return {suspect:true, suggestId:top.id, coverage:top.coverage, corroborated:corroborated};
}
/* A row the human has already ruled on is frozen — a late AI result never re-opens it. */
function gemRowLocked(r){
  if(!r) return true;
  if(r.manualPick) return true;                                   // user picked the match
  if(r.newItem && r.newItem.approved) return true;                // user ticked a new item
  return false;
}
function gemNormKey(s){ try{ return normalizePhrase(s||''); }catch(e){ return String(s||'').toLowerCase().trim(); } }
/* v73: PURE — distil a validated Gemini line + the invoice header supplier into the clean DESCRIPTIVE
   candidates the add-new-item form prefills from. Descriptive only (never price/pack/unit). A missing
   field is null, and the form falls back to today's deterministic value for it. cleanName only (never
   description, which can be the messy raw) drives the AI name mark — an absent cleanName leaves the
   deterministic name with its plain auto-filled treatment. Supplier prefers the per-line value, else
   the invoice header the reader already extracted (this is what corrects a parser mis-grab like
   "Document No:"). */
function gemCleanFields(g, headerSupplier){
  if(!g) return null;
  var pick=function(v){ v=(v==null?'':String(v)).trim(); return v||null; };
  return { name:pick(g.cleanName), brand:pick(g.brand), category:pick(g.category),
           supplier:pick(g.supplier)||pick(headerSupplier) };
}
/* Apply a validated payload: reconcile each matched line, then append Gemini-only lines. Mutates
   invRows in place and does ONE full-row re-render (open new-item forms survive it, v50 fix). */
function gemApplyReadings(payload){
  if(!payload || payload.status!=='ok' || !Array.isArray(payload.lines)){ gemStatus='unavailable'; renderInvReview(); return; }
  // index Gemini lines by normalized rawText/description so a P row can find its G reading
  var gmap={};
  payload.lines.forEach(function(g,gi){
    [g.rawText, g.description].forEach(function(k){ var n=gemNormKey(k); if(n && gmap[n]==null) gmap[n]=gi; });
  });
  var usedG={};
  invRows.forEach(function(r){
    if(gemRowLocked(r)) return;                                   // human-ruled (manual pick / approved new) → leave it entirely
    var n1=gemNormKey(r.raw||r.name), n2=gemNormKey(r.name);
    var gi=(gmap[n1]!=null)?gmap[n1]:(gmap[n2]!=null?gmap[n2]:null);
    if(gi==null) return;                                          // rule 6: parser found it, Gemini didn't — no flag from absence
    usedG[gi]=true;
    var g=payload.lines[gi];
    // v73: stash the clean descriptive candidates on the row so the add-new form (this line, now or
    // later) prefills cleanly. Set for matched AND already-open add-new rows — the latter is the
    // late-response upgrade path (form opened before the reader returned).
    r.aiClean=gemCleanFields(g, payload.supplier);
    if(r.addNew) return;                                          // an add-new line: descriptive prefill only, no price/match referee
    var T=!!(r.remembered || r.fromProductPack || r.packTaught || r.taughtQty!=null);
    var H=(r.bestId && byId[r.bestId])?gemHist(byId[r.bestId]):null;
    // v63 item 2: BEFORE reconciling price, ask whether Gemini's text points at a DIFFERENT product
    // than the parser's match. Only for an already-matched, non-taught row (a wrong match to override,
    // not an unmatched line the chips already surface). If suspected, flag "check match", rank the AI
    // product first, and SKIP the price merge — the mis-match, not a real rise, explains any price gap.
    if(r.bestId && !T){
      var aiCands=rankCandidates(g.description||g.rawText)||[];
      var gCanon=gemCanon(g.derivedUnitPrice, g.unitType);
      var suggHist=(aiCands[0] && byId[aiCands[0].id])?gemHist(byId[aiCands[0].id]):null;
      var sus=gemMatchSuspect({bestId:r.bestId, localCov:r.conf, aiCands:aiCands, gCanon:gCanon, localHist:H, suggHist:suggHist, band:GEM_BAND});
      if(sus.suspect){
        r.gemMatchReview=true; r.gemSuggestId=sus.suggestId; r.gemSuggestCorrob=sus.corroborated;
        r.cands=(r.cands||[]).filter(function(c){ return c.id!==sus.suggestId; });
        r.cands.unshift({id:sus.suggestId, coverage:sus.coverage, ai:true});   // AI product ranked first, marked for the chip
        r.cands=r.cands.slice(0,3);
        try{ if(window.console&&console.debug) console.debug('[inv AI] "'+(r.name||'')+'" check-match → '+sus.suggestId+(sus.corroborated?' (price-corroborated)':'')); }catch(e){}
        return;                                                     // do NOT also run the price merge / raise a price-change flag on this row
      }
    }
    var Pc=packCount(r.raw||r.name);
    var dec=gemMergeLine({unitPrice:r.unitPrice, unit:r.unit, packCount:Pc},
                         {derivedUnitPrice:g.derivedUnitPrice, unitType:g.unitType, packCount:g.packCount}, H, T, {band:GEM_BAND});
    gemDiag(r, dec, H);
    if(dec.action==='adopt'){                                      // ONLY when the parser had NO price (rule 4) — filling a blank, never overruling a reading
      r.unitPrice=dec.unitPrice; r.unit=dec.unit; r.needManual=false; r.unitMismatch=false;
      if(dec.flagged){ r.gemReview=true; r.aiSuggested=true; }     // flagged, unticked, AI-suggested chip on the price field
    } else if(dec.action==='flag'){                                // v66: rule 3 — history says the parser looks wrong. FLAG only; the parser's price is left untouched.
      r.gemPriceReview=true;
    }
  });
  // rule 5: lines Gemini found that the parser dropped entirely → append as unticked add-new cards,
  // prefilled with AI-suggested chips, run through the standard matching. Never auto-applied.
  payload.lines.forEach(function(g,gi){
    if(usedG[gi]) return;
    var name=g.description||g.rawText; if(!name) return;
    var already=invRows.some(function(r){ var n=gemNormKey(r.raw||r.name); return n && n===gemNormKey(g.rawText||g.description); });
    if(already) return;                                           // don't duplicate a P row we simply couldn't key-match
    var gc=gemCanon(g.derivedUnitPrice, g.unitType);
    var cands=rankCandidates(name); var top=cands.length?cands[0].coverage:0;
    invRows.push({ name:name, raw:g.rawText||name, unitPrice:(gc?gc.per:null), unit:(gc?gc.cat:'auto'), rawUnit:'auto',
      needManual:(gc==null), uncertain:false, cands:cands, bestId:null, conf:top,
      tier:(top>=0.6?'hi':(top>=0.3?'mid':'lo')), addNew:true, newItem:null, remembered:false,
      gemNew:true, aiSource:true, aiClean:gemCleanFields(g, payload.supplier) });   // v73: aiSource → chips read "AI suggested"; aiClean prefills the form's descriptive fields
  });
  gemStatus='checked';
  renderInvReview();
}
function gemDiag(r, dec, H){                                       // diagnostics for Max — invisible to users
  try{ if(window.console&&console.debug&&dec&&dec.rule){
    console.debug('[inv AI] "'+(r.name||'')+'" rule '+dec.rule+' → '+dec.winner+(dec.action==='adopt'?' (adopted)':'')+(H?(' | H=$'+H.per.toFixed(2)+'/'+H.cat):''));
  } }catch(e){}
}
function invSelChanged(tr){
  var i=parseInt(tr.dataset.i,10), r=invRows[i]; if(!r) return;
  var sel=tr.querySelector('.invSel'), old=tr.querySelector('.invOld'), appr=tr.querySelector('.invAppr');
  r.addNew=false; r.newItem=null; collapseNewItem(i);   // v50 item 1: picking a real match abandons any in-progress new-item form
  delete r.userTick;                                    // Q8 (v127): the match changed, so the old tick no longer approves this application — back to the state default
  r.gemMatchReview=false; r.gemSuggestId=null;          // v63 item 2: the human has now ruled on the match — the "check match" flag is spent
  r.gemPriceReview=false;                               // v66: a new match re-derives the price — any AI price-check is moot
  if(sel.value==='skip'){ r.bestId=null; r.manualPick=false; r.needsAttention=false; renderInvReview(); return; }  // one render path — no per-cell poking
  // switching the matched product: throw away any half-done pack-teach state and resolve cleanly for the NEW product
  r.remembered=false; r.unitMismatch=false; r.needManual=(r.unitPrice==null); r.taughtQty=null; r.taughtUnit=null; r.packTaught=false; r.unit=(r.rawUnit||r.unit||'auto');
  r.bestId=sel.value;
  r.manualPick=true;                                             // ITEM 1 (v33): flags the confidence SOURCE (show this pick's coverage, or "manual") — it no longer blanks anything
  var np=byId[sel.value];
  var mem=(normSupplier(invSupplier)?supplierMem[memKey(invSupplier, r.raw||r.name)]:null);
  resolveMatchedPrice(r, np?{pack_qty:np.pack_qty, pack_unit:np.pack_unit, base_unit:np.base_unit}:null, mem);   // re-derive against the new match
  flagNeedsAttention(r);
  renderInvReview();                                              // repaint the row (and its pack-teach) fresh for the new product
}
function confirmApplyInvoice(){                                   // last chance: show what WON'T be applied before finishing
  // v113: the review does not even render while pending, so this cannot normally be reached — it is the
  // choke point every apply passes through (applyInvoice is also reachable via askConfirm's callback),
  // and it borrows invConfirmState's own wording so there is one source for it rather than two.
  if(gemPending()){ toast(invConfirmState(gemStatus, aiInvoiceCheck).hint); return; }
  var boxEl=document.getElementById('invReview'); if(!boxEl){ applyInvoice(); return; }
  var un=[];
  invRows.forEach(function(r,i){
    if(!(r&&(r.bestId||r.addNew))) return;
    var tr=boxEl.querySelector('tr.inv-data[data-i="'+i+'"]'); var cb=tr&&tr.querySelector('.invAppr');
    if(cb && !cb.checked) un.push(r.name||('line '+(i+1)));
  });
  if(!un.length){ applyInvoice(); return; }
  var list=un.slice(0,8).map(function(n){return '\u2022 '+n;}).join('\n')+(un.length>8?('\n\u2022 +'+(un.length-8)+' more'):'');
  askConfirm(un.length+' line'+(un.length===1?'':'s')+' won\u2019t be applied', list+'\n\nGo back to tick them, or finish without.', 'Finish import', applyInvoice);
}
function applyInvoice(){
  gemApplied=true;                                                // v62: the import is being applied — a late AI response must never re-open or alter it (human ruling is final)
  var specs={}, ok=true;                                          // validate all approved new items first (atomic)
  document.querySelectorAll('#invReview tbody tr.inv-data').forEach(function(tr){
    var i=parseInt(tr.dataset.i,10), r=invRows[i]; var appr=tr.querySelector('.invAppr');
    if(!r||!appr||!appr.checked) return;
    if(r.addNew){ var s=collectNewItem(i); if(!s){ ok=false; } else specs[i]=s; }
  });
  if(!ok){ toast('Fix the highlighted new item before confirming'); return; }
  var n=0, added=0, learned=[]; var priceChanges=[]; var overBefore=dishesOverTarget(); var kingsMade=0; var kingRepoints=[];
  document.querySelectorAll('#invReview tbody tr.inv-data').forEach(function(tr){
    var i=parseInt(tr.dataset.i,10), r=invRows[i]; var appr=tr.querySelector('.invAppr');
    if(!r||!appr||!appr.checked) return;
    if(r.addNew){
      var s=specs[i]; if(!s) return;
      var id=uid('CX');
      setProduct(id, {id:id, description:s.name, brand:s.brand, category:s.category, sub_category:null,
        item_type:null, search_aliases:[], base_unit:s.base_unit, cost_per_base_unit:s.cpbu,
        cost_basis:s.cost_basis, is_food:true, pack_size_raw:s.pack_size_raw, sold_by:null,
        current_price_exgst:null, supplier:s.supplier});
      // ITEM 5 (v35): create, re-link, or nothing — never a silent skip. Creates are pushed
      // immediately so nextKid() can't collide; re-links are DEFERRED to after this loop
      // because they may need a confirm, and a confirm cannot block a write loop mid-flight.
      var kact=kingNameAction(s.kingName, kitchenIngredients);
      if(kact.action==='create'){ kitchenIngredients.push({id:nextKid(), name:kact.name, pid:id}); kingsMade++; }
      else if(kact.action==='repoint'){ kingRepoints.push({kid:kact.kid, name:kact.name, pid:id}); }
      added++;
    } else {
      var pid=r.bestId; if(!pid) return; var p=byId[pid]; if(!p) return;
      var up=r.unitPrice; var inp=tr.querySelector('.invPrice'); if(inp){ var v=parseFloat(inp.value); up=(!isNaN(v)&&v>=0)?v:null; }
      if(up==null||isNaN(up)) return;                              // never store without a real unit price
      var priceUnit=(r.unit==='kg'||r.unit==='l'||r.unit==='ea')?r.unit:(p.base_unit==='g'?'kg':p.base_unit==='ml'?'l':'ea');
      var ub2=unitToBaseFields(priceUnit);                         // the unit beside the input is the one and only unit written
      var oldC=cpbu(p); var newC=up/ub2.div;
      setProduct(pid,{cost_per_base_unit:newC, base_unit:ub2.base_unit, cost_basis:ub2.cost_basis}); n++;   // v109: setProduct writes the price point (and flushes it) — one writer, every path
      if(oldC!=null && Math.abs(newC-oldC)>Math.abs(oldC)*0.005){ priceChanges.push({name:p.description||r.name, oldC:oldC, newC:newC, unit:ub2.base_unit, dir:(newC>oldC?1:-1), pctAbs:Math.abs((newC-oldC)/oldC)*100}); }
    }
    // ITEM 1 (v38) ROOT CAUSE: the product-pack write lived INSIDE this supplier-memory block, so it was gated on normSupplier(invSupplier). A pack belongs to the PRODUCT — 105 slices in a bag is 105 slices whoever invoiced it — but invSupplierDetect returns '' by design when it can't read the letterhead ("no guess"), which made the whole block skip and silently dropped the teach, while the price write above (ungated) still saved. That is why the old price survived as $0.200/unit but the pack vanished. The pack write is now unconditional; supplier memory keeps its own gate, which it genuinely needs because it is keyed supplier+phrase.
    if(r.needManual || r.remembered || r.packTaught){
      var pt=tr.querySelector('.pack-teach'); var qEl=pt?pt.querySelector('.invPackQty'):null; var uEl=pt?pt.querySelector('.invPackUnit'):null;
      var rUnit=(r.unit==='kg'||r.unit==='l'||r.unit==='ea')?r.unit:'ea';
      var q=qEl?parseFloat(qEl.value):NaN, u=(uEl&&uEl.value)?uEl.value:rUnit;
      if(!(q>0)){                                                   // fallback: derive qty from the entered unit price
        var pin2=tr.querySelector('.invPrice'); var entered=pin2?parseFloat(pin2.value):NaN; var pack=packPriceOf(r.raw||r.name);
        if(pack!=null && entered>0){ var derived=pack/entered; if(isFinite(derived)&&derived>0){ if(Math.abs(derived-Math.round(derived))<=0.02) derived=Math.round(derived); q=derived; u=rUnit; } }
      }
      if(q>0){
        if(r.bestId && byId[r.bestId]){                             // the product pack — written whoever the supplier is, or teach-once never survives
          var bp=byId[r.bestId];
          if(bp.pack_qty!==q || (bp.pack_unit||'')!==(u||'')) setProduct(r.bestId, {pack_qty:q, pack_unit:u});
        }
        if(normSupplier(invSupplier)){                              // supplier memory is keyed supplier+phrase — it cannot be stored without a supplier
          var key=memKey(invSupplier, r.raw||r.name); var before=supplierMem[key];
          rememberSupplierPhrase(invSupplier, r.raw||r.name, q, u, r.bestId||null);
          if(!before || before.qty!==q || before.unit!==u) learned.push({phrase:r.name, qty:q, unit:u});
          if(r.bestId && byId[r.bestId]) syncMemoryToProduct(r.bestId, q, u);   // keep memory and product in step
        }
      }
    }
  });
  // v109: the batched flush is gone with the batched flag — setProduct logs AND flushes each point as
  // it writes it. Same number of server inserts either way (saveIngLog pushes one row per point), and
  // it means an add-new line's very first price is logged too, which this loop never did. (v91's note
  // stands historically: this was gated on priceChanges, which only fills when there WAS an old price.)
  // ITEM 5 (v35): settle the deferred re-links. Clean ones commit now; ones where the
  // ingredient's unit category disagrees with the new product go through the SAME guard
  // saveKingModal uses. The ask is batched into one confirm rather than chained per-item:
  // askConfirm has no cancel hook, so a chain would silently drop everything after a
  // cancel — which is the exact failure this item exists to remove.
  var relinked=0, guarded=[], repointLog=[];
  kingRepoints.forEach(function(rp){
    var k=kById[rp.kid]; if(!k) return;
    var oldP=byId[k.pid], newP=byId[rp.pid];
    if(kingRepointGuard(oldP?oldP.base_unit:null, newP?newP.base_unit:null).needsConfirm){ guarded.push(rp); return; }
    /* v114 — A REPOINT INSIDE THE INVOICE IMPORT IS STILL AN INTERVENTION, and this path is the one the
       brief's enumeration missed. Every price this function wrote went through setProduct and belongs to
       ing_price_history; this line does not, and it is the same "swap to a cheaper product" decision the
       Ingredients tab makes. One entry PER INGREDIENT, not one for the batch: they are independent
       decisions about different ingredients that happen to share a confirm. The before/after pair is
       measured across this ingredient's own mutation, so the entries compose in sequence rather than
       each claiming the whole batch's movement. */
    var hit=platesUsingKid(rp.kid), avgBefore=computeAvgFoodCost();
    k.pid=rp.pid; relinked++;
    repointLog.push({menuIds:menuIdsForPlates(hit), avgBefore:avgBefore, avgAfter:computeAvgFoodCost(),
      detail:{name:k.name||rp.name||null, from:(oldP||{}).description||null, to:(newP||{}).description||null, plates:hit.length, via:'invoice'}});
  });
  var kingsTouched=(kingsMade||relinked);
  // A kitchen word CREATED here is not logged, and nor is one created on the Ingredients tab: nothing
  // references it yet, so no plate's cost moves. It becomes an intervention the moment a plate uses it,
  // and that is a plate save.
  if(kingsTouched){
    var kingWrite=saveKitchenIngredients(); renderKitchenPanel();
    repointLog.forEach(function(o){ logChangeIfSaved(kingWrite, 'ingredient_repointed', o); });
  }
  if(n||added){ var iso=new Date().toISOString(); try{localStorage.setItem('cafeDB_lastImport',iso);}catch(e){} dbSetSetting('last_invoice_import',iso); logHistory(); }
  renderPlate(); renderAnalysis(); updateLastImport();
  var overAfter=dishesOverTarget();
  if(learned.length){ var L=learned[0]; toast('EzPlate will remember: "'+L.phrase+'" = '+ (L.qty%1===0?L.qty:L.qty.toFixed(2)) +' '+(L.unit==='ea'?'units':L.unit)+(learned.length>1?(' (+'+(learned.length-1)+' more)'):'')); }
  closeInv();                                                     // stay on whatever tab the user imported from
  if(n||added){ showImportSummary(priceChanges, added, overBefore, overAfter, {made:kingsMade, relinked:relinked}); }
  else if(!guarded.length) toast('No changes to save');
  if(guarded.length) confirmGuardedRepoints(guarded);
}
/* ITEM 5 (v35): one confirm covering every re-link whose unit category changed. Confirm
   re-links them all; Cancel re-links none and says so — nothing is ever applied or
   dropped without the user seeing it. */
function confirmGuardedRepoints(list){
  var lines=list.map(function(rp){
    var k=kById[rp.kid]; var oldP=k?byId[k.pid]:null, newP=byId[rp.pid];
    var g=kingRepointGuard(oldP?oldP.base_unit:null, newP?newP.base_unit:null);
    return '\u2022 '+rp.name+': per '+unitCatWord(g.oldCat)+' \u2192 per '+unitCatWord(g.newCat);
  }).join('\n');
  askConfirm(list.length===1?'Different unit type':(list.length+' ingredients change unit type'),
    lines+'\n\nPlate amounts keep their numbers but change meaning \u2014 check any plate that uses '
      +(list.length===1?'it':'them')+'.\n\nThe new products were still added either way.',
    'Re-link anyway',
    function(){
      var done=0, entries=[];
      list.forEach(function(rp){
        var k=kById[rp.kid]; if(!k) return;
        // v114: the third repoint site, and it logs exactly as the other two do — same kind, same
        // per-ingredient before/after pair. A user who confirms here has made the same decision as one
        // who confirmed in the modal; the log must not be able to tell them apart.
        var hit=platesUsingKid(rp.kid), avgBefore=computeAvgFoodCost(), oldP=byId[k.pid];
        k.pid=rp.pid; done++;
        entries.push({menuIds:menuIdsForPlates(hit), avgBefore:avgBefore, avgAfter:computeAvgFoodCost(),
          detail:{name:k.name||rp.name||null, from:(oldP||{}).description||null, to:(byId[rp.pid]||{}).description||null, plates:hit.length, via:'invoice'}});
      });
      if(done){
        var write=saveKitchenIngredients(); renderKitchenPanel(); rerenderCurrentTab();
        entries.forEach(function(o){ logChangeIfSaved(write, 'ingredient_repointed', o); });
        logHistory();   // v115 path 3: once for the whole confirm, after every repoint has landed — the invoice's own logHistory (applyInvoice) fired before these were applied, so its point does not reflect them
      }
      toast(done+' ingredient'+(done===1?'':'s')+' re-linked');
    });
}
function showImportSummary(changes, added, overBefore, overAfter, kings){   // corner toast: glance, don't study
  var stack=document.getElementById('cornerToasts');
  if(!stack){ stack=document.createElement('div'); stack.id='cornerToasts'; document.body.appendChild(stack); }
  var ups=changes.filter(function(c){return c.dir>0;}).length, downs=changes.length-((changes.filter(function(c){return c.dir>0;})).length);
  var bits=[];
  if(changes.length) bits.push(changes.length+' price'+(changes.length===1?'':'s')+(ups&&downs?' \u25b2\u25bc':ups?' \u25b2':' \u25bc'));
  if(added) bits.push(added+' new');
  // ITEM 5 (v35): kitchen-word outcomes are visible here. v34 built this string into a
  // local `parts` array that was never read — the summary has never actually shown them.
  if(kings && kings.made) bits.push(kings.made+' ingredient'+(kings.made===1?'':'s')+' created');
  if(kings && kings.relinked) bits.push(kings.relinked+' re-linked');
  var newlyOver=overAfter-overBefore;
  var margin = newlyOver>0 ? '<div class="ct-margin is-warn">\u26a0 '+newlyOver+' plate'+(newlyOver===1?'':'s')+' now over '+cogsPct+'% target</div>'
             : (overAfter>0 ? '<div class="ct-margin is-muted">'+overAfter+' still over '+cogsPct+'% target</div>' : '');
  var top=changes.slice().sort(function(a,b){return b.pctAbs-a.pctAbs;})[0];   // ONE biggest mover, not three
  var mover='';
  if(top){ var u=top.unit==='g'?'/kg':top.unit==='ml'?'/L':'/unit'; var f=function(v){return '$'+(top.unit==='g'||top.unit==='ml'?(v*1000):v).toFixed(2);};
    mover='<div class="ct-mover is-mono">'+(top.dir>0?'\u25b2':'\u25bc')+' '+esc(top.name)+' '+f(top.oldC)+' \u2192 '+f(top.newC)+u+'</div>'; }
  var el=document.createElement('div'); el.className='corner-toast';
  el.innerHTML='<button class="is-x" type="button" aria-label="Dismiss">\u00d7</button>'
    +'<div class="ct-head">Invoice imported'+(bits.length?(' \u00b7 '+bits.join(' \u00b7 ')):'')+'</div>'
    +margin+mover;
  stack.appendChild(el);                                             // stacks cleanly; fixed overlay shifts no page content
  requestAnimationFrame(function(){ el.classList.add('show'); });
  var kill=function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 250); };
  el.querySelector('.is-x').onclick=kill;
  setTimeout(kill, 9000);
}
function updateLastImport(){
  var d=null; try{d=localStorage.getItem('cafeDB_lastImport');}catch(e){}
  var txt=d?('Prices last updated: '+new Date(d).toLocaleDateString()):'No invoice imported yet';
  ['lastImport','lastImport2','lastImport3'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=txt;});   // F8 (v147): lastImport3 is the Invoices screen — the only import fact the app actually stores
}

/* ---- redefined analysis (groups custom menu items by section; shows notes) ---- */
function costRangeCell(m, cost){                                     // ITEM 3: min/max band beneath the headline cost
  if(!(cost>0)||!m) return '';
  var sp=plateForMenuItem(m); if(!sp) return '';
  var r=costRangeForLines(sp.lines); if(!r.hasRange) return '';
  if(r.max-r.min < 0.005) return '';
  return '<span class="cost-range" title="Cost at each ingredient\u2019s lowest and highest recorded price">'+fmt2(r.min)+'\u2013'+fmt2(r.max)+'</span>';
}
/* F5 (v142) \u2014 the mock's \u00a73.2 row grammar: identity left, mono figures right, verdict pill rightmost.
   The ROW IS THE BUTTON now (mock \u00a72 "whole row is a <button>", \u00a77 "Enter on row opens it"), so
   `.mi-name` is a span and the focus ring belongs to the row \u2014 a button inside a button is invalid
   HTML and was only ever there to give keyboard users the tap path the row now carries itself.
   `.mnu-nm` wraps name + note so the pair is ONE grid child; `.mnu-id` is the display:contents
   wrapper that lets the SAME markup be a two-line phone row and a five-column desktop row.
   v112: the 5th `pid` param and its data-pid branch are gone. No call site ever passed it. */
function aRow(name,a,m){
  var note=(m&&m.notes)?'<span class="mi-note" title="'+esc(m.notes)+'">\u24d8</span>':'';
  var ref=m?(' data-mid="'+esc(m.id)+'"'):'';
  return '<button type="button" class="mnu-row mi-row lt-'+(a.light||'none')+'"'+ref+'>'+
    '<span class="mnu-id"><span class="mnu-nm"><span class="mi-name">'+esc(name)+'</span>'+note+'</span></span>'+
    /* `is-nil` marks a PLACEHOLDER, not missing data, and it travels with the dash rather than with
       the row: a plate that HAS lines totalling zero (a misc line at $0, or lines whose products are
       all gone) is "costed" by this screen's test, so it takes the costed branch and renders the same
       em-dash the uncosted row does. Without this it rendered that dash a shade darker than the
       identical dash one row above it \u2014 two colours for one meaning. Review finding, v142. */
    '<span class="mnu-cost'+(a.cost>0?'':' is-nil')+'">'+(a.cost>0?fmt2(a.cost):'\u2014')+costRangeCell(m,a.cost)+'</span>'+
    '<span class="mnu-sug'+(a.suggested>0?'':' is-nil')+'">'+(a.suggested>0?fmt2(a.suggested):'\u2014')+'</span>'+
    '<span class="mnu-price">'+(a.menuPrice!=null?fmt2(a.menuPrice):'\u2014')+'</span>'+
    '<span class="mnu-verdict">'+vbadge(a)+'</span></button>';
}
function renderAnalysis(){
  var tb=document.getElementById('aBody'); if(!tb) return;
  var th=document.getElementById('aSuggestedTh'); if(th) th.textContent='Suggested at '+cogsPct+'%';
  /* F5: the mock's §3.2 header sub-line is the current menu's name, and its footnote states the
     target the Food cost column is measured against. Both are live, so neither can go stale
     against Settings; the footnote's second sentence describes what the row tap actually does. */
  var cur=null; menusList.forEach(function(mm){ if(mm.id===currentMenuId) cur=mm; });
  var hs=document.getElementById('menuHeadSub'); if(hs) hs.textContent=cur?(cur.name||''):'';
  var nt=document.getElementById('menuListNote');
  if(nt) nt.textContent='Food cost is measured against your '+cogsPct+'% target. Select a row to edit price, category or menu.';
  /* the mobile mock's food-cost pill beside the menu name. Desktop states the same figure on every
     switcher pill, so CSS hides this one there rather than printing it twice. `avgFoodCostForScope`
     is the dashboard's figure for that menu — one source, so the two screens cannot disagree. */
  var sp=document.getElementById('menuScopePct');
  if(sp){
    var spct=currentMenuId?avgFoodCostForScope(currentMenuId):null;
    sp.hidden=(spct==null);
    if(spct!=null){ sp.textContent=spct.toFixed(1)+'%'; sp.className='mnu-pct '+dashPctClass(spct); }
  }
  /* zero menus is a legitimate state (there is no last-menu guard), and an option-less <select>
     beside a hidden Delete is a control that does nothing — F2's true-empty defect. */
  var swRow=document.getElementById('menuSwitchRow'); if(swRow) swRow.hidden=!menusList.length;
  var qEl=document.getElementById('menuSearch'); var q=(qEl?qEl.value:'').trim().toLowerCase();
  var toks=searchTokens(q);   // v59: shared token matcher
  var catSel=(document.getElementById('menuCatFilter')||{}).value||'';   // v59: category filter = dish section
  function hit(nm,sec){ if(!toks.length) return true; return matchTokens(toks,(String(nm||'')+' '+String(sec||'')).toLowerCase()); }
  var shown=0;
  var inMenu=function(m){ return (m.menuId||'MENU_ORIGINAL')===currentMenuId; };   // only show dishes belonging to the selected menu
  var secOf=function(m){var s=(m.section||'').trim(); return s?s:'Uncategorised';};
  var sections=[]; MENU.forEach(function(m){ if(!inMenu(m)) return; var s=secOf(m); if(sections.indexOf(s)<0)sections.push(s);});
  sections.sort(function(a,b){
    var au=a.toLowerCase()==='uncategorised', bu=b.toLowerCase()==='uncategorised';
    if(au&&!bu)return 1; if(bu&&!au)return -1;                 // Uncategorised always last
    return a.toLowerCase().localeCompare(b.toLowerCase());      // categories A–Z
  });
  fillFilter(document.getElementById('menuCatFilter'), sections, 'All categories');   // v59: options = this menu's dish sections
  var mcf=document.getElementById('menuClearFilters'); if(mcf) mcf.style.display=(q||catSel||menuLightFilter.length)?'':'none';
  var byName=function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());};
  var html='';
  sections.forEach(function(sec){
    if(catSel && sec!==catSel) return;   // v59: category filter narrows to one section
    var items=MENU.filter(function(m){return inMenu(m) && secOf(m)===sec && hit(m.name,sec);}).slice().sort(byName)
      .map(function(m){                                               // v68: precompute each dish's analysis so the margin-light chips can filter on it
        var sp=plateForMenuItem(m); var costed=!!(sp && sp.lines && sp.lines.length);   // v55: the dish's plate via plate_id
        return {m:m, sp:sp, costed:costed, a:costed?analyze(costFromLines(sp.lines),m.price):{light:'none'}};   // §B: an EMPTY plate is "not costed yet", not a $0.00 cost
      })
      .filter(function(it){ return lightFilterPass(menuLightFilter, it.a.light); });   // v68: active chips narrow to those margin lights
    if(!items.length) return;
    html+='<div class="mnu-sec">'+esc(sec)+'</div>';   // the mock's uppercase group row, inside the table container
    items.forEach(function(it){
      shown++;
      if(it.costed){ html+=aRow(it.m.name||it.sp.name, it.a, it.m); }
      else{ var note=it.m.notes?'<span class="mi-note" title="'+esc(it.m.notes)+'">ⓘ</span>':'';
        // Q3 (v122), unchanged in substance by F5: uncosted is MUTED, never red — "not costed yet"
        // rides the identity and the verdict stays an honest dash. R4 on the mock's "cost it" pill:
        // the row tap opens the price/category editor (openMenuEdit), which has no route to the
        // builder since v55, so the pill would promise navigation that does not exist. F7 owns that
        // route. Same five cells as aRow, so one set of grid rules serves both.
        html+='<button type="button" class="mnu-row mi-row muted lt-none" data-mid="'+esc(it.m.id)+'">'
          +'<span class="mnu-id"><span class="mnu-nm"><span class="mi-name">'+esc(it.m.name)+'</span>'+note+'</span>'
          +'<span class="mi-uncosted">not costed yet</span></span>'
          +'<span class="mnu-cost is-nil">—</span><span class="mnu-sug is-nil">—</span>'
          +'<span class="mnu-price">'+fmt2(it.m.price)+'</span>'
          +'<span class="mnu-verdict"><span class="muted-dash">—</span></span></button>'; }
    });
  });
  // v55: unpublished plates are NOT dishes — they live only in the Plates tab, never on the Menu tab.
  if(!shown){                                                       // v58: routed through the shared empty-state system
    var dishesOnMenu=MENU.filter(inMenu).length;                    // variant A only when the menu HAS dishes but the search matched none; else variant B (truly empty menu)
    /* F5 adds the THIRD variant. With no menus at all, "Nothing on this menu yet" named a menu that
       does not exist — zero menus is a legitimate state, not a broken one, so it gets its own copy
       and the one action that resolves it. */
    var es=!menusList.length
      ? emptyStateHtml(ICON_MENU_BIG,'No menus yet.','A menu is a set of plates with sell prices. Create one, then publish plates onto it.',
          '<button class="btn primary" type="button" onclick="document.getElementById(\'menuNewBtn\').click()">New menu</button>')
      : dishesOnMenu
        ? emptySearchState(ICON_MENU_BIG,'plates','clearMenuFilters')
        : emptyStateHtml(ICON_MENU_BIG,'Nothing on this menu yet.','Publish a plate from the Plates tab to see it here.');
    html='<div class="es-row">'+es+'</div>';
  }
  /* the column band labels rows; with none it labels nothing, and the filter row filters nothing.
     Both hide on the same signal the list itself uses, so they cannot disagree with it. */
  var band=document.getElementById('menuBand'); if(band) band.hidden=!shown;
  var fRow=document.getElementById('menuFilterRow'); if(fRow) fRow.hidden=!(shown||q||catSel||menuLightFilter.length);
  if(nt) nt.hidden=!shown;
  tb.innerHTML=html; bindTips();
  // v58: the empty-state clear action routes through clearMenuFilters() via onclick — no per-render binding.
  // v55 (§D2): the "→ Builder" chip is gone — no handler to bind.
  // v52 tap-to-edit, F5 unchanged in behaviour: the whole row opens the edit modal. It is a real
  // <button> now, so Enter and Space reach the same handler the tap does without a nested control.
  tb.querySelectorAll('.mnu-row').forEach(function(row){
    row.onclick=function(){ var mid=row.getAttribute('data-mid'); if(mid) openMenuEdit(mid); };   // v112: the data-pid/openPlateEdit branch is gone with the orphan-plate editor
  });
  // v90: nothing insight-related runs here any more — the Menu tab has no suggestions UI at all.
  // v134: the switcher pills refresh with every render — a switch moves the active pill and a
  // price edit moves the pill's %; buildMenuSelector's own call sites (boot, sync, menu CRUD)
  // don't cover either of those.
  if(typeof buildMenuPills==='function') buildMenuPills();
}

/* ===== multiple menus: selector, pickers, create modal ===== */
function buildMenuSelector(){
  var sel=document.getElementById('menuSelect');
  if(sel){
    if(menusList.length && !menusList.some(function(m){return m.id===currentMenuId;})) currentMenuId=fallbackMenuId();
    sel.innerHTML=menusList.map(function(m){ return '<option value="'+esc(m.id)+'"'+(m.id===currentMenuId?' selected':'')+'>'+esc(m.name)+(m.season?(' \u2014 '+esc(m.season)):'')+'</option>'; }).join('');
    if(currentMenuId) sel.value=currentMenuId;
  }
  updateMenuDelBtn();
  buildMenuPills();
  buildMenuPickers();
}
/* v134 (V4a): the §3.2 switcher pills — desktop-only by CSS, and only when every menu fits
   (≤5): the mock's "N more ▾" overflow needs a floating layer, and floating-layer placement is
   queued behind V6 where the layer system settles, so with more menus the native select stays
   as the overflow-capable control (it also remains the mobile control at every count).
   Pills and select share the ONE switch path (setCurrentMenuId → renderAnalysis). The pill %
   is avgFoodCostForScope — the same figure the dashboard states for that menu — coloured by
   the shared anchor-to-target pair; an uncosted menu shows its name alone, never a dash. */
function buildMenuPills(){
  var box=document.getElementById('menuPills'); if(!box) return;
  var row=box.closest('.menu-picker-row');
  var fit=(menusList.length>0 && menusList.length<=5);
  box.hidden=!fit;
  if(row) row.classList.toggle('pills-on', fit);
  if(!fit){ box.innerHTML=''; return; }
  box.innerHTML=menusList.map(function(m){
    var pct=avgFoodCostForScope(m.id);
    var on=(m.id===currentMenuId);
    return '<button type="button" class="menu-pill'+(on?' act':'')+'" data-menu="'+esc(m.id)+'"'+(on?' aria-current="true"':'')
      +' aria-label="'+esc(m.name)+(pct==null?'':(', '+pct.toFixed(1)+'% food cost'))+'">'
      +esc(m.name)+(pct==null?'':(' <span class="mp-pct '+dashPctClass(pct)+'">'+pct.toFixed(1)+'%</span>'))+'</button>';
  }).join('');
  box.querySelectorAll('.menu-pill').forEach(function(b){
    b.onclick=function(){
      var id=b.getAttribute('data-menu');
      if(id===currentMenuId) return;                                         // re-tapping the active pill has nothing to do — no re-render, no localStorage rewrite
      var sel=document.getElementById('menuSelect'); if(sel) sel.value=id;   // the select mirrors, so the two controls can never disagree
      setCurrentMenuId(id); updateMenuDelBtn(); renderAnalysis();
      // renderAnalysis rebuilt the pills (innerHTML), which detached the clicked button and
      // dropped focus to <body> — at ≥1024 the pills are the ONLY switcher, so a keyboard user
      // lost their place entirely (review finding; same refocus law as the dashboard scope btn).
      var nb=document.querySelector('.menu-pill[data-menu="'+id+'"]'); if(nb) nb.focus();
    };
  });
}
function buildMenuPickers(){                                   // fill the menu <select>s inside the Publish + Edit modals
  ['mi_menu','ed_menu'].forEach(function(id){
    var s=document.getElementById(id); if(!s) return;
    var cur=s.value||currentMenuId;
    s.innerHTML=menusList.map(function(m){ return '<option value="'+esc(m.id)+'">'+esc(m.name)+(m.season?(' \u2014 '+esc(m.season)):'')+'</option>'; }).join('');
    if(menusList.some(function(m){return m.id===cur;})) s.value=cur;
  });
}
function onMenuSelectChange(){
  var sel=document.getElementById('menuSelect'); if(!sel) return;
  // v69: the selection seed is now period+menu based (insightSeedFor) so it caches within a period and
  // varies per menu on its own — no per-switch bump needed (that would have defeated the cache).
  setCurrentMenuId(sel.value); updateMenuDelBtn(); renderAnalysis();
}
// v114: returns its write, for the same reason dbDeleteMenu and dbDeletePlate were given theirs in v112 —
// a helper that swallows its promise cannot be sequenced or confirmed by any caller.
function dbDeleteMenuRecord(id){ return pushWrite(function(){ return SUPA.from('menus').delete().eq('id',id); }, 'menu delete'); }
// v54: delete a menu \u2014 its dishes (menu_items rows) are removed and their plates are UNLINKED (menu_id \u2192 null),
// so every plate survives in the Plates library, just unpublished. No reassignment, no holding area. Dishes go
// first, then the menu row (dishes already gone, so the menu_items.menu_id FK can never be violated).
function doDeleteMenu(id, name){
  var affected=customMenu.filter(function(c){return (c.menuId||'MENU_ORIGINAL')===id;});
  var avgBefore=computeAvgFoodCost();                               // v114: before anything comes off the menu
  affected.forEach(function(c){ removeMenuItem(c.id); });           // v55: remove only THIS menu's entries; plates (and any other menus they're on) survive
  menusList=menusList.filter(function(x){return x.id!==id;});
  /* v114: ONE entry for the whole menu, chained off the MENUS row delete rather than the dishes'.
     That is the write that decides whether the menu is gone; the dish deletes are fired above without
     being awaited, which is pre-existing behaviour this batch is not in scope to change (the FK
     menu_items.menu_id -> menus.id is ON DELETE SET NULL, so unlike the plate case there is nothing to
     sequence against). Flagged in the handover rather than fixed. */
  logChangeIfSaved(dbDeleteMenuRecord(id), 'menu_deleted', {menuIds:[id], avgBefore:avgBefore,
    detail:{name:name||null, dishes:affected.length}});
  setCurrentMenuId(fallbackMenuId());
  rebuildMenu(); buildMenuSelector(); renderAnalysis(); updateMenuDelBtn(); if(typeof renderPlatesTab==='function') renderPlatesTab();
  logHistory();   // v115 path 12: after rebuildMenu() \u2014 computeAvgFoodCost reads MENU, which is stale until then
  toast('\u201c'+name+'\u201d deleted'+(affected.length?(' \u2014 '+affected.length+' plate'+(affected.length===1?'':'s')+' came off it, still in your library'):''));
}
// v55: single confirm. Deleting a menu removes only that menu's dishes; every plate stays in the Plates
// library (and on any other menus it was published to). Any menu may be deleted (incl. the last).
function deleteCurrentMenu(){
  var id=currentMenuId;
  if(!canDeleteMenu(id)){ toast('This menu can\u2019t be deleted'); return; }
  var m=menusList.find(function(x){return x.id===id;}); if(!m){ return; }
  var affected=customMenu.filter(function(c){return (c.menuId||'MENU_ORIGINAL')===id;});
  var nm=m.name;
  var msg=affected.length
    ? ('Delete \u201c'+m.name+'\u201d? Its '+affected.length+' plate'+(affected.length===1?'':'s')+' come off this menu \u2014 the plates stay in your library (and on any other menus).')
    : ('Delete \u201c'+m.name+'\u201d? It has no plates on it.');
  askConfirm('Delete menu?', msg, 'Delete menu', function(){ doDeleteMenu(id, nm); });
}
function updateMenuDelBtn(){ var b=document.getElementById('menuDelBtn'); if(b) b.style.display=canDeleteMenu(currentMenuId)?'':'none'; }

/* ---- reuse an existing costed dish on another menu (shares the source plate) ---- */
var adSelectedPlateId=null;
function eligibleDishes(){                                         // costed plates, most useful first
  return savedPlates.filter(function(sp){ return sp && sp.lines && sp.lines.length && costFromLines(sp.lines)>0; });
}
function renderDishPicker(filter){
  var box=document.getElementById('ad_list'); if(!box) return;
  var q=(filter||'').trim().toLowerCase();
  var list=eligibleDishes().filter(function(sp){ var nm=(menuNameForPlate(sp)+' '+(sp.name||'')).toLowerCase(); return !q||nm.indexOf(q)>=0; });
  list.sort(function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());});
  if(!list.length){ box.innerHTML='<div class="ad-empty">No costed plates found. Build and save a plate first.</div>'; return; }
  box.innerHTML=list.map(function(sp){
    var c=costFromLines(sp.lines); var on=plateMenuSummary(sp);
    var sel=(sp.id===adSelectedPlateId)?' sel':'';
    return '<button type="button" class="ad-item'+sel+'" data-pid="'+esc(sp.id)+'"><span class="ad-nm">'+esc(sp.name||'Plate')+'</span><span class="ad-meta">'+esc(on?('On '+on):'Library')+' · cost '+fmt2(c)+'</span></button>';
  }).join('');
  box.querySelectorAll('.ad-item').forEach(function(b){ b.onclick=function(){ adSelectedPlateId=b.getAttribute('data-pid'); renderDishPicker(document.getElementById('ad_search').value); renderAddDishUnlinked(); }; });
}
/* v113: the prompt follows the SELECTION here, because the plate is chosen inside this modal rather
   than before it. Picking a plate already on this menu withdraws the question — and it must, or its
   Link button would put a second row for the same (plate, menu) on the board, which is the very
   invariant the guard exists to hold. */
function renderAddDishUnlinked(){
  renderUnlinkedPrompt('ad_unlinked', adSelectedPlateId, currentMenuId, function(d){
    var sp=savedPlates.find(function(s){return s.id===adSelectedPlateId;});
    if(!sp){ var e2=document.getElementById('ad_err'); if(e2){ e2.textContent='Pick a plate from the list first.'; e2.style.display='block'; } return; }
    linkDishToPlate(d, sp); closeAddDishModal();
  });
}
function menuNameForPlate(sp){ return plateMenuSummary(sp)||(sp.name||''); }
function openAddDishModal(){
  adSelectedPlateId=null;
  var nm=document.getElementById('ad_menuName'); if(nm) nm.textContent=menuNameById(currentMenuId);
  var s=document.getElementById('ad_search'); if(s) s.value='';
  var p=document.getElementById('ad_price'); if(p) p.value='';
  var e=document.getElementById('ad_err'); if(e) e.style.display='none';
  renderDishPicker('');
  renderAddDishUnlinked();                                        // v113: no plate picked yet, so every unlinked row is still a candidate
  show('addDishModal');
}
function closeAddDishModal(){ hide('addDishModal'); }
function submitAddDish(){
  var err=document.getElementById('ad_err');
  var sp=savedPlates.find(function(s){return s.id===adSelectedPlateId;});
  if(!sp){ if(err){err.textContent='Pick a plate from the list first.';err.style.display='block';} return; }
  var pv=document.getElementById('ad_price').value;
  if(pv===''||isNaN(parseFloat(pv))||parseFloat(pv)<0){ if(err){err.textContent='Enter a sell price for this menu.';err.style.display='block';} return; }
  var plan=publishPlan(MENU, sp.id, currentMenuId);                // v113: the SAME decision submitMenuItem uses — this path had the identical blind spot
  if(plan.action==='update'){ if(err){err.textContent='That plate is already on this menu.';err.style.display='block';} return; }
  var id=uid('um');
  var item={id:id, section:(sp.category||'Uncategorised'), name:sp.name||'Plate', price:parseFloat(pv), notes:'', custom:true, menuId:currentMenuId, plateId:sp.id};
  var avgBefore=computeAvgFoodCost();                              // v114: before the push, for the same reason everywhere else — computeAvgFoodCost is live
  customMenu.push(item); var write=dbPushMenuAfterPlate(item, sp);
  rebuildMenu(); buildMenuOptions();
  logHistory();   // v90: as above — a new priced dish moves the menu average and seeds its price log
  // v114: the SECOND path that puts a plate on a menu. v113 found this pair the hard way — both carried
  // the identical publish guard and only one was in the brief — so they log the identical kind.
  logChangeIfSaved(write, 'dish_added', {plateId:sp.id, dishId:id, menuIds:[currentMenuId], avgBefore:avgBefore,
    costAfter:costFromLines(sp.lines), detail:{name:item.name, price:item.price, section:item.section}});
  renderAnalysis(); renderPlatesTab(); closeAddDishModal();
  toast('\u201c'+item.name+'\u201d added to '+menuNameById(currentMenuId));
}
function openNewMenuModal(){
  var n=document.getElementById('nm_name'); if(n)n.value='';
  var s=document.getElementById('nm_season'); if(s)s.value='';
  var e=document.getElementById('nm_err'); if(e)e.style.display='none';
  show('newMenuModal');
}
function closeNewMenuModal(){ hide('newMenuModal'); }
function submitNewMenu(){
  var name=(document.getElementById('nm_name')||{}).value; name=(name||'').trim();
  var season=(document.getElementById('nm_season')||{}).value||''; season=season.trim();
  var err=document.getElementById('nm_err');
  if(!name){ if(err){ err.textContent='Enter a menu name.'; err.style.display='block'; } return; }
  var id=uid('MENU');
  var rec={id:id, name:name, season:season||null};
  menusList.push(rec); dbUpsertMenuRecord(rec);
  setCurrentMenuId(id);
  buildMenuSelector(); renderAnalysis(); closeNewMenuModal();
  toast('\u201c'+name+'\u201d menu created');
}

/* ===== Menu Analysis: split "/" items + safe delete ===== */
function dbDeleteMenu(id){ return pushWrite(function(){ return SUPA.from('menu_items').delete().eq('id',id); }, 'menu delete'); }   // v112: returns its promise so a plate delete can be chained after it
/* v108: isBaseMenuId was `BASE_MENU.some(...)` and is deleted with the literal. There are no built-in
   dishes any more, so removeMenuItem's tombstone branch is unreachable by construction — a deleted
   dish is a deleted ROW, which is the whole point of D3. */
/* F5 (v142) tombstone: `menuActions(m)` is DELETED. v55 (\u00a7D2) emptied it when the "\u2192 Builder" chip
   was removed \u2014 a dish's recipe is edited from its plate in the Plates tab, and the Menu row stays
   tap-to-edit for price/category/menu only \u2014 so it had returned '' for eighteen versions and its two
   call sites concatenated nothing. The rebuild dropped the call sites, which left it orphaned
   (protocol \u00a71.4: a converted screen deletes its now-orphaned helpers). `.mi-act` / `.mi-btn` went
   with it \u2014 nothing has emitted either since v55. */
// v112: the in-memory half, split out so a caller that must SEQUENCE the server deletes (deletePlate /
// doDeleteEverything) can drop the rows locally and drive the writes itself, instead of firing them here.
function forgetMenuItems(ids){
  var kill={}; (ids||[]).forEach(function(id){ kill[id]=1; });
  customMenu=customMenu.filter(function(c){ return !kill[c.id]; });
}
/* v114 — THE CHANGE LOG IS DELIBERATELY WRITTEN BY THIS FUNCTION'S CALLERS, NOT BY THIS FUNCTION.
   Three callers, two meanings: mmRemove and doDeleteMenuOnly are a user taking ONE plate off ONE menu
   (`dish_removed` each); doDeleteMenu calls this once per dish while deleting the whole menu, which is
   ONE decision and logs ONE `menu_deleted`. Logging here would turn a menu deletion into N+1 entries and
   report a burst of interventions that never happened. The cost of that choice is that a FOURTH caller
   could be added without a log entry, so tests/change-log.test.js asserts the call sites by name — if
   this list ever grows, that test fails and names the newcomer. */
function removeMenuItem(id){
  forgetMenuItems([id]);
  return dbDeleteMenu(id);                            // remove server row (harmless if none)
  // v108: the tombstone branch is gone with BASE_MENU. Deleting the row IS the deletion now.
}
/* two-tap confirm dialog */
var __confirmFn=null, __confirmCancelFn=null;
// v82: optional cancelLabel + cancelFn so a dialog can offer a real second choice (e.g. "Discard").
// Existing 4-arg callers are unaffected — cancel stays a plain close with no callback.
function askConfirm(title,msg,okLabel,fn,cancelLabel,cancelFn){
  __confirmFn=fn; __confirmCancelFn=cancelFn||null;
  var t=document.getElementById('confirmTitle'); if(t)t.textContent=title;
  var mm=document.getElementById('confirmMsg'); if(mm)mm.textContent=msg;
  var ok=document.getElementById('confirmOk'); if(ok)ok.textContent=okLabel||'Confirm';
  var ca=document.getElementById('confirmCancel'); if(ca)ca.textContent=cancelLabel||'Cancel';
  show('confirmModal');
}
function closeConfirm(){ hide('confirmModal'); __confirmFn=null; __confirmCancelFn=null; }

/* ===== Menu item edit modal ===== */
// v112: editKind/edRestoreMode are gone with the orphan-plate editor — the modal only ever edited a menu item.
var editTargetId=null, edDelArmed=false, edCatState={chosen:null,chosenIsNew:false}, edCat=null, delChoiceId=null;
function makeCatCombo(inpId, dropId, newId, state){
  var inp=document.getElementById(inpId); if(!inp) return null;
  function render(){
    var q=inp.value.trim(), drop=document.getElementById(dropId), cats=menuCats();
    var scored=cats.map(function(c){return {c:c,s:catScore(c,q)};}).filter(function(o){return o.s>=0;}).sort(function(a,b){return b.s-a.s;});
    var html='';
    scored.forEach(function(o){var ex=o.c.toLowerCase()===q.toLowerCase();html+='<div class="opt cat-opt" data-cat="'+esc(o.c)+'">'+esc(o.c)+(ex?' <span class="ca">exists</span>':'')+'</div>';});
    var hasExact=cats.some(function(c){return c.toLowerCase()===q.toLowerCase();});
    if(q && !hasExact) html+='<div class="opt cat-opt cat-create" data-new="'+esc(q)+'">\u2795 Create new category \u201c'+esc(q)+'\u201d</div>';
    if(!html) html='<div class="opt muted">No categories yet</div>';
    drop.innerHTML=html; drop.style.display='block';
    drop.querySelectorAll('.cat-opt').forEach(function(o){o.addEventListener('mousedown',function(e){e.preventDefault();var dn=o.getAttribute('data-new');if(dn!==null)choose(dn,true);else choose(o.getAttribute('data-cat'),false);});});
  }
  function choose(name,isNew){
    inp.value=name; state.chosen=name; state.chosenIsNew=isNew;
    document.getElementById(dropId).style.display='none';
    var nw=document.getElementById(newId);
    if(nw){ if(isNew){nw.textContent='New category will be created: \u201c'+name+'\u201d';nw.style.display='block';}else{nw.style.display='none';} }
  }
  inp.addEventListener('input',function(){state.chosen=null;state.chosenIsNew=false;var n=document.getElementById(newId);if(n)n.style.display='none';render();});
  inp.addEventListener('focus',render);
  inp.addEventListener('blur',function(){setTimeout(function(){var d=document.getElementById(dropId);if(d)d.style.display='none';},150);});
  return {render:render, choose:choose};
}
function openMenuEdit(id){
  var m=menuById[id]; if(!m) return;
  editTargetId=id; edDelArmed=false; setEditMode();
  document.getElementById('ed_name').value=m.name||'';
  document.getElementById('ed_price').value=(m.price!=null)?m.price:'';
  document.getElementById('ed_cat').value=m.section||'';
  buildMenuPickers(); var edMenu=document.getElementById('ed_menu'); if(edMenu){ var wm=m.menuId||'MENU_ORIGINAL'; if(menusList.some(function(x){return x.id===wm;})) edMenu.value=wm; }
  edCatState.chosen=m.section||null; edCatState.chosenIsNew=false;
  var d=document.getElementById('ed_catDrop'); if(d)d.style.display='none';
  var nn=document.getElementById('ed_catNew'); if(nn)nn.style.display='none';
  document.getElementById('ed_err').style.display='none';
  var del=document.getElementById('ed_delete'); if(del) del.textContent='Delete item';
  show('editModal');
}
function closeEdit(){ hide('editModal'); editTargetId=null; edDelArmed=false; }
function resolveEditCat(){
  var typedCat=document.getElementById('ed_cat').value.trim();
  var allCats=menuCats();
  var existCat=allCats.find(function(c){return c.toLowerCase()===typedCat.toLowerCase();});
  if(typedCat==='') return 'Uncategorised';
  if(existCat) return existCat;
  if(edCatState.chosen!==null && edCatState.chosenIsNew && edCatState.chosen.toLowerCase()===typedCat.toLowerCase()) return typedCat;
  return null;   // a new category that hasn't been confirmed
}
function saveMenuEdit(){
  var id=editTargetId; if(!id||!menuById[id]) return;
  var m=menuById[id], err=document.getElementById('ed_err');
  var name=document.getElementById('ed_name').value.trim();
  var priceV=document.getElementById('ed_price').value;
  if(!name){ err.textContent='Enter a menu item name.'; err.style.display='block'; return; }
  if(priceV===''||isNaN(parseFloat(priceV))||parseFloat(priceV)<0){ err.textContent='Enter a valid sell price.'; err.style.display='block'; return; }
  var cat=resolveEditCat();
  if(cat===null){ err.textContent='\u201c'+document.getElementById('ed_cat').value.trim()+'\u201d is a new category \u2014 pick \u201cCreate new category\u201d from the list to confirm, or choose an existing one.'; err.style.display='block'; if(edCat)edCat.render(); return; }
  var price=parseFloat(priceV);
  var edMenuEl=document.getElementById('ed_menu'); var chosenMenu=(edMenuEl&&edMenuEl.value)?edMenuEl.value:(m.menuId||'MENU_ORIGINAL');
  /* v114 \u2014 ONE user action is ONE entry, so this picks a single kind even when the save moved both the
     price and the menu: price wins, and the move is recorded in `detail`.
     \u26a0\ufe0f WHAT THAT COSTS A LATER READER, and it is not obvious from here (PR review, #58): a query
     filtering on `kind === 'dish_moved'` to find "everything that changed menus" MISSES every edit where
     the price moved in the same save, because those are `dish_price`. The menu change is still recorded
     \u2014 in `detail.menuFrom`/`detail.menuTo`, which are written on BOTH kinds precisely so this is
     recoverable. Any consumer asking "did this move menus" must read `detail`, never `kind` alone.
     Renaming a row or moving it
     between sections logs NOTHING \u2014 neither changes what the plate costs or what it sells for, and a
     log that fires on a typo correction cannot be read as "what you last did about food cost".
     `_priceMoved` is measured to the cent, matching logMenuPrice's own dedupe: re-saving an unchanged
     price hands back a value differing in the eighteenth decimal, which is a keystroke, not a decision. */
  var _avgBefore=computeAvgFoodCost(), _wasMenu=(m.menuId||'MENU_ORIGINAL'), _wasPrice=(m.price==null?null:Number(m.price));
  var _priceMoved=(_wasPrice==null || Math.abs(_wasPrice-price)>=0.005), _menuMoved=(chosenMenu!==_wasMenu);
  var _plateId=(m.plateId||m.sourcePlateId||null);
  // v55: a dish keeps its own name/price/category per menu \u2014 editing it never renames the shared plate.
  var _write=upsertCustomMenu({id:id, section:cat, name:name, price:price, notes:(m.notes||''), custom:true, menuId:chosenMenu, plateId:_plateId});   // saves all edits at once
  rebuildMenu(); buildMenuOptions();
  logHistory();   // v90: a sell-price edit moves the menu average AND is the event the sell-price log exists to catch. This path never logged either (the v60 item 1a liveness rule, missed here).
  if(_priceMoved || _menuMoved){
    logChangeIfSaved(_write, _priceMoved?'dish_price':'dish_moved',
      {plateId:_plateId, dishId:id, menuIds:_menuMoved?[_wasMenu, chosenMenu]:[chosenMenu], avgBefore:_avgBefore,
       detail:{name:name, priceFrom:_wasPrice, priceTo:price, menuFrom:_wasMenu, menuTo:chosenMenu}});
  }
  if(chosenMenu!==currentMenuId){ setCurrentMenuId(chosenMenu); buildMenuSelector(); }   // follow the dish if it was moved to another menu
  renderPlate(); renderAnalysis(); renderPlatesTab(); closeEdit();
  toast('\u201c'+name+'\u201d updated');
}
function editDeleteTap(){
  var id=editTargetId; if(!id||!menuById[id]) return;
  var nm=menuById[id].name; closeEdit(); openDelChoice(id, nm);
}

/* ===== menu-item edit modal setup =====
   v112: this modal had a SECOND mode — an "orphan plate" editor (openPlateEdit / savePlateRename /
   editRestoreToMenu / savePlateRestore / editPermDeletePlate) reached by clicking a Menu-tab row that
   carried `data-pid`. Nothing ever emitted that attribute: aRow's 5th `pid` argument was never passed by
   its one call site, so the whole branch was unreachable from v55 onward (HANDOVER-v55 recorded it as
   "dead post-v55, left for later cleanup" and it outlived v111's sweep because the functions ARE
   name-referenced from live code — only the DATA flow showed they were dead).
   Two of those functions were genuinely broken, which is why this is a fix and not tidying:
     - savePlateRestore linked the new dish to its plate through `sp.menuId` only. plateToRow omits
       menu_id (deliberately — v110's restore depends on it), so the link died on reload and costing the
       dish afterwards would mint a SECOND empty plate, orphaning the first. Compounding, and silent.
     - editPermDeletePlate deleted a plate with NO dish cleanup at all, which the
       menu_items.plate_id -> plates.id FK (no delete action) rejects outright.
   Publishing an unpublished plate is unaffected: the live path is the Plates tab -> Publish ->
   openManageMenus -> submitMenuItem, which sets a real plateId and already sequences the writes. */
function setEditMode(){
  var cf=document.getElementById('ed_catField'), pf=document.getElementById('ed_priceField');
  var mf=document.getElementById('ed_menuField');
  var dr=document.getElementById('ed_deleteRow');
  var save=document.getElementById('editSave'), title=document.getElementById('editTitle');
  var nlab=document.querySelector('label[for="ed_name"]');
  if(cf)cf.style.display=''; if(pf)pf.style.display=''; if(mf)mf.style.display='';
  if(dr)dr.style.display='';
  if(save)save.textContent='Save changes'; if(title)title.textContent='Edit menu item'; if(nlab)nlab.textContent='Menu item name *';
}
function onEditSave(){ saveMenuEdit(); }
function openDelChoice(id,nm){
  delChoiceId=id;
  var msg=document.getElementById('delChoiceMsg'); if(msg)msg.textContent='Delete \u201c'+nm+'\u201d from the menu. Keep its saved plate for reuse, or delete everything?';
  show('delChoiceModal');
}
function closeDelChoice(){ hide('delChoiceModal'); delChoiceId=null; }
// v55: "remove from menu" drops just this menu entry; the plate stays in the library (and on any other menus).
function doDeleteMenuOnly(){
  var id=delChoiceId; if(!id||!menuById[id]){ closeDelChoice(); return; }
  var m=menuById[id], nm=m.name;
  var avgBefore=computeAvgFoodCost(), plateId=plateIdOf(m), mid=(m.menuId||'MENU_ORIGINAL'), price=m.price;
  var write=removeMenuItem(id);
  logChangeIfSaved(write, 'dish_removed', {plateId:plateId, dishId:id, menuIds:[mid], avgBefore:avgBefore,
    detail:{name:nm||null, price:price, via:'menu-tab'}});
  rebuildMenu(); buildMenuOptions(); updateEditTag(); renderPlate(); renderAnalysis(); renderPlatesTab(); closeDelChoice();
  logHistory();   // v115 path 10: after rebuildMenu() \u2014 computeAvgFoodCost reads MENU, which is stale until then (NOT beside the logChangeIfSaved above, which would log the pre-delete average)
  toast('\u201c'+nm+'\u201d removed from this menu \u2014 plate kept');
}
// v55: "delete everything" deletes the plate AND every menu entry backed by it (across all menus).
function doDeleteEverything(){
  var id=delChoiceId; if(!id||!menuById[id]){ closeDelChoice(); return; }
  var nm=menuById[id].name; var sp=plateForMenuItem(menuById[id]);
  var repaint=function(){ rebuildMenu(); buildMenuOptions(); updateEditTag(); renderPlate(); renderAnalysis(); renderPlatesTab(); };
  closeDelChoice();
  var avgBefore=computeAvgFoodCost();                     // v114: before anything is forgotten
  if(!sp){                                                // nothing references anything \u2014 no sequencing needed
    // v112: no FK to order, but the same honesty rule as the branch below \u2014 the word "deleted" waits for
    // the server, and a dish the server kept is put back rather than left missing until the next reload.
    var only=menuById[id];
    var onlyMid=(only.menuId||'MENU_ORIGINAL'), onlyPrice=only.price;
    forgetMenuItems([id]); repaint();
    Promise.resolve(dbDeleteMenu(id)).then(function(r){ return !!(r && !r.error); }, function(){ return false; })
      .then(function(ok){
        if(ok){
          // v114: an unlinked row has no plate to delete, so what actually happened is a removal from
          // the menu \u2014 `dish_removed`, not `plate_deleted`. Naming it after the button the user pressed
          // would put a plate deletion in the log with no plate.
          logChange('dish_removed', {dishId:id, menuIds:[onlyMid], avgBefore:avgBefore,
            detail:{name:nm||null, price:onlyPrice, via:'delete-everything', unlinked:true}});
          logHistory();   // v115 path 11: success-gated \u2014 the forget preceded the await, and a failed delete puts the row back
          toast('\u201c'+nm+'\u201d deleted'); return;
        }
        customMenu.push(only); repaint();
        toast('Couldn\u2019t delete \u201c'+nm+'\u201d \u2014 it has NOT been deleted.');
      });
    return;
  }
  // v112: same FK ordering as deletePlate \u2014 the dishes must be gone before the plate row can be.
  var dishes=dishesOfPlate(sp).slice();
  var dishIds=dishes.map(function(d){ return d.id; });
  var wasLoaded=(loadedPlateId===sp.id);
  var menuIds=menusOfPlate(sp).map(function(o){ return o.menuId; }), lineCount=(sp.lines||[]).length, plateName=sp.name||nm;
  forgetMenuItems(dishIds);
  savedPlates=savedPlates.filter(function(s){return s.id!==sp.id;});
  if(wasLoaded) loadedPlateId=null;
  repaint();
  dbDeletePlateAfterDishes(dishIds, sp.id).then(function(r){
    if(r.dishesOk && r.plateOk){
      // v114: the same kind deletePlate writes \u2014 it is the same outcome by a different door, and a log
      // that distinguished them would be recording which button was pressed rather than what happened.
      logChange('plate_deleted', {plateId:sp.id, menuIds:menuIds, avgBefore:avgBefore,
        detail:{name:plateName, dishes:dishIds.length, lines:lineCount}});
      logHistory();   // v115 path 11: success-gated for the same reason as deletePlate \u2014 an optimistic point would survive rollbackPlateDelete as a phantom drop
      toast('\u201c'+nm+'\u201d and its plate deleted'); return;
    }
    rollbackPlateDelete(sp, wasLoaded, dishes, r, repaint, nm);
  });
}

/* ---- wiring ---- */
document.getElementById('importBtn').addEventListener('click',openInv);
document.getElementById('invParse').addEventListener('click',parseInvoice);
/* F8 (v147): TWO dropzones, ONE file input and ONE parse route — the modal's step-1 zone and the
   Invoices screen's. Both click through to #invFile and both accept a drop; handleInvFile shows the
   modal itself, so dropping on the screen with the modal shut still lands on the scanning step.
   The drag listeners live on the zone, not the window: a full-window drop target on a costing app
   is how a mis-aimed drag becomes an import nobody asked for. */
(function(){
  var fi=document.getElementById('invFile');
  if(!fi) return;
  fi.addEventListener('change',function(){ if(fi.files&&fi.files[0]) handleInvFile(fi.files[0]); });
  ['invFileBtn','invDropZone'].forEach(function(id){
    var z=document.getElementById(id); if(!z) return;
    z.addEventListener('click',function(){ fi.click(); });
    ['dragenter','dragover'].forEach(function(ev){ z.addEventListener(ev,function(e){ e.preventDefault(); z.classList.add('dragover'); }); });
    ['dragleave','dragend'].forEach(function(ev){ z.addEventListener(ev,function(){ z.classList.remove('dragover'); }); });
    z.addEventListener('drop',function(e){
      e.preventDefault(); z.classList.remove('dragover');
      var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
      if(f) handleInvFile(f);
    });
  });
  var ub=document.getElementById('invUploadBtn'); if(ub) ub.addEventListener('click',openInv);   // the screen header's primary — the mock's §3.6 "Upload invoice"
})();
document.getElementById('invClose').addEventListener('click',closeInv);
document.getElementById('menuClose').addEventListener('click',closeMenuModal);
document.getElementById('menuCancel').addEventListener('click',closeMenuModal);
document.getElementById('menuSave').addEventListener('click',submitMenuItem);
(function(){
  var ms=document.getElementById('menuSelect'); if(ms) ms.addEventListener('change',onMenuSelectChange);
  var mnb=document.getElementById('menuNewBtn'); if(mnb) mnb.addEventListener('click',openNewMenuModal);
  var madb=document.getElementById('menuAddDishBtn'); if(madb) madb.addEventListener('click',openAddDishModal);
  var smc=document.getElementById('smemClose'); if(smc) smc.addEventListener('click',closeSmem);
  var smd=document.getElementById('smemDone'); if(smd) smd.addEventListener('click',closeSmem);
  var adc=document.getElementById('addDishClose'); if(adc) adc.addEventListener('click',closeAddDishModal);
  var adca=document.getElementById('addDishCancel'); if(adca) adca.addEventListener('click',closeAddDishModal);
  var ads=document.getElementById('addDishSave'); if(ads) ads.addEventListener('click',submitAddDish);
  var adsr=document.getElementById('ad_search'); if(adsr) adsr.addEventListener('input',function(e){ renderDishPicker(e.target.value); });
  var mdb=document.getElementById('menuDelBtn'); if(mdb) mdb.addEventListener('click',deleteCurrentMenu);
  var nmc=document.getElementById('newMenuClose'); if(nmc) nmc.addEventListener('click',closeNewMenuModal);
  var nmca=document.getElementById('newMenuCancel'); if(nmca) nmca.addEventListener('click',closeNewMenuModal);
  var nms=document.getElementById('newMenuSave'); if(nms) nms.addEventListener('click',submitNewMenu);
  var nmn=document.getElementById('nm_name'); if(nmn) nmn.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); submitNewMenu(); } });
})();
document.getElementById('editClose').addEventListener('click',closeEdit);
document.getElementById('editCancel').addEventListener('click',closeEdit);
document.getElementById('editSave').addEventListener('click',onEditSave);
/* §D2: ed_openBuilder removed — a dish's recipe is edited from its plate in the Plates tab. */
document.getElementById('ed_delete').addEventListener('click',function(e){e.preventDefault();editDeleteTap();});
/* v112: ed_restore / ed_permDelete are gone with the unreachable orphan-plate editor. */
document.getElementById('delChoiceClose').addEventListener('click',closeDelChoice);
document.getElementById('delChoiceCancel').addEventListener('click',closeDelChoice);
document.getElementById('delChoiceMenuOnly').addEventListener('click',doDeleteMenuOnly);
document.getElementById('delChoiceAll').addEventListener('click',doDeleteEverything);
edCat=makeCatCombo('ed_cat','ed_catDrop','ed_catNew',edCatState);
(function(){var ok=document.getElementById('confirmOk'),ca=document.getElementById('confirmCancel'),cx=document.getElementById('confirmClose');
 if(ok)ok.addEventListener('click',function(){ var fn=__confirmFn; closeConfirm(); if(fn)fn(); });
 // v82: the Cancel button runs an optional cancel callback (× / backdrop / Escape stay a plain close — a
 // stray dismiss should not, e.g., discard a draft; only the explicit labelled button acts).
 if(ca)ca.addEventListener('click',function(){ var fn=__confirmCancelFn; closeConfirm(); if(fn)fn(); });
 if(cx)cx.addEventListener('click',closeConfirm);})();

// backdrop tap closes small dialogs. F7 (v146): the builder is a PAGE now, so the note this comment
// used to carry (it is deliberately not backdrop-dismissable, because an accidental tap must not
// throw away a plate in progress) is moot — a page has no backdrop. `plateActionsModal` left this
// list with the chooser.
['menuModal','invModal','confirmModal','editModal','delChoiceModal','manageMenusModal'].forEach(function(id){var m=document.getElementById(id);if(m)m.addEventListener('mousedown',function(e){if(e.target===m)hide(id);});});
/* v137 (F1b): ONE Escape handler for every modal in the app, closing the TOP LAYER ONLY.
   It replaces a hard-coded list of 8 ids plus two single-modal listeners. See topOverlay() /
   closeTopOverlay() for why the layer is derived from the DOM rather than named.
   BUBBLE phase, deliberately — a dropdown open INSIDE a modal is a layer too, and Escape must
   close it first. Those handlers now stopPropagation() when they consume the key, so this one
   never sees it. Capture would have closed the whole modal out from under an open combobox.
   The dashboard scope popover keeps its own listener: it is a popover, not an overlay, and is
   not in this set. */
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape') return;
  if(closeTopOverlay()) e.preventDefault();
});
updateLastImport(); updateEditTag();


/* ===== category combobox (Add to menu) ===== */
var catState={chosen:null,chosenIsNew:false};
function menuCats(){var c=[];MENU.forEach(function(m){if(c.indexOf(m.section)<0)c.push(m.section);});return c;}
function catScore(cat,q){cat=cat.toLowerCase();q=q.toLowerCase();if(!q)return 1;if(cat===q)return 100;if(cat.indexOf(q)===0)return 80;if(cat.indexOf(q)>=0)return 60;var i=0;for(var j=0;j<cat.length&&i<q.length;j++){if(cat[j]===q[i])i++;}return i===q.length?30:-1;}
function renderCatDrop(){
  var inp=document.getElementById('mi_cat'); if(!inp)return;
  var q=inp.value.trim(), drop=document.getElementById('mi_catDrop'), cats=menuCats();
  var scored=cats.map(function(c){return {c:c,s:catScore(c,q)};}).filter(function(o){return o.s>=0;}).sort(function(a,b){return b.s-a.s;});
  var html='';
  scored.forEach(function(o){var ex=o.c.toLowerCase()===q.toLowerCase();html+='<div class="opt cat-opt" data-cat="'+esc(o.c)+'">'+esc(o.c)+(ex?' <span class="ca">exists</span>':'')+'</div>';});
  var hasExact=cats.some(function(c){return c.toLowerCase()===q.toLowerCase();});
  if(q && !hasExact) html+='<div class="opt cat-opt cat-create" data-new="'+esc(q)+'">\u2795 Create new category \u201c'+esc(q)+'\u201d</div>';
  if(!html) html='<div class="opt muted">No categories yet</div>';
  drop.innerHTML=html; drop.style.display='block';
  drop.querySelectorAll('.cat-opt').forEach(function(o){o.addEventListener('mousedown',function(e){e.preventDefault();var dn=o.getAttribute('data-new');if(dn!==null)chooseCat(dn,true);else chooseCat(o.getAttribute('data-cat'),false);});});
}
function chooseCat(name,isNew){
  var inp=document.getElementById('mi_cat'); inp.value=name;
  catState.chosen=name; catState.chosenIsNew=isNew;
  document.getElementById('mi_catDrop').style.display='none';
  var nw=document.getElementById('mi_catNew');
  if(isNew){nw.textContent='New category will be created: \u201c'+name+'\u201d';nw.style.display='block';}else{nw.style.display='none';}
}
(function(){
  var inp=document.getElementById('mi_cat'); if(!inp)return;
  inp.addEventListener('input',function(){catState.chosen=null;catState.chosenIsNew=false;var n=document.getElementById('mi_catNew');if(n)n.style.display='none';renderCatDrop();});
  inp.addEventListener('focus',renderCatDrop);
  inp.addEventListener('blur',function(){setTimeout(function(){var d=document.getElementById('mi_catDrop');if(d)d.style.display='none';},150);});
})();

/* ============================================================
   ITEM 5 — custom pull-to-refresh (mobile only).
   Native PTR is deliberately disabled ≤700px (overscroll-behavior),
   so this is our own. Arms only at scrollTop 0, off modals/tables/inputs,
   and never clobbers an in-progress plate (see refreshFromCloud).
   ============================================================ */
(function(){
  if(!('ontouchstart' in window)) return;                            // touch devices only
  var ind=document.createElement('div');
  ind.className='ptr-ind'; ind.setAttribute('aria-hidden','true');
  // two stacked layers: a static faint ring + the orange arc that spins on its own (Item 14)
  ind.innerHTML='<span class="ptr-spin">'
    +'<svg class="ptr-ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="6" opacity="0.25"/></svg>'
    +'<svg class="ptr-arc" viewBox="0 0 64 64"><path d="M 32 17.5 A 14.5 14.5 0 0 1 40.52 43.73" fill="none" stroke-width="6" stroke-linecap="round"/></svg>'
    +'</span>';
  document.body.appendChild(ind);
  var arc=ind.querySelector('.ptr-arc');
  var main=document.getElementById('appMain');
  var startY=0, armed=false, pulling=false, raw=0, refreshing=false;
  var TRIGGER=130;          // RAW finger travel needed — a complete, deliberate drag, not a flick (Item 13)
  var TOP_ZONE=0.25;        // the gesture must START in the top quarter of the screen (Item 13)
  var HOLD=64;              // how far the content is held down while the refresh runs
  var MAXPULL=150;          // cap on raw travel we translate
  function scroller(){ return document.scrollingElement || document.documentElement; }
  function mobile(){ return window.matchMedia && window.matchMedia('(max-width:700px)').matches; }
  function blocked(t){
    if(refreshing) return true;
    if(document.querySelector('.modal-overlay.open, #modal.open')) return true;   // any modal open
    if(document.querySelector('.drop.open')) return true;                         // builder ingredient dropdown
    if(t && t.closest && t.closest('.atable-wrap, .drop, .cat-drop, select, input, textarea, [contenteditable]')) return true;
    return false;
  }
  function contentOffset(rawDy){ return Math.min(HOLD, rawDy*0.5); }  // content follows the finger at half-speed (rubber-band feel)
  // v115: release/settle uses the motion tokens (--t-med/--ease) — the only ad-hoc duration left in
  // the app, and the settle read as abrupt against every other tokened transition.
  function setContent(y, animate){
    if(main){ main.style.transition = animate?'transform var(--t-med) var(--ease)':''; main.style.transform = y?('translateY('+y+'px)'):''; }
  }
  function setInd(y, animate){
    ind.style.transition = animate?'transform var(--t-med) var(--ease), opacity var(--t-med) var(--ease)':'';
    ind.style.transform='translateX(-50%) translateY('+y+'px)';
    ind.style.opacity=String(Math.min(1, y/HOLD));
  }
  function release(){                                                 // no trigger: ease everything back
    ind.classList.remove('ready');
    setInd(0,true); ind.style.opacity='0';
    setContent(0,true);
    if(main) setTimeout(function(){ main.style.willChange='auto'; main.style.transition=''; },220);
  }
  function finish(){                                                  // refresh done: unhold + spin down
    refreshing=false; document.body.classList.remove('ptr-active');
    ind.classList.remove('spinning','ready');
    setInd(0,true); ind.style.opacity='0';
    setContent(0,true);
    if(main) setTimeout(function(){ main.style.willChange='auto'; main.style.transition=''; },220);
  }
  function trigger(){
    if(refreshing) return; refreshing=true;
    document.body.classList.add('ptr-active');                        // Item 15: spinner owns the top-centre; sync banner hides
    if(navigator.vibrate){ try{ navigator.vibrate(10); }catch(e){} }
    ind.classList.add('spinning'); ind.classList.remove('ready');
    setInd(HOLD,true);                                                // hold the spinner down in the opened gap
    setContent(HOLD,true);                                            // and hold the content down until the data comes back
    Promise.resolve(refreshFromCloud()).then(finish, finish);
  }
  window.addEventListener('touchstart', function(e){
    armed=false; pulling=false; raw=0;
    if(e.touches.length!==1 || !mobile()) return;
    if(scroller().scrollTop>0) return;                                // must be at the very top
    if(e.touches[0].clientY > window.innerHeight*TOP_ZONE) return;    // …and the drag must START near the top of the screen (Item 13)
    if(blocked(e.target)) return;
    armed=true; startY=e.touches[0].clientY;
    if(main) main.style.willChange='transform';
  }, {passive:true});
  window.addEventListener('touchmove', function(e){
    if(!armed) return;
    if(scroller().scrollTop>0){ armed=false; release(); return; }
    var dy=e.touches[0].clientY-startY;
    if(dy>0){
      pulling=true;
      raw=Math.min(MAXPULL, dy);
      var y=contentOffset(raw);
      setContent(y,false); setInd(y,false);
      if(arc) arc.style.transform='rotate('+(Math.min(1, raw/TRIGGER)*300)+'deg)';
      ind.classList.toggle('ready', raw>=TRIGGER);
      if(e.cancelable) e.preventDefault();                            // suppress the page rubber-band while pulling
    }
  }, {passive:false});
  window.addEventListener('touchend', function(){
    if(!armed) return; armed=false;
    if(arc) arc.style.transform='';                                   // hand rotation back to the CSS spin animation
    if(pulling && raw>=TRIGGER) trigger(); else release();
    pulling=false;
  });
  // expose for headless tests
  window.__ptr={ trigger:trigger, blocked:blocked };
})();

/* ===== Item 9 — Enter in a single-line modal field commits + drops the keyboard ===== */
(function(){
  var EXCLUDE='#q, .invPrice, .invPackQty, [role="combobox"], .cat-wrap input, .search-wrap input';   // combos + inline price edits own their Enter/behaviour
  // hint the mobile keyboard's return key for the plain single-line fields
  document.querySelectorAll('.modal input').forEach(function(inp){
    var ty=(inp.getAttribute('type')||'text').toLowerCase();
    if(ty==='checkbox'||ty==='radio'||ty==='button'||ty==='submit') return;
    if(inp.matches(EXCLUDE)) return;
    if(!inp.hasAttribute('enterkeyhint')) inp.setAttribute('enterkeyhint','done');
  });
  // one delegated listener: Enter commits the field (blur) and dismisses the keyboard — never auto-submits the form
  document.addEventListener('keydown', function(e){
    if(e.key!=='Enter' || e.shiftKey) return;
    if(e.defaultPrevented) return;                                  // a field-specific handler already dealt with it (#q, nm_name…)
    var t=e.target;
    if(!t || t.tagName!=='INPUT') return;                           // textareas keep their normal newline
    var ty=(t.getAttribute('type')||'text').toLowerCase();
    if(ty==='checkbox'||ty==='radio'||ty==='button'||ty==='submit') return;
    if(!t.closest('.modal')) return;                                // only inside popups
    if(t.matches(EXCLUDE)) return;
    e.preventDefault();
    t.blur();
  });
})();

/* v84 — LAST statement in this file, deliberately. See the BUGFIX note at restoreLastTab():
   askConfirm stores its callbacks in module vars whose `= null` initialisers run near the end of
   this top-level pass, so a load-time askConfirm caller must run after ALL of them. */
offerPlateDraftResume();                                   // v82 D1: an unfinished plate from a previous session — resume or discard
