const toText = (value: unknown) => String(value || '').trim();

const splitTagText = (value: string) =>
  value
    .split(/[\n,;]/g)
    .map((part) => part.trim())
    .filter(Boolean);

const isTruthy = (value: unknown) => {
  if (value === true) return true;
  const normalized = toText(value).toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'y';
};

const pushUnique = (target: string[], value: string) => {
  const normalized = value.trim();
  if (!normalized || target.includes(normalized)) return;
  target.push(normalized);
};

const normalizeTagObject = (value: Record<string, unknown>) => {
  const candidates = [
    value.label,
    value.name,
    value.value,
    value.title,
    value.tag,
    value.affiliation,
    value.organization,
    value.club,
  ];

  const labels = candidates.map(toText).filter(Boolean);
  if (labels.length > 0) return labels;

  const derived: string[] = [];
  if (isTruthy(value.isSSLG)) derived.push('SSLG Member');
  if (isTruthy(value.isClubOfficer)) derived.push('Club Officer');
  if (isTruthy(value.isAthlete)) derived.push('Athlete');
  if (isTruthy(value.isArtist)) derived.push('Artist');
  if (isTruthy(value.isIndigent)) derived.push('Indigent');
  if (isTruthy(value.is_sslg)) derived.push('SSLG Member');
  if (isTruthy(value.is_club_officer)) derived.push('Club Officer');
  if (isTruthy(value.is_athlete)) derived.push('Athlete');
  if (isTruthy(value.is_artist)) derived.push('Artist');
  if (isTruthy(value.is_indigent)) derived.push('Indigent');
  if (toText(value.type)) derived.push(toText(value.type));
  return derived;
};

export const normalizeLearnerTags = (value: unknown): string[] => {
  const tags: string[] = [];

  const consume = (entry: unknown) => {
    if (entry == null) return;

    if (Array.isArray(entry)) {
      entry.forEach(consume);
      return;
    }

    if (typeof entry === 'string') {
      splitTagText(entry).forEach((part) => pushUnique(tags, part));
      return;
    }

    if (typeof entry === 'object') {
      normalizeTagObject(entry as Record<string, unknown>).forEach((part) => pushUnique(tags, part));
      return;
    }

    pushUnique(tags, toText(entry));
  };

  consume(value);
  return tags;
};

export const formatLearnerTags = (value: unknown) => normalizeLearnerTags(value).join(', ');

export const parseLearnerTagsInput = (value: string) => normalizeLearnerTags(value);
