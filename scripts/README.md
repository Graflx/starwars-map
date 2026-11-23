# Content sync scripts

Every `sync-<type>.mjs` script mirrors one Wookieepedia infobox template into
`src/data/<type>.json` (+ one thumbnail per entry into `src/assets/<type>/<id>/preview.*`)
so the app never hits the API at runtime. They share a generic harness
(enumeration, revision caching, concurrency pool, incremental/crash-resumable
writes) in `scripts/lib/sync-runner.mjs` — a new type is a short script that
just plugs in a template name + a `deriveFacts(fields)` mapper, see
`scripts/sync-species.mjs` for the smallest example.

Shared library modules (`scripts/lib/`):
- `wookiee.mjs` — the Fandom/MediaWiki API client (rate-limited, retrying).
- `cache.mjs` — the **one shared** raw-page cache (`scripts/.cache/pages.json`),
  keyed by wiki title across every type. Don't run sync scripts concurrently —
  each does a full read/mutate/write cycle against this file; use
  `npm run sync-all` (sequential) once more than one type needs a fresh run.
- `ids.mjs` — `idFromTitle()` / `isCanonArticle()`, identical across types so
  cross-type references (e.g. a species' `homeworldId`) resolve against the id
  a sibling sync script produces for that same wiki title.
- `images.mjs` — image-file extraction + magic-byte sniffing for downloads.
- `infobox.mjs` — wikitext/infobox parsing, incl. `extractLead()` for the
  shared `summary` field (article intro with the infobox stripped out).
- `sync-runner.mjs` — the harness itself (`runSync({...})`).

Every type's output shares a common shape — `id`, `name`, `continuity`,
`wiki` (article title, for `wikiUrl()`), `summary`, `imageFile` — plus its own
typed facts. Cross-type references are plain string ids on a type-named field
(`homeworldId` → `getPlanet()`, `speciesId` → `getSpecies()`, ...), resolved at
runtime; there's no enforced schema (no TypeScript in this codebase), so a
resolver should always tolerate an id that doesn't resolve (wiki data is
messy — e.g. ~20% of species `homeworldId`s point at a system or a
Legends-only world outside the synced planet set, not a plain error).

## Planet sync

Mirrors every Star Wars planet from Wookieepedia (canon **and** legends — both
use the `{{CelestialBody}}` infobox) into the app so it never hits the API at
runtime.

## Usage

```bash
npm run sync-planets            # everything (canon + legends), incl. images
npm run sync-planets:canon      # canon articles only
node scripts/sync-planets.mjs --limit 50   # quick test on the first 50 pages
node scripts/sync-planets.mjs --no-images  # data only, skip image downloads
```

A full run is ~8.5k pages in **~14 min** (parallelised) and downloads a few
thousand images. Watch progress live: the log prints a per-second
`parse […] %` / `images […] %` bar, and **planets.json grows live** (it's
cleared at start and flushed every ~2.5s). Re-runs are fast — a revision cache
(`scripts/.cache/pages.json`) skips unchanged pages, and the run is
crash-resumable (cache is flushed as it goes). See `scripts/.cache/last-run.log`.

## What it writes

- **`src/data/planets.json`** — the single source of truth, **fully rewritten
  every run** (cleared to `[]`, rebuilt entirely from the source — no merge, no
  carried-over fields). One entry per planet: map placement (`position`, `color`,
  `type`, `continuity`) + typed facts.
- **`src/assets/planets/worlds/<id>/preview.*`** — downloaded image, auto-found
  by `planetImages.js` via `require.context` (no manifest). Skipped if a preview
  already exists.

## Typed schema (see scripts/lib/normalize.mjs)

| Field | Shape |
| --- | --- |
| `coordinates` | `["R", 16]` (grid letter + number) |
| `position` | `[x, y, z]` derived from the grid, or `null` (facts-only) |
| `continuity` | array: `["canon","legends"]` / `["canon"]` / `["legends"]` |
| `diameter` | float km (e.g. `10465`), or the original string if not in km |
| `rotation` | float (hours) |
| `terrain` | array of strings |
| `population` | `{ total: number\|null, demographics: { Name: percent } }` |

No `size` field — the ThreeJS sphere size is derived from `diameter` via
`planetSize()` in `src/data/planets.js`. No `xyz` — that info is the `position`.
No `lore` — the sync fully owns the file, so hand-authored text is not kept.

## Positioning

Positions come from the **Standard Galactic Grid** square (e.g. `L-9`), which
nearly every planet has — the exact `xyz` field is rare (even Tatooine lacks it).
Coruscant (`L-9`) is the origin; a deterministic per-id jitter spreads planets
that share a square. No grid square → no position (facts-only, not on the map).

## Performance note

A full sync yields ~5.8k planets (~5.3k with positions). Rendering that many
spheres in `GalaxyScene` is heavy (the scene was built for ~64). If the map gets
sluggish, consider instancing / distance culling / an LOD sprite layer, or run
`--canon-only` for a smaller set.

## Species sync

`npm run sync-species` / `sync-species:canon` / `sync-species:cache`. Every
`{{Species}}` page (canon + legends), ~5k entries. Facts: `designation`,
`classification`, `subspecies`, `homeworld`/`homeworldId`, `height`, `length`,
`mass`, `skinColor`, `hairColor`, `eyeColor`, `distinctions`, `lifespan`,
`habitat`, `diet`, `language` (list fields are arrays — Wookieepedia infoboxes
bullet-list these even for otherwise-scalar-looking fields like `mass`, e.g.
separate male/female weights).

## Scheduling (optional)

Nothing is scheduled. To run nightly, point launchd/cron at the same command:

```cron
0 3 * * *  cd /Users/felix/Documents/kiki/sith-lords/combined && /usr/bin/env npm run sync-planets >> scripts/.cache/cron.log 2>&1
```

The script is idempotent, so an unattended run is safe.
