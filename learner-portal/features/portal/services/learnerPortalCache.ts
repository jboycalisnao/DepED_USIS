type CacheEnvelope<T> = {
  updatedAt: number;
  payload: T;
};

const CACHE_PREFIX = 'usis:learner-portal:';
const CACHE_TTL_MS = 10 * 60 * 1000;

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;

function buildKey(scope: string, learnerKey: string) {
  return `${CACHE_PREFIX}${scope}:${learnerKey}`;
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function resolveLearnerCacheKey(input: { learnerId?: string; lrn?: string }) {
  const learnerId = String(input.learnerId || '').trim();
  const lrn = String(input.lrn || '').trim();
  if (learnerId) return `id:${learnerId}`;
  if (lrn) return `lrn:${lrn}`;
  return '';
}

export function getCachedLearnerData<T>(scope: string, learnerKey: string): T | null {
  if (!hasWindow() || !learnerKey) return null;
  const key = buildKey(scope, learnerKey);
  const envelope = parseJSON<CacheEnvelope<T>>(window.localStorage.getItem(key));
  if (!envelope || typeof envelope.updatedAt !== 'number') return null;
  if (Date.now() - envelope.updatedAt > CACHE_TTL_MS) return null;
  return envelope.payload ?? null;
}

export function setCachedLearnerData<T>(scope: string, learnerKey: string, payload: T) {
  if (!hasWindow() || !learnerKey) return;
  const key = buildKey(scope, learnerKey);
  const envelope: CacheEnvelope<T> = {
    updatedAt: Date.now(),
    payload,
  };
  window.localStorage.setItem(key, JSON.stringify(envelope));
}

export function clearLearnerPortalCache() {
  if (!hasWindow()) return;
  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    if (key.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
