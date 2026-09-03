# 2025 Football Checklist Data — intentionally empty

No 2025 football player-level checklist data exists in this repo yet. This directory is a
placeholder so the normalizer/manifest pattern proven for `data/football/2024/` (donruss.json,
prizm.json, select.json + `CHECKLIST_MANIFEST['football|2024']`) can be extended here without any
structural change once real data is sourced.

Do not add a file here that wasn't pulled from a real, citable checklist source (official
manufacturer checklist, TCDB, Beckett release article, etc. — same bar as the 2024 files). Do not
invent placeholder card data to fill this directory. Until a real `donruss.json` / `prizm.json` /
`select.json` lands here and is added to `CHECKLIST_MANIFEST`, the app must keep showing its
existing honest "not yet verified for football 2025" state (see `verifiedChaseCardsHTML` in
app.html, which already does this for any year without a manifest entry).

See the CardStorm architecture report (chat, phase-2025 audit) for the recommended import order:
Donruss → Prizm → Select → Donruss Optic.
