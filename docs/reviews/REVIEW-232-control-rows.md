# Pre-push review — batch 232 (UI audit Phase 2 step 3: R4+R7 control rows)

Reviewed-commit: d2ebea7
Reviewer: `code-review` agent, forced onto Opus, diff only (`git diff main...fix/ui-audit-phase2-controls`), no brief shown.
Verdict: no critical or major defect; 8 findings (3 minor, 5 minor-comment/nit). All acted on or recorded below; fixes landed in the commit after the reviewed one.

## Findings (verbatim) and decisions

### 1. The new `≤767` search rule has no width cap, re-earning batch 176's defect at 561–767
**Severity: minor** · **Confidence in mechanism: high (arithmetic from the file's own tokens); confidence it matters: medium**

`css/style.css` — `@media (max-width:767px){ .plib-search{flex:1 1 100%} }`. `max-width:400px` exists only ≥768. At 640–767 the search renders ~680px wide; at 768 the same field is 400px — a 280px discontinuity across one pixel of viewport. Before this change the same field at 767 measured ~400px by accident of the wrap arithmetic. The new spec pins the full width at 767, so it now reads as intent. Either fix (cap in base, or cap riding the ≤767 rule) turns the `R7 @767` assertion red, so it is a decision, not an edit.

**DECISION: intentional, kept, and now SAID at the rule.** The full-width treatment below 768 is the app's own mobile search pattern — the Menu screen's search has been `flex:1 1 100%` below 768 since F5 (the exact rule this batch deleted and globalised), and §6 is the authority ("mobile search fields are tinted", full-width). 176's defect was different in kind: a desktop one-line row where the search swallowed the spare width BESIDE content-sized selects. Below 768 the search's own line is the design, so there is nothing beside it to crowd. The CSS comment now records the decision and the distinction, so the next reader finds a choice rather than an accident. The 768-boundary discontinuity is real and accepted: it is the same boundary at which the whole stack re-lays (selects go content-sized, actions return to the header).

### 2. The `.plib-search` comment states a rhythm the Menu screen does not have
**Severity: minor (comment)** · **Confidence: high**

"search row, then filter row" — but below 768 the Menu has THREE control lines (search / picker+action / filters), and the same overclaim was repeated in `docs/ui-audit-2026-09-02.md`.

**FIXED** — both texts now say "the stack opens the same way everywhere — search first, filters under it (the Menu keeps its switcher line between the two; same opening, not same line count)".

### 3. The `.menu-picker-row` basis comment records a cause that was not the cause
**Severity: minor (comment)** · **Confidence in the mechanism: high**

The comment attributed the shipped orphan button to the picker's 220px basis; in the OLD markup the button orphaned because it followed the full-width (334px-basis) search, whatever the picker's basis was. The 289-vs-349 arithmetic justifies the NEW line, not the old defect.

**FIXED** — the comment now carries both halves explicitly: the arithmetic that justifies 160 on the new line, and the note that the old orphan had a different mechanism, so a reader wanting 220 back evaluates the right claim.

### 4. `SCREENS[].search` in the new spec is declared and never read
**Severity: minor (test)** · **Confidence: high**

Every assertion resolved the field as `` `${s.row} .plib-search` ``; the `search` key was never dereferenced — a mapping the assertions cannot see, so renaming `#kingSearch` would leave the table stale and the spec green.

**FIXED** — the R4 test now asserts `` `${row} .plib-search ${search}` `` resolves for each screen. Mutation run: `#kingSearch` → `#kingSearchX` in the table went red by name.

### 5. `R4 @1440`'s left-edge loop compares the reference screen against itself
**Severity: nit (test)** · **Confidence: high**

One of four iterations was `|builder.x − builder.x| ≤ 1.5` — trivially satisfied with a message that reads like a measurement.

**FIXED** — the loop excludes `builder`, with the roster-205 reasoning at the site.

### 6. The "first control" probe returns `true` on an empty list
**Severity: nit (test)** · **Confidence: high**

`.every` on an empty array is `true`; a future is-nofilters seed would make the assertion vacuous silently.

**FIXED** — the probe returns a count and the test asserts `count > 0` before the ordering claim, the same guard `v155-products.spec.js` carries.

### 7. `.mnu-switch` is now a class with no consumer
**Severity: nit** · **Confidence: high**

Both `.mnu-switch .plib-search` rules are deleted, leaving the class matched by nothing; CLAUDE.md forbids renaming it away, but consumerless it reads as live scoping.

**FIXED** — the markup comment now says it is kept deliberately (row identity; naming rule) and why deleting it would invite a mis-scoped future rule.

### 8. The spec header cites a handover that is not on the branch
**Severity: nit (process)** · **Confidence: high**

The spec promises the mutation detail lives in the batch handover, which did not yet exist at review time — the 193 precedent by name.

**ACCEPTED, discharged by the handover** — `docs/handovers/HANDOVER-232-control-rows.md` ships in this PR and names all eight hand-run mutations and which assertion each turned red.

## Checked and found sound (the reviewer's own list, kept so nobody re-derives it)

- The `.king-link` clamp deletion is honest: the `-webkit-box` display lost to later `display:none`/`block` rules at every width, so the clamp never applied; nothing renders differently; `overflow:hidden` correctly survives; the rewritten fresh-states assertion is a genuine equality a reintroduced clamp turns red.
- Cascade of every changed rule counted at both breakpoints; no surviving higher-specificity rule on the touched properties; `is-nofilters` still out-specifies everything touched.
- The markup reorder against the JS: `syncHeaderActions` appends the rehomed button last, giving exactly the stack the CSS assumes; the deleted `.scr-gap` had no rule, spec or handler selecting it.
- Zero-state interactions (zero menus / plates / products / kitchen ingredients) unchanged; `214-empty-menu-action.spec.js` unaffected.
- The deleted `margin-left:auto` had no consumer; no spec asserted the rehomed button's x.
- `v142-menu.spec.js`'s Tab walk still terminates within budget; six cache spots agree and are pinned; the workflow spec count is maintained by `tests/ci-workflow.test.js`; CSS braces and comment delimiters balance.
