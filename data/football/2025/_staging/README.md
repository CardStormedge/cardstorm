# 2025 football staging area — empty

Mirrors `data/football/2024/_staging/`. No files exist here yet because no real 2025 football
card-level source has been supplied or found this session (see
`data/checklists/football/2025/AUDIT.md` for the full audit — every 2025 football structure in
this repo is either release metadata or curated/unverified text, never player+card-number
records).

When a real extraction is supplied (the same way the 2024 Optic Checklist Insider/TCDB/Beckett
data was), stage it here first as `<product>-v1.json` (or similar), run the same
one-source→independent-second-source→reconciliation process used for 2024 Optic, and only then
promote a normalized file to `data/football/2025/<product>.json` for `CHECKLIST_MANIFEST`
consideration — never skip straight there.
