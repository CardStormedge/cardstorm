// scripts/checklists/team-names-by-sport.js
//
// Enumerable, closed lists of real official franchise names, used only to
// find the team-name boundary inside a checklist PDF's extracted text line
// (see ingest-topps-pdf.js) when the PDF's text layer concatenates
// "<card#> <player> <team>[ <subset>]" onto one line with no column
// delimiter. This is NOT a fuzzy/guessed list - it is the real, current
// set of MLB/NBA/NFL team names, including the short "no city" forms Topps
// itself currently prints for a couple of franchises (confirmed directly
// from real fetched 2025/2026 Topps checklist PDF text - e.g. "Angels®"
// and "Athletics™" with no city name, alongside every other team's full
// "City Name" form). Longer names are listed before shorter ones so the
// team-name matcher in ingest-topps-pdf.js (which searches for the
// longest/earliest real match) never mis-splits a multi-word city name.

const MLB_TEAMS = [
  'Arizona Diamondbacks',
  'Atlanta Braves',
  'Baltimore Orioles',
  'Boston Red Sox',
  'Chicago Cubs',
  'Chicago White Sox',
  'Cincinnati Reds',
  'Cleveland Guardians',
  'Colorado Rockies',
  'Detroit Tigers',
  'Houston Astros',
  'Kansas City Royals',
  'Los Angeles Angels',
  'Los Angeles Dodgers',
  'Miami Marlins',
  'Milwaukee Brewers',
  'Minnesota Twins',
  'New York Mets',
  'New York Yankees',
  'Oakland Athletics',
  'Philadelphia Phillies',
  'Pittsburgh Pirates',
  'San Diego Padres',
  'San Francisco Giants',
  'Seattle Mariners',
  'St. Louis Cardinals',
  'Tampa Bay Rays',
  'Texas Rangers',
  'Toronto Blue Jays',
  'Washington Nationals',
  // Short "no city" forms Topps currently prints for these two franchises -
  // confirmed real from fetched 2025/2026 checklist PDF text, not guessed.
  'Angels',
  'Athletics',
];

const NBA_TEAMS = [
  'Atlanta Hawks',
  'Boston Celtics',
  'Brooklyn Nets',
  'Charlotte Hornets',
  'Chicago Bulls',
  'Cleveland Cavaliers',
  'Dallas Mavericks',
  'Denver Nuggets',
  'Detroit Pistons',
  'Golden State Warriors',
  'Houston Rockets',
  'Indiana Pacers',
  'Los Angeles Clippers',
  'LA Clippers',
  'Los Angeles Lakers',
  'Memphis Grizzlies',
  'Miami Heat',
  'Milwaukee Bucks',
  'Minnesota Timberwolves',
  'New Orleans Pelicans',
  'New York Knicks',
  'Oklahoma City Thunder',
  'Orlando Magic',
  'Philadelphia 76ers',
  'Phoenix Suns',
  'Portland Trail Blazers',
  'Sacramento Kings',
  'San Antonio Spurs',
  'Toronto Raptors',
  'Utah Jazz',
  'Washington Wizards',
];

const NFL_TEAMS = [
  'Arizona Cardinals',
  'Atlanta Falcons',
  'Baltimore Ravens',
  'Buffalo Bills',
  'Carolina Panthers',
  'Chicago Bears',
  'Cincinnati Bengals',
  'Cleveland Browns',
  'Dallas Cowboys',
  'Denver Broncos',
  'Detroit Lions',
  'Green Bay Packers',
  'Houston Texans',
  'Indianapolis Colts',
  'Jacksonville Jaguars',
  'Kansas City Chiefs',
  'Las Vegas Raiders',
  'Los Angeles Chargers',
  'Los Angeles Rams',
  'Miami Dolphins',
  'Minnesota Vikings',
  'New England Patriots',
  'New Orleans Saints',
  'New York Giants',
  'New York Jets',
  'Philadelphia Eagles',
  'Pittsburgh Steelers',
  'San Francisco 49ers',
  'Seattle Seahawks',
  'Tampa Bay Buccaneers',
  'Tennessee Titans',
  'Washington Commanders',
];

// NFL_CITIES: the real, confirmed structure of Topps football checklist PDF
// text is DIFFERENT from baseball's - no trademark symbol at all, and only
// the CITY prints (no mascot), e.g. "2 Michael Vick Atlanta" and
// "36 Michael Irvin Dallas", confirmed directly from a real fetched 2024
// Topps Chrome Football checklist PDF (see the PR #30 "FINAL CHECKLIST-DATA
// HARDENING PASS" comment). This is just the city half of each NFL_TEAMS
// entry above, not a separate guess - and, where a real market has two
// teams (Los Angeles: Rams/Chargers; New York: Giants/Jets), the real PDF
// itself doesn't disambiguate which team a player is on either - that's a
// genuine real-data limitation, not something this list can resolve.
const NFL_CITIES = [
  'Arizona','Atlanta','Baltimore','Buffalo','Carolina','Chicago','Cincinnati',
  'Cleveland','Dallas','Denver','Detroit','Green Bay','Houston','Indianapolis',
  'Jacksonville','Kansas City','Las Vegas','Los Angeles','Miami','Minnesota',
  'New England','New Orleans','New York','Philadelphia','Pittsburgh',
  'San Francisco','San Diego','Seattle','Tampa Bay','Tennessee','Washington',
];

const TEAMS_BY_SPORT = { baseball: MLB_TEAMS, basketball: NBA_TEAMS, football: NFL_TEAMS };

/**
 * Longest-name-first list so a greedy/first-match search never truncates a
 * multi-word city name (e.g. matches "Los Angeles Angels" before it could
 * accidentally match a shorter partial).
 */
function teamNamesFor(sport) {
  const list = TEAMS_BY_SPORT[sport] || [];
  return [...list].sort((a, b) => b.length - a.length);
}

/** Same longest-first ordering, for the football city-only match. */
function teamCityNamesFor(sport) {
  const list = sport === 'football' ? NFL_CITIES : TEAMS_BY_SPORT[sport] || [];
  return [...list].sort((a, b) => b.length - a.length);
}

module.exports = { MLB_TEAMS, NBA_TEAMS, NFL_TEAMS, NFL_CITIES, TEAMS_BY_SPORT, teamNamesFor, teamCityNamesFor };
