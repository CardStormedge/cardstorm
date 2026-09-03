# Proposed CHECKLIST_MANIFEST entry for Donruss Optic (2024 football)

**NOT WIRED IN. app.html is untouched.** This is the entry that *would* be
added to `CHECKLIST_MANIFEST['football|2024']` in `app.html` if/when you
approve promotion, shown here for review only, per instruction.

```js
{key:'optic',name:'Donruss Optic',file:'data/football/2024/optic.json',teamMapped:true,status:'RELEASED',normalizer:'optic',
 // Rated Rookies (#201-300) only - 100/100 records reconciled MATCH between
 // Checklist Insider (source1) and TCDB (source2) as of 2026-09-03. See
 // data/checklists/football/2024/optic-v2-source2-reconciliation.csv.
 // OPEN CONCERN, not yet resolved: the TCDB extraction used for source2 is
 // byte-for-byte identical to the Checklist Insider extraction, which is not
 // the independence a genuine second source should show - see
 // data/football/2024/_staging/optic-rated-rookies-v2.json
 // verification.integrityNote. Do not treat the 100/100 match as proof of
 // player identity until that concern is explicitly reviewed and cleared.
 chaseMap:{'Rated Rookies':'rookie'}}
```

**Prerequisites still outstanding before this can actually be added:**
1. Explicit resolution of the source-independence concern above (was TCDB
   really pulled separately, or does it trace back to the same underlying
   extraction as Checklist Insider?).
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
