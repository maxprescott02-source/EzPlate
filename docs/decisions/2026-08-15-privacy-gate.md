# The privacy gate — ANSWERED 15 Aug 2026 (Max)

## The question

`api/parse-invoice` sends the full text of an invoice PDF to Google's Gemini **free tier**; `api/insight` sends plate names and costing numbers to the same tier.
Google's current terms for the free tier: *"Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services"*, and *"human reviewers may read, annotate, and process your API input and output."*

Max accepted that for his own café — his call, made, not reopened.
It does not extend to a stranger's café, and self-service signup (14 Aug, question 1, answer B) means strangers get cafés unattended.

Two options were put to him with measured costs.

- **A — enable billing.** Paid tier, where *"Google doesn't use your prompts... or responses to improve our products."* No code change, same API key, $10 minimum prepaid credit, then pay-per-use. Measured against the real prompt (443 tokens of instructions) at $0.25/M in and $1.50/M out: **~0.4c per invoice, ~0.02c per insight, roughly 5–20c per café per month.** Downside: on a paid key, abuse costs real money, so it wants a spend cap and the rate-limit item.
- **B — disclose it.** Stay on free, and tell every user plainly that invoice text and costing data go to Google, which may train on it and may have humans review it.

**The assistant recommended A.**

## The answer: B, for now

Max's words, 15 Aug 2026: *"for now do b and we can sort this later post launch."*

So:

- **B is what ships before launch.** The privacy gate's own requirement — *"a paid-tier Google project that excludes training use, **or** a privacy policy that discloses it"* — is satisfied by B as written. This is not a workaround; it is the second of the two answers the gate always named.
- **A is not declined, it is DEFERRED to post-launch.** He said "sort this later", not "no". It stays on the queue as its own item rather than being deleted, because a deferred decision that leaves no trace is indistinguishable from one nobody thought of. Do not re-put the A/B question to him; the open question post-launch is only *when* A happens, not *whether* B was right.

## What B actually requires, and this is the part that is easy to get wrong

**A policy nobody reads before the data moves is not a disclosure.** The gate's wording is *"before the first non-Scoopy's row exists, not after"*, and the same logic applies within the app: the disclosure has to be in front of the user **before** their invoice text leaves the browser, not buried in a document linked from a footer.

That means the work is at least:

1. A written privacy policy that names Google specifically, says the free tier may use the data for training, and says humans may review it. Vague wording ("we may share data with service providers") does NOT discharge this — the whole point is that the specific fact is unusual and material.
2. It is shown and accepted **at signup**, before an account exists.
3. It is restated **at the invoice import screen**, because that is the moment the data actually leaves. A user who accepted a policy three weeks ago has not consented to today's upload in any meaningful sense.
4. The same for the Dashboard insight toggle, which is already user-controllable — check what it currently says.

**The wording is Max's to approve before it publishes.** A privacy policy is a statement his business makes to its customers; the assistant drafts it, he signs it off. Drafting does not need him and should not wait.

## Standing note for whoever ships A later

Nothing about B needs to be undone when A lands, except the *words*. The policy stops needing to say "Google may train on this" and starts saying "we pay for a tier that contractually cannot". The screens, the acceptance record and the placement all stay.
