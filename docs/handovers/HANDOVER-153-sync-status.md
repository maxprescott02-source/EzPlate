# HANDOVER - 153 (the v3 sync/status treatment)

**Branch:** `feature/sync-status-v3` · **Scope:** the queue's "v3 sync/status treatment" item, unblocked when F6 shipped and its `Do after:` was deleted.
**Deploy version: `ezplate-v144`.**

## What changed

The two persistent sync states, `offline` and `error`, now wear the v3 §5 danger tint instead of an amber outline.
Both mean writes are being lost, which is the loudest thing this app ever has to say, and an amber outline on white was the wrong severity as well as the wrong colour.
The three transient states keep the quiet surface pill.
Placement is unchanged, and `pointer-events:none` survives.

That is the whole client change.
The item asked for a decision across all five states and the decision is most of the deliverable; the two halves of the mock that need capabilities the app does not have are specced and queued rather than half-built.

## Into CLAUDE.md

Nothing.

## New docs/QUEUE.md items

- **"Synced N min ago" needs a last-sync timestamp.** §3.1's quiet header text has nothing to render a relative time from. The timestamp is easy; the placement is not, and the item says so - `.scr-head` is five copies of per-screen markup, and a single fixed element aligned into the header band is what v141 measured as unworkable.
- **Retry needs a write queue first, and that is the feature.** `pushWrite` keeps no builder after a failure, so a Retry button would have nothing to retry. The queue item carries the design problem: the pending writes are closures, so a queue has to be built from serialisable intent.

## New docs/PHONE.md items

None.
The change is a colour on an element `docs/PHONE.md` already covers under v141, and nothing about it can only be settled on a device.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing it told me, but it framed the choice as two options and the real answer is that option one is two queued features wearing one item's clothes.
Its own ⚠️ about `pointer-events:none` reads as a caution for whoever ships Retry; it is better read as the reason Retry cannot ship yet, and the comment at the site now says that.

**What did you not propose because it was out of scope?**
Moving the banner in flow, per §5's wording.
v141 measured every in-flow home in the top band and all of them fail, and the mock's in-flow position describes a layout with no other bottom chrome.
Re-opening that on the strength of a mock drawing, against a measurement, would be the wrong way round.

## Surprises

The §8 rule that green, amber and red are "reserved exclusively for cost semantics" nearly made this the wrong change.
The package resolves it itself by listing `danger-border` for error banners as a token separate from `bad` - but this app aliases `--bad:var(--danger)`, so the two resolve to the same red and no user can tell them apart today.
The choice is real and worth making, and it is a claim about which token the rule DEPENDS on, not a visual one.
Writing the comment the other way round would have been a stale fact the first time somebody checked it.
