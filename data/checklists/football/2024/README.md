# CardStorm 2024 Football Checklist Data

## Purpose
This folder is the verified data foundation for the 2024 Football view in What to Hunt / Team Hunt. It is being built and audited before any live UI deployment.

## Hard eligibility rule
A player shown as a 2024 Team Hunt target must belong to the 2024 football collecting/player universe for that team. A card appearing in a product carrying the 2024 product year does **not** by itself make a 2025 rookie eligible for the 2024 Team Hunt.

### XRC rule
2024 Select XRC cards that preview the following draft class must **not** cause 2025 rookies (for example Ashton Jeanty, Jaxson Dart, Shedeur Sanders or Cam Ward) to appear as 2024 Team Hunt players. XRC content can be represented in product-level checklist data, but is excluded from 2024 team/player eligibility.

## Reference image rule
Each NFL team receives one representative card image for the 2024 Team Hunt view. The image is an example/reference card, not a claim that it is the team's most valuable card. Selection priorities:
1. Correct year/team/player eligibility.
2. Clear, bright, high-resolution front image.
3. Strong collector relevance or attractive card design.
4. Variety across major products, inserts, parallels, rookies and case hits.
5. Do not force a quarterback or superstar when a better-looking relevant card exists.
6. Never use a blurry, dark, heavily obstructed or misleading image simply to fill a team slot.

The current 32-team reference mapping is stored at `data/reference-cards/2024-football-reference-map.csv`.

## Checklist coverage
`coverage.csv` is the product audit matrix. `VERIFIED_FULL` means a full checklist source was located and the product is suitable for structured ingestion. It does **not** mean every checklist row has already been normalized into CardStorm's final data model.

Initial verified mainstream coverage includes Score, Prestige, Origins, Gold Standard, Mosaic, Certified, Black, Absolute, Prizm, Topps Chrome, Donruss, Obsidian, Illusions, Phoenix, Donruss Optic, Clearly Donruss, Contenders and Select.

## Intended normalized schema
Sport -> Season -> Manufacturer -> Product -> Set/Sub-set -> Card Number -> Player -> Team -> Rookie -> Insert -> Parallel -> Serial Number -> Autograph -> Memorabilia -> SSP/Case Hit -> Reference Image

Each normalized card should retain source/provenance and verification date where practical.

## Live deployment gate
Do not deploy the rebuilt Team Hunt/checklist experience until:
- all 32 team reference selections pass image-quality and year/team review;
- core product coverage is normalized and team mapping is checked;
- 2025 players are confirmed absent from 2024 Team Hunt eligibility;
- back/history behavior and deep links are tested;
- checklist checkboxes/progress work on mobile and desktop;
- no missing images or horizontal mobile overflow remain.

Last audited: 2026-08-28
