# CardStorm 2024 Football Checklist Data

## Purpose
This folder is the verified data foundation for **What to Hunt > Football > 2024**. It is research/data work first; it is not approval to alter the homepage hero, Command Center layout, or deploy a new Team Hunt UI.

## Collector goal
A fan should be able to choose **Football > 2024 > Team** and quickly understand who is worth hunting, which major products contain relevant cards, which rookies/inserts/parallels/autographs/memorabilia/numbered cards/SSPs matter, what one representative chase card looks like, and which cards they already own through a scrollable master checklist.

## Hard eligibility rule
A player shown as a 2024 Team Hunt target must belong to the 2024 football collecting/player universe for that team. A card appearing in a product carrying the 2024 product year does **not** by itself make a 2025 rookie eligible for the 2024 Team Hunt.

### XRC rule
2024 Select XRC cards that preview the following draft class must **not** cause 2025 rookies such as Ashton Jeanty, Jaxson Dart, Shedeur Sanders, Cam Ward or Travis Hunter to appear as 2024 Team Hunt players. XRC content can remain in product-level checklist data for historical completeness but must be tagged/excluded from 2024 team-player eligibility.

## Reference image rule
Each NFL team receives one representative card image for the 2024 Team Hunt view. The image is an example/reference card, not a claim that it is the team's most valuable card. Selection priorities:
1. Correct year/team/player eligibility.
2. Clear, bright, high-resolution front image.
3. Strong collector relevance or attractive card design.
4. Variety across major products, inserts, parallels, rookies and case hits.
5. Do not force a quarterback or superstar when a better-looking relevant card exists.
6. Never use a blurry, dark, heavily obstructed or misleading image simply to fill a team slot.

The current 32-team reference mapping is stored at `data/reference-cards/2024-football-reference-map.csv`. Source URLs are research provenance only. Production images must be localized and visually QA'd before launch; do not hotlink marketplace/CDN images in production.

## Checklist coverage
`coverage.csv` is the product audit matrix. `VERIFIED_FULL` means a full checklist source was located and the product is suitable for structured ingestion. It does **not** mean every checklist row has already been normalized into CardStorm's final data model.

Initial mainstream coverage includes Score, Prestige, Origins, Gold Standard, Mosaic, Certified, Black, Absolute, Prizm, Topps Chrome, Donruss, Obsidian, Illusions, Phoenix, Donruss Optic, Clearly Donruss, Contenders and Select.

CardStorm should prioritize collector-recognized core products first: Donruss, Donruss Optic, Prizm, Select, Mosaic, Absolute, Phoenix, Contenders, Origins, Topps Chrome and Clearly Donruss. Secondary products can follow after the core hunt experience is complete.

## Team targets
`team-targets.csv` gives four useful targets for every NFL team. The ranking deliberately does not default to quarterbacks. A premium 2024 rookie can lead; otherwise an established hobby star or breakout young player can be the better collector target.

## Existing repo work discovered
An older open branch/PR contains substantial 2024 Donruss and Select JSON work. Donruss already enumerates Rated Rookies #301-400 and Downtown/Horizontal Downtown chase lists. Select contains a large 500-card base structure plus XRC records. This should be audited and reused selectively instead of retyped. Select XRC rows require the 2024 eligibility exclusion before Team Hunt can surface them.

## Intended normalized schema
`Sport > Season > Manufacturer > Product > Set/Sub-set > Card Number > Player > Team > Rookie > Insert > Parallel > Serial Number > Autograph > Memorabilia > SSP/Case Hit > Reference Image`

Never infer team, parallel, serial number, autograph, SSP or case-hit designation when it has not been verified. Each normalized card should retain source/provenance and verification date where practical.

## Team Hunt UX target
The primary flow is **Sport > Year > Team > Team Hunt page**. The team page should contain one reference card, top chase targets, Exact Hits to Hunt that expand inline, and one master checklist grouped by product with Owned checkboxes and Owned/Chasing/Total/Completion counters. Full product checklists remain secondary destinations.

Back must return to the immediate previous CardStorm state and preserve year/team/scroll context. It must not default to Home. Native browser Back must also work.

## Live deployment gate
Do not deploy the rebuilt Team Hunt/checklist experience until:
- all 32 reference image files are local and visually approved;
- team/year eligibility is verified;
- core checklist data and team mappings are validated;
- no invented/unverified checklist data is presented as fact;
- checklist checkboxes/progress work on desktop and iPhone;
- native and in-app Back/history behavior is tested;
- there are zero missing images, dead routes or horizontal mobile overflow;
- homepage hero and unrelated Command Center modules remain unchanged.

Last audited: 2026-08-28
