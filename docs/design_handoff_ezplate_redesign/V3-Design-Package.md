# EzPlate v3 Design Package
Complete implementation spec. Sources of truth: `Redesign v3 - SaaS.dc.html` (desktop, 10 screens + 4 modals) and `Redesign v3 - Mobile.dc.html` (mobile, 9 screens + bottom sheet). This package supersedes all earlier v1/v2 mocks and the warm-dark package.

## 1. Tokens

### 1.1 Type
- UI font: `Geist` (400/500/600/700). Fallback `system-ui, sans-serif`.
- Numeric font: `Geist Mono` for EVERY number: prices, %, quantities, dates in tables, kbd. Always `font-variant-numeric: tabular-nums`. Right-align numeric columns.
- Scale (desktop): page title 15/600 in header bar; section titles 13/600; body/rows 13.5/500; secondary 12.5; table headers 11.5/500; KPI number 26/600 mono; dashboard hero number 44 mono (mobile).
- Scale (mobile): screen title 16-17/600; rows 15/500; secondary 12.5; min hit target 44px, list rows min 56px.

### 1.2 Color (light theme, locked; no dark mode in v3)
| Token | Value | Use |
|---|---|---|
| text | `#2A211B` | primary text |
| text-2 | `#6B5D50` | secondary |
| muted | `#A2937F` | table headers, hints |
| canvas | `#FFFFFF` | main bg |
| surface | `#FAF7F1` | sidebar, table header bands, hovers, mobile search fields |
| border | `#EAE3D8` | container borders, header hairlines |
| border-input | `#E3DCCF` | inputs, secondary buttons |
| divider | `#F3EFE8` | row dividers |
| nav-active | `#F2EADD` | sidebar active pill |
| skeleton | `#F3EFE8` | skeleton bars |
| accent | `#B84E0C` | THE only accent: primary buttons, links, active tab tint, switches on, chart markers |
| accent-hover | `#964009` | |
| accent-tint | `#F8E7D3` (fg `#964009`) | avatars, mobile active tab chip |
| good | `#16794C` on `#E6F4EC` | at/under target, processed, price drops |
| warn | `#B54708` on `#FDF3E0` | slightly over, needs review |
| bad | `#C63C33` on `#FBEBEA` | well over, rises, failed |
| danger-border | `#F0D4D1` | destructive outline buttons, error banners |
| toast bg | `#2A211B` (text white, action `#F0A46B`) | |
Semantic thresholds: food cost <= target = good; <= target+3 pts = warn; above = bad.

### 1.3 Shape and elevation
Containers/tables/cards 10px (mobile 12px), buttons/inputs 6px (mobile 8-10px), pills 999px, avatars squircle 7-11px. Shadows ONLY on: dropdown `0 8px 24px rgba(24,24,27,.08)`, modal `0 16px 48px rgba(42,33,27,.16)`, toast, bottom sheet `0 -8px 32px rgba(42,33,27,.14)`. Nothing else.

### 1.4 Motion
- Entry: fade-up 8px, .4s, `cubic-bezier(.16,1,.3,1)`, stagger .05-.2s per block. Once per screen mount.
- Hover: background .12-.15s. Press: `scale(.99)`. Dropdown/modal: same rise .2-.25s; bottom sheet slides up .3s.
- Skeleton shimmer: translateX sweep 1.4s infinite.
- All motion inside `prefers-reduced-motion` guard (global kill switch).

## 2. Layout system (desktop)
- App shell: CSS grid `224px minmax(0,1fr)`. Sidebar `#FAF7F1`, sticky, hairline right border.
- Sidebar: logo row (plate mark: circle stroke `#2A211B` + orange arc; wordmark "EzPlate" 15/700 with "Ez" orange) + `⌘K` button. Main nav: Dashboard (red mono badge with current avg % when over target), Menu, Plates, Ingredients, Products. Bottom group above hairline: Invoices, Settings, UI states, then workspace/account row (avatar + name, opens Account).
- Screen header bar: 48px, title 15/600 + muted subtitle + right-aligned actions, bottom hairline. Content `max-width` 960px (settings/account/forms 680px, builder 1040px), padding 24-32px.
- Tables: bordered rounded container; header band `#FAF7F1` 11.5/500 muted; hairline dividers only (no zebra, never border-t+border-b); whole row is a `<button>`; hover `#FAF7F1`. Status/deltas as tinted mono pills. Group headers (Menu screen): uppercase 11.5/600 muted rows inside the table.
- Buttons: primary orange filled; secondary white + `#E3DCCF` border; destructive white + `#F0D4D1` border + red text; tertiary plain text. One primary per view region.

## 3. Desktop screens (10)
1. **Dashboard**: KPI strip (3 cells, internal hairlines): avg food cost (red + delta pill), plates over target, not costed. Trend chart: red line, shaded over-target band, dashed 40% line, orange ring markers on user changes with mono annotation. "Needs attention" AI briefing: read-only rows, bold lead + plain body + ONE link each; credit "Phrased by Gemini, computed by EzPlate". Two-up: What moved (ingredient, meta, delta pill) / Dig in (label, subject, figure). Menu-scope dropdown in header (ranked list, mono %, color-coded).
2. **Menu**: switcher pills (active = tinted + border) with mono %, "7 more ▾" overflow, search right. Grouped table: Plate | Cost | Suggested at 40% | Price | Food cost pill. Not-costed row: muted name, dashes, "cost it" pill.
3. **Plates**: search + category select. Plate (+muted category) | Published (accent when live) | Plate cost. Row click opens Builder.
4. **Ingredients**: Ingredient | Category | Unit cost | 30-day change (pill or muted "steady") | Used in N plates.
5. **Products**: search + supplier select. Product (+muted brand) | Category | Supplier | Pack price | Last change.
6. **Invoices**: dashed dropzone + recent imports table: Date (mono) | Supplier | Items | Price changes | Status pill (Processed/Needs review/Failed, retry).
7. **Plate Builder** (full screen, breadcrumb "Plates /"): header shows plate name + live food-cost pill + "Saved just now" + Duplicate. Left: ingredient table (Ingredient | Qty input (mono, editable) | Unit | Cost | Remove) with add-ingredient footer row on `#FAF7F1`. Right rail (300px): Cost card (plate cost 18/600 mono, recent range, suggested at 40%, menu price input, amber guidance banner when under suggested: "90c below suggested. Raising to $17.40 meets your 40% target."); Publishing card (menu select, category select).
8. **Settings**: sectioned cards Business (name, currency), Costing (target % number input + GST switch), Notifications (2 switch rows with descriptions), Data (CSV export + destructive Delete workspace). Switches 38x22, orange when on, knob slides 2px→18px.
9. **Account**: Profile card (squircle avatar, name, email, Edit), Team (member rows + role + Invite a teammate), Plan (name, description, mono price, Manage billing).
10. **UI states** (spec screen): empty-plates, skeleton, sync banner, toast, inline invoice review (see §5).

## 4. Modals (desktop, all: centered at 12vh, scrim `rgba(42,33,27,.32)`, scrim click + × closes, Esc closes)
- **Upload invoice** (520px, 3 steps): 1) dropzone (click = browse) 2) scanning: filename, orange indeterminate bar, "Matching 34 line items… Nothing changes without your review." 3) review: change rows (product, old → new mono, delta pill), unmatched line in amber inline row (Link / Skip), footer "3 price updates, 30 unchanged" + Cancel + "Apply 3 updates" primary. Never applies without review.
- **New plate** (420px): name input (label above, placeholder is an example not a label), category select, footer Cancel + "Create and open builder".
- **Delete workspace** (420px): title, consequence sentence, type-workspace-name-to-confirm input; Delete button disabled (tinted `#F0D4D1`) until the name matches.
- **Command palette** (520px, ⌘K): borderless search input + result rows (label + muted kind hint): plates, actions (upload, new plate), menus, ingredients.

## 5. States (implement exactly; maps to shipped code)
- **Empty**: composed card: bold one-liner ("Cost your first plate"), 1-2 sentence how, primary CTA. Each list screen gets one (plates/menu/ingredients/products/invoices). First-run = the empty states as an onboarding path.
- **Loading**: skeleton rows matching final layout (bar widths varied), shimmer, zero layout shift. No spinners.
- **Sync error**: `#syncBanner` = red-tinted banner, border `#F0D4D1` bg `#FBEBEA`, message + Retry. Persistent until resolved.
- **Toast**: `toast()` = dark chip `#2A211B`, white 13/500 text, optional Undo in `#F0A46B`, 5s, single line, transient confirmations only.
- **Inline import error**: amber row next to the failing line (Link product / Skip this line). Never a modal, never blocks the rest.
- Form validation: label above input, error text below in bad red, border switches to `#C63C33`. No placeholder-as-label. No `window.alert()`.

## 6. Mobile translation (`Redesign v3 - Mobile.dc.html`, 390pt reference, <768px breakpoint)
Gold-standard mobile SaaS rules applied:
- **Bottom tab bar** replaces sidebar: 5 tabs (Home, Menu, Plates, Ingredients, More), fixed, blurred white, safe-area padded, active = orange tinted chip + orange label. Builder highlights Plates tab; Invoices/Products/Settings/Account highlight More.
- **Tables become two-line list rows**: name 15/500 + muted meta line left; figure (mono) + status pill stacked right. Min row height 56px, full-width tap.
- **Headers**: sticky, blurred, screen title + one action max. Sub-screens (Products/Settings/Account/Builder) use back chevron ("‹ More", "‹ Plates"), never dead ends.
- **Modals become bottom sheets**: grab handle, slide-up, safe-area padding. Upload sheet steps: Take a photo (primary) / Choose a file, scanning bar, review rows + full-width "Apply 3 updates".
- **Builder**: full-screen push; ingredient rows (name + qty meta, cost right); "Add an ingredient" dashed full-width button; sticky bottom summary bar above the tab bar: Plate cost + Suggested + primary "Set price $17.40".
- **Dashboard**: hero number 44 mono + delta pill + one-sentence context, simplified sparkline (dashed 40% line + marker), then Needs attention and What moved as stacked cards.
- Full-width primary buttons min-height 50px. Search fields tinted `#FAF7F1`. Charts lose axes labels except the 40% line.
- **More screen**: chevron rows (Products, Invoices, Settings, Account) + workspace/plan card.

### 6.1 Desktop ↔ mobile parity map (learn one, know the other)
Same names, same order, same reading direction everywhere. Rules:
- Nav order is identical: Dashboard(Home), Menu, Plates, Ingredients — sidebar top-to-bottom = tab bar left-to-right. Desktop's bottom sidebar group (Products, Invoices, Settings, Account) = mobile's More list, in the same order.
- Primary action lives top-right of the screen header on BOTH (New plate, Upload). Same label, same orange.
- Row anatomy is the same grammar: identity left, money right, status pill rightmost. Desktop spreads it across columns; mobile stacks the meta under the name — but left-to-right meaning never changes.
- Builder: desktop right rail (Cost card) = mobile sticky bottom bar; same three figures in the same order (plate cost, suggested, price action). Breadcrumb "Plates /" = back chevron "‹ Plates".
- Upload flow: identical 3 steps (choose → scanning → review) with identical copy; only the container changes (modal ↔ bottom sheet).
- Dashboard hierarchy identical: verdict number → trend → Needs attention → What moved.
- Settings/Account use the same section cards with the same section names and switch order.
When adding a screen, add it to this map first; if it has no desktop↔mobile mapping it isn't designed yet.

## 7. Interaction rules
- Keyboard: every interactive is a real `<button>`/`<a>`/input; 2px orange `:focus-visible` outline, offset 1-2px; Esc closes modal/sheet/dropdown; ⌘K opens palette; Enter on row opens it.
- Contrast: all text >= WCAG AA on its background (pill fg/bg pairs above are AA at their sizes). Never accent text on accent bg.
- Hover on every row/button; press feedback `scale(.99)`; disabled = tinted bg + `cursor:not-allowed`, never invisible.
- One primary action per screen region. No duplicate CTA intents (one "New plate" label everywhere, one "Upload invoice" label everywhere).

## 8. Product rules (non-negotiable, carried from v2 decisions)
- AI is a read-only briefing. It observes costs and states the price that meets the target; it NEVER instructs price hikes or applies changes. Every figure computed by EzPlate; attribution line stays.
- Verdict/cost language: deltas are cost observations ("+12% this month, in 9 plates"), not pricing instructions. No dollar deltas in menu verdict cells.
- One accent (orange). Green/amber/red reserved exclusively for cost semantics.
- Invoice imports never mutate prices without the review step.
- Menu scope selector is a single dropdown ranked by food cost %, not chips.
- No density toggle.

## 9. Data model surfaced by the UI
Product (invoiced pack: name, brand, category, supplier, pack price, history) → Ingredient (derived unit cost /kg /L /ea, 30-day delta, used-in count) → Plate (ingredient lines qty x unit cost = plate cost; recent range from price history; suggested price = cost / target%; published to menu + category) → Menu (plates grouped by category, avg food cost %) → Dashboard (avg across menus vs target, movers, leaks).
Demo dataset lives in the two DC files' logic classes; reuse it for seeds/fixtures.

## 10. Implementation order for Claude Code
1. Tokens + shell (sidebar/tab bar, header bars) 2. Table system component (header band, row button, pills) 3. Dashboard 4. Menu/Plates/Ingredients/Products/Invoices lists 5. Builder 6. Modals + sheets 7. Settings/Account 8. States (§5) wired to `#syncBanner` and `toast()` 9. Mobile breakpoint per §6 10. Keyboard/focus pass per §7.
Definition of done per screen: matches mock, all §5 states exist, §7 keyboard rules pass, mono tabular numbers everywhere.

## 11. Fold-in playbook (how to apply this without losing functionality)
This is a RESKIN + layout migration, not a rewrite. Rules for Claude Code:
1. **Audit before touching**: list every event handler, data read/write, and route in the current code per screen. That list is the contract — after restyling, every item must still fire. Do not delete a handler because its old container is gone; move it to the new element.
2. **Work screen-by-screen in the §10 order**, one commit each: "restyle X, functionality unchanged". Keep `#syncBanner`, `toast()`, and all existing IDs/data attributes the shipped JS depends on.
3. **Tokens first as CSS variables**, then swap components to consume them. Never hardcode hex in screens.
4. **Mock is layout truth, code is behavior truth.** Where the mock shows an element the app lacks (e.g. command palette, recent-range line), stub it visibly disabled or skip it and queue it — do NOT half-implement inside the restyle commit.
5. **New features are queued to FUNCTION, not to look like the mock**: each queue entry = behavior spec (trigger, data, state changes, error path) with the mock referenced only for placement. UI polish never ships as a feature entry; features never ship as pure UI.
   Queue from this package: command palette (⌘K), invoice review apply-step wiring, recent-range on builder, delete-workspace type-to-confirm, mobile bottom-sheet upload w/ camera.
6. **Definition of not-broken**: every pre-existing user flow (add plate, edit qty, import invoice, change price, change settings) completes end-to-end after each commit. Test that, not pixel diffs.
7. Animations (§1.4) are implementation work, included: entry rise + stagger, hover/press, skeleton shimmer, sheet slide — all CSS, all behind `prefers-reduced-motion`. Do them in the token pass, they're ~30 lines global.
