# REVIEW-273 — one red verb on the builder

Reviewed-commit: 54df6a9739f47ba63cf1f07f5b475fdf602945c2

**Reviewer model: Sonnet, overriding the `code-review` definition's `opus` pin, because THIS BATCH RAN ON OPUS.**
`CLAUDE.md`'s rule: the reviewer must be a different model from the batch, and only the batch knows which model it is, so the pin cannot do this alone.
The agent was given the branch diff and was **not** shown the queue item, the plan or the commit reasoning.

---

## The report, verbatim

### 1. Major — this branch fails its own required test suite right now

`npm test` is red on this diff:

```
✖ STATE.json deploy_version is sw.js CACHE, and newest_audit is the highest AUDIT-vNN
  AssertionError: docs/STATE.json says v221; sw.js says v222. Run: node tools/state.js
✖ every other field agrees with the files too, and written_at is a real past date
  AssertionError: docs/STATE.json is stale on deploy_version (221 -> 222).
```

The diff bumps the cache version to v222 in `index.html`, `js/app.js` (`APP_VERSION`) and `sw.js` (all six spots agree with each other), but never runs `node tools/state.js`, so `docs/STATE.json` was left untouched at `"deploy_version": 221, "batch": 272`. `tests/state-file.test.js` cross-checks `STATE.json` against `sw.js`'s live `CACHE` constant and fails on the mismatch.

`unit tests` is a required, `enforce_admins`-bound branch-protection check (per `CLAUDE.md`), so as it stands this branch cannot legitimately merge — either the push would be blocked, or someone bypassed/force-merged past a red required check. This isn't pre-existing: verified against `origin/main`, `sw.js` there says `v221` and `STATE.json` there says `221` — they agree on main and only diverge on this branch.

**How to verify:** run `npm test` on this branch; the two failures above appear at `tests/state-file.test.js:54` and `:86`. Compare `docs/STATE.json` (unchanged, still batch 272/v221) against `sw.js`'s `CACHE = 'ezplate-v222'`.

**Confidence:** high — directly reproduced, not inferred.

### 2. Major — the stated justification for not moving `#clearBtn` is false for any published plate, and it's baked into shipped code comments and a test's title, not just prose

The new `index.html` comment, the new Playwright spec's docstring, and `docs/QUEUE-2026-09-08-CONSOLIDATED.md` all assert, unconditionally, that *"below 768 this row [`.bld-actrow`] is the ONLY thing `#bCost` still shows"* — cited as one of three measured reasons item 47's "move Clear into the docket header" was declined.

That claim is only true when the loaded plate is on **zero** menus. `renderBuilderCost` sets `.is-bare` from `on.length===0` (`js/app.js:2500`), and `.bld-cardbody{display:none}` is scoped to `#bCost.is-bare` (`css/style.css:996`). When a saved plate **is** on a menu (`on.length>=1`), `is-bare` is never applied, `.bld-cardbody` stays `display:flex` (its unconditional base rule, `css/style.css:933`), and `#bPriceRow` (single menu) or `.bld-menus` (multiple menus) renders inside it — nothing in the stylesheet hides `.bld-price`, `.bld-warn` or `.bld-menus` below 768. So for any *published* plate, the card shows the menu-price input (or the per-menu list) in addition to `.bld-actrow` — it is not "the only thing shown."

The new Playwright spec (`tests/visual/273-builder-discard.spec.js`, second test) only exercises this with a `SEED` plate that has **no** menu (`{ id: 'PL1', ... category: 'Mains' }`, no menu link) — exactly the one case where the claim holds — yet the test's title states the general-sounding "which is all that card shows," and the surrounding comments in `index.html`/the queue doc present it as a fact about the screen rather than about that one plate state.

**Concrete consequence:** a future batch re-reading item 47's "measured and declined" record (or this spec's title) will trust that moving `#clearBtn` always leaves "a bordered card containing one button," and skip re-measuring — when for the common case of an actually-published plate, the card already contains a price input or menu list alongside the action row, changing the layout math the decision rested on.

**How to verify:** load a saved plate that is on ≥1 menu, resize to 380px, and observe `#bPriceRow` or `.bld-menus` rendering inside `#bCost .bld-cardbody` alongside `.bld-actrow`; or trace `renderBuilderCost`/`is-bare` as above.

**Confidence:** high on the mechanism (traced through the actual CSS and JS); the severity judgment (that this matters) is a bit softer since no runtime behavior in *this* diff depends on it — it's a documentation/comment-accuracy defect embedded in code, exactly the class the review brief asked to check for.

---

No other findings. The two new tests (`tests/builder-discard.test.js`, `tests/visual/273-builder-discard.spec.js`) are well-constructed and do pin their claimed conditions — I verified `rulesNaming()` correctly ignores the comment block and correctly flags a reintroduced `#clearBtn{color:var(--bad)}` rule anywhere in the file, and the "exactly one danger control" test matches the real markup. The cache-version bump itself is complete and consistent across all six spots (just not mirrored into `STATE.json`, finding #1). The rename/de-reddening comments in `js/app.js` and `css/style.css` accurately describe the surrounding code.

---

## Decisions

### 1 — STATE.json stale · **NOT A DEFECT, and the reviewer could not have known that from the diff**

**Correct as an observation, and it resolves at a step that had not run yet.** `skills/batch` step 10 says `node tools/state.js` runs **in the same commit as the handover**, which is written after the review — so the window the reviewer measured is one the process creates on purpose, and `tests/state-file.test.js` going red inside it is the mechanism doing its job rather than a break.

It was run before push, together with the handover, and `npm test` is green. **The reviewer's reasoning about consequence was also right and worth keeping:** had this been pushed as reviewed, the required `unit tests` check would have refused it, and `enforce_admins` means Max could not have waved it through either.

⚠️ **The one thing worth changing is what the ARTIFACT can see.** The agent was given the diff and no process context, which is what makes it independent — and it means every batch that bumps a version will get this finding. That is a cost of the design, not a fault in the review, and naming it here is cheaper than explaining it again next batch.

### 2 — the one-plate-state claim · **CONFIRMED BY MEASUREMENT AND FIXED IN FOUR PLACES**

**The finding's defect, mechanism and consequence were all three correct**, which is not the usual outcome — `CLAUDE.md` requires running a finding's own repro rather than trusting its stated cause, so it was run before anything was changed.

**Measured at 380 with the plate on 0, 1 and 2 menus** (`scratchpad/probe2.js`, Chromium):

| menus | `is-bare` | `#bCost` height | what the card holds besides `.bld-actrow` |
|---|---|---|---|
| 0 | true | **60px** | nothing — the body is hidden |
| 1 | false | **127px** | `#bPriceRow` — the menu-price input |
| 2 | false | **164px** | `#bMenus` — Winter $24.00, Summer $26.00 |

So the claim held for the fixture it was measured on and was written down as a fact about the screen. **The counter-evidence was in the same media block the whole time:** `#bCost .bld-menus{border-top:0;padding-top:0}` is only worth writing if that list renders at this width.

**Fixed in all four places the claim had reached** — the `index.html` comment, the spec's docstring, the spec's test, and the consolidated queue item — in each case by writing out what was wrong rather than deleting it, because this is `.claude/rules/app-guards.md`'s *"an exemption is scoped to the CLAIM that justified it"* wearing a measurement's costume.

**The spec's 380 case is now a TABLE over 0/1/2 menus** rather than one seed, and asserts the bare-card state **by its condition** (`.is-bare` ⟷ `on.length===0`) instead of by a name. The three assertions that really were general at every menu count — `#bTotal`, `#bSuggest` and `#saveBtn` hidden below 768 — are kept, because that half of the old claim was true.

⚠️ **AND THE DECISION IT SUPPORTED STANDS, WHICH IS STATED EXPLICITLY SO THE NEXT READER DOES NOT ASSUME OTHERWISE.** Not moving `#clearBtn` rested on three reasons; this was the third. The other two — `.bld-mast` being 322px of nowrap 11px mono already holding two items, and the two verbs being 402px apart so that distance was never the cause — are untouched by the finding. **The third is now recorded as conditional and is no longer offered as a reason.**
