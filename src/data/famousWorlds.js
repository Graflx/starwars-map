// The best-known worlds — those that appear in the theatrical Star Wars films
// (prequels, originals, sequels, Rogue One, Solo, the 2008 Clone Wars film).
// Used by the "Famous worlds" filter (default on) so the map isn't overwhelmed
// by all ~5.8k planets at once. IDs verified against src/data/planets.json.
export const FAMOUS_WORLDS = new Set([
  // Prequel trilogy
  'coruscant', 'naboo', 'tatooine', 'kamino', 'geonosis', 'utapau', 'kashyyyk',
  'mustafar', 'alderaan', 'felucia', 'mygeeto', 'cato-neimoidia', 'saleucami',
  'polis-massa', 'malastare',
  // Clone Wars film
  'christophsis', 'ryloth',
  // Original trilogy
  'yavin-4', 'hoth', 'dagobah', 'bespin', 'endor-planet', 'sullust', 'dathomir',
  // Sequel trilogy
  'jakku', 'takodana', 'dqar', 'ahch-to', 'crait', 'cantonica', 'pasaana',
  'kijimi', 'exegol',
  // Rogue One
  'eadu', 'scarif', 'lahmu',
  // Solo
  'corellia', 'kessel', 'savareen', 'mimban', 'vandor-1',
])

export const isFamous = (id) => FAMOUS_WORLDS.has(id)
