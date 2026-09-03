# 2024 Donruss Optic Rated Rookies #201-300 — Reconciliation Discrepancy Report

Status: **IN PROGRESS — reconciliation not complete.** This report exists to make the current
state of knowledge explicit, not to certify the block. Do not use this report as grounds to
promote `data/football/2024/_staging/optic.json` to `CHECKLIST_MANIFEST`.

## How this report was built

This session has no working fetch/download access to any external checklist site (confirmed:
`WebFetch` and direct `curl` return `EGRESS_BLOCKED`/`403` for Beckett, TCDB, ChecklistInsider,
ChecklistCenter, GoGTS, PSA, and eBay's image CDN). The only working channel is `WebSearch`, which
returns a synthesized answer drawing on several checklist sites at once rather than a single page
this report can cite and re-check independently. That means:

- **`source1Player`** below is the WebSearch-synthesized answer for that card number (when a query
  returned one) — effectively a multi-site aggregate, not one clean independent source.
- **`source2Player`** is filled in only for card #300, which was confirmed by two separate search
  queries returning the same answer. Every other row has not had a second, distinct confirmation —
  marked `NOT INDEPENDENTLY RE-CHECKED` even where `source1Player` exists.
- 81 of the 100 rows have **no external data point at all** this session — WebSearch simply never
  surfaced them (it tends to return the same handful of "name" rookies — Caleb Williams, Brock
  Bowers, Marvin Harrison Jr., etc. — repeatedly, not a full enumerable checklist). Those rows are
  `NEEDS_REVIEW`, not `MATCH` — an unchecked row is not evidence the staged value is correct.

## Summary

| Status | Count |
|---|---|
| MATCH | 13 |
| MISMATCH | 6 |
| NEEDS_REVIEW | 81 |
| **Total** | **100** |

6 mismatches now on record (one more than the 5 in the prior spot-check — card #220 was found
during this reconciliation pass): #220, #276, #277, #292, #293, #300. Mismatches are not confined
to the #276-300 tail as first hypothesized — #220 breaks that pattern — so the safest working
assumption is that **the whole #201-300 block is unverified**, with only 13 of 100 rows actually
confirmed against any external source, weak as that confirmation is.

## What this means for the launch gate

Unchanged from the prior finding: **NOT_READY.** This report sharpens the finding (6 known bad rows,
not 5; the bad-row pattern isn't cleanly localized to the upper range) but does not resolve it.
Per instruction, the 6 known mismatches are **not** being individually patched — the whole block
needs regeneration against sources that can actually be read in full, which this environment cannot
do. Recommended next step when real fetch access exists: pull the complete #201-300 list from two
of TCDB / Beckett's downloadable checklist / a physical or scanned official Panini checklist, diff
both against `data/checklists/football/2024/optic-chase-manifest.csv` in full, and only then replace
the staged file wholesale (not row-by-row).

## Full discrepancy table

| cardNumber | currentStagedPlayer | team | source1Player | source2Player | status | notes |
|---|---|---|---|---|---|---|
| 201 | Caleb Williams | Chicago Bears | Caleb Williams | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 202 | Adisa Isaac | Baltimore Ravens | Adisa Isaac | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 203 | Adonai Mitchell | Indianapolis Colts | Adonai Mitchell | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 204 | AJ Barner | Seattle Seahawks | AJ Barner | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 205 | Anthony Gould | Indianapolis Colts | Anthony Gould | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 206 | Audric Estime | Denver Broncos | Audric Estime | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 207 | Ben Sinnott | Washington Commanders | Ben Sinnott | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 208 | Blake Corum | Los Angeles Rams | Blake Corum | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 209 | Bo Nix | Denver Broncos | Bo Nix | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 210 | Braden Fiske | Los Angeles Rams | Braden Fiske | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 211 | Braelon Allen | New York Jets | Braelon Allen | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 212 | Bralen Trice | Atlanta Falcons | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 213 | Brenden Rice | Los Angeles Chargers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 214 | Brian Thomas Jr. | Jacksonville Jaguars | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 215 | Brock Bowers | Las Vegas Raiders | Brock Bowers | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 216 | Bucky Irving | Tampa Bay Buccaneers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 217 | Byron Murphy II | Seattle Seahawks | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 218 | Cade Stover | Houston Texans | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 219 | Chop Robinson | Miami Dolphins | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 220 | Cody Schrader | Los Angeles Rams | Chris Braswell | NOT INDEPENDENTLY RE-CHECKED | MISMATCH |  |
| 221 | Cooper DeJean | Philadelphia Eagles | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 222 | Cornelius Johnson | Los Angeles Chargers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 223 | Daijun Edwards | Pittsburgh Steelers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 224 | Dallas Turner | Minnesota Vikings | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 225 | Darius Robinson | Arizona Cardinals | Darius Robinson | NOT INDEPENDENTLY RE-CHECKED | MATCH |  |
| 226 | Devaughn Vele | Denver Broncos | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 227 | Devin Leary | Baltimore Ravens | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 228 | Dylan Laube | Las Vegas Raiders | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 229 | Drake Maye | New England Patriots | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 230 | Edgerrin Cooper | Green Bay Packers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 231 | Ennis Rakestraw Jr. | Detroit Lions | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 232 | Frank Gore Jr. | Buffalo Bills | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 233 | Gabe Hall | Philadelphia Eagles | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 234 | Isaac Guerendo | San Francisco 49ers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 235 | Jaden Hicks | Kansas City Chiefs | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 236 | Jaheim Bell | New England Patriots | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 237 | Ja'Lynn Polk | New England Patriots | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 238 | Jamari Thrash | Cleveland Browns | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 239 | Jared Wiley | Kansas City Chiefs | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 240 | Javon Baker | New England Patriots | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 241 | Jayden Daniels | Washington Commanders | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 242 | Jaylen Wright | Miami Dolphins | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 243 | Jeremiah Trotter Jr. | Philadelphia Eagles | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 244 | Jermaine Burton | Cincinnati Bengals | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 245 | Joe Milton III | New England Patriots | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 246 | Johnny Wilson | Philadelphia Eagles | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 247 | Jonathon Brooks | Carolina Panthers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 248 | Jordan Travis | New York Jets | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 249 | Keon Coleman | Buffalo Bills | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 250 | Khyree Jackson | Minnesota Vikings | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 251 | Kool-Aid McKinstry | New Orleans Saints | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 252 | Ladd McConkey | Los Angeles Chargers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 253 | Laiatu Latu | Indianapolis Colts | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 254 | Luke McCaffrey | Washington Commanders | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 255 | Malachi Corley | New York Jets | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 256 | Malik Nabers | New York Giants | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 257 | Malik Washington | Miami Dolphins | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 258 | MarShawn Lloyd | Green Bay Packers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 259 | Marvin Harrison Jr. | Arizona Cardinals | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 260 | Michael Penix Jr. | Atlanta Falcons | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 261 | Michael Pratt | Green Bay Packers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 262 | Quinyon Mitchell | Philadelphia Eagles | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 263 | Ray Davis | Buffalo Bills | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 264 | Ricky Pearsall | San Francisco 49ers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 265 | Roman Wilson | Pittsburgh Steelers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 266 | Rome Odunze | Chicago Bears | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 267 | Spencer Rattler | New Orleans Saints | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 268 | Taliese Fuaga | New Orleans Saints | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 269 | Trey Benson | Arizona Cardinals | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 270 | Troy Franklin | Denver Broncos | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 271 | Xavier Legette | Carolina Panthers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 272 | Xavier Worthy | Kansas City Chiefs | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 273 | Will Shipley | Philadelphia Eagles | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 274 | J.J. McCarthy | Minnesota Vikings | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 275 | Tip Reiman | Arizona Cardinals | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 276 | Theo Johnson | New York Giants | Marvin Harrison Jr. | NOT INDEPENDENTLY RE-CHECKED | MISMATCH |  |
| 277 | Tyrone Tracy Jr. | New York Giants | Max Melton | NOT INDEPENDENTLY RE-CHECKED | MISMATCH |  |
| 278 | Blake Watson | Denver Broncos | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 279 | Kimani Vidal | Los Angeles Chargers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 280 | Rasheen Ali | Baltimore Ravens | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 281 | Bub Means | New Orleans Saints | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 282 | Jha'Quan Jackson | Tennessee Titans | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 283 | Jacob Cowing | San Francisco 49ers | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 284 | Jordan Whittington | Los Angeles Rams | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 285 | Casey Washington | Atlanta Falcons | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 286 | Tez Walker | Baltimore Ravens | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 287 | Jamree Kromah | Chicago Bears | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 288 | Tyler Owens | Washington Commanders | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 289 | Tyler Harrell | Tennessee Titans | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 290 | Dallin Holker | New Orleans Saints | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 291 | AJ Woods | Washington Commanders | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 292 | Ryan Flournoy | Dallas Cowboys | Tip Reiman | NOT INDEPENDENTLY RE-CHECKED | MISMATCH |  |
| 293 | Tory Taylor | Chicago Bears | Trey Benson | NOT INDEPENDENTLY RE-CHECKED | MISMATCH |  |
| 294 | Marist Liufau | Dallas Cowboys | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 295 | Caelen Carson | Dallas Cowboys | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 296 | Tyler Guyton | Dallas Cowboys | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 297 | Nathan Thomas | Dallas Cowboys | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 298 | Brevyn Spann-Ford | Dallas Cowboys | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 299 | Carson Steele | Kansas City Chiefs | NOT CHECKED | NOT CHECKED | NEEDS_REVIEW |  |
| 300 | Jordan Magee | Washington Commanders | Xavier Worthy | Xavier Worthy | MISMATCH | Confirmed by 2 separate search queries |
