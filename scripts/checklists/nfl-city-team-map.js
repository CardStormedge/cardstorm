// scripts/checklists/nfl-city-team-map.js
//
// Deterministic city -> full team name mapping, used ONLY where a real
// Topps football checklist PDF prints just the city (see ingest-topps-pdf.js
// and NFL_CITIES in team-names-by-sport.js - confirmed real, no mascot name
// at all in the real fetched PDF text). Every entry here is unambiguous:
// exactly one current NFL team plays in that city. Two real markets have
// two current NFL teams and are deliberately NOT in this map - a row whose
// city is "Los Angeles" or "New York" stays unresolved (team: the raw city
// string, teamCanonical: null) rather than guessing Rams vs. Chargers or
// Giants vs. Jets. "San Diego" maps to the Chargers because that is the
// only NFL team ever associated with that city (the Chargers relocated to
// Los Angeles in 2017; a "San Diego" row is a real historical/legacy card,
// not a current-roster ambiguity).

const NFL_CITY_TO_TEAM = {
  Arizona: 'Arizona Cardinals',
  Atlanta: 'Atlanta Falcons',
  Baltimore: 'Baltimore Ravens',
  Buffalo: 'Buffalo Bills',
  Carolina: 'Carolina Panthers',
  Chicago: 'Chicago Bears',
  Cincinnati: 'Cincinnati Bengals',
  Cleveland: 'Cleveland Browns',
  Dallas: 'Dallas Cowboys',
  Denver: 'Denver Broncos',
  Detroit: 'Detroit Lions',
  'Green Bay': 'Green Bay Packers',
  Houston: 'Houston Texans',
  Indianapolis: 'Indianapolis Colts',
  Jacksonville: 'Jacksonville Jaguars',
  'Kansas City': 'Kansas City Chiefs',
  'Las Vegas': 'Las Vegas Raiders',
  Miami: 'Miami Dolphins',
  Minnesota: 'Minnesota Vikings',
  'New England': 'New England Patriots',
  'New Orleans': 'New Orleans Saints',
  Philadelphia: 'Philadelphia Eagles',
  Pittsburgh: 'Pittsburgh Steelers',
  'San Francisco': 'San Francisco 49ers',
  'San Diego': 'Los Angeles Chargers', // historical - see header comment
  Seattle: 'Seattle Seahawks',
  'Tampa Bay': 'Tampa Bay Buccaneers',
  Tennessee: 'Tennessee Titans',
  Washington: 'Washington Commanders',
  // Deliberately ambiguous, deliberately NOT mapped - a real 2-team market:
  // 'Los Angeles': null,  // Rams or Chargers - source doesn't say which
  // 'New York': null,     // Giants or Jets - source doesn't say which
};

/** Returns the resolved full team name, or null if the city is unmapped/ambiguous. */
function resolveNflCity(city) {
  if (!city) return null;
  return NFL_CITY_TO_TEAM[city] || null;
}

module.exports = { NFL_CITY_TO_TEAM, resolveNflCity };
