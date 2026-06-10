import AsyncStorage from '@react-native-async-storage/async-storage';

export function fisherYatesShuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function shuffleRounds(rounds) {
  return fisherYatesShuffle(rounds);
}

export function shuffleSteps(steps) {
  const shuffled = fisherYatesShuffle(steps);
  const isInOrder = shuffled.every((step, index) => step.order === index + 1);
  if (isInOrder && steps.length > 1) {
    return shuffleSteps(steps);
  }
  return shuffled;
}

function getItemId(item, getId) {
  if (getId) return String(getId(item));
  return String(item?.id ?? item);
}

export async function loadRecentIds(storageKey) {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveRecentIds(storageKey, ids, maxLookback) {
  try {
    const trimmed = ids.slice(0, maxLookback);
    await AsyncStorage.setItem(storageKey, JSON.stringify(trimmed));
  } catch {
    // ignore storage failures
  }
}

export async function pickWithoutRecent(storageKey, pool, count, lookback = 20, getId) {
  if (!pool.length) return [];
  const recent = await loadRecentIds(storageKey);
  const recentSet = new Set(recent);
  const unseen = pool.filter((item) => !recentSet.has(getItemId(item, getId)));
  const seen = pool.filter((item) => recentSet.has(getItemId(item, getId)));
  const ordered = [...fisherYatesShuffle(unseen), ...fisherYatesShuffle(seen)];
  const picked = ordered.slice(0, Math.min(count, pool.length));

  const pickedIds = picked.map((item) => getItemId(item, getId));
  const nextRecent = [...pickedIds, ...recent.filter((id) => !pickedIds.includes(id))];
  await saveRecentIds(storageKey, nextRecent, lookback);

  return picked;
}

export function pickWithoutRecentSync(pool, count, recentIds = [], getId) {
  if (!pool.length) return { picked: [], recentIds };
  const recentSet = new Set(recentIds);
  const unseen = pool.filter((item) => !recentSet.has(getItemId(item, getId)));
  const seen = pool.filter((item) => recentSet.has(getItemId(item, getId)));
  const ordered = [...fisherYatesShuffle(unseen), ...fisherYatesShuffle(seen)];
  const picked = ordered.slice(0, Math.min(count, pool.length));
  const pickedIds = picked.map((item) => getItemId(item, getId));
  const nextRecent = [...pickedIds, ...recentIds.filter((id) => !pickedIds.includes(id))];
  return { picked, recentIds: nextRecent };
}
