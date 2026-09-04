# Proposed CHECKLIST_MANIFEST entry for Donruss Optic (2024 football)

**NOT WIRED IN. app.html is untouched.** This is the entry that *would* be
added to `CHECKLIST_MANIFEST['football|2024']` in `app.html` if/when you
approve promotion, shown here for review only, per instruction.

```js
{key:'optic',name:'Donruss Optic',file:'data/football/2024/optic.json',teamMapped:true,status:'RELEASED',normalizer:'optic',
 // Rated Rookies (#201-300) only. As of 2026-09-03 only 5 of 100 records are
 // genuinely two-source verified (Checklist Insider + independent Beckett
 // confirmation): #201, #237, #278, #286, #300. See
 // data/checklists/football/2024/optic-v2-beckett-reconciliation.csv.
 // The other 95 previously showed a 100/100 mechanical match against a TCDB
 // extraction, but that TCDB extraction was byte-for-byte identical to
 // Checklist Insider (source1) - independence unconfirmed, explicitly NOT
 // counted as verification. See data/football/2024/_staging/
 // optic-rated-rookies-v2.json verification.provenanceNote. DO NOT WIRE
 // THIS ENTRY IN until Beckett coverage is materially higher than 5/100.
 chaseMap:{'Rated Rookies':'rookie'}}
```

**Prerequisites still outstanding before this can actually be added:**
1. Beckett (or another genuinely independent source) needs to cover
   materially more than 5 of the 100 records - 5% coverage does not satisfy
   "genuinely independent Source 2" for the whole dataset.
2. A normalized `data/football/2024/optic.json` file in the same shape as
   `donruss.json`/`prizm.json`/`select.json` (categories → cards, with a
   `normalizeOptic`-equivalent function) - `optic-rated-rookies-v2.json`'s
   flat staging shape isn't yet in that live-scanner-compatible format.
2b. Only the Rated Rookies category is verified at all right now - Optic's
    Downtown/other chase families have no player-level records anywhere in
    the repo and must NOT be added to `chaseMap` on the strength of this
    rookie-only reconciliation.
3. `launch-audit.csv`'s Optic row moved from `NOT_READY` to `READY` (still
   `NOT_READY` as of this file).
4. Your explicit approval.

None of these have happened yet.
