# Star Wars Galaxy Map

An interactive 3D map of the Star Wars galaxy built with React and Three.js.
Browse thousands of planets (canon and Legends), see galactic regions, hyperspace
routes, Sith Lord timelines and species, and open a detailed info panel for each entry.

## Features

- 3D galaxy with textured planets (`@react-three/fiber` / `drei`)
- Regions, grid, hyperspace routes and a timeline
- Search and filters (canon / Legends, region, planet type)
- Info panels for planets and species with facts, summary and images
- Accessibility: keyboard navigation and screen-reader labels

## Getting started

```bash
npm install
npm start        # dev server on http://localhost:3000
npm run build    # production build in /build
```

## Content data

All content comes from [Wookieepedia](https://starwars.fandom.com) and is mirrored
locally, so the app never calls the wiki at runtime.

| Command | Result |
| --- | --- |
| `npm run sync-planets` | `src/data/planets.json` + planet previews |
| `npm run sync-species` | `src/data/species.json` + species thumbnails in `src/assets/species/` |
| `npm run sync-*:canon` | canon articles only |
| `npm run sync-*:cache` | rebuild from the local page cache, no network |

The species thumbnails (~430 MB) are **not** committed. After cloning, run
`npm run sync-species` to fetch them (the app works without, it just shows no
species images). Details on the sync harness are in [scripts/README.md](scripts/README.md).

## Project structure

```
src/
  pages/GalaxyMap.jsx        main page
  components/galaxy/         3D scene, panels, search, filters
  data/                      generated JSON + typed helpers
  assets/                    planet textures, species thumbnails
scripts/                     Wookieepedia sync scripts
```

## Credits and licenses

- Content and preview images: Wookieepedia (Fandom), CC-BY-SA text, images used as Fair Use.
- Planet textures: ShinyMan (CGTrader) and Sci-Fi3D "Ultimate Planets Pack", each
  **non-commercial** — see `src/assets/planets/CREDITS.txt`.
- Star Wars is a trademark of Lucasfilm Ltd. / Disney. This is an unofficial fan
  project and is not affiliated with or endorsed by Lucasfilm.
