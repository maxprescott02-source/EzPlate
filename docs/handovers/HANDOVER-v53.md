# HANDOVER v53 — builder misc line is ONE row (Max's mockup)

Misc cost line collapsed from v44's two-row split back to one row: name field ·
`$` + cost · dotted connector · bold total · × in its usual corner; the
"MISC COST · NOT AN INGREDIENT" sub-label is deleted. Same ids/handlers.
Three one-row-era legacy mobile rules had to be overridden at the site (each
commented): `.qtybox{order:3}` scrambled the row order, `.lc{order:4;
margin-left:auto}` pushed the total past the ×, and the costbox ≤700px
flex-grow stole the name's width; the leader uses the v46 baseline fix
(`align-items:baseline`, no -4px nudge) so the dots sit on the total's
baseline. Pinned-test change (declared): the v44 "label gets full card width"
pin is replaced by the one-row contract (no sub-label, no .top/.costs, one
shared row, label ≥70px at 380, nothing clips); the v46 baseline test now
covers the misc row too. Verified 380 + desktop, both themes; 139 unit +
smoke + 47 Playwright green; six spots at v53.

Needs Max's phone: the misc row at 380 with a real plate — name field is
narrow by design (one row); confirm it's acceptable, and that the $ field,
total, and × all sit comfortably under a thumb.
