// Shared id-slugging + canon/legends detection, used by every sync-<type>.mjs
// script so cross-type references (e.g. a person's homeworldId) resolve
// against the same id a sibling sync script would produce for that title.

// Wiki title -> stable kebab id (matching existing curated ids where possible).
export function idFromTitle(title) {
  return title
    .replace(/\/Legends$/i, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Canon vs Legends is NOT reliable from the title: Legends-only pages live at
// their base title (no "/Legends" suffix — that suffix only exists when a
// canon counterpart also does). The reliable marker is the article's
// category: canon articles are tagged "Canon articles"; everything else
// (/Legends pages AND legends-only base titles) is Legends.
export function isCanonArticle(categories) {
  return categories.some((c) => /^canon[ _]articles/i.test(c))
}
