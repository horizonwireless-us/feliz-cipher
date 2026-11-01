/** Merge a CDN-validated player without losing a new URL hash to an MD5 collision. */
export function mergePlayerConfig(players, hash, entry) {
  const keys = new Set([hash, ...(entry.aliases || [])]);
  const collisions = Object.entries(players).filter(([primary, existing]) =>
    [primary, ...(existing.aliases || [])].some(key => keys.has(key)));

  if (!collisions.length) {
    players[hash] = entry;
    return { changed: true, primary: hash };
  }
  if (collisions.length !== 1) {
    throw new Error(`Player ${hash} overlaps multiple existing configs; refusing an ambiguous merge.`);
  }
  const [primary, existing] = collisions[0];
  if (existing.sig !== entry.sig || existing.nClass !== entry.nClass || existing.sts !== entry.sts) {
    throw new Error(`Player ${hash} conflicts with the validated config for ${primary}.`);
  }

  const aliases = new Set(existing.aliases || []);
  const previousSize = aliases.size;
  for (const key of keys) if (key !== primary) aliases.add(key);
  if (aliases.size === previousSize) return { changed: false, primary };
  players[primary] = { ...existing, aliases: [...aliases] };
  return { changed: true, primary };
}
