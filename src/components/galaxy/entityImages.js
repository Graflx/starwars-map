// Shared post-processing for a type's require.context result: given the
// context (and its module keys), build { getPreview, getGallery } lookups.
//
// require.context() itself can't be parameterized at runtime — webpack needs
// a static, literal path per call — so each content type still needs its own
// one-line context() call. See speciesImages.js for the minimal per-type
// wrapper; this file is the generic part every one of them shares.
//
//   assets/<type>/<id>/preview.*        → info-panel hero image
//   assets/<type>/<id>/images/<n>.*     → optional gallery (planets only, v1)
export function buildImageIndex(ctx) {
  const previews = {}
  const galleries = {}

  for (const key of ctx.keys()) {
    let m
    if ((m = /^\.\/([^/]+)\/preview\.(?:png|jpe?g|webp)$/.exec(key))) {
      previews[m[1]] = ctx(key)
    } else if ((m = /^\.\/([^/]+)\/images\/(\d+)\.(?:png|jpe?g|webp)$/.exec(key))) {
      ;(galleries[m[1]] || (galleries[m[1]] = [])).push({ n: +m[2], url: ctx(key) })
    }
  }

  const sortedGalleries = {}
  for (const id of Object.keys(galleries)) {
    sortedGalleries[id] = galleries[id].sort((a, b) => a.n - b.n).map((x) => x.url)
  }

  return {
    getPreview: (id) => previews[id] || null,
    getGallery: (id) => sortedGalleries[id] || [],
  }
}
