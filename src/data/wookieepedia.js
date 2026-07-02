// Wookieepedia (Fandom) helpers: deterministic article links.
//
// SWAPI provides no wiki links. Article URLs are built from the canonical name
// (Fandom maps spaces → underscores and redirects near matches). Gallery images
// are downloaded/bundled at build time (see worlds/<id>/images), not fetched here.

const WIKI = 'https://starwars.fandom.com'

const toPath = (t) => encodeURIComponent(String(t).trim().replace(/\s+/g, '_'))

// Direct article link for a person / generic title.
export const wikiUrl = (title) => `${WIKI}/wiki/${toPath(title)}`

// SWAPI film titles → canonical Wookieepedia article titles.
const FILM_WIKI = {
  'A New Hope': 'Star Wars: Episode IV A New Hope',
  'The Empire Strikes Back': 'Star Wars: Episode V The Empire Strikes Back',
  'Return of the Jedi': 'Star Wars: Episode VI Return of the Jedi',
  'The Phantom Menace': 'Star Wars: Episode I The Phantom Menace',
  'Attack of the Clones': 'Star Wars: Episode II Attack of the Clones',
  'Revenge of the Sith': 'Star Wars: Episode III Revenge of the Sith',
}
export const filmWikiUrl = (title) => wikiUrl(FILM_WIKI[title] || title)
