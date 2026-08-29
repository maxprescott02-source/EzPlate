# HANDOVER - 217 (the empty-state title grammar)

**Branch:** `fix/empty-state-voice` · **Scope:** `docs/QUEUE.md` item 6, unblocked by Max choosing option A from `docs/decisions/2026-08-28.html`.
**Deploy version shipped: `ezplate-v177`.**

## What changed

The Menu screen's zero-menus title is now "Create your first menu" instead of "No menus yet.".
That is the whole of the user-visible change, and it is what option A asked for.

The rule behind it is written at `emptyStateHtml`'s own site: one obvious action invites, anything else reports.
That is the other half of the item's requirement, and the site matters more than the wording.
`emptyStateHtml` is the one place every empty state in the app is built, so it is the one place the next person adding a screen cannot avoid reading.

The rule is phrased on the ACTION COUNT rather than on how a screen feels, because an invitation is a promise that the single button below it is the whole of what to do next.
Products keeps reporting because it has two buttons and no single verb, and that is now written down rather than being a thing five screens happen to do.

## Review

The `code-review` agent on Sonnet, the batch running as Opus, not shown the decision file or the queue item.
**No findings.**
`docs/reviews/REVIEW-217-empty-state-voice.md` has the detail; it was pointed at five specific ways this could be wrong rather than asked to look around.

The one thing it sharpened: a user can reach both voices for the same state in one session, because the Menu tab now invites while the plate's Add-to-menu modal still reports.
I had already filed that; the reviewer stated the path more precisely than I had and judged it a documented tradeoff rather than a bug.
It is copy, so it is Max's, and he chose one title.

## Into CLAUDE.md

Nothing.
The rule belongs at `emptyStateHtml`, not in `CLAUDE.md`: it is a fact about one function's callers, it is enforced by being unavoidable at the call site, and `CLAUDE.md`'s own test is that a line there must be something you could violate without knowing.
Someone writing a new empty state is already in the file that explains it.

## New docs/QUEUE.md items

None.
One finding filed to `docs/MAINTENANCE.md`: `renderManageMenusZero` still reports over one action, so the rule now written down implies it should invite.
It needs Max because it is copy, and it is a one-line change when he wants it.

## New docs/PHONE.md items

None.
The change is one title on a screen whose layout is unchanged, and Playwright already drives that state at both 380px and desktop.

## Probe

**What did the decision tell you to do that you would have done differently?**
I recommended option B and Max chose A, so this is the honest answer: B made every screen you create on invite, including Products, and would have made the whole first run read as one guided sequence.
A leaves Products reporting between two screens that invite, so the walk is not quite one voice.
His call, it is user-visible copy, and I am not re-litigating it.
Worth recording that A is also the option that made the rule easier to state, because the rule now has to explain Products rather than absorb it, and explaining it is what produced the action-count phrasing that I think is the durable part of this batch.

**What did you not propose because it was out of scope?**
Changing `renderManageMenusZero` to match.
The rule implies it, the reviewer confirmed a user can hit both in one session, and it is one line.
It is filed rather than done because the decision enumerated six tab-level empty states and this is a seventh surface, and copy is his.

## Surprises

The mutation check nearly proved nothing.
I reverted the title and ran the spec with `-g "menu header structure"`, which matched a DIFFERENT test in the same file, passed, and looked exactly like a successful check.
The assertion actually lives in "a fresh install has NO menus".
A green run against the wrong test is indistinguishable from a green run against the right one, and the only reason I caught it is that the output named the test it had run.
That is this repo's most-recorded shape arriving in the tool used to check for it: `-g` takes a pattern, not a promise that the pattern matched what you meant.
