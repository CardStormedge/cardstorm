// scripts/checklists/team-alias.js
//
// Canonicalizes team names so "NY Yankees", "N.Y. Yankees" and "New York
// Yankees" all resolve to one entity, without ever merging two genuinely
// different teams (e.g. the two Los Angeles baseball teams, or a team's
// former city, stay distinct entries below rather than being collapsed
// into each other).
//
// This is intentionally an explicit allowlist map, not a fuzzy-match
// algorithm: fuzzy matching on team names is exactly the kind of thing that
// can silently merge distinct entities, which this repo's honesty standard
// does not allow. Add new aliases here as real sources are ingested and a
// new alias spelling is actually encountered - never guess ahead of need.

const TEAM_ALIASES = {
  // MLB
  'NY Yankees': 'New York Yankees',
  'N.Y. Yankees': 'New York Yankees',
  'NYY': 'New York Yankees',
  'NY Mets': 'New York Mets',
  'NYM': 'New York Mets',
  'LA Dodgers': 'Los Angeles Dodgers',
  'LAD': 'Los Angeles Dodgers',
  'LA Angels': 'Los Angeles Angels',
  'LAA': 'Los Angeles Angels',
  'SF Giants': 'San Francisco Giants',
  'SD Padres': 'San Diego Padres',
  'STL Cardinals': 'St. Louis Cardinals',
  'St Louis Cardinals': 'St. Louis Cardinals',
  'KC Royals': 'Kansas City Royals',
  'TB Rays': 'Tampa Bay Rays',
  'CWS White Sox': 'Chicago White Sox',
  'CHW': 'Chicago White Sox',

  // NFL
  'KC Chiefs': 'Kansas City Chiefs',
  'NY Giants': 'New York Giants',
  'NY Jets': 'New York Jets',
  'LA Rams': 'Los Angeles Rams',
  'LA Chargers': 'Los Angeles Chargers',
  'SF 49ers': 'San Francisco 49ers',
  'TB Buccaneers': 'Tampa Bay Buccaneers',
  'NE Patriots': 'New England Patriots',
  'GB Packers': 'Green Bay Packers',
  'NO Saints': 'New Orleans Saints',
  'LV Raiders': 'Las Vegas Raiders',

  // NBA
  'LA Lakers': 'Los Angeles Lakers',
  'LA Clippers': 'LA Clippers', // Clippers officially brand as "LA Clippers", not "Los Angeles Clippers" - left as-is on purpose
  'GS Warriors': 'Golden State Warriors',
  'NY Knicks': 'New York Knicks',
  'SA Spurs': 'San Antonio Spurs',
  'OKC Thunder': 'Oklahoma City Thunder',
  'NO Pelicans': 'New Orleans Pelicans',
};

/**
 * Returns the canonical team name for `name`, or `name` unchanged (trimmed)
 * if it isn't in the alias map. Never returns null/empty for a non-empty
 * input, and never merges two different alias targets.
 */
function normalizeTeam(name) {
  if (name == null) return null;
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  return TEAM_ALIASES[trimmed] || trimmed;
}

module.exports = { TEAM_ALIASES, normalizeTeam };
